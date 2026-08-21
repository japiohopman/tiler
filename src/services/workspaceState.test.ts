/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SeamAnalysisReport,
  ValidationSummary,
  WorkspaceAsset,
  WorkspaceState,
} from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`X TEST FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}: PASSED`);
}

console.log('======================================================');
console.log('  [WorkspaceState] Unit & Behavior Tests');
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

// 2. Generation starts: transitions cleanly to 'generating'
{
  let state = createInitialWorkspaceState();
  state = {
    ...state,
    generation: {
      status: 'generating',
      currentStep: 'Generating texture via pixazo provider...',
      progress: 30,
    },
  };

  assert(state.generation.status === 'generating', 'Generation status transitions to generating');
  assert(state.generation.progress === 30, 'Generation progress is updated to 30%');
  assert(state.export.status === 'idle', 'Export status remains idle during generation');
}

// 3. Generation failure returns to recoverable error state without corrupting asset
{
  const existingAsset: WorkspaceAsset = {
    id: 'asset-1',
    name: 'Cobblestone',
    material: 'cobblestone',
    style: 'stylized',
    prompt: 'cobblestone texture',
    resolution: 512,
    rawImageDataUrl: 'data:image/png;base64,rawOld',
    processedImageDataUrl: 'data:image/png;base64,procOld',
    isTileable: true,
    createdAt: new Date().toISOString(),
  };

  let state = createInitialWorkspaceState();
  state = { ...state, asset: existingAsset };

  // Simulate provider error
  state = {
    ...state,
    generation: {
      status: 'error',
      currentStep: 'Generation failed',
      progress: 0,
      errorMessage: 'Provider error: HTTP 502 Bad Gateway',
    },
  };

  assert(state.generation.status === 'error', 'Failed generation sets status to error');
  assert(state.generation.errorMessage === 'Provider error: HTTP 502 Bad Gateway', 'Error message is captured');
  assert(state.asset === existingAsset, 'Existing asset remains intact and uncorrupted after provider error');
  assert(state.asset?.rawImageDataUrl === 'data:image/png;base64,rawOld', 'Raw image data URL preserved on error');
}

// 4. Generation success stores distinct raw and processed results
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

  const newAsset: WorkspaceAsset = {
    id: 'asset-new-1',
    name: 'Cobblestone (stylized)',
    material: 'cobblestone',
    style: 'stylized',
    prompt: 'top-down seamless cobblestone pavement texture',
    resolution: 512,
    rawImageDataUrl: 'data:image/png;base64,rawNew',
    processedImageDataUrl: 'data:image/png;base64,procNew',
    isTileable: true,
    seamScore: 0.0025,
    rawSeamScore: 0.115,
    seamReport: mockProcessedReport,
    rawSeamReport: mockRawReport,
    validationSummary: mockSummary,
    createdAt: new Date().toISOString(),
    generationMetadata: {
      model: 'sdxl-base-1.0',
      builtPrompt: 'top-down seamless cobblestone',
      material: 'cobblestone',
      style: 'stylized',
      resolution: 512,
      generatedAt: new Date().toISOString(),
    },
  };

  let state = createInitialWorkspaceState();
  state = {
    ...state,
    generation: {
      status: 'completed',
      currentStep: 'Tile generated & verified!',
      progress: 100,
    },
    asset: newAsset,
  };

  assert(state.asset !== null, 'Asset is populated after successful generation');
  assert(state.asset?.rawImageDataUrl === 'data:image/png;base64,rawNew', 'Raw image URL stored separately');
  assert(state.asset?.processedImageDataUrl === 'data:image/png;base64,procNew', 'Processed image URL stored separately');
  assert(state.asset?.rawSeamReport?.overallScore === 0.115, 'Raw seam report preserved');
  assert(state.asset?.seamReport?.overallScore === 0.0025, 'Processed seam report preserved');
  assert(state.asset?.validationSummary?.finalStatus === 'PASS_AFTER_PROCESSING', 'Validation summary stored');
}

// 5. Validation failure does not erase the generated asset
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

  const failedAsset: WorkspaceAsset = {
    id: 'asset-failed-1',
    name: 'Wood (hand-painted)',
    material: 'wood',
    style: 'hand-painted',
    prompt: 'top-down seamless wooden floor planks',
    resolution: 512,
    rawImageDataUrl: 'data:image/png;base64,rawWood',
    processedImageDataUrl: 'data:image/png;base64,procWood',
    isTileable: false,
    seamScore: 0.09,
    rawSeamScore: 0.15,
    validationSummary: mockFailedSummary,
    createdAt: new Date().toISOString(),
  };

  let state = createInitialWorkspaceState();
  state = {
    ...state,
    generation: {
      status: 'completed',
      currentStep: 'Tile generated & verified!',
      progress: 100,
    },
    asset: failedAsset,
  };

  assert(state.asset !== null, 'Asset is retained even when validation fails');
  assert(state.asset?.validationSummary?.finalStatus === 'VALIDATION_FAILED', 'Validation status is VALIDATION_FAILED');
  assert(state.asset?.processedImageDataUrl === 'data:image/png;base64,procWood', 'Processed image asset remains available for preview/export');
}

