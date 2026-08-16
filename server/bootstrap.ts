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
 * Configures the active/default provider based on environment configuration or availability.
 */
export function bootstrapProviders(): void {
  // Register available providers
  generationService.registerProvider(mockProvider);
  generationService.registerProvider(geminiProvider);

  // Environment-driven provider selection
  const envProvider = (process.env.IMAGE_PROVIDER || process.env.DEFAULT_PROVIDER || '').toLowerCase().trim();

  if (envProvider && (envProvider === 'mock' || envProvider === 'gemini')) {
    generationService.setDefaultProvider(envProvider);
  } else if (geminiProvider.isConfigured()) {
    // Default to Gemini if GEMINI_API_KEY is configured
    generationService.setDefaultProvider(geminiProvider.id);
  } else {
    // Fallback automatically to deterministic Mock provider if no API key is present
    generationService.setDefaultProvider(mockProvider.id);
  }
}

// Auto-run bootstrap on module load for seamless server/API router operation
bootstrapProviders();
