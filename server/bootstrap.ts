/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { generationService } from './services/generationService';
import { geminiProvider } from './services/providers/geminiProvider';

/**
 * Application Composition & Provider Bootstrap Layer
 * Registers concrete image generation providers into the GenerationService container.
 * This is the ONLY place in the application where concrete providers are composed and registered.
 */
export function bootstrapProviders(): void {
  // Register default Gemini provider
  generationService.registerProvider(geminiProvider);
  generationService.setDefaultProvider(geminiProvider.id);
}

// Auto-run bootstrap on module load for seamless server/API router operation
bootstrapProviders();
