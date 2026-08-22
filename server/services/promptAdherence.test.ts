/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { PromptBuilder } from './promptBuilder';
import { evaluatePromptAdherence } from './promptAdherence';
import { getMaterialProfile } from './materialProfiles';

/**
 * Deterministic Prompt & Material Adherence Unit Tests (Phase 3.6)
 */
async function runPromptAdherenceTests() {
  console.log('🧪 Starting Deterministic Prompt Adherence Tests...\n');

  // 1. Material Identity Test: Lava
  console.log('Test 1: Lava material identity prompt construction');
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
  console.log('  ✓ Lava material identity verified');

  // 2. User Intent Preservation
  console.log('Test 2: User prompt intent preservation');
  const customInput = 'wet lava with blue glowing cracks';
  const customStructured = PromptBuilder.buildStructuredPrompt({
    material: 'lava',
    style: 'stylized',
    additionalPrompt: customInput,
  });

  assert.ok(
    customStructured.builtPrompt.includes('wet lava with blue glowing cracks'),
    'Assembled prompt must preserve user-specific additional prompt verbatim'
  );
  assert.strictEqual(customStructured.adherenceReport.hasUserIntentPreserved, true);
  console.log('  ✓ User prompt intent preservation verified');

  // 3. Negative Constraints Test
  console.log('Test 3: Negative constraint generation');
  assert.ok(
    customStructured.negativePrompt.includes('buildings'),
    'Negative prompt payload must include profile negative constraint terms like "buildings"'
  );
  assert.ok(
    customStructured.negativePrompt.includes('houses'),
    'Negative prompt payload must include profile negative constraint terms like "houses"'
  );
  console.log('  ✓ Negative constraints verified');

  // 4. Tile & Orthographic Constraints Test
  console.log('Test 4: Tile & orthographic constraints inclusion');
  assert.ok(
    customStructured.builtPrompt.includes('Top-down 90-degree direct overhead orthographic view'),
    'Prompt must enforce top-down orthographic view'
  );
  assert.ok(
    customStructured.builtPrompt.includes('Seamless tileable repeating pattern'),
    'Prompt must enforce seamless repeating pattern constraint'
  );
  assert.strictEqual(customStructured.adherenceReport.hasTileConstraints, true);
  console.log('  ✓ Tile & orthographic constraints verified');

  // 5. Style Modification Without Diluting Material
  console.log('Test 5: Style modification without removing material identity');
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

  // 6. Material Profile Isolation (No Cross-Leakage in positive prompt)
  console.log('Test 6: Material profile isolation');
  const positiveLavaPrompt = lavaStructured.builtPrompt.toLowerCase().split('strict negative rules:')[0];
  assert.strictEqual(
    positiveLavaPrompt.includes('cobblestone'),
    false,
    'Lava positive prompt must not contain cobblestone terms'
  );
  assert.strictEqual(
    positiveLavaPrompt.includes('mortar'),
    false,
    'Lava positive prompt must not contain mortar terms'
  );
  console.log('  ✓ Material profile isolation verified');

  // 7. Deterministic Adherence Scoring Test
  console.log('Test 7: Deterministic adherence scoring accuracy');
  const report = evaluatePromptAdherence(lavaStructured.builtPrompt, 'lava', '');
  assert.ok(report.score >= 70, `Score should be >= 70, got ${report.score}`);
  assert.strictEqual(report.pass, true, 'Valid prompt should pass adherence check');

  // Weak/bad prompt test
  const badPrompt = 'A cute dog sitting in a house next to a window';
  const badReport = evaluatePromptAdherence(badPrompt, 'lava', '');
  assert.ok(badReport.score < 70, `Bad prompt score should be < 70, got ${badReport.score}`);
  assert.strictEqual(badReport.pass, false, 'Bad prompt should fail adherence check');
  assert.ok(badReport.forbiddenTermsFound.length > 0, 'Should flag forbidden terms like house or window');
  console.log('  ✓ Deterministic adherence scoring accuracy verified');

  console.log('\n✅ All Deterministic Prompt Adherence Tests Passed Successfully!');
}

runPromptAdherenceTests().catch((err) => {
  console.error('❌ Prompt Adherence Tests Failed:', err);
  process.exit(1);
});
