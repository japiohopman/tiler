/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InferenceClient } from '@huggingface/inference';
import { PromptBuilder } from '../promptBuilder';
import { GeneratedImage, GenerationRequest, ImageGenerationProvider, ProviderError } from './types';

/**
 * Hugging Face Inference Provider (Proof of Concept - Issue #18 / Phase 2C.3)
 *
 * Integrates Hugging Face Inference Providers API using the official `@huggingface/inference` SDK.
 * Default candidate model: black-forest-labs/FLUX.1-schnell
 * Default underlying provider: fal-ai
 *
 * Official Specs & Sources:
 * - First API Call Guide: https://huggingface.co/docs/inference-providers/guides/first-api-call
 * - Huggingface.js Inference README: https://huggingface.co/docs/huggingface.js/en/inference/README
 * - Pricing & Billing: https://huggingface.co/docs/inference-providers/en/pricing
 *   (Free users receive limited monthly credits: $0.10, subject to change)
 * - Text-to-Image Task: https://huggingface.co/docs/inference-providers/tasks/text-to-image
 *
 * Authentication:
 * - Bearer Token (HF_TOKEN or HUGGINGFACE_API_KEY) in InferenceClient constructor.
 *   Requires a fine-grained User Access Token with "Make calls to Inference Providers" permission
 *   from https://huggingface.co/settings/tokens
 *
 * Architecture & Provider Selection:
 * - ImageGenerationProvider -> HuggingFaceImageGenerationProvider -> InferenceClient -> fal-ai -> FLUX.1-schnell
 * - Uses client.textToImage({ model, inputs, provider, parameters })
 * - provider defaults to 'fal-ai'
 * - Can be overridden via HF_PROVIDER environment variable (e.g. HF_PROVIDER=together, HF_PROVIDER=replicate, HF_PROVIDER=auto)
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

  private getProviderRouting(): string {
    const raw = process.env.HF_PROVIDER || process.env.HUGGINGFACE_PROVIDER || 'fal-ai';
    return raw.trim() || 'fal-ai';
  }

  private getModelName(): string {
    return (
      process.env.HF_MODEL ||
      process.env.HUGGINGFACE_MODEL ||
      'black-forest-labs/FLUX.1-schnell'
    );
  }

  /**
   * Checks if required Hugging Face token is present in environment
   */
  public isConfigured(): boolean {
    const token = this.getApiKey();
    return typeof token === 'string' && token.trim().length > 0;
  }

  /**
   * Generates visual texture using Hugging Face Inference Providers API via @huggingface/inference SDK
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

    const model = this.getModelName();
    const providerRouting = this.getProviderRouting();

    const parameters: Record<string, any> = {
      width: resolution,
      height: resolution,
    };

    if (typeof request.seed === 'number') {
      parameters.seed = request.seed;
    }

    try {
      const client = new InferenceClient(apiKey);

      const requestArgs: Record<string, any> = {
        model,
        inputs: builtPrompt,
        parameters,
        provider: providerRouting as any,
      };

      // Execute text-to-image request using official Hugging Face SDK
      const imageResult: any = await client.textToImage(requestArgs as any);

      let imageDataUrl = '';

      if (typeof imageResult === 'object' && imageResult !== null && typeof imageResult.arrayBuffer === 'function') {
        const arrayBuf = await imageResult.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const mimeType = imageResult.type || 'image/png';
        imageDataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
      } else if (typeof imageResult === 'string') {
        const rawStr = imageResult as string;
        if (rawStr.startsWith('data:image/')) {
          imageDataUrl = rawStr;
        } else if (rawStr.startsWith('http://') || rawStr.startsWith('https://')) {
          imageDataUrl = await this.fetchImageAsDataUrl(rawStr);
        } else {
          imageDataUrl = `data:image/png;base64,${rawStr}`;
        }
      } else {
        throw new ProviderError(
          this.id,
          `Hugging Face SDK returned an unexpected response format: ${typeof imageResult}`
        );
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
          underlyingInferenceProvider: providerRouting === 'auto' ? 'auto' : providerRouting,
          routingMode: providerRouting === 'auto' ? 'auto' : 'explicit-provider',
          providerRouting,
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

      let errorMsg = err?.message || String(err);
      const httpStatus = err?.response?.status || err?.status;

      // Sanitize error details to ensure tokens are never leaked
      if (apiKey) {
        errorMsg = errorMsg.split(apiKey).join('[REDACTED_HF_TOKEN]');
      }

      if (httpStatus === 401 || errorMsg.includes('401') || errorMsg.includes('Unauthorized') || errorMsg.includes('Invalid username or password')) {
        throw new ProviderError(
          this.id,
          `Hugging Face API returned 401 Unauthorized ("${errorMsg}"). Ensure HF_TOKEN is a valid fine-grained User Access Token with "Make calls to Inference Providers" permission from https://huggingface.co/settings/tokens.`
        );
      }
      if (httpStatus === 402 || errorMsg.includes('402') || errorMsg.includes('Payment Required') || errorMsg.includes('credit')) {
        throw new ProviderError(
          this.id,
          `Hugging Face API returned 402 Payment Required / Insufficient Free Credits ("${errorMsg}"). Free monthly credit allowance ($0.10) may be exhausted.`
        );
      }
      if (httpStatus === 403 || errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
        throw new ProviderError(
          this.id,
          `Hugging Face API returned 403 Forbidden ("${errorMsg}"). Access denied for model or provider.`
        );
      }
      if (httpStatus === 404 || errorMsg.includes('404') || errorMsg.includes('Not Found')) {
        throw new ProviderError(
          this.id,
          `Hugging Face API returned 404 Resource / Model Not Found ("${errorMsg}").`
        );
      }
      if (httpStatus === 429 || errorMsg.includes('429') || errorMsg.includes('Rate Limit')) {
        throw new ProviderError(
          this.id,
          `Hugging Face API returned 429 Rate Limit Exceeded ("${errorMsg}").`
        );
      }

      throw new ProviderError(
        this.id,
        `Failed to generate image via Hugging Face API: ${errorMsg}`,
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
