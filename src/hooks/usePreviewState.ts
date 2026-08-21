/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { PreviewState, TilePreviewMode } from '../types';

export function usePreviewState() {
  const [previewState, setPreviewState] = useState<PreviewState>({
    selectedSource: 'processed',
    mode: '3x3',
    showGrid: true,
  });

  const setSelectedSource = useCallback((source: 'processed' | 'raw') => {
    setPreviewState((prev) => ({ ...prev, selectedSource: source }));
  }, []);

  const setPreviewMode = useCallback((mode: TilePreviewMode) => {
    setPreviewState((prev) => ({ ...prev, mode }));
  }, []);

  const setShowGrid = useCallback((showGrid: boolean) => {
    setPreviewState((prev) => ({ ...prev, showGrid }));
  }, []);

  return {
    previewState,
    setPreviewState,
    setSelectedSource,
    setPreviewMode,
    setShowGrid,
  };
}
