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
  TILEABILITY: 0.3, // 30% (Primary metric based on raw provider image)
  TEXTURE_QUALITY: 0.25, // 25% (Subjective / manual)
  PROMPT_ADHERENCE: 0.2, // 20% (Subjective / manual)
  STYLE_CONSISTENCY: 0.15, // 15% (Subjective / manual)
  GENERATION_SPEED: 0.1, // 10% (Objective metric based strictly on raw generation time)
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
 * Calculates objective generation speed score (0 - 100) from raw model inference time in milliseconds.
 * Latencies under 500ms score 90-100; latencies over 5000ms degrade to 0.
 */
export function calculateSpeedScore(rawGenerationTimeMs: number | null): number | null {
  if (typeof rawGenerationTimeMs !== 'number' || isNaN(rawGenerationTimeMs)) {
    return null;
  }
  if (rawGenerationTimeMs <= 0) return 100;
  // Linear scale: 0ms -> 100, 5000ms -> 0
  const score = 100 - rawGenerationTimeMs / 50;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculates overall weighted quality score adhering to Tiler benchmark protocol.
 * The primary tileability score (30%) is calculated strictly from RAW provider output.
 * Generation speed (10%) is calculated strictly from RAW model inference duration.
 * Subjective metrics are only included when explicitly provided (e.g., during manual review).
 */
export function calculateWeightedQualityScore(params: {
  rawSeamScore: number | null;
  processedSeamScore?: number | null;
  rawGenerationTimeMs: number | null;
  subjectiveScores?: Partial<SubjectiveScores>;
}): WeightedQualityScore {
  const {
    rawSeamScore,
    processedSeamScore = null,
    rawGenerationTimeMs,
    subjectiveScores = {},
  } = params;

  // Primary tileability score derived from RAW provider image
  const rawTileabilityScore = calculateTileabilityScore(rawSeamScore);
  // Secondary diagnostic tileability score derived from PROCESSED Tiler image
  const processedTileabilityScore = calculateTileabilityScore(processedSeamScore);

  // Speed score derived strictly from RAW model inference duration
  const speedScore = calculateSpeedScore(rawGenerationTimeMs);

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
    tileability: rawTileabilityScore,
    processedTileability: processedTileabilityScore,
    textureQuality,
    promptAdherence,
    styleConsistency,
    generationSpeed: speedScore,
  };

  let totalWeightedScore = 0;
  let evaluatedWeightSum = 0;

  if (rawTileabilityScore !== null) {
    totalWeightedScore += rawTileabilityScore * QUALITY_WEIGHTS.TILEABILITY;
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
    ? 'Fully evaluated score combining raw objective (40%) and human subjective (60%) assessments.'
    : `Objective score evaluated from raw provider metrics (${maxEvaluatedWeight}% weight: Raw Tileability 30% + Raw Generation Speed 10%). Subjective metrics require human evaluation.`;

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
