/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { pollinationsProvider } from '../providers/pollinationsProvider';
import { benchmarkReporter } from './reporter';
import { benchmarkRunner } from './runner';

// Load environment variables from .env or .env.local
dotenv.config();

/**
 * Benchmark Framework CLI Execution for Pollinations AI Provider (Issue #17 / Phase 2C.2)
 *
 * Runs the 6 canonical benchmark materials (512x512) against Pollinations AI (FLUX.1 Schnell).
 * Generates machine-readable JSON and human-readable Markdown report artifacts in `benchmark-results/`.
 */
async function main() {
  console.log('======================================================');
  console.log('  [Tiler Benchmark Framework] Pollinations AI PoC Execution');
  console.log('======================================================');

  if (!pollinationsProvider.isConfigured()) {
    console.log(
      '\n[NOTICE] Real Pollinations benchmark could not be executed because POLLINATIONS_API_KEY is not configured in environment.'
    );
    console.log(
      'To run a real API benchmark against Pollinations AI, obtain an API key from https://enter.pollinations.ai/keys and set:'
    );
    console.log('  export POLLINATIONS_API_KEY="your_api_key_here"');
    console.log(
      '\nNote: Automated unit tests (npm test) test Pollinations integration using mocks without requiring network or API keys.\n'
    );
    return;
  }

  console.log(`Provider: ${pollinationsProvider.name} (${pollinationsProvider.id})`);
  console.log(`Model: ${pollinationsProvider.model}`);
  console.log('Executing 6 canonical materials (512x512)...');
  console.log('------------------------------------------------------');

  const startTime = performance.now();

  const result = await benchmarkRunner.run(pollinationsProvider, {
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

  const jsonOutputPath = path.join(outputDir, `${pollinationsProvider.id}-benchmark.json`);
  fs.writeFileSync(jsonOutputPath, jsonReport, 'utf-8');
  console.log(`Saved machine-readable JSON report: ${jsonOutputPath}`);

  const mdOutputPath = path.join(outputDir, `${pollinationsProvider.id}-benchmark.md`);
  fs.writeFileSync(mdOutputPath, markdownReport, 'utf-8');
  console.log(`Saved human-readable Markdown report: ${mdOutputPath}`);
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('Pollinations benchmark execution error:', err);
  process.exit(1);
});
