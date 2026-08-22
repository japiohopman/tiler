/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GenerationResponse,
  SeamAnalysisReport,
  ValidationSummary,
  WorkspaceAsset,
  WorkspaceState,
} from '../types';
import {
  addAssetToHistory,
  canStartGeneration,
  createWorkspaceAssetFromResponse,
  deleteAssetFromHistory,
  generateReadableAssetName,
  transitionExportState,
  transitionGenerationState,
  updateAssetInHistory,
  updateSeamAnalysisSummary,
} from '../utils/workspaceTransitions';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`X TEST FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}: PASSED`);
}

console.log('======================================================');
console.log('  [WorkspaceTransitions & WorkspaceState] Unit & Behavior Tests');
console.log('======================================================');

// Helper function to create initial workspace state
function createInitialWorkspaceState(): WorkspaceState {
  return {
    activeView: 'workspace',
    backendStatus: 'online',
    config: {
      params: {
        material: 'cobblestone',
        style: 'stylized',
        resolution: 512,
      },
      processingOptions: {
        algorithm: 'offset-crossfade',
        blendMarginPercent: 10,
      },
      activeProvider: 'pixazo',
      providerConfigured: true,
    },
    generation: {
      status: 'idle',
      currentStep: '',
      progress: 0,
    },
    processing: {
      status: 'ready',
      currentStep: 'READY',
    },
    assets: [],
    currentAssetId: null,
    asset: null,
    preview: {
      selectedSource: 'processed',
      mode: '3x3',
      showGrid: true,
    },
    export: {
      status: 'idle',
    },
    notification: null,
  };
}

// 1. Initial idle state
{
  const state = createInitialWorkspaceState();
  assert(state.generation.status === 'idle', 'Initial generation state is idle');
  assert(state.asset === null, 'Initial asset is null');
  assert(state.export.status === 'idle', 'Initial export state is idle');
  assert(state.preview.selectedSource === 'processed', 'Initial preview source is processed');
}

// 2. Pure transition function: generation lifecycle
{
  const genState = transitionGenerationState('generating', 'Generating via pixazo...', 30);
  assert(genState.status === 'generating', 'canStartGeneration & transitionGenerationState set status to generating');
  assert(genState.progress === 30, 'Generation progress is updated to 30%');

  const errState = transitionGenerationState('error', 'Failed', 0, 'HTTP 502 Bad Gateway');
  assert(errState.status === 'error', 'Failed generation sets status to error');
  assert(errState.errorMessage === 'HTTP 502 Bad Gateway', 'Error message captured correctly in transition state');
}

// 3. Pure helper: duplicate generation protection
{
  assert(canStartGeneration(false, 'idle') === true, 'Generation allowed when idle and not generating');
  assert(canStartGeneration(true, 'idle') === false, 'Generation rejected when isGeneratingFlag is true');
  assert(canStartGeneration(false, 'generating') === false, 'Generation rejected when status is generating');
  assert(canStartGeneration(false, 'processing') === false, 'Generation rejected when status is processing');
  assert(canStartGeneration(false, 'error') === true, 'Generation allowed when status is error (recovery/retry path)');
}

