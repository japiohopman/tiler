/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { tileProcessor } from '../../image/tileProcessor';
import { seamAnalysisService } from '../seamAnalysisService';
import { ImageGenerationProvider } from '../providers/types';
import { calculateWeightedQualityScore, extractProviderMetadata } from './metrics';
import { BENCHMARK_FRAMEWORK_VERSION, BENCHMARK_MATERIALS, getBenchmarkMaterial } from './prompts';
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
 * Evaluates dual seam measurements:
 * 1. Raw Provider Tileability (direct seam analysis of raw AI output before processing)
 * 2. Processed Tileability (seam analysis after Tiler tile processing pipeline)
 *
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

    let rawSeamScore: number | null = null;
    let rawTileabilityScore: number | null = null;
    let rawPass: boolean | null = null;
    let rawSeamResult: any = undefined;

    let processedSeamScore: number | null = null;
    let processedTileabilityScore: number | null = null;
    let processedPass: boolean | null = null;
    let processedSeamResult: any = undefined;

    let processedImageDataUrl: string | undefined = undefined;
    const errors: string[] = [];

    try {
      // 1. Raw Image Generation via Provider
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

      // 2. RAW SEAM ANALYSIS (Evaluates raw provider image BEFORE TileProcessor)
      try {
        rawSeamResult = await seamAnalysisService.analyzeSeams(genResult.imageDataUrl, {
          diagnosticMode: false,
        });
        if (rawSeamResult && typeof rawSeamResult.overallScore === 'number') {
          rawSeamScore = rawSeamResult.overallScore;
          rawPass = rawSeamResult.pass ?? (rawSeamScore <= 0.05);
        }
      } catch (rawErr) {
        console.warn(`Raw seam analysis failed for material '${matConfig.id}':`, rawErr);
      }

      // 3. PROCESSED TILE PIPELINE & SEAM ANALYSIS (Evaluates image AFTER TileProcessor)
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

      processedSeamResult = tileResult.seamResult;
      if (processedSeamResult && typeof processedSeamResult.overallScore === 'number') {
        processedSeamScore = processedSeamResult.overallScore;
        processedPass = processedSeamResult.pass ?? (processedSeamScore <= 0.05);
      }
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      errors.push(errorMessage);
    }

    const itemEndTime = performance.now();
    const latencyMs = Math.round((itemEndTime - itemStartTime) * 100) / 100;

    const weightedQualityScore = calculateWeightedQualityScore({
      rawSeamScore,
      processedSeamScore,
      rawGenerationTimeMs,
    });

    rawTileabilityScore = weightedQualityScore.components.tileability;
    processedTileabilityScore = weightedQualityScore.components.processedTileability;

    return {
      material: matConfig.id,
      prompt: matConfig.prompt,
      promptVersion: matConfig.promptVersion,
      width: resolution,
      height: resolution,
      seed,
      success: errors.length === 0,
      latencyMs,
      rawGenerationTimeMs,
      tileProcessingTimeMs,

      // Raw Provider Tileability Metrics
      rawSeamScore,
      rawTileabilityScore,
      rawPass,
      rawSeamResult,

      // Processed Tileability Metrics
      processedSeamScore,
      processedTileabilityScore,
      processedPass,
      seamResult: processedSeamResult,

      // Aliases (point to raw provider tileability)
      seamScore: rawSeamScore,
      tileabilityScore: rawTileabilityScore,
      pass: rawPass,

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
    };
  }

  /**
   * Compiles aggregated summary statistics across benchmark results
   */
  private compileSummary(results: MaterialBenchmarkResult[]): BenchmarkSummary {
    const total = results.length;
    const successful = results.filter((r) => r.success).length;
    const failed = total - successful;

    const validGenTimes = results
      .map((r) => r.rawGenerationTimeMs)
      .filter((t): t is number => typeof t === 'number' && !isNaN(t));

    const averageRawGenerationTimeMs =
      validGenTimes.length > 0
        ? Math.round((validGenTimes.reduce((acc, t) => acc + t, 0) / validGenTimes.length) * 10) / 10
        : 0;

    const totalLatency = results.reduce((acc, r) => acc + r.latencyMs, 0);
    const averageLatencyMs = total > 0 ? Math.round((totalLatency / total) * 10) / 10 : 0;

    const validRawSeams = results
      .map((r) => r.rawSeamScore)
      .filter((s): s is number => typeof s === 'number' && !isNaN(s));

    const averageRawSeamScore =
      validRawSeams.length > 0
        ? Math.round(
            (validRawSeams.reduce((acc, s) => acc + s, 0) / validRawSeams.length) * 10000
          ) / 10000
        : null;

    const validProcessedSeams = results
      .map((r) => r.processedSeamScore)
      .filter((s): s is number => typeof s === 'number' && !isNaN(s));

    const averageProcessedSeamScore =
      validProcessedSeams.length > 0
        ? Math.round(
            (validProcessedSeams.reduce((acc, s) => acc + s, 0) / validProcessedSeams.length) * 10000
          ) / 10000
        : null;

    const rawPassedCount = results.filter((r) => r.rawPass === true).length;
    const rawPassRate = total > 0 ? Math.round((rawPassedCount / total) * 100) : 0;

    const processedPassedCount = results.filter((r) => r.processedPass === true).length;
    const processedPassRate = total > 0 ? Math.round((processedPassedCount / total) * 100) : 0;

    return {
      total,
      successful,
      failed,
      averageRawGenerationTimeMs,
      averageLatencyMs,
      averageRawSeamScore,
      averageProcessedSeamScore,
      rawPassRate,
      processedPassRate,
    };
  }
}

export const benchmarkRunner = new BenchmarkRunner();
