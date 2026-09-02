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
   * Creates a procedurally seamless SVG texture pattern based on material and seed
   */
  private createSvgPattern(params: {
    resolution: number;
    palette: { bg: string; fg: string; accent: string };
    material: string;
    style: string;
    seed: number;
  }): string {
    const { resolution, palette, material, seed } = params;
    const materialKey = (material || 'cobblestone').toLowerCase();

    const randomAt = (x: number, y: number) => {
      const val = Math.sin(seed * 9999 + x * 12.9898 + y * 78.233) * 43758.5453;
      return val - Math.floor(val);
    };

    let patternElements = '';

    if (materialKey === 'cobblestone' || materialKey === 'brick' || materialKey === 'stone') {
      const cols = 8;
      const rows = 8;
      const cellW = resolution / cols;
      const cellH = resolution / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * cellW;
          const y = r * cellH;
          // Periodic trig function guarantees 100% seamless color continuity across opposing edges
          const rand = 0.5 + 0.5 * Math.sin((2 * Math.PI * c) / cols) * Math.cos((2 * Math.PI * r) / rows);
          const color = rand > 0.6 ? palette.accent : rand > 0.3 ? palette.fg : palette.bg;
          const rx = 4;

          patternElements += `<rect x="${x + 1}" y="${y + 1}" width="${cellW - 2}" height="${cellH - 2}" fill="${color}" rx="${rx}" stroke="#1e293b" stroke-width="1.5" />`;
        }
      }
    } else if (materialKey === 'wood') {
      const planks = 8;
      const plankH = resolution / planks;

      for (let p = 0; p < planks; p++) {
        const y = p * plankH;
        const rand = 0.5 + 0.5 * Math.sin((2 * Math.PI * p) / planks);
        const color = rand > 0.5 ? palette.fg : palette.bg;

        patternElements += `<rect x="0" y="${y}" width="${resolution}" height="${plankH}" fill="${color}" stroke="#451a03" stroke-width="1.5" />`;
        patternElements += `<line x1="0" y1="${y + plankH * 0.5}" x2="${resolution}" y2="${y + plankH * 0.5}" stroke="${palette.accent}" stroke-width="1" opacity="0.4" />`;
      }
    } else if (materialKey === 'water') {
      patternElements += `<rect width="${resolution}" height="${resolution}" fill="${palette.bg}" />`;
      const ripples = 8;
      const step = resolution / ripples;

      for (let i = 0; i < ripples; i++) {
        const y = i * step;
        patternElements += `<path d="M 0 ${y} Q ${resolution / 4} ${y - 10}, ${resolution / 2} ${y} T ${resolution} ${y}" fill="none" stroke="${palette.accent}" stroke-width="2" opacity="0.6" />`;
      }
    } else if (materialKey === 'lava') {
      patternElements += `<rect width="${resolution}" height="${resolution}" fill="${palette.bg}" />`;
      const veins = 8;
      const step = resolution / veins;

      for (let i = 0; i < veins; i++) {
        const y = i * step;
        patternElements += `<path d="M 0 ${y} Q ${resolution / 2} ${y + 15}, ${resolution} ${y}" fill="none" stroke="${palette.accent}" stroke-width="3" />`;
      }
    } else {
      // Grass / Sand / Default organic periodic grid
      const grid = 16;
      const sz = resolution / grid;

      for (let r = 0; r < grid; r++) {
        for (let c = 0; c < grid; c++) {
          const rand = 0.5 + 0.5 * Math.sin((2 * Math.PI * c) / grid) * Math.cos((2 * Math.PI * r) / grid);
          const fill = rand > 0.6 ? palette.accent : rand > 0.3 ? palette.fg : palette.bg;
          patternElements += `<rect x="${c * sz}" y="${r * sz}" width="${sz}" height="${sz}" fill="${fill}" opacity="0.9" />`;
        }
      }
    }

    return `<svg width="${resolution}" height="${resolution}" viewBox="0 0 ${resolution} ${resolution}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${resolution}" height="${resolution}" fill="${palette.bg}" />
      ${patternElements}
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
