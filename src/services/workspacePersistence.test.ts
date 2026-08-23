/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CURRENT_SCHEMA_VERSION,
  PersistedWorkspaceData,
  STORAGE_KEY,
  clearWorkspace,
  deserializeWorkspace,
  loadWorkspace,
  saveWorkspace,
  serializeWorkspace,
} from './workspacePersistence';
import {
  GenerationParams,
  SeamAnalysisReport,
  TileProcessingOptions,
  ValidationSummary,
  WorkspaceAsset,
} from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`X TEST FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}: PASSED`);
}

console.log('======================================================');
console.log('  [WorkspacePersistence] Serialization & Lifecycle Tests');
console.log('======================================================');

// Setup mock window.localStorage for Node test environment
const localStorageMap = new Map<string, string>();
let mockQuotaError = false;

if (typeof window === 'undefined') {
  (globalThis as any).window = globalThis;
}

(globalThis as any).window.localStorage = {
  getItem: (key: string) => localStorageMap.get(key) ?? null,
  setItem: (key: string, value: string) => {
    if (mockQuotaError) {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    }
    localStorageMap.set(key, value);
  },
  removeItem: (key: string) => localStorageMap.delete(key),
  clear: () => localStorageMap.clear(),
};

// Reset mock storage before test suite
localStorageMap.clear();
mockQuotaError = false;

// 1. Serialization Tests
{
  console.log('\n--- Serialization Tests ---');

  const asset1: WorkspaceAsset = {
    id: 'asset-test-1',
    name: 'Cobblestone — Stylized',
    material: 'cobblestone',
    style: 'stylized',
    prompt: 'top-down cobblestone pavement',
    resolution: 512,
    rawImageDataUrl: 'data:image/png;base64,raw123',
    processedImageDataUrl: 'data:image/png;base64,proc123',
    isTileable: true,
    seamScore: 0.01,
    rawSeamScore: 0.12,
    createdAt: new Date().toISOString(),
  };

  const sampleData: PersistedWorkspaceData = {
    assets: [asset1],
    currentAssetId: 'asset-test-1',
    params: { material: 'cobblestone', style: 'stylized', resolution: 512 },
    processingOptions: { algorithm: 'offset-crossfade', blendMarginPercent: 10 },
    preview: { selectedSource: 'processed', mode: '3x3', showGrid: true },
  };

  const json = serializeWorkspace(sampleData);
  assert(typeof json === 'string', 'serializeWorkspace produces JSON string');

  const parsed = JSON.parse(json);
  assert(parsed.version === CURRENT_SCHEMA_VERSION, 'Includes current schema version 1');
  assert(typeof parsed.savedAt === 'string', 'Includes savedAt ISO timestamp');
  assert(parsed.workspace.assets.length === 1, 'Assets array serialized');
  assert(parsed.workspace.currentAssetId === 'asset-test-1', 'currentAssetId serialized');
  assert(parsed.workspace.assets[0].rawImageDataUrl === 'data:image/png;base64,raw123', 'rawImageDataUrl preserved');
  assert(parsed.workspace.assets[0].processedImageDataUrl === 'data:image/png;base64,proc123', 'processedImageDataUrl preserved');

  // Verify transient states and secrets are excluded
  assert(parsed.workspace.generation === undefined, 'Transient generation state excluded from payload');
  assert(parsed.workspace.processing === undefined, 'Transient processing state excluded from payload');
  assert(parsed.workspace.export === undefined, 'Transient export state excluded from payload');
  assert(parsed.workspace.activeView === undefined, 'Transient activeView excluded from payload');
  assert(parsed.workspace.apiKey === undefined, 'Secrets and credentials excluded from payload');
}

