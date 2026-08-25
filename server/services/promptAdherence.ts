/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaterialId } from '../../src/types';
import { getMaterialProfile, MATERIAL_PROFILES, MaterialProfile } from './materialProfiles';

export interface PromptAdherenceReport {
  materialId: MaterialId;
  canonicalName: string;
  score: number; // 0 to 100
  pass: boolean; // score >= 70 and no critical forbidden terms or excessive length
  hasMaterialIdentity: boolean;
  hasTileConstraints: boolean;
  hasUserIntentPreserved: boolean;
  forbiddenTermsFound: string[];
  matchedMaterialTerms: string[];
  matchedTileTerms: string[];
  matchedUserTerms: string[];
  issues: string[];
  details: string;
}

/**
 * Required surface tileability keywords for SDXL material texture generation
 */
const REQUIRED_TILE_KEYWORDS = [
  'seamless',
  'tileable',
  'texture',
];

/**
 * Composition words forbidden in positive prompts per SDXL Rule 2
 */
const COMPOSITION_FORBIDDEN_WORDS = [
  'centered',
  'foreground',
  'background',
  'horizon',
  'perspective',
  'camera',
  'close-up',
  'wide shot',
  'scene',
  'landscape',
  'focal point',
  'top-down',
  'orthographic',
  'tileset',
];

/**
 * Deterministically evaluates an assembled prompt for material identity, tile constraints,
 * user intent preservation, absence of forbidden semantic / composition terms,
 * absence of unrequested cross-material contamination, and compact word length (target: 15–25 words, max 30 words).
 */
