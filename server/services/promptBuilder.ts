/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PromptBuildOptions {
  material: string;
  style: string;
  detail?: string;
  additionalPrompt?: string;
  customPrompt?: string;
  resolution?: number;
}

/**
 * Material descriptor mapping for enhanced 2D game ground texture generation
 */
const MATERIAL_DESCRIPTORS: Record<string, string> = {
  cobblestone: 'ancient irregular stone cobblestones with realistic mortar lines, chipped rock edges, and natural mineral wear',
  wood: 'weathered timber wood floor planks with horizontal grain lines, soft knots, and tactile lumber grooves',
  water: 'crystal-clear turquoise water surface with gentle caustic ripples and transparent fluid depth',
  grass: 'lush green meadow grass turf with fine individual blades, clovers, and earthy soil undertones',
  lava: 'cracked black basalt rock crust with glowing orange-red molten magma veins and volcanic heat fissures',
  sand: 'fine golden desert sand grains with gentle wind-blown micro-ripples and smooth dune granule texture',
};

/**
 * Visual style descriptor mapping for game asset rendering
 */
const STYLE_DESCRIPTORS: Record<string, string> = {
  'pixel-art': '16-bit retro pixel art game asset style, clean pixel clusters, subtle dithering, limited cohesive palette',
  'hand-painted': 'stylized hand-painted game texture, painterly digital art brushstrokes, soft ambient occlusion',
  'stylized': 'modern stylized game texture, clean defined shapes, vibrant saturation, smooth bevels, Blizzard/Riot game art style',
  'photorealistic': 'photorealistic 2D ground scan texture, micro-surface details, ultra-high fidelity material texture',
  'retro-16bit': 'classic 16-bit JRPG top-down tileset asset, crisp sprite-friendly boundaries, retro console aesthetic',
};

/**
 * Detail modifier descriptions
 */
const DETAIL_DESCRIPTORS: Record<string, string> = {
  subtle: 'clean low-frequency details, minimal noise, smooth surface readability',
  medium: 'balanced surface texture, natural frequency variation, clear definition',
  high: 'high surface complexity, rich micro-details, intricate crevices and texture depth',
  ultra: 'maximum intricate texture detail, micro-grain, complex surface fractures and high definition',
};

/**
 * Dedicated Prompt Builder for 2D Game Ground Textures.
 *
 * Enforces all technical, orthographic, lighting, and negative constraints
 * specified for game engine tileable ground textures.
 */
export class PromptBuilder {
  /**
   * Constructs an optimized game texture generation prompt
   */
  static buildPrompt(options: PromptBuildOptions): string {
    const { material, style, detail = 'high', additionalPrompt, customPrompt } = options;

    const normalizedMat = material.toLowerCase().trim();
    const normalizedStyle = style.toLowerCase().trim();
    const normalizedDetail = detail.toLowerCase().trim();

    const matDescription = MATERIAL_DESCRIPTORS[normalizedMat] || `${normalizedMat} surface`;
    const styleDescription = STYLE_DESCRIPTORS[normalizedStyle] || `${normalizedStyle} game art style`;
    const detailDescription = DETAIL_DESCRIPTORS[normalizedDetail] || DETAIL_DESCRIPTORS.high;

    // Base subject
    const subject = `Top-down orthographic 2D game ground texture of ${matDescription}.`;

    // Visual style & artistic rendering
    const styleClause = `Visual Style: ${styleDescription}. Detail Level: ${detailDescription}.`;

    // User additional custom prompt guidance if provided
    const userModifier = additionalPrompt || customPrompt;
    const additionalClause = userModifier && userModifier.trim().length > 0
      ? `Specific Features: ${userModifier.trim()}.`
      : '';

    // Technical ground texture constraints
    const technicalRequirements = [
      'Top-down 90-degree direct overhead orthographic view.',
      'Pure flat texture-only surface with 100% uniform seamless coverage filling the entire square frame from edge to edge.',
      'Flat ambient non-directional lighting with no cast shadows, no direct sun angle, and no external lighting direction.',
      'Seamless tileable repeating pattern design suitable as a 2D game ground terrain texture.',
    ].join(' ');

    // Strict negative constraints to eliminate objects, perspective, UI, borders, etc.
    const negativeConstraints = [
      'Strict Negative Rules:',
      'NO perspective, NO angled isometric view, NO horizon line, NO sky, NO 3D scene depth.',
      'NO characters, NO animals, NO monsters, NO trees, NO standalone objects, NO props, NO buildings, NO items.',
      'NO borders, NO frames, NO vignetting, NO circular crop, NO rounded corners.',
      'NO text, NO letters, NO numbers, NO watermark, NO logo, NO user interface (UI) elements.',
    ].join(' ');

    return [
      subject,
      styleClause,
      additionalClause,
      technicalRequirements,
      negativeConstraints,
    ]
      .filter(Boolean)
      .join(' ');
  }
}
