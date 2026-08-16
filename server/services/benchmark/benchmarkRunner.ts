/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { BlendMarginPercent, SupportedResolution } from '../../../src/types';
import { tileProcessor } from '../../image/tileProcessor';
import { generationService } from '../generationService';
import { ImageGenerationProvider, ProviderError } from '../providers/types';
import { getCanonicalBenchmarkPrompts } from './materials';
import {
  calculateBenchmarkScoreBreakdown,
  createUnassignedSubjectiveScores,
} from './scoring';
import {
  BenchmarkRunResult,
  BenchmarkRunSummary,
  BenchmarkRunnerOptions,
  MaterialBenchmarkResult,
  ObjectiveMetrics,
  ProviderBenchmarkMetadata,
} from './types';

export const BENCHMARK_FRAMEWORK_VERSION = '1.0.0';

/**
 * Provider-Agnostic Benchmark Runner
 * Executes Tiler's canonical 6-material test suite against any ImageGenerationProvider,
 * processing generated raw source images through tileProcessor and seamAnalysisService.
 */
export class BenchmarkRunner {
  /**
   * Main entry point to run the complete benchmark suite
   */
  async runBenchmark(options: BenchmarkRunnerOptions = {}): Promise<BenchmarkRunResult> {
    const runStartTime = new Date();
    const runId = `bench-${runStartTime.toISOString().replace(/[:.]/g, '-')}`;

    // 1. Resolve target provider
    const provider = this.resolveProvider(options);
    if (!provider.isConfigured()) {
      throw new ProviderError(
        provider.id,
        `Cannot run benchmark: Provider '${provider.name}' (${provider.id}) is not configured.`
      );
    }

    const targetResolution = options.targetResolution || 512;
    const blendMarginPercent = typeof options.blendMarginPercent === 'number' ? options.blendMarginPercent : 10;
    const seed = options.seed;
    const config = { targetResolution, blendMarginPercent, seed };

    const materials = getCanonicalBenchmarkPrompts();
    const results: MaterialBenchmarkResult[] = [];
    let providerModelId = 'unknown-model';

    // 2. Execute Benchmark Suite across Canonical Materials
    for (const promptDef of materials) {
      const materialStartTime = performance.now();
      const timestamp = new Date().toISOString();

      try {
        // A. Generate raw texture candidate using provider abstraction
        const genStartTime = performance.now();
        const generatedImage = await provider.generate({
          material: promptDef.material,
          style: promptDef.styleText,
          additionalPrompt: promptDef.promptText,
          resolution: targetResolution,
          seed,
        });
        const genEndTime = performance.now();
        const generationLatencyMs = Math.round(genEndTime - genStartTime);
        providerModelId = generatedImage.model || providerModelId;

        // B. Convert raw image data to Buffer
        const rawBuffer = tileProcessor.toBuffer(generatedImage.imageDataUrl);

        // C. Process image through Tiler's deterministic tileProcessor engine
        const processStartTime = performance.now();
        const tileResult = await tileProcessor.processTile(rawBuffer, {
          targetWidth: targetResolution as SupportedResolution,
          targetHeight: targetResolution as SupportedResolution,
          blendMarginPercent: blendMarginPercent as BlendMarginPercent,
        });
        const processEndTime = performance.now();
        const tileProcessingLatencyMs = Math.round(processEndTime - processStartTime);
        const totalLatencyMs = Math.round(performance.now() - materialStartTime);

        const seamRes = tileResult.seamResult;
        const objectiveMetrics: ObjectiveMetrics = {
          generationLatencyMs,
          tileProcessingLatencyMs,
          totalLatencyMs,
          seamScore: seamRes ? seamRes.overallScore : 1.0,
          horizontalSeamScore: seamRes ? seamRes.horizontalScore : 1.0,
          verticalSeamScore: seamRes ? seamRes.verticalScore : 1.0,
          tileabilityScore: seamRes ? seamRes.overallTileabilityScore : 0,
          pass: seamRes ? seamRes.pass : false,
          passThreshold: seamRes ? seamRes.threshold : 0.05,
          outputWidth: targetResolution,
          outputHeight: targetResolution,
          checksum: tileResult.metadata.checksum,
        };

        const providerMetadata: ProviderBenchmarkMetadata = {
          isFreeTier: provider.id === 'mock' || provider.id === 'pollinations',
          isLocal: provider.id === 'mock',
          requiresApiKey: provider.id !== 'mock' && provider.id !== 'pollinations',
          modelVersion: generatedImage.model,
        };

        results.push({
          id: `${promptDef.material}-${seed || 'default'}`,
          material: promptDef.material,
          promptVersion: promptDef.promptVersion,
          providerId: provider.id,
          modelId: generatedImage.model,
          success: true,
          seed,
          timestamp,
          builtPrompt: generatedImage.builtPrompt,
          objectiveMetrics,
          subjectiveScores: createUnassignedSubjectiveScores(),
          providerMetadata,
        });
      } catch (err: unknown) {
        // Isolation: A single material failure MUST NOT terminate the benchmark
        const errorMessage = err instanceof Error ? err.message : String(err);
        results.push({
          id: `${promptDef.material}-${seed || 'default'}`,
          material: promptDef.material,
          promptVersion: promptDef.promptVersion,
          providerId: provider.id,
          modelId: providerModelId,
          success: false,
          seed,
          timestamp,
          subjectiveScores: createUnassignedSubjectiveScores('Failed material generation.'),
          providerMetadata: {
            isLocal: provider.id === 'mock',
            requiresApiKey: provider.id !== 'mock',
          },
          errors: [errorMessage],
        });
      }
    }

    // 3. Compute Aggregated Summary
    const successfulResults = results.filter((r) => r.success && r.objectiveMetrics);
    const totalMaterials = results.length;
    const successfulMaterials = successfulResults.length;
    const failedMaterials = totalMaterials - successfulMaterials;
    const passRatePercent = Math.round((successfulMaterials / totalMaterials) * 100);

    const avgGenLatency =
      successfulMaterials > 0
        ? Math.round(
            successfulResults.reduce((acc, r) => acc + (r.objectiveMetrics?.generationLatencyMs || 0), 0) /
              successfulMaterials
          )
        : 0;

    const avgSeamScore =
      successfulMaterials > 0
        ? Math.round(
            (successfulResults.reduce((acc, r) => acc + (r.objectiveMetrics?.seamScore || 0), 0) /
              successfulMaterials) *
              10000
          ) / 10000
        : 1.0;

    const avgTileabilityScore =
      successfulMaterials > 0
        ? Math.round(
            successfulResults.reduce((acc, r) => acc + (r.objectiveMetrics?.tileabilityScore || 0), 0) /
              successfulMaterials
          )
        : 0;

    const scoreBreakdown = calculateBenchmarkScoreBreakdown(results);

    const summary: BenchmarkRunSummary = {
      totalMaterials,
      successfulMaterials,
      failedMaterials,
      passRatePercent,
      averageGenerationLatencyMs: avgGenLatency,
      averageSeamScore: avgSeamScore,
      overallTileabilityScore: avgTileabilityScore,
      scoreBreakdown,
    };

    // 4. Generate Markdown Human-Readable Report
    const markdownReport = this.generateMarkdownReport(
      runId,
      provider.name,
      provider.id,
      providerModelId,
      summary,
      results,
      config
    );

    const finalResult: BenchmarkRunResult = {
      benchmarkVersion: BENCHMARK_FRAMEWORK_VERSION,
      runId,
      timestamp: runStartTime.toISOString(),
      providerId: provider.id,
      providerName: provider.name,
      modelId: providerModelId,
      config,
      summary,
      results,
      markdownReport,
    };

    // 5. Output Reports if requested
    if (options.outputDirectory) {
      this.writeReportFiles(options.outputDirectory, finalResult, options);
    }

    return finalResult;
  }

