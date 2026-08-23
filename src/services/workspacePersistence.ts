/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GenerationParams,
  PreviewState,
  TileProcessingOptions,
  WorkspaceAsset,
} from '../types';

export const CURRENT_SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'tiler_workspace_v1';

export interface PersistedWorkspaceData {
  id?: string;
  name?: string;
  assets: WorkspaceAsset[];
  currentAssetId: string | null;
  params?: GenerationParams;
  processingOptions?: TileProcessingOptions;
  preview?: PreviewState;
}

export interface PersistedWorkspacePayload {
  version: number;
  savedAt: string;
  workspace: PersistedWorkspaceData;
}

export interface SaveWorkspaceResult {
  success: boolean;
  error?: string;
  isQuotaExceeded?: boolean;
  bytesWritten?: number;
}

/**
 * Pure function to serialize workspace state into a versioned JSON payload.
 * Strictly excludes transient execution state, active network requests, and secret credentials.
 */
export function serializeWorkspace(
  data: PersistedWorkspaceData,
  version: number = CURRENT_SCHEMA_VERSION
): string {
  // Sanitize assets to ensure no temporary non-serializable fields remain
  const sanitizedAssets: WorkspaceAsset[] = (data.assets || []).map((asset) => {
    return {
      id: asset.id,
      name: asset.name,
      material: asset.material,
      style: asset.style,
      prompt: asset.prompt,
      resolution: asset.resolution,
      rawImageDataUrl: asset.rawImageDataUrl,
      editedImageDataUrl: asset.editedImageDataUrl,
      processedImageDataUrl: asset.processedImageDataUrl,
      isTileable: asset.isTileable,
      seamScore: asset.seamScore,
      rawSeamScore: asset.rawSeamScore,
      seamReport: asset.seamReport,
      rawSeamReport: asset.rawSeamReport,
      validationSummary: asset.validationSummary,
      createdAt: asset.createdAt,
      generationMetadata: asset.generationMetadata,
      metadata: asset.metadata,
    };
  });

  const payload: PersistedWorkspacePayload = {
    version,
    savedAt: new Date().toISOString(),
    workspace: {
      id: data.id || 'default-workspace',
      name: data.name || 'Default Workspace',
      assets: sanitizedAssets,
      currentAssetId: data.currentAssetId,
      params: data.params,
      processingOptions: data.processingOptions,
      preview: data.preview
        ? {
            selectedSource: data.preview.selectedSource === 'raw' ? 'raw' : 'processed',
            mode: data.preview.mode || '3x3',
            showGrid: Boolean(data.preview.showGrid),
          }
        : undefined,
    },
  };

  return JSON.stringify(payload);
}

/**
 * Pure function to deserialize and validate a JSON string into a PersistedWorkspacePayload.
 * Safely handles corrupt JSON, missing fields, invalid types, and incompatible schema versions.
 */