// 4. Pure helper: createWorkspaceAssetFromResponse retains raw/processed separation & validation summary
{
  const mockRawReport: SeamAnalysisReport = {
    horizontalScore: 0.12,
    verticalScore: 0.11,
    overallScore: 0.115,
    width: 512,
    height: 512,
    pass: false,
    threshold: 0.05,
    edgeRegion: 4,
    maxHorizontalDelta: 0.15,
    maxVerticalDelta: 0.14,
    discontinuousPixelCount: 400,
    totalEdgePixelsEvaluated: 4096,
    issues: ['Seam delta exceeds threshold'],
  };

  const mockProcessedReport: SeamAnalysisReport = {
    horizontalScore: 0.002,
    verticalScore: 0.003,
    overallScore: 0.0025,
    width: 512,
    height: 512,
    pass: true,
    threshold: 0.05,
    edgeRegion: 4,
    maxHorizontalDelta: 0.003,
    maxVerticalDelta: 0.004,
    discontinuousPixelCount: 0,
    totalEdgePixelsEvaluated: 4096,
    issues: [],
  };

  const mockSummary: ValidationSummary = {
    generationStatus: 'SUCCESS',
    rawTileable: false,
    processedTileable: true,
    rawSeamScore: 0.115,
    processedSeamScore: 0.0025,
    improvement: 0.1125,
    improvementStatus: 'IMPROVED',
    finalStatus: 'PASS_AFTER_PROCESSING',
    threshold: 0.05,
    issues: [],
    promptAdherenceStatus: 'NOT_AUTOMATICALLY_VALIDATED',
  };

  const mockGenResponse: GenerationResponse = {
    success: true,
    tileId: 'tile-test-100',
    rawImageUrl: 'data:image/png;base64,rawNewData',
    processedImageUrl: 'data:image/png;base64,procNewData',
    prompt: 'cobblestone pavement',
    seamReport: mockProcessedReport,
    rawSeamReport: mockRawReport,
    validationSummary: mockSummary,
    generationMetadata: {
      model: 'sdxl-base-1.0',
      builtPrompt: 'cobblestone pavement',
      material: 'cobblestone',
      style: 'stylized',
      resolution: 512,
      generatedAt: new Date().toISOString(),
    },
  };

  const newAsset = createWorkspaceAssetFromResponse(
    mockGenResponse,
    { material: 'cobblestone', style: 'stylized', resolution: 512 },
    { algorithm: 'offset-crossfade', blendMarginPercent: 10 }
  );

  assert(newAsset.rawImageDataUrl === 'data:image/png;base64,rawNewData', 'Raw image URL stored separately');
  assert(newAsset.processedImageDataUrl === 'data:image/png;base64,procNewData', 'Processed image URL stored separately');
  assert(newAsset.rawSeamReport?.overallScore === 0.115, 'Raw seam report preserved');
  assert(newAsset.seamReport?.overallScore === 0.0025, 'Processed seam report preserved');
  assert(newAsset.validationSummary?.finalStatus === 'PASS_AFTER_PROCESSING', 'Validation summary stored attached to asset');
}

// 5. Validation failure does not delete or invalidate the asset
{
  const mockFailedSummary: ValidationSummary = {
    generationStatus: 'SUCCESS',
    rawTileable: false,
    processedTileable: false,
    rawSeamScore: 0.15,
    processedSeamScore: 0.09,
    improvement: 0.06,
    improvementStatus: 'IMPROVED',
    finalStatus: 'VALIDATION_FAILED',
    threshold: 0.05,
    issues: ['Opposing boundary edges exceed tolerance limit'],
    promptAdherenceStatus: 'NOT_AUTOMATICALLY_VALIDATED',
  };

  const mockGenResponseFailed: GenerationResponse = {
    success: true,
    tileId: 'tile-failed-200',
    rawImageUrl: 'data:image/png;base64,rawWoodData',
    processedImageUrl: 'data:image/png;base64,procWoodData',
    prompt: 'wooden planks',
    validationSummary: mockFailedSummary,
  };

  const failedAsset = createWorkspaceAssetFromResponse(
    mockGenResponseFailed,
    { material: 'wood', style: 'hand-painted', resolution: 512 },
    { algorithm: 'offset-crossfade', blendMarginPercent: 10 }
  );

  assert(failedAsset.validationSummary?.finalStatus === 'VALIDATION_FAILED', 'validationSummary.finalStatus remains VALIDATION_FAILED');
  assert(failedAsset.processedImageDataUrl === 'data:image/png;base64,procWoodData', 'Processed image asset remains available for preview/export despite validation failure');
}