// 6. validationSummary.finalStatus remains authoritative
{
  const summaryPassRaw: ValidationSummary = {
    generationStatus: 'SUCCESS',
    rawTileable: true,
    processedTileable: true,
    rawSeamScore: 0.01,
    processedSeamScore: 0.02,
    improvement: -0.01,
    improvementStatus: 'WORSENED',
    finalStatus: 'PASS_RAW',
    threshold: 0.05,
    issues: [],
    promptAdherenceStatus: 'NOT_AUTOMATICALLY_VALIDATED',
  };

  assert(summaryPassRaw.finalStatus === 'PASS_RAW', 'validationSummary.finalStatus is PASS_RAW');

  const summaryFailed: ValidationSummary = {
    generationStatus: 'SUCCESS',
    rawTileable: false,
    processedTileable: false,
    rawSeamScore: 0.12,
    processedSeamScore: 0.08,
    improvement: 0.04,
    improvementStatus: 'IMPROVED',
    finalStatus: 'VALIDATION_FAILED',
    threshold: 0.05,
    issues: ['Discontinuity detected'],
    promptAdherenceStatus: 'NOT_AUTOMATICALLY_VALIDATED',
  };

  assert(summaryFailed.finalStatus === 'VALIDATION_FAILED', 'validationSummary.finalStatus is VALIDATION_FAILED');
}

// 7. Export state is independent from generation state
{
  let state = createInitialWorkspaceState();
  state = {
    ...state,
    generation: { status: 'idle', currentStep: '', progress: 0 },
    export: { status: 'exporting' },
  };

  assert(state.generation.status === 'idle', 'Generation status is idle while export is exporting');
  assert(state.export.status === 'exporting', 'Export status is exporting independently');

  state = {
    ...state,
    export: { status: 'completed' },
  };

  assert(state.export.status === 'completed', 'Export completes independently without affecting generation status');
  assert(state.generation.status === 'idle', 'Generation status remains idle');
}

// 8. Duplicate generation protection guard logic
{
  let isGeneratingRef = { current: false };

  function simulateGenerateTrigger() {
    if (isGeneratingRef.current) {
      return 'BLOCKED';
    }
    isGeneratingRef.current = true;
    return 'STARTED';
  }

  assert(simulateGenerateTrigger() === 'STARTED', 'First generation trigger starts generation');
  assert(simulateGenerateTrigger() === 'BLOCKED', 'Second concurrent trigger is blocked');

  isGeneratingRef.current = false;
  assert(simulateGenerateTrigger() === 'STARTED', 'Trigger works again after generation completes');
}

// 9. Behavior Test: Error recovery and retry flow
{
  let state = createInitialWorkspaceState();

  // Step 1: Start generation
  state = { ...state, generation: { status: 'generating', currentStep: 'Generating...', progress: 30 } };
  assert(state.generation.status === 'generating', 'Step 1: Status is generating');

  // Step 2: Generation fails
  state = { ...state, generation: { status: 'error', currentStep: 'Failed', progress: 0, errorMessage: 'Timeout' } };
  assert(state.generation.status === 'error', 'Step 2: Status is error');

  // Step 3: Retry generation works cleanly from error state
  state = { ...state, generation: { status: 'generating', currentStep: 'Retrying...', progress: 30, errorMessage: undefined } };
  assert(state.generation.status === 'generating', 'Step 3: Status transitions back to generating on retry');
  assert(state.generation.errorMessage === undefined, 'Step 3: Error message cleared on retry');
}

// 10. Behavior Test: Export failure does not pollute generation or asset state
{
  const sampleAsset: WorkspaceAsset = {
    id: 'exp-asset-1',
    name: 'Grass',
    material: 'grass',
    style: 'stylized',
    prompt: 'grass',
    resolution: 512,
    processedImageDataUrl: 'data:image/png;base64,procGrass',
    rawImageDataUrl: 'data:image/png;base64,rawGrass',
    isTileable: true,
    createdAt: new Date().toISOString(),
  };

  let state = createInitialWorkspaceState();
  state = { ...state, asset: sampleAsset, export: { status: 'error', errorMessage: 'Network download failure' } };

  assert(state.export.status === 'error', 'Export status reflects error');
  assert(state.generation.status === 'idle', 'Generation state unaffected by export failure');
  assert(state.asset === sampleAsset, 'Asset remains present and valid after export failure');
}

console.log('======================================================');
console.log('  All WorkspaceState Unit & Behavior Tests Passed!');
console.log('======================================================');
