/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeneratedImage, GenerationRequest, ImageGenerationProvider, ProviderError } from './providers/types';

/**
 * Generation Service
 * Core application service that manages ImageGenerationProviders and delegates generation requests.
 * Completely decoupled from concrete provider implementations. Providers are registered via application bootstrap.
 */
export class GenerationService {
  private providers: Map<string, ImageGenerationProvider> = new Map();
  private defaultProviderId?: string;

  constructor(initialProviders: ImageGenerationProvider[] = [], defaultProviderId?: string) {
    for (const provider of initialProviders) {
      this.registerProvider(provider);
    }
    if (defaultProviderId) {
      this.defaultProviderId = defaultProviderId;
    } else if (initialProviders.length > 0) {
      this.defaultProviderId = initialProviders[0].id;
    }
  }

  /**
   * Registers a new ImageGenerationProvider implementation
   */
  public registerProvider(provider: ImageGenerationProvider): void {
    this.providers.set(provider.id, provider);
    if (!this.defaultProviderId) {
      this.defaultProviderId = provider.id;
    }
  }

  /**
   * Retrieves a registered provider by ID or falls back to the default provider
   */
  public getProvider(providerId?: string): ImageGenerationProvider {
    const id = providerId || this.defaultProviderId;
    if (!id) {
      throw new ProviderError('none', 'No image generation providers are currently registered in GenerationService.');
    }
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
   * Returns the ID of the current default provider, if set
   */
  public getDefaultProviderId(): string | undefined {
    return this.defaultProviderId;
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
