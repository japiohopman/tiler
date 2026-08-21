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

    try {
      setGenerationState(
        transitionGenerationState(
          'generating',
          `Generating texture via ${activeProvider} provider...`,
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
          'Transforming with Sharp offset-crossfade...',
          70
        )
      );

      const newTile = createWorkspaceAssetFromResponse(genResponse, params, processingOptions);

      setGenerationState(
        transitionGenerationState('analyzing', 'Validating seam continuity...', 90)
      );

      setSelectedSource('processed');
      setAsset(newTile);

      setGenerationState(
        transitionGenerationState('completed', 'Tile generated & verified!', 100)
      );

      onNotify?.(
        `Successfully generated ${params.material} seamless tile (512×512) via ${genResponse.generationMetadata?.model || activeProvider}!`,
        'success'
      );

      setTimeout(() => {
        setGenerationState(transitionGenerationState('idle', '', 0));
      }, 2500);
    } catch (err: any) {
      console.error('Generation pipeline error:', err);
      setGenerationState(
        transitionGenerationState(
          'error',
          'Generation failed',
          0,
          err.message || 'Failed to generate texture. Please check server provider configuration.'
        )
      );
      onNotify?.(
        `Generation error: ${err.message || 'Failed to generate texture'}`,
        'warn'
      );
    } finally {
      isGeneratingRef.current = false;
    }
  }, [activeProvider, params, processingOptions, generationState.status, setAsset, setSelectedSource, onNotify]);

  return {
    generationState,
    setGenerationState,
    handleGenerate,
  };
}
