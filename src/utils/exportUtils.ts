/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExportOptions, Tile } from '../types';

/**
 * Sanitizes a string (material name, tile title, etc.) for filesystem safety.
 * Replaces invalid characters (/ \ : * ? " < > |), whitespace, and control chars
 * with hyphens. Ensures no secrets or sensitive data are passed into filenames.
 */
export function sanitizeFilename(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'tile';
  }

  const sanitized = name
    .toLowerCase()
    // Replace filesystem invalid characters and unsafe characters
    .replace(/[/\\:*?"<>|\0-\x1F\x7F]/g, '-')
    // Replace whitespace with hyphens
    .replace(/\s+/g, '-')
    // Collapse multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Strip leading and trailing hyphens and dots
    .replace(/^[-.]+|[-.]+$/g, '');

  return sanitized.length > 0 ? sanitized : 'tile';
}

export type ExportSourceType = 'processed' | 'raw';

export interface ExportSourceInfo {
  source: ExportSourceType | 'none';
  isRawFallback: boolean;
  imageDataUrl?: string;
  sourceLabel: 'PROCESSED TILE' | 'RAW PROVIDER IMAGE' | 'NO IMAGE';
}

/**
 * Determines export source (defaulting to processed tile, with explicit raw fallback).
 */
export function getExportSourceInfo(tile: Tile | null): ExportSourceInfo {
  if (!tile) {
    return {
      source: 'none',
      isRawFallback: false,
      sourceLabel: 'NO IMAGE',
    };
  }

  if (tile.processedImageDataUrl) {
    return {
      source: 'processed',
      isRawFallback: false,
      imageDataUrl: tile.processedImageDataUrl,
      sourceLabel: 'PROCESSED TILE',
    };
  }

  if (tile.rawImageDataUrl) {
    return {
      source: 'raw',
      isRawFallback: true,
      imageDataUrl: tile.rawImageDataUrl,
      sourceLabel: 'RAW PROVIDER IMAGE',
    };
  }

  return {
    source: 'none',
    isRawFallback: false,
    sourceLabel: 'NO IMAGE',
  };
}

/**
 * Builds safe filenames for exported image and companion metadata files.
 */
export function buildExportFilenames(
  tile: Tile,
  options: Partial<ExportOptions>,
  source: ExportSourceType
): { imageFilename: string; metadataFilename: string } {
  const sanitizedName = sanitizeFilename(tile.material || tile.name || 'tile');
  const format = (options.format || 'png').toLowerCase();

  const baseFilename = `${sanitizedName}-${source}`;
  return {
    imageFilename: `${baseFilename}.${format}`,
    metadataFilename: `${baseFilename}.json`,
  };
}

export interface ExportMetadataPackage {
  provider?: string;
  model?: string;
  material: string;
  prompt?: string;
  generatedAt?: string;
  resolution: number;
  seed?: number;
  rawSeamScore?: number;
  processedSeamScore?: number;
  rawTileability?: boolean;
  processedTileability?: boolean;
  improvement?: number;
  improvementStatus?: 'IMPROVED' | 'WORSENED' | 'UNCHANGED';
  finalStatus?: 'PASS_RAW' | 'PASS_AFTER_PROCESSING' | 'VALIDATION_FAILED';
  processingAlgorithm?: string;
  blendMarginPercent?: number;
  validationThreshold?: number;
  exportSource: 'PROCESSED_TILE' | 'RAW_PROVIDER_IMAGE';
  exportedAt: string;
}

/**
 * Builds companion reproducibility metadata object.
 * Guarantees no sensitive tokens, API keys, credentials, or auth headers are included.
 */
export function buildExportMetadata(tile: Tile, source: ExportSourceType): ExportMetadataPackage {
  const genMeta = tile.generationMetadata;
  const valSummary = tile.validationSummary;
  const seamRep = tile.seamReport;
  const rawSeamRep = tile.rawSeamReport;

  const rawScore = valSummary?.rawSeamScore ?? tile.rawSeamScore ?? rawSeamRep?.overallScore;
  const procScore = valSummary?.processedSeamScore ?? tile.seamScore ?? seamRep?.overallScore;

  const rawTileable = valSummary?.rawTileable ?? rawSeamRep?.pass;
  const processedTileable = valSummary?.processedTileable ?? tile.isTileable ?? seamRep?.pass;

  const rawMetadata: ExportMetadataPackage = {
    material: tile.material || 'unknown',
    prompt: genMeta?.builtPrompt || tile.prompt,
    model: genMeta?.model || tile.metadata?.model,
    generatedAt: genMeta?.generatedAt || tile.createdAt,
    resolution: tile.resolution || 512,
    rawSeamScore: typeof rawScore === 'number' ? rawScore : undefined,
    processedSeamScore: typeof procScore === 'number' ? procScore : undefined,
    rawTileability: typeof rawTileable === 'boolean' ? rawTileable : undefined,
    processedTileability: typeof processedTileable === 'boolean' ? processedTileable : undefined,
    improvement: valSummary?.improvement,
    improvementStatus: valSummary?.improvementStatus,
    finalStatus: valSummary?.finalStatus,
    processingAlgorithm: genMeta?.processingAlgorithm || tile.metadata?.processingAlgorithm || 'offset-crossfade',
    blendMarginPercent: genMeta?.blendMarginPercent,
    validationThreshold: valSummary?.threshold ?? seamRep?.threshold ?? 0.05,
    exportSource: source === 'processed' ? 'PROCESSED_TILE' : 'RAW_PROVIDER_IMAGE',
    exportedAt: new Date().toISOString(),
  };

  // Remove any keys that are undefined
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(rawMetadata)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }

  return cleaned as ExportMetadataPackage;
}

/**
 * Triggers a browser download for a Blob with the given filename.
 */
export function triggerBrowserDownload(blob: Blob, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper to convert Base64 Data URL to Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
