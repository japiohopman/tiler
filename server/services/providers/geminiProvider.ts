/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { PromptBuilder } from '../promptBuilder';
import { GeneratedImage, GenerationRequest, ImageGenerationProvider, ProviderError } from './types';

/**
 * Concrete Gemini Image Generation Provider (Temporary / Isolated)
 * Encapsulates all Google GenAI SDK logic and GEMINI_API_KEY credential checks behind the ImageGenerationProvider contract.
 */
export class GeminiProvider implements ImageGenerationProvider {
  public readonly id = 'gemini';
  public readonly name = 'Google Gemini Provider';

  private ai: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (!this.ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        throw new ProviderError(
          this.id,
          'GEMINI_API_KEY is not configured in server environment. Please set GEMINI_API_KEY in .env.'
        );
      }
      this.ai = new GoogleGenAI({ apiKey });
    }
    return this.ai;
  }

  /**
   * Checks if Gemini API credentials are validly configured in the environment
   */
  isConfigured(): boolean {
    const key = process.env.GEMINI_API_KEY;
    return Boolean(key && key.trim() !== '' && key !== 'MY_GEMINI_API_KEY');
  }

  /**
   * Generates a raw visual texture candidate using Gemini / Imagen API
   */
  async generate(request: GenerationRequest): Promise<GeneratedImage> {
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

    let ai: GoogleGenAI;
    try {
      ai = this.getClient();
    } catch (err) {
      throw err instanceof ProviderError ? err : new ProviderError(this.id, 'Failed to initialize Gemini client', err);
    }

    let imageDataUrl = '';
    let usedModel = 'gemini-3.1-flash-image';

    try {
      // Primary Attempt: gemini-3.1-flash-image
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: {
          parts: [{ text: builtPrompt }],
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
      console.warn('[GeminiProvider] Primary model gemini-3.1-flash-image error, attempting lite fallback:', primaryError?.message || primaryError);

      // Fallback 1: gemini-3.1-flash-lite-image
      try {
        usedModel = 'gemini-3.1-flash-lite-image';
        const liteResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [{ text: builtPrompt }],
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
        console.warn('[GeminiProvider] Fallback model gemini-3.1-flash-lite-image error, attempting imagen fallback:', liteError?.message || liteError);

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
          throw new ProviderError(
            this.id,
            `All Gemini image generation attempts failed: ${primaryError?.message || liteError?.message || imgError?.message || 'Unknown error'}`,
            imgError
          );
        }
      }
    }

    if (!imageDataUrl) {
      throw new ProviderError(this.id, 'No image data was returned by Gemini generation service.');
    }

    const duration = Date.now() - startTime;

    return {
      imageDataUrl,
      model: usedModel,
      builtPrompt,
      generationTimeMs: duration,
      metadata: {
        providerId: this.id,
        fallbackChainEvaluated: usedModel !== 'gemini-3.1-flash-image',
      },
    };
  }
}

export const geminiProvider = new GeminiProvider();
