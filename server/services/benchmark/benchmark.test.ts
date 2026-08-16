/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { mockProvider } from '../providers/mockProvider';
import { GeneratedImage, GenerationRequest, ImageGenerationProvider } from '../providers/types';
import {
  BENCHMARK_FRAMEWORK_VERSION,
  BENCHMARK_MATERIALS,
  BENCHMARK_PROMPT_VERSION,
  benchmarkReporter,
  benchmarkRunner,
  calculateSpeedScore,
  calculateTileabilityScore,
  calculateWeightedQualityScore,
  getBenchmarkMaterial,
  getBenchmarkMaterials,
  QUALITY_WEIGHTS,
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

  assert(calculateSpeedScore(0) === 100, 'Latency 0ms maps to Speed score 100');
  assert(calculateSpeedScore(1000) === 80, 'Latency 1000ms maps to Speed score 80');
  assert(calculateSpeedScore(5000) === 0, 'Latency 5000ms maps to Speed score 0');

  const qualityScore = calculateWeightedQualityScore({
    seamScore: 0.01,
    latencyMs: 500,
  });

  assert(qualityScore.components.tileability === 99, 'Tileability component calculated correctly (99%)');
  assert(qualityScore.components.generationSpeed === 90, 'Speed component calculated correctly (90%)');
  assert(qualityScore.components.textureQuality === null, 'Texture quality subjective score is null by default');
  assert(qualityScore.components.promptAdherence === null, 'Prompt adherence subjective score is null by default');
  assert(qualityScore.components.styleConsistency === null, 'Style consistency subjective score is null by default');
  assert(qualityScore.maxEvaluatedWeight === 40, 'Max evaluated weight is 40% for objective metrics');

  // Objective score calculation: (99 * 0.30) + (90 * 0.10) = 29.7 + 9 = 38.7
  assert(qualityScore.score === 38.7, 'Weighted objective score evaluated correctly (38.7)');

  // 3. Execution with MockProvider
  console.log('\n--- MockProvider Benchmark Execution ---');
  const runResult = await benchmarkRunner.run(mockProvider, {
    resolution: 512,
    seed: 12345,
  });

  assert(runResult.benchmarkVersion === BENCHMARK_FRAMEWORK_VERSION, 'Result contains benchmark version');
  assert(runResult.providerId === 'mock', 'Result providerId matches mock');
  assert(runResult.summary.total === 6, 'Summary total is 6');
  assert(runResult.summary.successful === 6, 'Summary successful is 6');
  assert(runResult.summary.failed === 0, 'Summary failed is 0');
  assert(runResult.summary.overallPassRate === 100, 'Overall pass rate is 100%');
  assert(typeof runResult.summary.averageLatencyMs === 'number', 'Average latency recorded');
  assert(typeof runResult.summary.averageSeamScore === 'number', 'Average seam score recorded');

  for (const item of runResult.results) {
    assert(item.success === true, `Material '${item.material}' generation succeeded`);
    assert(item.width === 512 && item.height === 512, `Material '${item.material}' resolution is 512x512`);
    assert(typeof item.seamScore === 'number' && item.seamScore >= 0, `Material '${item.material}' has valid seam score (${item.seamScore})`);
    assert(item.pass === true, `Material '${item.material}' passed seam threshold (<= 0.05)`);
    assert(item.subjectiveScores.textureQuality === null, `Material '${item.material}' subjective texture quality is null`);
    assert(item.errors.length === 0, `Material '${item.material}' has no errors`);
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
    assert(item1.seamScore === item2.seamScore, `Material '${item1.material}' seam scores are identical across runs`);
    assert(item1.tileabilityScore === item2.tileabilityScore, `Material '${item1.material}' tileability scores are identical across runs`);
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
  assert(sandResult?.seamScore === null, 'Failed material seam score is null');
  assert(sandResult?.errors.some((e) => e.includes('Simulated network failure')), 'Error message captured in results');

  const grassResult = flakyResult.results.find((r) => r.material === 'grass');
  assert(grassResult?.success === true, 'Other materials (grass) succeeded despite sand failure');

  // 6. Report Generation
  console.log('\n--- Benchmark Reporter Verification ---');
  const jsonReport = benchmarkReporter.generateJsonReport(runResult);
  assert(typeof jsonReport === 'string' && jsonReport.includes('"benchmarkVersion"'), 'generateJsonReport generates valid JSON string');

  const parsedJson = JSON.parse(jsonReport);
  assert(parsedJson.providerId === 'mock', 'Parsed JSON matches providerId');
  assert(parsedJson.results.length === 6, 'Parsed JSON contains all 6 results');

  const markdownReport = benchmarkReporter.generateMarkdownReport(runResult);
  assert(markdownReport.includes('# Tiler Benchmark Report'), 'generateMarkdownReport contains title');
  assert(markdownReport.includes('cobblestone'), 'Markdown report contains cobblestone row');
  assert(markdownReport.includes('Subjective'), 'Markdown report details subjective vs objective methodology');

  console.log('\n======================================================');
  console.log(`  Benchmark Test Suite Results: ${passed}/${total} Tests Passed`);
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('Benchmark test suite error:', err);
  process.exit(1);
});
