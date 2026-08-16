/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BenchmarkMaterialConfig, BenchmarkMaterialId } from './types';

/**
 * Current benchmark prompt suite version
 */
export const BENCHMARK_PROMPT_VERSION = 'v1.0';

/**
 * Benchmark Framework Version
 */
export const BENCHMARK_FRAMEWORK_VERSION = '1.0.0';

/**
 * Canonical benchmark test materials and deterministic, version-controlled prompts.
 * Prompts are designed specifically for 2D game textures (flat top-down orthogonal view)
 * and explicitly avoid provider-specific optimizations or prompt engineering tricks.
 */
export const BENCHMARK_MATERIALS: Record<BenchmarkMaterialId, BenchmarkMaterialConfig> = {
  cobblestone: {
    id: 'cobblestone',
    name: 'Cobblestone',
    description: 'Weathered stone cobblestone pavement for game terrain pathways',
    prompt:
      'Seamless 2D game texture of a weathered stone cobblestone path. Flat top-down orthogonal view, clean tiling pattern with natural stone variations and subtle mortar lines between grey paving stones. No perspective, no horizon, no 3D depth, no objects, no characters, no text, no UI.',
    promptVersion: BENCHMARK_PROMPT_VERSION,
    defaultStyle: 'pixel art',
  },
  grass: {
    id: 'grass',
    name: 'Grass',
    description: 'Vibrant outdoor lawn grass texture for terrain baseline',
    prompt:
      'Seamless 2D game texture of vibrant green meadow grass lawn. Flat top-down orthogonal view, dense uniform blade distribution and natural organic soil texture. No perspective, no horizon, no 3D depth, no objects, no flowers, no characters, no text, no UI.',
    promptVersion: BENCHMARK_PROMPT_VERSION,
    defaultStyle: 'pixel art',
  },
  sand: {
    id: 'sand',
    name: 'Sand',
    description: 'Fine desert sand with subtle natural wind ripples',
    prompt:
      'Seamless 2D game texture of fine golden desert sand. Flat top-down orthogonal view, subtle natural wind ripples and smooth grainy surface texture. No perspective, no horizon, no 3D depth, no rocks, no characters, no text, no UI.',
    promptVersion: BENCHMARK_PROMPT_VERSION,
    defaultStyle: 'pixel art',
  },
  water: {
    id: 'water',
    name: 'Water',
    description: 'Stylized water surface texture with caustic highlights',
    prompt:
      'Seamless 2D game texture of crystal clear blue water surface. Flat top-down orthogonal view, gentle caustic light reflections and subtle wave ripples. No perspective, no horizon, no 3D depth, no land, no boats, no characters, no text, no UI.',
    promptVersion: BENCHMARK_PROMPT_VERSION,
    defaultStyle: 'pixel art',
  },
  wood: {
    id: 'wood',
    name: 'Wood',
    description: 'Rustic wooden planks for flooring and structures',
    prompt:
      'Seamless 2D game texture of dark aged rustic wooden planks. Flat top-down orthogonal view, parallel timber boards with natural wood grain lines and subtle knots. No perspective, no horizon, no 3D depth, no objects, no characters, no text, no UI.',
    promptVersion: BENCHMARK_PROMPT_VERSION,
    defaultStyle: 'pixel art',
  },
  lava: {
    id: 'lava',
    name: 'Lava',
    description: 'Molten glowing magma channels with cooling crust',
    prompt:
      'Seamless 2D game texture of molten glowing lava flow. Flat top-down orthogonal view, bright orange and red magma channels running between dark cooled basalt crusts. No perspective, no horizon, no 3D depth, no objects, no characters, no text, no UI.',
    promptVersion: BENCHMARK_PROMPT_VERSION,
    defaultStyle: 'pixel art',
  },
};

/**
 * Returns array of all canonical benchmark material configs
 */
export function getBenchmarkMaterials(): BenchmarkMaterialConfig[] {
  return Object.values(BENCHMARK_MATERIALS);
}

/**
 * Retrieves material config by ID or throws Error if invalid
 */
export function getBenchmarkMaterial(id: BenchmarkMaterialId): BenchmarkMaterialConfig {
  const config = BENCHMARK_MATERIALS[id];
  if (!config) {
    throw new Error(`Unknown benchmark material identifier: '${id}'`);
  }
  return config;
}
