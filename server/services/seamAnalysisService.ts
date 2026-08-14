/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import sharp from 'sharp';
import { EdgeRegionDepth, SeamAnalysisOptions, SeamAnalysisResult } from '../../src/types';

/**
 * Default threshold for seam evaluation.
 * A score <= 0.05 (less than 5% average normalized RGB edge delta)
 * indicates a mathematically seamless connection.
 */
export const DEFAULT_SEAM_THRESHOLD = 0.05;

/**
 * Default edge region depth (in pixels) sampled across boundary strips.
 * Supported values: 1, 2, 4, 8 pixels.
 */
export const DEFAULT_EDGE_REGION: EdgeRegionDepth = 4;

export const ALLOWED_EDGE_REGIONS: EdgeRegionDepth[] = [1, 2, 4, 8];

/**
 * Normalized maximum possible Euclidean distance for 3-channel RGB (0-255)
 * sqrt(255^2 + 255^2 + 255^2) ≈ 441.6729559300637
 */
const MAX_RGB_DISTANCE = Math.sqrt(255 * 255 * 3);

/**
 * Deterministic Seam Analysis Service
 *
 * Objectively measures how seamlessly an image tiles by executing pixel-level
 * mathematical comparison across opposing boundary regions (Right vs. Left and Bottom vs. Top).
 *
 * Generates normalized numerical scores:
 *  - 0.0 = mathematically identical / perfect seamless match
 *  - Higher values = larger edge discontinuity (0.0 to 1.0)
 */
export class SeamAnalysisService {
  /**
   * Helper to normalize input image buffer from raw Buffer or Data URL
   */
  toBuffer(input: string | Buffer): Buffer {
    if (Buffer.isBuffer(input)) {
      return input;
    }
    if (typeof input === 'string') {
      const base64Data = input.includes(';base64,') ? input.split(';base64,')[1] : input;
      return Buffer.from(base64Data, 'base64');
    }
    throw new Error('Unsupported image input format for seam analysis.');
  }

