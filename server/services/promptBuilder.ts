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
  'pixel-art': '16-bit retro pixel art game asset style',
  'hand-painted': 'stylized hand-painted game texture style',
  'stylized': 'modern stylized game texture art style',
  'photorealistic': 'photorealistic 2D ground surface scan style',
  'retro-16bit': 'classic 16-bit JRPG top-down tileset style',
};

/**
 * SDXL Base 1.0 — Tileable Texture Prompt Builder
 *
 * Implements standard SDXL 1.0 template:
 * [MATERIAL] + [SURFACE STRUCTURE] + [COLOR / PALETTE] + [SMALL-SCALE DETAILS] + [NATURAL VARIATION] +
 * [USER MODIFIER] + [STYLE] +
 * evenly distributed detail, uniform surface, flat neutral lighting, seamless tileable texture, continuous pattern, no visible borders
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
    const { material, style, additionalPrompt, customPrompt } = options;

    const profile: MaterialProfile = getMaterialProfile(material);
    const normalizedStyle = (style || '').toLowerCase().trim();

    // Preserve original user modifier intent verbatim
    const userModifier = (additionalPrompt || customPrompt || '').trim();

    // 1. Material subject line with top-down orthographic camera framing
    const materialSubject = `Top-down orthographic ${profile.canonicalName} material surface`;

    // 2. Structured material profile terms from SDXL template
    const structureClause = profile.surfaceStructure;
    const paletteClause = profile.colorPalette;
    const detailClause = profile.smallScaleDetails;
    const variationClause = profile.naturalVariation;

    // 3. Style descriptor (if specified and not default)
    const styleClause = normalizedStyle && STYLE_DESCRIPTORS[normalizedStyle]
      ? STYLE_DESCRIPTORS[normalizedStyle]
      : '';

    // 4. User additional features (verbatim)
    const userClause = userModifier.length > 0 ? userModifier : '';

    // 5. Mandatory SDXL Tileable Texture Quality & Borderless Constraints
    const qualityClause = 'evenly distributed detail, uniform surface, flat neutral lighting, seamless tileable texture, continuous pattern, no visible borders';

    // Assemble compact positive prompt following template structure
    const promptSegments = [
      materialSubject,
      structureClause,
      paletteClause,
      detailClause,
      variationClause,
      styleClause,
      userClause,
      qualityClause,
    ].filter((segment) => Boolean(segment) && segment.length > 0);

    const builtPrompt = promptSegments.join(', ');

    // Standard SDXL 1.0 Negative Prompt
    const baseNegativeTerms = [
      'object',
      'objects',
      'scene',
      'landscape',
      'building',
      'character',
      'person',
      'animal',
      'furniture',
      'centered object',
      'focal point',
      'perspective',
      'horizon',
      'foreground',
      'background',
      'frame',
      'border',
      'vignette',
      'text',
      'logo',
      'watermark',
      'UI',
      'strong directional lighting',
      'dramatic shadows',
      'visible seams',
      'blurry',
      'distorted',
      'low quality',
      '3d render',
    ];

    const combinedNegatives = Array.from(
      new Set([
        ...baseNegativeTerms,
        ...(profile.negativeConstraints || []).map((n) => n.toLowerCase()),
      ])
    );
    const negativePrompt = combinedNegatives.join(', ');

    // Evaluate prompt adherence deterministically
    const adherenceReport = evaluatePromptAdherence(builtPrompt, profile.id, userModifier);

    return {
      builtPrompt,
      negativePrompt,
      userPrompt: userModifier,
      materialProfileId: String(profile.id),
      canonicalName: profile.canonicalName,
      adherenceReport,
    };
  }
}
