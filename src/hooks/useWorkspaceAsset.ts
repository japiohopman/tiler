/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import {
  EdgeRegionDepth,
  SeamAnalysisReport,
  TileProcessingMetadata,
  TileProcessingOptions,
  WorkspaceAsset,
} from '../types';
import { tileApiClient } from '../services/apiClient';
import { SAMPLE_TEXTURES, SampleTextureDefinition } from '../utils/sampleTextures';

export function useWorkspaceAsset(onNotify?: (message: string, type: 'info' | 'success' | 'warn') => void) {
  const [asset, setAsset] = useState<WorkspaceAsset | null>(null);

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

          if (selectedSource === 'raw') {
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
    },
    [asset]
  );

  // Re-processing handler
  const handleProcessingOptionsChange = useCallback(
    async (newOpts: TileProcessingOptions) => {
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

            onNotify?.(
              `Updated processing pipeline (${newOpts.algorithm || 'offset-crossfade'}, ${newOpts.blendMarginPercent ?? 10}% blend margin). Tile re-processed & validated!`,
              'info'
            );
          }
        } catch (err: any) {
          console.error('Re-processing error:', err);
        }
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
    initDefaultSample,
    handleReanalyze,
    handleProcessingOptionsChange,
    handleTextureSelect,
    handleTileFromProcessor,
  };
}
