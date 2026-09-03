/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import sharp from 'sharp';
import crypto from 'crypto';
import {
  BlendMarginPercent,
  SupportedResolution,
  TileProcessingMetadata,
  TileProcessingOptions,
  TileProcessingResult,
} from '../../src/types';
import { seamAnalysisService } from '../services/seamAnalysisService';

export const SUPPORTED_RESOLUTIONS: SupportedResolution[] = [128, 256, 512, 1024];
export const ALLOWED_BLEND_MARGINS: BlendMarginPercent[] = [0, 5, 10, 15, 20];
export const DEFAULT_RESOLUTION: SupportedResolution = 512;
export const DEFAULT_BLEND_MARGIN: BlendMarginPercent = 10;

/**
 * Deterministic Local Tile-Processing Engine
 *
 * Takes an arbitrary 2D image and performs an offset-based seamless transformation
 * using Sharp and raw buffer mathematical blending.
 *
 * Algorithm:
 * 1. Normalize image to target resolution (128x128, 256x256, 512x512, 1024x1024).
 * 2. Torus offset by 50% in X and Y (moving outer edges to the center cross seams).
 * 3. Calculate blend margin width (5%, 10%, 15%, or 20% of dimension).
 * 4. Apply smooth cosine crossfade blending along the center seams using continuous center data.
 * 5. Encode to high-quality PNG with deterministic output and metadata verification.
 */
