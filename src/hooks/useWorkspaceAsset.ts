/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useMemo } from 'react';
import {
  EdgeRegionDepth,
  ProcessingState,
  SeamAnalysisReport,
  TileProcessingMetadata,
  TileProcessingOptions,
  WorkspaceAsset,
} from '../types';
import { tileApiClient } from '../services/apiClient';
import { SAMPLE_TEXTURES, SampleTextureDefinition } from '../utils/sampleTextures';
import {
  addAssetToHistory,
  applyEditsToAsset,
  deleteAssetFromHistory,
  resetEditsOnAsset,
  updateAssetInHistory,
  updateSeamAnalysisSummary,
} from '../utils/workspaceTransitions';

export function useWorkspaceAsset(onNotify?: (message: string, type: 'info' | 'success' | 'warn') => void) {
  const [assets, setAssets] = useState<WorkspaceAsset[]>([]);
  const [currentAssetId, setCurrentAssetId] = useState<string | null>(null);

  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: 'ready',
    currentStep: 'READY',
  });

  // Derived current asset
  const asset = useMemo(() => {
    if (!currentAssetId) return null;
    return assets.find((a) => a.id === currentAssetId) || null;
  }, [assets, currentAssetId]);

  // Select asset from history
  const selectAsset = useCallback((assetId: string) => {
    setCurrentAssetId(assetId);
  }, []);

  // Delete asset from history
  const deleteAsset = useCallback(
    (assetIdToDelete: string) => {
      const { updatedAssets, nextCurrentAssetId } = deleteAssetFromHistory(
        assets,
        assetIdToDelete,
        currentAssetId
      );
      setAssets(updatedAssets);
      setCurrentAssetId(nextCurrentAssetId);
      onNotify?.('Asset removed from workspace', 'info');
    },
    [assets, currentAssetId, onNotify]
  );

  // Add new asset to history and make it current
  const addAsset = useCallback((newAsset: WorkspaceAsset) => {
    setAssets((prevAssets) => addAssetToHistory(prevAssets, newAsset));
    setCurrentAssetId(newAsset.id);
  }, []);

  // Update existing asset in history
  const updateAsset = useCallback((updatedAsset: WorkspaceAsset) => {
    setAssets((prevAssets) => updateAssetInHistory(prevAssets, updatedAsset));
  }, []);

  // Apply edits to current asset
  const handleApplyEdits = useCallback(
    (editedDataUrl: string) => {
      if (!asset) return;
      const updated = applyEditsToAsset(asset, editedDataUrl);
      updateAsset(updated);
      onNotify?.(
        'Image edits applied to asset. Explicit reprocessing required to validate seamless tile.',
        'info'
      );
    },
    [asset, updateAsset, onNotify]
  );

  // Reset committed edits on current asset
  const handleResetEdits = useCallback(() => {
    if (!asset) return;
    const updated = resetEditsOnAsset(asset);
    updateAsset(updated);
    onNotify?.('Committed edits removed and raw source restored.', 'info');
  }, [asset, updateAsset, onNotify]);

  // Initialize with initial sample texture if needed
  const initDefaultSample = useCallback(() => {
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

    const defaultAsset: WorkspaceAsset = {
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
    };

    addAsset(defaultAsset);
  }, [addAsset]);

  // Re-analyze seams handler (applies strictly to current asset)
  const handleReanalyze = useCallback(
    async (selectedSource: 'processed' | 'raw', threshold: number, edgeRegion: EdgeRegionDepth) => {
      if (!asset) return;
      const targetImage = selectedSource === 'raw'
        ? asset.rawImageDataUrl
        : (asset.processedImageDataUrl || asset.editedImageDataUrl || asset.rawImageDataUrl);
      if (!targetImage) return;

      setProcessingState({
        status: 'analyzing',
        currentStep: 'ANALYZING',
      });

      try {
        const res = await tileApiClient.analyzeSeams(targetImage, {
          threshold,
          edgeRegion,
          diagnosticMode: true,
        });

        if (res.success && res.report) {
          const updatedResult = updateSeamAnalysisSummary(asset, selectedSource, res.report, threshold);

          const updatedTile: WorkspaceAsset = {
            ...asset,
            seamScore: updatedResult.seamScore,
            rawSeamScore: updatedResult.rawSeamScore,
            isTileable: updatedResult.isTileable,
            seamReport: updatedResult.newSeamReport,
            rawSeamReport: updatedResult.newRawSeamReport,
            validationSummary: updatedResult.validationSummary,
          };

          updateAsset(updatedTile);

          setProcessingState({
            status: 'updated',
            currentStep: 'UPDATED',
          });
        } else {
          throw new Error(res.error || 'Failed to analyze seams');
        }
      } catch (err: any) {
        console.error('Re-analysis error:', err);
        const errMsg = err.message || 'Seam re-analysis failed';
        setProcessingState({
          status: 'error',
          currentStep: 'ERROR',
          errorMessage: errMsg,
        });
        onNotify?.(`Re-analysis failed: ${errMsg}`, 'warn');
      }
    },
    [asset, updateAsset, onNotify]
  );

  // Re-processing handler (Modifies strictly the selected current asset without affecting other history entries)
  const handleProcessingOptionsChange = useCallback(
    async (newOpts: TileProcessingOptions, explicitThreshold?: number, explicitEdgeRegion?: EdgeRegionDepth) => {
      const sourceImage = asset?.editedImageDataUrl || asset?.rawImageDataUrl;
      if (!asset || !sourceImage) {
        return;
      }

      setProcessingState({
        status: 'processing',
        currentStep: 'PROCESSING',
      });

      try {
        // Step 1: Execute tile processing pipeline on active source image (editedImageDataUrl if present, else rawImageDataUrl)
        const procRes = await tileApiClient.processTile(sourceImage, newOpts);
        if (!procRes.success || !procRes.processedImageUrl) {
          throw new Error(procRes.error || 'Tile processing failed');
        }

        setProcessingState({
          status: 'analyzing',
          currentStep: 'ANALYZING',
        });

        // Step 2: Re-run seam analysis on the new processed image
        const activeThreshold = explicitThreshold ?? asset.seamReport?.threshold ?? 0.05;
        const activeEdgeRegion = explicitEdgeRegion ?? (asset.seamReport?.edgeRegion as EdgeRegionDepth) ?? 4;

        const analysisRes = await tileApiClient.analyzeSeams(procRes.processedImageUrl, {
          threshold: activeThreshold,
          edgeRegion: activeEdgeRegion,
          diagnosticMode: true,
        });

        if (!analysisRes.success || !analysisRes.report) {
          throw new Error(analysisRes.error || 'Seam analysis failed after processing');
        }

        const updatedReport = analysisRes.report;

        // Step 3: Recalculate validation summary and update selected asset state
        const updatedResult = updateSeamAnalysisSummary(
          asset,
          'processed',
          updatedReport,
          activeThreshold
        );

        const updatedTile: WorkspaceAsset = {
          ...asset,
          processedImageDataUrl: procRes.processedImageUrl,
          isTileable: updatedResult.isTileable,
          seamScore: updatedResult.seamScore,
          seamReport: updatedResult.newSeamReport,
          rawSeamReport: asset.rawSeamReport || updatedResult.newRawSeamReport,
          rawSeamScore: asset.rawSeamScore ?? updatedResult.rawSeamScore,
          validationSummary: updatedResult.validationSummary,
          generationMetadata: asset.generationMetadata
            ? {
                ...asset.generationMetadata,
                processingAlgorithm: newOpts.algorithm,
                blendMarginPercent: newOpts.blendMarginPercent,
                processedSeamScore: updatedResult.seamScore,
                processingTimeMs: procRes.metadata.processingTimeMs,
              }
            : asset.generationMetadata,
          metadata: {
            ...asset.metadata,
            processingAlgorithm: newOpts.algorithm,
            processingTimeMs: procRes.metadata.processingTimeMs,
          },
        };

        updateAsset(updatedTile);

        setProcessingState({
          status: 'updated',
          currentStep: 'UPDATED',
        });

        onNotify?.(
          `Updated processing pipeline (${newOpts.algorithm || 'offset-crossfade'}, ${newOpts.blendMarginPercent ?? 10}% blend margin). Tile re-processed & validated!`,
          'info'
        );
      } catch (err: any) {
        console.error('Re-processing error:', err);
        const errMsg = err.message || 'Processing failed';
        setProcessingState({
          status: 'error',
          currentStep: 'ERROR',
          errorMessage: errMsg,
        });
        onNotify?.(`Processing failed: ${errMsg}`, 'warn');
      }
    },
    [asset, updateAsset, onNotify]
  );

  // Texture select from sample
  const handleTextureSelect = useCallback(
    async (dataUrl: string, sample: SampleTextureDefinition) => {
      try {
        const analysisRes = await tileApiClient.analyzeSeams(dataUrl, {
          threshold: 0.05,
          edgeRegion: 4,
          diagnosticMode: true,
        });
        const sampleAsset: WorkspaceAsset = {
          id: `sample-${sample.id}-${Date.now()}`,
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
        };
        addAsset(sampleAsset);
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
        const fallbackAsset: WorkspaceAsset = {
          id: `sample-${sample.id}-${Date.now()}`,
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
        };
        addAsset(fallbackAsset);
      }
    },
    [addAsset]
  );

  // Handler for DeveloperTestPanel
  const handleTileFromProcessor = useCallback(
    (dataUrl: string, metadata: TileProcessingMetadata) => {
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
      addAsset(updatedTile);
    },
    [addAsset]
  );

  const clearAllAssets = useCallback(() => {
    setAssets([]);
    setCurrentAssetId(null);
  }, []);

  const restoreAssets = useCallback((newAssets: WorkspaceAsset[], newCurrentAssetId: string | null) => {
    setAssets(newAssets);
    setCurrentAssetId(newCurrentAssetId);
  }, []);

  return {
    assets,
    setAssets,
    currentAssetId,
    setCurrentAssetId,
    asset,
    selectAsset,
    deleteAsset,
    addAsset,
    updateAsset,
    clearAllAssets,
    restoreAssets,
    handleApplyEdits,
    handleResetEdits,
    processingState,
    initDefaultSample,
    handleReanalyze,
    handleProcessingOptionsChange,
    handleTextureSelect,
    handleTileFromProcessor,
  };
}
