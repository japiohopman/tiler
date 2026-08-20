/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import sharp from 'sharp';
import {
  tileProcessor,
  SUPPORTED_RESOLUTIONS,
  ALLOWED_BLEND_MARGINS,
} from './tileProcessor';
import { tileProcessingExperimentService } from '../services/benchmark/experiments';
import {
  BlendMarginPercent,
  ProcessorTestSuiteResult,
  ProcessorTestRunItem,
  SupportedResolution,
} from '../../src/types';

/**
 * Creates a synthetic high-contrast gradient image to test seam processing
 */
async function createTestImage(width: number, height: number): Promise<Buffer> {
  const raw = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // High-contrast diagonal pattern with hard edges to test seamless wrap
      const r = Math.floor((x / width) * 255);
      const g = Math.floor((y / height) * 255);
      const b = Math.floor(((x + y) / (width + height)) * 255);
      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = 255;
    }
  }

  return sharp(raw, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

/**
 * Executes the full automated unit test suite for TileProcessor
 */
export async function runTileProcessorTestSuite(): Promise<ProcessorTestSuiteResult> {
  const suiteStartTime = performance.now();
  const testResults: ProcessorTestRunItem[] = [];

  console.log('\n======================================================');
  console.log('  [TileProcessor] Starting Deterministic Test Suite');
  console.log('======================================================\n');

  // Test 1: Test all supported resolutions (128x128, 256x256, 512x512, 1024x1024)
  for (const res of SUPPORTED_RESOLUTIONS) {
    const testStart = performance.now();
    try {
      const testImg = await createTestImage(res, res);
      const result = await tileProcessor.processTile(testImg, {
        targetWidth: res,
        targetHeight: res,
        blendMarginPercent: 10,
      });

      // Verify output dimensions and metadata
      const outMeta = await sharp(result.processedImageBuffer!).metadata();
      const isDimCorrect = outMeta.width === res && outMeta.height === res;
      const isPngFormat = outMeta.format === 'png';
      const isMetadataAccurate =
        result.metadata.outputDimensions.width === res &&
        result.metadata.outputDimensions.height === res;

      const passed = isDimCorrect && isPngFormat && isMetadataAccurate;
      const durationMs = Math.round(performance.now() - testStart);

      testResults.push({
        name: `Resolution Support: ${res}×${res}`,
        resolution: res,
        blendPercent: 10,
        passed,
        durationMs,
        details: passed
          ? `Verified ${res}×${res} PNG output (${outMeta.format}, ${result.metadata.processingTimeMs}ms)`
          : `Dimension or format mismatch. Width: ${outMeta.width}, Format: ${outMeta.format}`,
      });

      console.log(
        `  ${passed ? '✓' : '✗'} Resolution ${res}×${res}: ${passed ? 'PASSED' : 'FAILED'} (${durationMs}ms)`
      );
    } catch (err: any) {
      testResults.push({
        name: `Resolution Support: ${res}×${res}`,
        resolution: res,
        blendPercent: 10,
        passed: false,
        durationMs: Math.round(performance.now() - testStart),
        details: `Exception thrown: ${err.message}`,
      });
      console.error(`  ✗ Resolution ${res}×${res} ERROR:`, err.message);
    }
  }

  // Test 2: Test all allowed blend margins (0%, 5%, 10%, 15%, 20%) at default 512x512
  for (const blendMargin of ALLOWED_BLEND_MARGINS) {
    const testStart = performance.now();
    try {
      const testImg = await createTestImage(512, 512);
      const result = await tileProcessor.processTile(testImg, {
        targetWidth: 512,
        targetHeight: 512,
        blendMarginPercent: blendMargin,
      });

      const expectedPixels = Math.round(512 * (blendMargin / 100));
      const hasCorrectMargin = result.metadata.blendMarginPixels.x === expectedPixels;
      const outMeta = await sharp(result.processedImageBuffer!).metadata();
      const passed = hasCorrectMargin && outMeta.width === 512 && outMeta.height === 512;
      const durationMs = Math.round(performance.now() - testStart);

      testResults.push({
        name: `Blend Margin: ${blendMargin}% (${expectedPixels}px)`,
        resolution: 512,
        blendPercent: blendMargin,
        passed,
        durationMs,
        details: passed
          ? `Correct blend margin ${expectedPixels}px computed for ${blendMargin}%`
          : `Margin mismatch: expected ${expectedPixels}px, got ${result.metadata.blendMarginPixels.x}px`,
      });

      console.log(
        `  ${passed ? '✓' : '✗'} Blend Margin ${blendMargin}%: ${passed ? 'PASSED' : 'FAILED'} (${durationMs}ms)`
      );
    } catch (err: any) {
      testResults.push({
        name: `Blend Margin: ${blendMargin}%`,
        resolution: 512,
        blendPercent: blendMargin,
        passed: false,
        durationMs: Math.round(performance.now() - testStart),
        details: `Exception: ${err.message}`,
      });
      console.error(`  ✗ Blend Margin ${blendMargin}% ERROR:`, err.message);
    }
  }

  // Test 3: Determinism Verification Test (Same input + options = byte-identical SHA256 checksum)
  {
    const testStart = performance.now();
    try {
      const testImg = await createTestImage(512, 512);
      const runA = await tileProcessor.processTile(testImg, {
        targetWidth: 512,
        targetHeight: 512,
        blendMarginPercent: 10,
      });
      const runB = await tileProcessor.processTile(testImg, {
        targetWidth: 512,
        targetHeight: 512,
        blendMarginPercent: 10,
      });

      const bufferMatch = runA.processedImageBuffer!.equals(runB.processedImageBuffer!);
      const checksumMatch = runA.metadata.checksum === runB.metadata.checksum;
      const passed = bufferMatch && checksumMatch;
      const durationMs = Math.round(performance.now() - testStart);

      testResults.push({
        name: 'Determinism: SHA-256 Byte Match',
        resolution: 512,
        blendPercent: 10,
        passed,
        durationMs,
        details: passed
          ? `Identical SHA-256 checksums across independent runs (${runA.metadata.checksum.slice(0, 12)}...)`
          : `Checksum mismatch: ${runA.metadata.checksum} vs ${runB.metadata.checksum}`,
      });

      console.log(
        `  ${passed ? '✓' : '✗'} Determinism Verification: ${passed ? 'PASSED' : 'FAILED'} (${durationMs}ms)`
      );
    } catch (err: any) {
      testResults.push({
        name: 'Determinism: SHA-256 Byte Match',
        resolution: 512,
        blendPercent: 10,
        passed: false,
        durationMs: Math.round(performance.now() - testStart),
        details: `Exception: ${err.message}`,
      });
      console.error('  ✗ Determinism Test ERROR:', err.message);
    }
  }

  // Test 4: Aspect Ratio / Non-Square Image Normalization (e.g. 800x600 input normalized to 512x512)
  {
    const testStart = performance.now();
    try {
      const rectangularImg = await createTestImage(800, 600);
      const result = await tileProcessor.processTile(rectangularImg, {
        targetWidth: 512,
        targetHeight: 512,
        blendMarginPercent: 10,
      });

      const outMeta = await sharp(result.processedImageBuffer!).metadata();
      const passed =
        outMeta.width === 512 &&
        outMeta.height === 512 &&
        result.metadata.inputDimensions.width === 800 &&
        result.metadata.inputDimensions.height === 600;
      const durationMs = Math.round(performance.now() - testStart);

      testResults.push({
        name: 'Dimension Normalization (800×600 -> 512×512)',
        resolution: 512,
        blendPercent: 10,
        passed,
        durationMs,
        details: passed
          ? `Correctly normalized 800×600 source into exact 512×512 output PNG`
          : `Failed normalization: received ${outMeta.width}×${outMeta.height}`,
      });

      console.log(
        `  ${passed ? '✓' : '✗'} Dimension Normalization: ${passed ? 'PASSED' : 'FAILED'} (${durationMs}ms)`
      );
    } catch (err: any) {
      testResults.push({
        name: 'Dimension Normalization (800×600 -> 512×512)',
        resolution: 512,
        blendPercent: 10,
        passed: false,
        durationMs: Math.round(performance.now() - testStart),
        details: `Exception: ${err.message}`,
      });
    }
  }

  // Test 5: Controlled Blend-Margin Experiment Service Verification
  {
    const testStart = performance.now();
    try {
      const testImg = await createTestImage(512, 512);
      const expSummary = await tileProcessingExperimentService.runExperimentOnImage(
        testImg,
        'cobblestone'
      );

      const hasAllMargins =
        typeof expSummary.resultsByMargin[0] === 'number' &&
        typeof expSummary.resultsByMargin[5] === 'number' &&
        typeof expSummary.resultsByMargin[10] === 'number' &&
        typeof expSummary.resultsByMargin[15] === 'number' &&
        typeof expSummary.resultsByMargin[20] === 'number';

      const passed =
        expSummary.material === 'cobblestone' &&
        hasAllMargins &&
        typeof expSummary.optimalBlendMarginPercent === 'number';

      const durationMs = Math.round(performance.now() - testStart);

      testResults.push({
        name: 'Controlled Blend Margin Experiment Harness',
        resolution: 512,
        blendPercent: expSummary.optimalBlendMarginPercent,
        passed,
        durationMs,
        details: passed
          ? `Successfully evaluated blend margins [0%, 5%, 10%, 15%, 20%]. Optimal margin: ${expSummary.optimalBlendMarginPercent}%`
          : 'Failed experiment execution or incomplete margin scores.',
      });

      console.log(
        `  ${passed ? '✓' : '✗'} Controlled Experiment Harness: ${passed ? 'PASSED' : 'FAILED'} (${durationMs}ms)`
      );
    } catch (err: any) {
      testResults.push({
        name: 'Controlled Blend Margin Experiment Harness',
        resolution: 512,
        blendPercent: 10,
        passed: false,
        durationMs: Math.round(performance.now() - testStart),
        details: `Exception: ${err.message}`,
      });
      console.error('  ✗ Controlled Experiment Harness ERROR:', err.message);
    }
  }

  const suiteEndTime = performance.now();
  const totalDurationMs = Math.round(suiteEndTime - suiteStartTime);
  const passedCount = testResults.filter((r) => r.passed).length;
  const failedCount = testResults.filter((r) => !r.passed).length;
  const allPassed = failedCount === 0;

  console.log('\n======================================================');
  console.log(
    `  Suite Results: ${passedCount}/${testResults.length} Tests Passed in ${totalDurationMs}ms`
  );
  console.log('======================================================\n');

  return {
    total: testResults.length,
    passed: passedCount,
    failed: failedCount,
    durationMs: totalDurationMs,
    results: testResults,
    allPassed,
  };
}

// Auto-run only when executed directly via CLI (npm test / tsx server/image/tileProcessor.test.ts)
const isDirectExecution = process.argv[1]?.includes('tileProcessor.test');

if (isDirectExecution) {
  runTileProcessorTestSuite()
    .then((suite) => {
      if (!suite.allPassed) {
        console.error(`\n❌ Test suite failed with ${suite.failed} error(s).`);
        process.exit(1);
      } else {
        console.log(`\n🎉 All ${suite.passed} unit tests passed successfully!`);
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error('Fatal test runner error:', err);
      process.exit(1);
    });
}
