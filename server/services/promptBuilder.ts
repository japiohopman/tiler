/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaterialId } from '../../src/types';
import { getMaterialProfile, MATERIAL_PROFILES, MaterialProfile } from './materialProfiles';
import { evaluatePromptAdherence, PromptAdherenceReport } from './promptAdherence';

export interface PromptBuildOptions {
  material: MaterialId | string;
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
  materialProfileId: MaterialId;
  canonicalName: string;
  adherenceReport: PromptAdherenceReport;
}

/**
 * Visual style descriptor mapping for game asset rendering.
 * Strictly describes rendering art style without camera/composition words.
 */
const STYLE_DESCRIPTORS: Record<string, string> = {
  'pixel-art': '16-bit pixel art style',
  'hand-painted': 'stylized hand-painted art style',
  'stylized': 'clean stylized art style',
  'photorealistic': 'photorealistic material scan style',
  'retro-16bit': '16-bit JRPG tile art style',
};

/**
 * Camera and scene composition words to filter from user prompt modifiers
 */
const SCENE_CAMERA_WORDS = [
  'camera',
  'perspective',
  'horizon',
  'foreground',
  'background',
  'wide shot',
  'close-up',
  'centered',
  '3d scene',
  'isometric',
  'building',
  'castle',
  'house',
  'tileset',
  'top-down',
  'orthographic',
];

/**
 * SDXL Base 1.0 — High Information-Density Compact Prompt Builder
 *
 * Implements compact material prompt architecture:
 * [promptDescriptor] + [optional style] + [optional userModifier] + seamless tileable texture
 *
 * Target length: 15–25 words (hard maximum: 30 words).
 * Uses a single authoritative compact material descriptor rather than concatenating profile fields.
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
   * Sanitizes user custom modifiers to prevent scene/camera composition contamination
   * and unrequested cross-material leakage.
   */
  private static sanitizeUserModifier(
    userModifier: string,
    activeMaterialId: MaterialId
  ): string {
    if (!userModifier || userModifier.trim().length === 0) {
      return '';
    }

    let cleaned = userModifier.trim();

    // 1. Remove camera/scene composition phrases
    for (const word of SCENE_CAMERA_WORDS) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      cleaned = cleaned.replace(regex, '');
    }

    // Clean up residual double spaces or leading/trailing punctuation
    cleaned = cleaned.replace(/\s+/g, ' ').replace(/^[,.\s]+|[,.\s]+$/g, '').trim();

    // 2. Check for accidental cross-material contamination
    // If user input is strictly just the name or description of another material, strip it unless explicit combination requested
    const allMaterialIds = Object.keys(MATERIAL_PROFILES) as MaterialId[];
    for (const otherId of allMaterialIds) {
      if (otherId === activeMaterialId) continue;

      const otherProfile = MATERIAL_PROFILES[otherId];
      if (
        cleaned.toLowerCase() === otherId ||
        cleaned.toLowerCase() === otherProfile.canonicalName.toLowerCase()
      ) {
        return '';
      }
    }

    return cleaned;
  }

  /**
   * Constructs positive prompt, negative prompt, and deterministic adherence report
   */
  static buildStructuredPrompt(options: PromptBuildOptions): StructuredPromptResult {
    const { material, style, additionalPrompt, customPrompt } = options;

    const profile: MaterialProfile = getMaterialProfile(material);
    const normalizedStyle = (style || '').toLowerCase().trim();

    // Preserve original user modifier intent verbatim for metadata, but sanitize for prompt string
    const rawUserModifier = (additionalPrompt || customPrompt || '').trim();
    const sanitizedUserModifier = this.sanitizeUserModifier(rawUserModifier, profile.id);

    // 1. Authoritative Compact Canonical Material Descriptor
    const materialDescriptor = profile.promptDescriptor;

    // 2. Style descriptor (subordinate rendering art style, no camera wording)
    const styleClause = normalizedStyle && STYLE_DESCRIPTORS[normalizedStyle]
      ? STYLE_DESCRIPTORS[normalizedStyle]
      : '';

    // 3. User additional features (sanitized for purity and scene preservation)
    const userClause = sanitizedUserModifier.length > 0 ? sanitizedUserModifier : '';

    // 4. Minimal Universal Tileability Constraint Tail
    const qualityClause = 'seamless tileable texture';

    // Assemble compact positive prompt following high information-density formula
    const promptSegments = [
      materialDescriptor,
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
    const adherenceReport = evaluatePromptAdherence(builtPrompt, profile.id, rawUserModifier);

    return {
      builtPrompt,
      negativePrompt,
      userPrompt: rawUserModifier,
      materialProfileId: profile.id,
      canonicalName: profile.canonicalName,
      adherenceReport,
    };
  }
}
