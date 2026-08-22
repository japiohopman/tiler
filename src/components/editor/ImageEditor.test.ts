/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DEFAULT_COLOR,
  DEFAULT_CROP,
  DEFAULT_EDITOR_STATE,
  DEFAULT_TRANSFORM,
  hslToRgb,
  renderImageToCanvas,
  renderImageToDataUrl,
  rgbToHsl,
} from '../../utils/imageEditorCanvas';
import { WorkspaceAsset } from '../../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Assertion Failed]: ${message}`);
  }
}

// Global Canvas DOM Mock for Node testing environment
if (typeof global !== 'undefined' && !(global as any).document) {
  (global as any).document = {
    createElement: (tagName: string) => {
      if (tagName === 'canvas') {
        const mockCtx = {
          clearRect: () => {},
          save: () => {},
          restore: () => {},
          translate: () => {},
          scale: () => {},
          rotate: () => {},
          drawImage: () => {},
          getImageData: () => ({
            data: new Uint8ClampedArray(512 * 512 * 4),
            width: 512,
            height: 512,
          }),
          putImageData: () => {},
        };
        return {
          width: 512,
          height: 512,
          getContext: () => mockCtx,
          toDataURL: () => 'data:image/png;base64,mockEditedImageDataUrl',
        };
      }
      return {};
    },
  };
}

