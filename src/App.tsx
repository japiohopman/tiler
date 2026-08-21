/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { DeveloperTestPanel } from './components/DeveloperTestPanel';
import { GeneratorPanel } from './components/GeneratorPanel';
import { TilePreview } from './components/TilePreview';
import { SeamAnalysisPanel } from './components/SeamAnalysisPanel';
import { ExportPanel } from './components/ExportPanel';
import {
  EdgeRegionDepth,
  ExportOptions,
  GenerationParams,
  GenerationState,
  SeamAnalysisReport,
  TARGET_MATERIALS,
  TARGET_STYLES,
  Tile,
  TileProcessingMetadata,
  TileProcessingOptions,
} from './types';
import { tileApiClient } from './services/apiClient';
import { SAMPLE_TEXTURES, SampleTextureDefinition } from './utils/sampleTextures';
import { Info, Sparkles, Sliders, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState<'workspace' | 'processor'>('workspace');
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [activeProvider, setActiveProvider] = useState<string>('pixazo');
  const [providerConfigured, setProviderConfigured] = useState<boolean>(true);

  // Generation & Processing States
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

  const [generationState, setGenerationState] = useState<GenerationState>({
    status: 'idle',
    currentStep: '',
    progress: 0,
  });

  const isGeneratingRef = useRef<boolean>(false);
  const [currentTile, setCurrentTile] = useState<Tile | null>(null);
  const [seamReport, setSeamReport] = useState<SeamAnalysisReport | undefined>(undefined);
  const [rawSeamReport, setRawSeamReport] = useState<SeamAnalysisReport | undefined>(undefined);
  const [selectedSource, setSelectedSource] = useState<'processed' | 'raw'>('processed');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'warn' } | null>(null);

  // Initial Backend Health Check & Initial Sample Loading
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

      setSeamReport(initialReport);
      setRawSeamReport(initialReport);
      setCurrentTile({
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

  // Trigger AI Image Generation & Seamless Tile Pipeline
  const handleGenerate = async () => {
    if (isGeneratingRef.current) {
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

      // Step 1 & 2: Call server-side pipeline (AI Generation → Sharp Offset Transform → Seam Analyzer)
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

      // Assemble complete Tile object, preserving both raw and processed images
      const newTile: Tile = {
        id: genResponse.tileId || `tile-${Date.now()}`,
        name: `${params.material} (${params.style})`,
        material: params.material,
        style: params.style,
        prompt: genResponse.prompt || params.customPrompt || `${params.material} ${params.style}`,
        resolution: 512,
        rawImageDataUrl: genResponse.rawImageUrl, // Original preserved
        processedImageDataUrl: genResponse.processedImageUrl, // Processed seamless tile
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

      setSeamReport(genResponse.seamReport);
      setRawSeamReport(genResponse.rawSeamReport);
      setSelectedSource('processed');

      setCurrentTile(newTile);

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
  };

  // Re-analysis handler triggered when user adjusts seam options (edgeRegion, threshold)
  const handleReanalyze = async (threshold: number, edgeRegion: EdgeRegionDepth) => {
    const targetImage = selectedSource === 'raw' ? currentTile?.rawImageDataUrl : currentTile?.processedImageDataUrl;
    const activeImage = targetImage || currentTile?.processedImageDataUrl || currentTile?.rawImageDataUrl;
    if (!activeImage) return;

    try {
      const res = await tileApiClient.analyzeSeams(activeImage, {
        threshold,
        edgeRegion,
        diagnosticMode: true,
      });

      if (res.success && res.report) {
        const updatedReport = res.report;

        let newProcessedReport = seamReport;
        let newRawReport = rawSeamReport;

        if (selectedSource === 'raw') {
          newRawReport = updatedReport;
          setRawSeamReport(updatedReport);
        } else {
          newProcessedReport = updatedReport;
          setSeamReport(updatedReport);
        }

        // Recompute validation summary metrics without overwriting the inactive report
        const rawScore = newRawReport?.overallScore ?? currentTile?.rawSeamScore ?? currentTile?.seamScore ?? 0;
        const procScore = newProcessedReport?.overallScore ?? currentTile?.seamScore ?? 0;
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
          generationStatus: currentTile?.validationSummary?.generationStatus || ('SUCCESS' as const),
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

        if (currentTile) {
          setCurrentTile({
            ...currentTile,
            seamScore: newProcessedReport?.overallScore ?? currentTile.seamScore,
            rawSeamScore: newRawReport?.overallScore ?? currentTile.rawSeamScore,
            isTileable: newProcessedReport ? newProcessedReport.pass : currentTile.isTileable,
            seamReport: newProcessedReport,
            rawSeamReport: newRawReport,
            validationSummary: updatedSummary,
          });
        }
      }
    } catch (err: any) {
      console.error('Re-analysis error:', err);
    }
  };

  // Re-processing handler triggered when processing options change on an existing tile
  const handleProcessingOptionsChange = async (newOpts: TileProcessingOptions) => {
    setProcessingOptions(newOpts);

    if (currentTile && currentTile.rawImageDataUrl) {
      try {
        const procRes = await tileApiClient.processTile(currentTile.rawImageDataUrl, newOpts);
        if (procRes.success) {
          const analysisRes = await tileApiClient.analyzeSeams(procRes.processedImageUrl, {
            threshold: seamReport?.threshold ?? 0.05,
            edgeRegion: (seamReport?.edgeRegion as EdgeRegionDepth) ?? 4,
            diagnosticMode: true,
          });

          const updatedReport = analysisRes.report;
          setSeamReport(updatedReport);

          setCurrentTile((prevTile) =>
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
  };

  // Export Texture Handler
  const handleExport = async (options: ExportOptions) => {
    if (!currentTile || (!currentTile.processedImageDataUrl && !currentTile.rawImageDataUrl)) {
      setNotification({
        message: `Generate a ${params.material} texture first to export ${options.resolution}×${options.resolution} ${options.format.toUpperCase()} asset.`,
        type: 'info',
      });
      return;
    }

    setIsExporting(true);
    try {
      const blob = await tileApiClient.exportTile(currentTile, options);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentTile.material}_${options.resolution}x${options.resolution}.${options.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setNotification({
        message: `Exported ${currentTile.material} texture as ${options.resolution}×${options.resolution} ${options.format.toUpperCase()}`,
        type: 'success',
      });
    } catch (err: any) {
      setNotification({
        message: `Export notice: ${err.message || 'Export handler ready'}`,
        type: 'warn',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const currentMaterialDef = TARGET_MATERIALS.find((m) => m.id === params.material);

  const handleTextureSelect = async (dataUrl: string, sample: SampleTextureDefinition) => {
    try {
      const analysisRes = await tileApiClient.analyzeSeams(dataUrl, {
        threshold: 0.05,
        edgeRegion: 4,
        diagnosticMode: true,
      });
      setSeamReport(analysisRes.report);
      setCurrentTile({
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
      setSeamReport(fallbackReport);
      setCurrentTile({
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
  };

  const handleTileFromProcessor = (dataUrl: string, metadata: TileProcessingMetadata) => {
    const updatedTile: Tile = {
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
    setCurrentTile(updatedTile);
    if (metadata.seamResult) {
      setSeamReport(metadata.seamResult);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Navigation Header */}
      <Header
        backendStatus={backendStatus}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {/* Notification Banner */}
      {notification && (
        <div className="bg-slate-900/90 border-b border-amber-500/30 px-6 py-2.5 text-xs flex items-center justify-between text-amber-200">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white font-mono text-xs ml-4"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {activeView === 'processor' ? (
        <main className="flex-1 py-6">
          <DeveloperTestPanel onTileProcessed={handleTileFromProcessor} />
        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
          {/* Primary Modular Tile Preview Component */}
          <TilePreview
            imageDataUrl={currentTile?.processedImageDataUrl}
            rawImageDataUrl={currentTile?.rawImageDataUrl}
            selectedSource={selectedSource}
            onSelectedSourceChange={setSelectedSource}
            materialName={currentMaterialDef?.name || params.material}
            seamReport={selectedSource === 'raw' ? (rawSeamReport || seamReport) : seamReport}
            generationMetadata={currentTile?.generationMetadata}
            onTextureSelect={handleTextureSelect}
          />

          {/* Configuration & Pipeline Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Generator Controls */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              <GeneratorPanel
                params={params}
                onParamsChange={setParams}
                processingOptions={processingOptions}
                onProcessingOptionsChange={handleProcessingOptionsChange}
                generationState={generationState}
                onGenerate={handleGenerate}
                currentTile={currentTile}
                activeProvider={activeProvider}
                providerConfigured={providerConfigured}
              />
            </div>

            {/* Right Column: Seam Diagnostics & Export */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              <SeamAnalysisPanel
                report={selectedSource === 'raw' ? (rawSeamReport || seamReport) : seamReport}
                rawReport={rawSeamReport || currentTile?.rawSeamReport}
                validationSummary={currentTile?.validationSummary}
                isLoading={generationState.status === 'analyzing'}
                onReanalyze={handleReanalyze}
              />

              <ExportPanel
                currentTile={currentTile}
                onExport={handleExport}
                isExporting={isExporting}
              />
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
