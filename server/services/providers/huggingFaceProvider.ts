/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PromptBuilder } from '../promptBuilder';
import { GeneratedImage, GenerationRequest, ImageGenerationProvider, ProviderError } from './types';

/**
 * Hugging Face Inference Provider (Proof of Concept - Issue #18 / Phase 2C.3)
 *
 * Integrates Hugging Face Inference Providers API targeting open-weights text-to-image models.
 * Default candidate model: black-forest-labs/FLUX.1-schnell
 * Default underlying provider: fal-ai
 *
 * Official Specs & Sources:
 * - First API Call Guide: https://huggingface.co/docs/inference-providers/guides/first-api-call
 * - Hub API Documentation: https://huggingface.co/docs/inference-providers/hub-api
 * - Pricing & Billing: https://huggingface.co/docs/inference-providers/en/pricing
 *   (Free users receive limited monthly credits: $0.10, subject to change)
 * - Text-to-Image Task: https://huggingface.co/docs/inference-providers/tasks/text-to-image
 * - Main Index: https://huggingface.co/docs/inference-providers/main/index
 *
 * Authentication:
 * - Bearer Token (HF_TOKEN or HUGGINGFACE_API_KEY) in Authorization header.
 *   Requires a fine-grained User Access Token with "Make calls to Inference Providers" permission
 *   from https://huggingface.co/settings/tokens
 *
 * Endpoint routing format: https://router.huggingface.co/{provider}/models/{model}
 * Note: 'auto' is a client-side SDK selection abstraction and must NOT be used directly as a URL segment.
 * Raw HTTP calls resolve to explicit inference providers (defaulting to 'fal-ai').
 *
 * Resolution Support:
 * - 512x512
 *
 * Pricing Classification:
 * - FREE WITH LIMITED MONTHLY CREDITS ($0.10 monthly credits for free users)
 */
export class HuggingFaceImageGenerationProvider implements ImageGenerationProvider {
  public readonly id = 'huggingface';
  public readonly name = 'Hugging Face Provider (FLUX.1 Schnell PoC)';

  public get model(): string {
    return this.getModelName();
  }

  private getApiKey(): string | undefined {
    return process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;
  }

  private getRawProviderConfig(): string {
    return process.env.HF_PROVIDER || process.env.HUGGINGFACE_PROVIDER || 'fal-ai';
  }

  private getProviderRouting(): string {
    const raw = this.getRawProviderConfig().toLowerCase().trim();
    // 'auto' is a client-side routing abstraction. Raw HTTP router endpoints require a concrete provider.
    if (raw === 'auto') {
      return 'fal-ai';
    }
    return raw || 'fal-ai';
  }

  private getModelName(): string {
    return (
      process.env.HF_MODEL ||
      process.env.HUGGINGFACE_MODEL ||
      'black-forest-labs/FLUX.1-schnell'
    );
  }

  private getEndpoint(): string {
    if (process.env.HF_ENDPOINT || process.env.HUGGINGFACE_ENDPOINT) {
      return (process.env.HF_ENDPOINT || process.env.HUGGINGFACE_ENDPOINT)!;
    }
    const provider = this.getProviderRouting();
    const model = this.getModelName();
    return `https://router.huggingface.co/${provider}/models/${model}`;
  }

  /**
   * Checks if required Hugging Face token is present in environment
   */
  public isConfigured(): boolean {
    const token = this.getApiKey();
    return typeof token === 'string' && token.trim().length > 0;
  }

