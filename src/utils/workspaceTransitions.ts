/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EdgeRegionDepth,
  ExportState,
  GenerationParams,
  GenerationResponse,
  GenerationState,
  SeamAnalysisReport,
  TileProcessingOptions,
  ValidationSummary,
  WorkspaceAsset,
} from '../types';

/**
 * Pure helper to evaluate whether generation can start.
 * Blocks duplicate trigger when generation or processing is active.
 */
export function canStartGeneration(
  isGeneratingFlag: boolean,
  currentStatus: GenerationState['status']
): boolean {
  if (isGeneratingFlag) return false;
  if (currentStatus === 'generating' || currentStatus === 'processing') return false;
  return true;
}

/**
 * Pure transition function for generation lifecycle state.
 */
export function transitionGenerationState(
  status: GenerationState['status'],
  currentStep: string,
  progress: number,
  errorMessage?: string
): GenerationState {
  return {
    status,
    currentStep,
    progress,
    errorMessage,
  };
}

/**
 * Pure transition function for export lifecycle state.
 */
export function transitionExportState(
  status: ExportState['status'],
  errorMessage?: string
): ExportState {
  return {
    status,
    errorMessage,
  };
}

/**
 * Pure helper to construct WorkspaceAsset from GenerationResponse.
 */
export function createWorkspaceAssetFromResponse(
  genResponse: GenerationResponse,
  params: GenerationParams,
  processingOptions: TileProcessingOptions
): WorkspaceAsset {
  return {
    id: genResponse.tileId || `tile-${Date.now()}`,
    name: `${params.material} (${params.style})`,
    material: params.material,
    style: params.style,
    prompt: genResponse.prompt || params.customPrompt || `${params.material} ${params.style}`,
    resolution: 512,
    rawImageDataUrl: genResponse.rawImageUrl,
    processedImageDataUrl: genResponse.processedImageUrl,
    isTileable: genResponse.seamReport?.pass ?? true,
    seamScore: genResponse.seamReport?.overallScore ?? 0.0,
    rawSeamScore: genResponse.rawSeamReport?.overallScore,
    seamReport: genResponse.seamReport,
    rawSeamReport: genResponse.rawSeamReport,
    validationSummary: genResponse.validationSummary,
    createdAt: new Date().toISOString(),
    generationMetadata: genResponse.generationMetadata,
    metadata: {
      processingAlgorithm: processingOptions.algorithm,
      model: genResponse.generationMetadata?.model || 'sdxl-base-1.0',
    },
  };
}

/**
 * Pure helper to calculate updated seam reports and validation summary on re-analysis.
 */
export function updateSeamAnalysisSummary(
  currentAsset: WorkspaceAsset,
  selectedSource: 'processed' | 'raw',
  updatedReport: SeamAnalysisReport,
  threshold: number
): {
  newSeamReport: SeamAnalysisReport | undefined;
  newRawSeamReport: SeamAnalysisReport | undefined;
  validationSummary: ValidationSummary;
  isTileable: boolean;
  seamScore: number;
  rawSeamScore: number | undefined;
} {
  let newProcessedReport = currentAsset.seamReport;
  let newRawReport = currentAsset.rawSeamReport;

  if (selectedSource === 'raw') {
    newRawReport = updatedReport;
  } else {
    newProcessedReport = updatedReport;
  }

  const rawScore = newRawReport?.overallScore ?? currentAsset.rawSeamScore ?? currentAsset.seamScore ?? 0;
  const procScore = newProcessedReport?.overallScore ?? currentAsset.seamScore ?? 0;
  const rawPass = newRawReport ? newRawReport.pass : rawScore <= threshold;
  const procPass = newProcessedReport ? newProcessedReport.pass : procScore <= threshold;
  const imp = Number((rawScore - procScore).toFixed(4));
  const impStatus = imp > 0.0001 ? 'IMPROVED' : imp < -0.0001 ? 'WORSENED' : 'UNCHANGED';

  let finalStatus: 'PASS_RAW' | 'PASS_AFTER_PROCESSING' | 'VALIDATION_FAILED' = 'VALIDATION_FAILED';
  if (rawPass) {
    finalStatus = 'PASS_RAW';
  } else if (procPass) {
    finalStatus = 'PASS_AFTER_PROCESSING';
  }

  const validationSummary: ValidationSummary = {
    generationStatus: currentAsset.validationSummary?.generationStatus || 'SUCCESS',
    rawTileable: rawPass,
    processedTileable: procPass,
    rawSeamScore: rawScore,
    processedSeamScore: procScore,
    improvement: imp,
    improvementStatus: impStatus,
    finalStatus,
    threshold,
    issues: updatedReport.issues || [],
    promptAdherenceStatus: 'NOT_AUTOMATICALLY_VALIDATED',
  };

  return {
    newSeamReport: newProcessedReport,
    newRawSeamReport: newRawReport,
    validationSummary,
    isTileable: newProcessedReport ? newProcessedReport.pass : currentAsset.isTileable,
    seamScore: newProcessedReport?.overallScore ?? currentAsset.seamScore,
    rawSeamScore: newRawReport?.overallScore ?? currentAsset.rawSeamScore,
  };
}
