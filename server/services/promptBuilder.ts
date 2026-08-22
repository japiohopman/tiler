/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getMaterialProfile, MaterialProfile } from './materialProfiles';
import { evaluatePromptAdherence, PromptAdherenceReport } from './promptAdherence';

export interface PromptBuildOptions {
  material: string;
  style?: string;
  detail?: string;
  additionalPrompt?: string;
  customPrompt?: string;
  resolution?: number;
}

export interface StructuredPromptResult {
  builtPrompt: string;
  negativePrompt: string;
  userPrompt: string;
  materialProfileId: string;
  canonicalName: string;
  adherenceReport: PromptAdherenceReport;
}

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
 * Dedicated Material-Aware Prompt Builder for 2D Game Ground Textures.
 *
 * Enforces technical, orthographic, lighting, material identity, and negative constraints
 * specified for game engine tileable ground textures.
 */
export class PromptBuilder {
  /**
   * Constructs an optimized game texture generation prompt (positive prompt string)
   */
  static buildPrompt(options: PromptBuildOptions): string {
    const res = this.buildStructuredPrompt(options);
    return res.builtPrompt;
  }

  /**
   * Constructs both positive prompt, negative prompt, and deterministic adherence report
   */
  static buildStructuredPrompt(options: PromptBuildOptions): StructuredPromptResult {
    const { material, style = 'stylized', detail = 'high', additionalPrompt, customPrompt } = options;

    const profile: MaterialProfile = getMaterialProfile(material);
    const normalizedStyle = (style || 'stylized').toLowerCase().trim();
    const normalizedDetail = (detail || 'high').toLowerCase().trim();

    const styleDescription = STYLE_DESCRIPTORS[normalizedStyle] || `${normalizedStyle} game art style`;
    const detailDescription = DETAIL_DESCRIPTORS[normalizedDetail] || DETAIL_DESCRIPTORS.high;

    // Preserve original user modifier intent
    const userModifier = (additionalPrompt || customPrompt || '').trim();

    // 1. Base Subject prioritizing Material Identity
    const primaryDescriptiveTerms = profile.descriptiveTerms.slice(0, 3).join(', ');
    const subject = `Top-down orthographic 2D game ground texture of ${profile.canonicalName} (${primaryDescriptiveTerms}).`;

    // 2. Visual Style & Artistic Rendering
    const styleClause = `Visual Style: ${styleDescription}. Detail Level: ${detailDescription}.`;

    // 3. User Additional Modifier Clause (preserves original user input verbatim)
    const userClause = userModifier.length > 0 ? `Specific Features: ${userModifier}.` : '';

    // 4. Technical Ground Texture & Orthographic Tile Constraints
    const technicalRequirements = [
      'Top-down 90-degree direct overhead orthographic view.',
      'Pure flat texture-only surface with 100% uniform seamless coverage filling the entire square frame from edge to edge.',
      'Flat ambient non-directional lighting with no cast shadows, no direct sun angle, and no external lighting direction.',
      'Seamless tileable repeating pattern design suitable as a 2D game ground terrain texture.',
    ].join(' ');

    // 5. Strict Negative Rules within prompt text
    const negativeTextClause = [
      'Strict Negative Rules:',
      'NO perspective, NO angled isometric view, NO horizon line, NO sky, NO 3D scene depth.',
      'NO characters, NO animals, NO monsters, NO trees, NO standalone objects, NO props, NO buildings, NO items.',
      'NO borders, NO frames, NO vignetting, NO circular crop, NO rounded corners.',
      'NO text, NO letters, NO numbers, NO watermark, NO logo, NO user interface (UI) elements.',
      profile.negativeConstraints.length > 0 ? `NO ${profile.negativeConstraints.join(', NO ')}.` : '',
    ]
      .filter(Boolean)
      .join(' ');

    const builtPrompt = [
      subject,
      styleClause,
      userClause,
      technicalRequirements,
      negativeTextClause,
    ]
      .filter(Boolean)
      .join(' ');

    // Build dedicated negative prompt parameter for providers supporting negative_prompt (e.g. Pixazo SDXL)
    const baseNegativeTerms = [
      'blurry',
      'distorted',
      'low quality',
      '3d render',
      'perspective view',
      'isometric',
      'horizon',
      'sky',
      'character',
      'person',
      'face',
      'building',
      'house',
      'street',
      'vehicle',
      'border',
      'frame',
      'watermark',
      'text',
    ];

    const combinedNegatives = Array.from(
      new Set([...baseNegativeTerms, ...profile.negativeConstraints.map((n) => n.toLowerCase())])
    );
    const negativePrompt = combinedNegatives.join(', ');

    // Evaluate prompt adherence deterministically
    const adherenceReport = evaluatePromptAdherence(builtPrompt, profile.id, userModifier);

    return {
      builtPrompt,
      negativePrompt,
      userPrompt: userModifier,
      materialProfileId: profile.id,
      canonicalName: profile.canonicalName,
      adherenceReport,
    };
  }
}
