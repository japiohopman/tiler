/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Sliders,
  Crop,
  Sun,
  Contrast,
  Palette,
  Grid3X3,
  Square,
  Check,
  X,
  RotateCcw as ResetIcon,
  AlertCircle,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { WorkspaceAsset } from '../../types';
import { useImageEditor } from '../../hooks/useImageEditor';
import { renderImageToCanvas } from '../../utils/imageEditorCanvas';

export interface ImageEditorProps {
  asset: WorkspaceAsset | null;
  onApplyEdits: (editedDataUrl: string) => void;
  onCancel: () => void;
  onResetEdits?: () => void;
  className?: string;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({
  asset,
  onApplyEdits,
  onCancel,
  onResetEdits,
  className = '',
}) => {
  const {
    editorState,
    activeTab,
    setActiveTab,
    comparisonMode,
    setComparisonMode,
    editorTileMode,
    setEditorTileMode,
    isDirty,
    errorMessage,
    setErrorMessage,
    rotateCW,
    rotateCCW,
    toggleFlipH,
    toggleFlipV,
    resetTransform,
    setCropMode,
    updateCrop,
    resetCrop,
    setColorValue,
    resetColor,
    resetAll,
    handleResetCommittedEdits,
    handleApply,
    handleCancel,
  } = useImageEditor({ asset, onApplyEdits, onCancel, onResetEdits });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [loadedRawImage, setLoadedRawImage] = useState<HTMLImageElement | null>(null);

  // Keyboard Escape key listener to close/cancel editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCancel]);

  // Active editable source: prefers existing asset editedImageDataUrl if present, otherwise rawImageDataUrl
  const sourceUrl = asset?.editedImageDataUrl || asset?.rawImageDataUrl;
  const rawUrl = asset?.rawImageDataUrl;

  // Load active editable image
  useEffect(() => {
    if (!sourceUrl) {
      setLoadedImage(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setLoadedImage(img);
    img.onerror = () => setLoadedImage(null);
    img.src = sourceUrl;
  }, [sourceUrl]);

  // Load raw original image for comparison
  useEffect(() => {
    if (!rawUrl) {
      setLoadedRawImage(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setLoadedRawImage(img);
    img.onerror = () => setLoadedRawImage(null);
    img.src = rawUrl;
  }, [rawUrl]);

  // Redraw preview canvas whenever state or active image changes
  const redrawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle empty state
    if (!loadedImage) {
      canvas.width = 512;
      canvas.height = 512;
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No texture asset available to edit', 256, 256);
      return;
    }

    // Determine target image source based on comparison mode
    const targetImg = comparisonMode === 'raw' && loadedRawImage ? loadedRawImage : loadedImage;
    const isShowingRaw = comparisonMode === 'raw';

    // Create offscreen single edited tile canvas
    const tileCanvas = document.createElement('canvas');
    if (isShowingRaw) {
      tileCanvas.width = targetImg.naturalWidth || 512;
      tileCanvas.height = targetImg.naturalHeight || 512;
      const tCtx = tileCanvas.getContext('2d');
      if (tCtx) tCtx.drawImage(targetImg, 0, 0);
    } else {
      renderImageToCanvas(tileCanvas, loadedImage, editorState);
    }

    const tileW = tileCanvas.width;
    const tileH = tileCanvas.height;

    // Set preview canvas dimensions based on mode (single 1x1 or 3x3 grid)
    if (editorTileMode === '3x3') {
      canvas.width = tileW * 3;
      canvas.height = tileH * 3;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          ctx.drawImage(tileCanvas, c * tileW, r * tileH);
        }
      }

      // Draw subtle grid divider lines in 3x3 mode
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tileW, 0);
      ctx.lineTo(tileW, canvas.height);
      ctx.moveTo(tileW * 2, 0);
      ctx.lineTo(tileW * 2, canvas.height);
      ctx.moveTo(0, tileH);
      ctx.lineTo(canvas.width, tileH);
      ctx.moveTo(0, tileH * 2);
      ctx.lineTo(canvas.width, tileH * 2);
      ctx.stroke();
    } else {
      canvas.width = tileW;
      canvas.height = tileH;
      ctx.clearRect(0, 0, tileW, tileH);
      ctx.drawImage(tileCanvas, 0, 0);
    }
  }, [loadedImage, loadedRawImage, editorState, comparisonMode, editorTileMode]);

  useEffect(() => {
    redrawPreview();
  }, [redrawPreview]);

  if (!asset) {
    return (
      <div role="dialog" aria-label="Non-Destructive Image Editor" className={`bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 ${className}`}>
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-white">No Active Asset Selected</h3>
        <p className="text-xs text-slate-500 mt-1">
          Generate an AI tile or select an existing asset from history to open the editor.
        </p>
      </div>
    );
  }

