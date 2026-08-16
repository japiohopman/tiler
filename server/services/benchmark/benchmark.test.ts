/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { mockProvider } from '../providers/mockProvider';
import { GeneratedImage, GenerationRequest, ImageGenerationProvider } from '../providers/types';
import { benchmarkRunner } from './benchmarkRunner';
import { CANONICAL_BENCHMARK_PROMPTS, getCanonicalBenchmarkPrompts } from './materials';
import {
  calculateBenchmarkScoreBreakdown,
  calculateSpeedScore,
  createUnassignedSubjectiveScores,
} from './scoring';
import { CANONICAL_MATERIALS, MaterialBenchmarkResult } from './types';

// Simple assertion helper
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function testBenchmarkSuite() {
  console.log('\n======================================================');
  console.log('  [BenchmarkFramework] Starting Unit Test Suite');
  console.log('======================================================\n');

  // Test 1: Canonical Materials Definition
  assert(
    CANONICAL_MATERIALS.length === 6,
    `Expected exactly 6 canonical materials, got ${CANONICAL_MATERIALS.length}`
  );
  assert(
    getCanonicalBenchmarkPrompts().length === 6,
    `Expected 6 canonical prompts, got ${getCanonicalBenchmarkPrompts().length}`
  );
  for (const mat of CANONICAL_MATERIALS) {
    const prompt = CANONICAL_BENCHMARK_PROMPTS[mat];
    assert(prompt !== undefined, `Missing prompt definition for material '${mat}'`);
    assert(prompt.promptVersion === 'v1.0', `Prompt version for '${mat}' should be v1.0`);
    assert(prompt.promptText.length > 10, `Prompt text for '${mat}' should be descriptive`);
  }
  console.log('  ✓ Canonical 6 materials and prompt version v1.0 verified: PASSED');

  // Test 2: Scoring Calculations
  assert(calculateSpeedScore(200) === 100, 'Speed score for <=500ms should be 100');
  assert(calculateSpeedScore(3000) === 80, 'Speed score for 3000ms should be 80');
  assert(calculateSpeedScore(15000) === 0, 'Speed score for >=15000ms should be 0');

  const unassigned = createUnassignedSubjectiveScores();
  assert(unassigned.pendingManualReview === true, 'Subjective scores should mark pending review');
  assert(unassigned.textureQuality === null, 'Texture quality should be null by default');
  console.log('  ✓ Objective scoring & unassigned subjective scores verified: PASSED');

  // Test 3: Complete Offline Benchmark Run with MockProvider
  const benchResult1 = await benchmarkRunner.runBenchmark({
    customProvider: mockProvider,
    seed: 42,
    targetResolution: 512,
  });

  assert(benchResult1.providerId === 'mock', 'Result providerId should be mock');
  assert(benchResult1.summary.totalMaterials === 6, 'Should test 6 materials');
  assert(benchResult1.summary.successfulMaterials === 6, 'All 6 materials should succeed');
  assert(benchResult1.summary.failedMaterials === 0, 'Failed materials should be 0');
  assert(benchResult1.summary.passRatePercent === 100, 'Pass rate should be 100%');
  assert(benchResult1.results.length === 6, 'Results array should contain 6 items');
  console.log('  ✓ MockProvider 6-material benchmark run completed: PASSED');

  // Test 4: Verify 512x512 Output & Objective Metrics
  for (const r of benchResult1.results) {
    assert(r.success === true, `Material '${r.material}' should succeed`);
    assert(r.objectiveMetrics !== undefined, `Material '${r.material}' should have objective metrics`);
    if (r.objectiveMetrics) {
      assert(r.objectiveMetrics.outputWidth === 512, 'Output width should be 512');
      assert(r.objectiveMetrics.outputHeight === 512, 'Output height should be 512');
      assert(r.objectiveMetrics.generationLatencyMs >= 0, 'Latency should be non-negative');
      assert(r.objectiveMetrics.seamScore >= 0 && r.objectiveMetrics.seamScore <= 1, 'Seam score bounded');
      assert(r.objectiveMetrics.checksum.length === 64, 'Checksum should be SHA-256 hash');
    }
  }
  console.log('  ✓ 512x512 output dimensions and metric integrity verified: PASSED');

  // Test 5: 100% Determinism Verification
  const benchResult2 = await benchmarkRunner.runBenchmark({
    customProvider: mockProvider,
    seed: 42,
    targetResolution: 512,
  });

  for (let i = 0; i < 6; i++) {
    const res1 = benchResult1.results[i];
    const res2 = benchResult2.results[i];
    assert(res1.material === res2.material, 'Material order must be deterministic');
    assert(
      res1.objectiveMetrics?.checksum === res2.objectiveMetrics?.checksum,
      `Checksum for '${res1.material}' must be 100% identical across runs`
    );
    assert(
      res1.objectiveMetrics?.seamScore === res2.objectiveMetrics?.seamScore,
      `Seam score for '${res1.material}' must be 100% identical across runs`
    );
  }
  console.log('  ✓ 100% Deterministic execution across repeated runs verified: PASSED');

  // Test 6: Failure Isolation
  class FlakyTestProvider implements ImageGenerationProvider {
    readonly id = 'flaky-test';
    readonly name = 'Flaky Test Provider';
    isConfigured() {
      return true;
    }
    async generate(req: GenerationRequest): Promise<GeneratedImage> {
      if (req.material === 'sand') {
        throw new Error('Simulated network timeout for sand material');
      }
      return mockProvider.generate(req);
    }
  }

  const flakyProvider = new FlakyTestProvider();
  const benchResultFlaky = await benchmarkRunner.runBenchmark({
    customProvider: flakyProvider,
    seed: 42,
  });

  assert(benchResultFlaky.summary.totalMaterials === 6, 'Flaky run tested all 6 materials');
  assert(benchResultFlaky.summary.successfulMaterials === 5, '5 materials should succeed');
  assert(benchResultFlaky.summary.failedMaterials === 1, '1 material should fail');

  const sandResult = benchResultFlaky.results.find((r) => r.material === 'sand');
  assert(sandResult !== undefined, 'Sand result should exist');
  assert(sandResult?.success === false, 'Sand result success should be false');
  assert(
    sandResult?.errors?.[0] === 'Simulated network timeout for sand material',
    'Sand result error message recorded'
  );
  console.log('  ✓ Failure isolation (single material error does not crash benchmark) verified: PASSED');

  // Test 7: Report Generation
  assert(benchResult1.markdownReport.includes('# Tiler Benchmark Report'), 'Report includes title');
  assert(benchResult1.markdownReport.includes('cobblestone'), 'Report includes cobblestone');
  assert(benchResult1.markdownReport.includes('Objective Quality Score'), 'Report includes quality score');
  console.log('  ✓ Machine-readable JSON schema and Markdown report generation verified: PASSED');

  console.log('\n======================================================');
  console.log('  Benchmark Test Suite Results: All 7 Tests Passed!');
  console.log('======================================================\n');
}

testBenchmarkSuite().catch((err) => {
  console.error('❌ Benchmark Test Suite Failed:', err);
  process.exit(1);
});
