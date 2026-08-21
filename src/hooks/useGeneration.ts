/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useCallback } from 'react';
import {
  GenerationParams,
  GenerationState,
  TileProcessingOptions,
  WorkspaceAsset,
} from '../types';
import { tileApiClient } from '../services/apiClient';
import {
  canStartGeneration,
  createWorkspaceAssetFromResponse,
  transitionGenerationState,
} from '../utils/workspaceTransitions';

export function useGeneration(
  activeProvider: string,
  params: GenerationParams,
  processingOptions: TileProcessingOptions,
  hasExistingAsset: boolean,
  setAsset: (asset: WorkspaceAsset) => void,
  setSelectedSource: (source: 'processed' | 'raw') => void,
  onNotify?: (message: string, type: 'info' | 'success' | 'warn') => void
) {
  const [generationState, setGenerationState] = useState<GenerationState>({
    status: 'idle',
    currentStep: '',
    progress: 0,
  });

  const isGeneratingRef = useRef<boolean>(false);

  const handleGenerate = useCallback(async () => {
    if (!canStartGeneration(isGeneratingRef.current, generationState.status)) {
      console.warn('Generation already in progress. Duplicate request ignored.');
      return;
    }
    isGeneratingRef.current = true;
    const isRegeneration = hasExistingAsset;

    onNotify?.(
      isRegeneration ? 'Regeneration started' : 'Generation started',
      'info'
    );

    try {
      setGenerationState(
        transitionGenerationState(
          'generating',
          'GENERATING',
          30
        )
      );

      const genResponse = await tileApiClient.generateTile({
        material: params.material,
        style: params.style,
        detail: params.detail || 'high',
        additionalPrompt: params.additionalPrompt,
        customPrompt: params.customPrompt,
        resolution: 512,
        processingOptions,
      });

      setGenerationState(
        transitionGenerationState(
          'processing',
          'PROCESSING',
          70
        )
      );

      const newTile = createWorkspaceAssetFromResponse(genResponse, params, processingOptions);

      setGenerationState(
        transitionGenerationState('analyzing', 'ANALYZING', 90)
      );

      setSelectedSource('processed');
      setAsset(newTile);

      setGenerationState(
        transitionGenerationState('completed', 'Completed', 100)
      );

      onNotify?.(
        isRegeneration ? 'Regeneration completed' : 'Generation completed',
        'success'
      );

      setTimeout(() => {
        setGenerationState(transitionGenerationState('idle', '', 0));
      }, 2500);
    } catch (err: any) {
      console.error('Generation pipeline error:', err);
      const errorMessage = err.message || 'Failed to generate texture. Please check server provider configuration.';
      setGenerationState(
        transitionGenerationState(
          'error',
          'Generation failed',
          0,
          errorMessage
        )
      );
      onNotify?.(
        isRegeneration ? 'Regeneration failed' : 'Generation failed',
        'warn'
      );
    } finally {
      isGeneratingRef.current = false;
    }
  }, [activeProvider, params, processingOptions, hasExistingAsset, generationState.status, setAsset, setSelectedSource, onNotify]);

  return {
    generationState,
    setGenerationState,
    handleGenerate,
  };
}