  return (
    <div role="dialog" aria-label="Non-Destructive Image Editor" className={`bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-5 ${className}`}>
      {/* Editor Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400" aria-hidden="true">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Non-Destructive Image Editor
              </h2>
              {isDirty && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-950 text-amber-300 border border-amber-500/40">
                  UNSAVED EDITS
                </span>
              )}
              {asset.editedImageDataUrl && !isDirty && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  EDITED SOURCE ACTIVE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Editing: <span className="text-slate-200 font-semibold">{asset.name}</span> ({asset.material})
            </p>
          </div>
        </div>

        {/* Top Controls: Before/After Comparison & Preview Mode */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Compare Toggle */}
          <div role="radiogroup" aria-label="Image View Comparison Mode" className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <span className="text-slate-400 font-semibold px-1.5 text-[11px]">Compare:</span>
            <button
              id="btn-compare-edit"
              type="button"
              role="radio"
              aria-checked={comparisonMode === 'edit'}
              onClick={() => setComparisonMode('edit')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                comparisonMode === 'edit'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              CURRENT EDIT
            </button>
            <button
              id="btn-compare-raw"
              type="button"
              role="radio"
              aria-checked={comparisonMode === 'raw'}
              onClick={() => setComparisonMode('raw')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                comparisonMode === 'raw'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ORIGINAL RAW
            </button>
          </div>

          {/* Tile Preview Mode Switcher */}
          <div role="radiogroup" aria-label="Editor Tile Preview Mode" className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              id="btn-editor-tile-single"
              type="button"
              role="radio"
              aria-checked={editorTileMode === 'single'}
              onClick={() => setEditorTileMode('single')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                editorTileMode === 'single'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="1x1 Single Image Preview"
            >
              <Square className="w-3.5 h-3.5" aria-hidden="true" />
              <span>1×1</span>
            </button>
            <button
              id="btn-editor-tile-3x3"
              type="button"
              role="radio"
              aria-checked={editorTileMode === '3x3'}
              onClick={() => setEditorTileMode('3x3')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                editorTileMode === '3x3'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="3x3 Repeated Tile Preview"
            >
              <Grid3X3 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>3×3 Tiled</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div role="alert" className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-slate-400 hover:text-white font-mono text-xs cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area: Canvas Viewport & Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Canvas Preview Viewport */}
        <div className="lg:col-span-7 flex flex-col bg-slate-950 rounded-xl border border-slate-800 p-4 shadow-inner min-h-[380px] items-center justify-center relative overflow-hidden">
          <div ref={containerRef} className="max-w-full max-h-[460px] overflow-auto flex items-center justify-center">
            <canvas
              ref={canvasRef}
              id="editor-preview-canvas"
              style={{ imageRendering: 'pixelated' }}
              className="max-w-full max-h-[420px] object-contain rounded-lg border border-slate-800 shadow-lg"
            />
          </div>

          {/* Canvas Floating Badge */}
          <div className="absolute bottom-3 left-3 flex items-center space-x-2 bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-1 rounded-lg text-[11px] text-slate-300">
            <span className="font-semibold text-amber-400">
              {comparisonMode === 'raw' ? 'Viewing Original RAW Source' : 'Viewing Edited Canvas'}
            </span>
            <span className="text-slate-600">•</span>
            <span className="font-mono text-slate-400">
              {editorTileMode === 'single' ? 'Single 1×1' : 'Tiled 3×3 Grid'}
            </span>
          </div>
        </div>

        {/* Right Column: Editing Operations Controls */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Operation Navigation Tabs: Transform, Crop, Color */}
          <div role="tablist" aria-label="Editor Operations" className="flex border-b border-slate-800">
            <button
              id="tab-editor-transform"
              type="button"
              role="tab"
              aria-selected={activeTab === 'transform'}
              onClick={() => setActiveTab('transform')}
              className={`flex-1 py-2 text-xs font-bold border-b-2 flex items-center justify-center space-x-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                activeTab === 'transform'
                  ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Transform</span>
            </button>
            <button
              id="tab-editor-crop"
              type="button"
              role="tab"
              aria-selected={activeTab === 'crop'}
              onClick={() => setActiveTab('crop')}
              className={`flex-1 py-2 text-xs font-bold border-b-2 flex items-center justify-center space-x-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                activeTab === 'crop'
                  ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Crop className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Crop</span>
            </button>
            <button
              id="tab-editor-color"
              type="button"
              role="tab"
              aria-selected={activeTab === 'color'}
              onClick={() => setActiveTab('color')}
              className={`flex-1 py-2 text-xs font-bold border-b-2 flex items-center justify-center space-x-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                activeTab === 'color'
                  ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Color</span>
            </button>
          </div>

          {/* TAB 1: TRANSFORM CONTROLS */}
          {activeTab === 'transform' && (
            <div role="tabpanel" aria-labelledby="tab-editor-transform" className="space-y-4 text-xs">
              <div className="text-slate-400 text-[11px]">
                Rotate or flip the source image. Transforms update instantly in preview.
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-rotate-cw"
                  type="button"
                  onClick={rotateCW}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-200 font-semibold flex items-center justify-center space-x-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <RotateCw className="w-4 h-4 text-amber-400" aria-hidden="true" />
                  <span>Rotate 90° CW</span>
                </button>
                <button
                  id="btn-rotate-ccw"
                  type="button"
                  onClick={rotateCCW}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-200 font-semibold flex items-center justify-center space-x-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" aria-hidden="true" />
                  <span>Rotate 90° CCW</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-flip-h"
                  type="button"
                  onClick={toggleFlipH}
                  className={`p-2.5 rounded-xl border text-slate-200 font-semibold flex items-center justify-center space-x-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    editorState.transform.flipH
                      ? 'bg-amber-950/60 border-amber-500/80 text-amber-200'
                      : 'bg-slate-950 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <FlipHorizontal className="w-4 h-4 text-sky-400" aria-hidden="true" />
                  <span>Flip Horizontal</span>
                </button>
                <button
                  id="btn-flip-v"
                  type="button"
                  onClick={toggleFlipV}
                  className={`p-2.5 rounded-xl border text-slate-200 font-semibold flex items-center justify-center space-x-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    editorState.transform.flipV
                      ? 'bg-amber-950/60 border-amber-500/80 text-amber-200'
                      : 'bg-slate-950 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <FlipVertical className="w-4 h-4 text-sky-400" aria-hidden="true" />
                  <span>Flip Vertical</span>
                </button>
              </div>

              {/* Status & Reset Transform */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                <span className="font-mono text-[11px] text-slate-400">
                  Rotation: {editorState.transform.rotation}° | H: {editorState.transform.flipH ? 'ON' : 'OFF'} | V: {editorState.transform.flipV ? 'ON' : 'OFF'}
                </span>
                <button
                  id="btn-reset-transform"
                  type="button"
                  onClick={resetTransform}
                  className="text-[11px] text-amber-400 hover:underline font-semibold focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                >
                  Reset Transform
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CROP CONTROLS */}
          {activeTab === 'crop' && (
            <div role="tabpanel" aria-labelledby="tab-editor-crop" className="space-y-4 text-xs">
              <div className="text-slate-400 text-[11px]">
                Crop the image boundaries to focus on specific material sub-regions.
              </div>

              <div role="radiogroup" aria-label="Crop Ratio Options" className="grid grid-cols-3 gap-2">
                <button
                  id="btn-crop-none"
                  type="button"
                  role="radio"
                  aria-checked={editorState.crop.mode === 'none'}
                  onClick={() => setCropMode('none')}
                  className={`p-2.5 rounded-xl border font-semibold text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    editorState.crop.mode === 'none'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Full Image
                </button>
                <button
                  id="btn-crop-11"
                  type="button"
                  role="radio"
                  aria-checked={editorState.crop.mode === '1:1'}
                  onClick={() => setCropMode('1:1')}
                  className={`p-2.5 rounded-xl border font-semibold text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    editorState.crop.mode === '1:1'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Square (1:1)
                </button>
                <button
                  id="btn-crop-free"
                  type="button"
                  role="radio"
                  aria-checked={editorState.crop.mode === 'free'}
                  onClick={() => setCropMode('free')}
                  className={`p-2.5 rounded-xl border font-semibold text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    editorState.crop.mode === 'free'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Custom Area
                </button>
              </div>

              {/* Free crop range sliders */}
              {editorState.crop.mode === 'free' && (
                <div className="space-y-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <label htmlFor="slider-crop-width">Crop Width</label>
                      <span className="font-mono text-amber-400">{editorState.crop.width}%</span>
                    </div>
                    <input
                      id="slider-crop-width"
                      type="range"
                      min={20}
                      max={100}
                      value={editorState.crop.width}
                      onChange={(e) => updateCrop({ width: Number(e.target.value) })}
                      className="w-full accent-amber-500 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <label htmlFor="slider-crop-height">Crop Height</label>
                      <span className="font-mono text-amber-400">{editorState.crop.height}%</span>
                    </div>
                    <input
                      id="slider-crop-height"
                      type="range"
                      min={20}
                      max={100}
                      value={editorState.crop.height}
                      onChange={(e) => updateCrop({ height: Number(e.target.value) })}
                      className="w-full accent-amber-500 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Reset Crop */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                <span className="font-mono text-[11px] text-slate-400">
                  Crop Mode: {editorState.crop.mode.toUpperCase()}
                </span>
                <button
                  id="btn-reset-crop"
                  type="button"
                  onClick={resetCrop}
                  className="text-[11px] text-amber-400 hover:underline font-semibold focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                >
                  Reset Crop
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: COLOR CONTROLS */}
          {activeTab === 'color' && (
            <div role="tabpanel" aria-labelledby="tab-editor-color" className="space-y-3 text-xs">
              <div className="text-slate-400 text-[11px]">
                Adjust brightness, contrast, saturation, and hue. Values update real-time.
              </div>

              {/* 1. Brightness */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-[11px] text-slate-300 mb-1">
                  <label htmlFor="slider-brightness" className="flex items-center space-x-1 font-semibold cursor-pointer">
                    <Sun className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    <span>Brightness</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-amber-400">{editorState.color.brightness}</span>
                    <button
                      type="button"
                      onClick={() => resetColor('brightness')}
                      className="text-[10px] text-slate-500 hover:text-amber-400 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <input
                  id="slider-brightness"
                  type="range"
                  min={-100}
                  max={100}
                  value={editorState.color.brightness}
                  onChange={(e) => setColorValue('brightness', Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>

              {/* 2. Contrast */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-[11px] text-slate-300 mb-1">
                  <label htmlFor="slider-contrast" className="flex items-center space-x-1 font-semibold cursor-pointer">
                    <Contrast className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                    <span>Contrast</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sky-400">{editorState.color.contrast}</span>
                    <button
                      type="button"
                      onClick={() => resetColor('contrast')}
                      className="text-[10px] text-slate-500 hover:text-sky-400 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <input
                  id="slider-contrast"
                  type="range"
                  min={-100}
                  max={100}
                  value={editorState.color.contrast}
                  onChange={(e) => setColorValue('contrast', Number(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>

              {/* 3. Saturation */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-[11px] text-slate-300 mb-1">
                  <label htmlFor="slider-saturation" className="flex items-center space-x-1 font-semibold cursor-pointer">
                    <Palette className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    <span>Saturation</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-emerald-400">{editorState.color.saturation}</span>
                    <button
                      type="button"
                      onClick={() => resetColor('saturation')}
                      className="text-[10px] text-slate-500 hover:text-emerald-400 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <input
                  id="slider-saturation"
                  type="range"
                  min={-100}
                  max={100}
                  value={editorState.color.saturation}
                  onChange={(e) => setColorValue('saturation', Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>

              {/* 4. Hue */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-[11px] text-slate-300 mb-1">
                  <label htmlFor="slider-hue" className="flex items-center space-x-1 font-semibold cursor-pointer">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
                    <span>Hue Shift</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-indigo-400">{editorState.color.hue}°</span>
                    <button
                      type="button"
                      onClick={() => resetColor('hue')}
                      className="text-[10px] text-slate-500 hover:text-indigo-400 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <input
                  id="slider-hue"
                  type="range"
                  min={-180}
                  max={180}
                  value={editorState.color.hue}
                  onChange={(e) => setColorValue('hue', Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>

              {/* Reset All Colors */}
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">Bounded Range Color Adjustments</span>
                <button
                  id="btn-reset-color-all"
                  type="button"
                  onClick={() => resetColor()}
                  className="text-[11px] text-amber-400 hover:underline font-semibold focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                >
                  Reset All Color
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor Action Footer Bar (Reset Controls, Clear Committed Edits, Cancel, Apply) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
        <div className="flex items-center space-x-2">
          <button
            id="btn-editor-reset-all"
            type="button"
            onClick={resetAll}
            className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            title="Reset active sliders/transforms to original"
          >
            <ResetIcon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset Editor Controls</span>
          </button>

          {asset.editedImageDataUrl && onResetEdits && (
            <button
              id="btn-editor-clear-committed"
              type="button"
              onClick={handleResetCommittedEdits}
              className="px-3.5 py-2 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 hover:bg-rose-900/60 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              title="Remove committed edits and restore raw source image"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
              <span>Remove Edits & Restore Raw</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="btn-editor-cancel"
            type="button"
            onClick={handleCancel}
            className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 flex items-center space-x-1.5"
          >
            <X className="w-4 h-4 text-slate-400" aria-hidden="true" />
            <span>Cancel</span>
          </button>

          <button
            id="btn-editor-apply"
            type="button"
            onClick={() => handleApply(loadedImage)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-bold text-xs tracking-wide uppercase flex items-center space-x-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            <span>Apply Edits to Asset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
