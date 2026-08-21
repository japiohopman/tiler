/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, FileText, AlertTriangle, CheckCircle2, Layers, ShieldAlert, Sparkles } from 'lucide-react';
import { ExportOptions, Tile } from '../types';
import { getExportSourceInfo } from '../utils/exportUtils';

interface ExportPanelProps {
  currentTile: Tile | null;
  onExport: (options: ExportOptions) => void;
  isExporting: boolean;
  exportStatus?: 'idle' | 'exporting' | 'completed' | 'error';
  exportMessage?: string;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  currentTile,
  onExport,
  isExporting,
  exportStatus = 'idle',
  exportMessage,
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'png',
    resolution: 512,
    exportGridSheet: false,
    gridSheetSize: 3,
    includeSeamReport: true,
    includeMetadata: true,
  });

  const sourceInfo = getExportSourceInfo(currentTile);
  const validationSummary = currentTile?.validationSummary;
  const isValidationFailed = validationSummary?.finalStatus === 'VALIDATION_FAILED';

  const handleTriggerExport = () => {
    onExport(options);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Download className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            3. Export Game Texture
          </h2>
        </div>
        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
          {options.resolution}×{options.resolution} {options.format.toUpperCase()}
        </span>
      </div>

      {/* Explicit Output Source Banner */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono uppercase text-[10px] tracking-wider">Export Source:</span>
          {sourceInfo.source === 'processed' ? (
            <span id="export-source-badge" className="font-mono text-xs font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-emerald-400 inline mr-1" />
              PROCESSED TILE
            </span>
          ) : sourceInfo.source === 'raw' ? (
            <span id="export-source-badge" className="font-mono text-xs font-semibold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40 flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3 text-amber-400 inline mr-1" />
              RAW PROVIDER IMAGE (RAW FALLBACK)
            </span>
          ) : (
            <span id="export-source-badge" className="font-mono text-xs font-semibold text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              NO IMAGE LOADED
            </span>
          )}
        </div>

        {sourceInfo.isRawFallback && (
          <p className="text-[11px] text-amber-300/90 leading-tight bg-amber-950/40 p-2 rounded border border-amber-500/20">
            Notice: No processed tile available. Exporting raw provider image.
          </p>
        )}
      </div>

      {/* Explicit Validation Gate Warning / Pass State */}
      {currentTile && (
        <div className="text-xs">
          {isValidationFailed ? (
            <div id="validation-gate-status" className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 flex items-start space-x-2 text-red-200">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-[11px]">
                <div className="font-semibold text-red-300 uppercase tracking-wide">Validation Status: VALIDATION FAILED</div>
                <div className="text-red-200/80">Exporting processed tile anyway per design specifications.</div>
              </div>
            </div>
          ) : validationSummary?.finalStatus ? (
            <div id="validation-gate-status" className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-2.5 flex items-center space-x-2 text-emerald-300 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Validation Status: {validationSummary.finalStatus.replace(/_/g, ' ')}</span>
            </div>
          ) : null}
        </div>
      )}

      {/* Export Controls & Toggles */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Output Format */}
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">Target Format</label>
          <div className="flex space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(['png', 'webp', 'jpeg'] as const).map((fmt) => (
              <button
                key={fmt}
                id={`export-fmt-${fmt}`}
                onClick={() => setOptions({ ...options, format: fmt })}
                className={`flex-1 py-1 rounded text-center uppercase font-mono font-medium transition-all cursor-pointer ${
                  options.format === fmt
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Resolution */}
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">Resolution</label>
          <div className="flex space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {([256, 512, 1024] as const).map((res) => (
              <button
                key={res}
                id={`export-res-${res}`}
                onClick={() => setOptions({ ...options, resolution: res })}
                className={`flex-1 py-1 rounded text-center font-mono font-medium transition-all cursor-pointer ${
                  options.resolution === res
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {res}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Companion Metadata JSON Toggle */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="font-semibold text-slate-200">Include Companion Metadata (.json)</div>
            <div className="text-[11px] text-slate-400">Exports prompt, seam scores, and reproducibility metadata</div>
          </div>
        </div>
        <input
          type="checkbox"
          id="toggle-include-metadata"
          checked={options.includeMetadata}
          onChange={(e) => setOptions({ ...options, includeMetadata: e.target.checked })}
          className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
        />
      </div>

      {/* Spritesheet Toggle */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <div>
            <div className="font-semibold text-slate-200">Export as 3×3 Tiled Spritesheet</div>
            <div className="text-[11px] text-slate-400">Pre-tiled surface for immediate engine testing</div>
          </div>
        </div>
        <input
          type="checkbox"
          id="toggle-grid-sheet-export"
          checked={options.exportGridSheet}
          onChange={(e) => setOptions({ ...options, exportGridSheet: e.target.checked })}
          className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
        />
      </div>

      {/* Export Status Message Feedback */}
      {exportMessage && (
        <div
          id="export-status-message"
          className={`text-xs p-2.5 rounded-xl border ${
            exportStatus === 'completed'
              ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300'
              : exportStatus === 'error'
              ? 'bg-red-950/50 border-red-500/30 text-red-300'
              : 'bg-slate-950/50 border-slate-800 text-slate-300'
          }`}
        >
          {exportMessage}
        </div>
      )}

      {/* Export Action Button */}
      <button
        id="btn-download-export"
        onClick={handleTriggerExport}
        disabled={isExporting || sourceInfo.source === 'none'}
        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 border border-emerald-500/30 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4 text-white" />
        <span>
          {isExporting
            ? 'Preparing Export File...'
            : `Export ${sourceInfo.source === 'raw' ? 'Raw Image' : 'Tile'} (${options.resolution}×${
                options.resolution
              } ${options.format.toUpperCase()})`}
        </span>
      </button>
    </div>
  );
};
