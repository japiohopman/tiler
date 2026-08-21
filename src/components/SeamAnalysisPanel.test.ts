/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SeamAnalysisPanel } from './SeamAnalysisPanel';
import { SeamAnalysisResult, ValidationSummary } from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`X TEST FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}: PASSED`);
}

console.log('======================================================');
console.log('  [SeamAnalysisPanel] UI Component Tests');
console.log('======================================================');

const sampleReportPass: SeamAnalysisResult = {
  pass: true,
  threshold: 0.05,
  edgeRegion: 4,
  horizontalScore: 0.0028,
  verticalScore: 0.011,
  overallScore: 0.0069,
  width: 512,
  height: 512,
  maxHorizontalDelta: 0.005,
  maxVerticalDelta: 0.02,
  discontinuousPixelCount: 0,
  totalEdgePixelsEvaluated: 4096,
  issues: [],
};

const sampleReportFail: SeamAnalysisResult = {
  pass: false,
  threshold: 0.05,
  edgeRegion: 4,
  horizontalScore: 0.0828,
  verticalScore: 0.091,
  overallScore: 0.0869,
  width: 512,
  height: 512,
  maxHorizontalDelta: 0.1,
  maxVerticalDelta: 0.12,
  discontinuousPixelCount: 250,
  totalEdgePixelsEvaluated: 4096,
  issues: ['Horizontal seam delta exceeds threshold'],
};

const sampleRawReportFail: SeamAnalysisResult = {
  pass: false,
  threshold: 0.05,
  edgeRegion: 4,
  horizontalScore: 0.12,
  verticalScore: 0.11,
  overallScore: 0.115,
  width: 512,
  height: 512,
  maxHorizontalDelta: 0.15,
  maxVerticalDelta: 0.14,
  discontinuousPixelCount: 400,
  totalEdgePixelsEvaluated: 4096,
  issues: ['Seam delta exceeds threshold'],
};

const sampleRawReportPass: SeamAnalysisResult = {
  pass: true,
  threshold: 0.05,
  edgeRegion: 4,
  horizontalScore: 0.001,
  verticalScore: 0.002,
  overallScore: 0.0015,
  width: 512,
  height: 512,
  maxHorizontalDelta: 0.002,
  maxVerticalDelta: 0.003,
  discontinuousPixelCount: 0,
  totalEdgePixelsEvaluated: 4096,
  issues: [],
};

// 1. PASS_RAW renders raw-pass final status
{
  const summary: ValidationSummary = {
    generationStatus: 'SUCCESS',
    rawSeamScore: 0.0015,
    processedSeamScore: 0.0069,
    rawTileable: true,
    processedTileable: true,
    improvement: 0.0,
    improvementStatus: 'UNCHANGED',
    finalStatus: 'PASS_RAW',
    threshold: 0.05,
    promptAdherenceStatus: 'NOT_AUTOMATICALLY_VALIDATED',
    issues: [],
  };

  const html = renderToStaticMarkup(
    React.createElement(SeamAnalysisPanel, {
      report: sampleReportPass,
      rawReport: sampleRawReportPass,
      validationSummary: summary,
    })
  );

  assert(
    html.includes('PASS — RAW OUTPUT ALREADY TILEABLE'),
    'PASS_RAW renders "PASS — RAW OUTPUT ALREADY TILEABLE"'
  );
}

// 2. PASS_AFTER_PROCESSING renders processed-pass final status
{
  const summary: ValidationSummary = {
    generationStatus: 'SUCCESS',
    rawSeamScore: 0.115,
    processedSeamScore: 0.0069,
    rawTileable: false,
    processedTileable: true,
    improvement: 0.1081,
    improvementStatus: 'IMPROVED',
    finalStatus: 'PASS_AFTER_PROCESSING',
    threshold: 0.05,
    promptAdherenceStatus: 'NOT_AUTOMATICALLY_VALIDATED',
    issues: [],
  };

  const html = renderToStaticMarkup(
    React.createElement(SeamAnalysisPanel, {
      report: sampleReportPass,
      rawReport: sampleRawReportFail,
      validationSummary: summary,
    })
  );

  assert(
    html.includes('PASS AFTER PROCESSING'),
    'PASS_AFTER_PROCESSING renders "PASS AFTER PROCESSING"'
  );
}

