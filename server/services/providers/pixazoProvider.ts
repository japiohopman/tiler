/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PromptBuilder } from '../promptBuilder';
import { GeneratedImage, GenerationRequest, ImageGenerationProvider, ProviderError } from './types';

/**
 * Pixazo AI Image Generation Provider (Phase 2D Production-Hardened Integration)
 *
 * Integrates Pixazo Serverless AI Gateway API targeting the FREE SDXL Base 1.0 model.
 *
 * Official Specs & Sources:
 * - Free API Overview: https://www.pixazo.ai/api/free
 * - SDXL Base 1.0 Model Documentation: https://www.pixazo.ai/models/sdxl
 * - Default Gateway Endpoint: https://gateway.pixazo.ai/getImage/v1/getSDXLImage
 * - Status Polling Endpoint: https://gateway.pixazo.ai/v2/requests/status/{request_id}
 * - Authentication Header: Ocp-Apim-Subscription-Key
 * - Resolution Support: 512x512
 * - Request Schema: prompt, negative_prompt, height, width, num_steps, guidance, seed
 * - Response Schema: imageUrl
 */
export class PixazoImageGenerationProvider implements ImageGenerationProvider {
  public readonly id = 'pixazo';
  public readonly name = 'Pixazo AI Provider (SDXL Base 1.0)';

  public get model(): string {
    return this.getModelName();
  }

  private getApiKey(): string | undefined {
    return process.env.PIXAZO_API_KEY || process.env.PIXAZO_SUBSCRIPTION_KEY;
  }

  private getEndpoint(): string {
    return (
      process.env.PIXAZO_ENDPOINT ||
      'https://gateway.pixazo.ai/getImage/v1/getSDXLImage'
    );
  }

  private getModelName(): string {
    return process.env.PIXAZO_MODEL || 'sdxl-base-1.0';
  }

