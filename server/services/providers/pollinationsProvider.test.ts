/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { benchmarkRunner, extractProviderMetadata } from '../benchmark';
import { PollinationsImageGenerationProvider, pollinationsProvider } from './pollinationsProvider';
import { ProviderError } from './types';

/**
 * Unit Test Suite for Pollinations AI Provider (FLUX.1 Schnell PoC - Issue #17 / Phase 2C.2)
 * Tests provider configuration detection, official API request construction, Bearer token auth,
 * binary and JSON response parsing, single-stream error reading, error status codes, and benchmark runner compatibility.
 */
async function runTests() {
  console.log('======================================================');
  console.log('  [PollinationsProvider] Starting Unit Test Suite (FLUX.1)');
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

  // Valid 1x1 transparent PNG buffer for sharp compatibility
  const validPngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  try {
    // 1. Basic Provider Identity & Metadata
    console.log('--- Provider Properties & Metadata ---');
    assert(pollinationsProvider.id === 'pollinations', 'Provider id is pollinations');
    assert(pollinationsProvider.name.includes('Pollinations'), 'Provider name includes Pollinations');
    assert(pollinationsProvider.model === 'flux', 'Provider model property default is flux');

    const metadata = extractProviderMetadata(pollinationsProvider as any);
    assert(metadata.model === 'flux', 'extractProviderMetadata retrieves model flux');

    // 2. Unconfigured State
    console.log('\n--- Configuration Detection ---');
    delete process.env.POLLINATIONS_API_KEY;
    delete process.env.POLLINATIONS_KEY;

    assert(pollinationsProvider.isConfigured() === false, 'isConfigured returns false when API key is missing');

    let unconfiguredError: any;
    try {
      await pollinationsProvider.generate({ material: 'cobblestone', style: 'pixel art', resolution: 512 });
    } catch (err) {
      unconfiguredError = err;
    }
    assert(
      unconfiguredError instanceof ProviderError && unconfiguredError.providerId === 'pollinations',
      'generate throws normalized ProviderError when unconfigured'
    );

    // 3. Configured State
    process.env.POLLINATIONS_API_KEY = 'pk_test_pollinations_12345';
    assert(pollinationsProvider.isConfigured() === true, 'isConfigured returns true when POLLINATIONS_API_KEY is present');

    // 4. Request Construction & Binary Image Response Mock
    console.log('\n--- Official Request Construction & Binary Response Mock ---');
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      capturedUrl = input.toString();
      if (init?.headers) {
        capturedHeaders = init.headers as Record<string, string>;
      }

      if (capturedUrl.startsWith('data:image/')) {
        return new Response(validPngBuffer, { status: 200, headers: { 'content-type': 'image/png' } });
      }

      return new Response(validPngBuffer, {
        status: 200,
        headers: { 'content-type': 'image/png' },
      });
    }) as typeof fetch;

    const binaryResult = await pollinationsProvider.generate({
      material: 'cobblestone',
      style: 'pixel art',
      resolution: 512,
      seed: 42,
    });

    assert(capturedUrl.includes('https://gen.pollinations.ai/image/'), 'Requests official Pollinations image endpoint');
    assert(capturedUrl.includes('model=flux'), 'Specifies model=flux parameter');
    assert(capturedUrl.includes('width=512') && capturedUrl.includes('height=512'), 'Specifies width=512 and height=512 resolution parameters');
    assert(capturedUrl.includes('seed=42'), 'Includes seed=42 parameter');
    assert(capturedUrl.includes('nologo=true'), 'Includes nologo=true parameter');
    assert(capturedHeaders['Authorization'] === 'Bearer pk_test_pollinations_12345', 'Includes Authorization Bearer header');
    assert(binaryResult.imageDataUrl.startsWith('data:image/png;base64,'), 'Returns normalized base64 Data URL for binary response');
    assert(binaryResult.model === 'flux', 'Returns model name flux');

    // 5. JSON Response Schema Parsing (OpenAI / Pollinations JSON)
    console.log('\n--- JSON Response Schema Parsing Mock ---');

    globalThis.fetch = (async (input: RequestInfo | URL): Promise<Response> => {
      const url = input.toString();
      if (url.startsWith('data:image/')) {
        return new Response(validPngBuffer, { status: 200, headers: { 'content-type': 'image/png' } });
      }

      return new Response(
        JSON.stringify({
          data: [{ b64_json: validPngBuffer.toString('base64') }],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }) as typeof fetch;

    const jsonResult = await pollinationsProvider.generate({
      material: 'grass',
      style: 'pixel art',
      resolution: 512,
    });

    assert(jsonResult.imageDataUrl.startsWith('data:image/png;base64,'), 'Parses b64_json from JSON response successfully');

    // 6. Single-Stream HTTP Error Handling & Redaction
    console.log('\n--- HTTP Error Handling & Redaction ---');
    globalThis.fetch = (async (): Promise<Response> => {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'A valid API key pk_test_pollinations_12345 is required.', code: 'UNAUTHORIZED' },
          status: 401,
        }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }) as typeof fetch;

    let authError: any;
    try {
      await pollinationsProvider.generate({ material: 'sand', style: 'pixel art', resolution: 512 });
    } catch (err) {
      authError = err;
    }
    assert(
      authError instanceof ProviderError && authError.message.includes('401 Unauthorized'),
      'Handles 401 Unauthorized error cleanly'
    );
    assert(
      !authError.message.includes('pk_test_pollinations_12345'),
      'Redacts API key from error message'
    );

    globalThis.fetch = (async (): Promise<Response> => {
      return new Response(
        JSON.stringify({ message: 'Insufficient pollen balance' }),
        { status: 402, headers: { 'content-type': 'application/json' } }
      );
    }) as typeof fetch;

    let quotaError: any;
    try {
      await pollinationsProvider.generate({ material: 'sand', style: 'pixel art', resolution: 512 });
    } catch (err) {
      quotaError = err;
    }
    assert(
      quotaError instanceof ProviderError && quotaError.message.includes('402 Payment Required'),
      'Handles 402 Payment Required / Insufficient pollen error cleanly'
    );

    globalThis.fetch = (async (): Promise<Response> => {
      return new Response('<html>500 Internal Server Error</html>', {
        status: 500,
        headers: { 'content-type': 'text/html' },
      });
    }) as typeof fetch;

    let serverError: any;
    try {
      await pollinationsProvider.generate({ material: 'sand', style: 'pixel art', resolution: 512 });
    } catch (err) {
      serverError = err;
    }
    assert(
      serverError instanceof ProviderError && serverError.message.includes('500'),
      'Handles HTML 500 server error cleanly without body re-read failure'
    );

    // 7. Benchmark Runner Compatibility with Mocked Pollinations Provider
    console.log('\n--- Benchmark Runner Compatibility ---');
    globalThis.fetch = (async (input: RequestInfo | URL): Promise<Response> => {
      const url = input.toString();
      if (url.startsWith('data:image/')) {
        return new Response(validPngBuffer, { status: 200, headers: { 'content-type': 'image/png' } });
      }
      return new Response(validPngBuffer, {
        status: 200,
        headers: { 'content-type': 'image/png' },
      });
    }) as typeof fetch;

    const mockPollinations = new PollinationsImageGenerationProvider();
    const benchmarkResult = await benchmarkRunner.run(mockPollinations, { resolution: 512, seed: 123 });

    assert(benchmarkResult.providerId === 'pollinations', 'Benchmark runner executes with pollinations provider');
    assert(benchmarkResult.model === 'flux', 'Benchmark run result records model flux');
    assert(benchmarkResult.summary.total === 6, 'Benchmark runner evaluates all 6 materials');
    assert(benchmarkResult.summary.successful === 6, 'All 6 mocked material generations succeed');

    console.log('\n======================================================');
    console.log(`  Pollinations Provider Test Suite Results: ${passed}/${total} Tests Passed`);
    console.log('======================================================\n');
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
}

runTests().catch((err) => {
  console.error('Pollinations provider test suite error:', err);
  process.exit(1);
});
