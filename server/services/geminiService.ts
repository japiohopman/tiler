/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { PromptBuilder, PromptBuildOptions } from './promptBuilder';

export interface GenerateTileRequest {
  material: string;
  style: string;
  detail?: string;
  additionalPrompt?: string;
  customPrompt?: string;
  resolution?: number;
  seed?: number;
}

export interface RawGenerationResult {
  imageDataUrl: string;
  model: string;
  builtPrompt: string;
  requestedParams: GenerateTileRequest;
  generationTimeMs: number;
}

/**
 * Server-Side Gemini Image Generation Service
 *
 * SECURITY:
 * - The GEMINI_API_KEY remains strictly server-side and is never sent to the browser.
 * - Uses lazy client initialization to prevent crash on startup if key is pending.
 */
export class GeminiTextureService {
  private ai: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (!this.ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        throw new Error('GEMINI_API_KEY is not configured in server environment. Please set GEMINI_API_KEY in Settings or .env.');
      }
      this.ai = new GoogleGenAI({ apiKey });
    }
    return this.ai;
  }

  /**
   * Checks if Gemini API credentials are validly configured in the server environment
   */
  isConfigured(): boolean {
    const key = process.env.GEMINI_API_KEY;
    return Boolean(key && key.trim() !== '' && key !== 'MY_GEMINI_API_KEY');
  }

  /**
   * Generates a raw base visual texture from the structured GenerateTileRequest.
   *
   * IMPORTANT:
   * This service generates the raw AI image from Gemini.
   * The application must NEVER assume the model actually produced a seamless tile.
   * Every generated image must subsequently pass through the Sharp tile processor
   * and mathematical seam analyzer.
   */
  async generateRawTexture(request: GenerateTileRequest): Promise<RawGenerationResult> {
    const startTime = Date.now();
    const resolution = request.resolution || 512;

    // Construct the specialized 2D game ground texture prompt
    const builtPrompt = PromptBuilder.buildPrompt({
      material: request.material,
      style: request.style,
      detail: request.detail,
      additionalPrompt: request.additionalPrompt || request.customPrompt,
      resolution,
    });

    const ai = this.getClient();
    let imageDataUrl = '';
    let usedModel = 'gemini-3.1-flash-image';

    try {
      // Primary Attempt: gemini-3.1-flash-image with 1:1 aspect ratio and 512px size
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: {
          parts: [
            {
              text: builtPrompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: '1:1',
            imageSize: '512px',
          },
        },
      });

      const candidate = response.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData?.data) {
            const mimeType = part.inlineData.mimeType || 'image/png';
            imageDataUrl = `data:${mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (!imageDataUrl && candidate?.finishReason) {
        throw new Error(`Model finished without image part. Reason: ${candidate.finishReason}`);
      }
    } catch (primaryError: any) {
      console.warn('Primary model gemini-3.1-flash-image error, attempting fallback:', primaryError?.message || primaryError);

      // Fallback 1: gemini-3.1-flash-lite-image
      try {
        usedModel = 'gemini-3.1-flash-lite-image';
        const liteResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [
              {
                text: builtPrompt,
              },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: '1:1',
            },
          },
        });

        const liteCandidate = liteResponse.candidates?.[0];
        if (liteCandidate?.content?.parts) {
          for (const part of liteCandidate.content.parts) {
            if (part.inlineData?.data) {
              const mimeType = part.inlineData.mimeType || 'image/png';
              imageDataUrl = `data:${mimeType};base64,${part.inlineData.data}`;
              break;
            }
          }
        }
      } catch (liteError: any) {
        console.warn('Fallback model gemini-3.1-flash-lite-image error, attempting imagen fallback:', liteError?.message || liteError);

        // Fallback 2: imagen-3.0-generate-002
        try {
          usedModel = 'imagen-3.0-generate-002';
          const imgResponse = await (ai.models as any).generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: builtPrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/png',
              aspectRatio: '1:1',
            },
          });

          if (imgResponse.generatedImages?.[0]?.image?.imageBytes) {
            imageDataUrl = `data:image/png;base64,${imgResponse.generatedImages[0].image.imageBytes}`;
          }
        } catch (imgError: any) {
          // If all model calls fail, bubble up the clearest error
          throw new Error(
            `Gemini Image Generation failed: ${primaryError?.message || liteError?.message || imgError?.message || 'Unknown API error'}`
          );
        }
      }
    }

    if (!imageDataUrl) {
      throw new Error('No image data returned from Gemini image generation service.');
    }

    const duration = Date.now() - startTime;

    return {
      imageDataUrl,
      model: usedModel,
      builtPrompt,
      requestedParams: request,
      generationTimeMs: duration,
    };
  }
}

export const geminiTextureService = new GeminiTextureService();