  private getTimeoutMs(): number {
    const envVal = process.env.PIXAZO_TIMEOUT_MS;
    if (envVal) {
      const parsed = parseInt(envVal, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return 30000; // 30 seconds default request timeout
  }

  /**
   * Redacts sensitive API keys or subscription tokens from error messages or debug logs
   */
  private sanitizeErrorMessage(message: string, apiKey?: string): string {
    let sanitized = message;
    if (apiKey) {
      sanitized = sanitized.split(apiKey).join('[REDACTED_API_KEY]');
    }
    const envKey1 = process.env.PIXAZO_API_KEY;
    if (envKey1) {
      sanitized = sanitized.split(envKey1).join('[REDACTED_API_KEY]');
    }
    const envKey2 = process.env.PIXAZO_SUBSCRIPTION_KEY;
    if (envKey2) {
      sanitized = sanitized.split(envKey2).join('[REDACTED_API_KEY]');
    }
    return sanitized;
  }

  /**
   * Checks if required Pixazo API subscription key is present in environment
   */
  public isConfigured(): boolean {
    const key = this.getApiKey();
    return typeof key === 'string' && key.trim().length > 0;
  }

  /**
   * Generates visual texture using Pixazo SDXL Base 1.0 text-to-image API
   */
  public async generate(request: GenerationRequest): Promise<GeneratedImage> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new ProviderError(
        this.id,
        'Pixazo API key (PIXAZO_API_KEY or PIXAZO_SUBSCRIPTION_KEY) is not configured in environment.'
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
    const timeoutMs = this.getTimeoutMs();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Ocp-Apim-Subscription-Key': apiKey,
    };

    const payload: Record<string, any> = {
      prompt: builtPrompt,
      negative_prompt: 'blurry, distorted, low quality, 3d render, perspective view, character, face',
      height: resolution,
      width: resolution,
      num_steps: 20,
      guidance: 5,
    };

    if (typeof request.seed === 'number') {
      payload.seed = request.seed;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorDetails = '';
        const rawText = await response.text().catch(() => '');
        if (rawText) {
          try {
            const errJson = JSON.parse(rawText);
            errorDetails = errJson.message || errJson.error || JSON.stringify(errJson);
          } catch {
            errorDetails = rawText;
          }
        }

        const debugInfo = `[URL: POST ${endpoint} | Status: ${response.status} ${response.statusText} | Body: ${this.sanitizeErrorMessage(errorDetails.trim(), apiKey)}]`;

        if (response.status === 401) {
          throw new ProviderError(
            this.id,
            `Pixazo API returned 401 Unauthorized. Check your API subscription key. ${debugInfo}`
          );
        }
        if (response.status === 402) {
          throw new ProviderError(
            this.id,
            `Pixazo API returned 402 Insufficient Balance / Quota Exceeded. ${debugInfo}`
          );
        }
        if (response.status === 404) {
          throw new ProviderError(
            this.id,
            `Pixazo API returned 404 Resource Not Found. ${debugInfo}`
          );
        }
        if (response.status === 429) {
          throw new ProviderError(
            this.id,
            `Pixazo API returned 429 Rate Limit Exceeded. ${debugInfo}`
          );
        }

        throw new ProviderError(
          this.id,
          `Pixazo API HTTP error ${response.status}: ${response.statusText}. ${debugInfo}`
        );
      }

      let body: any;
      try {
        body = await response.json();
      } catch (jsonErr) {
        throw new ProviderError(
          this.id,
          'Failed to parse Pixazo API response as JSON: malformed payload.'
        );
      }

      if (!body || typeof body !== 'object') {
        throw new ProviderError(
          this.id,
          'Pixazo API returned invalid non-object response payload.'
        );
      }

      let imageUrl: string | undefined;
      let requestId: string | undefined = body.request_id || body.requestId;

      // Primary SDXL Base 1.0 schema: { imageUrl: "..." }
      if (body.imageUrl) {
        imageUrl = body.imageUrl;
      } else if (body.status === 'QUEUED' || body.status === 'PROCESSING' || (requestId && !body.output)) {
        imageUrl = await this.pollQueueStatus(requestId!, apiKey, body.polling_url, controller.signal);
      } else if (body.output?.media_url && body.output.media_url.length > 0) {
        imageUrl = body.output.media_url[0];
      } else if (body.image_url) {
        imageUrl = body.image_url;
      } else if (body.url) {
        imageUrl = body.url;
      } else if (body.imageDataUrl) {
        imageUrl = body.imageDataUrl;
      }

      if (!imageUrl) {
        throw new ProviderError(
          this.id,
          'Pixazo API response missing output image URL.'
        );
      }

      // Ensure normalized base64 Data URL output
      const imageDataUrl = await this.fetchImageAsDataUrl(imageUrl, controller.signal);

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
          isFree: true,
          pricingTier: 'free-tier/open-beta',
          supportsSeed: typeof request.seed === 'number',
          requestId,
          resolution,
          requestedMaterial: request.material,
        },
      };
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        throw new ProviderError(
          this.id,
          `Pixazo API generation request timed out after ${timeoutMs}ms.`
        );
      }
      if (err instanceof ProviderError) {
        err.message = this.sanitizeErrorMessage(err.message, apiKey);
        throw err;
      }
      const errMsg = err?.message || String(err);
      throw new ProviderError(
        this.id,
        this.sanitizeErrorMessage(`Failed to generate image via Pixazo API: ${errMsg}`, apiKey),
        err
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Polls Pixazo status endpoint until task completes or fails
   */
  private async pollQueueStatus(
    requestId: string,
    apiKey: string,
    pollingUrlOverride?: string,
    signal?: AbortSignal
  ): Promise<string> {
    const pollingUrl =
      pollingUrlOverride || `https://gateway.pixazo.ai/v2/requests/status/${requestId}`;

    const maxAttempts = 30; // 30 seconds max polling iterations
    const pollIntervalMs = 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (signal?.aborted) {
        throw new ProviderError(
          this.id,
          `Pixazo async polling aborted for request_id ${requestId}.`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

      if (signal?.aborted) {
        throw new ProviderError(
          this.id,
          `Pixazo async polling aborted for request_id ${requestId}.`
        );
      }

      const response = await fetch(pollingUrl, {
        method: 'GET',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
        },
        signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new ProviderError(
          this.id,
          `Polling Pixazo status failed HTTP ${response.status}: ${response.statusText} (${this.sanitizeErrorMessage(errText, apiKey)})`
        );
      }

      let body: any;
      try {
        body = await response.json();
      } catch {
        throw new ProviderError(
          this.id,
          `Polling Pixazo status returned invalid JSON response for request_id ${requestId}.`
        );
      }

      if (body.status === 'COMPLETED' && (body.imageUrl || body.output?.media_url?.length > 0)) {
        return body.imageUrl || body.output.media_url[0];
      }

      if (body.status === 'FAILED' || body.status === 'ERROR') {
        const errDetail = body.error || 'Unknown error';
        throw new ProviderError(
          this.id,
          `Pixazo async generation failed: ${this.sanitizeErrorMessage(errDetail, apiKey)}`
        );
      }
    }

    throw new ProviderError(
      this.id,
      `Pixazo async generation timed out after ${maxAttempts} seconds for request_id ${requestId}.`
    );
  }

  /**
   * Fetches hosted image URL and converts to base64 Data URL if needed
   */
  private async fetchImageAsDataUrl(urlOrDataUrl: string, signal?: AbortSignal): Promise<string> {
    if (urlOrDataUrl.startsWith('data:image/')) {
      return urlOrDataUrl;
    }

    const res = await fetch(urlOrDataUrl, { signal });
    if (!res.ok) {
      let errText = '';
      try {
        errText = await res.text();
      } catch {
        // ignore
      }
      throw new ProviderError(
        this.id,
        `Failed to download generated image from ${urlOrDataUrl} (HTTP ${res.status} ${res.statusText}): ${this.sanitizeErrorMessage(errText)}`
      );
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/png';

    return `data:${contentType};base64,${buffer.toString('base64')}`;
  }
}

export const pixazoProvider = new PixazoImageGenerationProvider();
