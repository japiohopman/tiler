/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Grid3X3,
  Maximize2,
  Minimize2,
  RotateCcw,
  Eye,
  EyeOff,
  Move,
  ZoomIn,
  ZoomOut,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Infinity as InfinityIcon,
  Square,
  Sparkles,
  Info,
  Cpu,
  Clock,
} from 'lucide-react';
import { GenerationMetadata, SeamAnalysisResult, TilePreviewMode } from '../types';
import { TileCanvasRenderer, TileRenderOptions } from '../utils/tileCanvasRenderer';
import { SAMPLE_TEXTURES, SampleTextureDefinition } from '../utils/sampleTextures';

export interface TilePreviewProps {
  imageDataUrl?: string;
  rawImageDataUrl?: string;
  materialName?: string;
  seamReport?: SeamAnalysisResult;
  generationMetadata?: GenerationMetadata;
  onTextureSelect?: (dataUrl: string, sample: SampleTextureDefinition) => void;
  className?: string;
}

export const TilePreview: React.FC<TilePreviewProps> = ({
  imageDataUrl,
  rawImageDataUrl,
  materialName = 'Texture',
  seamReport,
  generationMetadata,
  onTextureSelect,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Active texture source: 'processed' vs 'raw' (when both are available)
  const [selectedSource, setSelectedSource] = useState<'processed' | 'raw'>('processed');

  // 3 Primary Preview Modes: 'single' (1x1), '3x3', 'infinite'
  const [previewMode, setPreviewMode] = useState<TilePreviewMode>('3x3');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  // Internal sample texture if no image is passed
  const [activeSampleId, setActiveSampleId] = useState<string>('perfect-seamless');

  const activeImageDataUrl = (selectedSource === 'raw' && rawImageDataUrl) ? rawImageDataUrl : (imageDataUrl || rawImageDataUrl);

  // Load image object whenever activeImageDataUrl or activeSample changes
  useEffect(() => {
    let targetSrc = activeImageDataUrl;
    if (!targetSrc) {
      const defaultSample = SAMPLE_TEXTURES.find((s) => s.id === activeSampleId) || SAMPLE_TEXTURES[0];
      targetSrc = defaultSample.generate(256);
    }

    if (!targetSrc) {
      setLoadedImage(null);
      setImageDimensions(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setLoadedImage(img);
      setImageDimensions({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    };
    img.onerror = () => {
      setLoadedImage(null);
      setImageDimensions(null);
    };
    img.src = targetSrc;
  }, [activeImageDataUrl, activeSampleId]);

  // Pass / Fail assessment
  const isPass = seamReport ? seamReport.pass : (seamReport?.overallScore ?? 0) <= (seamReport?.threshold ?? 0.05);
  const hScore = seamReport?.horizontalScore ?? 0.0;
  const vScore = seamReport?.verticalScore ?? 0.0;
  const overallScore = seamReport?.overallScore ?? 0.0;

  // Redraw canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const options: TileRenderOptions = {
      mode: previewMode,
      showGrid,
      zoom,
      pan,
      isPass,
    };

    TileCanvasRenderer.render(
      canvas,
      loadedImage,
      options,
      loadedImage ? undefined : `Tile Preview (${materialName})`
    );
  }, [previewMode, showGrid, zoom, pan, loadedImage, isPass, materialName]);

  // Adjust canvas size to container using ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);

      redraw();
    };

    handleResize();

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
    };
  }, [redraw]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel zoom handler (anchored zoom)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((prevZoom) => {
      const nextZoom = prevZoom * zoomFactor;
      return Math.min(6.0, Math.max(0.2, Number(nextZoom.toFixed(2))));
    });
  };

  const resetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handleSampleClick = (sample: SampleTextureDefinition) => {
    setActiveSampleId(sample.id);
    const dataUrl = sample.generate(256);
    if (onTextureSelect) {
      onTextureSelect(dataUrl, sample);
    }
  };

  const durationMs = generationMetadata?.generationDurationMs ?? generationMetadata?.geminiDurationMs;

  return (
    <div className={`flex flex-col xl:flex-row gap-5 bg-slate-950 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-2xl ${className}`}>
      {/* LEFT / TOP: Canvas & Control Viewport */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900/90 rounded-xl border border-slate-800/80 overflow-hidden shadow-inner">
        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-950/90 border-b border-slate-800 text-xs">
          {/* 1. Preview Mode Switcher: 1x1, 3x3, Infinite */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <span className="text-slate-400 font-semibold px-1.5 hidden sm:inline">Mode:</span>

            {/* 1x1 (Single) */}
            <button
              id="btn-preview-mode-single"
              onClick={() => setPreviewMode('single')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                previewMode === 'single'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Display one tile at its native aspect ratio & exact pixel dimensions"
            >
              <Square className="w-3.5 h-3.5" />
              <span>1×1</span>
            </button>

            {/* 3x3 */}
            <button
              id="btn-preview-mode-3x3"
              onClick={() => setPreviewMode('3x3')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                previewMode === '3x3'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Repeat the same tile nine times in a 3×3 grid"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>3×3</span>
            </button>

            {/* Infinite */}
            <button
              id="btn-preview-mode-infinite"
              onClick={() => setPreviewMode('infinite')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                previewMode === 'infinite'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Dynamically repeat the texture infinitely across the full canvas"
            >
              <InfinityIcon className="w-3.5 h-3.5" />
              <span>Infinite</span>
            </button>
          </div>

          {/* Texture Source Toggle (Processed Seamless vs Raw AI) */}
          {rawImageDataUrl && imageDataUrl && (
            <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <span className="text-slate-400 font-semibold px-1.5 hidden md:inline">View:</span>
              <button
                id="btn-view-processed"
                onClick={() => setSelectedSource('processed')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all uppercase tracking-wide ${
                  selectedSource === 'processed'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                PROCESSED TILE
              </button>
              <button
                id="btn-view-raw"
                onClick={() => setSelectedSource('raw')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all uppercase tracking-wide ${
                  selectedSource === 'raw'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                RAW AI OUTPUT
              </button>
            </div>
          )}

          {/* 2. Grid Toggle & Seam Lines */}
          <div className="flex items-center space-x-2">
            <button
              id="btn-toggle-grid"
              onClick={() => setShowGrid(!showGrid)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                showGrid
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm font-semibold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
              }`}
              title="Toggle boundary grid lines between repeating tiles"
            >
              {showGrid ? <Eye className="w-3.5 h-3.5 text-sky-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
              <span>Grid: {showGrid ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* 3. Zoom Controls */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              id="btn-preview-zoom-out"
              onClick={() => setZoom((z) => Math.max(0.25, Number((z - 0.25).toFixed(2))))}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              id="btn-preview-zoom-reset-100"
              onClick={resetView}
              className="font-mono text-slate-200 px-2 py-0.5 rounded text-[11px] min-w-[3.5rem] text-center hover:bg-slate-800 transition-colors font-medium"
              title="Click to reset to 100% Native 1:1 Scale"
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              id="btn-preview-zoom-in"
              onClick={() => setZoom((z) => Math.min(5.0, Number((z + 0.25).toFixed(2))))}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-3.5 bg-slate-800 mx-0.5" />

            <button
              id="btn-preview-reset-view"
              onClick={resetView}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Reset Pan & Zoom (Center View)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Visual Seam Failure Alert Banner */}
        {!isPass && (
          <div
            id="seam-failure-warning-banner"
            className="bg-rose-950/80 border-b border-rose-500/40 px-4 py-2.5 flex items-center space-x-2.5 text-xs text-rose-200 animate-fadeIn"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <div className="flex-1">
              <span className="font-bold text-rose-300">SEAM FAILURE DETECTED: </span>
              <span>
                Opposing boundary edges have delta discontinuities ({overallScore.toFixed(4)} &gt; {seamReport?.threshold ?? 0.05}).
                Visual seam artifacts appear at tile boundaries.
              </span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-900/90 text-rose-300 border border-rose-600/50 uppercase">
              Status: FAIL
            </span>
          </div>
        )}

        {/* Interactive HTML5 Canvas Container */}
        <div
          ref={containerRef}
          className="relative flex-1 min-h-[420px] bg-slate-950 cursor-grab active:cursor-grabbing overflow-hidden select-none"
        >
          <canvas
            ref={canvasRef}
            id="tile-preview-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{ imageRendering: 'pixelated' }}
            className="w-full h-full block"
          />

          {/* Floating Viewport Status Pill */}
          <div className="absolute bottom-3 left-3 flex items-center space-x-2.5 bg-slate-900/95 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300 text-xs shadow-lg">
            <span className="font-semibold text-amber-400 capitalize">
              {previewMode === 'single'
                ? 'Single Tile (1×1 Native)'
                : previewMode === '3x3'
                ? '3×3 Repetition Grid (9 Tiles)'
                : 'Infinite Dynamic Surface'}
            </span>
            <span className="text-slate-600">|</span>
            <span className="font-mono text-slate-400">
              {imageDimensions ? `${imageDimensions.width}×${imageDimensions.height}px Native` : 'Exact Pixel Scale'}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              {zoom === 1 ? '1:1 Native Resolution' : `${Math.round(zoom * 100)}% Zoom`}
            </span>
          </div>

          {/* Quick pan hint */}
          <div className="absolute top-3 right-3 text-[11px] text-slate-400 bg-slate-900/85 backdrop-blur px-2.5 py-1 rounded-md border border-slate-800 pointer-events-none hidden sm:block">
            Click & drag to pan • Scroll to zoom
          </div>
        </div>
      </div>

      {/* RIGHT / SIDEBAR: Seam Analysis Information Panel */}
      <div className="w-full xl:w-80 flex flex-col gap-4">
        {/* Seam Scores Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Seam Analysis
              </h3>
            </div>
            {/* Status: PASS / FAIL Badge */}
            <div
              id="seam-status-badge"
              className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                isPass
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/50'
              }`}
            >
              {isPass ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>PASS</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>FAIL</span>
                </>
              )}
            </div>
          </div>

          {/* Explicit Seam Analysis Scores as required */}
          <div className="space-y-2.5 font-mono text-xs">
            {/* 1. Horizontal Seam */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/90 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-sans font-medium text-slate-400">Horizontal Seam</div>
                <div className="text-[10px] text-slate-500">Right vs. Left Edge</div>
              </div>
              <div className="text-right">
                <span
                  id="score-horizontal-seam"
                  className={`text-base font-bold ${
                    hScore <= (seamReport?.threshold ?? 0.05) ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {hScore.toFixed(4)}
                </span>
                <div className="text-[10px] text-slate-500">
                  {hScore === 0 ? '0.0000 (Identical)' : `${(hScore * 100).toFixed(1)}% delta`}
                </div>
              </div>
            </div>

            {/* 2. Vertical Seam */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/90 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-sans font-medium text-slate-400">Vertical Seam</div>
                <div className="text-[10px] text-slate-500">Bottom vs. Top Edge</div>
              </div>
              <div className="text-right">
                <span
                  id="score-vertical-seam"
                  className={`text-base font-bold ${
                    vScore <= (seamReport?.threshold ?? 0.05) ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {vScore.toFixed(4)}
                </span>
                <div className="text-[10px] text-slate-500">
                  {vScore === 0 ? '0.0000 (Identical)' : `${(vScore * 100).toFixed(1)}% delta`}
                </div>
              </div>
            </div>

            {/* 3. Overall */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/90 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-sans font-medium text-slate-400">Overall</div>
                <div className="text-[10px] text-slate-500">Composite Score</div>
              </div>
              <div className="text-right">
                <span
                  id="score-overall-seam"
                  className={`text-base font-bold ${
                    overallScore <= (seamReport?.threshold ?? 0.05) ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {overallScore.toFixed(4)}
                </span>
                <div className="text-[10px] text-slate-500">
                  Threshold: ≤ {seamReport?.threshold ?? 0.05}
                </div>
              </div>
            </div>

            {/* Status Summary Line */}
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-[11px] flex items-center justify-between font-sans">
              <span className="text-slate-400 font-medium">Validation Status:</span>
              <span className={`font-bold ${isPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPass ? '✓ PASS (Mathematically Seamless)' : '⚠ FAIL (Discontinuous Seams)'}
              </span>
            </div>
          </div>

          {/* Technical Guarantee Note */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-2.5 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-300 font-medium">
              <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Exact Pixel Scale Guarantee</span>
            </div>
            <p className="text-slate-500 leading-normal">
              Tile repeats at exact native dimensions without bilinear smoothing, stretching, or artificial edge blending.
            </p>
          </div>
        </div>

        {/* Generation Metadata Card (When present) */}
        {generationMetadata && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Generation Metadata
                </h4>
              </div>
              <span className="text-[10px] font-mono bg-slate-800 text-sky-300 px-1.5 py-0.5 rounded border border-slate-700">
                {generationMetadata.model}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                <span className="text-[10px] text-slate-500 font-sans block">Resolution</span>
                <span className="text-slate-200">{generationMetadata.resolution}×{generationMetadata.resolution}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                <span className="text-[10px] text-slate-500 font-sans block">AI Generation</span>
                <span className="text-slate-200">{durationMs ? `${(durationMs / 1000).toFixed(1)}s` : 'Real-time'}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800/80 col-span-2">
                <span className="text-[10px] text-slate-500 font-sans block">Pipeline Transform</span>
                <span className="text-emerald-400">{generationMetadata.processingAlgorithm || 'Sharp Offset-Crossfade'} ({generationMetadata.processingTimeMs || 12}ms)</span>
              </div>
            </div>

            {generationMetadata.builtPrompt && (
              <div className="bg-slate-950 p-2 rounded border border-slate-800 text-[10px] text-slate-400 font-mono space-y-1">
                <span className="text-slate-300 font-semibold font-sans block">Built Orthographic Prompt:</span>
                <p className="line-clamp-3 leading-relaxed text-slate-400 hover:line-clamp-none transition-all">
                  {generationMetadata.builtPrompt}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Quick Test Texture Presets */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg space-y-2.5">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Test Texture Presets
            </h4>
          </div>
          <p className="text-[11px] text-slate-400">
            Quickly demonstrate 1×1, 3×3, Infinite, and Seam PASS/FAIL states:
          </p>
          <div className="space-y-1.5">
            {SAMPLE_TEXTURES.map((sample) => (
              <button
                key={sample.id}
                id={`btn-sample-${sample.id}`}
                onClick={() => handleSampleClick(sample)}
                className={`w-full text-left p-2 rounded-lg border transition-all text-xs flex items-center justify-between ${
                  activeSampleId === sample.id && !imageDataUrl
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                    : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/80 text-slate-300'
                }`}
              >
                <div className="truncate pr-2">
                  <div className="font-medium text-[11px] truncate">{sample.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{sample.description}</div>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                    sample.expectedStatus === 'PASS'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {sample.expectedStatus}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
