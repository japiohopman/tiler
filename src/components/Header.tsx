/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Layers, Sparkles, Sliders, CheckCircle2, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  backendStatus: 'online' | 'offline' | 'checking';
  activeView: 'workspace' | 'editor' | 'processor';
  onViewChange: (view: 'workspace' | 'editor' | 'processor') => void;
}

export const Header: React.FC<HeaderProps> = ({ backendStatus, activeView, onViewChange }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 sm:px-6 py-3.5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Title & Purpose */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-sky-500 to-emerald-500 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Layers className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-lg font-bold tracking-tight text-white">AI Tile Generator</h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Phase 1 Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Deterministic Sharp 2D seamless tile processing engine
            </p>
          </div>
        </div>

        {/* View Mode Switcher & Backend Status */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center p-1 rounded-lg bg-slate-950 border border-slate-800 text-xs">
            <button
              id="view-workspace-btn"
              onClick={() => onViewChange('workspace')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                activeView === 'workspace'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tile Preview
            </button>
            <button
              id="view-editor-btn"
              onClick={() => onViewChange('editor')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                activeView === 'editor'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Image Editor
            </button>
            <button
              id="view-processor-btn"
              onClick={() => onViewChange('processor')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                activeView === 'processor'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Engine & Tests
            </button>
          </div>

          {/* Backend Status Pill */}
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs border ${
              backendStatus === 'online'
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30'
                : backendStatus === 'checking'
                ? 'bg-amber-950/50 text-amber-300 border-amber-500/30'
                : 'bg-rose-950/50 text-rose-300 border-rose-500/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                backendStatus === 'online'
                  ? 'bg-emerald-400 animate-pulse'
                  : backendStatus === 'checking'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-rose-400'
              }`}
            />
            <span className="capitalize font-mono text-[11px]">
              {backendStatus === 'online' ? 'Engine Ready' : backendStatus}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
