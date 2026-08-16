/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SeamAnalysisResult } from '../../../src/types';

/**
 * Canonical material identifiers supported in Tiler benchmarks
 */
export type BenchmarkMaterialId =
  | 'cobblestone'
  | 'grass'
  | 'sand'
  | 'water'
  | 'wood'
  | 'lava';

/**
 * Material definition with version-controlled prompt
 */
export interface BenchmarkMaterialConfig {
  id: BenchmarkMaterialId;
  name: string;
  description: string;
  prompt: string;
  promptVersion: string;
  defaultStyle: string;
}

/**
 * Subjective quality assessment scores (0 - 100)
 * Marked as `null` until evaluated by human reviewers
 */
export interface SubjectiveScores {
  /** Texture visual quality and seamless integration aesthetics (Weight: 25%) */
  textureQuality: number | null;
  /** How accurately image reflects requested material & game asset constraints (Weight: 20%) */
  promptAdherence: number | null;
  /** Aesthetic consistency across texture set (Weight: 15%) */
  styleConsistency: number | null;
}

/**
 * Component scores contributing to weighted total score
 */
export interface ScoreComponents {
  tileability: number | null;
  textureQuality: number | null;
  promptAdherence: number | null;
  styleConsistency: number | null;
  generationSpeed: number | null;
}

/**
 * Weighted quality score calculation result
 */
export interface WeightedQualityScore {
  /** Score evaluated from available metrics */
  score: number | null;
  /** Maximum score achievable given currently evaluated metrics */
  maxEvaluatedWeight: number;
  /** Component sub-scores */
  components: ScoreComponents;
  /** Explanatory note detailing objective vs subjective score availability */
  note: string;
}

/**
 * Metadata capturing provider traits without influencing quality score
 */
export interface ProviderMetadata {
  id: string;
  name: string;
  model: string;
  isFree: boolean;
  pricingTier: string;
  supportsSeed: boolean;
  [key: string]: unknown;
}

/**
 * Metric result for a single benchmark test material
 */
export interface MaterialBenchmarkResult {
  material: BenchmarkMaterialId;
  prompt: string;
  promptVersion: string;
  width: number;
  height: number;
  seed?: number;
  success: boolean;
  latencyMs: number;
  seamScore: number | null;
  tileabilityScore: number | null;
  pass: boolean | null;
  rawGenerationTimeMs: number | null;
  tileProcessingTimeMs: number | null;
  subjectiveScores: SubjectiveScores;
  providerMetadata: ProviderMetadata;
  weightedQualityScore: WeightedQualityScore;
  errors: string[];
  timestamp: string;
  processedImageDataUrl?: string;
  seamResult?: SeamAnalysisResult;
}

/**
 * Summary statistics for a full benchmark run
 */
export interface BenchmarkSummary {
  total: number;
  successful: number;
  failed: number;
  averageLatencyMs: number;
  averageSeamScore: number | null;
  overallPassRate: number;
}

/**
 * Configurable options for running a benchmark
 */
export interface BenchmarkRunOptions {
  resolution?: number;
  seed?: number;
  materials?: BenchmarkMaterialId[];
  blendMarginPercent?: number;
  includeImageDataUrlInReport?: boolean;
}

/**
 * Structured, machine-readable result contract for a benchmark run
 */
export interface BenchmarkRunResult {
  benchmarkVersion: string;
  providerId: string;
  providerName: string;
  model: string;
  timestamp: string;
  options: BenchmarkRunOptions;
  summary: BenchmarkSummary;
  results: MaterialBenchmarkResult[];
}
