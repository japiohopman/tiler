/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  FileText,
  FolderOpen,
  Save,
  Download,
  Square,
  Grid3X3,
  Infinity as InfinityIcon,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Edit3,
  PanelLeft,
  PanelRight,
  Sparkles,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { TilePreviewMode } from '../../types';

interface ToolBarProps {
  onNewDocument?: () => void;
  onOpenDocument?: () => void;
  onSaveDocument?: () => void;
  onExport?: () => void;
  previewMode?: TilePreviewMode;
  onSetPreviewMode?: (mode: TilePreviewMode) => void;
  selectedSource?: 'processed' | 'raw';
  onSetSelectedSource?: (source: 'processed' | 'raw') => void;
  hasRawImage?: boolean;
  hasProcessedImage?: boolean;
  showGrid?: boolean;
  onToggleGrid?: () => void;
  onOpenEditor?: () => void;
  onGenerate?: () => void;
  onReprocess?: () => void;
  showExplorer?: boolean;
  onToggleExplorer?: () => void;
  showInspector?: boolean;
  onToggleInspector?: () => void;
  isGenerating?: boolean;
  isProcessing?: boolean;
  activeProvider?: string;
}

export const ToolBar: React.FC<ToolBarProps> = ({
  onNewDocument,
  onOpenDocument,
  onSaveDocument,
  onExport,
  previewMode = '3x3',
  onSetPreviewMode,
  selectedSource = 'processed',
  onSetSelectedSource,
  hasRawImage = false,
  hasProcessedImage = false,
  showGrid = true,
  onToggleGrid,
  onOpenEditor,
  onGenerate,
  onReprocess,
  showExplorer = true,
  onToggleExplorer,
  showInspector = true,
  onToggleInspector,
  isGenerating = false,
  isProcessing = false,
  activeProvider = 'pixazo',
}) => {
  return (
    <div className="bg-slate-900 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between text-xs select-none gap-2 overflow-x-auto">
      {/* Left Group: Document & Sidebar Toggles */}
      <div className="flex items-center space-x-1 shrink-0">
        <button
          onClick={onToggleExplorer}
          className={`p-1.5 rounded border transition-colors cursor-pointer ${
            showExplorer
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
          }`}
          title="Toggle Explorer Sidebar"
        >
          <PanelLeft className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-slate-800 mx-1" />

        <button
          onClick={onNewDocument}
          className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors cursor-pointer"
          title="New Tile Project"
        >
          <FileText className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onOpenDocument}
          className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors cursor-pointer"
          title="Open Tile Document"
        >
          <FolderOpen className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onSaveDocument}
          className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors cursor-pointer"
          title="Save Tile Document"
        >
          <Save className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-slate-800 mx-1" />

        {/* Primary Action Button: Generate */}
        <button
          id="btn-toolbar-generate"
          onClick={onGenerate}
          disabled={isGenerating || isProcessing}
          className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
          title="Generate new AI tile surface"
        >
          {isGenerating ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span>GENERATE TILE</span>
        </button>

        {hasRawImage && (
          <button
            onClick={onReprocess}
            disabled={isGenerating || isProcessing}
            className="px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-semibold text-[11px] flex items-center space-x-1 transition-colors cursor-pointer disabled:opacity-50"
            title="Reprocess active raw source image"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Reprocess</span>
          </button>
        )}
      </div>

      {/* Middle Group: View & Mode Switchers */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Preview Modes */}
        <div className="flex items-center space-x-0.5 bg-slate-950 p-0.5 rounded-md border border-slate-800 text-[11px]">
          <button
            id="btn-preview-mode-single"
            onClick={() => onSetPreviewMode?.('single')}
            className={`px-2 py-1 rounded flex items-center space-x-1 font-semibold transition-colors cursor-pointer ${
              previewMode === 'single'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="1×1 Native Resolution Tile"
          >
            <Square className="w-3 h-3" />
            <span className="hidden md:inline">1×1</span>
          </button>

          <button
            id="btn-preview-mode-3x3"
            onClick={() => onSetPreviewMode?.('3x3')}
            className={`px-2 py-1 rounded flex items-center space-x-1 font-semibold transition-colors cursor-pointer ${
              previewMode === '3x3'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="3×3 Seamless Grid Repetition"
          >
            <Grid3X3 className="w-3 h-3" />
            <span className="hidden md:inline">3×3</span>
          </button>

          <button
            id="btn-preview-mode-infinite"
            onClick={() => onSetPreviewMode?.('infinite')}
            className={`px-2 py-1 rounded flex items-center space-x-1 font-semibold transition-colors cursor-pointer ${
              previewMode === 'infinite'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Infinite Canvas Tiling"
          >
            <InfinityIcon className="w-3 h-3" />
            <span className="hidden md:inline">Infinite</span>
          </button>
        </div>

        {/* Source Toggle */}
        {hasRawImage && hasProcessedImage && (
          <div className="flex items-center space-x-0.5 bg-slate-950 p-0.5 rounded-md border border-slate-800 text-[11px]">
            <button
              id="btn-view-processed"
              onClick={() => onSetSelectedSource?.('processed')}
              className={`px-2 py-1 rounded font-bold uppercase transition-colors cursor-pointer ${
                selectedSource === 'processed'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              PROCESSED
            </button>
            <button
              id="btn-view-raw"
              onClick={() => onSetSelectedSource?.('raw')}
              className={`px-2 py-1 rounded font-bold uppercase transition-colors cursor-pointer ${
                selectedSource === 'raw'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              RAW AI
            </button>
          </div>
        )}

        {/* Grid Toggle */}
        <button
          id="btn-toggle-grid"
          onClick={onToggleGrid}
          className={`p-1.5 rounded border transition-colors cursor-pointer ${
            showGrid
              ? 'bg-sky-950/80 border-sky-500/50 text-sky-300'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
          }`}
          title="Toggle Grid Boundary Lines"
        >
          {showGrid ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>

        {/* Image Editor button */}
        <button
          onClick={onOpenEditor}
          className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
          title="Open Image Editor"
        >
          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden lg:inline">Image Editor</span>
        </button>
      </div>

      {/* Right Group: Export & Inspector Toggle */}
      <div className="flex items-center space-x-1 shrink-0">
        <button
          onClick={onExport}
          className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
          title="Export Game Texture"
        >
          <Download className="w-3.5 h-3.5" />
          <span>EXPORT</span>
        </button>

        <div className="w-px h-4 bg-slate-800 mx-1" />

        <button
          onClick={onToggleInspector}
          className={`p-1.5 rounded border transition-colors cursor-pointer ${
            showInspector
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
          }`}
          title="Toggle Properties Inspector"
        >
          <PanelRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
