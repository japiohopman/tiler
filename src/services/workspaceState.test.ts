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
  canStartGeneration,
  createWorkspaceAssetFromResponse,
  transitionExportState,
  transitionGenerationState,
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

console.log('======================================================');
console.log('  All WorkspaceTransitions & WorkspaceState Tests Passed!');
console.log('======================================================');
