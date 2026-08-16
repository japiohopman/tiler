/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PromptBuilder } from '../promptBuilder';
import { GeneratedImage, GenerationRequest, ImageGenerationProvider, ProviderError } from './types';

/**
 * Minimal Proof-of-Concept Provider for Hugging Face Serverless Inference API
 *
 * RESEARCH & POC ONLY:
 * Demonstrates calling open diffusion models hosted on Hugging Face Hub.
 * Requires `HF_TOKEN` or `HUGGINGFACE_API_KEY` in environment variables.
 */
export class HuggingFacePoCProvider implements ImageGenerationProvider {
  public readonly id = 'huggingface';
  public readonly name = 'Hugging Face Inference API (Experimental PoC)';

  private readonly defaultModel = 'black-forest-labs/FLUX.1-schnell';

  /**
   * Checks if required Hugging Face API token is present in environment
   */
  public isConfigured(): boolean {
    const token = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;
    return Boolean(token && token.trim() !== '' && token !== 'MY_HF_TOKEN');
  }

  /**
   * Generates a raw image using Hugging Face Serverless Inference API
   */
  public async generate(request: GenerationRequest): Promise<GeneratedImage> {
    const token = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;
    if (!token || token === 'MY_HF_TOKEN') {
      throw new ProviderError(
        this.id,
        'HF_TOKEN or HUGGINGFACE_API_KEY is not configured in server environment.'
      );
    }

    const startTime = performance.now();
    const resolution = request.resolution || 512;
    const model = process.env.HF_MODEL_ID || this.defaultModel;

    const builtPrompt = PromptBuilder.buildPrompt({
      material: request.material,
      style: request.style,
      detail: request.detail,
      additionalPrompt: request.additionalPrompt || request.customPrompt,
      resolution,
    });

    const endpoint = `https://api-inference.huggingface.co/models/${model}`;

    const payload = {
      inputs: builtPrompt,
      parameters: {
        width: resolution,
        height: resolution,
        seed: request.seed,
      },
      options: {
        wait_for_model: true,
      },
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorDetails = '';
        try {
          const errJson = await response.json();
          errorDetails = errJson.error || errJson.message || JSON.stringify(errJson);
        } catch {
          errorDetails = await response.text();
        }

        if (response.status === 503) {
          throw new ProviderError(
            this.id,
            `Hugging Face model '${model}' is currently loading into memory. Details: ${errorDetails}`
          );
        }

        throw new ProviderError(
          this.id,
          `Hugging Face API error (${response.status}): ${errorDetails}`
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = response.headers.get('content-type') || 'image/png';
      const imageDataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

      const endTime = performance.now();
      const duration = Math.round((endTime - startTime) * 100) / 100;

      return {
        imageDataUrl,
        model: `huggingface/${model}`,
        builtPrompt,
        generationTimeMs: duration,
        metadata: {
          providerId: this.id,
          model,
          isPoC: true,
        },
      };
    } catch (err: any) {
      if (err instanceof ProviderError) {
        throw err;
      }
      throw new ProviderError(this.id, `Failed to execute Hugging Face inference: ${err?.message || err}`, err);
    }
  }
}

export const huggingFacePoCProvider = new HuggingFacePoCProvider();
