/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Normalized Generation Request
 * Contains domain parameters needed to describe the visual texture to be generated.
 */
export interface GenerationRequest {
  material: string;
  style: string;
  detail?: string;
  additionalPrompt?: string;
  customPrompt?: string;
  resolution?: number;
  seed?: number;
}

/**
 * Normalized Generated Image Result
 * Output contract returned by any ImageGenerationProvider.
 * Must NOT contain provider-specific key names in the top-level contract.
 */
export interface GeneratedImage {
  /** Base64 Data URL or HTTP URL of the raw generated image */
  imageDataUrl: string;
  /** Name/identifier of the model utilized during generation */
  model: string;
  /** Complete prompt used to produce the image */
  builtPrompt: string;
  /** Generation duration in milliseconds */
  generationTimeMs: number;
  /** Provider-agnostic metadata dictionary for optional diagnostic tracking */
  metadata?: Record<string, unknown>;
}

/**
 * Standardized Provider Error
 * Thrown when an underlying provider encounters an authentication, network, or inference failure.
 */
export class ProviderError extends Error {
  public readonly providerId: string;
  public readonly originalError?: unknown;

  constructor(providerId: string, message: string, originalError?: unknown) {
    super(`[Provider:${providerId}] ${message}`);
    this.name = 'ProviderError';
    this.providerId = providerId;
    this.originalError = originalError;
  }
}

/**
 * Image Generation Provider Contract
 * Unified abstraction interface isolating Tiler's core pipeline from specific model vendors or SDKs.
 */
export interface ImageGenerationProvider {
  /** Unique provider identifier (e.g., 'gemini', 'huggingface', 'local') */
  readonly id: string;
  /** Display name of the provider */
  readonly name: string;

  /**
   * Checks if required API credentials, environment variables, or local models are ready.
   */
  isConfigured(): boolean;

  /**
   * Generates a raw visual texture candidate from a normalized GenerationRequest.
   */
  generate(request: GenerationRequest): Promise<GeneratedImage>;
}
