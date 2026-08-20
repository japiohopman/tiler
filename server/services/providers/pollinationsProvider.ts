/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PromptBuilder } from '../promptBuilder';
import { GeneratedImage, GenerationRequest, ImageGenerationProvider, ProviderError } from './types';

/**
 * Pollinations AI Image Generation Provider (Proof of Concept - Issue #17 / Phase 2C.2)
 *
 * Integrates Pollinations AI Serverless API targeting the FLUX.1 Schnell model.
 *
 * Official Specs & Sources:
 * - OpenAPI Documentation (v0.3.0): https://gen.pollinations.ai/docs
 * - Default Gateway Host: https://gen.pollinations.ai
 * - Primary Image Endpoint: GET https://gen.pollinations.ai/image/{prompt}
 * - OpenAI-Compatible Endpoint: POST https://gen.pollinations.ai/v1/images/generations
 * - Model Identifier: flux (FLUX.1 Schnell)
 * - Authentication: Bearer Token (POLLINATIONS_API_KEY) in Authorization header or ?key=
 * - Resolution Support: 512x512
 * - Query Parameters: model, width, height, seed, nologo, safe
 */
export class PollinationsImageGenerationProvider implements ImageGenerationProvider {
  public readonly id = 'pollinations';
  public readonly name = 'Pollinations AI Provider (FLUX.1 Schnell PoC)';

  public get model(): string {
    return this.getModelName();
  }

  private getApiKey(): string | undefined {
    return process.env.POLLINATIONS_API_KEY || process.env.POLLINATIONS_KEY;
  }

  private getEndpoint(): string {
    const rawEndpoint =
      process.env.POLLINATIONS_ENDPOINT || 'https://gen.pollinations.ai/image';
    return rawEndpoint.endsWith('/') ? rawEndpoint.slice(0, -1) : rawEndpoint;
  }

  private getModelName(): string {
    return process.env.POLLINATIONS_MODEL || 'flux';
  }

  /**
   * Checks if required Pollinations API key is present in environment
   */
  public isConfigured(): boolean {
    const key = this.getApiKey();
    return typeof key === 'string' && key.trim().length > 0;
  }

  /**
   * Generates visual texture using Pollinations AI image endpoint
   */
  public async generate(request: GenerationRequest): Promise<GeneratedImage> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new ProviderError(
        this.id,
        'Pollinations API key (POLLINATIONS_API_KEY) is not configured in environment.'
      );
    }

    const startTime = performance.now();
    const resolution = request.resolution || 512;

    const builtPrompt =
      request.customPrompt ||
      PromptBuilder.buildPrompt({
        material: request.material,
        style: request.style,
        detail: request.detail,
        additionalPrompt: request.additionalPrompt,
        resolution,
      });

    const endpoint = this.getEndpoint();
    const model = this.getModelName();

    const queryParams = new URLSearchParams({
      model,
      width: resolution.toString(),
      height: resolution.toString(),
      nologo: 'true',
    });

    if (typeof request.seed === 'number') {
      queryParams.set('seed', request.seed.toString());
    }

    const requestUrl = `${endpoint}/${encodeURIComponent(builtPrompt)}?${queryParams.toString()}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Cache-Control': 'no-cache',
    };

    try {
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        let errorDetails = '';
        const rawText = await response.text().catch(() => '');
        if (rawText) {
          try {
            const errJson = JSON.parse(rawText);
            errorDetails =
              errJson.error?.message ||
              errJson.message ||
              errJson.error ||
              JSON.stringify(errJson);
          } catch {
            errorDetails = rawText;
          }
        }

        // Sanitize error details to ensure credentials are never leaked
        if (apiKey) {
          errorDetails = errorDetails.split(apiKey).join('[REDACTED_API_KEY]');
        }

        const debugInfo = `[URL: GET ${endpoint} | Status: ${response.status} ${response.statusText} | Body: ${errorDetails.trim()}]`;

        if (response.status === 401) {
          throw new ProviderError(
            this.id,
            `Pollinations API returned 401 Unauthorized. A valid API key is required from https://enter.pollinations.ai/keys. ${debugInfo}`
          );
        }
        if (response.status === 402) {
          throw new ProviderError(
            this.id,
            `Pollinations API returned 402 Payment Required / Insufficient pollen balance. ${debugInfo}`
          );
        }
        if (response.status === 403) {
          throw new ProviderError(
            this.id,
            `Pollinations API returned 403 Forbidden. Model access denied. ${debugInfo}`
          );
        }
        if (response.status === 404) {
          throw new ProviderError(
            this.id,
            `Pollinations API returned 404 Resource Not Found. ${debugInfo}`
          );
        }
        if (response.status === 429) {
          throw new ProviderError(
            this.id,
            `Pollinations API returned 429 Rate Limit Exceeded. ${debugInfo}`
          );
        }

        throw new ProviderError(
          this.id,
          `Pollinations API HTTP error ${response.status}: ${response.statusText}. ${debugInfo}`
        );
      }

      const contentType = response.headers.get('content-type') || '';
      let imageDataUrl = '';

      if (contentType.includes('application/json')) {
        const body = await response.json();
        const imageUrl =
          body.data?.[0]?.b64_json
            ? `data:image/png;base64,${body.data[0].b64_json}`
            : body.data?.[0]?.url || body.imageUrl || body.url || body.image_url;

        if (!imageUrl) {
          throw new ProviderError(
            this.id,
            `Pollinations API JSON response missing output image URL or b64_json: ${JSON.stringify(
              body
            )}`
          );
        }

        imageDataUrl = await this.fetchImageAsDataUrl(imageUrl);
      } else {
        // Direct binary image response (e.g. image/jpeg, image/png)
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
          isFree: false,
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
        `Failed to generate image via Pollinations API: ${err.message}`,
        err
      );
    }
  }

  /**
   * Converts hosted image URL or base64 data to base64 Data URL
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
        `Failed to download generated image from Pollinations URL (HTTP ${res.status} ${res.statusText}): ${errText}`
      );
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/png';

    return `data:${contentType};base64,${buffer.toString('base64')}`;
  }
}

export const pollinationsProvider = new PollinationsImageGenerationProvider();
