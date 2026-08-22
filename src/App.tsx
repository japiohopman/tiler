/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Header } from './components/Header';
import { DeveloperTestPanel } from './components/DeveloperTestPanel';
import { GeneratorPanel } from './components/GeneratorPanel';
import { TilePreview } from './components/TilePreview';
import { SeamAnalysisPanel } from './components/SeamAnalysisPanel';
import { ExportPanel } from './components/ExportPanel';
import { AssetHistoryPanel } from './components/AssetHistoryPanel';
import { ImageEditor } from './components/editor/ImageEditor';
import { TARGET_MATERIALS } from './types';
import { useWorkspaceState } from './hooks/useWorkspaceState';
import { Info } from 'lucide-react';

export default function App() {
  const { state, actions } = useWorkspaceState();

  const {
    activeView,
    backendStatus,
    config,
    generation,
    processing,
    assets,
    currentAssetId,
    asset,
    preview,
    export: exportState,
    notification,
  } = state;

  const currentMaterialDef = TARGET_MATERIALS.find((m) => m.id === config.params.material);

  const activeReport = preview.selectedSource === 'raw'
    ? (asset?.rawSeamReport || asset?.seamReport)
    : asset?.seamReport;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Navigation Header */}
      <Header
        backendStatus={backendStatus}
        activeView={activeView}
        onViewChange={actions.setActiveView}
      />

      {/* Notification Banner */}
      {notification && (
        <div className="bg-slate-900/90 border-b border-amber-500/30 px-6 py-2.5 text-xs flex items-center justify-between text-amber-200">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => actions.setNotification(null)}
              className="text-slate-400 hover:text-white font-mono text-xs ml-4 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {activeView === 'processor' ? (
        <main className="flex-1 py-6">
          <DeveloperTestPanel onTileProcessed={actions.handleTileFromProcessor} />
        </main>
      ) : activeView === 'editor' ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
          <ImageEditor
            asset={asset}
            onApplyEdits={(editedDataUrl) => {
              actions.handleApplyEdits(editedDataUrl);
              actions.setActiveView('workspace');
            }}
            onCancel={() => actions.setActiveView('workspace')}
            onResetEdits={actions.handleResetEdits}
          />

          {/* Asset History Panel in Editor view so user can switch assets */}
          <AssetHistoryPanel
            assets={assets}
            currentAssetId={currentAssetId}
            onSelectAsset={actions.selectAsset}
            onDeleteAsset={actions.deleteAsset}
            activeProvider={config.activeProvider}
          />
        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
          {/* Primary Modular Tile Preview Component */}
          <TilePreview
            imageDataUrl={asset?.processedImageDataUrl}
            rawImageDataUrl={asset?.rawImageDataUrl}
            selectedSource={preview.selectedSource}
            onSelectedSourceChange={actions.setSelectedSource}
            materialName={currentMaterialDef?.name || config.params.material}
            seamReport={activeReport}
            generationMetadata={asset?.generationMetadata}
            onTextureSelect={actions.handleTextureSelect}
            onOpenEditor={() => actions.setActiveView('editor')}
          />

          {/* Asset History Panel */}
          <AssetHistoryPanel
            assets={assets}
            currentAssetId={currentAssetId}
            onSelectAsset={actions.selectAsset}
            onDeleteAsset={actions.deleteAsset}
            activeProvider={config.activeProvider}
          />

          {/* Configuration & Pipeline Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Generator Controls */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              <GeneratorPanel
                params={config.params}
                onParamsChange={actions.setParams}
                processingOptions={config.processingOptions}
                onProcessingOptionsChange={actions.setProcessingOptions}
                generationState={generation}
                processingState={processing}
                onGenerate={actions.handleGenerate}
                onReprocess={actions.handleReprocess}
                currentTile={asset}
                activeProvider={config.activeProvider}
                providerConfigured={config.providerConfigured}
              />
            </div>

            {/* Right Column: Seam Diagnostics & Export */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              <SeamAnalysisPanel
                report={activeReport}
                rawReport={asset?.rawSeamReport}
                validationSummary={asset?.validationSummary}
                selectedSource={preview.selectedSource}
                isLoading={generation.status === 'analyzing' || processing.status === 'analyzing'}
                onReanalyze={actions.handleReanalyze}
              />

              <ExportPanel
                currentTile={asset}
                onExport={actions.handleExport}
                isExporting={exportState.status === 'exporting'}
              />
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
