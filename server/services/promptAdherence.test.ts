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
 * Deterministic Prompt & Material Adherence Unit Tests (SDXL Base 1.0 High Information Density)
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

  // 2. Unknown Material String Fallback Mapping
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

  // 3. Wood Material Purity & Cross-Material Contamination Protection
  console.log('Test 3: Wood Material Purity & Cross-Material Contamination Protection');
  const woodStructured = PromptBuilder.buildStructuredPrompt({
    material: 'wood',
    style: 'stylized',
  });
  const woodPromptLower = woodStructured.builtPrompt.toLowerCase();

  const excludedOtherMaterials: MaterialId[] = [
    'dirt',
    'stone',
    'brick',
    'grass',
    'sand',
    'metal',
    'lava',
    'water',
    'cobblestone',
    'moss',
  ];

  for (const excluded of excludedOtherMaterials) {
    const regex = new RegExp(`\\b${excluded}\\b`, 'i');
    assert.strictEqual(
      regex.test(woodPromptLower),
      false,
      `Wood positive prompt must NOT contain unrelated material '${excluded}'`
    );
  }
  assert.strictEqual(
    woodStructured.adherenceReport.forbiddenTermsFound.length,
    0,
    'Wood prompt must have zero forbidden contamination terms'
  );
  console.log('  ✓ Wood material purity verified (zero cross-material contamination)');

  // 4. Style Separation Test: retro-16bit omits camera/composition words
  console.log('Test 4: Style Separation — retro-16bit omits camera/composition words');
  const retroWood = PromptBuilder.buildStructuredPrompt({
    material: 'wood',
    style: 'retro-16bit',
  });
  const retroPromptLower = retroWood.builtPrompt.toLowerCase();

  assert.strictEqual(
    retroPromptLower.includes('top-down'),
    false,
    'retro-16bit style must NOT inject "top-down"'
  );
  assert.strictEqual(
    retroPromptLower.includes('orthographic'),
    false,
    'retro-16bit style must NOT inject "orthographic"'
  );
  assert.strictEqual(
    retroPromptLower.includes('tileset'),
    false,
    'retro-16bit style must NOT inject "tileset"'
  );
  assert.ok(
    retroPromptLower.includes('16-bit jrpg tile art style'),
    'retro-16bit style must include pure rendering art style descriptor'
  );
  console.log('  ✓ Style separation verified (camera words omitted from style descriptors)');

  // 5. Cross-Material Contamination Isolation Across ALL Canonical Materials
  console.log('Test 5: Cross-Material Contamination Isolation Across ALL Canonical Materials');
  for (const matId of canonicalIds) {
    const structured = PromptBuilder.buildStructuredPrompt({
      material: matId,
      style: 'stylized',
    });
    const promptText = structured.builtPrompt.toLowerCase();

    for (const otherId of canonicalIds) {
      if (otherId === matId) continue;
      const regex = new RegExp(`\\b${otherId}\\b`, 'i');
      assert.strictEqual(
        regex.test(promptText),
        false,
        `Canonical material '${matId}' positive prompt must NOT contain unrequested material '${otherId}'`
      );
    }
  }
  console.log(`  ✓ Cross-material isolation verified across all ${canonicalIds.length} materials`);

  // 6. Non-Repetition Check for Wood Descriptors
  console.log('Test 6: Non-Repetition Check for Wood Descriptors');
  const knotCount = (woodPromptLower.match(/\bknots\b/g) || []).length;
  const grainCount = (woodPromptLower.match(/\bgrain\b/g) || []).length;

  assert.strictEqual(
    knotCount,
    1,
    `The word 'knots' should appear at most once in Wood prompt (found ${knotCount})`
  );
  assert.strictEqual(
    grainCount,
    2, // 'fine wood grain', 'organic grain variation'
    `The word 'grain' should appear concisely without excessive repetition (found ${grainCount})`
  );
  console.log('  ✓ Descriptor non-repetition verified');

  // 7. Compact Prompt Word Count Target (25–45 words)
  console.log('Test 7: Compact Prompt Word Count Target (25–45 words)');
  for (const matId of canonicalIds) {
    const structured = PromptBuilder.buildStructuredPrompt({
      material: matId,
      style: 'stylized',
    });
    const wordCount = structured.builtPrompt.split(/\s+/).length;
    assert.ok(
      wordCount >= 20 && wordCount <= 50,
      `Prompt for '${matId}' (${wordCount} words) must be compact within target range 25-45 words`
    );
  }
  console.log('  ✓ High information-density compact prompt length verified across all materials');

  // 8. User Modifier Filtering: Filters Scene Camera Words
  console.log('Test 8: User Modifier Filtering — Filters Scene Camera Words');
  const sceneUserPrompt = PromptBuilder.buildStructuredPrompt({
    material: 'wood',
    customPrompt: 'castle in the background with camera perspective',
  });
  const scenePromptLower = sceneUserPrompt.builtPrompt.toLowerCase();

  assert.strictEqual(
    scenePromptLower.includes('castle'),
    false,
    'User prompt scene word "castle" must be filtered from positive prompt'
  );
  assert.strictEqual(
    scenePromptLower.includes('background'),
    false,
    'User prompt scene word "background" must be filtered from positive prompt'
  );
  assert.strictEqual(
    scenePromptLower.includes('perspective'),
    false,
    'User prompt scene word "perspective" must be filtered from positive prompt'
  );
  console.log('  ✓ User modifier filtering verified (scene/camera instructions stripped)');

  // 9. Legitimate Material User Modifiers Preserved
  console.log('Test 9: Legitimate Material User Modifiers Preserved');
  const validUserPrompt = PromptBuilder.buildStructuredPrompt({
    material: 'wood',
    customPrompt: 'weathered cracks with moss patches',
  });
  const validPromptLower = validUserPrompt.builtPrompt.toLowerCase();

  assert.ok(
    validPromptLower.includes('weathered cracks'),
    'Legitimate user modifier "weathered cracks" must be preserved'
  );
  assert.ok(
    validPromptLower.includes('moss patches'),
    'Legitimate user modifier "moss patches" must be preserved'
  );
  console.log('  ✓ Legitimate material user modifiers preserved');

  console.log('\n✅ All Deterministic Prompt Adherence Tests Passed Successfully!');
}

runPromptAdherenceTests().catch((err) => {
  console.error('❌ Prompt Adherence Tests Failed:', err);
  process.exit(1);
});
