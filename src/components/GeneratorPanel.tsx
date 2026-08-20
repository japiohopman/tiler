/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Sliders,
  CheckCircle,
  AlertCircle,
  Flame,
  Droplets,
  Trees,
  Gem,
  Waves,
  Mountain,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  DetailLevel,
  GenerationParams,
  GenerationState,
  MaterialDefinition,
  MaterialId,
  StyleDefinition,
  StyleId,
  TARGET_MATERIALS,
  TARGET_STYLES,
  Tile,
  TileProcessingOptions,
} from '../types';

interface GeneratorPanelProps {
  params: GenerationParams;
  onParamsChange: (params: GenerationParams) => void;
  processingOptions: TileProcessingOptions;
  onProcessingOptionsChange: (opts: TileProcessingOptions) => void;
  generationState: GenerationState;
  onGenerate: () => void;
  currentTile?: Tile | null;
  activeProvider?: string;
  providerConfigured?: boolean;
}

// Icon helper for target materials
const getMaterialIcon = (id: MaterialId) => {
  switch (id) {
    case 'cobblestone':
      return <Gem className="w-4 h-4 text-stone-400" />;
    case 'wood':
      return <Mountain className="w-4 h-4 text-amber-500" />;
    case 'water':
      return <Waves className="w-4 h-4 text-sky-400" />;
    case 'grass':
      return <Trees className="w-4 h-4 text-emerald-400" />;
    case 'lava':
      return <Flame className="w-4 h-4 text-red-500" />;
    case 'sand':
      return <Droplets className="w-4 h-4 text-yellow-500" />;
    default:
      return <Gem className="w-4 h-4 text-slate-400" />;
  }
};

const DETAIL_OPTIONS: { id: DetailLevel; label: string; desc: string }[] = [
  { id: 'subtle', label: 'Subtle', desc: 'Clean low-noise surface' },
  { id: 'medium', label: 'Medium', desc: 'Balanced game texture' },
  { id: 'high', label: 'High', desc: 'Rich surface micro-details' },
  { id: 'ultra', label: 'Ultra', desc: 'Intricate fissures & detail' },
];

