/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { benchmarkRunner, extractProviderMetadata } from '../benchmark';
import { PixazoImageGenerationProvider, pixazoProvider } from './pixazoProvider';
import { ProviderError } from './types';

/**
 * Unit Test Suite for Hardened Pixazo AI Provider (SDXL Base 1.0 - Phase 2D)
 * Tests provider configuration detection, timeout management, credential sanitization,
 * response parsing (sync/async/malformed), error normalization, and benchmark runner compatibility.
 */
async function runTests() {
  console.log('======================================================');
  console.log('  [PixazoProvider] Starting Unit Test Suite (Phase 2D Hardened)');
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
    assert(pixazoProvider.model === 'sdxl-base-1.0', 'Provider model property is sdxl-base-1.0');

    const metadata = extractProviderMetadata(pixazoProvider as any);
    assert(metadata.model === 'sdxl-base-1.0', 'extractProviderMetadata retrieves model sdxl-base-1.0');

    // 2. Unconfigured State & Alternative Credential Variables
    console.log('\n--- Configuration Detection & Key Hierarchy ---');
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

    // Test alternative PIXAZO_SUBSCRIPTION_KEY name
    process.env.PIXAZO_SUBSCRIPTION_KEY = 'sub-key-999';
    assert(pixazoProvider.isConfigured() === true, 'isConfigured returns true when PIXAZO_SUBSCRIPTION_KEY is set');

    process.env.PIXAZO_API_KEY = 'test-subscription-key-12345';
    assert(pixazoProvider.isConfigured() === true, 'isConfigured returns true when PIXAZO_API_KEY is set');

    // 3. Request Construction & Sync Response Mock
    console.log('\n--- SDXL Base Request Construction & Sync Response Mock ---');
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
          imageUrl: dummyBase64Png,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }) as typeof fetch;

    const syncResult = await pixazoProvider.generate({
      material: 'cobblestone',
      style: 'pixel art',
      resolution: 512,
      seed: 42,
    });

    assert(capturedUrl === 'https://gateway.pixazo.ai/getImage/v1/getSDXLImage', 'Requests official Pixazo SDXL Base gateway endpoint');
    assert(capturedHeaders['Ocp-Apim-Subscription-Key'] === 'test-subscription-key-12345', 'Includes Ocp-Apim-Subscription-Key header');
    assert(capturedBody.height === 512 && capturedBody.width === 512, 'Specifies height=512 and width=512 resolution parameters');
    assert(capturedBody.num_steps === 20 && capturedBody.guidance === 5, 'Includes num_steps=20 and guidance=5');
    assert(capturedBody.seed === 42, 'Includes seed parameter');
    assert(capturedBody.negative_prompt.length > 0, 'Includes negative_prompt parameter');
    assert(syncResult.imageDataUrl.startsWith('data:image/'), 'Returns normalized base64 Data URL');
    assert(syncResult.model === 'sdxl-base-1.0', 'Returns model name sdxl-base-1.0');
    assert(syncResult.metadata?.resolution === 512, 'Metadata records 512x512 resolution');
    assert(syncResult.metadata?.requestedMaterial === 'cobblestone', 'Metadata records requested material');

    // 4. Timeout Management & AbortController Test
    console.log('\n--- Timeout Behavior & AbortController ---');
    process.env.PIXAZO_TIMEOUT_MS = '50'; // 50ms short timeout for test

    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const signal = init?.signal;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve(new Response(JSON.stringify({ imageUrl: dummyBase64Png }), { status: 200 }));
        }, 200); // 200ms delay exceeds 50ms timeout

        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            const abortError = new Error('The operation was aborted.');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        }
      });
    }) as typeof fetch;

    let timeoutError: any;
    try {
      await pixazoProvider.generate({ material: 'water', style: 'pixel art', resolution: 512 });
    } catch (err) {
      timeoutError = err;
    }
    assert(
      timeoutError instanceof ProviderError && timeoutError.message.includes('timed out'),
      'Request aborts and throws ProviderError on timeout'
    );

    // Reset timeout env
    delete process.env.PIXAZO_TIMEOUT_MS;

    // 5. Malformed Response & Secret Redaction Test
    console.log('\n--- Malformed Response & Secret Redaction ---');
    globalThis.fetch = (async (): Promise<Response> => {
      return new Response('NOT_JSON_RESPONSE', { status: 200, headers: { 'content-type': 'text/plain' } });
    }) as typeof fetch;

    let malformedError: any;
    try {
      await pixazoProvider.generate({ material: 'lava', style: 'pixel art', resolution: 512 });
    } catch (err) {
      malformedError = err;
    }
    assert(
      malformedError instanceof ProviderError && malformedError.message.includes('malformed JSON response'),
      'Handles non-JSON response with normalized ProviderError'
    );

    // Secret Redaction Verification
    globalThis.fetch = (async (): Promise<Response> => {
      return new Response(
        JSON.stringify({ message: 'Error with key test-subscription-key-12345 invalid' }),
        { status: 401 }
      );
    }) as typeof fetch;

    let secretError: any;
    try {
      await pixazoProvider.generate({ material: 'lava', style: 'pixel art', resolution: 512 });
    } catch (err) {
      secretError = err;
    }
    assert(
      secretError instanceof ProviderError &&
        !secretError.message.includes('test-subscription-key-12345') &&
        secretError.message.includes('[REDACTED_API_KEY]'),
      'Redacts API credentials from error messages'
    );

    // 6. Async Queue Polling Handling
    console.log('\n--- Async Queue Polling Handling ---');
    let pollCount = 0;
    globalThis.fetch = (async (input: RequestInfo | URL): Promise<Response> => {
      const url = input.toString();
      if (url.includes('/getSDXLImage')) {
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
            imageUrl: dummyBase64Png,
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

    // 7. HTTP Status Errors Normalization
    console.log('\n--- HTTP Error Handling Normalization ---');
    globalThis.fetch = (async (): Promise<Response> => {
      return new Response(JSON.stringify({ message: 'Insufficient balance' }), { status: 402 });
    }) as typeof fetch;

    let quotaError: any;
    try {
      await pixazoProvider.generate({ material: 'sand', style: 'pixel art', resolution: 512 });
    } catch (err) {
      quotaError = err;
    }
    assert(
      quotaError instanceof ProviderError && quotaError.message.includes('402 Insufficient Balance'),
      'Handles 402 Insufficient Balance error cleanly'
    );

    // 8. Benchmark Runner Compatibility
    console.log('\n--- Benchmark Runner Compatibility ---');
    globalThis.fetch = (async (): Promise<Response> => {
      return new Response(
        JSON.stringify({
          imageUrl: dummyBase64Png,
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    const mockPixazo = new PixazoImageGenerationProvider();
    const benchmarkResult = await benchmarkRunner.run(mockPixazo, { resolution: 512, seed: 123 });

    assert(benchmarkResult.providerId === 'pixazo', 'Benchmark runner executes with pixazo provider');
    assert(benchmarkResult.model === 'sdxl-base-1.0', 'Benchmark run result records model sdxl-base-1.0');
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
