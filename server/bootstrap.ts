/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { generationService } from './services/generationService';
import { geminiProvider } from './services/providers/geminiProvider';
import { mockProvider } from './services/providers/mockProvider';

/**
 * Application Composition & Provider Bootstrap Layer
 * Registers concrete image generation providers into the GenerationService container.
 *
 * SAFETY PRINCIPLE:
 * Development/test configuration explicitly prefers `mockProvider` by default.
 * This prevents local development from accidentally consuming paid/limited API quota
 * even if GEMINI_API_KEY happens to exist in the environment.
 * To use Gemini explicitly, set `IMAGE_PROVIDER=gemini` in your environment.
 */
export function bootstrapProviders(): void {
  // Register available providers
  generationService.registerProvider(mockProvider);
  generationService.registerProvider(geminiProvider);

  // Environment-driven provider selection (Explicit opt-in required for 'gemini')
  const envProvider = (process.env.IMAGE_PROVIDER || process.env.DEFAULT_PROVIDER || '').toLowerCase().trim();

  if (envProvider === 'gemini') {
    generationService.setDefaultProvider('gemini');
  } else {
    // Default explicitly to deterministic Mock provider to protect API quota
    generationService.setDefaultProvider('mock');
  }
}

// Auto-run bootstrap on module load for seamless server/API router operation
bootstrapProviders();
