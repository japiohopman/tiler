/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import {
  FolderOpen,
  Edit2,
  Copy,
  Sparkles,
  RefreshCw,
  Edit3,
  Download,
  Trash2,
  Maximize2,
  ZoomIn,
} from 'lucide-react';
import { WorkspaceAsset } from '../../types';

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  type: 'asset' | 'preview';
  targetAsset?: WorkspaceAsset | null;
}

interface ContextMenuProps {
  menuState: ContextMenuState;
  onClose: () => void;
  onSelectAsset?: (id: string) => void;
  onRenameAsset?: (id: string, newName: string) => void;
  onGenerateVariant?: (asset: WorkspaceAsset) => void;
  onOpenEditor?: () => void;
  onReprocess?: () => void;
  onExport?: () => void;
  onDeleteAsset?: (id: string) => void;
  onResetZoom?: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  menuState,
  onClose,
  onSelectAsset,
  onRenameAsset,
  onGenerateVariant,
  onOpenEditor,
  onReprocess,
  onExport,
  onDeleteAsset,
  onResetZoom,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (menuState.visible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuState.visible, onClose]);

  if (!menuState.visible) return null;

  // Viewport bounds checking
  const adjustedX = Math.min(menuState.x, window.innerWidth - 220);
  const adjustedY = Math.min(menuState.y, window.innerHeight - 280);

  const asset = menuState.targetAsset;

  return (
    <div
      ref={menuRef}
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
      className="fixed z-[100] w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 text-xs text-slate-200 font-sans select-none animate-in fade-in duration-100"
    >
      {menuState.type === 'asset' && asset ? (
        <>
          <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] text-slate-400 font-mono truncate">
            {asset.name} ({asset.material})
          </div>

          <button
            onClick={() => {
              onSelectAsset?.(asset.id);
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer font-medium"
          >
            <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>Open Asset</span>
          </button>

          <button
            onClick={() => {
              const newName = window.prompt('Enter new tile name:', asset.name);
              if (newName && newName.trim()) {
                onRenameAsset?.(asset.id, newName.trim());
              }
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Rename Tile</span>
          </button>

          <button
            onClick={() => {
              onGenerateVariant?.(asset);
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Generate Variant</span>
          </button>

          <div className="my-1 border-t border-slate-800" />

          <button
            onClick={() => {
              onReprocess?.();
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reprocess Texture</span>
          </button>

          <button
            onClick={() => {
              onOpenEditor?.();
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-sky-400" />
            <span>Edit in Pixel Editor</span>
          </button>

          <button
            onClick={() => {
              onExport?.();
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Texture...</span>
          </button>

          <div className="my-1 border-t border-slate-800" />

          <button
            onClick={() => {
              onDeleteAsset?.(asset.id);
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-rose-950/60 text-rose-300 flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete Asset</span>
          </button>
        </>
      ) : (
        <>
          <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] text-slate-400 font-mono">
            Preview Canvas Operations
          </div>

          <button
            onClick={() => {
              onOpenEditor?.();
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer font-medium"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Open in Pixel Editor</span>
          </button>

          <button
            onClick={() => {
              onResetZoom?.();
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5 text-sky-400" />
            <span>1:1 Native Scale</span>
          </button>

          <div className="my-1 border-t border-slate-800" />

          <button
            onClick={() => {
              onReprocess?.();
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reprocess Texture</span>
          </button>

          <button
            onClick={() => {
              onExport?.();
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Texture...</span>
          </button>
        </>
      )}
    </div>
  );
};
