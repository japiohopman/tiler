/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  sanitizeFilename,
  getExportSourceInfo,
  buildExportFilenames,
  buildExportMetadata,
} from './exportUtils';
import { Tile } from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runExportTestSuite() {
  console.log('======================================================');
  console.log('  [ExportUtils] Starting Export Unit Tests');
  console.log('======================================================');

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void) {
    total++;
    try {
      fn();
      console.log(`  ✓ ${name}: PASSED`);
      passed++;
    } catch (err: any) {
      console.error(`  ✕ ${name}: FAILED - ${err.message}`);
      throw err;
    }
  }

  // Test 1: Filename Sanitization with invalid filesystem characters
  test('Sanitizes filesystem-unsafe characters (/ \\ : * ? " < > |)', () => {
    const rawInput = 'Cobblestone / Brick: Matrix * Test ? "Quote" <Less> >Greater< | Pipe';
    const sanitized = sanitizeFilename(rawInput);
    assert(
      !/[/\\:*?"<>|]/.test(sanitized),
      'Sanitized string must not contain invalid characters'
    );
    assert(
      sanitized === 'cobblestone-brick-matrix-test-quote-less-greater-pipe',
      `Unexpected sanitized output: ${sanitized}`
    );
  });

  // Test 2: Fallback for empty or invalid names
  test('Returns fallback "tile" for empty or whitespace-only names', () => {
    assert(sanitizeFilename('') === 'tile', 'Empty string should return tile');
    assert(sanitizeFilename('   ') === 'tile', 'Whitespace should return tile');
    assert(sanitizeFilename('///') === 'tile', 'Punctuation only should return tile');
  });

  // Test 3: Processed image is default export source
  test('Processed tile is default export source when present', () => {
    const mockTile: Tile = {
      id: 'tile-1',
      name: 'Cobblestone',
      material: 'cobblestone',
      style: 'stylized',
      prompt: 'top down cobblestone',
      resolution: 512,
      rawImageDataUrl: 'data:image/png;base64,RAWDATA',
      processedImageDataUrl: 'data:image/png;base64,PROCESSEDDATA',
      isTileable: true,
      createdAt: new Date().toISOString(),
    };

    const sourceInfo = getExportSourceInfo(mockTile);
    assert(sourceInfo.source === 'processed', 'Source must be processed');
    assert(!sourceInfo.isRawFallback, 'isRawFallback must be false');
    assert(sourceInfo.imageDataUrl === mockTile.processedImageDataUrl, 'Must use processed data URL');
  });

  // Test 4: Raw fallback when only raw image exists
  test('Raw provider image is fallback when processed tile is absent', () => {
    const mockTile: Tile = {
      id: 'tile-2',
      name: 'Grass',
      material: 'grass',
      style: 'stylized',
      prompt: 'top down grass',
      resolution: 512,
      rawImageDataUrl: 'data:image/png;base64,RAWDATA',
      processedImageDataUrl: undefined,
      isTileable: false,
      createdAt: new Date().toISOString(),
    };

    const sourceInfo = getExportSourceInfo(mockTile);
    assert(sourceInfo.source === 'raw', 'Source must be raw');
    assert(sourceInfo.isRawFallback === true, 'isRawFallback must be true');
    assert(sourceInfo.imageDataUrl === mockTile.rawImageDataUrl, 'Must use raw data URL');
  });

  // Test 5: Filenames building
  test('Builds safe filenames for PNG and JSON companion metadata', () => {
    const mockTile: Tile = {
      id: 'tile-3',
      name: 'Water / River: Blue',
      material: 'water',
      style: 'stylized',
      prompt: 'top down water',
      resolution: 512,
      processedImageDataUrl: 'data:image/png;base64,DATA',
      isTileable: true,
      createdAt: new Date().toISOString(),
    };

    const { imageFilename, metadataFilename } = buildExportFilenames(mockTile, { format: 'png' }, 'processed');
    assert(imageFilename === 'water-processed.png', `Image filename incorrect: ${imageFilename}`);
    assert(metadataFilename === 'water-processed.json', `Metadata filename incorrect: ${metadataFilename}`);
  });

  // Test 6: Companion metadata includes required fields and excludes secrets
  test('Metadata package includes reproducibility fields and contains no secrets', () => {
    const mockTile: Tile = {
      id: 'tile-4',
      name: 'Wood Planks',
      material: 'wood',
      style: 'hand-painted',
      prompt: 'top down wooden floor planks',
      resolution: 512,
      rawImageDataUrl: 'data:image/png;base64,RAW',
      processedImageDataUrl: 'data:image/png;base64,PROC',
      isTileable: true,
      rawSeamScore: 0.125,
      seamScore: 0.008,
      createdAt: new Date().toISOString(),
      generationMetadata: {
        model: 'sdxl-base-1.0',
        builtPrompt: 'top down wooden floor planks hand-painted style',
        material: 'wood',
        style: 'hand-painted',
        resolution: 512,
        generatedAt: '2025-01-01T00:00:00.000Z',
        processingAlgorithm: 'offset-crossfade',
        blendMarginPercent: 10,
      },
      validationSummary: {
        generationStatus: 'SUCCESS',
        rawTileable: false,
        processedTileable: true,
        rawSeamScore: 0.125,
        processedSeamScore: 0.008,
        improvement: 0.117,
        improvementStatus: 'IMPROVED',
        finalStatus: 'PASS_AFTER_PROCESSING',
        threshold: 0.05,
        issues: [],
        promptAdherenceStatus: 'NOT_AUTOMATICALLY_VALIDATED',
      },
    };

    const metadata = buildExportMetadata(mockTile, 'processed');

    assert(metadata.material === 'wood', 'Material must match');
    assert(metadata.model === 'sdxl-base-1.0', 'Model must match');
    assert(metadata.prompt === 'top down wooden floor planks hand-painted style', 'Prompt must match');
    assert(metadata.rawSeamScore === 0.125, 'Raw seam score must match');
    assert(metadata.processedSeamScore === 0.008, 'Processed seam score must match');
    assert(metadata.rawTileability === false, 'Raw tileability must match');
    assert(metadata.processedTileability === true, 'Processed tileability must match');
    assert(metadata.improvement === 0.117, 'Improvement must match');
    assert(metadata.finalStatus === 'PASS_AFTER_PROCESSING', 'Final status must match');
    assert(metadata.exportSource === 'PROCESSED_TILE', 'Export source must match');

    // Confirm no secret keys exist
    const jsonString = JSON.stringify(metadata).toLowerCase();
    assert(!jsonString.includes('apikey'), 'Metadata must not contain apikey');
    assert(!jsonString.includes('secret'), 'Metadata must not contain secret');
    assert(!jsonString.includes('bearer'), 'Metadata must not contain bearer');
    assert(!jsonString.includes('authorization'), 'Metadata must not contain authorization');
  });

  // Test 7: Failed validation state preservation
  test('Validation failure status is strictly preserved in metadata and is not mutated on export', () => {
    const mockFailingTile: Tile = {
      id: 'tile-5',
      name: 'Lava',
      material: 'lava',
      style: 'stylized',
      prompt: 'molten lava',
      resolution: 512,
      rawImageDataUrl: 'data:image/png;base64,RAW',
      processedImageDataUrl: 'data:image/png;base64,PROC',
      isTileable: false,
      rawSeamScore: 0.25,
      seamScore: 0.18,
      createdAt: new Date().toISOString(),
      validationSummary: {
        generationStatus: 'SUCCESS',
        rawTileable: false,
        processedTileable: false,
        rawSeamScore: 0.25,
        processedSeamScore: 0.18,
        improvement: 0.07,
        improvementStatus: 'IMPROVED',
        finalStatus: 'VALIDATION_FAILED',
        threshold: 0.05,
        issues: ['Seam discontinuity exceeds tolerance'],
        promptAdherenceStatus: 'NOT_AUTOMATICALLY_VALIDATED',
      },
    };

    const metadata = buildExportMetadata(mockFailingTile, 'processed');
    assert(metadata.finalStatus === 'VALIDATION_FAILED', 'Must maintain VALIDATION_FAILED');
    assert(metadata.processedTileability === false, 'Processed tileability must remain false');
  });

  console.log('======================================================');
  console.log(`  Export Test Suite Results: ${passed}/${total} Tests Passed`);
  console.log('======================================================');
}

runExportTestSuite().catch((err) => {
  console.error('Export test suite execution failed:', err);
  process.exit(1);
});
