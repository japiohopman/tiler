/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
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
import { updateSeamAnalysisSummary } from '../utils/workspaceTransitions';

export function useWorkspaceAsset(onNotify?: (message: string, type: 'info' | 'success' | 'warn') => void) {
  const [asset, setAsset] = useState<WorkspaceAsset | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: 'ready',
    currentStep: 'READY',
  });

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
  }, []);

  // Re-analyze seams handler
  const handleReanalyze = useCallback(
    async (selectedSource: 'processed' | 'raw', threshold: number, edgeRegion: EdgeRegionDepth) => {
      if (!asset) return;
      const targetImage = selectedSource === 'raw' ? asset.rawImageDataUrl : asset.processedImageDataUrl;
      const activeImage = targetImage || asset.processedImageDataUrl || asset.rawImageDataUrl;
      if (!activeImage) return;

      setProcessingState({
        status: 'analyzing',
        currentStep: 'ANALYZING',
      });

      try {
        const res = await tileApiClient.analyzeSeams(activeImage, {
          threshold,
          edgeRegion,
          diagnosticMode: true,
        });

        if (res.success && res.report) {
          const updatedResult = updateSeamAnalysisSummary(asset, selectedSource, res.report, threshold);

          setAsset((prev) =>
            prev
              ? {
                  ...prev,
                  seamScore: updatedResult.seamScore,
                  rawSeamScore: updatedResult.rawSeamScore,
                  isTileable: updatedResult.isTileable,
                  seamReport: updatedResult.newSeamReport,
                  rawSeamReport: updatedResult.newRawSeamReport,
                  validationSummary: updatedResult.validationSummary,
                }
              : null
          );

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
    [asset, onNotify]
  );

  // Re-processing handler (Modifies existing source asset without triggering AI generation)
  const handleProcessingOptionsChange = useCallback(
    async (newOpts: TileProcessingOptions, explicitThreshold?: number, explicitEdgeRegion?: EdgeRegionDepth) => {
      if (!asset || !asset.rawImageDataUrl) {
        return;
      }

      setProcessingState({
        status: 'processing',
        currentStep: 'PROCESSING',
      });

      try {
        // Step 1: Execute tile processing pipeline on the raw image
        const procRes = await tileApiClient.processTile(asset.rawImageDataUrl, newOpts);
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

        // Step 3: Recalculate validation summary and update asset state
        const updatedResult = updateSeamAnalysisSummary(
          asset,
          'processed',
          updatedReport,
          activeThreshold
        );

        setAsset((prevTile) =>
          prevTile
            ? {
                ...prevTile,
                processedImageDataUrl: procRes.processedImageUrl,
                isTileable: updatedResult.isTileable,
                seamScore: updatedResult.seamScore,
                seamReport: updatedResult.newSeamReport,
                rawSeamReport: prevTile.rawSeamReport || updatedResult.newRawSeamReport,
                rawSeamScore: prevTile.rawSeamScore ?? updatedResult.rawSeamScore,
                validationSummary: updatedResult.validationSummary,
                generationMetadata: prevTile.generationMetadata
                  ? {
                      ...prevTile.generationMetadata,
                      processingAlgorithm: newOpts.algorithm,
                      blendMarginPercent: newOpts.blendMarginPercent,
                      processedSeamScore: updatedResult.seamScore,
                      processingTimeMs: procRes.metadata.processingTimeMs,
                    }
                  : prevTile.generationMetadata,
                metadata: {
                  ...prevTile.metadata,
                  processingAlgorithm: newOpts.algorithm,
                  processingTimeMs: procRes.metadata.processingTimeMs,
                },
              }
            : null
        );

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
    [asset, onNotify]
  );

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

  return {
    asset,
    setAsset,
    processingState,
    initDefaultSample,
    handleReanalyze,
    handleProcessingOptionsChange,
    handleTextureSelect,
    handleTileFromProcessor,
  };
}
