/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  FolderOpen,
  Save,
  Download,
  Sliders,
  Layers,
  Sparkles,
  BarChart3,
  HelpCircle,
  Cpu,
  Eye,
  Grid,
  Square,
  Infinity as InfinityIcon,
  RefreshCw,
  Edit3,
  X,
} from 'lucide-react';

interface MenuBarProps {
  onNewDocument?: () => void;
  onOpenDocument?: () => void;
  onSaveDocument?: () => void;
  onSaveAsDocument?: () => void;
  onExport?: () => void;
  onOpenEditor?: () => void;
  onToggleExplorer?: () => void;
  onToggleInspector?: () => void;
  onToggleGrid?: () => void;
  onSetPreviewMode?: (mode: 'single' | '3x3' | 'infinite') => void;
  onSetSelectedSource?: (source: 'processed' | 'raw') => void;
  onGenerate?: () => void;
  onReprocess?: () => void;
  onOpenBenchmarks?: () => void;
  onViewChange?: (view: 'workspace' | 'editor' | 'processor') => void;
  activeView?: 'workspace' | 'editor' | 'processor';
  showExplorer?: boolean;
  showInspector?: boolean;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  onNewDocument,
  onOpenDocument,
  onSaveDocument,
  onSaveAsDocument,
  onExport,
  onOpenEditor,
  onToggleExplorer,
  onToggleInspector,
  onToggleGrid,
  onSetPreviewMode,
  onSetSelectedSource,
  onGenerate,
  onReprocess,
  onOpenBenchmarks,
  onViewChange,
  activeView = 'workspace',
  showExplorer = true,
  showInspector = true,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleMenuClick = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const executeAction = (action: () => void) => {
    action();
    setActiveMenu(null);
  };

  return (
    <div
      ref={menuRef}
      className="bg-slate-950 border-b border-slate-800 px-3 py-1 flex items-center justify-between text-xs select-none z-50 relative font-sans text-slate-300"
    >
      {/* Menu Bar Left Items */}
      <div className="flex items-center space-x-1">
        {/* Application Brand / Icon */}
        <div className="flex items-center space-x-2 mr-3 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold text-white tracking-tight text-[11px]">TILER</span>
          <span className="text-[9px] font-mono text-amber-400/90 bg-amber-950/80 px-1 rounded border border-amber-500/30">
            PRO
          </span>
        </div>

        {/* FILES */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('FILES')}
            className={`px-2.5 py-1 rounded hover:bg-slate-800/80 transition-colors cursor-pointer text-xs font-semibold uppercase tracking-wide ${
              activeMenu === 'FILES' ? 'bg-slate-800 text-amber-400' : 'text-slate-300'
            }`}
          >
            FILES
          </button>
          {activeMenu === 'FILES' && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-1 text-xs text-slate-200 z-50 font-sans">
              <button
                onClick={() => executeAction(() => onNewDocument?.())}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>New Tile Project</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Ctrl+N</span>
              </button>
              <button
                onClick={() => executeAction(() => onOpenDocument?.())}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Open...</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Ctrl+O</span>
              </button>
              <div className="my-1 border-t border-slate-800" />
              <button
                onClick={() => executeAction(() => onSaveDocument?.())}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Save className="w-3.5 h-3.5 text-slate-400" />
                  <span>Save</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Ctrl+S</span>
              </button>
              <button
                onClick={() => executeAction(() => onSaveAsDocument?.())}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Save className="w-3.5 h-3.5 text-slate-400" />
                  <span>Save As...</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Ctrl+Shift+S</span>
              </button>
              <div className="my-1 border-t border-slate-800" />
              <button
                onClick={() => executeAction(() => onExport?.())}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export Texture...</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Ctrl+E</span>
              </button>
            </div>
          )}
        </div>

        {/* EDIT */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('EDIT')}
            className={`px-2.5 py-1 rounded hover:bg-slate-800/80 transition-colors cursor-pointer text-xs font-semibold uppercase tracking-wide ${
              activeMenu === 'EDIT' ? 'bg-slate-800 text-amber-400' : 'text-slate-300'
            }`}
          >
            EDIT
          </button>
          {activeMenu === 'EDIT' && (
            <div className="absolute left-0 top-full mt-1 w-52 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-1 text-xs text-slate-200 z-50">
              <button
                onClick={() => executeAction(() => onOpenEditor?.())}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Open in Pixel Editor</span>
              </button>
              <button
                onClick={() => executeAction(() => onReprocess?.())}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Reprocess Active Asset</span>
              </button>
            </div>
          )}
        </div>

