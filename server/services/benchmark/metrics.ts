/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ProviderMetadata,
  ScoreComponents,
  SubjectiveScores,
  WeightedQualityScore,
} from './types';

/**
 * Benchmark quality weightings defined in Tiler protocol
 */
export const QUALITY_WEIGHTS = {
  TILEABILITY: 0.3, // 30%
  TEXTURE_QUALITY: 0.25, // 25%
  PROMPT_ADHERENCE: 0.2, // 20%
  STYLE_CONSISTENCY: 0.15, // 15%
  GENERATION_SPEED: 0.1, // 10%
} as const;

/**
 * Calculates objective tileability score (0 - 100) from seam analyzer delta score.
 * Seam analyzer score: 0.0 = perfect match, >= 0.05 = discontinuity.
 */
export function calculateTileabilityScore(seamScore: number | null): number | null {
  if (typeof seamScore !== 'number' || isNaN(seamScore)) {
    return null;
  }
  // Seam score ranges from 0.0 (perfect) to 1.0 (total mismatch)
  const clampedSeamScore = Math.max(0, Math.min(1, seamScore));
  return Math.round((1 - clampedSeamScore) * 100);
}

/**
 * Calculates objective generation speed score (0 - 100) from latency in milliseconds.
 * Latencies under 500ms score 90-100; latencies over 5000ms degrade to 0.
 */
export function calculateSpeedScore(latencyMs: number): number {
  if (latencyMs <= 0) return 100;
  // Linear scale: 0ms -> 100, 5000ms -> 0
  const score = 100 - latencyMs / 50;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculates overall weighted quality score adhering to Tiler benchmark protocol.
 * Subjective metrics are only included when explicitly provided (e.g., during manual review).
 * Subjective fields default to `null` and are not replaced with arbitrary placeholders.
 */
export function calculateWeightedQualityScore(params: {
  seamScore: number | null;
  latencyMs: number;
  subjectiveScores?: Partial<SubjectiveScores>;
}): WeightedQualityScore {
  const { seamScore, latencyMs, subjectiveScores = {} } = params;

  const tileabilityScore = calculateTileabilityScore(seamScore);
  const speedScore = calculateSpeedScore(latencyMs);

  const textureQuality =
    typeof subjectiveScores.textureQuality === 'number'
      ? Math.max(0, Math.min(100, subjectiveScores.textureQuality))
      : null;

  const promptAdherence =
    typeof subjectiveScores.promptAdherence === 'number'
      ? Math.max(0, Math.min(100, subjectiveScores.promptAdherence))
      : null;

  const styleConsistency =
    typeof subjectiveScores.styleConsistency === 'number'
      ? Math.max(0, Math.min(100, subjectiveScores.styleConsistency))
      : null;

  const components: ScoreComponents = {
    tileability: tileabilityScore,
    textureQuality,
    promptAdherence,
    styleConsistency,
    generationSpeed: speedScore,
  };

  let totalWeightedScore = 0;
  let evaluatedWeightSum = 0;

  if (tileabilityScore !== null) {
    totalWeightedScore += tileabilityScore * QUALITY_WEIGHTS.TILEABILITY;
    evaluatedWeightSum += QUALITY_WEIGHTS.TILEABILITY;
  }

  if (speedScore !== null) {
    totalWeightedScore += speedScore * QUALITY_WEIGHTS.GENERATION_SPEED;
    evaluatedWeightSum += QUALITY_WEIGHTS.GENERATION_SPEED;
  }

  if (textureQuality !== null) {
    totalWeightedScore += textureQuality * QUALITY_WEIGHTS.TEXTURE_QUALITY;
    evaluatedWeightSum += QUALITY_WEIGHTS.TEXTURE_QUALITY;
  }

  if (promptAdherence !== null) {
    totalWeightedScore += promptAdherence * QUALITY_WEIGHTS.PROMPT_ADHERENCE;
    evaluatedWeightSum += QUALITY_WEIGHTS.PROMPT_ADHERENCE;
  }

  if (styleConsistency !== null) {
    totalWeightedScore += styleConsistency * QUALITY_WEIGHTS.STYLE_CONSISTENCY;
    evaluatedWeightSum += QUALITY_WEIGHTS.STYLE_CONSISTENCY;
  }

  const finalScore = evaluatedWeightSum > 0 ? Math.round(totalWeightedScore * 100) / 100 : null;

  const maxEvaluatedWeight = Math.round(evaluatedWeightSum * 100);

  const isFullyEvaluated = evaluatedWeightSum >= 0.99;
  const note = isFullyEvaluated
    ? 'Fully evaluated score combining objective (40%) and human subjective (60%) assessments.'
    : `Objective score evaluated from available machine metrics (${maxEvaluatedWeight}% weight: Tileability 30% + Speed 10%). Subjective metrics require human evaluation.`;

  return {
    score: finalScore,
    maxEvaluatedWeight,
    components,
    note,
  };
}

/**
 * Normalizes provider metadata for inclusion in benchmark results without affecting quality scores
 */
export function extractProviderMetadata(provider: {
  id: string;
  name: string;
  model?: string;
  isFree?: boolean;
  pricingTier?: string;
  supportsSeed?: boolean;
  [key: string]: unknown;
}): ProviderMetadata {
  return {
    id: provider.id,
    name: provider.name,
    model: typeof provider.model === 'string' ? provider.model : provider.id,
    isFree: typeof provider.isFree === 'boolean' ? provider.isFree : provider.id === 'mock',
    pricingTier: typeof provider.pricingTier === 'string' ? provider.pricingTier : provider.id === 'mock' ? 'free/local' : 'unknown',
    supportsSeed: typeof provider.supportsSeed === 'boolean' ? provider.supportsSeed : true,
  };
}
