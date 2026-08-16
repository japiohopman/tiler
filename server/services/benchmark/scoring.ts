/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BenchmarkScoreBreakdown, MaterialBenchmarkResult, SubjectiveScores } from './types';

export const BENCHMARK_SCORE_WEIGHTS = {
  tileability: 0.3,
  textureQuality: 0.25,
  promptAdherence: 0.2,
  styleConsistency: 0.15,
  generationSpeed: 0.1,
};

/**
 * Calculates a normalized Speed Score (0-100) from generation latency in milliseconds.
 * Latency <= 500ms = 100 points
 * Latency = 3000ms = 80 points
 * Latency = 10000ms = 20 points
 * Latency >= 15000ms = 0 points
 */
export function calculateSpeedScore(latencyMs: number): number {
  if (latencyMs <= 500) {
    return 100;
  }
  if (latencyMs >= 15000) {
    return 0;
  }
  if (latencyMs <= 3000) {
    // Linear scale [500ms, 3000ms] -> [100, 80]
    return Math.round(100 - ((latencyMs - 500) / 2500) * 20);
  }
  // Linear scale [3000ms, 15000ms] -> [80, 0]
  return Math.round(80 - ((latencyMs - 3000) / 12000) * 80);
}

/**
 * Creates a default, unassigned SubjectiveScores object cleanly marked as pending manual review.
 */
export function createUnassignedSubjectiveScores(notes?: string): SubjectiveScores {
  return {
    textureQuality: null,
    promptAdherence: null,
    styleConsistency: null,
    pendingManualReview: true,
    notes: notes || 'Pending human evaluation during Phase 2B review.',
  };
}

/**
 * Calculates aggregated score breakdown across all material benchmark results.
 * Distinguishes objective machine metrics (Tileability, Speed) from pending subjective human metrics.
 */
export function calculateBenchmarkScoreBreakdown(
  results: MaterialBenchmarkResult[]
): BenchmarkScoreBreakdown {
  const successfulResults = results.filter((r) => r.success && r.objectiveMetrics);

  if (successfulResults.length === 0) {
    return {
      tileabilityWeightedScore: 0,
      speedWeightedScore: 0,
      objectiveTotalScore: 0,
      subjectiveTotalScore: null,
      preliminaryQualityScore: 0,
      isFullyEvaluated: false,
      weights: BENCHMARK_SCORE_WEIGHTS,
    };
  }

  // 1. Calculate Average Tileability Score (0-100)
  const avgTileability =
    successfulResults.reduce(
      (acc, r) => acc + (r.objectiveMetrics?.tileabilityScore || 0),
      0
    ) / successfulResults.length;

  // 2. Calculate Average Generation Speed Score (0-100)
  const avgSpeed =
    successfulResults.reduce(
      (acc, r) => acc + calculateSpeedScore(r.objectiveMetrics?.generationLatencyMs || 0),
      0
    ) / successfulResults.length;

  // 3. Objective Weighted Components
  const tileabilityWeightedScore = Math.round(avgTileability * BENCHMARK_SCORE_WEIGHTS.tileability * 100) / 100;
  const speedWeightedScore = Math.round(avgSpeed * BENCHMARK_SCORE_WEIGHTS.generationSpeed * 100) / 100;
  const objectiveTotalScore = Math.round((tileabilityWeightedScore + speedWeightedScore) * 100) / 100;

  // 4. Check for Subjective Scores
  let isFullyEvaluated = true;
  let sumTextureQuality = 0;
  let sumPromptAdherence = 0;
  let sumStyleConsistency = 0;

  for (const r of successfulResults) {
    const s = r.subjectiveScores;
    if (
      s.pendingManualReview ||
      typeof s.textureQuality !== 'number' ||
      typeof s.promptAdherence !== 'number' ||
      typeof s.styleConsistency !== 'number'
    ) {
      isFullyEvaluated = false;
      break;
    }
    sumTextureQuality += s.textureQuality;
    sumPromptAdherence += s.promptAdherence;
    sumStyleConsistency += s.styleConsistency;
  }

  if (!isFullyEvaluated) {
    return {
      tileabilityWeightedScore,
      speedWeightedScore,
      objectiveTotalScore,
      subjectiveTotalScore: null,
      preliminaryQualityScore: objectiveTotalScore, // Objective component score when subjective pending
      isFullyEvaluated: false,
      weights: BENCHMARK_SCORE_WEIGHTS,
    };
  }

  // Fully evaluated calculation
  const avgTextureQuality = sumTextureQuality / successfulResults.length;
  const avgPromptAdherence = sumPromptAdherence / successfulResults.length;
  const avgStyleConsistency = sumStyleConsistency / successfulResults.length;

  const textureWeighted = avgTextureQuality * BENCHMARK_SCORE_WEIGHTS.textureQuality;
  const promptWeighted = avgPromptAdherence * BENCHMARK_SCORE_WEIGHTS.promptAdherence;
  const styleWeighted = avgStyleConsistency * BENCHMARK_SCORE_WEIGHTS.styleConsistency;

  const subjectiveTotalScore = Math.round((textureWeighted + promptWeighted + styleWeighted) * 100) / 100;
  const preliminaryQualityScore = Math.round((objectiveTotalScore + subjectiveTotalScore) * 100) / 100;

  return {
    tileabilityWeightedScore,
    speedWeightedScore,
    objectiveTotalScore,
    subjectiveTotalScore,
    preliminaryQualityScore,
    isFullyEvaluated: true,
    weights: BENCHMARK_SCORE_WEIGHTS,
  };
}
