/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { AppShell } from './components/app/AppShell';
import { AssetExplorer } from './components/explorer/AssetExplorer';
import { Workspace } from './components/workspace/Workspace';
import { Inspector } from './components/inspector/Inspector';
import { ContextMenu, ContextMenuState } from './components/context/ContextMenu';
import { BenchmarkWindow } from './components/windows/BenchmarkWindow';
import { SaveAsModal } from './components/windows/SaveAsModal';
import { ImageEditor } from './components/editor/ImageEditor';
import { DeveloperTestPanel } from './components/DeveloperTestPanel';
import { useWorkspaceState } from './hooks/useWorkspaceState';
import { WorkspaceAsset } from './types';

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

  // Modals and Context Menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    type: 'preview',
    targetAsset: null,
  });

  const [isSaveAsOpen, setIsSaveAsOpen] = useState<boolean>(false);

  // Rename asset handler (immutable update via hook action)
  const handleRenameAsset = useCallback(
    (id: string, newName: string) => {
      actions.renameAsset(id, newName);
      actions.setNotification({ message: `Renamed asset to "${newName}"`, type: 'info' });
    },
    [actions]
  );

  // Context menu triggers
  const handleContextMenuAsset = useCallback((e: React.MouseEvent, item: WorkspaceAsset) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type: 'asset',
      targetAsset: item,
    });
  }, []);

  const handleContextMenuPreview = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type: 'preview',
      targetAsset: asset,
    });
  }, [asset]);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <>
      <AppShell
        state={state}
        actions={{
          ...actions,
          onSaveAsDocument: () => setIsSaveAsOpen(true),
        }}
      >
      {{
        explorer: (
          <AssetExplorer
            assets={assets}
            currentAssetId={currentAssetId}
            onSelectAsset={actions.selectAsset}
            onDeleteAsset={actions.deleteAsset}
            onRenameAsset={handleRenameAsset}
            onContextMenuAsset={handleContextMenuAsset}
            onGenerate={actions.handleGenerate}
          />
        ),

        workspace: (
          activeView === 'editor' ? (
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
              <ImageEditor
                asset={asset}
                onApplyEdits={(editedDataUrl) => {
                  actions.handleApplyEdits(editedDataUrl);
                  actions.setActiveView('workspace');
                }}
                onCancel={() => actions.setActiveView('workspace')}
                onResetEdits={actions.handleResetEdits}
              />
            </div>
          ) : (
            <Workspace
              asset={asset}
              selectedSource={preview.selectedSource}
              onSelectedSourceChange={actions.setSelectedSource}
              onTextureSelect={actions.handleTextureSelect}
              onOpenEditor={() => actions.setActiveView('editor')}
              params={config.params}
              onParamsChange={actions.setParams}
              processingOptions={config.processingOptions}
              onProcessingOptionsChange={actions.setProcessingOptions}
              generationState={generation}
              processingState={processing}
              onGenerate={actions.handleGenerate}
              onReprocess={actions.handleReprocess}
              activeProvider={config.activeProvider}
              providerConfigured={config.providerConfigured}
              onContextMenuPreview={handleContextMenuPreview}
            />
          )
        ),

        inspector: (
          <Inspector
            asset={asset}
            selectedSource={preview.selectedSource}
            params={config.params}
            processingOptions={config.processingOptions}
            onProcessingOptionsChange={actions.setProcessingOptions}
            processingState={processing}
            onReprocess={actions.handleReprocess}
            onReanalyze={actions.handleReanalyze}
            onExport={actions.handleExport}
            isExporting={exportState.status === 'exporting'}
            activeProvider={config.activeProvider}
          />
        ),

        benchmarksWindow: (
          <BenchmarkWindow
            isOpen={activeView === 'processor'}
            onClose={() => actions.setActiveView('workspace')}
            onTileProcessed={actions.handleTileFromProcessor}
          />
        ),

        saveAsModal: (
          <SaveAsModal
            isOpen={isSaveAsOpen}
            onClose={() => setIsSaveAsOpen(false)}
            onSave={(fileName) => {
              actions.setNotification({ message: `Saved document as ${fileName}`, type: 'success' });
            }}
            defaultName={asset ? `${asset.name.replace(/\s+/g, '_')}.tile` : 'Stone_Floor_01.tile'}
          />
        ),
      }}
    </AppShell>

    {/* Right-click Context Menu */}
    <ContextMenu
      menuState={contextMenu}
      onClose={handleCloseContextMenu}
      onSelectAsset={(id) => {
        actions.selectAsset(id);
        actions.setActiveView('workspace');
      }}
      onRenameAsset={handleRenameAsset}
      onDeleteAsset={actions.deleteAsset}
      onOpenEditor={() => actions.setActiveView('editor')}
      onReprocess={() => actions.handleReprocess()}
      onExport={() => actions.setActiveView('workspace')}
      onGenerateVariant={(item) => {
        actions.setParams({
          material: item.material,
          style: item.style || 'stylized',
          customPrompt: item.prompt,
          resolution: item.resolution,
        });
        actions.handleGenerate();
      }}
    />
    </>
  );
}
