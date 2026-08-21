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
    if (isGeneratingRef.current || generationState.status === 'generating' || generationState.status === 'processing') {
      console.warn('Generation already in progress. Duplicate request ignored.');
      return;
    }
    isGeneratingRef.current = true;

    try {
      setGenerationState({
        status: 'generating',
        currentStep: `Generating texture via ${activeProvider} provider...`,
        progress: 30,
        errorMessage: undefined,
      });

      const genResponse = await tileApiClient.generateTile({
        material: params.material,
        style: params.style,
        detail: params.detail || 'high',
        additionalPrompt: params.additionalPrompt,
        customPrompt: params.customPrompt,
        resolution: 512,
        processingOptions,
      });

      setGenerationState({
        status: 'processing',
        currentStep: 'Transforming with Sharp offset-crossfade...',
        progress: 70,
      });

      const newTile: WorkspaceAsset = {
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

      setGenerationState({
        status: 'analyzing',
        currentStep: 'Validating seam continuity...',
        progress: 90,
      });

      setSelectedSource('processed');
      setAsset(newTile);

      setGenerationState({
        status: 'completed',
        currentStep: 'Tile generated & verified!',
        progress: 100,
      });

      onNotify?.(
        `Successfully generated ${params.material} seamless tile (512×512) via ${genResponse.generationMetadata?.model || activeProvider}!`,
        'success'
      );

      setTimeout(() => {
        setGenerationState((prev) => ({ ...prev, status: 'idle', currentStep: '' }));
      }, 2500);
    } catch (err: any) {
      console.error('Generation pipeline error:', err);
      setGenerationState({
        status: 'error',
        currentStep: 'Generation failed',
        progress: 0,
        errorMessage: err.message || 'Failed to generate texture. Please check server provider configuration.',
      });
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