export class TileProcessor {
  /**
   * Main entry point to process an image into a seamless tile
   */
  async processTile(
    input: Buffer | string,
    options: TileProcessingOptions = {}
  ): Promise<TileProcessingResult> {
    const startTime = performance.now();

    // 1. Ingest input image
    const inputBuffer = this.toBuffer(input);
    const initialMeta = await sharp(inputBuffer).metadata();
    const inputWidth = initialMeta.width || DEFAULT_RESOLUTION;
    const inputHeight = initialMeta.height || DEFAULT_RESOLUTION;

    // 2. Resolve target dimensions & blend options
    const targetW = this.validateResolution(options.targetWidth || (inputWidth as SupportedResolution));
    const targetH = this.validateResolution(options.targetHeight || (inputHeight as SupportedResolution));
    const blendPercent = this.validateBlendMargin(
      typeof options.blendMarginPercent === 'number' ? options.blendMarginPercent : DEFAULT_BLEND_MARGIN
    );

    // 3. Extract raw RGBA pixel buffer at target resolution
    const { data: rawSource } = await sharp(inputBuffer)
      .resize(targetW, targetH, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 4. Create 50% Torus Offset Buffer
    const rawOffset = this.createTorusOffsetBuffer(rawSource, targetW, targetH);

    // 5. Apply Seam Blending along the center cross
    const { blendedBuffer: rawBlended, blendPixelsX, blendPixelsY } = this.blendCenterSeams(
      rawSource,
      rawOffset,
      targetW,
      targetH,
      blendPercent
    );

    // 6. Encode outputs to PNG with deterministic compression
    const processedPngBuffer = await sharp(rawBlended, {
      raw: { width: targetW, height: targetH, channels: 4 },
    })
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer();

    const offsetPngBuffer = await sharp(rawOffset, {
      raw: { width: targetW, height: targetH, channels: 4 },
    })
      .png({ compressionLevel: 6 })
      .toBuffer();

    const endTime = performance.now();
    const processingTimeMs = Math.round((endTime - startTime) * 100) / 100;

    // 7. Calculate deterministic SHA-256 checksum
    const checksum = crypto.createHash('sha256').update(processedPngBuffer).digest('hex');

    // 8. Calculate objective seam score and report
    let seamResult;
    try {
      seamResult = await seamAnalysisService.analyzeSeams(processedPngBuffer, {
        diagnosticMode: false,
      });
    } catch (e) {
      console.warn('Seam analysis during tile processing:', e);
    }

    const metadata: TileProcessingMetadata = {
      inputDimensions: { width: inputWidth, height: inputHeight },
      outputDimensions: { width: targetW, height: targetH },
      blendMarginPercent: blendPercent,
      blendMarginPixels: { x: blendPixelsX, y: blendPixelsY },
      algorithm: options.algorithm || 'offset-crossfade',
      processingTimeMs,
      isDeterministic: true,
      checksum,
      seamScore: seamResult?.overallScore,
      seamResult,
    };

    return {
      processedImageBuffer: processedPngBuffer,
      processedImageDataUrl: this.bufferToDataUrl(processedPngBuffer, 'image/png'),
      offsetPreviewDataUrl: this.bufferToDataUrl(offsetPngBuffer, 'image/png'),
      metadata,
      seamResult,
    };
  }

  /**
   * Offsets the raw image buffer by 50% horizontally and vertically (torus wrap)
   */
  private createTorusOffsetBuffer(source: Buffer, width: number, height: number): Buffer {
    const offset = Buffer.alloc(width * height * 4);
    const halfW = Math.floor(width / 2);
    const halfH = Math.floor(height / 2);

    for (let y = 0; y < height; y++) {
      const srcY = (y + halfH) % height;
      for (let x = 0; x < width; x++) {
        const srcX = (x + halfW) % width;
        const srcIdx = (srcY * width + srcX) * 4;
        const dstIdx = (y * width + x) * 4;

        offset[dstIdx] = source[srcIdx];
        offset[dstIdx + 1] = source[srcIdx + 1];
        offset[dstIdx + 2] = source[srcIdx + 2];
        offset[dstIdx + 3] = source[srcIdx + 3];
      }
    }

    return offset;
  }

  /**
   * Blends the center cross seams (x = width/2, y = height/2) in the offset buffer
   * using smooth seam boundary interpolation without double-exposing unrelated source pixels.
   */
  private blendCenterSeams(
    source: Buffer,
    offset: Buffer,
    width: number,
    height: number,
    blendPercent: BlendMarginPercent
  ): { blendedBuffer: Buffer; blendPixelsX: number; blendPixelsY: number } {
    if (blendPercent === 0) {
      return {
        blendedBuffer: Buffer.from(offset),
        blendPixelsX: 0,
        blendPixelsY: 0,
      };
    }

    const blended = Buffer.alloc(width * height * 4);
    offset.copy(blended);

    const halfW = Math.floor(width / 2);
    const halfH = Math.floor(height / 2);

    const blendPixelsX = Math.max(2, Math.round(width * (blendPercent / 100)));
    const blendPixelsY = Math.max(2, Math.round(height * (blendPercent / 100)));

    const radiusX = Math.floor(blendPixelsX / 2);
    const radiusY = Math.floor(blendPixelsY / 2);

    // 1. Horizontal seam crossfade across x = halfW
    for (let y = 0; y < height; y++) {
      for (let dx = 0; dx < radiusX; dx++) {
        const xLeft = halfW - 1 - dx;
        const xRight = halfW + dx;

        if (xLeft < 0 || xRight >= width) continue;

        const t = (dx + 0.5) / radiusX;
        const wLeft = 0.5 + 0.5 * Math.sin(Math.PI * (t - 0.5));
        const wRight = 1 - wLeft;

        const idxLeft = (y * width + xLeft) * 4;
        const idxRight = (y * width + xRight) * 4;

        for (let c = 0; c < 4; c++) {
          const valLeft = offset[idxLeft + c];
          const valRight = offset[idxRight + c];

          blended[idxLeft + c] = Math.round(valLeft * wLeft + valRight * wRight);
          blended[idxRight + c] = Math.round(valRight * wLeft + valLeft * wRight);
        }
      }
    }

    // 2. Vertical seam crossfade across y = halfH
    for (let x = 0; x < width; x++) {
      for (let dy = 0; dy < radiusY; dy++) {
        const yTop = halfH - 1 - dy;
        const yBottom = halfH + dy;

        if (yTop < 0 || yBottom >= height) continue;

        const t = (dy + 0.5) / radiusY;
        const wTop = 0.5 + 0.5 * Math.sin(Math.PI * (t - 0.5));
        const wBottom = 1 - wTop;

        const idxTop = (yTop * width + x) * 4;
        const idxBottom = (yBottom * width + x) * 4;

        for (let c = 0; c < 4; c++) {
          const valTop = blended[idxTop + c];
          const valBottom = blended[idxBottom + c];

          blended[idxTop + c] = Math.round(valTop * wTop + valBottom * wBottom);
          blended[idxBottom + c] = Math.round(valBottom * wTop + valTop * wBottom);
        }
      }
    }

    return { blendedBuffer: blended, blendPixelsX, blendPixelsY };
  }

  /**
   * Validates and constrains target resolution to supported values (128, 256, 512, 1024)
   */
  validateResolution(res?: number): SupportedResolution {
    if (!res || !SUPPORTED_RESOLUTIONS.includes(res as SupportedResolution)) {
      return DEFAULT_RESOLUTION;
    }
    return res as SupportedResolution;
  }

  /**
   * Validates and constrains blend margin percent (0, 5, 10, 15, 20)
   */
  validateBlendMargin(margin?: number): BlendMarginPercent {
    if (typeof margin !== 'number' || !ALLOWED_BLEND_MARGINS.includes(margin as BlendMarginPercent)) {
      return DEFAULT_BLEND_MARGIN;
    }
    return margin as BlendMarginPercent;
  }

  /**
   * Helper to convert Base64 Data URL or Buffer to a Buffer
   */
  toBuffer(input: Buffer | string): Buffer {
    if (Buffer.isBuffer(input)) {
      return input;
    }
    if (typeof input === 'string') {
      const base64Data = input.replace(/^data:image\/\w+;base64,/, '');
      return Buffer.from(base64Data, 'base64');
    }
    throw new Error('Invalid input format. Expected Buffer or base64 Data URL string.');
  }

  /**
   * Helper to convert Buffer to Data URL
   */
  bufferToDataUrl(buffer: Buffer, mimeType = 'image/png'): string {
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }
}

export const tileProcessor = new TileProcessor();
