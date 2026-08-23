/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaterialId } from '../../src/types';
import { getMaterialProfile, MaterialProfile } from './materialProfiles';

export interface PromptAdherenceReport {
  materialId: MaterialId;
  canonicalName: string;
  score: number; // 0 to 100
  pass: boolean; // score >= 70 and no critical forbidden terms
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

const REQUIRED_TILE_KEYWORDS = [
  'top-down',
  'orthographic',
  'overhead',
  'texture',
  'seamless',
  'surface',
];

/**
 * Deterministically evaluates an assembled prompt for material identity, tile constraints,
 * user intent preservation, and absence of forbidden semantic terms.
 */
export function evaluatePromptAdherence(
  prompt: string,
  materialId: MaterialId | string,
  userPrompt?: string
): PromptAdherenceReport {
  const profile: MaterialProfile = getMaterialProfile(materialId);
  const promptLower = prompt.toLowerCase();

  const matchedMaterialTerms: string[] = [];
  const matchedTileTerms: string[] = [];
  const matchedUserTerms: string[] = [];
  const forbiddenTermsFound: string[] = [];
  const issues: string[] = [];

  // 1. Check Material Identity
  // The canonical name or descriptive terms must be present
  if (promptLower.includes(profile.canonicalName.toLowerCase()) || promptLower.includes(profile.id)) {
    matchedMaterialTerms.push(profile.canonicalName);
  }

  for (const term of profile.descriptiveTerms) {
    const termLower = term.toLowerCase();
    if (promptLower.includes(termLower)) {
      matchedMaterialTerms.push(term);
    } else {
      // Check sub-words
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

  // 2. Check Tile Constraints
  for (const kw of REQUIRED_TILE_KEYWORDS) {
    if (promptLower.includes(kw)) {
      matchedTileTerms.push(kw);
    }
  }

  const hasTileConstraints = matchedTileTerms.length >= 2;
  if (!hasTileConstraints) {
    issues.push('Prompt lacks sufficient top-down / orthographic / seamless tile constraint terms');
  }

  // 3. Check Forbidden Terms
  for (const forbidden of profile.forbiddenTerms) {
    const forbiddenLower = forbidden.toLowerCase();
    // Use regex word boundary check so "water" doesn't match "watermark" in negative rules unless specified
    // But note: negative rules in prompt string might say "NO sky, NO buildings".
    // Forbidden terms check verifies whether positive prompt accidentally contains forbidden concepts outside negative rules!
    const positivePart = promptLower.split('strict negative rules:')[0] || promptLower.split('negative guidance:')[0] || promptLower;

    // Check if forbidden term appears in the positive prompt section
    const regex = new RegExp(`\\b${forbiddenLower}\\b`, 'i');
    if (regex.test(positivePart)) {
      forbiddenTermsFound.push(forbidden);
    }
  }

  if (forbiddenTermsFound.length > 0) {
    issues.push(`Positive prompt contains forbidden semantic terms: ${forbiddenTermsFound.join(', ')}`);
  }

  // 4. Check User Intent Preservation
  let hasUserIntentPreserved = true;
  if (userPrompt && userPrompt.trim().length > 0) {
    const userWords = userPrompt
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);

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

  // Material identity: max 40 points
  if (hasMaterialIdentity) {
    score += Math.min(40, 20 + matchedMaterialTerms.length * 5);
  }

  // Tile constraints: max 30 points
  if (hasTileConstraints) {
    score += Math.min(30, matchedTileTerms.length * 6);
  }

  // User intent preservation: max 20 points
  if (hasUserIntentPreserved) {
    score += 20;
  }

  // Absence of forbidden terms in positive section: max 10 points
  if (forbiddenTermsFound.length === 0) {
    score += 10;
  } else {
    // Penalty for forbidden terms in positive section
    score = Math.max(0, score - forbiddenTermsFound.length * 15);
  }

  const pass = score >= 70 && forbiddenTermsFound.length === 0 && hasMaterialIdentity;

  const details = [
    `Material: ${profile.canonicalName} (${hasMaterialIdentity ? 'MATCHED' : 'MISSING'})`,
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
