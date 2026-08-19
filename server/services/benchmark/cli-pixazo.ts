/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { pixazoProvider } from '../providers/pixazoProvider';
import { benchmarkReporter } from './reporter';
import { benchmarkRunner } from './runner';

/**
 * Benchmark Framework CLI Execution for Pixazo AI Provider (Issue #15 / Phase 2C.1)
 *
 * Runs the 6 canonical benchmark materials (512x512) against Pixazo AI.
 * Generates machine-readable JSON and human-readable Markdown report artifacts in `benchmark-results/`.
 */
async function main() {
  console.log('======================================================');
  console.log('  [Tiler Benchmark Framework] Pixazo AI PoC Execution');
  console.log('======================================================');

  if (!pixazoProvider.isConfigured()) {
    console.log('\n[NOTICE] Real Pixazo benchmark could not be executed because PIXAZO_API_KEY (or PIXAZO_SUBSCRIPTION_KEY) is not configured in environment.');
    console.log('To run a real API benchmark against Pixazo, obtain an API key from https://www.pixazo.ai/ and set:');
    console.log('  export PIXAZO_API_KEY="your_subscription_key_here"');
    console.log('\nNote: Automated unit tests (npm test) test Pixazo integration using mocks without requiring network or API keys.\n');
    return;
  }

  console.log(`Provider: ${pixazoProvider.name} (${pixazoProvider.id})`);
  console.log('Executing 6 canonical materials (512x512)...');
  console.log('------------------------------------------------------');

  const startTime = performance.now();

  const result = await benchmarkRunner.run(pixazoProvider, {
    resolution: 512,
    seed: 42,
  });

  const endTime = performance.now();
  const duration = Math.round(endTime - startTime);

  // Generate Reports
  const markdownReport = benchmarkReporter.generateMarkdownReport(result);
  const jsonReport = benchmarkReporter.generateJsonReport(result);

  console.log('\n' + markdownReport + '\n');
  console.log('------------------------------------------------------');
  console.log(`Benchmark completed in ${duration} ms.`);

  // Save JSON & Markdown report artifacts
  const outputDir = path.join(process.cwd(), 'benchmark-results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const jsonOutputPath = path.join(outputDir, `${pixazoProvider.id}-benchmark.json`);
  fs.writeFileSync(jsonOutputPath, jsonReport, 'utf-8');
  console.log(`Saved machine-readable JSON report: ${jsonOutputPath}`);

  const mdOutputPath = path.join(outputDir, `${pixazoProvider.id}-benchmark.md`);
  fs.writeFileSync(mdOutputPath, markdownReport, 'utf-8');
  console.log(`Saved human-readable Markdown report: ${mdOutputPath}`);
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('Pixazo benchmark execution error:', err);
  process.exit(1);
});