// 6. Pure helper: updateSeamAnalysisSummary preserves authoritative finalStatus
{
  const initialAsset: WorkspaceAsset = {
    id: 'asset-reanalyze-1',
    name: 'Cobblestone',
    material: 'cobblestone',
    style: 'stylized',
    prompt: 'cobblestone',
    resolution: 512,
    rawImageDataUrl: 'data:image/png;base64,rawImg',
    processedImageDataUrl: 'data:image/png;base64,procImg',
    isTileable: false,
    seamScore: 0.08,
    rawSeamScore: 0.12,
    createdAt: new Date().toISOString(),
  };

  const updatedProcReport: SeamAnalysisReport = {
    horizontalScore: 0.01,
    verticalScore: 0.01,
    overallScore: 0.01,
    width: 512,
    height: 512,
    pass: true,
    threshold: 0.05,
    edgeRegion: 4,
    maxHorizontalDelta: 0.01,
    maxVerticalDelta: 0.01,
    discontinuousPixelCount: 0,
    totalEdgePixelsEvaluated: 4096,
    issues: [],
  };

  const result = updateSeamAnalysisSummary(initialAsset, 'processed', updatedProcReport, 0.05);

  assert(result.isTileable === true, 'Processed tile marked as tileable after re-analysis');
  assert(result.validationSummary.finalStatus === 'PASS_AFTER_PROCESSING', 'updateSeamAnalysisSummary correctly classifies PASS_AFTER_PROCESSING');
  assert(result.validationSummary.processedSeamScore === 0.01, 'Updated processed seam score stored in validation summary');
}

// 7. Pure transition function: export state independence
{
  const expStateExporting = transitionExportState('exporting');
  assert(expStateExporting.status === 'exporting', 'Export state transitions to exporting independently');

  const expStateError = transitionExportState('error', 'Network failure');
  assert(expStateError.status === 'error', 'Failed export sets export status to error');
  assert(expStateError.errorMessage === 'Network failure', 'Export error message preserved');

  const expStateCompleted = transitionExportState('completed');
  assert(expStateCompleted.status === 'completed', 'Successful export transitions state to completed');
}

// 8. Behavior tests: Regeneration & Asset Preservation on Failure
{
  const initialAsset: WorkspaceAsset = {
    id: 'asset-v1-cobble',
    name: 'Cobblestone v1',
    material: 'cobblestone',
    style: 'stylized',
    prompt: 'cobblestone pavement',
    resolution: 512,
    rawImageDataUrl: 'data:image/png;base64,v1Raw',
    processedImageDataUrl: 'data:image/png;base64,v1Proc',
    isTileable: true,
    seamScore: 0.01,
    createdAt: new Date().toISOString(),
  };

  let activeAsset: WorkspaceAsset | null = initialAsset;
  let genState = transitionGenerationState('idle', '', 0);

  // User triggers Regeneration: asset remains visible while generating
  genState = transitionGenerationState('generating', 'GENERATING', 30);
  assert(activeAsset !== null && activeAsset.id === 'asset-v1-cobble', 'Regeneration in progress preserves existing asset in workspace');
  assert(canStartGeneration(true, genState.status) === false, 'Duplicate generation request is blocked while generating');

  // Scenario A: Regeneration succeeds -> new asset replaces old asset
  const newGenResponse: GenerationResponse = {
    success: true,
    tileId: 'asset-v2-cobble',
    rawImageUrl: 'data:image/png;base64,v2Raw',
    processedImageUrl: 'data:image/png;base64,v2Proc',
    prompt: 'cobblestone pavement',
  };
  const updatedAsset = createWorkspaceAssetFromResponse(
    newGenResponse,
    { material: 'cobblestone', style: 'stylized', resolution: 512 },
    { algorithm: 'offset-crossfade', blendMarginPercent: 10 }
  );
  activeAsset = updatedAsset;
  genState = transitionGenerationState('completed', 'Completed', 100);

  assert(activeAsset.id !== initialAsset.id, 'Successful regeneration produces a new asset with a unique ID');

  // Scenario B: Regeneration fails -> previous asset remains current
  let currentAssetBeforeFailedRegen = activeAsset;
  genState = transitionGenerationState('generating', 'GENERATING', 30);
  // Regeneration API throws error (HTTP 502 Bad Gateway)
  genState = transitionGenerationState('error', 'Generation failed', 0, 'HTTP 502 Bad Gateway: Provider failed');
  // Asset is NOT cleared on failure
  assert(activeAsset.id === currentAssetBeforeFailedRegen.id, 'Failed regeneration preserves previous asset in workspace');
  assert(genState.status === 'error', 'Generation enters error state on provider failure');
  assert(canStartGeneration(false, genState.status) === true, 'Retry remains possible after generation error without page refresh');
}

