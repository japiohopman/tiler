/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  EdgeRegionDepth,
  ExportOptions,
  GenerationParams,
  TARGET_MATERIALS,
  TileProcessingOptions,
  WorkspaceConfig,
  WorkspaceState,
} from '../types';
import { tileApiClient } from '../services/apiClient';
import {
  clearWorkspace,
  loadWorkspace,
  saveWorkspace,
} from '../services/workspacePersistence';
import { usePreviewState } from './usePreviewState';
import { useExport } from './useExport';
import { useWorkspaceAsset } from './useWorkspaceAsset';
import { useGeneration } from './useGeneration';

export function useWorkspaceState() {
  const isLoadedRef = useRef(false);
  const [activeView, setActiveView] = useState<'workspace' | 'editor' | 'processor'>('workspace');
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [activeProvider, setActiveProvider] = useState<string>('pixazo');
  const [providerConfigured, setProviderConfigured] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'warn' } | null>(null);
  const [isPersistent, setIsPersistent] = useState<boolean>(true);

  // Generation & Processing Parameters
  const [params, setParams] = useState<GenerationParams>({
    material: 'cobblestone',
    style: 'stylized',
    customPrompt: TARGET_MATERIALS[0].defaultPrompt,
    resolution: 512,
  });

  const [processingOptions, setProcessingOptions] = useState<TileProcessingOptions>({
    algorithm: 'offset-crossfade',
    blendMarginPercent: 10,
  });

  // Notification Callback for Sub-hooks
  const handleNotify = useCallback((message: string, type: 'info' | 'success' | 'warn') => {
    setNotification({ message, type });
  }, []);

  // Sub-hooks
  const { previewState, setPreviewState, setSelectedSource, setPreviewMode, setShowGrid } = usePreviewState();
  const { exportState, handleExport: executeExport } = useExport(handleNotify);
  const {
    assets,
    currentAssetId,
    asset,
    selectAsset,
    deleteAsset,
    addAsset,
    clearAllAssets,
    restoreAssets,
    handleApplyEdits,
    handleResetEdits,
    processingState,
    initDefaultSample,
    handleReanalyze: executeReanalyze,
    handleProcessingOptionsChange: executeProcessingOptionsChange,
    handleTextureSelect,
    handleTileFromProcessor,
  } = useWorkspaceAsset(handleNotify);

  const { generationState, handleGenerate } = useGeneration(
    activeProvider,
    params,
    processingOptions,
    assets,
    Boolean(asset),
    addAsset,
    setSelectedSource,
    handleNotify
  );

  // Initial Local Workspace Persistence Restore & Backend Health Check
  useEffect(() => {
    async function verifyBackendAndInit() {
      try {
        const health = await tileApiClient.checkHealth();
        if (health.status === 'ok') {
          setBackendStatus('online');
          setActiveProvider(health.activeProvider || 'pixazo');
          setProviderConfigured(health.providerConfigured ?? true);
        } else {
          setBackendStatus('offline');
        }
      } catch (err) {
        setBackendStatus('offline');
      }
    }

    async function initWorkspace() {
      // Attempt to restore local workspace asynchronously (loads image blobs from IndexedDB)
      const persisted = await loadWorkspace();
      if (persisted && persisted.workspace) {
        const { assets: restoredAssets, currentAssetId: restoredId, params: restoredParams, processingOptions: restoredOpts, preview: restoredPreview } = persisted.workspace;

        if (restoredAssets && restoredAssets.length > 0) {
          restoreAssets(restoredAssets, restoredId);
        }
        if (restoredParams) {
          setParams(restoredParams);
        }
        if (restoredOpts) {
          setProcessingOptions(restoredOpts);
        }
        if (restoredPreview) {
          setPreviewState(restoredPreview);
        }

        if (restoredAssets && restoredAssets.length > 0) {
          handleNotify(`Workspace restored from local storage (${restoredAssets.length} asset${restoredAssets.length > 1 ? 's' : ''})`, 'info');
        }
      }

      isLoadedRef.current = true;
      verifyBackendAndInit();
    }

    initWorkspace();
  }, [restoreAssets, setPreviewState, handleNotify]);

  // Debounced Auto-Save on Workspace State Transitions
  useEffect(() => {
    if (!isLoadedRef.current) return;

    const timeoutId = setTimeout(async () => {
      const result = await saveWorkspace({
        assets,
        currentAssetId,
        params,
        processingOptions,
        preview: previewState,
      });

      if (!result.success && result.isQuotaExceeded) {
        setIsPersistent(false);
        handleNotify(
          'Local storage quota exceeded. Workspace session remains active, but changes cannot be saved locally.',
          'warn'
        );
      } else if (result.success && !result.isPersistent && result.error) {
        setIsPersistent(false);
        handleNotify(result.error, 'warn');
      } else if (result.success && result.isPersistent) {
        setIsPersistent(true);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [assets, currentAssetId, params, processingOptions, previewState, handleNotify]);

  // Intentional Workspace Clear Action
  const handleClearWorkspace = useCallback(async () => {
    await clearWorkspace();
    clearAllAssets();
    setParams({
      material: 'cobblestone',
      style: 'stylized',
      customPrompt: TARGET_MATERIALS[0].defaultPrompt,
      resolution: 512,
    });
    setProcessingOptions({
      algorithm: 'offset-crossfade',
      blendMarginPercent: 10,
    });
    handleNotify('Local workspace cleared.', 'info');
  }, [clearAllAssets, handleNotify]);

  const handleReanalyze = useCallback(
    async (threshold: number, edgeRegion: EdgeRegionDepth) => {
      await executeReanalyze(previewState.selectedSource, threshold, edgeRegion);
    },
    [executeReanalyze, previewState.selectedSource]
  );

  const handleReprocess = useCallback(
    async (overrideOpts?: TileProcessingOptions) => {
      const activeOpts = overrideOpts || processingOptions;
      await executeProcessingOptionsChange(activeOpts);
    },
    [executeProcessingOptionsChange, processingOptions]
  );

  const handleExport = useCallback(
    async (options: ExportOptions) => {
      await executeExport(asset, options, params.material);
    },
    [asset, executeExport, params.material]
  );

  const config: WorkspaceConfig = {
    params,
    processingOptions,
    activeProvider,
    providerConfigured,
  };

  const state: WorkspaceState = {
    activeView,
    backendStatus,
    config,
    generation: generationState,
    processing: processingState,
    assets,
    currentAssetId,
    asset,
    preview: previewState,
    export: exportState,
    notification,
    isPersistent,
  };

  return {
    state,
    actions: {
      setActiveView,
      setParams,
      setProcessingOptions,
      handleReprocess,
      handleGenerate,
      handleReanalyze,
      handleExport,
      handleTextureSelect,
      handleTileFromProcessor,
      selectAsset,
      deleteAsset,
      handleClearWorkspace,
      handleApplyEdits,
      handleResetEdits,
      setSelectedSource,
      setPreviewMode,
      setShowGrid,
      setNotification,
    },
  };
}