        {/* VIEW */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('VIEW')}
            className={`px-2.5 py-1 rounded hover:bg-slate-800/80 transition-colors cursor-pointer text-xs font-semibold uppercase tracking-wide ${
              activeMenu === 'VIEW' ? 'bg-slate-800 text-amber-400' : 'text-slate-300'
            }`}
          >
            VIEW
          </button>
          {activeMenu === 'VIEW' && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-1 text-xs text-slate-200 z-50">
              <button
                onClick={() => executeAction(() => onToggleExplorer?.())}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between cursor-pointer"
              >
                <span>File Explorer Panel</span>
                <span className="text-[10px] text-amber-400 font-mono">{showExplorer ? '✓ Visible' : 'Hidden'}</span>
              </button>
              <button
                onClick={() => executeAction(() => onToggleInspector?.())}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between cursor-pointer"
              >
                <span>Properties Inspector</span>
                <span className="text-[10px] text-amber-400 font-mono">{showInspector ? '✓ Visible' : 'Hidden'}</span>
              </button>
              <div className="my-1 border-t border-slate-800" />
              <button
                onClick={() => executeAction(() => onToggleGrid?.())}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span>Toggle Grid Boundaries</span>
              </button>
              <div className="my-1 border-t border-slate-800" />
              <button
                onClick={() => executeAction(() => onSetPreviewMode?.('single'))}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 text-slate-400" />
                <span>1×1 Single Tile</span>
              </button>
              <button
                onClick={() => executeAction(() => onSetPreviewMode?.('3x3'))}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
              >
                <Grid className="w-3.5 h-3.5 text-amber-400" />
                <span>3×3 Tiled Surface Grid</span>
              </button>
              <button
                onClick={() => executeAction(() => onSetPreviewMode?.('infinite'))}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
              >
                <InfinityIcon className="w-3.5 h-3.5 text-sky-400" />
                <span>Infinite Repeat Mode</span>
              </button>
              <div className="my-1 border-t border-slate-800" />
              <button
                onClick={() => executeAction(() => onSetSelectedSource?.('processed'))}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>View Processed Seamless Tile</span>
              </button>
              <button
                onClick={() => executeAction(() => onSetSelectedSource?.('raw'))}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5 text-sky-400" />
                <span>View Raw Provider Source</span>
              </button>
            </div>
          )}
        </div>

        {/* TOOLS */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('TOOLS')}
            className={`px-2.5 py-1 rounded hover:bg-slate-800/80 transition-colors cursor-pointer text-xs font-semibold uppercase tracking-wide ${
              activeMenu === 'TOOLS' ? 'bg-slate-800 text-amber-400' : 'text-slate-300'
            }`}
          >
            TOOLS
          </button>
          {activeMenu === 'TOOLS' && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-1 text-xs text-slate-200 z-50">
              <button
                onClick={() => executeAction(() => onGenerate?.())}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Generate AI Texture</span>
              </button>
              <button
                onClick={() => executeAction(() => onReprocess?.())}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Reprocess Asset</span>
              </button>
              <div className="my-1 border-t border-slate-800" />
              <button
                onClick={() => executeAction(() => onOpenBenchmarks?.())}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
              >
                <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Benchmarks & Engine Tests ▸</span>
              </button>
            </div>
          )}
        </div>

        {/* WINDOW */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('WINDOW')}
            className={`px-2.5 py-1 rounded hover:bg-slate-800/80 transition-colors cursor-pointer text-xs font-semibold uppercase tracking-wide ${
              activeMenu === 'WINDOW' ? 'bg-slate-800 text-amber-400' : 'text-slate-300'
            }`}
          >
            WINDOW
          </button>
          {activeMenu === 'WINDOW' && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-1 text-xs text-slate-200 z-50">
              <button
                id="view-workspace-btn"
                onClick={() => executeAction(() => onViewChange?.('workspace'))}
                className={`w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between cursor-pointer ${
                  activeView === 'workspace' ? 'text-amber-400 font-bold' : ''
                }`}
              >
                <span>Tile Workspace</span>
                {activeView === 'workspace' && <span className="text-[10px]">● Active</span>}
              </button>
              <button
                onClick={() => executeAction(() => onViewChange?.('editor'))}
                className={`w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between cursor-pointer ${
                  activeView === 'editor' ? 'text-amber-400 font-bold' : ''
                }`}
              >
                <span>Pixel Image Editor</span>
                {activeView === 'editor' && <span className="text-[10px]">● Active</span>}
              </button>
              <button
                id="view-processor-btn"
                onClick={() => executeAction(() => onOpenBenchmarks?.())}
                className={`w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between cursor-pointer ${
                  activeView === 'processor' ? 'text-amber-400 font-bold' : ''
                }`}
              >
                <span>Engine Tests & Benchmarks</span>
                {activeView === 'processor' && <span className="text-[10px]">● Active</span>}
              </button>
            </div>
          )}
        </div>

        {/* HELP */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('HELP')}
            className={`px-2.5 py-1 rounded hover:bg-slate-800/80 transition-colors cursor-pointer text-xs font-semibold uppercase tracking-wide ${
              activeMenu === 'HELP' ? 'bg-slate-800 text-amber-400' : 'text-slate-300'
            }`}
          >
            HELP
          </button>
          {activeMenu === 'HELP' && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-1 text-xs text-slate-200 z-50">
              <div className="px-3 py-2 text-[11px] text-slate-400 space-y-1 border-b border-slate-800">
                <div className="font-bold text-slate-200">Tiler Desktop Workstation</div>
                <div>Deterministic 2D Seamless Tile Pipeline</div>
              </div>
              <button
                onClick={() => executeAction(() => alert('Tiler v1.0.0 — AI Seamless Tile Workstation'))}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                <span>About Tiler...</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Status Header Indicator */}
      <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-400">
        <span className="hidden md:inline text-slate-500">Document: Stone_Floor_01.tile</span>
      </div>
    </div>
  );
};
