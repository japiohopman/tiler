/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, BarChart3, Minimize2 } from 'lucide-react';
import { DeveloperTestPanel } from '../DeveloperTestPanel';

interface BenchmarkWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onTileProcessed?: (dataUrl: string) => void;
}

export const BenchmarkWindow: React.FC<BenchmarkWindowProps> = ({
  isOpen,
  onClose,
  onTileProcessed,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Window Title Bar */}
        <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between select-none">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-white text-xs uppercase tracking-wider">
              ENGINE BENCHMARKS & TEST HARNESS
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-950 text-sky-300 border border-sky-800">
              Secondary Window
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close Benchmark Window"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Window Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950">
          <DeveloperTestPanel onTileProcessed={onTileProcessed} />
        </div>
      </div>
    </div>
  );
};