// 2. Deserialization Tests
{
  console.log('\n--- Deserialization Tests ---');

  // Test A: Valid deserialization
  const validJson = JSON.stringify({
    version: 1,
    savedAt: new Date().toISOString(),
    workspace: {
      id: 'default-workspace',
      assets: [
        {
          id: 'asset-A',
          name: 'Grass Tile',
          material: 'grass',
          style: 'stylized',
          prompt: 'lush green grass',
          resolution: 512,
          rawImageDataUrl: 'data:image/png;base64,rawGrass',
          processedImageDataUrl: 'data:image/png;base64,procGrass',
          isTileable: true,
          createdAt: new Date().toISOString(),
        },
      ],
      currentAssetId: 'asset-A',
      params: { material: 'grass', style: 'stylized', resolution: 512 },
    },
  });

  const payload = deserializeWorkspace(validJson);
  assert(payload !== null, 'Valid JSON payload deserializes successfully');
  assert(payload?.version === 1, 'Version matches 1');
  assert(payload?.workspace.assets.length === 1, 'Restores asset history array');
  assert(payload?.workspace.currentAssetId === 'asset-A', 'Restores currentAssetId');
  assert(payload?.workspace.assets[0].name === 'Grass Tile', 'Restores asset properties');

  // Test B: Malformed JSON handled safely
  const malformed = deserializeWorkspace('{"version": 1, "workspace": { corrupt JSON...');
  assert(malformed === null, 'Malformed JSON returns null safely without throwing');

  // Test C: Incompatible schema version rejected safely
  const futureVersion = JSON.stringify({
    version: 999,
    savedAt: new Date().toISOString(),
    workspace: { assets: [] },
  });
  const futureRes = deserializeWorkspace(futureVersion);
  assert(futureRes === null, 'Incompatible schema version returns null safely');

  // Test D: Corrupt asset items filtered out safely
  const corruptAssetsJson = JSON.stringify({
    version: 1,
    savedAt: new Date().toISOString(),
    workspace: {
      assets: [
        { id: 'valid-1', name: 'Valid Asset', material: 'wood' },
        null,
        'not an object',
        { invalidField: true }, // missing mandatory id, name, material
      ],
      currentAssetId: 'valid-1',
    },
  });
  const corruptRes = deserializeWorkspace(corruptAssetsJson);
  assert(corruptRes?.workspace.assets.length === 1, 'Corrupt or incomplete asset items filtered out safely');
  assert(corruptRes?.workspace.assets[0].id === 'valid-1', 'Only valid asset retained');

  // Test E: Invalid currentAssetId fallback
  const invalidIdJson = JSON.stringify({
    version: 1,
    savedAt: new Date().toISOString(),
    workspace: {
      assets: [{ id: 'existing-id', name: 'Existing Asset', material: 'sand' }],
      currentAssetId: 'non-existent-id-999',
    },
  });
  const invalidIdRes = deserializeWorkspace(invalidIdJson);
  assert(invalidIdRes?.workspace.currentAssetId === 'existing-id', 'Invalid currentAssetId falls back to existing asset ID');
}

// 3. Storage Quota & Error Handling
{
  console.log('\n--- Storage Quota & Error Handling Tests ---');

  localStorageMap.clear();
  mockQuotaError = true;

  const testAsset: WorkspaceAsset = {
    id: 'heavy-asset',
    name: 'Heavy Asset',
    material: 'water',
    style: 'stylized',
    prompt: 'water',
    resolution: 512,
    createdAt: new Date().toISOString(),
    isTileable: true,
  };

  const saveRes = saveWorkspace({
    assets: [testAsset],
    currentAssetId: 'heavy-asset',
  });

  assert(saveRes.success === false, 'QuotaExceeded returns success: false');
  assert(saveRes.isQuotaExceeded === true, 'Identifies quota exceeded condition');
  assert(typeof saveRes.error === 'string' && saveRes.error.includes('quota'), 'Returns clear quota warning message');

  mockQuotaError = false;
  localStorageMap.clear();
}

