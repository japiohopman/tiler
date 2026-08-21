/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
import { generationService } from './services/generationService';
import { geminiProvider } from './services/providers/geminiProvider';
import { mockProvider } from './services/providers/mockProvider';
import { huggingFaceProvider } from './services/providers/huggingFaceProvider';
import { pixazoProvider } from './services/providers/pixazoProvider';
import { pollinationsProvider } from './services/providers/pollinationsProvider';

// Ensure environment variables from .env / .env.local are loaded prior to provider configuration
dotenv.config();

/**
 * Application Composition & Provider Bootstrap Layer
 * Registers concrete image generation providers into the GenerationService container.
 *
 * SAFETY PRINCIPLE:
 * Development/test configuration explicitly prefers `mockProvider` by default.
 * This prevents local development from accidentally consuming paid/limited API quota
 * even if API keys exist in the environment.
 * To use an external provider explicitly, set `IMAGE_PROVIDER=huggingface`, `IMAGE_PROVIDER=pollinations`, `IMAGE_PROVIDER=pixazo`, or `IMAGE_PROVIDER=gemini`.
 */
export function bootstrapProviders(): void {
  // Register available image generation providers
  generationService.registerProvider(mockProvider);
  generationService.registerProvider(geminiProvider);
  generationService.registerProvider(pixazoProvider);
  generationService.registerProvider(pollinationsProvider);
  generationService.registerProvider(huggingFaceProvider);

  // Environment-driven provider selection (Explicit opt-in required)
  const envProvider = (process.env.IMAGE_PROVIDER || process.env.DEFAULT_PROVIDER || '').toLowerCase().trim();

  if (envProvider === 'gemini') {
    generationService.setDefaultProvider('gemini');
  } else if (envProvider === 'pixazo') {
    generationService.setDefaultProvider('pixazo');
  } else if (envProvider === 'pollinations') {
    generationService.setDefaultProvider('pollinations');
  } else if (envProvider === 'huggingface' || envProvider === 'hf') {
    generationService.setDefaultProvider('huggingface');
  } else {
    // Default explicitly to deterministic Mock provider to protect API quota
    generationService.setDefaultProvider('mock');
  }
}

// Auto-run bootstrap on module load for seamless server/API router operation
bootstrapProviders();