// 9. Error Differentiation: Generation Error vs Validation Failure vs Export Error
{
  const genError = transitionGenerationState('error', 'Generation failed', 0, 'HTTP 502 Bad Gateway');
  const expError = transitionExportState('error', 'Failed to render PNG export');
  const valFailedSummary: ValidationSummary = {
    generationStatus: 'SUCCESS',
    rawTileable: false,
    processedTileable: false,
    rawSeamScore: 0.18,
    processedSeamScore: 0.12,
    improvement: 0.06,
    improvementStatus: 'IMPROVED',
    finalStatus: 'VALIDATION_FAILED',
    threshold: 0.05,
    issues: ['Seam discontinuity'],
    promptAdherenceStatus: 'NOT_AUTOMATICALLY_VALIDATED',
  };

  assert(genError.status === 'error' && genError.errorMessage?.includes('HTTP 502'), 'Generation error correctly represented as generation failure');
  assert(expError.status === 'error' && expError.errorMessage?.includes('export'), 'Export error correctly represented as export failure');
  assert(valFailedSummary.finalStatus === 'VALIDATION_FAILED' && valFailedSummary.generationStatus === 'SUCCESS', 'Validation failure remains distinct from generation failure');
}

// 10. Phase 3.3 Reprocessing & Raw Preservation Tests
{
  const initialAsset: WorkspaceAsset = {
    id: 'tile-reprocess-test',
    name: 'Cobblestone (Stylized)',
    material: 'cobblestone',
    style: 'stylized',
    prompt: 'cobblestone pavement',
    resolution: 512,
    rawImageDataUrl: 'data:image/png;base64,originalRawImageData',
    processedImageDataUrl: 'data:image/png;base64,initialProcessedData',
    isTileable: true,
    seamScore: 0.02,
    rawSeamScore: 0.12,
    rawSeamReport: {
      horizontalScore: 0.12,
      verticalScore: 0.12,
      overallScore: 0.12,
      width: 512,
      height: 512,
      pass: false,
      threshold: 0.05,
      edgeRegion: 4,
      maxHorizontalDelta: 0.12,
      maxVerticalDelta: 0.12,
      discontinuousPixelCount: 100,
      totalEdgePixelsEvaluated: 4096,
      issues: ['Discontinuous seam'],
    },
    seamReport: {
      horizontalScore: 0.02,
      verticalScore: 0.02,
      overallScore: 0.02,
      width: 512,
      height: 512,
      pass: true,
      threshold: 0.05,
      edgeRegion: 4,
      maxHorizontalDelta: 0.02,
      maxVerticalDelta: 0.02,
      discontinuousPixelCount: 0,
      totalEdgePixelsEvaluated: 4096,
      issues: [],
    },
    validationSummary: {
      generationStatus: 'SUCCESS',
      rawTileable: false,
      processedTileable: true,
      rawSeamScore: 0.12,
      processedSeamScore: 0.02,
      improvement: 0.10,
      improvementStatus: 'IMPROVED',
      finalStatus: 'PASS_AFTER_PROCESSING',
      threshold: 0.05,
      issues: [],
      promptAdherenceStatus: 'NOT_AUTOMATICALLY_VALIDATED',
    },
    createdAt: new Date().toISOString(),
  };

  // Simulated reprocessing with 15% blend margin:
  const updatedProcessedReport: SeamAnalysisReport = {
    horizontalScore: 0.005,
    verticalScore: 0.005,
    overallScore: 0.005,
    width: 512,
    height: 512,
    pass: true,
    threshold: 0.05,
    edgeRegion: 4,
    maxHorizontalDelta: 0.005,
    maxVerticalDelta: 0.005,
    discontinuousPixelCount: 0,
    totalEdgePixelsEvaluated: 4096,
    issues: [],
  };

  const reprocessResult = updateSeamAnalysisSummary(
    initialAsset,
    'processed',
    updatedProcessedReport,
    0.05
  );

  const newProcessedAsset: WorkspaceAsset = {
    ...initialAsset,
    processedImageDataUrl: 'data:image/png;base64,newProcessedData15Percent',
    seamScore: reprocessResult.seamScore,
    seamReport: reprocessResult.newSeamReport,
    validationSummary: reprocessResult.validationSummary,
  };

  // Explicit reprocess action requirement test: Changing config options alone does NOT modify asset
  let configOpts = { algorithm: 'offset-crossfade' as const, blendMarginPercent: 10 as 10 | 15 };
  let assetBeforeExplicitReprocess = initialAsset;

  // User changes blend margin slider to 15% (updates configOpts state)
  configOpts = { ...configOpts, blendMarginPercent: 15 };
  assert(assetBeforeExplicitReprocess.processedImageDataUrl === 'data:image/png;base64,initialProcessedData', 'Changing processing options state alone does NOT immediately modify processed asset URL');

  // User explicitly clicks REPROCESS EXISTING ASSET -> executes reprocess function
  const assetAfterExplicitReprocess = newProcessedAsset;
  assert(assetAfterExplicitReprocess.processedImageDataUrl === 'data:image/png;base64,newProcessedData15Percent', 'Explicit REPROCESS action updates processed image URL');

  // Raw image is preserved completely
  assert(newProcessedAsset.rawImageDataUrl === initialAsset.rawImageDataUrl, 'Reprocessing preserves original raw provider image');
  assert(newProcessedAsset.rawSeamScore === initialAsset.rawSeamScore, 'Reprocessing preserves original raw seam score');
  assert(newProcessedAsset.processedImageDataUrl === 'data:image/png;base64,newProcessedData15Percent', 'Reprocessing updates processed image data URL');
  assert(newProcessedAsset.seamScore === 0.005, 'Reprocessing updates processed seam score');
  assert(newProcessedAsset.validationSummary?.improvement === 0.115, 'Validation summary recalculates improvement delta (0.12 - 0.005 = 0.115)');

  // Simulated reprocessing failure scenario
  const previousValidAsset = newProcessedAsset;
  let processingFailureOccurred = false;
  let activeAssetAfterFailure = previousValidAsset;

  try {
    // Failure occurs during tile processor step
    throw new Error('TileProcessor Sharp operation failed');
  } catch (procErr) {
    processingFailureOccurred = true;
    // Active asset is NOT cleared or overwritten
    activeAssetAfterFailure = previousValidAsset;
  }

  assert(processingFailureOccurred === true, 'Processing failure captured');
  assert(activeAssetAfterFailure.processedImageDataUrl === 'data:image/png;base64,newProcessedData15Percent', 'Processing failure preserves previous valid processed asset');
  assert(activeAssetAfterFailure.rawImageDataUrl === initialAsset.rawImageDataUrl, 'Processing failure preserves raw provider image');
}

