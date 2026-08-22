/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DEFAULT_COLOR,
  DEFAULT_CROP,
  DEFAULT_TRANSFORM,
  EditorState,
  ImageEditorColor,
  ImageEditorCrop,
  ImageEditorTransform,
  renderImageToCanvas,
} from '../utils/imageEditorCanvas';
import { WorkspaceAsset } from '../types';

export type EditorTab = 'transform' | 'crop' | 'color';
export type ComparisonMode = 'edit' | 'raw';

export interface UseImageEditorOptions {
  asset: WorkspaceAsset | null;
  onApplyEdits: (editedDataUrl: string) => void;
  onCancel?: () => void;
  onResetEdits?: () => void;
}

export function useImageEditor({
  asset,
  onApplyEdits,
  onCancel,
  onResetEdits,
}: UseImageEditorOptions) {
  const [activeTab, setActiveTab] = useState<EditorTab>('transform');
  const [transform, setTransform] = useState<ImageEditorTransform>({ ...DEFAULT_TRANSFORM });
  const [crop, setCrop] = useState<ImageEditorCrop>({ ...DEFAULT_CROP });
  const [color, setColor] = useState<ImageEditorColor>({ ...DEFAULT_COLOR });
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('edit');
  const [editorTileMode, setEditorTileMode] = useState<'single' | '3x3'>('single');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset editor adjustments when selected asset changes
  useEffect(() => {
    setTransform({ ...DEFAULT_TRANSFORM });
    setCrop({ ...DEFAULT_CROP });
    setColor({ ...DEFAULT_COLOR });
    setComparisonMode('edit');
    setErrorMessage(null);
  }, [asset?.id]);

  const editorState: EditorState = useMemo(
    () => ({
      transform,
      crop,
      color,
    }),
    [transform, crop, color]
  );

  // Check whether any uncommitted edits have been made
  const isDirty = useMemo(() => {
    const isTransDirty =
      transform.rotation !== 0 || transform.flipH || transform.flipV;
    const isCropDirty = crop.mode !== 'none';
    const isColorDirty =
      color.brightness !== 0 ||
      color.contrast !== 0 ||
      color.saturation !== 0 ||
      color.hue !== 0;
    return isTransDirty || isCropDirty || isColorDirty;
  }, [transform, crop, color]);

  // Transform actions
  const rotateCW = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      rotation: ((prev.rotation + 90) % 360) as 0 | 90 | 180 | 270,
    }));
  }, []);

  const rotateCCW = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      rotation: ((prev.rotation + 270) % 360) as 0 | 90 | 180 | 270,
    }));
  }, []);

  const toggleFlipH = useCallback(() => {
    setTransform((prev) => ({ ...prev, flipH: !prev.flipH }));
  }, []);

  const toggleFlipV = useCallback(() => {
    setTransform((prev) => ({ ...prev, flipV: !prev.flipV }));
  }, []);

  const resetTransform = useCallback(() => {
    setTransform({ ...DEFAULT_TRANSFORM });
  }, []);

  // Crop actions
  const setCropMode = useCallback((mode: 'none' | '1:1' | 'free') => {
    setCrop((prev) => ({
      ...prev,
      mode,
      x: mode === 'free' ? 10 : prev.x,
      y: mode === 'free' ? 10 : prev.y,
      width: mode === 'free' ? 80 : prev.width,
      height: mode === 'free' ? 80 : prev.height,
    }));
  }, []);

  const updateCrop = useCallback((partial: Partial<ImageEditorCrop>) => {
    setCrop((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetCrop = useCallback(() => {
    setCrop({ ...DEFAULT_CROP });
  }, []);

  // Color actions
  const setColorValue = useCallback((key: keyof ImageEditorColor, value: number) => {
    setColor((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetColor = useCallback((key?: keyof ImageEditorColor) => {
    if (key) {
      setColor((prev) => ({ ...prev, [key]: DEFAULT_COLOR[key] }));
    } else {
      setColor({ ...DEFAULT_COLOR });
    }
  }, []);

  // Reset current uncommitted editor adjustments
  const resetAll = useCallback(() => {
    setTransform({ ...DEFAULT_TRANSFORM });
    setCrop({ ...DEFAULT_CROP });
    setColor({ ...DEFAULT_COLOR });
    setErrorMessage(null);
  }, []);

  // Remove committed edits entirely (Reset All Changes to raw source)
  const handleResetCommittedEdits = useCallback(() => {
    resetAll();
    if (onResetEdits) {
      onResetEdits();
    }
  }, [resetAll, onResetEdits]);

  // Apply edits handler
  const handleApply = useCallback(
    (loadedImage: HTMLImageElement | null) => {
      if (!asset) {
        setErrorMessage('No asset available to edit.');
        return;
      }
      if (!loadedImage) {
        setErrorMessage('Image source not loaded.');
        return;
      }

      try {
        const offscreenCanvas = document.createElement('canvas');
        renderImageToCanvas(offscreenCanvas, loadedImage, editorState);
        const dataUrl = offscreenCanvas.toDataURL('image/png');

        if (!dataUrl || dataUrl === 'data:,') {
          throw new Error('Failed to generate image Data URL.');
        }

        onApplyEdits(dataUrl);
        setErrorMessage(null);
      } catch (err: any) {
        console.error('Failed to apply image edits:', err);
        setErrorMessage(err.message || 'Failed to apply image transformations.');
      }
    },
    [asset, editorState, onApplyEdits]
  );

  // Cancel edits handler
  const handleCancel = useCallback(() => {
    resetAll();
    if (onCancel) {
      onCancel();
    }
  }, [resetAll, onCancel]);

  return {
    editorState,
    activeTab,
    setActiveTab,
    comparisonMode,
    setComparisonMode,
    editorTileMode,
    setEditorTileMode,
    isDirty,
    errorMessage,
    setErrorMessage,
    rotateCW,
    rotateCCW,
    toggleFlipH,
    toggleFlipV,
    resetTransform,
    setCropMode,
    updateCrop,
    resetCrop,
    setColorValue,
    resetColor,
    resetAll,
    handleResetCommittedEdits,
    handleApply,
    handleCancel,
  };
}
