/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExportPanel } from './ExportPanel';
import { Tile, ValidationSummary } from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`X TEST FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}: PASSED`);
}

console.log('======================================================');
console.log('  [ExportPanel] UI Component Tests');
console.log('======================================================');

// 1. currentTile === null renders NO TILE GENERATED and does NOT render VALIDATED SEAMLESS
{
  const html = renderToStaticMarkup(
    React.createElement(ExportPanel, {
      currentTile: null,
      onExport: () => {},
      isExporting: false,
    })
  );

  assert(
    html.includes('NO TILE GENERATED'),
    'currentTile === null renders "NO TILE GENERATED"'
  );
  assert(
    !html.includes('VALIDATED SEAMLESS'),
    'currentTile === null does NOT render "VALIDATED SEAMLESS"'
  );
}

// 2. Failed validation renders UNVALIDATED / NON-TILEABLE and notice banner
{
  const failedSummary: ValidationSummary = {
    generationStatus: 'SUCCESS',
    rawSeamScore: 0.12,
    processedSeamScore: 0.08,
    rawTileable: false,
    processedTileable: false,
    improvement: 0.04,
    improvementStatus: 'IMPROVED',
    finalStatus: 'VALIDATION_FAILED',
    threshold: 0.05,
    promptAdherenceStatus: 'NOT_AUTOMATICALLY_VALIDATED',
    issues: ['Seam delta exceeds threshold'],
  };

  const failedTile: Tile = {
    id: 'failed-tile-1',
    name: 'Cobblestone',
    material: 'cobblestone',
    style: 'stylized',
    prompt: 'cobblestone',
    resolution: 512,
    processedImageDataUrl: 'data:image/png;base64,dummy',
    rawImageDataUrl: 'data:image/png;base64,dummy',
    isTileable: false,
    seamScore: 0.08,
    validationSummary: failedSummary,
    createdAt: new Date().toISOString(),
  };

  const html = renderToStaticMarkup(
    React.createElement(ExportPanel, {
      currentTile: failedTile,
      onExport: () => {},
      isExporting: false,
    })
  );

  assert(
    html.includes('UNVALIDATED / NON-TILEABLE'),
    'Failed validation renders "UNVALIDATED / NON-TILEABLE"'
  );
  assert(
    html.includes('Exporting Unvalidated Texture'),
    'Failed validation renders "Exporting Unvalidated Texture" notice banner'
  );
  assert(
    !html.includes('VALIDATED SEAMLESS'),
    'Failed validation does NOT render "VALIDATED SEAMLESS"'
  );
}

// 3. Valid tile renders VALIDATED SEAMLESS
{
  const validSummary: ValidationSummary = {
    generationStatus: 'SUCCESS',
    rawSeamScore: 0.12,
    processedSeamScore: 0.008,
    rawTileable: false,
    processedTileable: true,
    improvement: 0.112,
    improvementStatus: 'IMPROVED',
    finalStatus: 'PASS_AFTER_PROCESSING',
    threshold: 0.05,
    promptAdherenceStatus: 'NOT_AUTOMATICALLY_VALIDATED',
    issues: [],
  };

  const validTile: Tile = {
    id: 'valid-tile-1',
    name: 'Grass',
    material: 'grass',
    style: 'stylized',
    prompt: 'grass',
    resolution: 512,
    processedImageDataUrl: 'data:image/png;base64,dummy',
    rawImageDataUrl: 'data:image/png;base64,dummy',
    isTileable: true,
    seamScore: 0.008,
    validationSummary: validSummary,
    createdAt: new Date().toISOString(),
  };

  const html = renderToStaticMarkup(
    React.createElement(ExportPanel, {
      currentTile: validTile,
      onExport: () => {},
      isExporting: false,
    })
  );

  assert(
    html.includes('VALIDATED SEAMLESS'),
    'Valid tile renders "VALIDATED SEAMLESS"'
  );
  assert(
    !html.includes('UNVALIDATED / NON-TILEABLE'),
    'Valid tile does NOT render "UNVALIDATED / NON-TILEABLE"'
  );
}

console.log('======================================================');
console.log('  All ExportPanel UI Tests Passed Successfully!');
console.log('======================================================');
