/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import sharp from 'sharp';
import { sanitizeFilename } from '../../src/utils/exportUtils';

export interface ExportConfig {
  format?: 'png' | 'webp' | 'jpeg';
  resolution?: 256 | 512 | 1024;
  exportGridSheet?: boolean;
  gridSheetSize?: 2 | 3 | 4;
}

/**
 * Server-Side Export Service
 *
 * Packages processed textures into game-ready formats (PNG, WebP, JPEG),
 * generates multi-tile preview spritesheets (2x2, 3x3, 4x4), and applies export compression.
 */
export class ExportService {
  /**
   * Exports single tile or tiled sheet in specified format and resolution
   */
  async exportTexture(
    imageBuffer: Buffer,
    config: ExportConfig = {},
    materialName: string = 'tile'
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const {
      format = 'png',
      resolution = 512,
      exportGridSheet = false,
      gridSheetSize = 3,
    } = config;

    let pipeline = sharp(imageBuffer).resize(resolution, resolution, { fit: 'fill' });

    if (exportGridSheet) {
      const tileRes = resolution;
      const sheetWidth = tileRes * gridSheetSize;
      const sheetHeight = tileRes * gridSheetSize;

      const singleTileBuffer = await pipeline.toBuffer();
      const composites = [];
      for (let row = 0; row < gridSheetSize; row++) {
        for (let col = 0; col < gridSheetSize; col++) {
          composites.push({
            input: singleTileBuffer,
            top: row * tileRes,
            left: col * tileRes,
          });
        }
      }

      pipeline = sharp({
        create: {
          width: sheetWidth,
          height: sheetHeight,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      }).composite(composites);
    }

    let mimeType = 'image/png';
    let ext = format === 'jpeg' ? 'jpg' : format;

    if (format === 'webp') {
      pipeline = pipeline.webp({ quality: 90, lossless: true });
      mimeType = 'image/webp';
    } else if (format === 'jpeg') {
      pipeline = pipeline.jpeg({ quality: 90 });
      mimeType = 'image/jpeg';
    } else {
      pipeline = pipeline.png({ compressionLevel: 9 });
      mimeType = 'image/png';
    }

    const outputBuffer = await pipeline.toBuffer();
    const safeMaterial = sanitizeFilename(materialName);
    const filename = `${safeMaterial}-processed.${ext}`;

    return {
      buffer: outputBuffer,
      mimeType,
      filename,
    };
  }
}

export const exportService = new ExportService();
