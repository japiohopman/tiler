/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TilePreview } from '../TilePreview';
import {
  Sparkles,
  Sliders,
  RefreshCw,
  Gem,
  Mountain,
  Waves,
  Trees,
  Flame,
  Droplets,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  DetailLevel,
  GenerationParams,
  GenerationState,
  MaterialId,
  ProcessingState,
  TARGET_MATERIALS,
  TARGET_STYLES,
  TileProcessingOptions,
  WorkspaceAsset,
} from '../../types';
import { PromptBuilder } from '../../../server/services/promptBuilder';
import { Eye, Edit2, RotateCcw } from 'lucide-react';

interface WorkspaceProps {
  asset: WorkspaceAsset | null;
  selectedSource: 'processed' | 'raw';
  onSelectedSourceChange: (source: 'processed' | 'raw') => void;
  onTextureSelect?: (dataUrl: string, sample: any) => void;
  onOpenEditor?: () => void;
  params: GenerationParams;
  onParamsChange: (params: GenerationParams) => void;
  processingOptions: TileProcessingOptions;
  onProcessingOptionsChange: (opts: TileProcessingOptions) => void;
  generationState: GenerationState;
  processingState: ProcessingState;
  onGenerate: () => void;
  onReprocess: () => void;
  activeProvider: string;
  providerConfigured: boolean;
  onContextMenuPreview?: (e: React.MouseEvent) => void;
}

const getMaterialIcon = (id: MaterialId) => {
  switch (id) {
    case 'cobblestone':
      return <Gem className="w-3.5 h-3.5 text-stone-400" />;
    case 'wood':
      return <Mountain className="w-3.5 h-3.5 text-amber-500" />;
    case 'water':
      return <Waves className="w-3.5 h-3.5 text-sky-400" />;
    case 'grass':
      return <Trees className="w-3.5 h-3.5 text-emerald-400" />;
    case 'lava':
      return <Flame className="w-3.5 h-3.5 text-red-500" />;
    case 'sand':
      return <Droplets className="w-3.5 h-3.5 text-yellow-500" />;
    default:
      return <Gem className="w-3.5 h-3.5 text-slate-400" />;
  }
};