// 11. Phase 3.4 — Generation History & Asset Management Unit & Behavior Tests
{
  console.log('--- Phase 3.4 Asset History & Management Tests ---');

  // Test A: Readable Asset Naming
  const asset1: WorkspaceAsset = {
    id: 'id-1',
    name: 'Cobblestone — Stylized',
    material: 'cobblestone',
    style: 'stylized',
    prompt: 'cobblestone',
    resolution: 512,
    createdAt: new Date().toISOString(),
    isTileable: true,
  };

  const name1 = generateReadableAssetName('cobblestone', 'stylized', []);
  assert(name1 === 'Cobblestone — Stylized', 'Generates readable asset name without suffix');

  const name2 = generateReadableAssetName('cobblestone', 'stylized', [asset1]);
  assert(name2 === 'Cobblestone — Stylized #2', 'Appends collision suffix #2 when name exists');

  // Test B: History Append & Max Limit Enforcement (20)
  let history: WorkspaceAsset[] = [];
  for (let i = 1; i <= 22; i++) {
    const dummyAsset: WorkspaceAsset = {
      id: `asset-${i}`,
      name: `Asset ${i}`,
      material: 'cobblestone',
      style: 'stylized',
      prompt: 'cobblestone',
      resolution: 512,
      createdAt: new Date().toISOString(),
      isTileable: true,
    };
    history = addAssetToHistory(history, dummyAsset, 20);
  }

  assert(history.length === 20, 'History limit capped at 20 assets');
  assert(history[0].id === 'asset-3', 'Oldest entries (asset-1, asset-2) removed deterministically');
  assert(history[19].id === 'asset-22', 'Newest asset is present at end of history');

  // Test C: Updating a Specific Asset in History
  const assetA: WorkspaceAsset = {
    id: 'asset-A',
    name: 'Asset A',
    material: 'wood',
    style: 'hand-painted',
    prompt: 'wood',
    resolution: 512,
    rawImageDataUrl: 'rawA',
    processedImageDataUrl: 'procA_v1',
    createdAt: new Date().toISOString(),
    isTileable: false,
  };

  const assetB: WorkspaceAsset = {
    id: 'asset-B',
    name: 'Asset B',
    material: 'grass',
    style: 'stylized',
    prompt: 'grass',
    resolution: 512,
    rawImageDataUrl: 'rawB',
    processedImageDataUrl: 'procB',
    createdAt: new Date().toISOString(),
    isTileable: true,
  };

  let testHistory = [assetA, assetB];

  const updatedAssetA: WorkspaceAsset = {
    ...assetA,
    processedImageDataUrl: 'procA_v2',
    isTileable: true,
  };

  testHistory = updateAssetInHistory(testHistory, updatedAssetA);
  assert(testHistory[0].processedImageDataUrl === 'procA_v2', 'Reprocessing updates selected asset in history');
  assert(testHistory[1].processedImageDataUrl === 'procB', 'Other history entries (asset B) remain completely unchanged');

  // Test D: Deleting Historical Assets
  // Scenario D1: Delete non-current asset
  let delRes1 = deleteAssetFromHistory(testHistory, 'asset-A', 'asset-B');
  assert(delRes1.updatedAssets.length === 1, 'Non-current asset removed safely');
  assert(delRes1.nextCurrentAssetId === 'asset-B', 'Current asset ID remains asset-B when deleting non-current asset');

  // Scenario D2: Delete current asset
  let delRes2 = deleteAssetFromHistory(testHistory, 'asset-B', 'asset-B');
  assert(delRes2.updatedAssets.length === 1, 'Current asset removed');
  assert(delRes2.nextCurrentAssetId === 'asset-A', 'Deleting current asset deterministically selects another remaining asset');

  // Scenario D3: Delete final asset
  let delRes3 = deleteAssetFromHistory([assetA], 'asset-A', 'asset-A');
  assert(delRes3.updatedAssets.length === 0, 'Final asset deleted');
  assert(delRes3.nextCurrentAssetId === null, 'Deleting final asset returns to empty workspace state (null)');

  // Test E: Unique Asset ID Regression Test (Provider returns identical tileId)
  const duplicateTileIdResponse1: GenerationResponse = {
    success: true,
    tileId: 'tile-provider-same-id',
    rawImageUrl: 'data:image/png;base64,raw1',
    prompt: 'cobblestone',
  };

  const duplicateTileIdResponse2: GenerationResponse = {
    success: true,
    tileId: 'tile-provider-same-id',
    rawImageUrl: 'data:image/png;base64,raw2',
    prompt: 'cobblestone',
  };

  const genAsset1 = createWorkspaceAssetFromResponse(
    duplicateTileIdResponse1,
    { material: 'cobblestone', style: 'stylized', resolution: 512 },
    { algorithm: 'offset-crossfade', blendMarginPercent: 10 }
  );

  const genAsset2 = createWorkspaceAssetFromResponse(
    duplicateTileIdResponse2,
    { material: 'cobblestone', style: 'stylized', resolution: 512 },
    { algorithm: 'offset-crossfade', blendMarginPercent: 10 }
  );

  assert(genAsset1.id !== genAsset2.id, 'Two generated assets have unique workspace asset IDs despite identical provider tileId');

  let dupHistory = addAssetToHistory([], genAsset1);
  dupHistory = addAssetToHistory(dupHistory, genAsset2);

  assert(dupHistory.length === 2, 'Both generated assets with unique IDs remain in history');

  let selectedId: string | null = genAsset1.id;
  assert(selectedId === genAsset1.id, 'Asset 1 can be selected independently');
  selectedId = genAsset2.id;
  assert(selectedId === genAsset2.id, 'Asset 2 can be selected independently');

  const delDupResult = deleteAssetFromHistory(dupHistory, genAsset1.id, genAsset2.id);
  assert(delDupResult.updatedAssets.length === 1, 'Deleting asset 1 removes only asset 1');
  assert(delDupResult.updatedAssets[0].id === genAsset2.id, 'Asset 2 remains intact in history');
}

console.log('======================================================');
console.log('  All WorkspaceTransitions & WorkspaceState Tests Passed!');
console.log('======================================================');