export function deserializeWorkspace(
  jsonString: string
): PersistedWorkspacePayload | null {
  if (!jsonString || typeof jsonString !== 'string') {
    return null;
  }

  try {
    const raw = JSON.parse(jsonString);

    if (!raw || typeof raw !== 'object') {
      return null;
    }

    // Version Check
    const version = typeof raw.version === 'number' ? raw.version : 0;
    if (version !== CURRENT_SCHEMA_VERSION) {
      // Future migration boundary can be added here
      console.warn(`[WorkspacePersistence] Incompatible schema version ${version}. Expected ${CURRENT_SCHEMA_VERSION}.`);
      return null;
    }

    const rawWorkspace = raw.workspace;
    if (!rawWorkspace || typeof rawWorkspace !== 'object') {
      return null;
    }

    // Asset Array Validation & Sanitization
    const rawAssets = Array.isArray(rawWorkspace.assets) ? rawWorkspace.assets : [];
    const validAssets: WorkspaceAsset[] = [];

    for (const item of rawAssets) {
      if (
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.material === 'string'
      ) {
        validAssets.push({
          id: item.id,
          name: item.name,
          material: item.material,
          style: item.style || 'stylized',
          prompt: item.prompt || '',
          resolution: typeof item.resolution === 'number' ? item.resolution : 512,
          rawImageDataUrl: typeof item.rawImageDataUrl === 'string' ? item.rawImageDataUrl : undefined,
          editedImageDataUrl: typeof item.editedImageDataUrl === 'string' ? item.editedImageDataUrl : undefined,
          processedImageDataUrl: typeof item.processedImageDataUrl === 'string' ? item.processedImageDataUrl : undefined,
          isTileable: Boolean(item.isTileable),
          seamScore: typeof item.seamScore === 'number' ? item.seamScore : undefined,
          rawSeamScore: typeof item.rawSeamScore === 'number' ? item.rawSeamScore : undefined,
          seamReport: item.seamReport && typeof item.seamReport === 'object' ? item.seamReport : undefined,
          rawSeamReport: item.rawSeamReport && typeof item.rawSeamReport === 'object' ? item.rawSeamReport : undefined,
          validationSummary: item.validationSummary && typeof item.validationSummary === 'object' ? item.validationSummary : undefined,
          createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
          generationMetadata: item.generationMetadata && typeof item.generationMetadata === 'object' ? item.generationMetadata : undefined,
          metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : undefined,
        });
      }
    }

    // Current Asset Selection Validation & Fallback
    let currentAssetId: string | null = null;
    if (typeof rawWorkspace.currentAssetId === 'string') {
      const matchExists = validAssets.some((a) => a.id === rawWorkspace.currentAssetId);
      if (matchExists) {
        currentAssetId = rawWorkspace.currentAssetId;
      } else if (validAssets.length > 0) {
        currentAssetId = validAssets[validAssets.length - 1].id;
      }
    } else if (validAssets.length > 0) {
      currentAssetId = validAssets[validAssets.length - 1].id;
    }

    // Params Validation
    let params: GenerationParams | undefined = undefined;
    if (rawWorkspace.params && typeof rawWorkspace.params === 'object') {
      params = {
        material: typeof rawWorkspace.params.material === 'string' ? rawWorkspace.params.material : 'cobblestone',
        style: typeof rawWorkspace.params.style === 'string' ? rawWorkspace.params.style : 'stylized',
        customPrompt: typeof rawWorkspace.params.customPrompt === 'string' ? rawWorkspace.params.customPrompt : undefined,
        resolution: typeof rawWorkspace.params.resolution === 'number' ? rawWorkspace.params.resolution : 512,
        seed: typeof rawWorkspace.params.seed === 'number' ? rawWorkspace.params.seed : undefined,
        detail: typeof rawWorkspace.params.detail === 'string' ? rawWorkspace.params.detail : undefined,
      };
    }

    // Processing Options Validation
    let processingOptions: TileProcessingOptions | undefined = undefined;
    if (rawWorkspace.processingOptions && typeof rawWorkspace.processingOptions === 'object') {
      processingOptions = {
        algorithm: rawWorkspace.processingOptions.algorithm || 'offset-crossfade',
        blendMarginPercent: typeof rawWorkspace.processingOptions.blendMarginPercent === 'number'
          ? rawWorkspace.processingOptions.blendMarginPercent
          : 10,
        targetWidth: typeof rawWorkspace.processingOptions.targetWidth === 'number' ? rawWorkspace.processingOptions.targetWidth : undefined,
        targetHeight: typeof rawWorkspace.processingOptions.targetHeight === 'number' ? rawWorkspace.processingOptions.targetHeight : undefined,
      };
    }

    // Preview State Validation
    let preview: PreviewState | undefined = undefined;
    if (rawWorkspace.preview && typeof rawWorkspace.preview === 'object') {
      preview = {
        selectedSource: rawWorkspace.preview.selectedSource === 'raw' ? 'raw' : 'processed',
        mode: rawWorkspace.preview.mode || '3x3',
        showGrid: Boolean(rawWorkspace.preview.showGrid),
      };
    }

    return {
      version,
      savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : new Date().toISOString(),
      workspace: {
        id: typeof rawWorkspace.id === 'string' ? rawWorkspace.id : 'default-workspace',
        name: typeof rawWorkspace.name === 'string' ? rawWorkspace.name : 'Default Workspace',
        assets: validAssets,
        currentAssetId,
        params,
        processingOptions,
        preview,
      },
    };
  } catch (err) {
    console.error('[WorkspacePersistence] Deserialization error:', err);
    return null;
  }
}

/**
 * Saves workspace state to local storage.
 * Gracefully handles QuotaExceededError and browser storage unavailability.
 */
export function saveWorkspace(data: PersistedWorkspaceData): SaveWorkspaceResult {
  try {
    const serialized = serializeWorkspace(data);

    if (typeof window === 'undefined' || !window.localStorage) {
      return {
        success: false,
        error: 'Browser localStorage is not available in this environment',
      };
    }

    window.localStorage.setItem(STORAGE_KEY, serialized);
    return {
      success: true,
      bytesWritten: serialized.length,
    };
  } catch (err: any) {
    const isQuota =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014;

    console.warn('[WorkspacePersistence] Failed to save workspace:', err?.message || err);

    return {
      success: false,
      isQuotaExceeded: isQuota,
      error: isQuota
        ? 'Local storage quota exceeded. Workspace changes will remain active in memory but cannot be saved locally.'
        : `Storage error: ${err?.message || 'Failed to save workspace'}`,
    };
  }
}

/**
 * Loads and deserializes persisted workspace state from local storage.
 */
export function loadWorkspace(): PersistedWorkspacePayload | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return deserializeWorkspace(raw);
  } catch (err) {
    console.error('[WorkspacePersistence] Failed to load workspace:', err);
    return null;
  }
}

/**
 * Safely removes persisted workspace data from local storage.
 */
export function clearWorkspace(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.error('[WorkspacePersistence] Failed to clear workspace:', err);
  }
}