export const Workspace: React.FC<WorkspaceProps> = ({
  asset,
  selectedSource,
  onSelectedSourceChange,
  onTextureSelect,
  onOpenEditor,
  params,
  onParamsChange,
  processingOptions,
  onProcessingOptionsChange,
  generationState,
  processingState,
  onGenerate,
  onReprocess,
  activeProvider,
  providerConfigured,
  onContextMenuPreview,
}) => {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showPromptInspector, setShowPromptInspector] = useState<boolean>(false);

  const isGenerating = generationState.status === 'generating' || generationState.status === 'processing' || generationState.status === 'analyzing';

  // Compute live prompt preview
  const liveStructuredPrompt = PromptBuilder.buildStructuredPrompt({
    material: params.material,
    style: params.style,
    detail: params.detail,
    additionalPrompt: params.additionalPrompt,
    customPrompt: params.customPrompt,
  });
  const isProcessing = processingState.status === 'processing' || processingState.status === 'analyzing';
  const isBusy = isGenerating || isProcessing;

  const currentMaterialDef = TARGET_MATERIALS.find((m) => m.id === params.material);
  const activeReport = selectedSource === 'raw'
    ? (asset?.rawSeamReport || asset?.seamReport)
    : asset?.seamReport;

  const handleMaterialSelect = (materialId: MaterialId) => {
    const mat = TARGET_MATERIALS.find((m) => m.id === materialId);
    onParamsChange({
      ...params,
      material: materialId,
      additionalPrompt: params.additionalPrompt || mat?.description || '',
    });
  };

  return (
    <div
      onContextMenu={(e) => {
        if (onContextMenuPreview) {
          e.preventDefault();
          onContextMenuPreview(e);
        }
      }}
      className="flex-1 flex flex-col h-full bg-slate-950 p-2 sm:p-3 overflow-hidden gap-2"
    >
      {/* Upper Area: Primary Canvas Surface */}
      <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-2xl">
        <TilePreview
          imageDataUrl={asset?.processedImageDataUrl}
          rawImageDataUrl={asset?.rawImageDataUrl}
          selectedSource={selectedSource}
          onSelectedSourceChange={onSelectedSourceChange}
          materialName={currentMaterialDef?.name || params.material}
          seamReport={activeReport}
          generationMetadata={asset?.generationMetadata}
          onTextureSelect={onTextureSelect}
          className="w-full h-full rounded-none border-none p-0 flex-1"
          hideSidebar={true}
        />
      </div>

      {/* Lower Area: Integrated Generator Control Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shrink-0 flex flex-col gap-2.5 shadow-lg">
        {/* Top Control Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Material Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto py-0.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
              Material:
            </span>
            {TARGET_MATERIALS.map((mat) => {
              const isSelected = params.material === mat.id;
              return (
                <button
                  key={mat.id}
                  id={`material-select-${mat.id}`}
                  onClick={() => handleMaterialSelect(mat.id)}
                  disabled={isBusy}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>{getMaterialIcon(mat.id)}</span>
                  <span>{mat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Advanced toggle & status */}
          <div className="flex items-center space-x-2 text-xs">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center space-x-1 cursor-pointer font-medium"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>{showAdvanced ? 'Hide Options' : 'More Options'}</span>
              {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Prompt & Action Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <input
                id="input-additional-prompt"
                type="text"
                value={params.additionalPrompt ?? ''}
                disabled={isBusy}
                onChange={(e) =>
                  onParamsChange({
                    ...params,
                    additionalPrompt: e.target.value,
                    // reset custom prompt override if user modifies guidance
                    customPrompt: undefined,
                  })
                }
                placeholder="Guidance e.g. mossy patches, weathered cracks..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-24 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPromptInspector(!showPromptInspector)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-amber-400 hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                title="Inspect or edit full prompt string sent to AI model"
              >
                <Eye className="w-3 h-3" />
                <span>Prompt</span>
              </button>
            </div>
          </div>

          {/* Primary Action Button (Generate vs Regenerate) */}
          <div className="flex items-center space-x-2 shrink-0">
            {asset && (
              <button
                id="btn-reprocess-tile"
                type="button"
                onClick={onReprocess}
                disabled={isBusy}
                className="py-2 px-3 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Reprocess active asset with TileProcessor"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">Reprocess</span>
              </button>
            )}

            <button
              id={asset ? 'btn-regenerate-tile' : 'btn-generate-tile'}
              onClick={onGenerate}
              disabled={isBusy}
              className="py-2 px-5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:from-amber-600 active:to-amber-700 text-slate-950 text-xs font-bold uppercase tracking-wide flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  <span>{generationState.currentStep || 'GENERATING'}</span>
                </>
              ) : asset ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>REGENERATE TILE</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>GENERATE TILE</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Expandable Live Prompt Inspector & Override Box */}
        {showPromptInspector && (
          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs font-mono animate-in fade-in duration-100">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Edit2 className="w-3.5 h-3.5" />
                <span>Exact Prompt String Sent To AI Model</span>
              </span>
              {params.customPrompt && (
                <button
                  type="button"
                  onClick={() => onParamsChange({ ...params, customPrompt: undefined })}
                  className="text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to Auto</span>
                </button>
              )}
            </div>

            <div>
              <label className="text-[10px] text-slate-500 uppercase block mb-1">Positive Prompt (Editable Override)</label>
              <textarea
                rows={2}
                value={params.customPrompt ?? liveStructuredPrompt.builtPrompt}
                onChange={(e) =>
                  onParamsChange({
                    ...params,
                    customPrompt: e.target.value,
                  })
                }
                disabled={isBusy}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-emerald-300 focus:outline-none focus:border-amber-500 resize-none font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 uppercase block mb-1">Negative Prompt Payload (Auto-generated)</label>
              <div className="p-2 bg-slate-900 border border-slate-800 rounded text-[11px] text-slate-400 leading-tight">
                {liveStructuredPrompt.negativePrompt}
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Advanced Options */}
        {showAdvanced && (
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Style Selector */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Visual Style</label>
              <div className="flex flex-wrap gap-1">
                {TARGET_STYLES.map((st) => (
                  <button
                    key={st.id}
                    id={`style-select-${st.id}`}
                    onClick={() => onParamsChange({ ...params, style: st.id })}
                    disabled={isBusy}
                    className={`px-2 py-1 rounded text-[11px] border cursor-pointer ${
                      params.style === st.id
                        ? 'bg-indigo-950 border-indigo-500 text-indigo-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Detail Level */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Surface Detail</label>
              <div className="flex gap-1">
                {(['subtle', 'medium', 'high', 'ultra'] as DetailLevel[]).map((d) => (
                  <button
                    key={d}
                    id={`detail-select-${d}`}
                    onClick={() => onParamsChange({ ...params, detail: d })}
                    disabled={isBusy}
                    className={`flex-1 py-1 rounded text-[11px] border text-center capitalize cursor-pointer ${
                      (params.detail || 'high') === d
                        ? 'bg-sky-950 border-sky-500 text-sky-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Tile Processing Controls */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-semibold">
                <span>Blend Margin</span>
                <span className="font-mono text-emerald-400">{processingOptions.blendMarginPercent ?? 10}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                step={5}
                value={processingOptions.blendMarginPercent ?? 10}
                disabled={isBusy}
                onChange={(e) =>
                  onProcessingOptionsChange({
                    ...processingOptions,
                    blendMarginPercent: Number(e.target.value) as any,
                  })
                }
                className="w-full accent-emerald-500 cursor-pointer disabled:opacity-50"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
