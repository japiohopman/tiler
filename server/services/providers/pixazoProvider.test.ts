/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { benchmarkRunner } from '../benchmark';
import { PixazoImageGenerationProvider, pixazoProvider } from './pixazoProvider';
import { ProviderError } from './types';

/**
 * Unit Test Suite for Pixazo AI Provider (SDXL PoC - Issue #15 / Phase 2C.1)
 * Tests provider configuration detection, SDXL API request construction, async queue polling,
 * HTTP error normalization, and benchmark runner compatibility using mocked fetch responses.
 */
async function runTests() {
  console.log('======================================================');
  console.log('  [PixazoProvider] Starting Unit Test Suite (SDXL)');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, description: string) {
    total++;
    if (condition) {
      console.log(`  ✓ ${description}: PASSED`);
      passed++;
    } else {
      console.error(`  ❌ ${description}: FAILED`);
      throw new Error(`Assertion failed: ${description}`);
    }
  }

  // Preserve global fetch & env
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  try {
    // 1. Basic Provider Identity & Metadata
    console.log('--- Provider Properties & Metadata ---');
    assert(pixazoProvider.id === 'pixazo', 'Provider id is pixazo');
    assert(pixazoProvider.name.includes('Pixazo'), 'Provider name includes Pixazo');

    // 2. Unconfigured State
    console.log('\n--- Configuration Detection ---');
    delete process.env.PIXAZO_API_KEY;
    delete process.env.PIXAZO_SUBSCRIPTION_KEY;

    assert(pixazoProvider.isConfigured() === false, 'isConfigured returns false when API key is missing');

    let unconfiguredError: any;
    try {
      await pixazoProvider.generate({ material: 'cobblestone', style: 'pixel art', resolution: 512 });
    } catch (err) {
      unconfiguredError = err;
    }
    assert(
      unconfiguredError instanceof ProviderError && unconfiguredError.providerId === 'pixazo',
      'generate throws normalized ProviderError when unconfigured'
    );

    // 3. Configured State
    process.env.PIXAZO_API_KEY = 'test-subscription-key-12345';
    assert(pixazoProvider.isConfigured() === true, 'isConfigured returns true when PIXAZO_API_KEY is present');

    // 4. Request Construction & Synchronous Response Mock
    console.log('\n--- SDXL Request Construction & Sync Response Mock ---');
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = {};

    const dummyBase64Png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      capturedUrl = input.toString();
      if (init?.headers) {
        capturedHeaders = init.headers as Record<string, string>;
      }
      if (init?.body) {
        capturedBody = JSON.parse(init.body as string);
      }

      if (capturedUrl.startsWith('data:image/')) {
        return new Response(Buffer.from('fake'), { status: 200, headers: { 'content-type': 'image/png' } });
      }

      return new Response(
        JSON.stringify({
          status: 'COMPLETED',
          request_id: 'test-sdxl-001',
          output: {
            media_url: [dummyBase64Png],
            media_type: 'image/png',
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }) as typeof fetch;

    const syncResult = await pixazoProvider.generate({
      material: 'cobblestone',
      style: 'pixel art',
      resolution: 512,
    });

    assert(capturedUrl === 'https://gateway.pixazo.ai/sdxl/v1/text-to-image', 'Requests default Pixazo SDXL gateway endpoint');
    assert(capturedHeaders['Ocp-Apim-Subscription-Key'] === 'test-subscription-key-12345', 'Includes Ocp-Apim-Subscription-Key header');
    assert(capturedBody.width === 512 && capturedBody.height === 512, 'Specifies 512x512 resolution parameters');
    assert(syncResult.imageDataUrl.startsWith('data:image/'), 'Returns normalized base64 Data URL');
    assert(syncResult.model === 'sdxl', 'Returns model name sdxl');
    assert(syncResult.metadata?.isFree === true, 'Metadata identifies free-tier offering');

    // 5. Asynchronous Queue Polling
    console.log('\n--- Async Queue Polling Handling ---');
    let pollCount = 0;
    globalThis.fetch = (async (input: RequestInfo | URL): Promise<Response> => {
      const url = input.toString();
      if (url.includes('/text-to-image')) {
        return new Response(
          JSON.stringify({
            request_id: 'test-async-123',
            status: 'QUEUED',
            polling_url: 'https://gateway.pixazo.ai/v2/requests/status/test-async-123',
          }),
          { status: 200 }
        );
      }
      if (url.includes('/status/test-async-123')) {
        pollCount++;
        if (pollCount === 1) {
          return new Response(
            JSON.stringify({ status: 'PROCESSING', request_id: 'test-async-123' }),
            { status: 200 }
          );
        }
        return new Response(
          JSON.stringify({
            status: 'COMPLETED',
            request_id: 'test-async-123',
            output: { media_url: [dummyBase64Png] },
          }),
          { status: 200 }
        );
      }
      return new Response(Buffer.from('fake'), { status: 200, headers: { 'content-type': 'image/png' } });
    }) as typeof fetch;

    const asyncResult = await pixazoProvider.generate({
      material: 'grass',
      style: 'pixel art',
      resolution: 512,
    });

    assert(pollCount >= 2, 'Polls status endpoint until status is COMPLETED');
    assert(asyncResult.imageDataUrl.startsWith('data:image/'), 'Returns image upon async completion');

    // 6. HTTP Error Handling
    console.log('\n--- HTTP Error Handling ---');
    globalThis.fetch = (async (): Promise<Response> => {
      return new Response(JSON.stringify({ message: 'Invalid subscription key' }), { status: 401 });
    }) as typeof fetch;

    let authError: any;
    try {
      await pixazoProvider.generate({ material: 'sand', style: 'pixel art', resolution: 512 });
    } catch (err) {
      authError = err;
    }
    assert(authError instanceof ProviderError && authError.message.includes('401 Unauthorized'), 'Handles 401 Unauthorized error cleanly');

    globalThis.fetch = (async (): Promise<Response> => {
      return new Response(JSON.stringify({ message: 'Insufficient balance' }), { status: 402 });
    }) as typeof fetch;

    let quotaError: any;
    try {
      await pixazoProvider.generate({ material: 'sand', style: 'pixel art', resolution: 512 });
    } catch (err) {
      quotaError = err;
    }
    assert(quotaError instanceof ProviderError && quotaError.message.includes('402 Insufficient Balance'), 'Handles 402 Insufficient Balance error cleanly');

    // 7. Benchmark Runner Compatibility with Mocked Pixazo Provider
    console.log('\n--- Benchmark Runner Compatibility ---');
    globalThis.fetch = (async (): Promise<Response> => {
      return new Response(
        JSON.stringify({
          status: 'COMPLETED',
          request_id: 'bm-test-001',
          output: { media_url: [dummyBase64Png] },
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    const mockPixazo = new PixazoImageGenerationProvider();
    const benchmarkResult = await benchmarkRunner.run(mockPixazo, { resolution: 512, seed: 123 });

    assert(benchmarkResult.providerId === 'pixazo', 'Benchmark runner executes with pixazo provider');
    assert(benchmarkResult.summary.total === 6, 'Benchmark runner evaluates all 6 materials');
    assert(benchmarkResult.summary.successful === 6, 'All 6 mocked material generations succeed');

    console.log('\n======================================================');
    console.log(`  Pixazo Provider Test Suite Results: ${passed}/${total} Tests Passed`);
    console.log('======================================================\n');
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
}

runTests().catch((err) => {
  console.error('Pixazo provider test suite error:', err);
  process.exit(1);
});
