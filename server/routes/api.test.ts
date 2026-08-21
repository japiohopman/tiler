/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import http from 'http';
import { apiRouter } from './api';
import { generationService } from '../services/generationService';
import { seamAnalysisService } from '../services/seamAnalysisService';
import { mockProvider } from '../services/providers/mockProvider';
import { pixazoProvider } from '../services/providers/pixazoProvider';
import { ProviderError } from '../services/providers/types';

/**
 * Application Layer & API Router End-to-End Integration Test Suite
 *
 * Verifies that the Express API router correctly handles health checks,
 * texture generation requests, error states, seam analysis, processing, and export.
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
    assert(genData.rawSeamReport && typeof genData.rawSeamReport.overallScore === 'number', 'Returns rawSeamReport with raw seam score');
    assert(typeof genData.generationMetadata?.rawSeamScore === 'number', 'Metadata captures rawSeamScore');
    assert(typeof genData.generationMetadata?.processedSeamScore === 'number', 'Metadata captures processedSeamScore');
    assert(genData.generationMetadata?.material === 'cobblestone', 'Metadata captures material cobblestone');

    // 2b. Validation Summary API Contract Verification
    console.log('\n--- Validation Summary & Improvement API Contract ---');
    assert(genData.validationSummary !== undefined, 'Returns validationSummary object');
    assert(genData.validationSummary.generationStatus === 'SUCCESS', 'ValidationSummary reports generationStatus SUCCESS');
    assert(typeof genData.validationSummary.rawTileable === 'boolean', 'ValidationSummary reports rawTileable boolean');
    assert(typeof genData.validationSummary.processedTileable === 'boolean', 'ValidationSummary reports processedTileable boolean');
    assert(typeof genData.validationSummary.improvement === 'number', 'ValidationSummary reports numerical improvement');
    assert(['IMPROVED', 'WORSENED', 'UNCHANGED'].includes(genData.validationSummary.improvementStatus), 'ValidationSummary reports valid improvementStatus');
    assert(['PASS_RAW', 'PASS_AFTER_PROCESSING', 'VALIDATION_FAILED'].includes(genData.validationSummary.finalStatus), 'ValidationSummary reports valid finalStatus');
    assert(genData.validationSummary.threshold === 0.05, 'ValidationSummary maintains strict threshold 0.05');
    assert(genData.validationSummary.promptAdherenceStatus === 'NOT_AUTOMATICALLY_VALIDATED', 'ValidationSummary explicitly reports promptAdherenceStatus NOT_AUTOMATICALLY_VALIDATED');

    // 2c. Improvement / Worsening Metric Mechanics Test
    const rawScoreTest = genData.rawSeamReport.overallScore;
    const procScoreTest = genData.seamReport.overallScore;
    const expectedImp = Number((rawScoreTest - procScoreTest).toFixed(4));
    assert(Math.abs(genData.validationSummary.improvement - expectedImp) < 0.001, 'Calculates correct improvement delta (raw - processed)');

    if (rawScoreTest > procScoreTest) {
      assert(genData.validationSummary.improvementStatus === 'IMPROVED', 'Correctly identifies IMPROVED when rawScore > processedScore');
    } else if (procScoreTest > rawScoreTest) {
      assert(genData.validationSummary.improvementStatus === 'WORSENED', 'Correctly identifies WORSENED when processedScore > rawScore');
    } else {
      assert(genData.validationSummary.improvementStatus === 'UNCHANGED', 'Correctly identifies UNCHANGED when scores are identical');
    }

    // 2d. Explicit Deterministic Classification Tests for IMPROVED, WORSENED, UNCHANGED
    console.log('\n--- Deterministic Validation Summary Classifications (IMPROVED / WORSENED / UNCHANGED) ---');
    const originalAnalyze = seamAnalysisService.analyzeSeams;

    // Test case 1: Deterministic IMPROVED (raw 0.1200, proc 0.0100 -> delta +0.1100, IMPROVED)
    let stepCount = 0;
    seamAnalysisService.analyzeSeams = async (_img: any, _options?: any) => {
      stepCount++;
      const score = stepCount === 1 ? 0.1200 : 0.0100;
      return {
        horizontalScore: score,
        verticalScore: score,
        overallScore: score,
        width: 512,
        height: 512,
        pass: score <= 0.05,
        threshold: 0.05,
        edgeRegion: 4,
        maxHorizontalDelta: 0.1,
        maxVerticalDelta: 0.1,
        discontinuousPixelCount: 0,
        totalEdgePixelsEvaluated: 2048,
        issues: [],
      };
    };

    const impGenRes = await originalFetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ material: 'cobblestone', style: 'stylized', resolution: 512 }),
    });
    const impGenData = await impGenRes.json();
    assert(impGenData.validationSummary.rawSeamScore === 0.12, 'Deterministic raw score is 0.1200');
    assert(impGenData.validationSummary.processedSeamScore === 0.01, 'Deterministic processed score is 0.0100');
    assert(impGenData.validationSummary.improvement === 0.11, 'Deterministic improvement delta is +0.1100');
    assert(impGenData.validationSummary.improvementStatus === 'IMPROVED', 'Deterministic classification is IMPROVED');
    assert(impGenData.validationSummary.finalStatus === 'PASS_AFTER_PROCESSING', 'Deterministic finalStatus is PASS_AFTER_PROCESSING');

    // Test case 2: Deterministic WORSENED (raw 0.0100, proc 0.0800 -> delta -0.0700, WORSENED)
    stepCount = 0;
    seamAnalysisService.analyzeSeams = async (_img: any, _options?: any) => {
      stepCount++;
      const score = stepCount === 1 ? 0.0100 : 0.0800;
      return {
        horizontalScore: score,
        verticalScore: score,
        overallScore: score,
        width: 512,
        height: 512,
        pass: score <= 0.05,
        threshold: 0.05,
        edgeRegion: 4,
        maxHorizontalDelta: 0.1,
        maxVerticalDelta: 0.1,
        discontinuousPixelCount: 0,
        totalEdgePixelsEvaluated: 2048,
        issues: [],
      };
    };

    const worGenRes = await originalFetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ material: 'wood', style: 'stylized', resolution: 512 }),
    });
    const worGenData = await worGenRes.json();
    assert(worGenData.validationSummary.rawSeamScore === 0.01, 'Deterministic raw score is 0.0100');
    assert(worGenData.validationSummary.processedSeamScore === 0.08, 'Deterministic processed score is 0.0800');
    assert(worGenData.validationSummary.improvement === -0.07, 'Deterministic improvement delta is -0.0700');
    assert(worGenData.validationSummary.improvementStatus === 'WORSENED', 'Deterministic classification is WORSENED');
    assert(worGenData.validationSummary.finalStatus === 'PASS_RAW', 'Deterministic finalStatus is PASS_RAW');

    // Restore original seam analysis service method
    seamAnalysisService.analyzeSeams = originalAnalyze;

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

    // 4b. End-to-End Vertical Slice Generation via Pixazo Provider
    console.log('\n--- End-to-End Vertical Slice Generation via Pixazo Provider ---');
    process.env.PIXAZO_API_KEY = 'test-pixazo-api-key-12345';
    const dummyBase64Png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = input.toString();
      if (url.includes('/getSDXLImage')) {
        return new Response(JSON.stringify({ imageUrl: dummyBase64Png }), { status: 200 });
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    const pixazoGenRes = await originalFetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        material: 'grass',
        style: 'stylized',
        detail: 'high',
        resolution: 512,
        providerId: 'pixazo',
      }),
    });

    assert(pixazoGenRes.status === 200, 'Pixazo generation via /api/generate returns HTTP 200 OK');
    const pixazoGenData = await pixazoGenRes.json();
    assert(pixazoGenData.success === true, 'Pixazo generation response indicates success: true');
    assert(pixazoGenData.rawImageUrl.startsWith('data:image/'), 'Returns Pixazo raw image URL');
    assert(pixazoGenData.processedImageUrl.startsWith('data:image/'), 'Returns processed tile URL from Pixazo input');
    assert(pixazoGenData.generationMetadata?.model === 'sdxl-base-1.0', 'Metadata records model sdxl-base-1.0');

    // Restore fetch and default provider
    globalThis.fetch = originalFetch;
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

    // 5b. Re-processing with Blend Margin Variation (15%)
    const procRes15 = await originalFetch(`${baseUrl}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: dummyDataUrl,
        options: { blendMarginPercent: 15, algorithm: 'offset-crossfade' },
      }),
    });
    assert(procRes15.status === 200, 'Process endpoint supports custom 15% blend margin');
    const procData15 = await procRes15.json();
    assert(procData15.metadata.blendMarginPercent === 15, 'Metadata records updated blendMarginPercent 15');

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

    // 6b. Seam Analysis with Custom Options (threshold 0.01, edgeRegion 8px)
    const customAnalyzeRes = await originalFetch(`${baseUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: dummyDataUrl,
        options: { threshold: 0.01, edgeRegion: 8, diagnosticMode: true },
      }),
    });
    assert(customAnalyzeRes.status === 200, 'Analyze endpoint supports custom threshold and edgeRegion');
    const customAnalyzeData = await customAnalyzeRes.json();
    assert(customAnalyzeData.report.threshold === 0.01, 'Report records custom threshold 0.01');
    assert(customAnalyzeData.report.edgeRegion === 8, 'Report records custom edgeRegion depth 8px');
    assert(typeof customAnalyzeData.report.diagnosticMapDataUrl === 'string', 'Report generates diagnostic heatmap Data URL');

    // 7. Texture Export Endpoint (/api/export)
    console.log('\n--- Texture Export Endpoint ---');
    const exportRes = await originalFetch(`${baseUrl}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tile: {
          material: 'Cobblestone / Stone',
          processedImageDataUrl: dummyDataUrl,
        },
        options: { format: 'png', resolution: 512 },
      }),
    });

    assert(exportRes.status === 200, 'Export endpoint returns HTTP 200 OK');
    const contentType = exportRes.headers.get('content-type');
    const contentDisposition = exportRes.headers.get('content-disposition');
    assert(contentType === 'image/png', 'Export returns image/png Content-Type');
    assert(
      contentDisposition !== null && contentDisposition.includes('filename="cobblestone-stone-processed.png"'),
      'Export sets sanitized filename in Content-Disposition'
    );

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
