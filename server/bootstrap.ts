/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { generationService } from './services/generationService';
import { geminiProvider } from './services/providers/geminiProvider';
import { huggingFacePoCProvider } from './services/providers/huggingFacePoCProvider';
import { mockProvider } from './services/providers/mockProvider';

/**
 * Application Composition & Provider Bootstrap Layer
 * Registers concrete image generation providers into the GenerationService container.
 *
 * SAFETY PRINCIPLE:
 * Development/test configuration explicitly prefers `mockProvider` by default.
 * This prevents local development from accidentally consuming paid/limited API quota.
 * Supported provider choices: 'mock' (default), 'gemini', 'huggingface' (experimental PoC).
 */
export function bootstrapProviders(): void {
  // Register available providers
  generationService.registerProvider(mockProvider);
  generationService.registerProvider(geminiProvider);
  generationService.registerProvider(huggingFacePoCProvider);

  // Environment-driven provider selection
  const envProvider = (process.env.IMAGE_PROVIDER || process.env.DEFAULT_PROVIDER || '').toLowerCase().trim();

  if (envProvider === 'gemini') {
    generationService.setDefaultProvider('gemini');
  } else if (envProvider === 'huggingface') {
    generationService.setDefaultProvider('huggingface');
  } else {
    // Default explicitly to deterministic Mock provider for zero-cost, offline development
    generationService.setDefaultProvider('mock');
  }
}

// Auto-run bootstrap on module load for seamless server/API router operation
bootstrapProviders();
