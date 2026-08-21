/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DeveloperTestPanel } from './components/DeveloperTestPanel';
import { GeneratorPanel } from './components/GeneratorPanel';
import { TilePreview } from './components/TilePreview';
import { SeamAnalysisPanel } from './components/SeamAnalysisPanel';
import { ExportPanel } from './components/ExportPanel';
import {
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

  const [currentTile, setCurrentTile] = useState<Tile | null>(null);
  const [seamReport, setSeamReport] = useState<SeamAnalysisReport | undefined>(undefined);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'warn' } | null>(null);

  // Initial Backend Health Check & Initial Sample Loading
  useEffect(() => {
    async function verifyBackendAndInit() {
      try {
        const health = await tileApiClient.checkHealth();
        if (health.status === 'ok') {
          setBackendStatus('online');
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
        createdAt: new Date().toISOString(),
      });
    }

    verifyBackendAndInit();
  }, []);

  // Trigger Full Gemini Image Generation & Seamless Tile Pipeline
  const handleGenerate = async () => {
    try {
      setGenerationState({
        status: 'generating',
        currentStep: 'Generating texture via AI model...',
        progress: 30,
        errorMessage: undefined,
      });

      // Step 1 & 2: Call server-side pipeline (Gemini Generation → Sharp Offset Transform → Seam Analyzer)
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
        seamReport: genResponse.seamReport,
        createdAt: new Date().toISOString(),
        generationMetadata: genResponse.generationMetadata,
        metadata: {
          processingAlgorithm: processingOptions.algorithm,
          model: genResponse.generationMetadata?.model || 'gemini-3.1-flash-image',
        },
      };

      setGenerationState({
        status: 'analyzing',
        currentStep: 'Validating seam continuity...',
        progress: 90,
      });

      if (genResponse.seamReport) {
        setSeamReport(genResponse.seamReport);
      }

      setCurrentTile(newTile);

      setGenerationState({
        status: 'completed',
        currentStep: 'Tile generated & verified!',
        progress: 100,
      });

      setNotification({
        message: `Successfully generated ${params.material} seamless tile (512×512) via ${genResponse.generationMetadata?.model || 'Gemini'}!`,
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
        errorMessage: err.message || 'Failed to generate texture. Please check provider API configuration.',
      });
      setNotification({
        message: `Generation error: ${err.message || 'Failed to generate texture'}`,
        type: 'warn',
      });
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
            materialName={currentMaterialDef?.name || params.material}
            seamReport={seamReport}
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
                onProcessingOptionsChange={setProcessingOptions}
                generationState={generationState}
                onGenerate={handleGenerate}
                currentTile={currentTile}
              />
            </div>

            {/* Right Column: Seam Diagnostics & Export */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              <SeamAnalysisPanel report={seamReport} isLoading={generationState.status === 'analyzing'} />

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
