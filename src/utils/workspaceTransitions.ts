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

export const MAX_HISTORY_LIMIT = 20;

/**
 * Capitalize first letter of string for asset naming.
 */
function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Pure helper to generate a human-readable name for an asset.
 * e.g., "Cobblestone — Stylized" or "Cobblestone — Stylized #2"
 */
export function generateReadableAssetName(
  material: string,
  style: string,
  existingAssets: WorkspaceAsset[] = []
): string {
  const matName = capitalize(material);
  const styleName = capitalize(style);
  const baseName = `${matName} — ${styleName}`;

  const matchingCount = existingAssets.filter((a) => a.name.startsWith(baseName)).length;
  if (matchingCount === 0) {
    return baseName;
  }
  return `${baseName} #${matchingCount + 1}`;
}

/**
 * Helper to generate a unique asset ID.
 */
let assetCounter = 0;
export function generateUniqueAssetId(): string {
  assetCounter += 1;
  return `tile-${Date.now()}-${assetCounter}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Pure helper to construct WorkspaceAsset from GenerationResponse.
 */
export function createWorkspaceAssetFromResponse(
  genResponse: GenerationResponse,
  params: GenerationParams,
  processingOptions: TileProcessingOptions,
  existingAssets: WorkspaceAsset[] = []
): WorkspaceAsset {
  const readableName = generateReadableAssetName(params.material, params.style, existingAssets);

  return {
    id: generateUniqueAssetId(),
    name: readableName,
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
 * Appends a new asset to history, enforcing MAX_HISTORY_LIMIT by dropping oldest.
 */
export function addAssetToHistory(
  existingAssets: WorkspaceAsset[],
  newAsset: WorkspaceAsset,
  limit: number = MAX_HISTORY_LIMIT
): WorkspaceAsset[] {
  const updated = [...existingAssets, newAsset];
  if (updated.length > limit) {
    // Remove oldest entries from beginning of list
    return updated.slice(updated.length - limit);
  }
  return updated;
}

/**
 * Updates a specific asset in history by ID, keeping all other entries unchanged.
 */
export function updateAssetInHistory(
  existingAssets: WorkspaceAsset[],
  updatedAsset: WorkspaceAsset
): WorkspaceAsset[] {
  return existingAssets.map((asset) => (asset.id === updatedAsset.id ? updatedAsset : asset));
}

/**
 * Deletes an asset from history and determines the new current asset ID.
 */
export function deleteAssetFromHistory(
  existingAssets: WorkspaceAsset[],
  assetIdToDelete: string,
  currentAssetId: string | null
): { updatedAssets: WorkspaceAsset[]; nextCurrentAssetId: string | null } {
  const updatedAssets = existingAssets.filter((a) => a.id !== assetIdToDelete);
  let nextCurrentAssetId = currentAssetId;

  if (currentAssetId === assetIdToDelete) {
    if (updatedAssets.length > 0) {
      // Select the newest remaining asset (last item in list)
      nextCurrentAssetId = updatedAssets[updatedAssets.length - 1].id;
    } else {
      nextCurrentAssetId = null;
    }
  }

  return {
    updatedAssets,
    nextCurrentAssetId,
  };
}

/**
 * Pure transition helper to apply edits to a WorkspaceAsset.
 * Preserves rawImageDataUrl, sets editedImageDataUrl, invalidates stale processed output,
 * and marks validation as requiring explicit reprocessing.
 */
export function applyEditsToAsset(
  asset: WorkspaceAsset,
  editedDataUrl: string
): WorkspaceAsset {
  return {
    ...asset,
    editedImageDataUrl: editedDataUrl,
    processedImageDataUrl: undefined,
    seamReport: undefined,
    seamScore: undefined,
    isTileable: false,
    validationSummary: asset.validationSummary
      ? {
          ...asset.validationSummary,
          processedTileable: false,
          finalStatus: 'VALIDATION_FAILED',
          issues: ['Source image edited — explicit reprocessing required'],
        }
      : {
          generationStatus: 'SUCCESS',
          rawTileable: false,
          processedTileable: false,
          rawSeamScore: asset.rawSeamScore ?? 1.0,
          processedSeamScore: 1.0,
          improvement: 0,
          improvementStatus: 'UNCHANGED',
          finalStatus: 'VALIDATION_FAILED',
          threshold: 0.05,
          issues: ['Source image edited — explicit reprocessing required'],
          promptAdherenceStatus: 'NOT_AUTOMATICALLY_VALIDATED',
        },
  };
}

/**
 * Pure transition helper to reset committed edits on a WorkspaceAsset.
 * Removes editedImageDataUrl while preserving rawImageDataUrl.
 */
export function resetEditsOnAsset(asset: WorkspaceAsset): WorkspaceAsset {
  return {
    ...asset,
    editedImageDataUrl: undefined,
    processedImageDataUrl: undefined,
    seamReport: undefined,
    seamScore: undefined,
    isTileable: false,
    validationSummary: asset.validationSummary
      ? {
          ...asset.validationSummary,
          processedTileable: false,
          finalStatus: 'VALIDATION_FAILED',
          issues: ['Committed edits reset — explicit reprocessing required'],
        }
      : undefined,
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