export function evaluatePromptAdherence(
  prompt: string,
  materialId: MaterialId | string,
  userPrompt?: string
): PromptAdherenceReport {
  const profile: MaterialProfile = getMaterialProfile(materialId);
  const promptLower = prompt.toLowerCase();
  const userLower = (userPrompt || '').toLowerCase();

  const matchedMaterialTerms: string[] = [];
  const matchedTileTerms: string[] = [];
  const matchedUserTerms: string[] = [];
  const forbiddenTermsFound: string[] = [];
  const issues: string[] = [];

  // 1. Check Material Identity
  if (promptLower.includes(profile.canonicalName.toLowerCase()) || promptLower.includes(profile.id)) {
    matchedMaterialTerms.push(profile.canonicalName);
  }

  for (const term of profile.descriptiveTerms) {
    const termLower = term.toLowerCase();
    if (promptLower.includes(termLower)) {
      matchedMaterialTerms.push(term);
    } else {
      const subWords = termLower.split(' ').filter((w) => w.length > 3);
      for (const sw of subWords) {
        if (promptLower.includes(sw) && !matchedMaterialTerms.includes(sw)) {
          matchedMaterialTerms.push(sw);
        }
      }
    }
  }

  const hasMaterialIdentity = matchedMaterialTerms.length > 0;
  if (!hasMaterialIdentity) {
    issues.push(`Prompt missing canonical material terms for '${profile.canonicalName}'`);
  }

  // 2. Check Surface Tileability Constraints
  for (const kw of REQUIRED_TILE_KEYWORDS) {
    if (promptLower.includes(kw)) {
      matchedTileTerms.push(kw);
    }
  }

  const hasTileConstraints = matchedTileTerms.length >= 2;
  if (!hasTileConstraints) {
    issues.push('Prompt lacks sufficient seamless tileability constraint terms');
  }

  // 3. Check Forbidden Material & Composition Terms in positive prompt
  const positivePart = promptLower.split('strict negative rules:')[0] || promptLower.split('negative guidance:')[0] || promptLower;

  const forbiddenCheckList = Array.from(
    new Set([...profile.forbiddenTerms, ...COMPOSITION_FORBIDDEN_WORDS])
  );

  for (const forbidden of forbiddenCheckList) {
    const forbiddenLower = forbidden.toLowerCase();
    const regex = new RegExp(`\\b${forbiddenLower.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (regex.test(positivePart)) {
      forbiddenTermsFound.push(forbidden);
    }
  }

  // 4. Check for Unrequested Cross-Material Contamination
  const allMaterialIds = Object.keys(MATERIAL_PROFILES) as MaterialId[];
  for (const otherId of allMaterialIds) {
    if (otherId === profile.id) continue;

    const otherProfile = MATERIAL_PROFILES[otherId];
    const otherName = otherProfile.canonicalName.toLowerCase();

    const idRegex = new RegExp(`\\b${otherId}\\b`, 'i');
    const nameRegex = new RegExp(`\\b${otherName}\\b`, 'i');

    const hasOtherInPrompt = idRegex.test(positivePart) || nameRegex.test(positivePart);
    const userRequestedOther = userLower.includes(otherId) || userLower.includes(otherName);

    if (hasOtherInPrompt && !userRequestedOther) {
      forbiddenTermsFound.push(`cross-material contamination: ${otherId}`);
    }
  }

  if (forbiddenTermsFound.length > 0) {
    issues.push(`Positive prompt contains forbidden semantic/composition/contamination terms: ${forbiddenTermsFound.join(', ')}`);
  }

  // 5. Check Prompt Compactness (Target: 15-25 words, Hard Max: 30 words)
  const wordCount = prompt.trim().split(/\s+/).length;
  if (wordCount > 30) {
    issues.push(`Prompt length (${wordCount} words) exceeds hard maximum limit of 30 words`);
  }

  // 6. Check User Intent Preservation
  let hasUserIntentPreserved = true;
  if (userPrompt && userPrompt.trim().length > 0) {
    const userWords = userPrompt
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !COMPOSITION_FORBIDDEN_WORDS.includes(w));

    for (const uw of userWords) {
      if (promptLower.includes(uw)) {
        matchedUserTerms.push(uw);
      }
    }

    if (userWords.length > 0 && matchedUserTerms.length === 0) {
      hasUserIntentPreserved = false;
      issues.push(`User custom prompt '${userPrompt}' terms were not preserved in the assembled prompt`);
    }
  }

  // Calculate deterministic score (0 to 100)
  let score = 0;

  if (hasMaterialIdentity) {
    score += Math.min(40, 20 + matchedMaterialTerms.length * 5);
  }

  if (hasTileConstraints) {
    score += Math.min(30, matchedTileTerms.length * 10);
  }

  if (hasUserIntentPreserved) {
    score += 20;
  }

  if (forbiddenTermsFound.length === 0 && wordCount <= 30) {
    score += 10;
  } else {
    score = Math.max(0, score - forbiddenTermsFound.length * 15 - (wordCount > 30 ? 20 : 0));
  }

  const pass = score >= 70 && forbiddenTermsFound.length === 0 && hasMaterialIdentity && wordCount <= 30;

  const details = [
    `Material: ${profile.canonicalName} (${hasMaterialIdentity ? 'MATCHED' : 'MISSING'})`,
    `Words: ${wordCount} (Target: 15-25, Max: 30)`,
    `Score: ${score}/100 [${pass ? 'PASS' : 'WEAK_ADHERENCE'}]`,
    `Matched Material Terms: ${matchedMaterialTerms.join(', ') || 'None'}`,
    `Matched Tile Constraints: ${matchedTileTerms.join(', ') || 'None'}`,
    `User Terms Preserved: ${matchedUserTerms.join(', ') || 'N/A'}`,
    forbiddenTermsFound.length > 0 ? `Forbidden Terms Found: ${forbiddenTermsFound.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  return {
    materialId: profile.id,
    canonicalName: profile.canonicalName,
    score,
    pass,
    hasMaterialIdentity,
    hasTileConstraints,
    hasUserIntentPreserved,
    forbiddenTermsFound,
    matchedMaterialTerms,
    matchedTileTerms,
    matchedUserTerms,
    issues,
    details,
  };
}
