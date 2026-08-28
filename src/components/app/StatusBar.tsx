/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Info,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { GenerationState, ProcessingState, WorkspaceAsset } from '../../types';

interface StatusBarProps {
  generationState?: GenerationState;
  processingState?: ProcessingState;
  asset?: WorkspaceAsset | null;
  backendStatus?: 'online' | 'offline' | 'checking';
  activeProvider?: string;
  notification?: { message: string; type: 'info' | 'success' | 'warn' } | null;
  onClearNotification?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  generationState,
  processingState,
  asset,
  backendStatus = 'online',
  activeProvider = 'pixazo',
  notification,
  onClearNotification,
}) => {
  const isGenerating = generationState?.status === 'generating' || generationState?.status === 'processing' || generationState?.status === 'analyzing';
  const isProcessing = processingState?.status === 'processing' || processingState?.status === 'analyzing';
  const isError = generationState?.status === 'error' || processingState?.status === 'error';

  const currentStep = generationState?.currentStep || processingState?.currentStep;
  const progressPercent = generationState?.progressPercent;

  const finalStatus = asset?.validationSummary?.finalStatus;
  const isPass = finalStatus === 'PASS_RAW' || finalStatus === 'PASS_AFTER_PROCESSING' || (asset ? asset.isTileable : false);

  const getProviderLabel = () => {
    if (activeProvider === 'pixazo') return 'Pixazo SDXL';
    if (activeProvider === 'mock') return 'Mock AI';
    if (activeProvider === 'gemini') return 'Gemini AI';
    if (activeProvider === 'pollinations') return 'Pollinations AI';
    if (activeProvider === 'huggingface') return 'HuggingFace';
    return activeProvider.toUpperCase();
  };

  return (
    <footer className="bg-[#0a0a0a] border-t border-white/5 px-4 py-1.5 flex items-center justify-between text-[9px] font-mono text-white/40 select-none z-40 shrink-0">
      {/* Left: Pipeline Execution Status */}
      <div className="flex items-center space-x-3 min-w-0">
        <div className="flex items-center space-x-1.5 shrink-0">
          {isGenerating || isProcessing ? (
            <span className="flex items-center space-x-1.5 text-amber-400 font-bold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span className="uppercase tracking-wide">
                {currentStep || 'WORKING...'} {progressPercent ? `${progressPercent}%` : ''}
              </span>
            </span>
          ) : isError ? (
            <span className="flex items-center space-x-1.5 text-rose-400 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>ERROR OCCURRED</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1.5 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>READY</span>
            </span>
          )}
        </div>

        {/* Progress bar visual indicator */}
        {(isGenerating || isProcessing) && progressPercent !== undefined && (
          <div className="w-24 sm:w-32 bg-slate-900 rounded-full h-1.5 border border-slate-800 overflow-hidden hidden sm:block">
            <div
              className="bg-amber-400 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Notification message ticker */}
        {notification && (
          <div className="hidden md:flex items-center space-x-1 text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded truncate max-w-xs">
            <Info className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate">{notification.message}</span>
            {onClearNotification && (
              <button
                onClick={onClearNotification}
                className="hover:text-white font-bold ml-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* Center: Selected Asset Identity & Specs */}
      <div className="hidden lg:flex items-center space-x-3 text-slate-300">
        {asset ? (
          <>
            <span className="font-semibold text-slate-200">{asset.name}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">{asset.resolution}×{asset.resolution}px</span>
            <span className="text-slate-600">|</span>
            <span className="capitalize text-slate-400">{asset.material}</span>
            <span className="text-slate-600">|</span>
            <span
              id="seam-status-badge"
              className={`font-bold text-[10px] px-1.5 py-0.5 rounded border uppercase ${
                isPass
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
              }`}
            >
              {isPass ? 'SEAM: PASS' : 'SEAM: DISCONTINUOUS'}
            </span>
          </>
        ) : (
          <span className="text-slate-500 italic">No asset loaded in workspace</span>
        )}
      </div>

      {/* Right: Engine Status & Active Provider */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="flex items-center space-x-1.5 text-slate-400">
          <Cpu className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Engine:</span>
          <span className="text-slate-200 font-semibold">{getProviderLabel()}</span>
        </div>

        <span className="text-slate-700">|</span>

        <div className="flex items-center space-x-1">
          <span
            className={`w-2 h-2 rounded-full ${
              backendStatus === 'online'
                ? 'bg-emerald-400'
                : backendStatus === 'checking'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-rose-400'
            }`}
          />
          <span className="capitalize text-[10px] text-slate-400">
            {backendStatus === 'online' ? 'Online' : backendStatus}
          </span>
        </div>
      </div>
    </footer>
  );
};
