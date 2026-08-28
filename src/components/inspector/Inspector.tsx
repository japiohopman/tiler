/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sliders,
  ChevronDown,
  ChevronUp,
  Cpu,
  BarChart3,
  Download,
  FileCode,
  Info,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  EdgeRegionDepth,
  ExportOptions,
  GenerationParams,
  ProcessingState,
  SeamAnalysisResult,
  TileProcessingOptions,
  ValidationSummary,
  WorkspaceAsset,
} from '../../types';
import { SeamAnalysisPanel } from '../SeamAnalysisPanel';
import { ExportPanel } from '../ExportPanel';

interface InspectorProps {
  asset: WorkspaceAsset | null;
  selectedSource: 'processed' | 'raw';
  params: GenerationParams;
  processingOptions: TileProcessingOptions;
  onProcessingOptionsChange: (opts: TileProcessingOptions) => void;
  processingState: ProcessingState;
  onReprocess: () => void;
  onReanalyze: (threshold: number, edgeRegion: EdgeRegionDepth) => void;
  onExport: (options: ExportOptions) => void;
  isExporting: boolean;
  activeProvider: string;
}

export const Inspector: React.FC<InspectorProps> = ({
  asset,
  selectedSource,
  params,
  processingOptions,
  onProcessingOptionsChange,
  processingState,
  onReprocess,
  onReanalyze,
  onExport,
  isExporting,
  activeProvider,
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    asset: true,
    seam: true,
    processing: true,
    export: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const activeReport = selectedSource === 'raw'
    ? (asset?.rawSeamReport || asset?.seamReport)
    : asset?.seamReport;

  const adherence = asset?.generationMetadata?.promptAdherence;

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-slate-200 select-none text-xs font-mono">
      {/* Inspector Header */}
      <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between bg-[#161616] shrink-0">
        <div className="flex items-center space-x-2">
          <Sliders className="w-3.5 h-3.5 text-red-500" />
          <span className="font-bold text-white uppercase tracking-widest text-[10px]">
            PROPERTIES & DIAGNOSTICS
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
          {asset ? asset.id.slice(0, 8) : 'No Tile'}
        </span>
      </div>

      {/* Accordion Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-sans">
        {/* 1. ASSET PROPERTIES */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden shadow">
          <button
            onClick={() => toggleSection('asset')}
            className="w-full px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between font-semibold text-slate-200 hover:bg-slate-800/80 cursor-pointer text-xs"
          >
            <span className="flex items-center space-x-2">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>Asset Properties</span>
            </span>
            {openSections.asset ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {openSections.asset && (
            <div className="p-3 space-y-2 font-mono text-[11px]">
              {asset ? (
                <>
                  <div className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 font-sans">Name:</span>
                    <span className="font-semibold text-slate-100 truncate max-w-[140px]">{asset.name}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 font-sans">Material Profile:</span>
                    <span className="text-amber-400 font-bold capitalize">{asset.material}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 font-sans">Resolution:</span>
                    <span className="text-slate-200">{asset.resolution} × {asset.resolution} px</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 font-sans">Provider & Model:</span>
                    <span className="text-sky-300">{asset.generationMetadata?.model || activeProvider}</span>
                  </div>

                  {/* Prompt Adherence Summary */}
                  {adherence && (
                    <div className="bg-slate-900 p-2 rounded border border-slate-800 space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 font-sans flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-amber-400" /> Adherence Score:
                        </span>
                        <span className={`font-bold ${adherence.pass ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {adherence.score}/100
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight font-sans">
                        {adherence.details}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-slate-500 italic text-[11px]">No asset selected.</div>
              )}
            </div>
          )}
        </div>

        {/* 2. OBJECTIVE SEAM ANALYZER */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden shadow">
          <button
            onClick={() => toggleSection('seam')}
            className="w-full px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between font-semibold text-slate-200 hover:bg-slate-800/80 cursor-pointer text-xs"
          >
            <span className="flex items-center space-x-2">
              <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Seam Diagnostics</span>
            </span>
            {openSections.seam ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {openSections.seam && (
            <div className="p-2">
              <SeamAnalysisPanel
                report={activeReport}
                rawReport={asset?.rawSeamReport}
                validationSummary={asset?.validationSummary}
                selectedSource={selectedSource}
                isLoading={false}
                onReanalyze={onReanalyze}
              />
            </div>
          )}
        </div>

        {/* 3. TILE PROCESSING CONTROLS */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden shadow">
          <button
            onClick={() => toggleSection('processing')}
            className="w-full px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between font-semibold text-slate-200 hover:bg-slate-800/80 cursor-pointer text-xs"
          >
            <span className="flex items-center space-x-2">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tile Processing Controls</span>
            </span>
            {openSections.processing ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {openSections.processing && (
            <div className="p-3 space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-medium">Processing Algorithm</label>
                <select
                  id="select-algorithm"
                  value={processingOptions.algorithm || 'offset-crossfade'}
                  onChange={(e) =>
                    onProcessingOptionsChange({
                      ...processingOptions,
                      algorithm: e.target.value as any,
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer font-mono"
                >
                  <option value="offset-crossfade">Offset + Alpha Crossfade</option>
                  <option value="none">Direct Passthrough (Raw AI)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-medium">
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

              {asset && (
                <button
                  id="btn-reprocess-tile"
                  type="button"
                  onClick={onReprocess}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${processingState.status === 'processing' ? 'animate-spin' : ''}`} />
                  <span>REPROCESS EXISTING ASSET</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 4. EXPORT GAME TEXTURE */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden shadow">
          <button
            onClick={() => toggleSection('export')}
            className="w-full px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between font-semibold text-slate-200 hover:bg-slate-800/80 cursor-pointer text-xs"
          >
            <span className="flex items-center space-x-2">
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Game Texture</span>
            </span>
            {openSections.export ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {openSections.export && (
            <div className="p-2">
              <ExportPanel
                currentTile={asset}
                onExport={onExport}
                isExporting={isExporting}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
