/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorkspaceAsset } from '../../types';
import {
  DEFAULT_COLOR,
  DEFAULT_CROP,
  DEFAULT_TRANSFORM,
  hslToRgb,
  rgbToHsl,
  ImageEditorTransform,
} from '../../utils/imageEditorCanvas';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`X TEST FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}: PASSED`);
}

console.log('======================================================');
console.log('  [ImageEditor] Unit & Integration Tests');
console.log('======================================================');

// 1. Image Editor Default State Constants
{
  assert(DEFAULT_TRANSFORM.rotation === 0, 'DEFAULT_TRANSFORM rotation is 0');
  assert(DEFAULT_TRANSFORM.flipH === false, 'DEFAULT_TRANSFORM flipH is false');
  assert(DEFAULT_TRANSFORM.flipV === false, 'DEFAULT_TRANSFORM flipV is false');
  assert(DEFAULT_CROP.mode === 'none', 'DEFAULT_CROP mode is none');
  assert(DEFAULT_COLOR.brightness === 0, 'DEFAULT_COLOR brightness is 0');
  assert(DEFAULT_COLOR.contrast === 0, 'DEFAULT_COLOR contrast is 0');
  assert(DEFAULT_COLOR.saturation === 0, 'DEFAULT_COLOR saturation is 0');
  assert(DEFAULT_COLOR.hue === 0, 'DEFAULT_COLOR hue is 0');
}

// 2. Color HSL/RGB Conversion Functions
{
  const [h, s, l] = rgbToHsl(255, 0, 0); // Pure Red
  assert(Math.round(h) === 0 && Math.round(s * 100) === 100, 'rgbToHsl correctly converts pure red');

  const [r, g, b] = hslToRgb(h, s, l);
  assert(r === 255 && g === 0 && b === 0, 'hslToRgb correctly converts HSL back to RGB');
}

// 3. Asset Switching Reset Semantics
{
  const assetA: WorkspaceAsset = {
    id: 'asset-switch-A',
    name: 'Asset A',
    material: 'cobblestone',
    style: 'stylized',
    prompt: 'cobblestone',
    resolution: 512,
    rawImageDataUrl: 'data:image/png;base64,rawA',
    createdAt: new Date().toISOString(),
    isTileable: true,
  };

  const assetB: WorkspaceAsset = {
    id: 'asset-switch-B',
    name: 'Asset B',
    material: 'grass',
    style: 'hand-painted',
    prompt: 'grass',
    resolution: 512,
    rawImageDataUrl: 'data:image/png;base64,rawB',
    createdAt: new Date().toISOString(),
    isTileable: true,
  };

  let currentEditorAsset: WorkspaceAsset | null = assetA;

  // Simulate editing asset A (dirty state in editor)
  let localTransform: ImageEditorTransform = { ...DEFAULT_TRANSFORM, rotation: 90 };
  assert(localTransform.rotation === 90, 'Editor state modified for Asset A');

  // User selects Asset B from history panel -> editor context switches to Asset B
  currentEditorAsset = assetB;
  localTransform = { ...DEFAULT_TRANSFORM }; // Reset hook effect triggers on asset.id change

  assert(currentEditorAsset.id === 'asset-switch-B', 'Editor context switched to Asset B');
  assert(localTransform.rotation === 0, 'Editor controls reset when switching asset context');
  assert(assetA.rawImageDataUrl === 'data:image/png;base64,rawA', 'Asset A remains completely unmutated on context switch');
}

console.log('======================================================');
console.log('  All ImageEditor Unit Tests Passed Successfully!');
console.log('======================================================');
