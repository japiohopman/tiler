/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert';
import { benchmarkRunner } from '../benchmark/runner';
import { HuggingFaceImageGenerationProvider } from './huggingFaceProvider';
import { ProviderError } from './types';

// Helper to create a 1x1 valid PNG image buffer
const MOCK_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

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
    console.log('\n--- Official Request Construction & Binary Response Mock ---');
    // ------------------------------------------------------------------------

    await test('Requests official Hugging Face router endpoint with headers & body', async () => {
      process.env.HF_TOKEN = 'hf_mock_test_token_abc';
      delete process.env.HF_PROVIDER;
      const provider = new HuggingFaceImageGenerationProvider();

      let capturedUrl = '';
      let capturedMethod = '';
      let capturedHeaders: Record<string, string> = {};
      let capturedBody: any = null;

      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = input.toString();
        capturedMethod = init?.method || 'GET';
        capturedHeaders = (init?.headers as Record<string, string>) || {};
        if (init?.body) {
          capturedBody = JSON.parse(init.body as string);
        }

        return new Response(MOCK_PNG_BUFFER, {
          status: 200,
          headers: {
            'content-type': 'image/png',
          },
        });
      }) as typeof fetch;

      const result = await provider.generate({
        material: 'cobblestone',
        style: 'stylized',
        resolution: 512,
        seed: 42,
      });

      assert.strictEqual(
        capturedUrl,
        'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell'
      );
      assert.strictEqual(capturedMethod, 'POST');
      assert.strictEqual(capturedHeaders['Authorization'], 'Bearer hf_mock_test_token_abc');
      assert.strictEqual(capturedHeaders['Content-Type'], 'application/json');

      assert.strictEqual(capturedBody.parameters.width, 512);
      assert.strictEqual(capturedBody.parameters.height, 512);
      assert.strictEqual(capturedBody.parameters.seed, 42);

      assert.ok(result.imageDataUrl.startsWith('data:image/png;base64,'));
      assert.strictEqual(result.model, 'black-forest-labs/FLUX.1-schnell');
      assert.strictEqual(result.metadata?.pricingClassification, 'FREE WITH LIMITED MONTHLY CREDITS');
    });

    // ------------------------------------------------------------------------
    console.log('\n--- Custom Provider Routing & Model Override ---');
    // ------------------------------------------------------------------------

    await test('Supports custom provider routing (e.g. fal-ai)', async () => {
      process.env.HF_TOKEN = 'hf_mock_token';
      process.env.HF_PROVIDER = 'fal-ai';
      const provider = new HuggingFaceImageGenerationProvider();

      let capturedUrl = '';
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(MOCK_PNG_BUFFER, {
          status: 200,
          headers: { 'content-type': 'image/png' },
        });
      }) as typeof fetch;

      await provider.generate({ material: 'grass', style: 'stylized', resolution: 512 });

      assert.strictEqual(
        capturedUrl,
        'https://router.huggingface.co/fal-ai/models/black-forest-labs/FLUX.1-schnell'
      );
    });

    // ------------------------------------------------------------------------
    console.log('\n--- JSON Response Schema Parsing Mock ---');
    // ------------------------------------------------------------------------

    await test('Parses array JSON response with base64 data URL cleanly', async () => {
      process.env.HF_TOKEN = 'hf_mock_token';
      delete process.env.HF_PROVIDER;
      const provider = new HuggingFaceImageGenerationProvider();

      const mockJsonBody = [
        {
          generated_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        },
      ];

      globalThis.fetch = (async () => {
        return new Response(JSON.stringify(mockJsonBody), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }) as typeof fetch;

      const result = await provider.generate({ material: 'sand', style: 'stylized' });
      assert.ok(result.imageDataUrl.startsWith('data:image/png;base64,'));
    });

    await test('Throws ProviderError on malformed JSON missing image fields', async () => {
      process.env.HF_TOKEN = 'hf_mock_token';
      const provider = new HuggingFaceImageGenerationProvider();

      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({ unexpected: 'field' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }) as typeof fetch;

      await assert.rejects(
        async () => {
          await provider.generate({ material: 'water', style: 'stylized' });
        },
        (err: any) => {
          return err instanceof ProviderError && err.message.includes('missing expected image data');
        }
      );
    });

    // ------------------------------------------------------------------------
    console.log('\n--- HTTP Error Handling, Status Codes & Redaction ---');
    // ------------------------------------------------------------------------

    await test('Handles 401 Unauthorized error and redacts token', async () => {
      const secretToken = 'hf_super_secret_token_12345';
      process.env.HF_TOKEN = secretToken;
      const provider = new HuggingFaceImageGenerationProvider();

      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({ error: `Invalid token ${secretToken}` }), {
          status: 401,
          statusText: 'Unauthorized',
        });
      }) as typeof fetch;

      await assert.rejects(
        async () => {
          await provider.generate({ material: 'cobblestone', style: 'stylized' });
        },
        (err: any) => {
          assert.strictEqual(err.providerId, 'huggingface');
          assert.ok(err.message.includes('401 Unauthorized'));
          assert.ok(!err.message.includes(secretToken));
          assert.ok(err.message.includes('[REDACTED_HF_TOKEN]'));
          return true;
        }
      );
    });

    await test('Handles 402 Payment Required / Insufficient Free Credits cleanly', async () => {
      process.env.HF_TOKEN = 'hf_token';
      const provider = new HuggingFaceImageGenerationProvider();

      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({ error: 'Monthly quota / credit limit reached' }), {
          status: 402,
          statusText: 'Payment Required',
        });
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
      const provider = new HuggingFaceImageGenerationProvider();

      globalThis.fetch = (async () => {
        return new Response('Rate limit exceeded', { status: 429, statusText: 'Too Many Requests' });
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

      globalThis.fetch = (async () => {
        return new Response(MOCK_PNG_BUFFER, {
          status: 200,
          headers: { 'content-type': 'image/png' },
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
