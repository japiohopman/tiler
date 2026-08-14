/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import sharp from 'sharp';
import { performance } from 'perf_hooks';
import {
  seamAnalysisService,
  DEFAULT_SEAM_THRESHOLD,
  DEFAULT_EDGE_REGION,
} from './seamAnalysisService';
import { SeamAnalysisResult } from '../../src/types';

export interface SeamTestSuiteResult {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: {
    name: string;
    passed: boolean;
    durationMs: number;
    details: string;
    result?: SeamAnalysisResult;
  }[];
  allPassed: boolean;
}

/**
 * Generates test image buffers with controlled boundary seam conditions.
 */
class SeamTestImageFactory {
  /**
   * 1. Mathematically Perfect Repeating Image
   * Creates a smooth 2D pattern wrapped so opposing boundary regions match identically bit-for-bit:
   * Left (x=d) === Right (x=width-1-d) and Top (y=d) === Bottom (y=height-1-d) for all d.
   */
  static async createPerfectRepeatingImage(width = 256, height = 256): Promise<Buffer> {
    const raw = Buffer.alloc(width * height * 3);
    const halfW = width / 2;
    const halfH = height / 2;

    for (let y = 0; y < height; y++) {
      const symY = y < halfH ? y : height - 1 - y;
      for (let x = 0; x < width; x++) {
        const symX = x < halfW ? x : width - 1 - x;
        const idx = (y * width + x) * 3;

        const r = (symX * 13 + symY * 7) % 256;
        const g = (symX * 17 + symY * 11 + 64) % 256;
        const b = (symX * 23 + symY * 19 + 128) % 256;

        raw[idx] = r;
        raw[idx + 1] = g;
        raw[idx + 2] = b;
      }
    }

    return sharp(raw, { raw: { width, height, channels: 3 } })
      .png()
      .toBuffer();
  }

  /**
   * 2. Image with Obvious Horizontal Seam
   * Left side is pitch black (0,0,0) and Right side is bright white (255,255,255).
   * Top and bottom rows are identical along each column, so Vertical Seam is 0.
   */
  static async createHorizontalSeamImage(width = 256, height = 256): Promise<Buffer> {
    const raw = Buffer.alloc(width * height * 3);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 3;

        // Linear ramp horizontally from 0 to 255 (Left != Right), uniform vertically
        const intensity = Math.floor((x / (width - 1)) * 255);

        raw[idx] = intensity;
        raw[idx + 1] = intensity;
        raw[idx + 2] = intensity;
      }
    }

    return sharp(raw, { raw: { width, height, channels: 3 } })
      .png()
      .toBuffer();
  }

  /**
   * 3. Image with Obvious Vertical Seam
   * Top side is pitch black (0,0,0) and Bottom side is bright white (255,255,255).
   * Left and right columns are identical along each row, so Horizontal Seam is 0.
   */
  static async createVerticalSeamImage(width = 256, height = 256): Promise<Buffer> {
    const raw = Buffer.alloc(width * height * 3);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 3;

        // Linear ramp vertically from 0 to 255 (Top != Bottom), uniform horizontally
        const intensity = Math.floor((y / (height - 1)) * 255);

        raw[idx] = intensity;
        raw[idx + 1] = intensity;
        raw[idx + 2] = intensity;
      }
    }

    return sharp(raw, { raw: { width, height, channels: 3 } })
      .png()
      .toBuffer();
  }

  /**
   * 4. Image with Both Horizontal and Vertical Seams
   * Four distinct quadrants (Black, Red, Green, Blue) causing high mismatch across both boundaries.
   */
  static async createBothSeamsImage(width = 256, height = 256): Promise<Buffer> {
    const raw = Buffer.alloc(width * height * 3);
    const halfW = width / 2;
    const halfH = height / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 3;

        if (x < halfW && y < halfH) {
          // Top-Left: Black
          raw[idx] = 0;
          raw[idx + 1] = 0;
          raw[idx + 2] = 0;
        } else if (x >= halfW && y < halfH) {
          // Top-Right: Bright Red
          raw[idx] = 255;
          raw[idx + 1] = 0;
          raw[idx + 2] = 0;
        } else if (x < halfW && y >= halfH) {
          // Bottom-Left: Bright Green
          raw[idx] = 0;
          raw[idx + 1] = 255;
          raw[idx + 2] = 0;
        } else {
          // Bottom-Right: Bright Blue
          raw[idx] = 0;
          raw[idx + 1] = 0;
          raw[idx + 2] = 255;
        }
      }
    }

    return sharp(raw, { raw: { width, height, channels: 3 } })
      .png()
      .toBuffer();
  }
}

/**
 * Runs the complete automated Seam Analyzer verification test suite.
 */
