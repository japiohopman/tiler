/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
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
import { usePreviewState } from './usePreviewState';
import { useExport } from './useExport';
import { useWorkspaceAsset } from './useWorkspaceAsset';
import { useGeneration } from './useGeneration';

export function useWorkspaceState() {
  const [activeView, setActiveView] = useState<'workspace' | 'processor'>('workspace');
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [activeProvider, setActiveProvider] = useState<string>('pixazo');
  const [providerConfigured, setProviderConfigured] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'warn' } | null>(null);

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
  const { previewState, setSelectedSource, setPreviewMode, setShowGrid } = usePreviewState();
  const { exportState, handleExport: executeExport } = useExport(handleNotify);
  const {
    asset,
    setAsset,
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
    Boolean(asset),
    setAsset,
    setSelectedSource,
    handleNotify
  );

  // Initial Backend Health Check & Sample Asset Setup
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

    verifyBackendAndInit();
  }, []);

  const handleReanalyze = useCallback(
    async (threshold: number, edgeRegion: EdgeRegionDepth) => {
      await executeReanalyze(previewState.selectedSource, threshold, edgeRegion);
    },
    [executeReanalyze, previewState.selectedSource]
  );

  const handleProcessingOptionsChange = useCallback(
    async (newOpts: TileProcessingOptions) => {
      setProcessingOptions(newOpts);
      await executeProcessingOptionsChange(newOpts);
    },
    [executeProcessingOptionsChange]
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
    asset,
    preview: previewState,
    export: exportState,
    notification,
  };

  return {
    state,
    actions: {
      setActiveView,
      setParams,
      setProcessingOptions,
      handleProcessingOptionsChange,
      handleGenerate,
      handleReanalyze,
      handleExport,
      handleTextureSelect,
      handleTileFromProcessor,
      setSelectedSource,
      setPreviewMode,
      setShowGrid,
      setNotification,
    },
  };
}