// 4. Persistence Lifecycle Integration Tests (Section 19 in prompt)
{
  console.log('\n--- Persistence Lifecycle Tests ---');

  localStorageMap.clear();

  // Lifecycle 1: Create Asset -> Save -> Load -> Asset Restored
  const assetCreated: WorkspaceAsset = {
    id: 'asset-1-cobble',
    name: 'Cobblestone — Stylized',
    material: 'cobblestone',
    style: 'stylized',
    prompt: 'cobblestone pavement',
    resolution: 512,
    rawImageDataUrl: 'data:image/png;base64,rawCobble1',
    processedImageDataUrl: 'data:image/png;base64,procCobble1',
    isTileable: true,
    seamScore: 0.01,
    createdAt: new Date().toISOString(),
  };

  saveWorkspace({
    assets: [assetCreated],
    currentAssetId: 'asset-1-cobble',
    params: { material: 'cobblestone', style: 'stylized', resolution: 512 },
  });

  const load1 = loadWorkspace();
  assert(load1 !== null && load1.workspace.assets.length === 1, 'Lifecycle 1: Created asset saved and loaded');
  assert(load1?.workspace.currentAssetId === 'asset-1-cobble', 'Lifecycle 1: currentAssetId restored');
  assert(load1?.workspace.assets[0].rawImageDataUrl === 'data:image/png;base64,rawCobble1', 'Lifecycle 1: Raw image restored');

  // Lifecycle 2: Edit Asset -> Save -> Reload -> Edited Asset Restored
  const assetEdited: WorkspaceAsset = {
    ...assetCreated,
    editedImageDataUrl: 'data:image/png;base64,editedCobble1',
    processedImageDataUrl: undefined,
    isTileable: false,
    validationSummary: {
      generationStatus: 'SUCCESS',
      rawTileable: false,
      processedTileable: false,
      rawSeamScore: 0.12,
      processedSeamScore: 1.0,
      improvement: 0,
      improvementStatus: 'UNCHANGED',
      finalStatus: 'VALIDATION_FAILED',
      threshold: 0.05,
      issues: ['Source image edited — explicit reprocessing required'],
    },
  };

  saveWorkspace({
    assets: [assetEdited],
    currentAssetId: 'asset-1-cobble',
  });

  const load2 = loadWorkspace();
  assert(load2?.workspace.assets[0].rawImageDataUrl === 'data:image/png;base64,rawCobble1', 'Lifecycle 2: Raw image remains available');
  assert(load2?.workspace.assets[0].editedImageDataUrl === 'data:image/png;base64,editedCobble1', 'Lifecycle 2: Edited image restored');
  assert(load2?.workspace.assets[0].validationSummary?.finalStatus === 'VALIDATION_FAILED', 'Lifecycle 2: Invalidated validation status restored');

  // Lifecycle 3: Process Asset -> Save -> Reload -> Processed Asset Restored
  const assetProcessed: WorkspaceAsset = {
    ...assetEdited,
    processedImageDataUrl: 'data:image/png;base64,reprocessedCobble1',
    isTileable: true,
    seamScore: 0.005,
    validationSummary: {
      generationStatus: 'SUCCESS',
      rawTileable: false,
      processedTileable: true,
      rawSeamScore: 0.12,
      processedSeamScore: 0.005,
      improvement: 0.115,
      improvementStatus: 'IMPROVED',
      finalStatus: 'PASS_AFTER_PROCESSING',
      threshold: 0.05,
      issues: [],
    },
  };

  saveWorkspace({
    assets: [assetProcessed],
    currentAssetId: 'asset-1-cobble',
  });

  const load3 = loadWorkspace();
  assert(load3?.workspace.assets[0].processedImageDataUrl === 'data:image/png;base64,reprocessedCobble1', 'Lifecycle 3: Processed image restored');
  assert(load3?.workspace.assets[0].validationSummary?.finalStatus === 'PASS_AFTER_PROCESSING', 'Lifecycle 3: Re-validated status restored');

  // Lifecycle 4: Select Asset B -> Save -> Reload -> Asset B Remains Selected
  const assetB: WorkspaceAsset = {
    id: 'asset-2-wood',
    name: 'Wood — Hand-Painted',
    material: 'wood',
    style: 'hand-painted',
    prompt: 'wooden planks',
    resolution: 512,
    rawImageDataUrl: 'data:image/png;base64,rawWood',
    createdAt: new Date().toISOString(),
    isTileable: false,
  };

  saveWorkspace({
    assets: [assetProcessed, assetB],
    currentAssetId: 'asset-2-wood', // User selected Asset B
  });

  const load4 = loadWorkspace();
  assert(load4?.workspace.assets.length === 2, 'Lifecycle 4: Both assets persisted');
  assert(load4?.workspace.currentAssetId === 'asset-2-wood', 'Lifecycle 4: Selected Asset B restored as currentAssetId');

  // Lifecycle 5: Delete Asset A -> Save -> Reload -> Asset A Remains Deleted
  saveWorkspace({
    assets: [assetB],
    currentAssetId: 'asset-2-wood',
  });

  const load5 = loadWorkspace();
  assert(load5?.workspace.assets.length === 1, 'Lifecycle 5: Deleted asset removed from storage');
  assert(load5?.workspace.assets[0].id === 'asset-2-wood', 'Lifecycle 5: Remaining asset preserved');

  // Lifecycle 6: Clear Workspace -> Storage Removed -> Load returns null
  clearWorkspace();
  const load6 = loadWorkspace();
  assert(load6 === null, 'Lifecycle 6: Clear workspace removes persisted storage');
}

console.log('======================================================');
console.log('  All WorkspacePersistence Unit & Lifecycle Tests Passed!');
console.log('======================================================');
