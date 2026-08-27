/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MenuBar } from './MenuBar';
import { ToolBar } from './ToolBar';
import { StatusBar } from './StatusBar';
import { WorkspaceState } from '../../types';

interface AppShellProps {
  state: WorkspaceState;
  actions: any;
  children: {
    explorer: React.ReactNode;
    workspace: React.ReactNode;
    inspector: React.ReactNode;
    benchmarksWindow?: React.ReactNode;
    saveAsModal?: React.ReactNode;
  };
}

export const AppShell: React.FC<AppShellProps> = ({ state, actions, children }) => {
  const [showExplorer, setShowExplorer] = useState<boolean>(true);
  const [showInspector, setShowInspector] = useState<boolean>(true);

  const {
    activeView,
    backendStatus,
    config,
    generation,
    processing,
    asset,
    preview,
    export: exportState,
    notification,
  } = state;

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 select-none">
      {/* 1. Top Application Menu Bar */}
      <MenuBar
        onNewDocument={() => actions.setNotification?.({ message: 'Created new tile workspace', type: 'info' })}
        onOpenDocument={() => actions.setNotification?.({ message: 'Use Asset Explorer to select tiles', type: 'info' })}
        onSaveDocument={() => actions.setNotification?.({ message: 'Tile workspace state saved locally', type: 'success' })}
        onSaveAsDocument={() => actions.setNotification?.({ message: 'Save As modal opened', type: 'info' })}
        onExport={() => actions.handleExport?.({ format: 'png', resolution: 512, exportGridSheet: false, gridSheetSize: 3, includeSeamReport: true, includeMetadata: true })}
        onOpenEditor={() => actions.setActiveView('editor')}
        onToggleExplorer={() => setShowExplorer(!showExplorer)}
        onToggleInspector={() => setShowInspector(!showInspector)}
        onToggleGrid={() => actions.setShowGrid(!preview.showGrid)}
        onSetPreviewMode={actions.setPreviewMode}
        onSetSelectedSource={actions.setSelectedSource}
        onGenerate={actions.handleGenerate}
        onReprocess={actions.handleReprocess}
        onOpenBenchmarks={() => actions.setActiveView('processor')}
        onViewChange={actions.setActiveView}
        activeView={activeView}
        showExplorer={showExplorer}
        showInspector={showInspector}
      />

      {/* 2. Compact Application Toolbar */}
      <ToolBar
        onNewDocument={() => actions.setNotification?.({ message: 'Created new tile workspace', type: 'info' })}
        onOpenDocument={() => actions.setNotification?.({ message: 'Use Asset Explorer to select tiles', type: 'info' })}
        onSaveDocument={() => actions.setNotification?.({ message: 'Tile workspace state saved locally', type: 'success' })}
        onExport={() => actions.handleExport?.({ format: 'png', resolution: 512, exportGridSheet: false, gridSheetSize: 3, includeSeamReport: true, includeMetadata: true })}
        previewMode={preview.mode}
        onSetPreviewMode={actions.setPreviewMode}
        selectedSource={preview.selectedSource}
        onSetSelectedSource={actions.setSelectedSource}
        hasRawImage={Boolean(asset?.rawImageDataUrl)}
        hasProcessedImage={Boolean(asset?.processedImageDataUrl)}
        showGrid={preview.showGrid}
        onToggleGrid={() => actions.setShowGrid(!preview.showGrid)}
        onOpenEditor={() => actions.setActiveView('editor')}
        onGenerate={actions.handleGenerate}
        onReprocess={actions.handleReprocess}
        showExplorer={showExplorer}
        onToggleExplorer={() => setShowExplorer(!showExplorer)}
        showInspector={showInspector}
        onToggleInspector={() => setShowInspector(!showInspector)}
        isGenerating={generation.status === 'generating' || generation.status === 'processing' || generation.status === 'analyzing'}
        isProcessing={processing.status === 'processing' || processing.status === 'analyzing'}
        activeProvider={config.activeProvider}
      />

      {/* 3. Main Central Viewport (3-Column Layout) */}
      <main className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* Left Column: Asset Explorer */}
        {showExplorer && (
          <aside className="w-64 sm:w-72 shrink-0 border-r border-slate-800 bg-slate-900/95 flex flex-col h-full overflow-hidden z-20">
            {children.explorer}
          </aside>
        )}

        {/* Center: Main Workspace Surface */}
        <section className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-950 relative">
          {children.workspace}
        </section>

        {/* Right Column: Properties / Inspector */}
        {showInspector && (
          <aside className="w-80 shrink-0 border-l border-slate-800 bg-slate-900/95 flex flex-col h-full overflow-y-auto z-20">
            {children.inspector}
          </aside>
        )}

        {/* Utility Windows / Overlays (Benchmarks / SaveAs) */}
        {children.benchmarksWindow}
        {children.saveAsModal}
      </main>

      {/* 4. Bottom Status Bar */}
      <StatusBar
        generationState={generation}
        processingState={processing}
        asset={asset}
        backendStatus={backendStatus}
        activeProvider={config.activeProvider}
        notification={notification}
        onClearNotification={() => actions.setNotification(null)}
      />
    </div>
  );
};
