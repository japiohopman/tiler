/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  History,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Cpu,
  Clock,
  Layers,
  Sparkles,
  Sliders,
  Check,
  Database,
} from 'lucide-react';
import { WorkspaceAsset } from '../types';

interface AssetHistoryPanelProps {
  assets: WorkspaceAsset[];
  currentAssetId: string | null;
  onSelectAsset: (id: string) => void;
  onDeleteAsset: (id: string) => void;
  activeProvider?: string;
  isPersistent?: boolean;
}

export const AssetHistoryPanel: React.FC<AssetHistoryPanelProps> = ({
  assets,
  currentAssetId,
  onSelectAsset,
  onDeleteAsset,
  activeProvider = 'pixazo',
  isPersistent = true,
}) => {
  const currentAsset = assets.find((a) => a.id === currentAssetId) || null;

  const getValidationBadge = (asset: WorkspaceAsset) => {
    const finalStatus = asset.validationSummary?.finalStatus;

    if (finalStatus === 'PASS_RAW') {
      return (
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/40">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" aria-hidden="true" />
          <span>PASS RAW</span>
        </span>
      );
    }
    if (finalStatus === 'PASS_AFTER_PROCESSING') {
      return (
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/40">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" aria-hidden="true" />
          <span>PASS PROC</span>
        </span>
      );
    }
    if (finalStatus === 'VALIDATION_FAILED') {
      return (
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950/90 text-rose-300 border border-rose-500/40">
          <AlertTriangle className="w-3 h-3 text-rose-400" aria-hidden="true" />
          <span>FAIL</span>
        </span>
      );
    }
    if (asset.isTileable) {
      return (
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/40">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" aria-hidden="true" />
          <span>SEAMLESS</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
        <span>UNVALIDATED</span>
      </span>
    );
  };

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <section role="region" aria-label="Generated Asset History" className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-amber-400" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            Asset History
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          {/* Persistence status badge */}
          <span
            id="persistence-status-badge"
            className={`inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
              isPersistent
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
            }`}
          >
            <Database className="w-3 h-3" aria-hidden="true" />
            <span>{isPersistent ? 'Saved locally' : 'Session only — not persisted'}</span>
          </span>
          <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
            {assets.length} / 20 Assets
          </span>
        </div>
      </div>

      {/* History Asset Strip / Grid */}
      {assets.length === 0 ? (
        <div className="p-6 text-center bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
          <Layers className="w-8 h-8 text-slate-600 mx-auto" aria-hidden="true" />
          <p className="text-xs text-slate-400 font-medium">Workspace is empty</p>
          <p className="text-[11px] text-slate-500">
            Generate an AI tile to start building your material history.
          </p>
        </div>
      ) : (
        <div role="listbox" aria-label="Generated Assets" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
          {assets.map((item) => {
            const isSelected = item.id === currentAssetId;
            const thumbUrl = item.processedImageDataUrl || item.rawImageDataUrl;

            return (
              <div
                key={item.id}
                id={`asset-history-item-${item.id}`}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => onSelectAsset(item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectAsset(item.id);
                  }
                }}
                className={`relative group p-2.5 rounded-xl border transition-all cursor-pointer flex items-center space-x-3 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-500/80 shadow-md ring-1 ring-amber-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 shrink-0 overflow-hidden relative">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 text-[10px]">
                      No Image
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute top-0.5 left-0.5 bg-amber-500 text-slate-950 p-0.5 rounded-full shadow">
                      <Check className="w-2.5 h-2.5 stroke-[3]" aria-hidden="true" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 truncate pr-1">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="capitalize font-mono">{item.material}</span>
                    <span className="text-slate-500">{formatTimestamp(item.createdAt)}</span>
                  </div>
                  <div>{getValidationBadge(item)}</div>
                </div>

                {/* Delete Button */}
                <button
                  id={`btn-delete-asset-${item.id}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteAsset(item.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 border border-transparent hover:border-rose-800/50 transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-500"
                  title="Remove asset from history"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Asset Compact Metadata Inspector */}
      {currentAsset && (
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
              <span>Selected Asset Metadata ({currentAsset.name})</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              ID: {currentAsset.id.slice(0, 12)}...
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
            <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
              <span className="text-[10px] text-slate-500 font-sans block">Provider & Model</span>
              <span className="text-slate-200 truncate block">
                {currentAsset.generationMetadata?.model || activeProvider}
              </span>
            </div>

            <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
              <span className="text-[10px] text-slate-500 font-sans block">Resolution & Material</span>
              <span className="text-slate-200 truncate block">
                {currentAsset.resolution}×{currentAsset.resolution} • {currentAsset.material}
              </span>
            </div>

            <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
              <span className="text-[10px] text-slate-500 font-sans block">Processing Pipeline</span>
              <span className="text-emerald-400 truncate block">
                {currentAsset.metadata?.processingAlgorithm || 'offset-crossfade'} (
                {currentAsset.generationMetadata?.blendMarginPercent ?? 10}%)
              </span>
            </div>

            <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
              <span className="text-[10px] text-slate-500 font-sans block">Processed Seam Score</span>
              <span
                className={`truncate block font-bold ${
                  (currentAsset.seamScore ?? 1) <= (currentAsset.seamReport?.threshold ?? 0.05)
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {currentAsset.seamScore !== undefined ? currentAsset.seamScore.toFixed(4) : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
