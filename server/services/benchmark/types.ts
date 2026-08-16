/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ImageGenerationProvider } from '../providers/types';

/**
 * The 6 canonical materials required for Tiler benchmark evaluation.
 */
export type CanonicalMaterialKey =
  | 'cobblestone'
  | 'grass'
  | 'sand'
  | 'water'
  | 'wood'
  | 'lava';

export const CANONICAL_MATERIALS: CanonicalMaterialKey[] = [
  'cobblestone',
  'grass',
  'sand',
  'water',
  'wood',
  'lava',
];

/**
 * Versioned benchmark prompt definition
 */
export interface BenchmarkPrompt {
  promptVersion: string;
  material: CanonicalMaterialKey;
  promptText: string;
  styleText: string;
  negativePrompt?: string;
}

/**
 * Subjective quality scores (strictly marked as unassigned/pending review unless manually provided)
 */
export interface SubjectiveScores {
  textureQuality?: number | null; // Scale 0-100 or null
  promptAdherence?: number | null; // Scale 0-100 or null
  styleConsistency?: number | null; // Scale 0-100 or null
  pendingManualReview: boolean;
  notes?: string;
}

/**
 * Objective, machine-calculated metrics derived from Tiler's tileProcessor and seamAnalysisService
 */
export interface ObjectiveMetrics {
  generationLatencyMs: number;
  tileProcessingLatencyMs: number;
  totalLatencyMs: number;
  seamScore: number; // 0.0 - 1.0 (lower is better)
  horizontalSeamScore: number;
  verticalSeamScore: number;
  tileabilityScore: number; // 0 - 100 (higher is better)
  pass: boolean;
  passThreshold: number;
  outputWidth: number;
  outputHeight: number;
  checksum: string;
}

/**
 * Metadata capturing provider characteristics (recorded separately from quality scores)
 */
export interface ProviderBenchmarkMetadata {
  isFreeTier?: boolean;
  isLocal?: boolean;
  requiresApiKey?: boolean;
  modelVersion?: string;
  notes?: string;
}

/**
 * Individual result for a single material benchmark execution
 */
export interface MaterialBenchmarkResult {
  id: string;
  material: CanonicalMaterialKey;
  promptVersion: string;
  providerId: string;
  modelId: string;
  success: boolean;
  seed?: number;
  timestamp: string;
  builtPrompt?: string;
  objectiveMetrics?: ObjectiveMetrics;
  subjectiveScores: SubjectiveScores;
  providerMetadata: ProviderBenchmarkMetadata;
  errors?: string[];
}

/**
 * Preliminary weighted quality score breakdown
 */
export interface BenchmarkScoreBreakdown {
  /** 30% weight derived from mathematical seam analysis */
  tileabilityWeightedScore: number;
  /** 10% weight derived from generation latency */
  speedWeightedScore: number;
  /** Total calculated objective component score */
  objectiveTotalScore: number;
  /** Subjective score sum (null if manual review pending) */
  subjectiveTotalScore?: number | null;
  /** Preliminary quality score based on available metrics */
  preliminaryQualityScore: number;
  /** Whether all subjective scores have been manually assigned */
  isFullyEvaluated: boolean;
  /** Weight distribution configuration */
  weights: {
    tileability: number; // 0.30
    textureQuality: number; // 0.25
    promptAdherence: number; // 0.20
    styleConsistency: number; // 0.15
    generationSpeed: number; // 0.10
  };
}

/**
 * Aggregated summary for an entire benchmark run across all materials
 */
export interface BenchmarkRunSummary {
  totalMaterials: number;
  successfulMaterials: number;
  failedMaterials: number;
  passRatePercent: number;
  averageGenerationLatencyMs: number;
  averageSeamScore: number;
  overallTileabilityScore: number;
  scoreBreakdown: BenchmarkScoreBreakdown;
}

/**
 * Structured machine-readable benchmark run result (Schema)
 */
export interface BenchmarkRunResult {
  benchmarkVersion: string;
  runId: string;
  timestamp: string;
  providerId: string;
  providerName: string;
  modelId: string;
  config: {
    targetResolution: number;
    blendMarginPercent: number;
    seed?: number;
  };
  summary: BenchmarkRunSummary;
  results: MaterialBenchmarkResult[];
  markdownReport: string;
}

/**
 * Configuration options for running a benchmark suite
 */
export interface BenchmarkRunnerOptions {
  providerId?: string;
  customProvider?: ImageGenerationProvider;
  targetResolution?: number;
  blendMarginPercent?: number;
  seed?: number;
  generateMarkdownReport?: boolean;
  generateJsonReport?: boolean;
  outputDirectory?: string;
}
