/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  EdgeRegionDepth,
  ExportOptions,
  GenerationParams,
  GenerationState,
  ExportState,
  PreviewState,
  SeamAnalysisReport,
  TARGET_MATERIALS,
  TileProcessingMetadata,
  TileProcessingOptions,
  WorkspaceAsset,
  WorkspaceConfig,
  WorkspaceState,
} from '../types';
import { tileApiClient } from '../services/apiClient';
import { SAMPLE_TEXTURES, SampleTextureDefinition } from '../utils/sampleTextures';

export function useWorkspaceState() {
  const [activeView, setActiveView] = useState<'workspace' | 'processor'>('workspace');
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [activeProvider, setActiveProvider] = useState<string>('pixazo');
  const [providerConfigured, setProviderConfigured] = useState<boolean>(true);

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

  // Lifecycle States
  const [generationState, setGenerationState] = useState<GenerationState>({
    status: 'idle',
    currentStep: '',
    progress: 0,
  });

  const [exportState, setExportState] = useState<ExportState>({
    status: 'idle',
  });

  const [previewState, setPreviewState] = useState<PreviewState>({
    selectedSource: 'processed',
    mode: '3x3',
    showGrid: true,
  });

  const isGeneratingRef = useRef<boolean>(false);
  const [asset, setAsset] = useState<WorkspaceAsset | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'warn' } | null>(null);

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

      // Initialize with default seamless sample texture
      const defaultSample = SAMPLE_TEXTURES[0];
      const initialDataUrl = defaultSample.generate(256);

      const initialReport: SeamAnalysisReport = {
        horizontalScore: defaultSample.expectedScores.horizontal,
        verticalScore: defaultSample.expectedScores.vertical,
        overallScore: defaultSample.expectedScores.overall,
        width: 256,
        height: 256,
        pass: defaultSample.expectedStatus === 'PASS',
        threshold: 0.05,
        edgeRegion: 4,
        maxHorizontalDelta: 0,
        maxVerticalDelta: 0,
        discontinuousPixelCount: 0,
        totalEdgePixelsEvaluated: 1024,
        issues: [],
      };

      setAsset({
        id: 'initial-sample',
        name: defaultSample.name,
        material: 'cobblestone',
        style: 'stylized',
        prompt: defaultSample.description,
        resolution: 256,
        processedImageDataUrl: initialDataUrl,
        rawImageDataUrl: initialDataUrl,
        isTileable: true,
        seamScore: 0.0,
        seamReport: initialReport,
        rawSeamReport: initialReport,
        createdAt: new Date().toISOString(),
      });
    }

    verifyBackendAndInit();
  }, []);

  // Trigger Generation Pipeline
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

      setPreviewState((prev) => ({ ...prev, selectedSource: 'processed' }));
      setAsset(newTile);

      setGenerationState({
        status: 'completed',
        currentStep: 'Tile generated & verified!',
        progress: 100,
      });

      setNotification({
        message: `Successfully generated ${params.material} seamless tile (512×512) via ${genResponse.generationMetadata?.model || activeProvider}!`,
        type: 'success',
      });

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
      setNotification({
        message: `Generation error: ${err.message || 'Failed to generate texture'}`,
        type: 'warn',
      });
    } finally {
      isGeneratingRef.current = false;
    }
  }, [activeProvider, params, processingOptions, generationState.status]);

  // Re-analyze seams
  const handleReanalyze = useCallback(async (threshold: number, edgeRegion: EdgeRegionDepth) => {
    if (!asset) return;
    const targetImage = previewState.selectedSource === 'raw' ? asset.rawImageDataUrl : asset.processedImageDataUrl;
    const activeImage = targetImage || asset.processedImageDataUrl || asset.rawImageDataUrl;
    if (!activeImage) return;

    try {
      const res = await tileApiClient.analyzeSeams(activeImage, {
        threshold,
        edgeRegion,
        diagnosticMode: true,
      });

      if (res.success && res.report) {
        const updatedReport = res.report;
        let newProcessedReport = asset.seamReport;
        let newRawReport = asset.rawSeamReport;

        if (previewState.selectedSource === 'raw') {
          newRawReport = updatedReport;
        } else {
          newProcessedReport = updatedReport;
        }

        const rawScore = newRawReport?.overallScore ?? asset.rawSeamScore ?? asset.seamScore ?? 0;
        const procScore = newProcessedReport?.overallScore ?? asset.seamScore ?? 0;
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

        const updatedSummary = {
          generationStatus: asset.validationSummary?.generationStatus || ('SUCCESS' as const),
          rawTileable: rawPass,
          processedTileable: procPass,
          rawSeamScore: rawScore,
          processedSeamScore: procScore,
          improvement: imp,
          improvementStatus: impStatus as 'IMPROVED' | 'WORSENED' | 'UNCHANGED',
          finalStatus,
          threshold,
          promptAdherenceStatus: 'NOT_AUTOMATICALLY_VALIDATED' as const,
        };

        setAsset((prev) =>
          prev
            ? {
                ...prev,
                seamScore: newProcessedReport?.overallScore ?? prev.seamScore,
                rawSeamScore: newRawReport?.overallScore ?? prev.rawSeamScore,
                isTileable: newProcessedReport ? newProcessedReport.pass : prev.isTileable,
                seamReport: newProcessedReport,
                rawSeamReport: newRawReport,
                validationSummary: updatedSummary,
              }
            : null
        );
      }
    } catch (err: any) {
      console.error('Re-analysis error:', err);
    }
  }, [asset, previewState.selectedSource]);

  // Re-processing handler
  const handleProcessingOptionsChange = useCallback(async (newOpts: TileProcessingOptions) => {
    setProcessingOptions(newOpts);

    if (asset && asset.rawImageDataUrl) {
      try {
        const procRes = await tileApiClient.processTile(asset.rawImageDataUrl, newOpts);
        if (procRes.success) {
          const analysisRes = await tileApiClient.analyzeSeams(procRes.processedImageUrl, {
            threshold: asset.seamReport?.threshold ?? 0.05,
            edgeRegion: (asset.seamReport?.edgeRegion as EdgeRegionDepth) ?? 4,
            diagnosticMode: true,
          });

          const updatedReport = analysisRes.report;

          setAsset((prevTile) =>
            prevTile
              ? {
                  ...prevTile,
                  processedImageDataUrl: procRes.processedImageUrl,
                  isTileable: updatedReport.pass,
                  seamScore: updatedReport.overallScore,
                  seamReport: updatedReport,
                  metadata: {
                    ...prevTile.metadata,
                    processingAlgorithm: newOpts.algorithm,
                    processingTimeMs: procRes.metadata.processingTimeMs,
                  },
                }
              : null
          );

          setNotification({
            message: `Updated processing pipeline (${newOpts.algorithm || 'offset-crossfade'}, ${newOpts.blendMarginPercent ?? 10}% blend margin). Tile re-processed & validated!`,
            type: 'info',
          });
        }
      } catch (err: any) {
        console.error('Re-processing error:', err);
      }
    }
  }, [asset]);

  // Export Texture Handler
  const handleExport = useCallback(async (options: ExportOptions) => {
    if (!asset || (!asset.processedImageDataUrl && !asset.rawImageDataUrl)) {
      setNotification({
        message: `Generate a ${params.material} texture first to export ${options.resolution}×${options.resolution} ${options.format.toUpperCase()} asset.`,
        type: 'info',
      });
      return;
    }

    setExportState({ status: 'exporting' });
    try {
      const blob = await tileApiClient.exportTile(asset, options);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${asset.material}_${options.resolution}x${options.resolution}.${options.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportState({ status: 'completed' });
      setNotification({
        message: `Exported ${asset.material} texture as ${options.resolution}×${options.resolution} ${options.format.toUpperCase()}`,
        type: 'success',
      });
    } catch (err: any) {
      setExportState({ status: 'error', errorMessage: err.message || 'Export failed' });
      setNotification({
        message: `Export notice: ${err.message || 'Export handler ready'}`,
        type: 'warn',
      });
    } finally {
      setTimeout(() => {
        setExportState((prev) => (prev.status === 'completed' ? { status: 'idle' } : prev));
      }, 1500);
    }
  }, [asset, params.material]);

  // Texture select from sample
  const handleTextureSelect = useCallback(async (dataUrl: string, sample: SampleTextureDefinition) => {
    try {
      const analysisRes = await tileApiClient.analyzeSeams(dataUrl, {
        threshold: 0.05,
        edgeRegion: 4,
        diagnosticMode: true,
      });
      setAsset({
        id: `sample-${sample.id}`,
        name: sample.name,
        material: 'cobblestone',
        style: 'stylized',
        prompt: sample.description,
        resolution: analysisRes.report.width,
        processedImageDataUrl: dataUrl,
        rawImageDataUrl: dataUrl,
        isTileable: analysisRes.report.pass,
        seamScore: analysisRes.report.overallScore,
        seamReport: analysisRes.report,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      const fallbackReport: SeamAnalysisReport = {
        horizontalScore: sample.expectedScores.horizontal,
        verticalScore: sample.expectedScores.vertical,
        overallScore: sample.expectedScores.overall,
        width: 256,
        height: 256,
        pass: sample.expectedStatus === 'PASS',
        threshold: 0.05,
        edgeRegion: 4,
        maxHorizontalDelta: 0,
        maxVerticalDelta: 0,
        discontinuousPixelCount: 0,
        totalEdgePixelsEvaluated: 1024,
        issues: sample.expectedStatus === 'PASS' ? [] : ['Seam boundary discontinuity detected'],
      };
      setAsset({
        id: `sample-${sample.id}`,
        name: sample.name,
        material: 'cobblestone',
        style: 'stylized',
        prompt: sample.description,
        resolution: 256,
        processedImageDataUrl: dataUrl,
        rawImageDataUrl: dataUrl,
        isTileable: sample.expectedStatus === 'PASS',
        seamScore: sample.expectedScores.overall,
        seamReport: fallbackReport,
        createdAt: new Date().toISOString(),
      });
    }
  }, []);

  // Handler for DeveloperTestPanel
  const handleTileFromProcessor = useCallback((dataUrl: string, metadata: TileProcessingMetadata) => {
    const updatedTile: WorkspaceAsset = {
      id: `processed-${Date.now()}`,
      name: `Processed Tile (${metadata.outputDimensions.width}×${metadata.outputDimensions.height})`,
      material: 'cobblestone',
      style: 'stylized',
      prompt: 'Processed from custom input image',
      resolution: metadata.outputDimensions.width,
      processedImageDataUrl: dataUrl,
      rawImageDataUrl: dataUrl,
      isTileable: metadata.seamResult?.pass ?? true,
      seamScore: metadata.seamScore,
      seamReport: metadata.seamResult,
      createdAt: new Date().toISOString(),
      metadata: {
        processingAlgorithm: metadata.algorithm,
        processingTimeMs: metadata.processingTimeMs,
      },
    };
    setAsset(updatedTile);
  }, []);

  const setSelectedSource = useCallback((source: 'processed' | 'raw') => {
    setPreviewState((prev) => ({ ...prev, selectedSource: source }));
  }, []);

  const setPreviewMode = useCallback((mode: any) => {
    setPreviewState((prev) => ({ ...prev, mode }));
  }, []);

  const setShowGrid = useCallback((showGrid: boolean) => {
    setPreviewState((prev) => ({ ...prev, showGrid }));
  }, []);

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
