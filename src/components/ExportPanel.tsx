/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, FileImage, Layers, Check } from 'lucide-react';
import { ExportOptions, Tile } from '../types';

interface ExportPanelProps {
  currentTile: Tile | null;
  onExport: (options: ExportOptions) => void;
  isExporting: boolean;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  currentTile,
  onExport,
  isExporting,
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'png',
    resolution: 512,
    exportGridSheet: false,
    gridSheetSize: 3,
    includeSeamReport: true,
    includeMetadata: true,
  });

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
          512×512 PNG
        </span>
      </div>

      {/* Format & Sheet Options */}
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
                className={`flex-1 py-1 rounded text-center uppercase font-mono font-medium transition-all ${
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
                className={`flex-1 py-1 rounded text-center font-mono font-medium transition-all ${
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

      {/* Grid Sheet Toggle */}
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

      {/* Download Action */}
      <button
        id="btn-download-export"
        onClick={handleTriggerExport}
        disabled={isExporting}
        className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
      >
        <Download className="w-4 h-4 text-emerald-400" />
        <span>
          {isExporting
            ? 'Preparing Game Asset...'
            : `Download ${options.resolution}×${options.resolution} ${options.format.toUpperCase()}`}
        </span>
      </button>
    </div>
  );
};
