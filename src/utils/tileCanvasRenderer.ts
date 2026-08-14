/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TilePreviewMode } from '../types';

export interface TileRenderOptions {
  mode: TilePreviewMode; // 'single' (1x1), '3x3' (3x3 grid), 'infinite' (infinite continuous repeat)
  showGrid: boolean; // toggle grid lines at tile boundaries
  zoom: number; // e.g. 0.25 to 4.0 (1.0 = 100% native 1:1 pixel rendering)
  pan: { x: number; y: number }; // pan offset in pixels
  highlightSeams?: boolean; // Highlight seam discontinuities if failed
  isPass?: boolean; // Seam analysis pass/fail status
  gridColor?: string; // Custom grid line color
}

/**
 * Deterministic Canvas Renderer for Tileable Textures.
 * Guarantees:
 * 1. Exact native pixel dimensions (never stretched or distorted).
 * 2. Zero visual tricks: imageSmoothing is disabled to avoid hiding seam flaws through blur/interpolation.
 * 3. 3 Preview Modes: Single (1x1), 3x3 Grid, and dynamic 2-directional Infinite canvas.
 * 4. High-contrast, pixel-aligned boundary grid lines.
 */
export class TileCanvasRenderer {
  /**
   * Main render execution on HTML5 Canvas
   */
  static render(
    canvas: HTMLCanvasElement,
    image: HTMLImageElement | null,
    options: TileRenderOptions,
    placeholderLabel?: string
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Reset transform & clear
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // 1. Draw neutral background checkerboard for transparency and contrast
    this.drawCheckerboard(ctx, width, height, 16);

    // 2. CRITICAL CONSTRAINT: Disable image smoothing to prevent bilinear/bicubic
    // blur from hiding seam discontinuities!
    ctx.imageSmoothingEnabled = false;

    // 3. Apply Pan and Zoom transforms
    ctx.translate(width / 2 + options.pan.x, height / 2 + options.pan.y);
    ctx.scale(options.zoom, options.zoom);

    // Determine actual native dimensions of the tile
    const tileW = image ? image.naturalWidth || image.width : 256;
    const tileH = image ? image.naturalHeight || image.height : 256;

    if (!image) {
      this.drawPlaceholder(ctx, options.mode, tileW, tileH, placeholderLabel || 'No Texture Loaded');
      ctx.restore();
      return;
    }

    // Grid stroke styling
    const isFail = options.isPass === false;
    const defaultGridStroke = isFail
      ? 'rgba(244, 63, 94, 0.85)' // Rose warning grid
      : 'rgba(56, 189, 248, 0.7)'; // Sky blue grid
    const strokeStyle = options.gridColor || defaultGridStroke;
    const lineWidth = Math.max(1 / options.zoom, 1);

    // Render based on selected Mode
    switch (options.mode) {
      case 'single': {
        // MODE 1: SINGLE (1x1)
        // Display exactly one tile at its native aspect ratio and exact pixel dimensions
        const x = -tileW / 2;
        const y = -tileH / 2;
        ctx.drawImage(image, x, y, tileW, tileH);

        if (options.showGrid) {
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = lineWidth;
          ctx.strokeRect(x, y, tileW, tileH);
        }
        break;
      }

      case '3x3': {
        // MODE 2: 3x3 GRID
        // Repeat the same tile exactly nine times in a 3x3 matrix at exact pixel dimensions
        const startX = -1.5 * tileW;
        const startY = -1.5 * tileH;

        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            const x = startX + col * tileW;
            const y = startY + row * tileH;
            ctx.drawImage(image, x, y, tileW, tileH);

            if (options.showGrid) {
              ctx.strokeStyle = strokeStyle;
              ctx.lineWidth = lineWidth;
              ctx.strokeRect(x, y, tileW, tileH);
            }
          }
        }

        // Distinct outer perimeter border
        if (options.showGrid) {
          ctx.strokeStyle = isFail ? 'rgba(244, 63, 94, 1)' : 'rgba(2, 132, 199, 1)';
          ctx.lineWidth = Math.max(2 / options.zoom, 1.5);
          ctx.strokeRect(startX, startY, 3 * tileW, 3 * tileH);
        }
        break;
      }

      case 'infinite': {
        // MODE 3: INFINITE
        // Dynamically tile across the entire visible canvas in both X and Y directions to infinity!
        // Compute world coordinates of the current viewport:
        const minWorldX = (-width / 2 - options.pan.x) / options.zoom;
        const maxWorldX = (width / 2 - options.pan.x) / options.zoom;
        const minWorldY = (-height / 2 - options.pan.y) / options.zoom;
        const maxWorldY = (height / 2 - options.pan.y) / options.zoom;

        const startCol = Math.floor(minWorldX / tileW) - 1;
        const endCol = Math.ceil(maxWorldX / tileW) + 1;
        const startRow = Math.floor(minWorldY / tileH) - 1;
        const endRow = Math.ceil(maxWorldY / tileH) + 1;

        // Draw tiles covering the entire visible viewport
        for (let row = startRow; row <= endRow; row++) {
          for (let col = startCol; col <= endCol; col++) {
            const x = col * tileW;
            const y = row * tileH;
            ctx.drawImage(image, x, y, tileW, tileH);

            if (options.showGrid) {
              ctx.strokeStyle = strokeStyle;
              ctx.lineWidth = lineWidth;
              ctx.strokeRect(x, y, tileW, tileH);
            }
          }
        }
        break;
      }
    }

    ctx.restore();
  }

  /**
   * Draws a checkerboard pattern for high-contrast inspection of edge transparency and seams
   */
  private static drawCheckerboard(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    size: number
  ) {
    ctx.fillStyle = '#090d16'; // Very dark slate base
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#131c2e'; // Slightly lighter slate
    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        if ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0) {
          ctx.fillRect(x, y, size, size);
        }
      }
    }
  }

  /**
   * Draws blueprint placeholder when no image is loaded
   */
  private static drawPlaceholder(
    ctx: CanvasRenderingContext2D,
    mode: TilePreviewMode,
    tileW: number,
    tileH: number,
    label: string
  ) {
    const count = mode === 'single' ? 1 : 3;
    const startX = mode === 'single' ? -tileW / 2 : -1.5 * tileW;
    const startY = mode === 'single' ? -tileH / 2 : -1.5 * tileH;
    const totalW = count * tileW;
    const totalH = count * tileH;

    ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
    ctx.fillRect(startX, startY, totalW, totalH);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1;

    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        ctx.strokeRect(startX + c * tileW, startY + r * tileH, tileW, tileH);
      }
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${mode.toUpperCase()} Tile Preview Blueprint`, 0, -10);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText(label, 0, 12);
  }
}
