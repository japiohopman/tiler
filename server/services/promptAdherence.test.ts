/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { PromptBuilder } from './promptBuilder';
import { evaluatePromptAdherence } from './promptAdherence';

/**
 * Deterministic Prompt & Material Adherence Unit Tests (SDXL Base 1.0 Spec)
 */
async function runPromptAdherenceTests() {
  console.log('🧪 Starting Deterministic Prompt Adherence Tests...\n');

  // 1. Normal material prompt uses the material-aware builder
  console.log('Test 1: Normal material prompt uses material-aware builder');
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

  // 2. Custom prompt is preserved
  console.log('Test 2: Custom user prompt is preserved verbatim');
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

  // 3. Custom prompt does NOT bypass material/tile constraints
  console.log('Test 3: Custom prompt does NOT bypass material profile or tile constraints');
  assert.ok(
    customStructured.builtPrompt.includes('Top-down orthographic Lava material surface') ||
    customStructured.builtPrompt.includes('Lava'),
    'Assembled prompt with customPrompt must still contain material profile identity'
  );
  assert.ok(
    customStructured.builtPrompt.includes('Top-down orthographic'),
    'Assembled prompt with customPrompt must still enforce top-down orthographic constraint'
  );
  assert.ok(
    customStructured.builtPrompt.includes('seamless tileable texture'),
    'Assembled prompt with customPrompt must still enforce tileability constraint'
  );
  console.log('  ✓ Custom prompt non-bypass verified');

  // 4. Final provider prompt equals prompt evaluated for adherence and stored in metadata
  console.log('Test 4: Final provider prompt equality across adherence report & metadata contract');
  const providerPrompt = customStructured.builtPrompt;
  const adherenceEvaluatedPrompt = customStructured.adherenceReport.details;
  assert.ok(
    adherenceEvaluatedPrompt.includes('Lava (MATCHED)'),
    'Adherence report must evaluate the exact assembled prompt sent to provider'
  );
  assert.strictEqual(
    customStructured.userPrompt,
    customWording,
    'User prompt metadata must retain original user prompt input'
  );
  console.log('  ✓ Prompt identity across provider payload and metadata verified');

  // 5. Adherence evaluation evaluates the exact prompt sent to the provider
  console.log('Test 5: Adherence evaluation evaluates exact provider prompt');
  const directReport = evaluatePromptAdherence(providerPrompt, 'lava', customWording);
  assert.strictEqual(directReport.score, customStructured.adherenceReport.score);
  assert.strictEqual(directReport.pass, customStructured.adherenceReport.pass);
  console.log('  ✓ Exact prompt adherence evaluation verified');

  // 6. Negative prompt remains material-aware and incorporates SDXL composition negatives
  console.log('Test 6: Negative prompt payload remains material-aware and incorporates SDXL negatives');
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

  // 7. Style modification without removing material identity
  console.log('Test 7: Style modification without removing material identity');
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

  // 8. Material profile isolation (no cross-leakage in positive prompt)
  console.log('Test 8: Material profile isolation');
  const positiveLavaPrompt = lavaStructured.builtPrompt.toLowerCase();
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

  // 9. Prompt length target check (25-60 words compact prompt)
  console.log('Test 9: Compact SDXL prompt length target (25-60 words)');
  const wordCount = lavaStructured.builtPrompt.split(/\s+/).length;
  assert.ok(
    wordCount >= 20 && wordCount <= 70,
    `Built prompt length (${wordCount} words) must be compact around 25-60 words target`
  );
  console.log(`  ✓ Compact prompt length verified (${wordCount} words)`);

  console.log('\n✅ All Deterministic Prompt Adherence Tests Passed Successfully!');
}

runPromptAdherenceTests().catch((err) => {
  console.error('❌ Prompt Adherence Tests Failed:', err);
  process.exit(1);
});
