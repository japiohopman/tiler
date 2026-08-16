/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import sharp from 'sharp';
import { PromptBuilder } from '../promptBuilder';
import { GeneratedImage, GenerationRequest, ImageGenerationProvider } from './types';

/**
 * Material color palettes for procedural mock rendering (HEX)
 */
const MATERIAL_PALETTES: Record<string, { bg: string; fg: string; accent: string }> = {
  cobblestone: { bg: '#475569', fg: '#334155', accent: '#64748b' },
  grass: { bg: '#15803d', fg: '#166534', accent: '#22c55e' },
  wood: { bg: '#854d0e', fg: '#713f12', accent: '#a16207' },
  water: { bg: '#0369a1', fg: '#075985', accent: '#38bdf8' },
  lava: { bg: '#b91c1c', fg: '#991b1b', accent: '#f97316' },
  sand: { bg: '#b45309', fg: '#92400e', accent: '#f59e0b' },
};

/**
 * Deterministic Mock Image Generation Provider (Development & Testing Only)
 *
 * Requirements satisfied:
 * - Implements ImageGenerationProvider
 * - Requires no API key and no network access
 * - Generates 100% deterministic test images using Sharp and procedural SVG patterns
 * - Supports all GenerationRequest fields (material, style, detail, additionalPrompt, customPrompt, resolution, seed)
 * - Clearly marked as development/test only
 */
export class MockImageGenerationProvider implements ImageGenerationProvider {
  public readonly id = 'mock';
  public readonly name = 'Deterministic Mock Provider (Development/Test Only)';

  /**
   * Mock provider is always configured (no API keys or external services required)
   */
  public isConfigured(): boolean {
    return true;
  }

  /**
   * Generates a deterministic visual texture candidate procedurally
   */
  public async generate(request: GenerationRequest): Promise<GeneratedImage> {
    const startTime = performance.now();

    const resolution = Math.max(64, Math.min(2048, request.resolution || 512));
    const materialKey = (request.material || 'cobblestone').toLowerCase();
    const palette = MATERIAL_PALETTES[materialKey] || { bg: '#334155', fg: '#1e293b', accent: '#475569' };

    // Numerical seed derivation for deterministic visual variations
    const seed = request.seed ?? this.hashString(`${request.material}-${request.style}-${request.customPrompt || ''}`);

    // Construct prompt via PromptBuilder to verify prompt handling
    const builtPrompt = PromptBuilder.buildPrompt({
      material: request.material,
      style: request.style,
      detail: request.detail,
      additionalPrompt: request.additionalPrompt || request.customPrompt,
      resolution,
    });

    // Generate SVG string procedurally based on deterministic seed and material
    const svgPattern = this.createSvgPattern({
      resolution,
      palette,
      material: request.material,
      style: request.style,
      seed,
    });

    // Render SVG into PNG buffer using Sharp
    const pngBuffer = await sharp(Buffer.from(svgPattern))
      .resize(resolution, resolution)
      .png({ compressionLevel: 6 })
      .toBuffer();

    const imageDataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`;
    const endTime = performance.now();
    const duration = Math.round((endTime - startTime) * 100) / 100;

    return {
      imageDataUrl,
      model: 'deterministic-mock-v1',
      builtPrompt,
      generationTimeMs: duration,
      metadata: {
        providerId: this.id,
        isDevelopmentMock: true,
        seed,
        requestedMaterial: request.material,
        requestedStyle: request.style,
        detailLevel: request.detail || 'high',
        resolution,
      },
    };
  }

  /**
   * Creates an SVG texture pattern procedurally based on material, style, and seed
   */
  private createSvgPattern(params: {
    resolution: number;
    palette: { bg: string; fg: string; accent: string };
    material: string;
    style: string;
    seed: number;
  }): string {
    const { resolution, palette, material, style, seed } = params;
    const gridCount = 8;
    const cellSize = resolution / gridCount;

    // Pseudo-random helper seeded deterministically
    const randomAt = (x: number, y: number) => {
      const val = Math.sin(seed * 9999 + x * 12.9898 + y * 78.233) * 43758.5453;
      return val - Math.floor(val);
    };

    let cellsContent = '';
    for (let row = 0; yCondition(row, gridCount); row++) {
      for (let col = 0; col < gridCount; col++) {
        const x = col * cellSize;
        const y = row * cellSize;
        const r = randomAt(col, row);

        const fill = r > 0.6 ? palette.accent : r > 0.3 ? palette.fg : palette.bg;
        const sizeOffset = (r * cellSize) / 4;

        cellsContent += `<rect x="${x + sizeOffset / 2}" y="${y + sizeOffset / 2}" width="${cellSize - sizeOffset}" height="${cellSize - sizeOffset}" fill="${fill}" rx="${cellSize / 8}" opacity="0.85" />`;
      }
    }

    function yCondition(r: number, max: number) {
      return r < max;
    }

    return `<svg width="${resolution}" height="${resolution}" viewBox="0 0 ${resolution} ${resolution}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${resolution}" height="${resolution}" fill="${palette.bg}" />
      ${cellsContent}
      <!-- Overlay text marking as Mock Development Asset -->
      <rect x="0" y="${resolution - 24}" width="${resolution}" height="24" fill="rgba(15, 23, 42, 0.75)" />
      <text x="10" y="${resolution - 8}" fill="#f8fafc" font-family="monospace" font-size="11" font-weight="bold">
        [MOCK] ${material.toUpperCase()} (${style.toUpperCase()}) SEED:${seed}
      </text>
    </svg>`;
  }

  /**
   * Simple deterministic string hashing helper
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}

export const mockProvider = new MockImageGenerationProvider();
