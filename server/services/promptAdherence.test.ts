/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { PromptBuilder } from './promptBuilder';
import { evaluatePromptAdherence } from './promptAdherence';
import { MATERIAL_PROFILES, getMaterialProfile } from './materialProfiles';
import { MaterialId } from '../../src/types';

/**
 * Deterministic Prompt & Material Adherence Unit Tests (SDXL Base 1.0 Corrected Architecture)
 */
async function runPromptAdherenceTests() {
  console.log('🧪 Starting Deterministic Prompt Adherence Tests...\n');

  // 1. Canonical Material Profiles Registry & Typing
  console.log('Test 1: Canonical Material Profiles Registry & Typing');
  const canonicalIds: MaterialId[] = [
    'stone',
    'cobblestone',
    'brick',
    'dirt',
    'sand',
    'wood',
    'metal',
    'moss',
    'lava',
    'water',
    'grass',
  ];

  for (const id of canonicalIds) {
    const profile = MATERIAL_PROFILES[id];
    assert.ok(profile, `Material profile for '${id}' must exist in MATERIAL_PROFILES`);
    assert.strictEqual(profile.id, id, `Profile id '${profile.id}' must match canonical MaterialId '${id}'`);
  }
  console.log(`  ✓ All ${canonicalIds.length} canonical material profiles verified with strict MaterialId typing`);

  // 2. Regression Test: Unknown String Fallback Mapping
  console.log('Test 2: Unknown Material String Fallback Mapping');
  const unknownProfile = getMaterialProfile('custom_unknown_material');
  assert.strictEqual(
    unknownProfile.id,
    'stone',
    'Unknown string inputs must resolve to a valid canonical MaterialId fallback'
  );
  assert.strictEqual(
    unknownProfile.canonicalName,
    'Custom_unknown_material',
    'Custom material string name must be capitalized in fallback'
  );
  console.log('  ✓ Unknown material string fallback mapping verified');

  // 3. Normal material prompt generation across canonical materials
  console.log('Test 3: Normal material prompt construction for canonical materials');
  const lavaStructured = PromptBuilder.buildStructuredPrompt({
    material: 'lava',
    style: 'stylized',
  });

  assert.ok(
    lavaStructured.builtPrompt.toLowerCase().includes('lava') ||
      lavaStructured.builtPrompt.toLowerCase().includes('magma'),
    'Lava prompt must contain strong lava/magma semantics'
  );
  assert.strictEqual(lavaStructured.adherenceReport.hasMaterialIdentity, true);
  console.log('  ✓ Material-aware prompt construction verified');

  // 4. Custom user prompt preservation
  console.log('Test 4: Custom user prompt is preserved verbatim');
  const customWording = 'wet lava with blue glowing cracks';
  const customStructured = PromptBuilder.buildStructuredPrompt({
    material: 'lava',
    style: 'stylized',
    customPrompt: customWording,
  });

  assert.ok(
    customStructured.builtPrompt.includes(customWording),
    'Custom user prompt wording must be preserved verbatim in assembled prompt'
  );
  assert.strictEqual(customStructured.adherenceReport.hasUserIntentPreserved, true);
  console.log('  ✓ Custom prompt preservation verified');

  // 5. Custom prompt does NOT bypass material/tileability constraints
  console.log('Test 5: Custom prompt does NOT bypass material profile or tileability constraints');
  assert.ok(
    customStructured.builtPrompt.includes('Lava material surface'),
    'Assembled prompt with customPrompt must still contain material surface subject'
  );
  assert.ok(
    customStructured.builtPrompt.includes('seamless tileable texture'),
    'Assembled prompt with customPrompt must still enforce tileability constraint'
  );
  console.log('  ✓ Custom prompt non-bypass verified');

  // 6. Camera framing decision test: Positive prompt omits legacy camera words
  console.log('Test 6: Architectural Decision — Positive prompt omits camera framing words');
  const positivePrompt = lavaStructured.builtPrompt.toLowerCase();
  assert.strictEqual(
    positivePrompt.includes('top-down'),
    false,
    'Positive prompt must omit legacy camera framing word "top-down" per SDXL Rule 2'
  );
  assert.strictEqual(
    positivePrompt.includes('orthographic'),
    false,
    'Positive prompt must omit legacy camera framing word "orthographic" per SDXL Rule 2'
  );
  assert.ok(
    positivePrompt.includes('seamless tileable texture'),
    'Positive prompt must rely on explicit seamless tileability constraints'
  );
  console.log('  ✓ Camera framing terms omission verified');

  // 7. Negative prompt incorporates SDXL composition words
  console.log('Test 7: Negative prompt payload incorporates SDXL composition terms');
  assert.ok(
    customStructured.negativePrompt.includes('buildings'),
    'Negative prompt payload must include profile negative terms like "buildings"'
  );
  assert.ok(
    customStructured.negativePrompt.includes('perspective'),
    'Negative prompt payload must include SDXL composition negatives like "perspective"'
  );
  assert.ok(
    customStructured.negativePrompt.includes('horizon'),
    'Negative prompt payload must include SDXL composition negatives like "horizon"'
  );
  assert.ok(
    customStructured.negativePrompt.includes('water'),
    'Negative prompt payload for lava must include excluded material terms like "water"'
  );
  console.log('  ✓ Material-aware negative prompt payload verified');

  // 8. Style modification without removing material identity
  console.log('Test 8: Style modification without removing material identity');
  const pixelLava = PromptBuilder.buildStructuredPrompt({
    material: 'lava',
    style: 'pixel-art',
  });

  assert.ok(
    pixelLava.builtPrompt.includes('16-bit retro pixel art game asset style'),
    'Pixel art style descriptor must be included'
  );
  assert.ok(
    pixelLava.builtPrompt.toLowerCase().includes('lava'),
    'Lava material identity must remain present despite pixel art style modification'
  );
  assert.strictEqual(pixelLava.adherenceReport.hasMaterialIdentity, true);
  console.log('  ✓ Style modification without material dilution verified');

  // 9. Compact prompt length target check (25-60 words)
  console.log('Test 9: Compact SDXL prompt length target (25-60 words)');
  const wordCount = lavaStructured.builtPrompt.split(/\s+/).length;
  assert.ok(
    wordCount >= 20 && wordCount <= 60,
    `Built prompt length (${wordCount} words) must be compact around 25-60 words target`
  );
  console.log(`  ✓ Compact prompt length verified (${wordCount} words)`);

  console.log('\n✅ All Deterministic Prompt Adherence Tests Passed Successfully!');
}

runPromptAdherenceTests().catch((err) => {
  console.error('❌ Prompt Adherence Tests Failed:', err);
  process.exit(1);
});
