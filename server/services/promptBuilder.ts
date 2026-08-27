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
 * Compact visual style descriptors optimized for SDXL token efficiency
 */
const STYLE_DESCRIPTORS: Record<string, string> = {
  'pixel-art': '16-bit retro pixel art game asset style, clean pixel clusters',
  'hand-painted': 'stylized hand-painted game texture, painterly brushstrokes',
  'stylized': 'modern stylized 2D game art texture, Blizzard/Riot style',
  'photorealistic': 'photorealistic 2D ground scan texture, high fidelity',
  'retro-16bit': 'classic 16-bit top-down JRPG tileset texture',
};

/**
 * Compact detail modifier descriptions
 */
const DETAIL_DESCRIPTORS: Record<string, string> = {
  subtle: 'smooth clean surface',
  medium: 'balanced surface texture',
  high: 'high surface detail and depth',
  ultra: 'intricate micro-grain texture detail',
};

/**
 * Dedicated Material-Aware Prompt Builder for 2D Game Ground Textures.
 *
 * Generates compact, punchy positive prompts for SDXL models (15-35 words) while passing
 * negative constraints via the dedicated negative_prompt API parameter.
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

    // 1. Core Subject prioritizing Material Identity
    const primaryDescriptiveTerms = profile.descriptiveTerms.slice(0, 3).join(', ');
    const subject = `Top-down orthographic 2D game ground texture of ${profile.canonicalName} (${primaryDescriptiveTerms}).`;

    // 2. Compact Style & Detail rendering
    const styleClause = `Visual Style: ${styleDescription}. Detail: ${detailDescription}.`;

    // 3. User Additional Modifier Clause (preserves original user input verbatim)
    const userClause = userModifier.length > 0 ? `Specific Features: ${userModifier}.` : '';

    // 4. Concise Technical Tileability & Direct Overhead View constraints
    const technicalRequirements = 'Flat direct overhead orthographic view, 100% uniform seamless tileable repeating pattern surface.';

    const builtPrompt = [
      subject,
      styleClause,
      userClause,
      technicalRequirements,
    ]
      .filter(Boolean)
      .join(' ');

    // Build dedicated negative prompt parameter for SDXL models (e.g. Pixazo SDXL)
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
      'animals',
      'monsters',
      'trees',
      'props',
      'items',
      'vignetting',
      'UI',
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
