/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RenderOptions {
  gridCount: number; // 1 (1x1), 2 (2x2), 3 (3x3), 4 (4x4)
  showSeamLines: boolean;
  offsetWrapMode: boolean; // Wrap edges to the center for seam inspection
  zoom: number; // 0.5x to 4x
  pan: { x: number; y: number };
  pixelated: boolean;
}

/**
 * Utility functions for HTML Canvas rendering of tileable 2D game textures.
 * Provides real-time repeated tiling inspection, offset-wrap seam visualization,
 * and high-contrast boundary grids.
 */
export class CanvasTileRenderer {
  /**
   * Renders the given image on the canvas using repetition or offset-wrap modes.
   */
  static render(
    canvas: HTMLCanvasElement,
    image: HTMLImageElement | null,
    options: RenderOptions,
    placeholderLabel?: string
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Clear canvas with neutral dark checkerboard background
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Draw background checkerboard
    this.drawCheckerboard(ctx, width, height, 16);

    // Apply pixelated smoothing settings
    ctx.imageSmoothingEnabled = !options.pixelated;
    if (options.pixelated) {
      ctx.imageSmoothingQuality = 'low';
    }

    // Apply pan & zoom
    ctx.translate(width / 2 + options.pan.x, height / 2 + options.pan.y);
    ctx.scale(options.zoom, options.zoom);

    const tileSize = 256; // Standard base rendering dimension per tile in viewport
    const totalTiles = options.gridCount;
    const totalWidth = tileSize * totalTiles;
    const totalHeight = tileSize * totalTiles;
    const startX = -totalWidth / 2;
    const startY = -totalHeight / 2;

    if (!image) {
      // Render placeholder blueprint / foundation box
      this.drawPlaceholderGrid(ctx, startX, startY, totalTiles, tileSize, placeholderLabel || 'No Texture Loaded');
      ctx.restore();
      return;
    }

    if (options.offsetWrapMode) {
      // Offset wrap view: shift texture by 50% horizontally and vertically so edges meet in center
      this.drawOffsetWrap(ctx, image, startX, startY, totalWidth, totalHeight);
      if (options.showSeamLines) {
        this.drawOffsetCenterCrosshairs(ctx, startX, startY, totalWidth, totalHeight);
      }
    } else {
      // Standard Repeated Grid View
      for (let row = 0; row < totalTiles; row++) {
        for (let col = 0; col < totalTiles; col++) {
          const x = startX + col * tileSize;
          const y = startY + row * tileSize;
          ctx.drawImage(image, x, y, tileSize, tileSize);

          if (options.showSeamLines) {
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)'; // Semi-transparent red boundary
            ctx.lineWidth = 1 / options.zoom;
            ctx.strokeRect(x, y, tileSize, tileSize);
          }
        }
      }
    }

    // Outer bounding border
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2 / options.zoom;
    ctx.strokeRect(startX, startY, totalWidth, totalHeight);

    ctx.restore();
  }

  /**
   * Shifts texture by 50% in both axes to inspect seam alignment directly at the center
   */
  private static drawOffsetWrap(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    const halfW = width / 2;
    const halfH = height / 2;
    const imgHalfW = image.width / 2;
    const imgHalfH = image.height / 2;

    // Quad 1: Bottom-Right of image -> Top-Left of viewport
    ctx.drawImage(image, imgHalfW, imgHalfH, imgHalfW, imgHalfH, x, y, halfW, halfH);

    // Quad 2: Bottom-Left of image -> Top-Right of viewport
    ctx.drawImage(image, 0, imgHalfH, imgHalfW, imgHalfH, x + halfW, y, halfW, halfH);

    // Quad 3: Top-Right of image -> Bottom-Left of viewport
    ctx.drawImage(image, imgHalfW, 0, imgHalfW, imgHalfH, x, y + halfH, halfW, halfH);

    // Quad 4: Top-Left of image -> Bottom-Right of viewport
    ctx.drawImage(image, 0, 0, imgHalfW, imgHalfH, x + halfW, y + halfH, halfW, halfH);
  }

  /**
   * Center crosshairs for offset mode to highlight the original exterior seams
   */
  private static drawOffsetCenterCrosshairs(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    const midX = x + width / 2;
    const midY = y + height / 2;

    ctx.save();
    ctx.strokeStyle = '#f59e0b'; // Amber seam inspection line
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    // Vertical seam in center
    ctx.beginPath();
    ctx.moveTo(midX, y);
    ctx.lineTo(midX, y + height);
    ctx.stroke();

    // Horizontal seam in center
    ctx.beginPath();
    ctx.moveTo(x, midY);
    ctx.lineTo(x + width, midY);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw neutral checkerboard background for transparency & texture alignment
   */
  private static drawCheckerboard(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    size: number
  ) {
    ctx.fillStyle = '#0f172a'; // Dark slate base
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#1e293b'; // Alternate slate tile
    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        if ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0) {
          ctx.fillRect(x, y, size, size);
        }
      }
    }
  }

  /**
   * Draws a blueprint style placeholder grid
   */
  private static drawPlaceholderGrid(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    tiles: number,
    tileSize: number,
    label: string
  ) {
    const totalW = tiles * tileSize;
    const totalH = tiles * tileSize;

    // Foundation card box
    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    ctx.fillRect(startX, startY, totalW, totalH);

    // Sub-tile borders
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1;
    for (let r = 0; r < tiles; r++) {
      for (let c = 0; c < tiles; c++) {
        ctx.strokeRect(startX + c * tileSize, startY + r * tileSize, tileSize, tileSize);
      }
    }

    // Grid center label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${tiles}×${tiles} Seamless Preview Grid`, 0, -12);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText(label, 0, 12);
  }
}
