/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import sharp, { Sharp } from 'sharp';

export interface ExportConfig {
  format?: 'png' | 'webp' | 'jpeg';
  resolution?: 256 | 512 | 1024;
  exportGridSheet?: boolean;
  gridSheetSize?: 2 | 3 | 4;
}

/**
 * Server-Side Export Service
 *
 * Packages processed 512x512 textures into game-ready formats (PNG, WebP, JPEG),
 * generates multi-tile preview spritesheets (2x2, 3x3, 4x4), and applies export compression.
 */
export class ExportService {
  /**
   * Exports single tile or tiled sheet in specified format and resolution
   *
   * TODO [Phase 2]: Implement Sharp grid compositing for multi-tile spritesheets
   */
  async exportTexture(imageBuffer: Buffer, config: ExportConfig = {}): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const {
      format = 'png',
      resolution = 512,
      exportGridSheet = false,
      gridSheetSize = 3,
    } = config;

    const tileBuffer = await sharp(imageBuffer)
      .resize(resolution, resolution, { fit: 'fill' })
      .toBuffer();

    let pipeline: Sharp;

    if (exportGridSheet) {
      const count = Math.max(2, Math.min(4, gridSheetSize));
      const sheetDimension = resolution * count;
      const compositeInputs = [];

      for (let row = 0; row < count; row++) {
        for (let col = 0; col < count; col++) {
          compositeInputs.push({
            input: tileBuffer,
            top: row * resolution,
            left: col * resolution,
          });
        }
      }

      pipeline = sharp({
        create: {
          width: sheetDimension,
          height: sheetDimension,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      }).composite(compositeInputs);
    } else {
      pipeline = sharp(tileBuffer);
    }

    let mimeType = 'image/png';
    let ext = 'png';

    if (format === 'webp') {
      pipeline = pipeline.webp({ quality: 90, lossless: true });
      mimeType = 'image/webp';
      ext = 'webp';
    } else if (format === 'jpeg') {
      pipeline = pipeline.jpeg({ quality: 90 });
      mimeType = 'image/jpeg';
      ext = 'jpg';
    } else {
      pipeline = pipeline.png({ compressionLevel: 9 });
    }

    const outputBuffer = await pipeline.toBuffer();
    const filename = `tile_${resolution}x${resolution}_${Date.now()}.${ext}`;

    return {
      buffer: outputBuffer,
      mimeType,
      filename,
    };
  }
}

export const exportService = new ExportService();
