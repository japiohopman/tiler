/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GenerationService } from '../generationService';
import { geminiProvider } from './geminiProvider';
import { GeneratedImage, GenerationRequest, ImageGenerationProvider, ProviderError } from './types';

/**
 * Mock Test Provider for verifying provider-agnostic execution
 */
class MockProvider implements ImageGenerationProvider {
  public readonly id = 'mock';
  public readonly name = 'Mock Test Provider';
  public configured = true;

  isConfigured(): boolean {
    return this.configured;
  }

  async generate(request: GenerationRequest): Promise<GeneratedImage> {
    if (!this.isConfigured()) {
      throw new ProviderError(this.id, 'Mock provider is not configured');
    }

    return {
      imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      model: 'mock-model-v1',
      builtPrompt: `Mock prompt for ${request.material}`,
      generationTimeMs: 42,
      metadata: { mockFlag: true },
    };
  }
}

export async function runProviderTestSuite() {
  console.log('\n======================================================');
  console.log('  [ProviderAbstraction] Starting Unit Test Suite');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`  ✓ ${testName}: PASSED`);
      passed++;
    } else {
      console.error(`  ✕ ${testName}: FAILED`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // Test 1: Isolated GenerationService instantiation with ZERO default providers
  const isolatedService = new GenerationService();
  let emptyErrorCaught = false;
  try {
    isolatedService.getProvider();
  } catch (err) {
    if (err instanceof ProviderError) {
      emptyErrorCaught = true;
    }
  }
  assert(emptyErrorCaught, 'Isolated GenerationService throws ProviderError when no providers registered');

  // Test 2: Register MockProvider into isolated GenerationService
  const mock = new MockProvider();
  isolatedService.registerProvider(mock);
  const retrieved = isolatedService.getProvider('mock');
  assert(retrieved.id === 'mock', 'Isolated GenerationService registered and retrieved MockProvider');

  // Test 3: Generation workflow operates seamlessly in total isolation from Gemini
  const mockResult = await isolatedService.generate(
    { material: 'cobblestone', style: 'stylized' },
    'mock'
  );
  assert(mockResult.model === 'mock-model-v1', 'Returned normalized result from mock provider');
  assert(mockResult.imageDataUrl.startsWith('data:image/png'), 'Returned valid base64 image data URL');
  assert(mockResult.generationTimeMs === 42, 'Returned valid generation duration');

  // Test 4: GeminiProvider satisfies ImageGenerationProvider interface
  assert(geminiProvider.id === 'gemini', 'GeminiProvider has correct id');
  assert(typeof geminiProvider.isConfigured === 'function', 'GeminiProvider implements isConfigured');
  assert(typeof geminiProvider.generate === 'function', 'GeminiProvider implements generate');

  // Test 5: Unconfigured provider errors are caught cleanly as ProviderError
  mock.configured = false;
  let caughtError = false;
  try {
    await isolatedService.generate({ material: 'grass', style: 'realistic' }, 'mock');
  } catch (err) {
    if (err instanceof ProviderError && err.providerId === 'mock') {
      caughtError = true;
    }
  }
  assert(caughtError, 'Unconfigured provider throws normalized ProviderError');

  // Test 6: Unknown provider ID throws ProviderError
  let unknownCaught = false;
  try {
    isolatedService.getProvider('non-existent-provider');
  } catch (err) {
    if (err instanceof ProviderError) {
      unknownCaught = true;
    }
  }
  assert(unknownCaught, 'Requesting unregistered provider throws ProviderError');

  console.log('\n======================================================');
  console.log(`  Suite Results: ${passed}/${total} Tests Passed`);
  console.log('======================================================\n');

  return { passed, total };
}

// Allow direct CLI execution via tsx
if (process.argv[1]?.includes('provider.test')) {
  runProviderTestSuite().catch((e) => {
    console.error('Provider test suite failed:', e);
    process.exit(1);
  });
}
