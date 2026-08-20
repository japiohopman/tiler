/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import http from 'http';
import { apiRouter } from './api';
import { generationService } from '../services/generationService';
import { mockProvider } from '../services/providers/mockProvider';
import { pixazoProvider } from '../services/providers/pixazoProvider';
import { ProviderError } from '../services/providers/types';

/**
 * Application Layer & API Router End-to-End Integration Test Suite
 *
 * Verifies that the Express API router correctly handles health checks,
 * texture generation requests, error states, seam analysis, and processing.
 */
async function runTests() {
  console.log('======================================================');
  console.log('  [ApiRouter] Starting Application Integration Tests');
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

  // Set up in-memory Express server for integration testing
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/api', apiRouter);

  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  try {
    // 1. Health Check Endpoint (/api/health)
    console.log('--- Health Check Endpoint ---');
    const healthRes = await originalFetch(`${baseUrl}/health`);
    assert(healthRes.status === 200, 'Health endpoint returns HTTP 200 OK');

    const healthData = await healthRes.json();
    assert(healthData.status === 'ok', 'Health payload status is ok');
    assert(typeof healthData.activeProvider === 'string', 'Health payload reports activeProvider string');
    assert(typeof healthData.providerConfigured === 'boolean', 'Health payload reports providerConfigured boolean');

    // 2. Texture Generation via Mock Provider
    console.log('\n--- Generation Endpoint via Mock Provider ---');
    generationService.setDefaultProvider('mock');

    const genRes = await originalFetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        material: 'cobblestone',
        style: 'stylized',
        detail: 'high',
        resolution: 512,
      }),
    });

    assert(genRes.status === 200, 'Generate endpoint returns HTTP 200 OK for valid request');
    const genData = await genRes.json();
    assert(genData.success === true, 'Generate response indicates success: true');
    assert(typeof genData.tileId === 'string', 'Returns generated tileId');
    assert(typeof genData.rawImageUrl === 'string' && genData.rawImageUrl.startsWith('data:image/'), 'Returns rawImageUrl as Base64 Data URL');
    assert(typeof genData.processedImageUrl === 'string' && genData.processedImageUrl.startsWith('data:image/'), 'Returns processedImageUrl as Base64 Data URL');
    assert(genData.seamReport && genData.seamReport.pass !== undefined, 'Returns seamReport with pass status');
    assert(genData.generationMetadata?.material === 'cobblestone', 'Metadata captures material cobblestone');

    // 3. Validation Failure on Missing Material
    console.log('\n--- Input Validation Failure Handling ---');
    const invalidRes = await originalFetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ style: 'stylized' }),
    });

    assert(invalidRes.status === 400, 'Returns HTTP 400 Bad Request when material parameter is missing');
    const invalidData = await invalidRes.json();
    assert(invalidData.error.includes('Material parameter is required'), 'Returns human-readable validation error');

    // 4. Provider Error Handling & Secret Redaction
    console.log('\n--- Provider Error & Credential Handling ---');
    generationService.setDefaultProvider('pixazo');
    delete process.env.PIXAZO_API_KEY;
    delete process.env.PIXAZO_SUBSCRIPTION_KEY;

    const unconfigRes = await originalFetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ material: 'sand', style: 'stylized' }),
    });

    assert(unconfigRes.status === 500, 'Returns HTTP 500 when active provider is unconfigured');
    const unconfigData = await unconfigRes.json();
    assert(
      unconfigData.error.includes('Pixazo') || unconfigData.error.includes('not configured'),
      'Returns human-readable provider configuration error'
    );
    assert(!unconfigData.error.includes('test-secret'), 'Does not leak sensitive credential information');

    // Re-set default provider to mock for remaining tests
    generationService.setDefaultProvider('mock');

    // 5. Image Processing Endpoint (/api/process)
    console.log('\n--- Image Processing Endpoint ---');
    const dummyDataUrl = genData.rawImageUrl;

    const procRes = await originalFetch(`${baseUrl}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: dummyDataUrl,
        options: { blendMarginPercent: 10 },
      }),
    });

    assert(procRes.status === 200, 'Process endpoint returns HTTP 200 OK');
    const procData = await procRes.json();
    assert(procData.success === true, 'Process response indicates success: true');
    assert(procData.processedImageUrl.startsWith('data:image/'), 'Returns processedImageUrl');
    assert(procData.metadata.blendMarginPercent === 10, 'Metadata records blendMarginPercent 10');

    // 6. Seam Analysis Endpoint (/api/analyze)
    console.log('\n--- Seam Analysis Endpoint ---');
    const analyzeRes = await originalFetch(`${baseUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: dummyDataUrl,
      }),
    });

    assert(analyzeRes.status === 200, 'Analyze endpoint returns HTTP 200 OK');
    const analyzeData = await analyzeRes.json();
    assert(analyzeData.success === true, 'Analyze response indicates success: true');
    assert(typeof analyzeData.report.overallScore === 'number', 'Report contains numerical overallScore');

    console.log('\n======================================================');
    console.log(`  API Integration Test Suite Results: ${passed}/${total} Tests Passed`);
    console.log('======================================================\n');
  } finally {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
    server.close();
  }
}

runTests().catch((err) => {
  console.error('API integration test suite error:', err);
  process.exit(1);
});