  /**
   * Resolves provider from options or GenerationService container
   */
  private resolveProvider(options: BenchmarkRunnerOptions): ImageGenerationProvider {
    if (options.customProvider) {
      return options.customProvider;
    }
    return generationService.getProvider(options.providerId);
  }

  /**
   * Generates Human-Readable Markdown Report
   */
  private generateMarkdownReport(
    runId: string,
    providerName: string,
    providerId: string,
    modelId: string,
    summary: BenchmarkRunSummary,
    results: MaterialBenchmarkResult[],
    config: { targetResolution: number; blendMarginPercent: number; seed?: number }
  ): string {
    const lines: string[] = [];

    lines.push(`# Tiler Benchmark Report — ${providerName}`);
    lines.push(``);
    lines.push(`**Run ID:** \`${runId}\`  `);
    lines.push(`**Provider:** \`${providerName}\` (\`${providerId}\`)  `);
    lines.push(`**Model ID:** \`${modelId}\`  `);
    lines.push(`**Target Resolution:** ${config.targetResolution}×${config.targetResolution}  `);
    lines.push(`**Blend Margin:** ${config.blendMarginPercent}%  `);
    lines.push(`**Seed:** ${config.seed !== undefined ? config.seed : 'Deterministic default'}  `);
    lines.push(``);

    lines.push(`## Executive Summary`);
    lines.push(``);
    lines.push(`| Benchmark Metric | Result |`);
    lines.push(`| :--- | :--- |`);
    lines.push(`| **Total Materials Tested** | ${summary.totalMaterials} |`);
    lines.push(`| **Success Rate** | ${summary.successfulMaterials} / ${summary.totalMaterials} (${summary.passRatePercent}%) |`);
    lines.push(`| **Avg Generation Latency** | ${summary.averageGenerationLatencyMs} ms |`);
    lines.push(`| **Avg Seam Score** | ${summary.averageSeamScore} (Lower is better) |`);
    lines.push(`| **Avg Tileability Score** | ${summary.overallTileabilityScore} / 100 |`);
    lines.push(`| **Objective Quality Score** | ${summary.scoreBreakdown.objectiveTotalScore} / 40.0 (30% Tileability + 10% Speed) |`);
    lines.push(`| **Subjective Quality Score** | ${summary.scoreBreakdown.isFullyEvaluated ? summary.scoreBreakdown.subjectiveTotalScore : 'Pending Human Review'} |`);
    lines.push(``);

    lines.push(`## Material Performance Results`);
    lines.push(``);
    lines.push(`| Material | Status | Gen Latency | Seam Score | Tileability | Seam Pass | Checksum |`);
    lines.push(`| :--- | :---: | :---: | :---: | :---: | :---: | :--- |`);

    for (const r of results) {
      if (r.success && r.objectiveMetrics) {
        const m = r.objectiveMetrics;
        const passIcon = m.pass ? '✅ PASS' : '⚠️ FAIL';
        lines.push(
          `| **${r.material}** | ✅ Success | ${m.generationLatencyMs} ms | ${m.seamScore.toFixed(4)} | ${m.tileabilityScore}/100 | ${passIcon} | \`${m.checksum.substring(0, 8)}\` |`
        );
      } else {
        const errStr = r.errors ? r.errors.join('; ') : 'Unknown error';
        lines.push(`| **${r.material}** | ❌ Failed | N/A | N/A | 0/100 | ❌ FAIL | \`${errStr}\` |`);
      }
    }

    lines.push(``);
    lines.push(`## Quality Weighting Breakdown`);
    lines.push(``);
    lines.push(`- **Tileability (30% Weight):** ${summary.scoreBreakdown.tileabilityWeightedScore} / 30.0`);
    lines.push(`- **Generation Speed (10% Weight):** ${summary.scoreBreakdown.speedWeightedScore} / 10.0`);
    lines.push(`- **Texture Quality (25% Weight):** Pending Manual Review`);
    lines.push(`- **Prompt Adherence (20% Weight):** Pending Manual Review`);
    lines.push(`- **Style Consistency (15% Weight):** Pending Manual Review`);
    lines.push(``);

    return lines.join('\n');
  }

  /**
   * Helper to write output report files to disk
   */
  private writeReportFiles(
    outputDir: string,
    result: BenchmarkRunResult,
    options: BenchmarkRunnerOptions
  ): void {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (options.generateJsonReport !== false) {
      const jsonPath = path.join(outputDir, `benchmark-${result.providerId}-result.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');
    }

    if (options.generateMarkdownReport !== false) {
      const mdPath = path.join(outputDir, `benchmark-${result.providerId}-report.md`);
      fs.writeFileSync(mdPath, result.markdownReport, 'utf-8');
    }
  }
}

export const benchmarkRunner = new BenchmarkRunner();
