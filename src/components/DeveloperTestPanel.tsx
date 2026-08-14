/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Grid,
  Info,
  Sliders,
  BarChart3,
  Eye,
  Activity,
  Maximize2,
} from 'lucide-react';
import {
  BlendMarginPercent,
  EdgeRegionDepth,
  ProcessorTestSuiteResult,
  SeamAnalysisResult,
  SupportedResolution,
  TileProcessingMetadata,
} from '../types';
import { tileApiClient, ProcessApiResponse, AnalyzeApiResponse } from '../services/apiClient';

interface DeveloperTestPanelProps {
  onTileProcessed?: (dataUrl: string, metadata: TileProcessingMetadata) => void;
}

interface SeamTestSuiteUIResult {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: {
    name: string;
    passed: boolean;
    durationMs: number;
    details: string;
    result?: SeamAnalysisResult;
  }[];
  allPassed: boolean;
}

export const DeveloperTestPanel: React.FC<DeveloperTestPanelProps> = ({ onTileProcessed }) => {
  // Processor Settings
  const [selectedResolution, setSelectedResolution] = useState<SupportedResolution>(512);
  const [selectedBlendMargin, setSelectedBlendMargin] = useState<BlendMarginPercent>(10);
  const [inputImagePreview, setInputImagePreview] = useState<string | null>(null);
  const [inputImageDimensions, setInputImageDimensions] = useState<{ width: number; height: number } | null>(null);

  // Seam Analyzer Settings
  const [threshold, setThreshold] = useState<number>(0.05);
  const [edgeRegion, setEdgeRegion] = useState<EdgeRegionDepth>(4);
  const [diagnosticMode, setDiagnosticMode] = useState<boolean>(true);

  // Results State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processResult, setProcessResult] = useState<ProcessApiResponse | null>(null);
  const [seamResult, setSeamResult] = useState<SeamAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Test Suite State
  const [activeMainTab, setActiveMainTab] = useState<'processor' | 'analyzer' | 'test-suites'>('processor');
  const [isRunningProcessorTests, setIsRunningProcessorTests] = useState(false);
  const [processorSuiteResult, setProcessorSuiteResult] = useState<ProcessorTestSuiteResult | null>(null);
  const [isRunningSeamTests, setIsRunningSeamTests] = useState(false);
  const [seamSuiteResult, setSeamSuiteResult] = useState<SeamTestSuiteUIResult | null>(null);

  // Tiling preview settings
  const [tilingGrid, setTilingGrid] = useState<2 | 3>(3);
  const [activePreviewTab, setActivePreviewTab] = useState<'compare' | 'tiling' | 'offset' | 'diagnostic'>('compare');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate initial test image on mount
  useEffect(() => {
    generateSyntheticSample('gradient');
  }, []);

  /**
   * Generates standard synthetic images and specific boundary condition images
   */
  const generateSyntheticSample = (
    type: 'gradient' | 'grid' | 'cobble' | 'perfect' | 'horiz-seam' | 'vert-seam' | 'both-seams'
  ) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (type === 'gradient') {
      const grad = ctx.createLinearGradient(0, 0, 512, 512);
      grad.addColorStop(0, '#f97316');
      grad.addColorStop(0.5, '#3b82f6');
      grad.addColorStop(1, '#10b981');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(10, 10, 80, 80);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(420, 10, 80, 80);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(200, 420, 100, 80);
    } else if (type === 'grid') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 12;
      for (let i = 0; i <= 512; i += 64) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(512, i);
        ctx.stroke();
      }
    } else if (type === 'cobble') {
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = '#64748b';
      for (let y = 16; y < 512; y += 64) {
        for (let x = 16; x < 512; x += 64) {
          ctx.beginPath();
          ctx.arc(x + Math.sin(y) * 8, y, 24, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (type === 'perfect') {
      // 1. Mathematically Perfect Repeating (Periodic sinusoidal torus)
      const imgData = ctx.createImageData(512, 512);
      for (let y = 0; y < 512; y++) {
        for (let x = 0; x < 512; x++) {
          const idx = (y * 512 + x) * 4;
          const u = (x / 512) * 2 * Math.PI;
          const v = (y / 512) * 2 * Math.PI;
          imgData.data[idx] = Math.floor(127.5 * (1 + Math.cos(u)));
          imgData.data[idx + 1] = Math.floor(127.5 * (1 + Math.sin(v)));
          imgData.data[idx + 2] = Math.floor(127.5 * (1 + Math.cos(u + v)));
          imgData.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } else if (type === 'horiz-seam') {
      // 2. Horizontal Seam Only (Left black, Right white; vertical edges match)
      const imgData = ctx.createImageData(512, 512);
      for (let y = 0; y < 512; y++) {
        for (let x = 0; x < 512; x++) {
          const idx = (y * 512 + x) * 4;
          const intensity = Math.floor((x / 511) * 255);
          imgData.data[idx] = intensity;
          imgData.data[idx + 1] = intensity;
          imgData.data[idx + 2] = intensity;
          imgData.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } else if (type === 'vert-seam') {
      // 3. Vertical Seam Only (Top black, Bottom white; horizontal edges match)
      const imgData = ctx.createImageData(512, 512);
      for (let y = 0; y < 512; y++) {
        for (let x = 0; x < 512; x++) {
          const idx = (y * 512 + x) * 4;
          const intensity = Math.floor((y / 511) * 255);
          imgData.data[idx] = intensity;
          imgData.data[idx + 1] = intensity;
          imgData.data[idx + 2] = intensity;
          imgData.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } else if (type === 'both-seams') {
      // 4. Both Seams (4 mismatched quadrants)
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(256, 0, 256, 256);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(0, 256, 256, 256);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(256, 256, 256, 256);
    }

    const dataUrl = canvas.toDataURL('image/png');
    setInputImagePreview(dataUrl);
    setInputImageDimensions({ width: 512, height: 512 });
    setProcessResult(null);
    setSeamResult(null);
    setErrorMessage(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setInputImagePreview(dataUrl);

      const img = new Image();
      img.onload = () => {
        setInputImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = dataUrl;

      setProcessResult(null);
      setSeamResult(null);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Execute Tile Processor
   */
  const handleRunProcessor = async () => {
    if (!inputImagePreview) {
      setErrorMessage('Please select or generate an input image first.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await tileApiClient.processTile(inputImagePreview, {
        targetWidth: selectedResolution,
        targetHeight: selectedResolution,
        blendMarginPercent: selectedBlendMargin,
      });

      setProcessResult(result);

      // Also run Seam Analyzer on the resulting processed image
      if (result.processedImageUrl) {
        const seamReport = await tileApiClient.analyzeSeams(result.processedImageUrl, {
          threshold,
          edgeRegion,
          diagnosticMode,
        });
        setSeamResult(seamReport.report);
      }

      if (onTileProcessed && result.processedImageUrl && result.metadata) {
        onTileProcessed(result.processedImageUrl, result.metadata);
      }
    } catch (err: any) {
      console.error('Processing error:', err);
      setErrorMessage(err.message || 'Tile processing execution failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Execute Standalone Seam Analyzer on input image
   */
  const handleAnalyzeInputImage = async () => {
    const targetImage = processResult?.processedImageUrl || inputImagePreview;
    if (!targetImage) {
      setErrorMessage('No image available to analyze.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const report = await tileApiClient.analyzeSeams(targetImage, {
        threshold,
        edgeRegion,
        diagnosticMode,
      });
      setSeamResult(report.report);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorMessage(err.message || 'Seam analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Run Processor Test Suite
   */
  const handleRunProcessorTests = async () => {
    setIsRunningProcessorTests(true);
    setErrorMessage(null);
    try {
      const res = await tileApiClient.runProcessorTests();
      if (res.success && res.suite) {
        setProcessorSuiteResult(res.suite);
      }
    } catch (err: any) {
      setErrorMessage(`Processor test suite error: ${err.message}`);
    } finally {
      setIsRunningProcessorTests(false);
    }
  };

  /**
   * Run Seam Analyzer Test Suite
   */
  const handleRunSeamTests = async () => {
    setIsRunningSeamTests(true);
    setErrorMessage(null);
    try {
      const res = await tileApiClient.runSeamTests();
      if (res.success && res.suite) {
        setSeamSuiteResult(res.suite);
      }
    } catch (err: any) {
      setErrorMessage(`Seam test suite error: ${err.message}`);
    } finally {
      setIsRunningSeamTests(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Main Subsystem Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-amber-500 text-slate-950 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                Phase 1 & 2 Engine
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Local Tile Engine & Seam Analyzer
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Deterministic Sharp 50% torus offset blending & objective pixel-level boundary seam continuity measurement.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveMainTab('processor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMainTab === 'processor'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tile Processor
            </button>
            <button
              onClick={() => setActiveMainTab('analyzer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMainTab === 'analyzer'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Seam Analyzer
            </button>
            <button
              onClick={() => setActiveMainTab('test-suites')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeMainTab === 'test-suites'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Automated Tests
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mt-4 p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Tabs Body */}
        <div className="mt-6">
          {activeMainTab === 'test-suites' ? (
            /* AUTOMATED TEST SUITES VIEW */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Seam Analyzer Test Suite Card */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-bold text-white">Seam Analyzer Test Suite</h3>
                    </div>
                    <button
                      onClick={handleRunSeamTests}
                      disabled={isRunningSeamTests}
                      className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isRunningSeamTests ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Running...
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" /> Run Seam Tests
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Verifies deterministic mathematical analysis across 4 seam boundary conditions: perfect repeating, horizontal seam only, vertical seam only, and both seams.
                  </p>

                  {seamSuiteResult && (
                    <div className="space-y-3">
                      <div
                        className={`p-3 rounded-lg border flex items-center justify-between text-xs font-mono font-semibold ${
                          seamSuiteResult.allPassed
                            ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
                            : 'bg-rose-950/40 border-rose-800/40 text-rose-300'
                        }`}
                      >
                        <span>
                          {seamSuiteResult.passed}/{seamSuiteResult.total} Tests Passed ({seamSuiteResult.durationMs}ms)
                        </span>
                        <span>{seamSuiteResult.allPassed ? 'ALL PASSED' : 'FAILURES DETECTED'}</span>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {seamSuiteResult.results.map((res, i) => (
                          <div
                            key={i}
                            className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                                {res.passed ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                )}
                                {res.name}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">{res.durationMs}ms</span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono pl-5">{res.details}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Tile Processor Test Suite Card */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-sky-400" />
                      <h3 className="text-sm font-bold text-white">Tile Processor Suite</h3>
                    </div>
                    <button
                      onClick={handleRunProcessorTests}
                      disabled={isRunningProcessorTests}
                      className="px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isRunningProcessorTests ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Running...
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" /> Run Processor Tests
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Verifies 50% torus wrap, resolutions (128, 256, 512, 1024), blend margins (0%, 5%, 10%, 15%, 20%), and SHA-256 determinism.
                  </p>

                  {processorSuiteResult && (
                    <div className="space-y-3">
                      <div
                        className={`p-3 rounded-lg border flex items-center justify-between text-xs font-mono font-semibold ${
                          processorSuiteResult.allPassed
                            ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
                            : 'bg-rose-950/40 border-rose-800/40 text-rose-300'
                        }`}
                      >
                        <span>
                          {processorSuiteResult.passed}/{processorSuiteResult.total} Tests Passed ({processorSuiteResult.durationMs}ms)
                        </span>
                        <span>{processorSuiteResult.allPassed ? 'ALL PASSED' : 'FAILURES DETECTED'}</span>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {processorSuiteResult.results.map((res, i) => (
                          <div
                            key={i}
                            className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                                {res.passed ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                )}
                                {res.name}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">{res.durationMs}ms</span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono pl-5">{res.details}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* PROCESSOR & ANALYZER CONTROLS GRID */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Input Source & Parameters */}
              <div className="lg:col-span-5 space-y-5">
                {/* 1. Input Image Source */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      1. Select Test Input Image
                    </span>
                    {inputImageDimensions && (
                      <span className="text-[11px] font-mono text-slate-400">
                        {inputImageDimensions.width}×{inputImageDimensions.height}
                      </span>
                    )}
                  </div>

                  {/* Synthetic Pattern Presets */}
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1.5">
                      Deterministic Test Patterns:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      <button
                        onClick={() => generateSyntheticSample('perfect')}
                        className="px-2 py-1.5 text-left rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-emerald-300 font-medium transition-colors"
                      >
                        ✓ Perfect Repeating
                      </button>
                      <button
                        onClick={() => generateSyntheticSample('horiz-seam')}
                        className="px-2 py-1.5 text-left rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-amber-300 font-medium transition-colors"
                      >
                        ↔ Horiz Seam Only
                      </button>
                      <button
                        onClick={() => generateSyntheticSample('vert-seam')}
                        className="px-2 py-1.5 text-left rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-amber-300 font-medium transition-colors"
                      >
                        ↕ Vert Seam Only
                      </button>
                      <button
                        onClick={() => generateSyntheticSample('both-seams')}
                        className="px-2 py-1.5 text-left rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-rose-300 font-medium transition-colors"
                      >
                        ✕ Both Seams
                      </button>
                      <button
                        onClick={() => generateSyntheticSample('gradient')}
                        className="px-2 py-1.5 text-left rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 font-medium transition-colors"
                      >
                        • Color Gradient
                      </button>
                      <button
                        onClick={() => generateSyntheticSample('cobble')}
                        className="px-2 py-1.5 text-left rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 font-medium transition-colors"
                      >
                        • Cobblestone
                      </button>
                    </div>
                  </div>

                  {/* Upload Custom Image */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-400" />
                      Upload Custom PNG / JPG
                    </button>
                  </div>
                </div>

                {/* 2. Subsystem Parameters */}
                {activeMainTab === 'processor' ? (
                  /* PROCESSOR PARAMETERS */
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      2. Processing Configuration
                    </span>

                    {/* Resolution */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-slate-400">Target Resolution:</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {([128, 256, 512, 1024] as SupportedResolution[]).map((res) => (
                          <button
                            key={res}
                            onClick={() => setSelectedResolution(res)}
                            className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                              selectedResolution === res
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            {res}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Blend Margin Width */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] text-slate-400">Seam Blend Margin Width:</label>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {selectedBlendMargin}% ({Math.round(selectedResolution * (selectedBlendMargin / 100))}px)
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {([0, 5, 10, 15, 20] as BlendMarginPercent[]).map((pct) => (
                          <button
                            key={pct}
                            onClick={() => setSelectedBlendMargin(pct)}
                            className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                              selectedBlendMargin === pct
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleRunProcessor}
                      disabled={isProcessing || !inputImagePreview}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Processing via Sharp...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" /> Run Seamless Processor
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  /* ANALYZER PARAMETERS */
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      2. Seam Analyzer Configuration
                    </span>

                    {/* Edge Region Depth */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] text-slate-400">Edge Region Sample Depth:</label>
                        <span className="text-xs font-mono font-bold text-amber-400">{edgeRegion} pixels</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {([1, 2, 4, 8] as EdgeRegionDepth[]).map((d) => (
                          <button
                            key={d}
                            onClick={() => setEdgeRegion(d)}
                            className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                              edgeRegion === d
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            {d}px
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tolerance Threshold */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] text-slate-400">Tolerance Threshold (Pass/Fail):</label>
                        <span className="text-xs font-mono font-bold text-amber-400">{threshold} ({(threshold * 100).toFixed(0)}%)</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[0.01, 0.03, 0.05, 0.10].map((t) => (
                          <button
                            key={t}
                            onClick={() => setThreshold(t)}
                            className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                              threshold === t
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleAnalyzeInputImage}
                      disabled={isAnalyzing || (!inputImagePreview && !processResult?.processedImageUrl)}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Analyzing Pixel Boundaries...
                        </>
                      ) : (
                        <>
                          <BarChart3 className="w-4 h-4" /> Calculate Objective Seam Score
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Visual Stage & Metrics */}
              <div className="lg:col-span-7 space-y-4">
                {/* Visual Preview Stage */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActivePreviewTab('compare')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                          activePreviewTab === 'compare'
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        Side-by-Side
                      </button>
                      <button
                        onClick={() => setActivePreviewTab('offset')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                          activePreviewTab === 'offset'
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        50% Torus Offset
                      </button>
                      <button
                        onClick={() => setActivePreviewTab('tiling')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                          activePreviewTab === 'tiling'
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        Multi-Tile Grid
                      </button>
                      {seamResult?.diagnosticMapDataUrl && (
                        <button
                          onClick={() => setActivePreviewTab('diagnostic')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                            activePreviewTab === 'diagnostic'
                              ? 'bg-slate-800 text-amber-300'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          <Eye className="w-3 h-3" /> Diagnostic Heatmap
                        </button>
                      )}
                    </div>

                    {activePreviewTab === 'tiling' && (
                      <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
                        <button
                          onClick={() => setTilingGrid(2)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                            tilingGrid === 2 ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                          }`}
                        >
                          2×2
                        </button>
                        <button
                          onClick={() => setTilingGrid(3)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                            tilingGrid === 3 ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                          }`}
                        >
                          3×3
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Stage Renderers */}
                  <div className="min-h-[300px] flex items-center justify-center">
                    {activePreviewTab === 'compare' && (
                      <div className="grid grid-cols-2 gap-3 w-full">
                        <div className="space-y-1.5 text-center">
                          <span className="text-[11px] text-slate-400">Input Source</span>
                          <div className="aspect-square bg-slate-900 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
                            {inputImagePreview ? (
                              <img src={inputImagePreview} alt="Input" className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-xs text-slate-600">No image</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5 text-center">
                          <span className="text-[11px] text-amber-400 font-medium">Processed Output</span>
                          <div className="aspect-square bg-slate-900 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
                            {processResult?.processedImageUrl ? (
                              <img
                                src={processResult.processedImageUrl}
                                alt="Processed"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-xs text-slate-600">Run processor to view</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {activePreviewTab === 'offset' && (
                      <div className="w-full max-w-sm aspect-square bg-slate-900 rounded-lg border border-slate-800 relative overflow-hidden flex items-center justify-center">
                        {processResult?.offsetPreviewUrl ? (
                          <>
                            <img
                              src={processResult.offsetPreviewUrl}
                              alt="50% Torus Offset"
                              className="w-full h-full object-contain"
                            />
                            {/* Center Cross Hair */}
                            <div className="absolute inset-0 pointer-events-none">
                              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-rose-500/70 -translate-x-1/2 border-r border-dashed border-rose-300/40" />
                              <div className="absolute top-1/2 left-0 right-0 h-px bg-rose-500/70 -translate-y-1/2 border-b border-dashed border-rose-300/40" />
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-slate-600">Run processor to inspect 50% coordinate wrap</span>
                        )}
                      </div>
                    )}

                    {activePreviewTab === 'tiling' && (
                      <div className="w-full max-w-sm aspect-square bg-slate-900 rounded-lg border border-slate-800 overflow-hidden relative">
                        {processResult?.processedImageUrl || inputImagePreview ? (
                          <div
                            className="w-full h-full"
                            style={{
                              backgroundImage: `url(${processResult?.processedImageUrl || inputImagePreview})`,
                              backgroundSize: `${100 / tilingGrid}% ${100 / tilingGrid}%`,
                              backgroundRepeat: 'repeat',
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">
                            No texture loaded
                          </div>
                        )}
                      </div>
                    )}

                    {activePreviewTab === 'diagnostic' && seamResult?.diagnosticMapDataUrl && (
                      <div className="w-full max-w-sm aspect-square bg-slate-900 rounded-lg border border-slate-800 overflow-hidden flex flex-col items-center justify-center p-2 space-y-2">
                        <img
                          src={seamResult.diagnosticMapDataUrl}
                          alt="Diagnostic Heatmap"
                          className="w-full h-full object-contain rounded"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Seam Analyzer Metrics Scorecard */}
                {seamResult && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          Seam Analyzer Evaluation Result
                        </h4>
                      </div>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                          seamResult.pass
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                            : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        {seamResult.pass ? 'PASS (Seamless)' : 'FAIL (Discontinuous)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {/* Horizontal Score */}
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-500 block">1. Horizontal Seam</span>
                        <span className="text-[10px] text-slate-400 block mb-1">Right vs. Left</span>
                        <span
                          className={`text-base font-mono font-bold ${
                            seamResult.horizontalScore <= seamResult.threshold
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {seamResult.horizontalScore.toFixed(4)}
                        </span>
                      </div>

                      {/* Vertical Score */}
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-500 block">2. Vertical Seam</span>
                        <span className="text-[10px] text-slate-400 block mb-1">Bottom vs. Top</span>
                        <span
                          className={`text-base font-mono font-bold ${
                            seamResult.verticalScore <= seamResult.threshold
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {seamResult.verticalScore.toFixed(4)}
                        </span>
                      </div>

                      {/* Overall Score */}
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-500 block">3. Overall Score</span>
                        <span className="text-[10px] text-slate-400 block mb-1">Composite</span>
                        <span
                          className={`text-base font-mono font-bold ${
                            seamResult.overallScore <= seamResult.threshold
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {seamResult.overallScore.toFixed(4)}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 bg-slate-900 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between">
                      <span>
                        Band: <strong className="text-white">{seamResult.edgeRegion}px</strong> • Threshold:{' '}
                        <strong className="text-white">{seamResult.threshold}</strong>
                      </span>
                      <span>
                        Evaluated <strong className="text-white">{seamResult.totalEdgePixelsEvaluated}</strong> border
                        pixels
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
