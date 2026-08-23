/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  clearWorkspace,
  CURRENT_SCHEMA_VERSION,
  deserializeWorkspace,
  loadWorkspace,
  saveWorkspace,
  serializeWorkspaceMetadata,
} from './workspacePersistence';
import { imageStorage } from './imageStorage';
import { WorkspaceAsset } from '../types';

// Mock Browser Storage Environment for Unit Testing
class MockLocalStorage {
  private store: Map<string, string> = new Map();
  public shouldThrowQuota = false;

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    if (this.shouldThrowQuota) {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    }
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

const mockLocalStorage = new MockLocalStorage();
(global as any).window = {
  localStorage: mockLocalStorage,
};

// Fixture Data Generators
const createTestAsset = (id: string, name: string): WorkspaceAsset => ({
  id,
  name,
  material: 'cobblestone',
  style: 'stylized',
  prompt: 'seamless cobblestone texture',
  resolution: 512,
  rawImageDataUrl: `data:image/png;base64,RAW_DATA_${id}_AAAA`,
  editedImageDataUrl: `data:image/png;base64,EDITED_DATA_${id}_BBBB`,
  processedImageDataUrl: `data:image/png;base64,PROCESSED_DATA_${id}_CCCC`,
  isTileable: true,
  seamScore: 0.02,
  rawSeamScore: 0.15,
  seamReport: {
    horizontalScore: 0.01,
    verticalScore: 0.01,
    overallScore: 0.02,
    width: 512,
    height: 512,
    pass: true,
    threshold: 0.05,
    edgeRegion: 4,
    maxHorizontalDelta: 0,
    maxVerticalDelta: 0,
    discontinuousPixelCount: 0,
    totalEdgePixelsEvaluated: 2048,
    issues: [],
  },
  validationSummary: {
    generationStatus: 'SUCCESS',
    rawTileable: false,
    processedTileable: true,
    rawSeamScore: 0.15,
    processedSeamScore: 0.02,
    improvement: 86.6,
    improvementStatus: 'IMPROVED',
    finalStatus: 'PASS_AFTER_PROCESSING',
    threshold: 0.05,
    issues: [],
  },
  createdAt: '2025-02-17T12:00:00.000Z',
});

async function runTests() {
  console.log('======================================================');
  console.log('  [Persistence] Starting Unit & Lifecycle Test Suite');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, message: string) {
    total++;
    if (condition) {
      console.log(`  ✓ ${message}: PASSED`);
      passed++;
    } else {
      console.error(`  ✗ ${message}: FAILED`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // 1. Serialization
    console.log('--- 1. Metadata Serialization ---');
    const assetA = createTestAsset('asset-1', 'Cobblestone Alpha');
    const { json, assetsToStore } = serializeWorkspaceMetadata({
      assets: [assetA],
      currentAssetId: 'asset-1',
      params: { material: 'cobblestone', style: 'stylized', resolution: 512 },
    });

    const parsedJson = JSON.parse(json);
    assert(parsedJson.version === CURRENT_SCHEMA_VERSION, 'Schema version is 1');
    assert(typeof parsedJson.savedAt === 'string', 'SavedAt timestamp is generated');
    assert(parsedJson.workspace.assets.length === 1, 'Assets array is serialized');
    assert(parsedJson.workspace.assets[0].rawImageDataUrl === undefined, 'Raw image Data URL is stripped from metadata json');
    assert(assetsToStore[0].rawImageDataUrl === assetA.rawImageDataUrl, 'Raw image Data URL is preserved in assetsToStore for IndexedDB');

    // 2. Deserialization
    console.log('\n--- 2. Deserialization & Validation ---');
    const restored = deserializeWorkspace(json);
    assert(restored !== null, 'Valid payload deserializes successfully');
    assert(restored?.workspace.currentAssetId === 'asset-1', 'currentAssetId restored');
    assert(restored?.workspace.assets[0].name === 'Cobblestone Alpha', 'Asset metadata restored');

    // 3. Corrupt Data
    console.log('\n--- 3. Corrupt Payload Handling ---');
    assert(deserializeWorkspace('invalid json') === null, 'Malformed JSON returns null');
    assert(deserializeWorkspace(JSON.stringify({ version: 999, workspace: {} })) === null, 'Incompatible version returns null');
    assert(deserializeWorkspace(JSON.stringify({ version: 1, workspace: null })) === null, 'Invalid workspace object returns null');

    // 4. Quota Handling
    console.log('\n--- 4. Quota Exceeded Exception Handling ---');
    mockLocalStorage.shouldThrowQuota = true;
    const quotaResult = await saveWorkspace({
      assets: [assetA],
      currentAssetId: 'asset-1',
    });
    assert(quotaResult.success === false, 'Save returns success=false on QuotaExceeded');
    assert(quotaResult.isQuotaExceeded === true, 'isQuotaExceeded flag set to true');
    assert(quotaResult.error?.includes('quota exceeded') === true, 'Useful error message returned');
    mockLocalStorage.shouldThrowQuota = false;

    // 5. Full Persistence Lifecycle
    console.log('\n--- 5. Full 6-Phase Persistence Lifecycle ---');
    await clearWorkspace();

    // Phase 1: Create Assets A & B
    const assetB = createTestAsset('asset-2', 'Grass Beta');
    assetB.material = 'grass';

    await saveWorkspace({
      assets: [assetA, assetB],
      currentAssetId: 'asset-1',
    });

    let loadedPayload = await loadWorkspace();
    assert(loadedPayload?.workspace.assets.length === 2, 'Phase 1: Both Assets A and B restored');
    assert(loadedPayload?.workspace.currentAssetId === 'asset-1', 'Phase 1: Asset A remains selected');
    assert(loadedPayload?.workspace.assets[0].rawImageDataUrl === assetA.rawImageDataUrl, 'Phase 1: Raw image Data URL loaded from IndexedDB');

    // Phase 2: Edit Asset A
    const editedAssetA = {
      ...assetA,
      editedImageDataUrl: 'data:image/png;base64,NEW_EDITED_IMAGE_AAAA',
      validationSummary: {
        generationStatus: 'SUCCESS' as const,
        rawTileable: false,
        processedTileable: false,
        rawSeamScore: 0.15,
        processedSeamScore: 0.15,
        improvement: 0,
        improvementStatus: 'UNCHANGED' as const,
        finalStatus: 'VALIDATION_FAILED' as const,
        threshold: 0.05,
        issues: ['Committed edits require re-processing'],
      },
    };

    await saveWorkspace({
      assets: [editedAssetA, assetB],
      currentAssetId: 'asset-1',
    });

    loadedPayload = await loadWorkspace();
    assert(loadedPayload?.workspace.assets[0].editedImageDataUrl === 'data:image/png;base64,NEW_EDITED_IMAGE_AAAA', 'Phase 2: Edited image restored');
    assert(loadedPayload?.workspace.assets[0].validationSummary?.finalStatus === 'VALIDATION_FAILED', 'Phase 2: Validation status invalidated upon edit');

    // Phase 3: Reprocess Asset A
    const processedAssetA = {
      ...editedAssetA,
      processedImageDataUrl: 'data:image/png;base64,NEW_PROCESSED_IMAGE_AAAA',
      validationSummary: {
        generationStatus: 'SUCCESS' as const,
        rawTileable: false,
        processedTileable: true,
        rawSeamScore: 0.15,
        processedSeamScore: 0.01,
        improvement: 93.3,
        improvementStatus: 'IMPROVED' as const,
        finalStatus: 'PASS_AFTER_PROCESSING' as const,
        threshold: 0.05,
        issues: [],
      },
    };

    await saveWorkspace({
      assets: [processedAssetA, assetB],
      currentAssetId: 'asset-1',
    });

    loadedPayload = await loadWorkspace();
    assert(loadedPayload?.workspace.assets[0].processedImageDataUrl === 'data:image/png;base64,NEW_PROCESSED_IMAGE_AAAA', 'Phase 3: Reprocessed image restored');
    assert(loadedPayload?.workspace.assets[0].validationSummary?.finalStatus === 'PASS_AFTER_PROCESSING', 'Phase 3: Final validation status restored');

    // Phase 4: Select Asset B
    await saveWorkspace({
      assets: [processedAssetA, assetB],
      currentAssetId: 'asset-2',
    });

    loadedPayload = await loadWorkspace();
    assert(loadedPayload?.workspace.currentAssetId === 'asset-2', 'Phase 4: Asset B selection persisted across reload');

    // Phase 5: Delete Asset A
    await imageStorage.deleteAssetImages('asset-1');
    await saveWorkspace({
      assets: [assetB],
      currentAssetId: 'asset-2',
    });

    loadedPayload = await loadWorkspace();
    assert(loadedPayload?.workspace.assets.length === 1, 'Phase 5: Asset A deletion persisted');
    assert(loadedPayload?.workspace.assets[0].id === 'asset-2', 'Phase 5: Only Asset B remains');

    // Phase 6: Clear Local Workspace
    await clearWorkspace();
    loadedPayload = await loadWorkspace();
    assert(loadedPayload === null, 'Phase 6: Workspace payload is null after clearWorkspace');

    console.log('\n======================================================');
    console.log(`  Persistence Test Suite Results: ${passed}/${total} Passed`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('\nTest Suite Execution Error:', err);
    process.exit(1);
  }
}

runTests();
