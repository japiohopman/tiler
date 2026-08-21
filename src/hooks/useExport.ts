/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { ExportOptions, ExportState, WorkspaceAsset } from '../types';
import { tileApiClient } from '../services/apiClient';
import { transitionExportState } from '../utils/workspaceTransitions';

export function useExport(onNotify?: (message: string, type: 'info' | 'success' | 'warn') => void) {
  const [exportState, setExportState] = useState<ExportState>({
    status: 'idle',
  });

  const handleExport = useCallback(
    async (asset: WorkspaceAsset | null, options: ExportOptions, fallbackMaterial: string = 'texture') => {
      if (!asset || (!asset.processedImageDataUrl && !asset.rawImageDataUrl)) {
        onNotify?.(`Generate a ${fallbackMaterial} texture first to export ${options.resolution}×${options.resolution} ${options.format.toUpperCase()} asset.`, 'info');
        return;
      }

      setExportState(transitionExportState('exporting'));
      try {
        const blob = await tileApiClient.exportTile(asset, options);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${asset.material}_${options.resolution}x${options.resolution}.${options.format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setExportState(transitionExportState('completed'));
        onNotify?.(`Exported ${asset.material} texture as ${options.resolution}×${options.resolution} ${options.format.toUpperCase()}`, 'success');
      } catch (err: any) {
        setExportState(transitionExportState('error', err.message || 'Export failed'));
        onNotify?.(`Export notice: ${err.message || 'Export handler ready'}`, 'warn');
      } finally {
        setTimeout(() => {
          setExportState((prev) => (prev.status === 'completed' ? transitionExportState('idle') : prev));
        }, 1500);
      }
    },
    [onNotify]
  );

  return {
    exportState,
    setExportState,
    handleExport,
  };
}