export async function runSeamAnalyzerTestSuite(): Promise<SeamTestSuiteResult> {
  const suiteStart = performance.now();
  const testResults: SeamTestSuiteResult['results'] = [];

  console.log('======================================================');
  console.log('  [SeamAnalyzer] Starting Mathematical Test Suite');
  console.log('======================================================');

  // ---------------------------------------------------------------------------
  // TEST CASE 1: Mathematically Perfect Repeating Image
  // ---------------------------------------------------------------------------
  {
    const start = performance.now();
    try {
      const image = await SeamTestImageFactory.createPerfectRepeatingImage(256, 256);
      const res = await seamAnalysisService.analyzeSeams(image, {
        threshold: DEFAULT_SEAM_THRESHOLD,
        edgeRegion: DEFAULT_EDGE_REGION,
        diagnosticMode: true,
      });

      // Perfect repeating image must have scores very close to 0.0 and pass=true
      const passed =
        res.pass === true &&
        res.horizontalScore < 0.01 &&
        res.verticalScore < 0.01 &&
        res.overallScore < 0.01 &&
        !!res.diagnosticMapDataUrl;

      const duration = Math.round(performance.now() - start);
      testResults.push({
        name: 'Case 1: Mathematically Perfect Repeating Image',
        passed,
        durationMs: duration,
        details: `H-Score: ${res.horizontalScore}, V-Score: ${res.verticalScore}, Overall: ${res.overallScore}, Pass: ${res.pass}`,
        result: res,
      });

      console.log(`  ${passed ? '✓' : '✗'} Case 1 (Perfect Repeating): ${passed ? 'PASSED' : 'FAILED'} (${duration}ms)`);
    } catch (err: any) {
      testResults.push({
        name: 'Case 1: Mathematically Perfect Repeating Image',
        passed: false,
        durationMs: Math.round(performance.now() - start),
        details: `Exception: ${err.message}`,
      });
      console.error('  ✗ Case 1 FAILED with exception:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // TEST CASE 2: Image with Obvious Horizontal Seam Only
  // ---------------------------------------------------------------------------
  {
    const start = performance.now();
    try {
      const image = await SeamTestImageFactory.createHorizontalSeamImage(256, 256);
      const res = await seamAnalysisService.analyzeSeams(image, {
        threshold: DEFAULT_SEAM_THRESHOLD,
        edgeRegion: DEFAULT_EDGE_REGION,
      });

      // Horizontal seam should be high (> 0.5), Vertical seam should be 0.0, Pass must be false
      const passed =
        res.pass === false &&
        res.horizontalScore > 0.5 &&
        res.verticalScore === 0.0 &&
        res.overallScore > 0.25;

      const duration = Math.round(performance.now() - start);
      testResults.push({
        name: 'Case 2: Obvious Horizontal Seam Only',
        passed,
        durationMs: duration,
        details: `H-Score: ${res.horizontalScore} (high), V-Score: ${res.verticalScore} (zero), Pass: ${res.pass} (fail expected)`,
        result: res,
      });

      console.log(`  ${passed ? '✓' : '✗'} Case 2 (Horizontal Seam Only): ${passed ? 'PASSED' : 'FAILED'} (${duration}ms)`);
    } catch (err: any) {
      testResults.push({
        name: 'Case 2: Obvious Horizontal Seam Only',
        passed: false,
        durationMs: Math.round(performance.now() - start),
        details: `Exception: ${err.message}`,
      });
      console.error('  ✗ Case 2 FAILED with exception:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // TEST CASE 3: Image with Obvious Vertical Seam Only
  // ---------------------------------------------------------------------------
  {
    const start = performance.now();
    try {
      const image = await SeamTestImageFactory.createVerticalSeamImage(256, 256);
      const res = await seamAnalysisService.analyzeSeams(image, {
        threshold: DEFAULT_SEAM_THRESHOLD,
        edgeRegion: DEFAULT_EDGE_REGION,
      });

      // Vertical seam should be high (> 0.5), Horizontal seam should be 0.0, Pass must be false
      const passed =
        res.pass === false &&
        res.horizontalScore === 0.0 &&
        res.verticalScore > 0.5 &&
        res.overallScore > 0.25;

      const duration = Math.round(performance.now() - start);
      testResults.push({
        name: 'Case 3: Obvious Vertical Seam Only',
        passed,
        durationMs: duration,
        details: `H-Score: ${res.horizontalScore} (zero), V-Score: ${res.verticalScore} (high), Pass: ${res.pass} (fail expected)`,
        result: res,
      });

      console.log(`  ${passed ? '✓' : '✗'} Case 3 (Vertical Seam Only): ${passed ? 'PASSED' : 'FAILED'} (${duration}ms)`);
    } catch (err: any) {
      testResults.push({
        name: 'Case 3: Obvious Vertical Seam Only',
        passed: false,
        durationMs: Math.round(performance.now() - start),
        details: `Exception: ${err.message}`,
      });
      console.error('  ✗ Case 3 FAILED with exception:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // TEST CASE 4: Image with Both Horizontal and Vertical Seams
  // ---------------------------------------------------------------------------
  {
    const start = performance.now();
    try {
      const image = await SeamTestImageFactory.createBothSeamsImage(256, 256);
      const res = await seamAnalysisService.analyzeSeams(image, {
        threshold: DEFAULT_SEAM_THRESHOLD,
        edgeRegion: DEFAULT_EDGE_REGION,
      });

      // Both horizontal and vertical seams should be high (> 0.4), Pass must be false
      const passed =
        res.pass === false &&
        res.horizontalScore > 0.4 &&
        res.verticalScore > 0.4 &&
        res.overallScore > 0.4;

      const duration = Math.round(performance.now() - start);
      testResults.push({
        name: 'Case 4: Both Horizontal and Vertical Seams',
        passed,
        durationMs: duration,
        details: `H-Score: ${res.horizontalScore} (high), V-Score: ${res.verticalScore} (high), Pass: ${res.pass} (fail expected)`,
        result: res,
      });

      console.log(`  ${passed ? '✓' : '✗'} Case 4 (Both Seams): ${passed ? 'PASSED' : 'FAILED'} (${duration}ms)`);
    } catch (err: any) {
      testResults.push({
        name: 'Case 4: Both Horizontal and Vertical Seams',
        passed: false,
        durationMs: Math.round(performance.now() - start),
        details: `Exception: ${err.message}`,
      });
      console.error('  ✗ Case 4 FAILED with exception:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // TEST CASE 5: Edge Region Depth Variations (1px, 2px, 4px, 8px)
  // ---------------------------------------------------------------------------
  {
    const start = performance.now();
    try {
      const image = await SeamTestImageFactory.createHorizontalSeamImage(256, 256);
      const depths = [1, 2, 4, 8] as const;
      let allDepthsConsistent = true;

      for (const d of depths) {
        const res = await seamAnalysisService.analyzeSeams(image, { edgeRegion: d });
        if (res.edgeRegion !== d || res.horizontalScore <= 0.5) {
          allDepthsConsistent = false;
          break;
        }
      }

      const duration = Math.round(performance.now() - start);
      testResults.push({
        name: 'Case 5: Multi-Pixel Edge Region Variations (1, 2, 4, 8 px)',
        passed: allDepthsConsistent,
        durationMs: duration,
        details: 'Verified robust edge sampling across 1px, 2px, 4px, and 8px bands.',
      });

      console.log(`  ${allDepthsConsistent ? '✓' : '✗'} Case 5 (Edge Regions): ${allDepthsConsistent ? 'PASSED' : 'FAILED'} (${duration}ms)`);
    } catch (err: any) {
      testResults.push({
        name: 'Case 5: Multi-Pixel Edge Region Variations',
        passed: false,
        durationMs: Math.round(performance.now() - start),
        details: `Exception: ${err.message}`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // TEST CASE 6: Configurable Threshold Validation
  // ---------------------------------------------------------------------------
  {
    const start = performance.now();
    try {
      const image = await SeamTestImageFactory.createHorizontalSeamImage(256, 256);

      // With strict threshold (0.01), should fail
      const strictRes = await seamAnalysisService.analyzeSeams(image, { threshold: 0.01 });
      // With very lenient threshold (0.99), should pass
      const lenientRes = await seamAnalysisService.analyzeSeams(image, { threshold: 0.99 });

      const passed = strictRes.pass === false && lenientRes.pass === true;
      const duration = Math.round(performance.now() - start);

      testResults.push({
        name: 'Case 6: Configurable Threshold Behavior',
        passed,
        durationMs: duration,
        details: `Strict threshold (0.01) -> pass: ${strictRes.pass}, Lenient threshold (0.99) -> pass: ${lenientRes.pass}`,
      });

      console.log(`  ${passed ? '✓' : '✗'} Case 6 (Thresholds): ${passed ? 'PASSED' : 'FAILED'} (${duration}ms)`);
    } catch (err: any) {
      testResults.push({
        name: 'Case 6: Configurable Threshold Behavior',
        passed: false,
        durationMs: Math.round(performance.now() - start),
        details: `Exception: ${err.message}`,
      });
    }
  }

  const suiteDuration = Math.round(performance.now() - suiteStart);
  const passedCount = testResults.filter((r) => r.passed).length;
  const failedCount = testResults.length - passedCount;

  console.log('======================================================');
  console.log(`  SeamAnalyzer Results: ${passedCount}/${testResults.length} Tests Passed in ${suiteDuration}ms`);
  console.log('======================================================');

  return {
    total: testResults.length,
    passed: passedCount,
    failed: failedCount,
    durationMs: suiteDuration,
    results: testResults,
    allPassed: failedCount === 0,
  };
}

// Auto-run only when executed directly via CLI (npm run test:seam / tsx server/services/seamAnalysisService.test.ts)
const isDirectExecution = process.argv[1]?.includes('seamAnalysisService.test');

if (isDirectExecution) {
  runSeamAnalyzerTestSuite()
    .then((suite) => {
      if (!suite.allPassed) {
        console.error(`\n❌ Seam analyzer test suite failed with ${suite.failed} error(s).`);
        process.exit(1);
      } else {
        console.log(`\n🎉 All ${suite.passed} seam analysis unit tests passed successfully!`);
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error('Fatal seam test runner error:', err);
      process.exit(1);
    });
}
