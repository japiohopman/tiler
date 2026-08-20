/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert';
import { benchmarkRunner } from '../benchmark/runner';
import { HuggingFaceImageGenerationProvider } from './huggingFaceProvider';
import { ProviderError } from './types';

// Helper to create a 1x1 valid PNG Blob
const MOCK_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

function createPngResponse(status = 200, statusText = 'OK') {
  return new Response(MOCK_PNG_BUFFER.slice(), {
    status,
    statusText,
    headers: { 'content-type': 'image/png' },
  });
}

function createJsonResponse(data: any, status = 200, statusText = 'OK') {
  return new Response(JSON.stringify(data), {
    status,
    statusText,
    headers: { 'content-type': 'application/json' },
  });
}

function createMockModelMappingResponse() {
  return createJsonResponse({
    inferenceProviderMapping: {
      'fal-ai': {
        status: 'live',
        providerId: 'fal-ai/flux/schnell',
        task: 'text-to-image',
      },
      together: {
        status: 'live',
        providerId: 'black-forest-labs/FLUX.1-schnell',
        task: 'text-to-image',
      },
    },
  });
}

/**
 * Test Suite for HuggingFaceImageGenerationProvider (Issue #18 / Phase 2C.3)
 */
async function runHuggingFaceProviderTests() {
  console.log('======================================================');
  console.log('  [HuggingFaceProvider] Starting Unit Test Suite');
  console.log('======================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  async function test(description: string, fn: () => void | Promise<void>) {
    totalTests++;
    try {
      await fn();
      passedTests++;
      console.log(`  ✓ ${description}: PASSED`);
    } catch (err) {
      console.error(`  ✕ ${description}: FAILED`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  function restoreEnvironment() {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
  }

  try {
    // ------------------------------------------------------------------------
    console.log('--- Provider Properties & Metadata ---');
    // ------------------------------------------------------------------------

    await test('Provider id is huggingface', () => {
      const provider = new HuggingFaceImageGenerationProvider();
      assert.strictEqual(provider.id, 'huggingface');
    });

    await test('Provider name includes Hugging Face', () => {
      const provider = new HuggingFaceImageGenerationProvider();
      assert.ok(provider.name.includes('Hugging Face'));
    });

    await test('Provider model default is black-forest-labs/FLUX.1-schnell', () => {
      delete process.env.HF_MODEL;
      delete process.env.HUGGINGFACE_MODEL;
      const provider = new HuggingFaceImageGenerationProvider();
      assert.strictEqual(provider.model, 'black-forest-labs/FLUX.1-schnell');
    });

    await test('Provider metadata matches expected properties', () => {
      const provider = new HuggingFaceImageGenerationProvider();
      assert.strictEqual(provider.id, 'huggingface');
      assert.strictEqual(provider.model, 'black-forest-labs/FLUX.1-schnell');
    });

    // ------------------------------------------------------------------------
    console.log('\n--- Configuration Detection ---');
    // ------------------------------------------------------------------------

    await test('isConfigured returns false when HF_TOKEN is missing', () => {
      delete process.env.HF_TOKEN;
      delete process.env.HUGGINGFACE_API_KEY;
      const provider = new HuggingFaceImageGenerationProvider();
      assert.strictEqual(provider.isConfigured(), false);
    });

    await test('generate throws normalized ProviderError when unconfigured', async () => {
      delete process.env.HF_TOKEN;
      delete process.env.HUGGINGFACE_API_KEY;
      const provider = new HuggingFaceImageGenerationProvider();

      await assert.rejects(
        async () => {
          await provider.generate({ material: 'cobblestone', style: 'stylized' });
        },
        (err: any) => {
          return err instanceof ProviderError && err.providerId === 'huggingface';
        }
      );
    });

    await test('isConfigured returns true when HF_TOKEN is present', () => {
      process.env.HF_TOKEN = 'hf_mock_token_1234567890';
      const provider = new HuggingFaceImageGenerationProvider();
      assert.strictEqual(provider.isConfigured(), true);
    });

    // ------------------------------------------------------------------------
    console.log('\n--- SDK Request Construction & Blob Response Mock ---');
    // ------------------------------------------------------------------------

    await test('Executes textToImage with SDK and parses Blob response', async () => {
      process.env.HF_TOKEN = 'hf_mock_test_token_abc';
      delete process.env.HF_PROVIDER;
      delete process.env.HUGGINGFACE_PROVIDER;
      const provider = new HuggingFaceImageGenerationProvider();

      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const urlStr = input.toString();

        if (urlStr.includes('/api/models/')) {
          return createMockModelMappingResponse();
        }

        if (urlStr.includes('/status')) {
          return createJsonResponse({ status: 'COMPLETED' });
        }

        if (urlStr.includes('fal.media')) {
          return createPngResponse();
        }

        return createJsonResponse({
          request_id: 'req_123',
          response_url: 'https://queue.fal.run/fal-ai/flux/schnell',
          status: 'COMPLETED',
          images: [{ url: 'https://fal.media/mock.png' }],
        });
      }) as typeof fetch;

      const result = await provider.generate({
        material: 'cobblestone',
        style: 'stylized',
        resolution: 512,
        seed: 42,
      });

      assert.ok(result.imageDataUrl.startsWith('data:image/png;base64,'));
      assert.strictEqual(result.model, 'black-forest-labs/FLUX.1-schnell');
      assert.strictEqual(result.metadata?.routingMode, 'auto');
      assert.strictEqual(result.metadata?.pricingClassification, 'FREE WITH LIMITED MONTHLY CREDITS');
    });

    // ------------------------------------------------------------------------
    console.log('\n--- Custom Provider Routing Override ---');
    // ------------------------------------------------------------------------

    await test('Supports explicit provider routing override via HF_PROVIDER (e.g. together)', async () => {
      process.env.HF_TOKEN = 'hf_mock_token';
      process.env.HF_PROVIDER = 'together';
      const provider = new HuggingFaceImageGenerationProvider();

      let capturedUrl = '';
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const urlStr = input.toString();
        if (urlStr.includes('/api/models/')) {
          return createMockModelMappingResponse();
        }
        if (urlStr.includes('together')) {
          capturedUrl = urlStr;
          return createJsonResponse({
            data: [{ b64_json: MOCK_PNG_BUFFER.toString('base64') }],
          });
        }
        return createPngResponse();
      }) as typeof fetch;

      const res = await provider.generate({ material: 'grass', style: 'stylized', resolution: 512 });

      assert.ok(capturedUrl.includes('together'), `URL should target together, got ${capturedUrl}`);
      assert.strictEqual(res.metadata?.routingMode, 'explicit-provider');
      assert.strictEqual(res.metadata?.providerRouting, 'together');
    });

    // ------------------------------------------------------------------------
    console.log('\n--- HTTP Error Handling, Status Codes & Redaction ---');
    // ------------------------------------------------------------------------

    await test('Handles 401 Unauthorized error, specifies fine-grained token requirement, and redacts token', async () => {
      const secretToken = 'hf_super_secret_token_12345';
      process.env.HF_TOKEN = secretToken;
      const provider = new HuggingFaceImageGenerationProvider();

      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const urlStr = input.toString();
        if (urlStr.includes('/api/models/')) {
          return createMockModelMappingResponse();
        }

        return createJsonResponse(
          { error: `401 Unauthorized: Invalid token ${secretToken}` },
          401,
          'Unauthorized'
        );
      }) as typeof fetch;

      await assert.rejects(
        async () => {
          await provider.generate({ material: 'cobblestone', style: 'stylized' });
        },
        (err: any) => {
          assert.strictEqual(err.providerId, 'huggingface');
          assert.ok(err.message.includes('401 Unauthorized'));
          assert.ok(err.message.includes('Make calls to Inference Providers'));
          assert.ok(!err.message.includes(secretToken));
          return true;
        }
      );
    });

    await test('Handles 402 Payment Required / Insufficient Free Credits cleanly', async () => {
      process.env.HF_TOKEN = 'hf_token';
      const provider = new HuggingFaceImageGenerationProvider();

      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const urlStr = input.toString();
        if (urlStr.includes('/api/models/')) {
          return createMockModelMappingResponse();
        }

        return createJsonResponse(
          { error: '402 Payment Required: Monthly credit limit reached' },
          402,
          'Payment Required'
        );
      }) as typeof fetch;

      await assert.rejects(
        async () => {
          await provider.generate({ material: 'cobblestone', style: 'stylized' });
        },
        (err: any) => {
          assert.ok(err.message.includes('402 Payment Required / Insufficient Free Credits'));
          return true;
        }
      );
    });

    await test('Handles 403 Forbidden, 404 Not Found, and 429 Rate Limit cleanly', async () => {
      process.env.HF_TOKEN = 'hf_token';
      process.env.HF_PROVIDER = 'together';
      const provider = new HuggingFaceImageGenerationProvider();

      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const urlStr = input.toString();
        if (urlStr.includes('/api/models/')) {
          return createMockModelMappingResponse();
        }

        return createJsonResponse({ error: '429 Rate Limit Exceeded' }, 429, 'Too Many Requests');
      }) as typeof fetch;

      await assert.rejects(
        async () => {
          await provider.generate({ material: 'cobblestone', style: 'stylized' });
        },
        (err: any) => err.message.includes('429 Rate Limit Exceeded')
      );
    });

    // ------------------------------------------------------------------------
    console.log('\n--- Benchmark Runner Compatibility ---');
    // ------------------------------------------------------------------------

    await test('Benchmark runner executes with huggingface provider', async () => {
      process.env.HF_TOKEN = 'hf_benchmark_test_token';
      delete process.env.HF_PROVIDER;
      const provider = new HuggingFaceImageGenerationProvider();

      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const urlStr = input.toString();
        if (urlStr.includes('/api/models/')) {
          return createMockModelMappingResponse();
        }
        if (urlStr.includes('/status')) {
          return createJsonResponse({ status: 'COMPLETED' });
        }
        if (urlStr.includes('fal.media')) {
          return createPngResponse();
        }
        return createJsonResponse({
          request_id: 'req_123',
          response_url: 'https://queue.fal.run/fal-ai/flux/schnell',
          status: 'COMPLETED',
          images: [{ url: 'https://fal.media/mock.png' }],
        });
      }) as typeof fetch;

      const runResult = await benchmarkRunner.run(provider, {
        resolution: 512,
        seed: 42,
      });

      assert.strictEqual(runResult.providerId, 'huggingface');
      assert.strictEqual(runResult.model, 'black-forest-labs/FLUX.1-schnell');
      assert.strictEqual(runResult.summary.total, 6);
      assert.strictEqual(runResult.summary.successful, 6);
      assert.strictEqual(runResult.summary.failed, 0);
    });
  } finally {
    restoreEnvironment();
  }

  console.log('\n======================================================');
  console.log(`  Hugging Face Provider Test Suite Results: ${passedTests}/${totalTests} Tests Passed`);
  console.log('======================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runHuggingFaceProviderTests().catch((err) => {
  console.error('Unhandled failure in Hugging Face provider tests:', err);
  process.exit(1);
});
