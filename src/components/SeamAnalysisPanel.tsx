/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Info,
  Eye,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { EdgeRegionDepth, SeamAnalysisResult } from '../types';

interface SeamAnalysisPanelProps {
  report?: SeamAnalysisResult;
  isLoading?: boolean;
  onReanalyze?: (threshold: number, edgeRegion: EdgeRegionDepth) => void;
}

export const SeamAnalysisPanel: React.FC<SeamAnalysisPanelProps> = ({
  report,
  isLoading,
  onReanalyze,
}) => {
  const [showDiagnosticMap, setShowDiagnosticMap] = useState<boolean>(false);
  const [threshold, setThreshold] = useState<number>(report?.threshold ?? 0.05);
  const [edgeRegion, setEdgeRegion] = useState<EdgeRegionDepth>(
    (report?.edgeRegion as EdgeRegionDepth) ?? 4
  );

  if (isLoading) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-center min-h-[160px]">
        <div className="text-center space-y-2">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono">
            Executing pixel-level mathematical seam analysis...
          </p>
        </div>
      </div>
    );
  }

  // Normalized scores (0 = perfect match, higher = discontinuity)
  const hScore = report?.horizontalScore ?? 0.0;
  const vScore = report?.verticalScore ?? 0.0;
  const overallScore = report?.overallScore ?? 0.0;
  const isPass = report?.pass ?? true;
  const currentThreshold = report?.threshold ?? threshold;
  const currentEdgeRegion = report?.edgeRegion ?? edgeRegion;

  const handleSettingChange = (newThreshold: number, newRegion: EdgeRegionDepth) => {
    setThreshold(newThreshold);
    setEdgeRegion(newRegion);
    if (onReanalyze) {
      onReanalyze(newThreshold, newRegion);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            Objective Seam Analyzer
          </h2>
        </div>
        <div
          className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
            isPass
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
          }`}
        >
          {isPass ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>PASSED (≤ {currentThreshold})</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>SEAM DISCONTINUITY</span>
            </>
          )}
        </div>
      </div>

      {/* 3 Core Mathematical Scores */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* 1. Horizontal Seam Score (Right vs Left) */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-400 mb-0.5">
              1. Horizontal Seam
            </div>
            <div className="text-[10px] text-slate-500">Right vs. Left Edge</div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono">
            <span
              className={
                hScore <= currentThreshold
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }
            >
              {hScore.toFixed(4)}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {hScore === 0 ? '0 (Identical)' : `${(hScore * 100).toFixed(1)}% delta`}
          </div>
        </div>

        {/* 2. Vertical Seam Score (Bottom vs Top) */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-400 mb-0.5">
              2. Vertical Seam
            </div>
            <div className="text-[10px] text-slate-500">Bottom vs. Top Edge</div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono">
            <span
              className={
                vScore <= currentThreshold
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }
            >
              {vScore.toFixed(4)}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {vScore === 0 ? '0 (Identical)' : `${(vScore * 100).toFixed(1)}% delta`}
          </div>
        </div>

        {/* 3. Overall Seam Score */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-400 mb-0.5">
              3. Overall Score
            </div>
            <div className="text-[10px] text-slate-500">Normalized Composite</div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono">
            <span
              className={
                overallScore <= currentThreshold
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }
            >
              {overallScore.toFixed(4)}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {overallScore === 0 ? '0 (Perfect)' : `${(overallScore * 100).toFixed(1)}% avg`}
          </div>
        </div>
      </div>

      {/* Configurable Edge Region & Threshold Controls */}
      <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 space-y-2.5 text-xs">
        <div className="flex items-center justify-between text-slate-300">
          <span className="flex items-center space-x-1.5 font-medium">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Analysis Parameters</span>
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Band: {currentEdgeRegion}px • Threshold: {currentThreshold}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Edge Region Depth (1, 2, 4, 8 px) */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">
              Edge Region Width:
            </label>
            <div className="grid grid-cols-4 gap-1">
              {([1, 2, 4, 8] as EdgeRegionDepth[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleSettingChange(threshold, d)}
                  className={`py-1 text-center rounded text-[11px] font-mono font-semibold transition-all ${
                    currentEdgeRegion === d
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {d}px
                </button>
              ))}
            </div>
          </div>

          {/* Threshold selector */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">
              Tolerance Threshold:
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[0.01, 0.05, 0.1].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleSettingChange(t, edgeRegion)}
                  className={`py-1 text-center rounded text-[11px] font-mono font-semibold transition-all ${
                    currentThreshold === t
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostic Heatmap Toggle */}
      {report?.diagnosticMapDataUrl && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowDiagnosticMap(!showDiagnosticMap)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 transition-colors"
          >
            <span className="flex items-center space-x-1.5">
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              <span>Diagnostic Seam Heatmap</span>
            </span>
            <span className="text-[11px] text-sky-400 underline">
              {showDiagnosticMap ? 'Hide Visual Map' : 'View Heatmap'}
            </span>
          </button>

          {showDiagnosticMap && (
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-center">
              <div className="relative inline-block border border-slate-800 rounded-lg overflow-hidden max-w-[240px] mx-auto">
                <img
                  src={report.diagnosticMapDataUrl}
                  alt="Seam Difference Diagnostic Heatmap"
                  className="w-full h-auto aspect-square"
                />
              </div>
              <div className="flex items-center justify-center space-x-3 text-[10px] text-slate-400">
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Match (≤ {currentThreshold})</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  <span>Mismatch (&gt; {currentThreshold})</span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status messages / Discontinuities */}
      <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/80 text-xs space-y-1">
        <div className="text-slate-300 font-medium flex items-center space-x-1.5">
          <Info className="w-3.5 h-3.5 text-amber-400" />
          <span>Technical Seam Assessment</span>
        </div>
        <p className="text-slate-400 text-[11px] leading-relaxed">
          {report?.issues && report.issues.length > 0
            ? report.issues.join(' • ')
            : `Mathematically seamless: all evaluated edge boundary pixels across the ${currentEdgeRegion}px sampling depth conform to tolerance threshold ≤ ${currentThreshold}.`}
        </p>
      </div>
    </div>
  );
};
