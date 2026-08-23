/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { imageStorage } from './imageStorage';
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
 * Strips heavy base64 Data URLs from assets before local storage serialization.
 * Returns metadata workspace with image fields removed.
 */
export function serializeWorkspaceMetadata(
  data: PersistedWorkspaceData,
  version: number = CURRENT_SCHEMA_VERSION
): { json: string; assetsToStore: WorkspaceAsset[] } {
  const assetsToStore = data.assets || [];

  const sanitizedAssets: WorkspaceAsset[] = assetsToStore.map((asset) => {
    return {
      id: asset.id,
      name: asset.name,
      material: asset.material,
      style: asset.style,
      prompt: asset.prompt,
      resolution: asset.resolution,
      // Strip heavy data URLs for localStorage metadata json
      rawImageDataUrl: undefined,
      editedImageDataUrl: undefined,
      processedImageDataUrl: undefined,
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

  return {
    json: JSON.stringify(payload),
    assetsToStore,
  };
}

/**
 * Saves workspace state using dual-layer architecture:
 * 1. Image Data URLs are stored as blobs in IndexedDB (`imageStorage`).
 * 2. Lightweight asset metadata is serialized to localStorage.
 */
export async function saveWorkspace(data: PersistedWorkspaceData): Promise<SaveWorkspaceResult> {
  try {
    const { json, assetsToStore } = serializeWorkspaceMetadata(data);

    // Step 1: Save image blobs in IndexedDB
    for (const asset of assetsToStore) {
      if (asset.rawImageDataUrl) {
        await imageStorage.saveImage(`raw_${asset.id}`, asset.rawImageDataUrl);
      }
      if (asset.editedImageDataUrl) {
        await imageStorage.saveImage(`edited_${asset.id}`, asset.editedImageDataUrl);
      }
      if (asset.processedImageDataUrl) {
        await imageStorage.saveImage(`processed_${asset.id}`, asset.processedImageDataUrl);
      }
    }

    // Step 2: Save metadata in localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, json);
    }

    return {
      success: true,
      bytesWritten: json.length,
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
        ? 'Local storage quota exceeded. Workspace changes will remain active in memory.'
        : `Storage error: ${err?.message || 'Failed to save workspace'}`,
    };
  }
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
 * Loads metadata from localStorage and hydrates image blobs from IndexedDB.
 */
export async function loadWorkspace(): Promise<PersistedWorkspacePayload | null> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const payload = deserializeWorkspace(raw);
    if (!payload) {
      return null;
    }

    // Hydrate image blobs from IndexedDB into assets
    const hydratedAssets: WorkspaceAsset[] = await Promise.all(
      payload.workspace.assets.map(async (asset) => {
        const [rawImg, editedImg, processedImg] = await Promise.all([
          asset.rawImageDataUrl || imageStorage.loadImage(`raw_${asset.id}`),
          asset.editedImageDataUrl || imageStorage.loadImage(`edited_${asset.id}`),
          asset.processedImageDataUrl || imageStorage.loadImage(`processed_${asset.id}`),
        ]);

        return {
          ...asset,
          rawImageDataUrl: rawImg || undefined,
          editedImageDataUrl: editedImg || undefined,
          processedImageDataUrl: processedImg || undefined,
        };
      })
    );

    payload.workspace.assets = hydratedAssets;
    return payload;
  } catch (err) {
    console.error('[WorkspacePersistence] Failed to load workspace:', err);
    return null;
  }
}

/**
 * Safely removes persisted workspace metadata from localStorage and image blobs from IndexedDB.
 */
export async function clearWorkspace(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    await imageStorage.clearAllImages();
  } catch (err) {
    console.error('[WorkspacePersistence] Failed to clear workspace:', err);
  }
}
