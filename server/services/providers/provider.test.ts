/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { bootstrapProviders } from '../../bootstrap';
import { tileProcessor } from '../../image/tileProcessor';
import { generationService, GenerationService } from '../generationService';
import { seamAnalysisService } from '../seamAnalysisService';
import { geminiProvider } from './geminiProvider';
import { huggingFacePoCProvider } from './huggingFacePoCProvider';
import { mockProvider } from './mockProvider';
import { GeneratedImage, GenerationRequest, ImageGenerationProvider, ProviderError } from './types';

/**
 * Custom Mock Test Provider for verifying provider-agnostic execution
 */
class CustomTestProvider implements ImageGenerationProvider {
  public readonly id = 'custom-test';
  public readonly name = 'Custom Test Provider';
  public configured = true;

  isConfigured(): boolean {
    return this.configured;
  }

  async generate(request: GenerationRequest): Promise<GeneratedImage> {
    if (!this.isConfigured()) {
      throw new ProviderError(this.id, 'Custom provider is not configured');
    }

    return {
      imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      model: 'custom-model-v1',
      builtPrompt: `Custom prompt for ${request.material}`,
      generationTimeMs: 42,
      metadata: { customFlag: true },
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

  // Test 2: Register CustomTestProvider into isolated GenerationService
  const custom = new CustomTestProvider();
  isolatedService.registerProvider(custom);
  const retrieved = isolatedService.getProvider('custom-test');
  assert(retrieved.id === 'custom-test', 'Isolated GenerationService registered and retrieved CustomTestProvider');

  // Test 3: Generation workflow operates seamlessly through provider abstraction
  const customResult = await isolatedService.generate(
    { material: 'cobblestone', style: 'stylized' },
    'custom-test'
  );
  assert(customResult.model === 'custom-model-v1', 'Returned normalized result from custom provider');
  assert(customResult.imageDataUrl.startsWith('data:image/png'), 'Returned valid base64 image data URL');
  assert(customResult.generationTimeMs === 42, 'Returned valid generation duration');

  // Test 4: MockImageGenerationProvider satisfies ImageGenerationProvider contract
  assert(mockProvider.id === 'mock', 'MockProvider has correct id');
  assert(mockProvider.isConfigured() === true, 'MockProvider requires no API key and is always configured');

  // Test 5: MockProvider generates deterministic images supporting all GenerationRequest fields
  const mockReq: GenerationRequest = {
    material: 'lava',
    style: 'pixel-art',
    detail: 'ultra',
    additionalPrompt: 'glowing veins',
    customPrompt: 'custom topdown magma',
    resolution: 256,
    seed: 12345,
  };
  const mockRes1 = await mockProvider.generate(mockReq);
  const mockRes2 = await mockProvider.generate(mockReq);

  assert(mockRes1.model === 'deterministic-mock-v1', 'MockProvider uses model deterministic-mock-v1');
  assert(mockRes1.imageDataUrl === mockRes2.imageDataUrl, 'MockProvider generates 100% deterministic output for identical request/seed');
  assert(mockRes1.metadata?.isDevelopmentMock === true, 'MockProvider metadata marks asset as development/test mock');
  assert(mockRes1.metadata?.seed === 12345, 'MockProvider preserves request seed');

  // Test 6: HuggingFacePoCProvider satisfies ImageGenerationProvider contract and handles missing tokens
  assert(huggingFacePoCProvider.id === 'huggingface', 'HuggingFacePoCProvider has correct id');
  const prevHfToken = process.env.HF_TOKEN;
  delete process.env.HF_TOKEN;
  delete process.env.HUGGINGFACE_API_KEY;
  assert(huggingFacePoCProvider.isConfigured() === false, 'HuggingFacePoCProvider returns false when HF_TOKEN is absent');

  process.env.HF_TOKEN = 'test_hf_token';
  assert(huggingFacePoCProvider.isConfigured() === true, 'HuggingFacePoCProvider returns true when HF_TOKEN is present');
  delete process.env.HF_TOKEN;
  if (prevHfToken) process.env.HF_TOKEN = prevHfToken;

  // Test 7: GeminiProvider satisfies ImageGenerationProvider interface
  assert(geminiProvider.id === 'gemini', 'GeminiProvider has correct id');
  assert(typeof geminiProvider.isConfigured === 'function', 'GeminiProvider implements isConfigured');
  assert(typeof geminiProvider.generate === 'function', 'GeminiProvider implements generate');

  // Test 8: Bootstrap explicitly prefers MockProvider by default to protect API quota
  delete process.env.IMAGE_PROVIDER;
  delete process.env.DEFAULT_PROVIDER;
  bootstrapProviders();
  assert(generationService.getDefaultProviderId() === 'mock', 'Bootstrap explicitly prefers MockProvider by default');

  // Test 9: Bootstrap respects explicit IMAGE_PROVIDER=gemini and IMAGE_PROVIDER=huggingface
  process.env.IMAGE_PROVIDER = 'gemini';
  bootstrapProviders();
  assert(generationService.getDefaultProviderId() === 'gemini', 'Bootstrap respects explicit IMAGE_PROVIDER=gemini opt-in');

  process.env.IMAGE_PROVIDER = 'huggingface';
  bootstrapProviders();
  assert(generationService.getDefaultProviderId() === 'huggingface', 'Bootstrap respects explicit IMAGE_PROVIDER=huggingface opt-in');
  delete process.env.IMAGE_PROVIDER;

  // Test 10: Complete End-to-End Local Pipeline Integration Test
  // MockProvider -> GenerationService -> TileProcessor -> SeamAnalyzer
  // Runs 100% offline without Gemini, network access, API credentials, or GPU
  generationService.setDefaultProvider('mock');
  const rawTile = await generationService.generate({
    material: 'cobblestone',
    style: 'stylized',
    resolution: 256,
    seed: 8888,
  });
  assert(rawTile.imageDataUrl.startsWith('data:image/png'), 'End-to-End Local Pipeline Step 1: Raw Mock Image Generated');

  const processedTile = await tileProcessor.processTile(rawTile.imageDataUrl, {
    algorithm: 'offset-crossfade',
    blendMarginPercent: 10,
    targetWidth: 256,
    targetHeight: 256,
  });
  assert(processedTile.processedImageDataUrl.startsWith('data:image/png'), 'End-to-End Local Pipeline Step 2: Sharp Offset Tile Processed');

  const seamReport = await seamAnalysisService.analyzeSeams(processedTile.processedImageDataUrl, {
    threshold: 0.05,
    edgeRegion: 4,
  });
  assert(typeof seamReport.overallScore === 'number', 'End-to-End Local Pipeline Step 3: Seam Score Analyzed');
  assert(seamReport.pass === true, 'End-to-End Local Pipeline Step 4: Seam Validation Passed');

  // Test 11: Unconfigured provider errors are caught cleanly as ProviderError
  custom.configured = false;
  let caughtError = false;
  try {
    await isolatedService.generate({ material: 'grass', style: 'realistic' }, 'custom-test');
  } catch (err) {
    if (err instanceof ProviderError && err.providerId === 'custom-test') {
      caughtError = true;
    }
  }
  assert(caughtError, 'Unconfigured provider throws normalized ProviderError');

  // Test 12: Unknown provider ID throws ProviderError
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