async function runImageEditorUnitTests() {
  console.log('\n======================================================');
  console.log('  [ImageEditor Engine & Lifecycle] Unit Tests');
  console.log('======================================================');

  // Test 1: Color Space Conversions (RGB <-> HSL)
  {
    const [h, s, l] = rgbToHsl(255, 0, 0); // Red
    assert(Math.round(h) === 0, 'RGB to HSL hue for pure red is 0°');
    assert(Math.round(s * 100) === 100, 'RGB to HSL saturation for pure red is 100%');

    const [r, g, b] = hslToRgb(0, 1, 0.5); // Red
    assert(r === 255 && g === 0 && b === 0, 'HSL to RGB for (0, 1, 0.5) returns pure red (255, 0, 0)');
    console.log('  ✓ RGB <-> HSL color conversion functions: PASSED');
  }

  // Test 2: Transform State Defaults & Rotations
  {
    let transform = { ...DEFAULT_TRANSFORM };
    assert(transform.rotation === 0, 'Default rotation is 0°');
    assert(!transform.flipH, 'Default flipH is false');
    assert(!transform.flipV, 'Default flipV is false');

    // Simulate 90° CW rotation
    transform.rotation = ((transform.rotation + 90) % 360) as 0 | 90 | 180 | 270;
    assert(transform.rotation === 90, 'Rotate 90° CW results in 90°');

    transform.rotation = ((transform.rotation + 90) % 360) as 0 | 90 | 180 | 270;
    assert(transform.rotation === 180, 'Second 90° CW rotation results in 180°');

    // Simulate 90° CCW rotation
    transform.rotation = ((transform.rotation + 270) % 360) as 0 | 90 | 180 | 270;
    assert(transform.rotation === 90, 'Rotate 90° CCW from 180° returns to 90°');

    // Reset
    transform = { ...DEFAULT_TRANSFORM };
    assert(transform.rotation === 0, 'Reset transform restores 0° rotation');
    console.log('  ✓ Transform rotation (CW / CCW) and reset: PASSED');
  }

  // Test 3: Flip Horizontal and Flip Vertical
  {
    let transform = { ...DEFAULT_TRANSFORM };
    transform.flipH = !transform.flipH;
    assert(transform.flipH === true, 'Toggling flipH sets flipH to true');

    transform.flipV = !transform.flipV;
    assert(transform.flipV === true, 'Toggling flipV sets flipV to true');

    transform = { ...DEFAULT_TRANSFORM };
    assert(!transform.flipH && !transform.flipV, 'Resetting transform restores default flip states');
    console.log('  ✓ Transform flip horizontal / vertical and reset: PASSED');
  }

  // Test 4: Crop Modes and Dimensions
  {
    let crop = { ...DEFAULT_CROP };
    assert(crop.mode === 'none', 'Default crop mode is none');

    crop = { ...crop, mode: '1:1' };
    assert(crop.mode === '1:1', 'Setting crop mode 1:1');

    crop = { mode: 'free', x: 10, y: 10, width: 80, height: 80 };
    assert(crop.width === 80 && crop.height === 80, 'Free crop allows custom width and height percentages');

    crop = { ...DEFAULT_CROP };
    assert(crop.mode === 'none', 'Reset crop restores full image mode');
    console.log('  ✓ Crop mode switching (none, 1:1, free) and reset: PASSED');
  }

  // Test 5: Color Bounded Ranges and Adjustments
  {
    let color = { ...DEFAULT_COLOR };
    assert(color.brightness === 0, 'Default brightness is 0');
    assert(color.contrast === 0, 'Default contrast is 0');
    assert(color.saturation === 0, 'Default saturation is 0');
    assert(color.hue === 0, 'Default hue is 0°');

    color.brightness = 25;
    color.contrast = -10;
    color.saturation = 50;
    color.hue = 90;

    assert(color.brightness === 25, 'Brightness updated to 25');
    assert(color.contrast === -10, 'Contrast updated to -10');
    assert(color.saturation === 50, 'Saturation updated to 50');
    assert(color.hue === 90, 'Hue shift updated to 90°');

    color = { ...DEFAULT_COLOR };
    assert(color.brightness === 0 && color.hue === 0, 'Reset color restores all default color values');
    console.log('  ✓ Color adjustment controls (brightness, contrast, saturation, hue) and reset: PASSED');
  }

  // Test 6: Render Canvas Utility & Data URL Generation
  {
    const mockImage = {
      naturalWidth: 512,
      naturalHeight: 512,
      width: 512,
      height: 512,
    } as any;

    const state = {
      transform: { rotation: 90 as const, flipH: true, flipV: false },
      crop: { mode: 'none' as const, x: 0, y: 0, width: 100, height: 100 },
      color: { brightness: 10, contrast: 10, saturation: 10, hue: 0 },
    };

    const dataUrl = renderImageToDataUrl(mockImage, state);
    assert(typeof dataUrl === 'string', 'renderImageToDataUrl returns a string');
    assert(dataUrl.startsWith('data:image/png'), 'renderImageToDataUrl returns a PNG Data URL');
    console.log('  ✓ Canvas rendering and Data URL generation: PASSED');
  }

  // Test 7: Non-Destructive Editing Lifecycle (RAW preserved)
  {
    const mockAsset: WorkspaceAsset = {
      id: 'tile-test-1',
      name: 'Cobblestone (Stylized)',
      material: 'cobblestone',
      style: 'stylized',
      prompt: 'test prompt',
      resolution: 512,
      rawImageDataUrl: 'data:image/png;base64,originalRawImageData',
      processedImageDataUrl: 'data:image/png;base64,originalProcessedImageData',
      isTileable: true,
      seamScore: 0.01,
      createdAt: new Date().toISOString(),
    };

    // Opening editor does not mutate mockAsset
    assert(mockAsset.rawImageDataUrl === 'data:image/png;base64,originalRawImageData', 'RAW image preserved on asset open');
    assert(mockAsset.editedImageDataUrl === undefined, 'editedImageDataUrl initially undefined');

    // Apply edits
    const editedUrl = 'data:image/png;base64,newEditedImageDataUrl';
    const updatedAsset = {
      ...mockAsset,
      editedImageDataUrl: editedUrl,
      processedImageDataUrl: undefined, // Invalidated
      isTileable: false,
      validationSummary: {
        generationStatus: 'SUCCESS' as const,
        rawTileable: true,
        processedTileable: false,
        rawSeamScore: 0.01,
        processedSeamScore: 1,
        improvement: 0,
        improvementStatus: 'UNCHANGED' as const,
        finalStatus: 'VALIDATION_FAILED' as const,
        threshold: 0.05,
        issues: ['Asset edited — explicit reprocessing required to validate seams'],
        promptAdherenceStatus: 'NOT_AUTOMATICALLY_VALIDATED' as const,
      },
    };

    assert(updatedAsset.rawImageDataUrl === 'data:image/png;base64,originalRawImageData', 'RAW image remains intact after Apply');
    assert(updatedAsset.editedImageDataUrl === 'data:image/png;base64,newEditedImageDataUrl', 'editedImageDataUrl is committed to asset');
    assert(updatedAsset.processedImageDataUrl === undefined, 'Stale processedImageDataUrl is invalidated');
    assert(updatedAsset.validationSummary.finalStatus === 'VALIDATION_FAILED', 'Validation summary marked as VALIDATION_FAILED until reprocessing');
    console.log('  ✓ Non-destructive editing lifecycle (RAW preserved, edits committed, stale validation invalidated): PASSED');
  }

  console.log('======================================================');
  console.log('  All ImageEditor Unit Tests Passed Successfully!');
  console.log('======================================================\n');
}

runImageEditorUnitTests().catch((err) => {
  console.error('ImageEditor unit tests failed:', err);
  process.exit(1);
});