  /**
   * Generates visual texture using Hugging Face Inference Providers API
   */
  public async generate(request: GenerationRequest): Promise<GeneratedImage> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new ProviderError(
        this.id,
        'Hugging Face API token (HF_TOKEN or HUGGINGFACE_API_KEY) is not configured in environment. Requires a fine-grained token with "Make calls to Inference Providers" permission from https://huggingface.co/settings/tokens.'
      );
    }

    const startTime = performance.now();
    const resolution = request.resolution || 512;

    const builtPrompt =
      request.customPrompt ||
      PromptBuilder.buildPrompt({
        material: request.material,
        style: request.style || 'stylized',
        detail: request.detail,
        additionalPrompt: request.additionalPrompt,
        resolution,
      });

    const endpoint = this.getEndpoint();
    const model = this.getModelName();
    const providerRouting = this.getProviderRouting();
    const rawConfig = this.getRawProviderConfig().toLowerCase().trim();
    const routingMode = rawConfig === 'auto' ? 'auto' : 'explicit-provider';

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Use-Cache': 'false',
    };

    const parameters: Record<string, any> = {
      width: resolution,
      height: resolution,
    };

    if (typeof request.seed === 'number') {
      parameters.seed = request.seed;
    }

    const payload = {
      inputs: builtPrompt,
      parameters,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorDetails = '';
        const rawText = await response.text().catch(() => '');
        if (rawText) {
          try {
            const errJson = JSON.parse(rawText);
            errorDetails =
              errJson.error?.message ||
              errJson.error ||
              errJson.message ||
              JSON.stringify(errJson);
          } catch {
            errorDetails = rawText;
          }
        }

        // Sanitize error details to ensure tokens are never leaked
        if (apiKey) {
          errorDetails = errorDetails.split(apiKey).join('[REDACTED_HF_TOKEN]');
        }

        const debugInfo = `[URL: POST ${endpoint} | Status: ${response.status} ${response.statusText} | Body: ${errorDetails.trim()}]`;

        if (response.status === 401) {
          throw new ProviderError(
            this.id,
            `Hugging Face API returned 401 Unauthorized ("${errorDetails.trim()}"). Ensure HF_TOKEN is a valid fine-grained User Access Token with "Make calls to Inference Providers" permission from https://huggingface.co/settings/tokens. ${debugInfo}`
          );
        }
        if (response.status === 402) {
          throw new ProviderError(
            this.id,
            `Hugging Face API returned 402 Payment Required / Insufficient Free Credits. Free monthly credit allowance ($0.10) may be exhausted. ${debugInfo}`
          );
        }
        if (response.status === 403) {
          throw new ProviderError(
            this.id,
            `Hugging Face API returned 403 Forbidden. Access denied for model or provider. ${debugInfo}`
          );
        }
        if (response.status === 404) {
          throw new ProviderError(
            this.id,
            `Hugging Face API returned 404 Resource / Model Not Found. ${debugInfo}`
          );
        }
        if (response.status === 429) {
          throw new ProviderError(
            this.id,
            `Hugging Face API returned 429 Rate Limit Exceeded. ${debugInfo}`
          );
        }
        if (response.status === 503) {
          throw new ProviderError(
            this.id,
            `Hugging Face API returned 503 Provider / Model Currently Unavailable or Loading. ${debugInfo}`
          );
        }

        throw new ProviderError(
          this.id,
          `Hugging Face API HTTP error ${response.status}: ${response.statusText}. ${debugInfo}`
        );
      }

      // Check header for actual provider if returned by router
      const actualProviderHeader =
        response.headers.get('x-compute-provider') ||
        response.headers.get('x-provider') ||
        response.headers.get('x-inference-provider');

      const underlyingProvider = actualProviderHeader || providerRouting;

      const contentType = response.headers.get('content-type') || '';
      let imageDataUrl = '';

      if (contentType.includes('application/json')) {
        const body = await response.json();

        let rawImgStr: string | undefined;
        if (Array.isArray(body) && body[0]) {
          rawImgStr = body[0].generated_image || body[0].image || body[0].url;
        } else if (typeof body === 'object' && body !== null) {
          rawImgStr = body.generated_image || body.image || body.url || body.b64_json;
        }

        if (!rawImgStr) {
          throw new ProviderError(
            this.id,
            `Hugging Face JSON response missing expected image data: ${JSON.stringify(body)}`
          );
        }

        if (rawImgStr.startsWith('data:image/')) {
          imageDataUrl = rawImgStr;
        } else if (rawImgStr.startsWith('http://') || rawImgStr.startsWith('https://')) {
          imageDataUrl = await this.fetchImageAsDataUrl(rawImgStr);
        } else {
          // Assume raw base64 string
          imageDataUrl = `data:image/png;base64,${rawImgStr}`;
        }
      } else {
        // Direct binary image response payload
        const arrayBuf = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const mimeType = contentType.startsWith('image/') ? contentType : 'image/jpeg';
        imageDataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
      }

      const endTime = performance.now();
      const generationTimeMs = Math.round((endTime - startTime) * 100) / 100;

      return {
        imageDataUrl,
        model,
        builtPrompt,
        generationTimeMs,
        metadata: {
          providerId: this.id,
          model,
          underlyingInferenceProvider: underlyingProvider,
          routingMode,
          endpoint,
          isFree: true,
          pricingClassification: 'FREE WITH LIMITED MONTHLY CREDITS',
          monthlyCreditsAllowanceUSD: 0.1,
          supportsSeed: typeof request.seed === 'number',
          resolution,
          requestedMaterial: request.material,
        },
      };
    } catch (err: any) {
      if (err instanceof ProviderError) {
        throw err;
      }
      throw new ProviderError(
        this.id,
        `Failed to generate image via Hugging Face API: ${err.message}`,
        err
      );
    }
  }

  /**
   * Helper to fetch hosted image URL and convert to base64 Data URL
   */
  private async fetchImageAsDataUrl(urlOrDataUrl: string): Promise<string> {
    if (urlOrDataUrl.startsWith('data:image/')) {
      return urlOrDataUrl;
    }

    const res = await fetch(urlOrDataUrl);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new ProviderError(
        this.id,
        `Failed to download generated image from Hugging Face URL (HTTP ${res.status} ${res.statusText}): ${errText}`
      );
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/png';

    return `data:${contentType};base64,${buffer.toString('base64')}`;
  }
}

export const huggingFaceProvider = new HuggingFaceImageGenerationProvider();
