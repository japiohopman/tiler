/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { geminiProvider } from './providers/geminiProvider';
import { GeneratedImage, GenerationRequest, ImageGenerationProvider, ProviderError } from './providers/types';

/**
 * Generation Service
 * Core application service that manages ImageGenerationProviders and delegates generation requests.
 * Completely decouples routing and domain logic from specific model providers.
 */
export class GenerationService {
  private providers: Map<string, ImageGenerationProvider> = new Map();
  private defaultProviderId = 'gemini';

  constructor() {
    // Register default providers
    this.registerProvider(geminiProvider);
  }

  /**
   * Registers a new ImageGenerationProvider implementation
   */
  public registerProvider(provider: ImageGenerationProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Retrieves a registered provider by ID or falls back to the default provider
   */
  public getProvider(providerId?: string): ImageGenerationProvider {
    const id = providerId || this.defaultProviderId;
    const provider = this.providers.get(id);
    if (!provider) {
      throw new ProviderError(id, `Image generation provider '${id}' is not registered.`);
    }
    return provider;
  }

  /**
   * Sets the default provider ID
   */
  public setDefaultProvider(providerId: string): void {
    if (!this.providers.has(providerId)) {
      throw new ProviderError(providerId, `Cannot set default provider. '${providerId}' is not registered.`);
    }
    this.defaultProviderId = providerId;
  }

  /**
   * Checks if the active or specified provider has valid configuration
   */
  public isConfigured(providerId?: string): boolean {
    try {
      const provider = this.getProvider(providerId);
      return provider.isConfigured();
    } catch {
      return false;
    }
  }

  /**
   * Generates a raw image texture by delegating to the specified or default provider
   */
  public async generate(request: GenerationRequest, providerId?: string): Promise<GeneratedImage> {
    const provider = this.getProvider(providerId);
    if (!provider.isConfigured()) {
      throw new ProviderError(
        provider.id,
        `Provider '${provider.name}' (${provider.id}) is not configured.`
      );
    }
    return provider.generate(request);
  }
}

export const generationService = new GenerationService();
