/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { tileProcessor } from '../../image/tileProcessor';
import { ImageGenerationProvider } from '../providers/types';
import { calculateWeightedQualityScore, extractProviderMetadata } from './metrics';
import { BENCHMARK_FRAMEWORK_VERSION, getBenchmarkMaterial, BENCHMARK_MATERIALS } from './prompts';
import {
  BenchmarkMaterialId,
  BenchmarkRunOptions,
  BenchmarkRunResult,
  BenchmarkSummary,
  MaterialBenchmarkResult,
} from './types';

/**
 * Provider-Agnostic Benchmark Runner
 *
 * Executes benchmark evaluations across canonical materials using an ImageGenerationProvider.
 * Processes output through Tiler's tile processor and seam analysis engine.
 * Records objective metrics and handles failures per material without crashing the run.
 */
export class BenchmarkRunner {
  /**
   * Executes a benchmark run against a given provider
   */
  public async run(
    provider: ImageGenerationProvider,
    options: BenchmarkRunOptions = {}
  ): Promise<BenchmarkRunResult> {
    const startTime = performance.now();
    const resolution = options.resolution || 512;
    const baseSeed = options.seed ?? 42;
    const blendMarginPercent = options.blendMarginPercent ?? 10;
    const selectedMaterialIds: BenchmarkMaterialId[] =
      options.materials && options.materials.length > 0
        ? options.materials
        : (Object.keys(BENCHMARK_MATERIALS) as BenchmarkMaterialId[]);

    const results: MaterialBenchmarkResult[] = [];
    const timestamp = new Date().toISOString();

    const providerMetadata = extractProviderMetadata(provider as any);

    for (let index = 0; index < selectedMaterialIds.length; index++) {
      const matId = selectedMaterialIds[index];
      const matConfig = getBenchmarkMaterial(matId);
      const itemSeed = baseSeed + index * 100;

      const result = await this.runMaterialBenchmark({
        provider,
        providerMetadata,
        matConfig,
        resolution,
        seed: itemSeed,
        blendMarginPercent,
        includeImageDataUrl: options.includeImageDataUrlInReport ?? false,
      });

      results.push(result);
    }

    // Compile summary statistics
    const summary = this.compileSummary(results);

    return {
      benchmarkVersion: BENCHMARK_FRAMEWORK_VERSION,
      providerId: provider.id,
      providerName: provider.name,
      model: providerMetadata.model,
      timestamp,
      options: {
        resolution,
        seed: baseSeed,
        materials: selectedMaterialIds,
        blendMarginPercent,
      },
      summary,
      results,
    };
  }

  /**
   * Executes benchmark for a single material test case with isolated failure handling
   */
  private async runMaterialBenchmark(params: {
    provider: ImageGenerationProvider;
    providerMetadata: any;
    matConfig: ReturnType<typeof getBenchmarkMaterial>;
    resolution: number;
    seed: number;
    blendMarginPercent: number;
    includeImageDataUrl: boolean;
  }): Promise<MaterialBenchmarkResult> {
    const {
      provider,
      providerMetadata,
      matConfig,
      resolution,
      seed,
      blendMarginPercent,
      includeImageDataUrl,
    } = params;

    const itemStartTime = performance.now();
    const timestamp = new Date().toISOString();

    let rawGenerationTimeMs: number | null = null;
    let tileProcessingTimeMs: number | null = null;
    let seamScore: number | null = null;
    let tileabilityScore: number | null = null;
    let pass: boolean | null = null;
    let processedImageDataUrl: string | undefined = undefined;
    let seamResult: any = undefined;
    const errors: string[] = [];

    try {
      // 1. Image Generation via Provider
      const genStartTime = performance.now();
      const genResult = await provider.generate({
        material: matConfig.id,
        style: matConfig.defaultStyle,
        resolution,
        seed,
        customPrompt: matConfig.prompt,
      });
      const genEndTime = performance.now();
      rawGenerationTimeMs = Math.round((genEndTime - genStartTime) * 100) / 100;

      if (!genResult || !genResult.imageDataUrl) {
        throw new Error(`Provider '${provider.id}' returned empty image response for material '${matConfig.id}'.`);
      }

      // 2. Tile Processing & Seam Analysis Pipeline
      const processStartTime = performance.now();
      const tileResult = await tileProcessor.processTile(genResult.imageDataUrl, {
        targetWidth: resolution as any,
        targetHeight: resolution as any,
        blendMarginPercent: blendMarginPercent as any,
      });
      const processEndTime = performance.now();
      tileProcessingTimeMs = Math.round((processEndTime - processStartTime) * 100) / 100;

      if (includeImageDataUrl) {
        processedImageDataUrl = tileResult.processedImageDataUrl;
      }

      seamResult = tileResult.seamResult;
      if (seamResult && typeof seamResult.overallScore === 'number') {
        seamScore = seamResult.overallScore;
        pass = seamResult.pass ?? (seamScore <= 0.05);
      }
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      errors.push(errorMessage);
    }

    const itemEndTime = performance.now();
    const latencyMs = Math.round((itemEndTime - itemStartTime) * 100) / 100;

    const weightedQualityScore = calculateWeightedQualityScore({
      seamScore,
      latencyMs,
    });

    tileabilityScore = weightedQualityScore.components.tileability;

    return {
      material: matConfig.id,
      prompt: matConfig.prompt,
      promptVersion: matConfig.promptVersion,
      width: resolution,
      height: resolution,
      seed,
      success: errors.length === 0,
      latencyMs,
      seamScore,
      tileabilityScore,
      pass,
      rawGenerationTimeMs,
      tileProcessingTimeMs,
      subjectiveScores: {
        textureQuality: null,
        promptAdherence: null,
        styleConsistency: null,
      },
      providerMetadata,
      weightedQualityScore,
      errors,
      timestamp,
      processedImageDataUrl,
      seamResult,
    };
  }

  /**
   * Compiles aggregated summary metrics across benchmark results
   */
  private compileSummary(results: MaterialBenchmarkResult[]): BenchmarkSummary {
    const total = results.length;
    const successful = results.filter((r) => r.success).length;
    const failed = total - successful;

    const totalLatency = results.reduce((acc, r) => acc + r.latencyMs, 0);
    const averageLatencyMs = total > 0 ? Math.round((totalLatency / total) * 10) / 10 : 0;

    const validSeamScores = results
      .map((r) => r.seamScore)
      .filter((s): s is number => typeof s === 'number' && !isNaN(s));

    const averageSeamScore =
      validSeamScores.length > 0
        ? Math.round(
            (validSeamScores.reduce((acc, s) => acc + s, 0) / validSeamScores.length) * 10000
          ) / 10000
        : null;

    const passedCount = results.filter((r) => r.pass === true).length;
    const overallPassRate = total > 0 ? Math.round((passedCount / total) * 100) : 0;

    return {
      total,
      successful,
      failed,
      averageLatencyMs,
      averageSeamScore,
      overallPassRate,
    };
  }
}

export const benchmarkRunner = new BenchmarkRunner();
