/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Folder,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit2,
  Check,
  Plus,
} from 'lucide-react';
import { MaterialId, WorkspaceAsset } from '../../types';

interface AssetExplorerProps {
  assets: WorkspaceAsset[];
  currentAssetId: string | null;
  onSelectAsset: (id: string) => void;
  onDeleteAsset: (id: string) => void;
  onRenameAsset?: (id: string, newName: string) => void;
  onContextMenuAsset?: (e: React.MouseEvent, asset: WorkspaceAsset) => void;
  onGenerate?: () => void;
}

export const AssetExplorer: React.FC<AssetExplorerProps> = ({
  assets,
  currentAssetId,
  onSelectAsset,
  onDeleteAsset,
  onRenameAsset,
  onContextMenuAsset,
  onGenerate,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    all: true,
    stone: true,
    ground: true,
    liquids: true,
    wood: true,
  });

  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const handleStartRename = (e: React.MouseEvent, asset: WorkspaceAsset) => {
    e.stopPropagation();
    setEditingAssetId(asset.id);
    setEditingName(asset.name);
  };

  const handleSaveRename = (id: string) => {
    if (editingName.trim() && onRenameAsset) {
      onRenameAsset(id, editingName.trim());
    }
    setEditingAssetId(null);
  };

  const getValidationBadge = (asset: WorkspaceAsset) => {
    const finalStatus = asset.validationSummary?.finalStatus;
    if (finalStatus === 'PASS_RAW' || finalStatus === 'PASS_AFTER_PROCESSING' || asset.isTileable) {
      return (
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/40">
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
          <span>PASS</span>
        </span>
      );
    }
    if (finalStatus === 'VALIDATION_FAILED') {
      return (
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-950/90 text-rose-300 border border-rose-500/40">
          <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
          <span>FAIL</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-800 text-slate-400">
        UNVALIDATED
      </span>
    );
  };

  // Group assets by category matching canonical MaterialId
  const categories: { id: string; name: string; materials: MaterialId[] }[] = [
    { id: 'stone', name: 'Stone & Dungeon', materials: ['cobblestone'] },
    { id: 'ground', name: 'Ground & Nature', materials: ['grass', 'sand'] },
    { id: 'liquids', name: 'Liquids & Magma', materials: ['water', 'lava'] },
    { id: 'wood', name: 'Wood & Planks', materials: ['wood'] },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900/90 text-slate-200 select-none text-xs font-sans">
      {/* Explorer Header */}
      <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div className="flex items-center space-x-2">
          <Folder className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
            EXPLORER
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={onGenerate}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
            title="Generate New Asset"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700">
            {assets.length}/20
          </span>
        </div>
      </div>

      {/* Explorer Folder Tree & Asset List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 font-mono text-[11px]">
        {/* Top Root Folder */}
        <div className="space-y-1">
          <button
            onClick={() => toggleFolder('all')}
            className="w-full text-left flex items-center space-x-1.5 py-1 px-1.5 rounded hover:bg-slate-800/60 font-semibold text-slate-300 cursor-pointer"
          >
            {expandedFolders.all ? (
              <ChevronDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )}
            <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-500/20" />
            <span className="truncate">Generated Tiles ({assets.length})</span>
          </button>

          {expandedFolders.all && (
            <div className="pl-3 space-y-2 border-l border-slate-800/80 ml-2 pt-1">
              {assets.length === 0 ? (
                <div className="p-3 text-center text-[10px] text-slate-500 italic bg-slate-950/40 rounded border border-slate-800/50">
                  No tiles generated yet.
                </div>
              ) : (
                categories.map((cat) => {
                  const catAssets = assets.filter((a) => cat.materials.includes(a.material as MaterialId));
                  if (catAssets.length === 0) return null;

                  const isExpanded = expandedFolders[cat.id] ?? true;

                  return (
                    <div key={cat.id} className="space-y-1">
                      <button
                        onClick={() => toggleFolder(cat.id)}
                        className="w-full text-left flex items-center space-x-1 py-0.5 px-1 rounded hover:bg-slate-800/40 text-slate-400 cursor-pointer"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
                        )}
                        <Folder className="w-3 h-3 text-sky-400 shrink-0" />
                        <span className="truncate font-sans font-medium text-[11px]">
                          {cat.name} ({catAssets.length})
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="pl-3 space-y-1 border-l border-slate-800/60 ml-1">
                          {catAssets.map((item) => {
                            const isSelected = item.id === currentAssetId;
                            const thumbUrl = item.processedImageDataUrl || item.rawImageDataUrl;

                            return (
                              <div
                                key={item.id}
                                id={`asset-history-item-${item.id}`}
                                onClick={() => onSelectAsset(item.id)}
                                onContextMenu={(e) => {
                                  if (onContextMenuAsset) {
                                    e.preventDefault();
                                    onContextMenuAsset(e, item);
                                  }
                                }}
                                className={`group relative p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between space-x-2 ${
                                  isSelected
                                    ? 'bg-amber-950/40 border-amber-500/80 shadow-md ring-1 ring-amber-500/30 text-white'
                                    : 'bg-slate-950/50 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                                }`}
                              >
                                {/* Thumbnail */}
                                <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 shrink-0 overflow-hidden relative">
                                  {thumbUrl ? (
                                    <img
                                      src={thumbUrl}
                                      alt={item.name}
                                      className="w-full h-full object-cover"
                                      style={{ imageRendering: 'pixelated' }}
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-slate-800" />
                                  )}
                                </div>

                                {/* Asset Info */}
                                <div className="flex-1 min-w-0 font-sans">
                                  {editingAssetId === item.id ? (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center space-x-1"
                                    >
                                      <input
                                        type="text"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveRename(item.id);
                                          if (e.key === 'Escape') setEditingAssetId(null);
                                        }}
                                        autoFocus
                                        className="bg-slate-900 text-xs px-1 py-0.5 rounded border border-amber-500 text-white w-full outline-none"
                                      />
                                      <button
                                        onClick={() => handleSaveRename(item.id)}
                                        className="text-emerald-400 hover:text-white"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="font-semibold text-[11px] truncate leading-tight">
                                        {item.name}
                                      </div>
                                      <div className="flex items-center justify-between text-[9px] text-slate-400 mt-0.5">
                                        <span className="capitalize">{item.material}</span>
                                        <div>{getValidationBadge(item)}</div>
                                      </div>
                                    </>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 shrink-0">
                                  <button
                                    onClick={(e) => handleStartRename(e, item)}
                                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
                                    title="Rename Tile"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    id={`btn-delete-asset-${item.id}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteAsset(item.id);
                                    }}
                                    className="p-1 rounded hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                                    title="Delete Tile"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Explorer Footer Status */}
      <div className="p-2 border-t border-slate-800 bg-slate-950/80 text-[10px] text-slate-400 flex items-center justify-between font-mono">
        <span>Active: {currentAssetId ? 'Selected' : 'None'}</span>
        <span className="text-amber-400 font-semibold">RClick = Actions</span>
      </div>
    </div>
  );
};
