/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Built-in procedural 2D test texture generators for instant client-side testing
 * of tile repetition, seam analysis, 3x3 grids, and infinite rendering.
 */
export interface SampleTextureDefinition {
  id: string;
  name: string;
  category: 'seamless' | 'flawed' | 'game';
  description: string;
  expectedStatus: 'PASS' | 'FAIL';
  expectedScores: {
    horizontal: number;
    vertical: number;
    overall: number;
  };
  generate: (size?: number) => string; // Returns data URL
}

export const SAMPLE_TEXTURES: SampleTextureDefinition[] = [
  {
    id: 'perfect-seamless',
    name: '1. Perfect Repeating Tile',
    category: 'seamless',
    description: 'Mathematically periodic continuous wave. Edges match with 0.0000 delta.',
    expectedStatus: 'PASS',
    expectedScores: { horizontal: 0.0, vertical: 0.0, overall: 0.0 },
    generate: (size = 256) => generatePeriodicTexture(size, 0, 0),
  },
  {
    id: 'horizontal-flaw',
    name: '2. Horizontal Seam Mismatch',
    category: 'flawed',
    description: 'Right edge differs sharply from left edge, creating an obvious vertical line.',
    expectedStatus: 'FAIL',
    expectedScores: { horizontal: 0.58, vertical: 0.0, overall: 0.29 },
    generate: (size = 256) => generatePeriodicTexture(size, 180, 0),
  },
  {
    id: 'vertical-flaw',
    name: '3. Vertical Seam Mismatch',
    category: 'flawed',
    description: 'Bottom edge differs sharply from top edge, creating an obvious horizontal line.',
    expectedStatus: 'FAIL',
    expectedScores: { horizontal: 0.0, vertical: 0.58, overall: 0.29 },
    generate: (size = 256) => generatePeriodicTexture(size, 0, 180),
  },
  {
    id: 'both-flaws',
    name: '4. Both Seams Discontinuous',
    category: 'flawed',
    description: 'Both horizontal and vertical boundaries mismatch significantly.',
    expectedStatus: 'FAIL',
    expectedScores: { horizontal: 0.58, vertical: 0.58, overall: 0.58 },
    generate: (size = 256) => generatePeriodicTexture(size, 180, 180),
  },
  {
    id: 'game-cobblestone',
    name: '5. Seamless Cobblestone Path',
    category: 'game',
    description: 'Procedural stone paving with blended mortar joints.',
    expectedStatus: 'PASS',
    expectedScores: { horizontal: 0.02, vertical: 0.02, overall: 0.02 },
    generate: (size = 256) => generateCobblestoneTexture(size),
  },
  {
    id: 'game-wood',
    name: '6. Seamless Wood Planks',
    category: 'game',
    description: 'Horizontal hardwood timber planks with recurring knots and grain.',
    expectedStatus: 'PASS',
    expectedScores: { horizontal: 0.01, vertical: 0.01, overall: 0.01 },
    generate: (size = 256) => generateWoodTexture(size),
  },
];

/**
 * Procedural periodic continuous texture with controlled boundary offset injection
 */
function generatePeriodicTexture(size: number, xDelta: number, yDelta: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const half = size / 2;

  for (let y = 0; y < size; y++) {
    const symY = y < half ? y : size - 1 - y;
    const yFactor = (y / size) * Math.PI * 2;

    for (let x = 0; x < size; x++) {
      const symX = x < half ? x : size - 1 - x;
      const xFactor = (x / size) * Math.PI * 2;
      const idx = (y * size + x) * 4;

      let r = 120 + 70 * Math.sin(xFactor) * Math.cos(yFactor);
      let g = 110 + 60 * Math.sin(yFactor * 2) * Math.cos(xFactor);
      let b = 130 + 80 * Math.cos(xFactor + yFactor);

      // Add symmetry variation
      r += ((symX * 7 + symY * 13) % 40) - 20;
      g += ((symX * 11 + symY * 5) % 40) - 20;
      b += ((symX * 13 + symY * 9) % 40) - 20;

      // Inject boundary defect on right or bottom
      if (xDelta > 0 && x > size - 16) {
        const factor = (x - (size - 16)) / 16;
        r = r * (1 - factor) + 240 * factor;
        g = g * (1 - factor) + 40 * factor;
        b = b * (1 - factor) + 40 * factor;
      }

      if (yDelta > 0 && y > size - 16) {
        const factor = (y - (size - 16)) / 16;
        r = r * (1 - factor) + 40 * factor;
        g = g * (1 - factor) + 240 * factor;
        b = b * (1 - factor) + 240 * factor;
      }

      data[idx] = Math.max(0, Math.min(255, Math.floor(r)));
      data[idx + 1] = Math.max(0, Math.min(255, Math.floor(g)));
      data[idx + 2] = Math.max(0, Math.min(255, Math.floor(b)));
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Procedural cobblestone seamless texture generator
 */
function generateCobblestoneTexture(size: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Mortar base
  ctx.fillStyle = '#292524';
  ctx.fillRect(0, 0, size, size);

  const stoneGrid = 4;
  const stoneSize = size / stoneGrid;

  for (let r = 0; r < stoneGrid; r++) {
    for (let c = 0; c < stoneGrid; c++) {
      const offsetX = (r % 2 === 1 ? stoneSize / 2 : 0);
      const cx = (c * stoneSize + offsetX) % size;
      const cy = r * stoneSize;

      // Stone shape
      const padding = 4;
      const w = stoneSize - padding * 2;
      const h = stoneSize - padding * 2;

      const grad = ctx.createRadialGradient(
        cx + padding + w / 2,
        cy + padding + h / 2,
        2,
        cx + padding + w / 2,
        cy + padding + h / 2,
        w / 1.5
      );
      grad.addColorStop(0, '#78716c');
      grad.addColorStop(0.7, '#57534e');
      grad.addColorStop(1, '#44403c');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(cx + padding, cy + padding, w, h, 8);
      ctx.fill();

      // Wrap-around for seamless boundary stones if offset wraps over edge
      if (cx + padding + w > size) {
        const wrapW = (cx + padding + w) - size;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(0, cy + padding, wrapW, h, 8);
        ctx.fill();
      }
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * Procedural wood plank texture generator
 */
function generateWoodTexture(size: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const planks = 4;
  const plankH = size / planks;

  for (let p = 0; p < planks; p++) {
    const y = p * plankH;
    const grad = ctx.createLinearGradient(0, y, 0, y + plankH);
    grad.addColorStop(0, '#92400e');
    grad.addColorStop(0.5, '#78350f');
    grad.addColorStop(0.95, '#451a03');
    grad.addColorStop(1, '#1c1917');

    ctx.fillStyle = grad;
    ctx.fillRect(0, y, size, plankH);

    // Subtle grain lines
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const gy = y + (i + 1) * (plankH / 5);
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(size * 0.3, gy - 2, size * 0.7, gy + 2, size, gy);
      ctx.stroke();
    }
  }

  return canvas.toDataURL('image/png');
}