// 3. VALIDATION_FAILED renders failure status and failure details
{
  const summary: ValidationSummary = {
    generationStatus: 'SUCCESS',
    rawSeamScore: 0.115,
    processedSeamScore: 0.0869,
    rawTileable: false,
    processedTileable: false,
    improvement: 0.02,
    improvementStatus: 'IMPROVED',
    finalStatus: 'VALIDATION_FAILED',
    threshold: 0.05,
    promptAdherenceStatus: 'NOT_AUTOMATICALLY_VALIDATED',
    issues: ['Seam delta exceeds threshold'],
  };

  const html = renderToStaticMarkup(
    React.createElement(SeamAnalysisPanel, {
      report: sampleReportFail,
      rawReport: sampleRawReportFail,
      validationSummary: summary,
    })
  );

  assert(
    html.includes('VALIDATION FAILED'),
    'VALIDATION_FAILED renders "VALIDATION FAILED"'
  );
  assert(
    html.includes('Validation Failure Details'),
    'VALIDATION_FAILED renders failure details panel'
  );
}

// 4. Raw tileability and processed tileability remain independently displayed
{
  const summary: ValidationSummary = {
    generationStatus: 'SUCCESS',
    rawSeamScore: 0.115,
    processedSeamScore: 0.0069,
    rawTileable: false,
    processedTileable: true,
    improvement: 0.1081,
    improvementStatus: 'IMPROVED',
    finalStatus: 'PASS_AFTER_PROCESSING',
    threshold: 0.05,
    promptAdherenceStatus: 'NOT_AUTOMATICALLY_VALIDATED',
    issues: [],
  };

  const html = renderToStaticMarkup(
    React.createElement(SeamAnalysisPanel, {
      report: sampleReportPass,
      rawReport: sampleRawReportFail,
      validationSummary: summary,
    })
  );

  // Checks both RAW TILEABILITY and PROCESSED TILEABILITY exist and have their distinct statuses
  assert(
    html.includes('RAW TILEABILITY') && html.includes('PROCESSED TILEABILITY'),
    'Raw tileability and processed tileability sections are rendered independently'
  );
  assert(
    html.includes('✗ FAIL') && html.includes('✓ PASS'),
    'Displays raw FAIL and processed PASS independently'
  );
}

// 5. Final status does NOT change based on a separate report.pass / isPass when validationSummary.finalStatus is present
{
  // Even if report.pass is true, if validationSummary.finalStatus is VALIDATION_FAILED, it must render VALIDATION FAILED
  const summaryFailed: ValidationSummary = {
    generationStatus: 'SUCCESS',
    rawSeamScore: 0.0015,
    processedSeamScore: 0.0869,
    rawTileable: false,
    processedTileable: false,
    improvement: -0.05,
    improvementStatus: 'WORSENED',
    finalStatus: 'VALIDATION_FAILED',
    threshold: 0.05,
    promptAdherenceStatus: 'NOT_AUTOMATICALLY_VALIDATED',
    issues: ['Seam delta exceeds threshold'],
  };

  const html = renderToStaticMarkup(
    React.createElement(SeamAnalysisPanel, {
      report: sampleReportPass, // report.pass is true!
      rawReport: sampleRawReportFail,
      validationSummary: summaryFailed,
    })
  );

  assert(
    html.includes('VALIDATION FAILED'),
    'finalStatus VALIDATION_FAILED overrides report.pass === true'
  );
  assert(
    !html.includes('PASS AFTER PROCESSING') && !html.includes('PASS — RAW OUTPUT ALREADY TILEABLE'),
    'finalStatus VALIDATION_FAILED suppresses pass status texts despite report.pass === true'
  );
}

// 6. Missing validationSummary fallback handled safely without silently reinterpreting as success
{
  const htmlWithoutSummary = renderToStaticMarkup(
    React.createElement(SeamAnalysisPanel, {
      report: sampleReportFail, // report.pass is false
    })
  );

  assert(
    htmlWithoutSummary.includes('VALIDATION FAILED'),
    'Missing validationSummary with failing report renders VALIDATION FAILED'
  );
  assert(
    htmlWithoutSummary.includes('Validation Failure Details'),
    'Missing validationSummary with failing report shows failure details'
  );
}

console.log('======================================================');
console.log('  All SeamAnalysisPanel UI Tests Passed Successfully!');
console.log('======================================================');