  /**
   * Objectively analyzes seam continuity along horizontal and vertical boundaries.
   *
   * @param image Input image (Buffer or base64 data URL)
   * @param options Configuration for threshold, edge region depth, and diagnostic visual mode
   */
  async analyzeSeams(
    image: Buffer | string,
    options: SeamAnalysisOptions = {}
  ): Promise<SeamAnalysisResult> {
    const inputBuffer = this.toBuffer(image);

    const threshold =
      typeof options.threshold === 'number' && options.threshold >= 0
        ? options.threshold
        : DEFAULT_SEAM_THRESHOLD;

    const requestedEdgeRegion = options.edgeRegion || DEFAULT_EDGE_REGION;
    const edgeRegion: EdgeRegionDepth = ALLOWED_EDGE_REGIONS.includes(requestedEdgeRegion)
      ? requestedEdgeRegion
      : DEFAULT_EDGE_REGION;

    const isDiagnosticMode = options.diagnosticMode ?? true; // Generate visual heatmap by default

    // Extract raw RGBA pixel data
    const { data: rawData, info } = await sharp(inputBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;

    if (!width || !height || channels < 3) {
      throw new Error(`Invalid image dimensions (${width}×${height}, ${channels}ch) for seam analysis.`);
    }

    // Constrain sample depth so it does not exceed half image dimension
    const maxDepth = Math.max(1, Math.min(edgeRegion, Math.floor(width / 2), Math.floor(height / 2)));

    let horizontalDiffSum = 0;
    let verticalDiffSum = 0;
    let maxHorizontalDelta = 0;
    let maxVerticalDelta = 0;
    let discontinuousPixelCount = 0;

    // Structure for tracking per-pixel deltas for diagnostic map
    const horizontalDeltas: number[][] = Array.from({ length: height }, () =>
      new Array(maxDepth).fill(0)
    );
    const verticalDeltas: number[][] = Array.from({ length: width }, () =>
      new Array(maxDepth).fill(0)
    );

    // -------------------------------------------------------------------------
    // 1. HORIZONTAL SEAM ANALYSIS (Compare Right edge with Left edge)
    // -------------------------------------------------------------------------
    // When tiles repeat horizontally (T_left | T_right),
    // Right edge pixels at (width - 1 - d, y) must match Left edge pixels at (d, y)
    for (let y = 0; y < height; y++) {
      for (let d = 0; d < maxDepth; d++) {
        const leftX = d;
        const rightX = width - 1 - d;

        const leftIdx = (y * width + leftX) * channels;
        const rightIdx = (y * width + rightX) * channels;

        const dr = rawData[leftIdx] - rawData[rightIdx];
        const dg = rawData[leftIdx + 1] - rawData[rightIdx + 1];
        const db = rawData[leftIdx + 2] - rawData[rightIdx + 2];

        // Normalized color delta in [0.0, 1.0]
        const delta = Math.sqrt(dr * dr + dg * dg + db * db) / MAX_RGB_DISTANCE;

        horizontalDiffSum += delta;
        horizontalDeltas[y][d] = delta;

        if (delta > maxHorizontalDelta) {
          maxHorizontalDelta = delta;
        }

        if (delta > threshold) {
          discontinuousPixelCount++;
        }
      }
    }

    // -------------------------------------------------------------------------
    // 2. VERTICAL SEAM ANALYSIS (Compare Bottom edge with Top edge)
    // -------------------------------------------------------------------------
    // When tiles repeat vertically (T_top / T_bottom),
    // Bottom edge pixels at (x, height - 1 - d) must match Top edge pixels at (x, d)
    for (let x = 0; x < width; x++) {
      for (let d = 0; d < maxDepth; d++) {
        const topY = d;
        const bottomY = height - 1 - d;

        const topIdx = (topY * width + x) * channels;
        const bottomIdx = (bottomY * width + x) * channels;

        const dr = rawData[topIdx] - rawData[bottomIdx];
        const dg = rawData[topIdx + 1] - rawData[bottomIdx + 1];
        const db = rawData[topIdx + 2] - rawData[bottomIdx + 2];

        // Normalized color delta in [0.0, 1.0]
        const delta = Math.sqrt(dr * dr + dg * dg + db * db) / MAX_RGB_DISTANCE;

        verticalDiffSum += delta;
        verticalDeltas[x][d] = delta;

        if (delta > maxVerticalDelta) {
          maxVerticalDelta = delta;
        }

        if (delta > threshold) {
          discontinuousPixelCount++;
        }
      }
    }

    const totalHorizontalSamples = height * maxDepth;
    const totalVerticalSamples = width * maxDepth;
    const totalEdgePixelsEvaluated = totalHorizontalSamples + totalVerticalSamples;

    // Calculate normalized average scores (0.0 = perfect match, higher = larger discontinuity)
    const rawHorizontalScore = horizontalDiffSum / totalHorizontalSamples;
    const rawVerticalScore = verticalDiffSum / totalVerticalSamples;
    const rawOverallScore = (rawHorizontalScore + rawVerticalScore) / 2;

    // Round scores cleanly to 4 decimal places
    const horizontalScore = Math.round(rawHorizontalScore * 10000) / 10000;
    const verticalScore = Math.round(rawVerticalScore * 10000) / 10000;
    const overallScore = Math.round(rawOverallScore * 10000) / 10000;

    // Pass condition: both horizontal and vertical seam scores must be within threshold
    const pass = horizontalScore <= threshold && verticalScore <= threshold;

    // Generate descriptive issues if discontinuities are detected
    const issues: string[] = [];
    if (horizontalScore > threshold) {
      issues.push(
        `Horizontal seam discontinuity: ${(horizontalScore * 100).toFixed(2)}% (threshold: ${(
          threshold * 100
        ).toFixed(1)}%). Left and right edges do not match.`
      );
    }
    if (verticalScore > threshold) {
      issues.push(
        `Vertical seam discontinuity: ${(verticalScore * 100).toFixed(2)}% (threshold: ${(
          threshold * 100
        ).toFixed(1)}%). Top and bottom edges do not match.`
      );
    }
    if (discontinuousPixelCount > totalEdgePixelsEvaluated * 0.25) {
      issues.push(
        `High edge discontinuity: ${discontinuousPixelCount} / ${totalEdgePixelsEvaluated} border pixels exceed tolerance.`
      );
    }

    // -------------------------------------------------------------------------
    // 3. DIAGNOSTIC HEATMAP VISUALIZATION
    // -------------------------------------------------------------------------
    let diagnosticMapDataUrl: string | undefined;

    if (isDiagnosticMode) {
      diagnosticMapDataUrl = await this.generateDiagnosticMap({
        rawData,
        width,
        height,
        channels,
        maxDepth,
        horizontalDeltas,
        verticalDeltas,
        threshold,
      });
    }

    // Legacy score compatibility
    const horizontalSeamDiff = Math.round(horizontalScore * 1000) / 10;
    const verticalSeamDiff = Math.round(verticalScore * 1000) / 10;
    const overallTileabilityScore = Math.max(0, Math.min(100, Math.round(100 - overallScore * 100)));

    return {
      horizontalScore,
      verticalScore,
      overallScore,
      width,
      height,
      pass,
      threshold,
      edgeRegion: maxDepth,
      diagnosticMapDataUrl,
      maxHorizontalDelta: Math.round(maxHorizontalDelta * 10000) / 10000,
      maxVerticalDelta: Math.round(maxVerticalDelta * 10000) / 10000,
      discontinuousPixelCount,
      totalEdgePixelsEvaluated,
      issues,
      // Compatibility fields
      horizontalSeamDiff,
      verticalSeamDiff,
      overallTileabilityScore,
      isSeamless: pass,
    };
  }

  /**
   * Generates a high-contrast visual diagnostic heatmap highlighting edge seam differences.
   */
  private async generateDiagnosticMap(params: {
    rawData: Buffer;
    width: number;
    height: number;
    channels: number;
    maxDepth: number;
    horizontalDeltas: number[][];
    verticalDeltas: number[][];
    threshold: number;
  }): Promise<string> {
    const { rawData, width, height, channels, maxDepth, horizontalDeltas, verticalDeltas, threshold } =
      params;

    const diagBuffer = Buffer.alloc(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * channels;
        const dstIdx = (y * width + x) * 4;

        // Base dimmed context pixel (25% brightness)
        const baseR = Math.floor(rawData[srcIdx] * 0.25);
        const baseG = Math.floor(rawData[srcIdx + 1] * 0.25);
        const baseB = Math.floor(rawData[srcIdx + 2] * 0.25);

        let isEdge = false;
        let maxDeltaAtPixel = 0;

        // Left edge region (x < maxDepth)
        if (x < maxDepth) {
          isEdge = true;
          maxDeltaAtPixel = Math.max(maxDeltaAtPixel, horizontalDeltas[y][x]);
        }

        // Right edge region (x >= width - maxDepth)
        if (x >= width - maxDepth) {
          isEdge = true;
          const d = width - 1 - x;
          maxDeltaAtPixel = Math.max(maxDeltaAtPixel, horizontalDeltas[y][d]);
        }

        // Top edge region (y < maxDepth)
        if (y < maxDepth) {
          isEdge = true;
          maxDeltaAtPixel = Math.max(maxDeltaAtPixel, verticalDeltas[x][y]);
        }

        // Bottom edge region (y >= height - maxDepth)
        if (y >= height - maxDepth) {
          isEdge = true;
          const d = height - 1 - y;
          maxDeltaAtPixel = Math.max(maxDeltaAtPixel, verticalDeltas[x][d]);
        }

        if (isEdge) {
          if (maxDeltaAtPixel <= threshold) {
            // Seamless match: Emerald Green highlight
            diagBuffer[dstIdx] = Math.min(255, baseR + 16);
            diagBuffer[dstIdx + 1] = Math.min(255, baseG + 185);
            diagBuffer[dstIdx + 2] = Math.min(255, baseB + 129);
            diagBuffer[dstIdx + 3] = 255;
          } else {
            // Seam mismatch: Gradient from Amber to Bright Crimson Red
            const heatRatio = Math.min(1.0, (maxDeltaAtPixel - threshold) / (1.0 - threshold + 0.001));
            const red = 255;
            const green = Math.floor(200 * (1 - heatRatio));
            const blue = 30;

            diagBuffer[dstIdx] = red;
            diagBuffer[dstIdx + 1] = green;
            diagBuffer[dstIdx + 2] = blue;
            diagBuffer[dstIdx + 3] = 255;
          }
        } else {
          // Interior texture representation
          diagBuffer[dstIdx] = baseR;
          diagBuffer[dstIdx + 1] = baseG;
          diagBuffer[dstIdx + 2] = baseB;
          diagBuffer[dstIdx + 3] = 255;
        }
      }
    }

    const pngBuffer = await sharp(diagBuffer, {
      raw: { width, height, channels: 4 },
    })
      .png()
      .toBuffer();

    return `data:image/png;base64,${pngBuffer.toString('base64')}`;
  }
}

export const seamAnalysisService = new SeamAnalysisService();
