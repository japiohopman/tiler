/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BenchmarkPrompt, CANONICAL_MATERIALS, CanonicalMaterialKey } from './types';

export const BENCHMARK_PROMPT_VERSION = 'v1.0';

/**
 * Shared base style constraint requested across all benchmark materials
 * to enforce 2D game texture output without perspective, horizons, or objects.
 */
export const SHARED_GAME_TEXTURE_STYLE =
  'top-down orthographic 2D game texture, seamless flat surface material, overhead clean view, game asset, even illumination, no perspective, no horizon, no characters, no borders';

/**
 * Canonical material prompt registry for Tiler benchmark evaluation.
 * Version-controlled (v1.0) and provider-agnostic.
 */
export const CANONICAL_BENCHMARK_PROMPTS: Record<CanonicalMaterialKey, BenchmarkPrompt> = {
  cobblestone: {
    promptVersion: BENCHMARK_PROMPT_VERSION,
    material: 'cobblestone',
    promptText: 'ancient grey cobblestone street paved with natural rounded stone tiles and dark mortar joints',
    styleText: SHARED_GAME_TEXTURE_STYLE,
    negativePrompt: 'perspective, horizon, 3d scene, building, character, border, frame, text, logo',
  },
  grass: {
    promptVersion: BENCHMARK_PROMPT_VERSION,
    material: 'grass',
    promptText: 'lush vibrant green meadow grass field with subtle blade variation and natural soil hints',
    styleText: SHARED_GAME_TEXTURE_STYLE,
    negativePrompt: 'perspective, horizon, tree, flower pot, animal, house, border, frame, text, logo',
  },
  sand: {
    promptVersion: BENCHMARK_PROMPT_VERSION,
    material: 'sand',
    promptText: 'smooth golden desert sand dunes with subtle wind ripples and fine grain texture',
    styleText: SHARED_GAME_TEXTURE_STYLE,
    negativePrompt: 'perspective, horizon, beach umbrella, footprints, camel, border, frame, text, logo',
  },
  water: {
    promptVersion: BENCHMARK_PROMPT_VERSION,
    material: 'water',
    promptText: 'clear tropical turquoise ocean water surface with soft caustic light ripples and underwater depth',
    styleText: SHARED_GAME_TEXTURE_STYLE,
    negativePrompt: 'perspective, horizon, boat, fish, shore, island, border, frame, text, logo',
  },
  wood: {
    promptVersion: BENCHMARK_PROMPT_VERSION,
    material: 'wood',
    promptText: 'polished dark oak wooden floor planks with parallel grain patterns and fine timber joins',
    styleText: SHARED_GAME_TEXTURE_STYLE,
    negativePrompt: 'perspective, horizon, furniture, door, tree trunk, border, frame, text, logo',
  },
  lava: {
    promptVersion: BENCHMARK_PROMPT_VERSION,
    material: 'lava',
    promptText: 'glowing molten volcanic lava terrain with dark basalt rock crust and glowing magma fissures',
    styleText: SHARED_GAME_TEXTURE_STYLE,
    negativePrompt: 'perspective, horizon, volcano mountain, sky, smoke plume, border, frame, text, logo',
  },
};

/**
 * Helper to retrieve all canonical prompts in order
 */
export function getCanonicalBenchmarkPrompts(): BenchmarkPrompt[] {
  return CANONICAL_MATERIALS.map((key) => CANONICAL_BENCHMARK_PROMPTS[key]);
}
