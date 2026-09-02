/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { mockProvider } from '../providers/mockProvider';
import { GeneratedImage, GenerationRequest, ImageGenerationProvider } from '../providers/types';
import {
  BENCHMARK_FRAMEWORK_VERSION,
  BENCHMARK_PROMPT_VERSION,
  benchmarkReporter,
  benchmarkRunner,
  calculateSpeedScore,
  calculateTileabilityScore,
  calculateWeightedQualityScore,
  getBenchmarkMaterial,
  getBenchmarkMaterials,
} from './index';

async function runTests() {
  console.log('======================================================');
  console.log('  [BenchmarkFramework] Starting Unit Test Suite');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, description: string) {
    total++;
    if (condition) {
      console.log(`  ✓ ${description}: PASSED`);
      passed++;
    } else {
      console.error(`  ❌ ${description}: FAILED`);
      throw new Error(`Assertion failed: ${description}`);
    }
  }

  // 1. Canonical Materials & Versioned Prompts
  console.log('--- Material Definitions & Prompt Versioning ---');
  const materials = getBenchmarkMaterials();
  assert(materials.length === 6, 'Contains exactly 6 canonical materials');

  const expectedIds = ['cobblestone', 'grass', 'sand', 'water', 'wood', 'lava'];
  const actualIds = materials.map((m) => m.id);
  assert(
    expectedIds.every((id) => actualIds.includes(id as any)),
    'Contains cobblestone, grass, sand, water, wood, lava'
  );

  for (const mat of materials) {
    assert(mat.promptVersion === BENCHMARK_PROMPT_VERSION, `Material '${mat.id}' uses prompt version ${BENCHMARK_PROMPT_VERSION}`);
    assert(mat.prompt.length > 50, `Material '${mat.id}' has descriptive prompt`);
    assert(mat.prompt.includes('Seamless 2D game texture'), `Material '${mat.id}' specifies 2D game texture constraint`);
    assert(mat.prompt.includes('No perspective'), `Material '${mat.id}' explicitly excludes perspective`);
  }

  assert(getBenchmarkMaterial('cobblestone').id === 'cobblestone', 'getBenchmarkMaterial retrieves cobblestone');

  // 2. Metrics & Scoring Calculations
  console.log('\n--- Objective Metrics & Scoring Calculations ---');
  assert(calculateTileabilityScore(0.0) === 100, 'Seam score 0.0 maps to Tileability score 100');
  assert(calculateTileabilityScore(0.05) === 95, 'Seam score 0.05 maps to Tileability score 95');
  assert(calculateTileabilityScore(1.0) === 0, 'Seam score 1.0 maps to Tileability score 0');
  assert(calculateTileabilityScore(null) === null, 'Seam score null maps to Tileability score null');

  assert(calculateSpeedScore(0) === 100, 'Raw generation time 0ms maps to Speed score 100');
  assert(calculateSpeedScore(1000) === 80, 'Raw generation time 1000ms maps to Speed score 80');
  assert(calculateSpeedScore(5000) === 0, 'Raw generation time 5000ms maps to Speed score 0');
  assert(calculateSpeedScore(null) === null, 'Raw generation time null maps to Speed score null');

  const qualityScore = calculateWeightedQualityScore({
    rawSeamScore: 0.12, // Raw provider score (discontinuous)
    processedSeamScore: 0.01, // Processed Tiler score
    rawGenerationTimeMs: 500, // Raw generation time
  });

  // Primary tileability score is derived from rawSeamScore (1 - 0.12 = 0.88 -> 88%)
  assert(qualityScore.components.tileability === 88, 'Primary Tileability score derived from rawSeamScore (88%)');
  assert(qualityScore.components.processedTileability === 99, 'Diagnostic processedTileability score derived from processedSeamScore (99%)');
  assert(qualityScore.components.generationSpeed === 90, 'Speed component derived from rawGenerationTimeMs (90%)');
  assert(qualityScore.components.textureQuality === null, 'Texture quality subjective score is null by default');

  // Objective score calculation: (88 * 0.30) + (90 * 0.10) = 26.4 + 9 = 35.4
  assert(qualityScore.score === 35.4, 'Weighted objective score evaluated correctly using raw metrics (35.4)');

  // 3. Execution with MockProvider & Verification of Distinct Dual Seam Measurements
  console.log('\n--- Dual Seam Measurements Verification (Raw vs Processed) ---');
  const runResult = await benchmarkRunner.run(mockProvider, {
    resolution: 512,
    seed: 12345,
  });

  assert(runResult.benchmarkVersion === BENCHMARK_FRAMEWORK_VERSION, 'Result contains benchmark version');
  assert(runResult.providerId === 'mock', 'Result providerId matches mock');
  assert(runResult.summary.total === 6, 'Summary total is 6');
  assert(runResult.summary.successful === 6, 'Summary successful is 6');
  assert(runResult.summary.failed === 0, 'Summary failed is 0');
  assert(typeof runResult.summary.averageRawGenerationTimeMs === 'number', 'Summary records averageRawGenerationTimeMs');
  assert(typeof runResult.summary.averageLatencyMs === 'number', 'Summary records averageLatencyMs');
  assert(typeof runResult.summary.averageRawSeamScore === 'number', 'Summary records averageRawSeamScore');
  assert(typeof runResult.summary.averageProcessedSeamScore === 'number', 'Summary records averageProcessedSeamScore');

  for (const item of runResult.results) {
    assert(item.success === true, `Material '${item.material}' generation succeeded`);
    assert(item.width === 512 && item.height === 512, `Material '${item.material}' resolution is 512x512`);

    assert(typeof item.rawSeamScore === 'number', `Material '${item.material}' has rawSeamScore`);
    assert(typeof item.processedSeamScore === 'number', `Material '${item.material}' has processedSeamScore`);

    // Verify dual measurements exist: Raw vs Processed
    assert(
      typeof item.rawSeamScore === 'number' && typeof item.processedSeamScore === 'number',
      `Material '${item.material}' rawSeamScore (${item.rawSeamScore}) and processedSeamScore (${item.processedSeamScore}) are measured`
    );

    assert(typeof item.rawGenerationTimeMs === 'number', `Material '${item.material}' has rawGenerationTimeMs`);
    assert(typeof item.tileProcessingTimeMs === 'number', `Material '${item.material}' has tileProcessingTimeMs`);
    assert(
      item.latencyMs >= (item.rawGenerationTimeMs || 0) + (item.tileProcessingTimeMs || 0) - 1,
      `Total latencyMs is end-to-end duration (${item.latencyMs}ms >= gen ${item.rawGenerationTimeMs}ms + proc ${item.tileProcessingTimeMs}ms)`
    );
  }

  // 4. Determinism Verification
  console.log('\n--- Determinism Verification ---');
  const runResult2 = await benchmarkRunner.run(mockProvider, {
    resolution: 512,
    seed: 12345,
  });

  for (let i = 0; i < runResult.results.length; i++) {
    const item1 = runResult.results[i];
    const item2 = runResult2.results[i];
    assert(item1.rawSeamScore === item2.rawSeamScore, `Material '${item1.material}' rawSeamScores are identical across runs`);
    assert(item1.processedSeamScore === item2.processedSeamScore, `Material '${item1.material}' processedSeamScores are identical across runs`);
  }

  // 5. Failure Handling & Isolation
  console.log('\n--- Isolated Per-Test Failure Handling ---');
  class FlakyMockProvider implements ImageGenerationProvider {
    public readonly id = 'flaky-mock';
    public readonly name = 'Flaky Mock Provider (Test Only)';

    isConfigured(): boolean {
      return true;
    }

    async generate(request: GenerationRequest): Promise<GeneratedImage> {
      if (request.material === 'sand') {
        throw new Error('Simulated network failure on material sand');
      }
      return mockProvider.generate(request);
    }
  }

  const flakyProvider = new FlakyMockProvider();
  const flakyResult = await benchmarkRunner.run(flakyProvider, { resolution: 512, seed: 999 });

  assert(flakyResult.summary.total === 6, 'Flaky run total is 6');
  assert(flakyResult.summary.successful === 5, 'Flaky run successful is 5');
  assert(flakyResult.summary.failed === 1, 'Flaky run failed is 1');

  const sandResult = flakyResult.results.find((r) => r.material === 'sand');
  assert(sandResult !== undefined, 'Sand result exists in flaky run');
  assert(sandResult?.success === false, 'Sand material is marked as failed');
  assert(sandResult?.rawSeamScore === null, 'Failed material rawSeamScore is null');
  assert(sandResult?.processedSeamScore === null, 'Failed material processedSeamScore is null');
  assert(sandResult?.errors.some((e) => e.includes('Simulated network failure')), 'Error message captured in results');

  const grassResult = flakyResult.results.find((r) => r.material === 'grass');
  assert(grassResult?.success === true, 'Other materials (grass) succeeded despite sand failure');

  // 6. Report Generation
  console.log('\n--- Benchmark Reporter Verification ---');
  const jsonReport = benchmarkReporter.generateJsonReport(runResult);
  assert(typeof jsonReport === 'string' && jsonReport.includes('"rawSeamScore"'), 'generateJsonReport includes rawSeamScore');

  const parsedJson = JSON.parse(jsonReport);
  assert(parsedJson.summary.averageRawSeamScore !== undefined, 'Parsed JSON includes averageRawSeamScore');

  const markdownReport = benchmarkReporter.generateMarkdownReport(runResult);
  assert(markdownReport.includes('# Tiler Benchmark Report'), 'generateMarkdownReport contains title');
  assert(markdownReport.includes('Raw Seam Delta'), 'Markdown report contains Raw Seam Delta column');
  assert(markdownReport.includes('Processed Seam'), 'Markdown report contains Processed Seam column');

  console.log('\n======================================================');
  console.log(`  Benchmark Test Suite Results: ${passed}/${total} Tests Passed`);
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('Benchmark test suite error:', err);
  process.exit(1);
});
