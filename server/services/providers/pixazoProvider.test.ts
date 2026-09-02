/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { benchmarkRunner, extractProviderMetadata } from '../benchmark';
import { PixazoImageGenerationProvider, pixazoProvider } from './pixazoProvider';
import { ProviderError } from './types';

/**
 * Unit Test Suite for Pixazo AI Provider (Phase 2D Production-Hardened Integration)
 * Tests provider configuration detection, SDXL Base API request construction, async queue polling,
 * HTTP error normalization, secret redaction, request timeout/abort, and benchmark runner compatibility.
 */
async function runTests() {
  console.log('======================================================');
  console.log('  [PixazoProvider] Starting Production Unit Test Suite');
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

    // 2. Unconfigured State & Fallback Credential Variable Support
    console.log('\n--- Configuration Detection & Alternative Credential Names ---');
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

    // Test alternative variable name PIXAZO_SUBSCRIPTION_KEY
    process.env.PIXAZO_SUBSCRIPTION_KEY = 'sub-key-alias-999';
    assert(pixazoProvider.isConfigured() === true, 'isConfigured returns true when PIXAZO_SUBSCRIPTION_KEY is present');

    delete process.env.PIXAZO_SUBSCRIPTION_KEY;
    process.env.PIXAZO_API_KEY = 'test-subscription-key-12345';
    assert(pixazoProvider.isConfigured() === true, 'isConfigured returns true when PIXAZO_API_KEY is present');

    // 3. Request Construction & Synchronous Response Mock (imageUrl schema)
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
    assert(capturedBody.num_steps === 25 && capturedBody.guidance === 7.5, 'Includes num_steps=25 and guidance=7.5');
    assert(capturedBody.seed === 42, 'Includes seed parameter');
    assert(capturedBody.negative_prompt.length > 0, 'Includes negative_prompt parameter');
    assert(syncResult.imageDataUrl.startsWith('data:image/'), 'Returns normalized base64 Data URL');
    assert(syncResult.model === 'sdxl-base-1.0', 'Returns model name sdxl-base-1.0');
    assert(syncResult.metadata?.isFree === true, 'Metadata identifies free-tier offering');

    // 4. Asynchronous Queue Polling Handling
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

    // 5. Secret Redaction & Error Handling
    console.log('\n--- Secret Redaction & HTTP Error Handling ---');
    globalThis.fetch = (async (): Promise<Response> => {
      return new Response(`<html>401 Unauthorized for key test-subscription-key-12345</html>`, {
        status: 401,
        headers: { 'content-type': 'text/html' },
      });
    }) as typeof fetch;

    let authError: any;
    try {
      await pixazoProvider.generate({ material: 'sand', style: 'pixel art', resolution: 512 });
    } catch (err) {
      authError = err;
    }
    assert(
      authError instanceof ProviderError && authError.message.includes('401 Unauthorized'),
      'Handles plain HTML 401 error cleanly'
    );
    assert(
      !authError.message.includes('test-subscription-key-12345'),
      'Redacts API secret token from error message'
    );

    // 6. Malformed Response Handling
    console.log('\n--- Malformed Response Handling ---');
    globalThis.fetch = (async (): Promise<Response> => {
      return new Response('Not valid json {{{', { status: 200 });
    }) as typeof fetch;

    let malformedError: any;
    try {
      await pixazoProvider.generate({ material: 'lava', style: 'stylized', resolution: 512 });
    } catch (err) {
      malformedError = err;
    }
    assert(
      malformedError instanceof ProviderError && malformedError.message.includes('malformed payload'),
      'Handles malformed JSON response body with normalized ProviderError'
    );

    // 7. Timeout / AbortController Handling
    console.log('\n--- Timeout & AbortController Handling ---');
    process.env.PIXAZO_TIMEOUT_MS = '50'; // 50ms short timeout for test

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      return new Promise((resolve, reject) => {
        const signal = init?.signal;
        const timer = setTimeout(() => {
          resolve(new Response(JSON.stringify({ imageUrl: dummyBase64Png }), { status: 200 }));
        }, 500); // 500ms delay to trigger 50ms timeout

        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            const abortErr = new Error('The operation was aborted');
            abortErr.name = 'AbortError';
            reject(abortErr);
          });
        }
      });
    }) as typeof fetch;

    let timeoutError: any;
    try {
      await pixazoProvider.generate({ material: 'wood', style: 'stylized', resolution: 512 });
    } catch (err) {
      timeoutError = err;
    }
    assert(
      timeoutError instanceof ProviderError && timeoutError.message.includes('timed out after 50ms'),
      'Aborts stalled request and throws normalized ProviderError on timeout'
    );

    delete process.env.PIXAZO_TIMEOUT_MS;

    // 8. Benchmark Runner Compatibility with Mocked Pixazo Provider
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