export const GeneratorPanel: React.FC<GeneratorPanelProps> = ({
  params,
  onParamsChange,
  processingOptions,
  onProcessingOptionsChange,
  generationState,
  onGenerate,
  currentTile,
  activeProvider = 'pixazo',
  providerConfigured = true,
}) => {
  const [showPromptDetails, setShowPromptDetails] = useState<boolean>(false);
  const selectedMaterial = TARGET_MATERIALS.find((m) => m.id === params.material) || TARGET_MATERIALS[0];
  const selectedStyle = TARGET_STYLES.find((s) => s.id === params.style) || TARGET_STYLES[0];
  const currentDetail: DetailLevel = params.detail || 'high';

  const isGenerating = generationState.status === 'generating' || generationState.status === 'processing' || generationState.status === 'analyzing';

  const handleMaterialSelect = (materialId: MaterialId) => {
    const mat = TARGET_MATERIALS.find((m) => m.id === materialId);
    onParamsChange({
      ...params,
      material: materialId,
      additionalPrompt: params.additionalPrompt || mat?.description || '',
    });
  };

  const handleStyleSelect = (styleId: StyleId) => {
    onParamsChange({
      ...params,
      style: styleId,
    });
  };

  const handleDetailSelect = (detail: DetailLevel) => {
    onParamsChange({
      ...params,
      detail,
    });
  };

  const getProviderBadgeLabel = (): string => {
    if (activeProvider === 'pixazo') return 'Pixazo SDXL';
    if (activeProvider === 'mock') return 'Mock Provider';
    if (activeProvider === 'gemini') return 'Gemini AI';
    if (activeProvider === 'pollinations') return 'Pollinations AI';
    if (activeProvider === 'huggingface') return 'Hugging Face';
    return activeProvider.toUpperCase();
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-5 shadow-lg">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            1. AI Texture Generator
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono bg-sky-950/60 text-sky-300 px-2 py-0.5 rounded border border-sky-800/50">
            512×512 PNG
          </span>
          <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
            {getProviderBadgeLabel()}
          </span>
        </div>
      </div>

      {/* Error Banner when API Fails */}
      {generationState.status === 'error' && generationState.errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center space-x-2 font-semibold text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Generation Failed</span>
          </div>
          <p className="text-[11px] text-rose-200/90 leading-relaxed font-mono">
            {generationState.errorMessage}
          </p>
          <p className="text-[10px] text-rose-300/70 pt-1">
            Ensure your provider configuration (e.g., PIXAZO_API_KEY) is set in your server environment.
          </p>
        </div>
      )}

      {/* Target Material Selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>Target Material</span>
          <span className="text-[11px] text-slate-500 font-normal">2D Ground Surfaces</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TARGET_MATERIALS.map((mat) => {
            const isSelected = params.material === mat.id;
            return (
              <button
                key={mat.id}
                id={`material-select-${mat.id}`}
                onClick={() => handleMaterialSelect(mat.id)}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-950/40 border-sky-500/80 shadow-md shadow-sky-500/10 ring-1 ring-sky-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="p-1 rounded-md bg-slate-800/80">{getMaterialIcon(mat.id)}</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: mat.colorHint }}
                  />
                </div>
                <div className="text-xs font-semibold text-slate-200">{mat.name}</div>
                <div className="text-[10px] text-slate-400 capitalize">{mat.category}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Style Preset Selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300">Visual Rendering Style</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {TARGET_STYLES.map((style) => {
            const isSelected = params.style === style.id;
            return (
              <button
                key={style.id}
                id={`style-select-${style.id}`}
                onClick={() => handleStyleSelect(style.id)}
                className={`px-2.5 py-2 rounded-lg border text-left text-xs font-medium transition-all truncate cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-950/60 border-indigo-500/80 text-indigo-200 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
                title={style.description}
              >
                {style.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail Level Selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300">Surface Detail Level</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {DETAIL_OPTIONS.map((item) => {
            const isSelected = currentDetail === item.id;
            return (
              <button
                key={item.id}
                id={`detail-select-${item.id}`}
                onClick={() => handleDetailSelect(item.id)}
                className={`px-2 py-1.5 rounded-lg border text-center text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-950/50 border-sky-500 text-sky-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
                title={item.desc}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Additional Prompt Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300">
            Additional Texture Guidance <span className="text-slate-500 font-normal">(Optional)</span>
          </label>
          <button
            onClick={() => onParamsChange({ ...params, additionalPrompt: '', customPrompt: '' })}
            className="text-[11px] text-slate-400 hover:text-slate-300 cursor-pointer"
          >
            Clear
          </button>
        </div>
        <textarea
          id="input-additional-prompt"
          rows={2}
          value={params.additionalPrompt ?? params.customPrompt ?? ''}
          onChange={(e) =>
            onParamsChange({
              ...params,
              additionalPrompt: e.target.value,
              customPrompt: e.target.value,
            })
          }
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-colors resize-none font-mono"
          placeholder="e.g., mossy patches, weathered cracks, subtle gravel..."
        />

        {/* Dedicated Prompt Builder Inspector Toggle */}
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setShowPromptDetails(!showPromptDetails)}
            className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
          >
            <Info className="w-3 h-3 text-sky-400" />
            <span>Dedicated Orthographic Prompt Rules</span>
            {showPromptDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showPromptDetails && (
            <div className="mt-2 p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 text-[10px] text-slate-400 space-y-1 leading-relaxed">
              <p className="font-semibold text-slate-300">Prompt Builder Enforcements:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-400">
                <li>Top-down 90° direct overhead orthographic view</li>
                <li>Pure flat texture-only surface with uniform coverage</li>
                <li>Flat ambient lighting with no cast shadows or external light direction</li>
                <li>Zero perspective, horizon, sky, characters, objects, or props</li>
                <li>Zero borders, frames, UI, text, or watermarks</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Downstream Sharp Processing Controls */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1.5">
            <Sliders className="w-3.5 h-3.5" />
            <span>Sharp Offset-Crossfade Pipeline</span>
          </span>
          <span className="text-[10px] bg-emerald-950/60 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
            Guaranteed Seamless Tile
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Algorithm</label>
            <select
              id="select-algorithm"
              value={processingOptions.algorithm}
              onChange={(e) =>
                onProcessingOptionsChange({
                  ...processingOptions,
                  algorithm: e.target.value as any,
                })
              }
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="offset-crossfade">Offset + Alpha Crossfade</option>
              <option value="none">Direct Passthrough (Raw AI)</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Blend Margin</span>
              <span className="font-mono text-emerald-400">{processingOptions.blendMarginPercent ?? 10}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={5}
              value={processingOptions.blendMarginPercent ?? 10}
              onChange={(e) =>
                onProcessingOptionsChange({
                  ...processingOptions,
                  blendMarginPercent: Number(e.target.value) as any,
                })
              }
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Generation Action Buttons (Generate & Regenerate) */}
      <div className="space-y-2 pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Primary Generate Button */}
          <button
            id="btn-generate-tile"
            onClick={onGenerate}
            disabled={isGenerating}
            className={`py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 active:from-sky-700 active:to-indigo-700 text-white text-xs font-bold tracking-wide uppercase flex items-center justify-center space-x-2 shadow-lg shadow-sky-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
              currentTile ? 'sm:col-span-1' : 'sm:col-span-2'
            }`}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-sky-200" />
                <span>{generationState.currentStep || 'Generating...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate 512×512 Tile</span>
              </>
            )}
          </button>

          {/* Regenerate Button */}
          {currentTile && (
            <button
              id="btn-regenerate-tile"
              onClick={onGenerate}
              disabled={isGenerating}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold tracking-wide uppercase flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Regenerate another variation with the current prompt"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>Regenerate</span>
            </button>
          )}
        </div>

        {/* Pipeline Architecture Note */}
        <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
          <span>AI Provider → Sharp Offset → Seam Analysis</span>
          <span className="text-emerald-400 font-mono flex items-center space-x-1">
            <CheckCircle className="w-3 h-3 inline" />
            <span>Strict Verification</span>
          </span>
        </div>
      </div>
    </div>
  );
};
