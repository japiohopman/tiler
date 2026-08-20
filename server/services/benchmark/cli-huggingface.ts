/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { huggingFaceProvider } from '../providers/huggingFaceProvider';
import { benchmarkReporter } from './reporter';
import { benchmarkRunner } from './runner';

// Load environment variables from .env or .env.local
dotenv.config();

/**
 * Benchmark Framework CLI Execution for Hugging Face Inference Provider (Issue #18 / Phase 2C.3)
 *
 * Runs the 6 canonical benchmark materials (512x512) against Hugging Face.
 * Generates machine-readable JSON and human-readable Markdown report artifacts in `benchmark-results/`.
 */
async function main() {
  console.log('======================================================');
  console.log('  [Tiler Benchmark Framework] Hugging Face PoC Execution');
  console.log('======================================================');

  if (!huggingFaceProvider.isConfigured()) {
    console.log(
      '\n[NOTICE] Real Hugging Face benchmark could not be executed because HF_TOKEN (or HUGGINGFACE_API_KEY) is not configured in environment.'
    );
    console.log(
      'To run a real API benchmark against Hugging Face, obtain a token from https://huggingface.co/settings/tokens and set:'
    );
    console.log('  export HF_TOKEN="your_token_here"');
    console.log(
      '\nNote: Automated unit tests (npm test) test Hugging Face integration using mocks without requiring network or API keys.\n'
    );
    return;
  }

  console.log(`Provider: ${huggingFaceProvider.name} (${huggingFaceProvider.id})`);
  console.log(`Model: ${huggingFaceProvider.model}`);
  console.log('Pricing Classification: FREE WITH LIMITED MONTHLY CREDITS ($0.10 monthly credits for free users)');
  console.log('Executing 6 canonical materials (512x512)...');
  console.log('------------------------------------------------------');

  const startTime = performance.now();

  const result = await benchmarkRunner.run(huggingFaceProvider, {
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

  const jsonOutputPath = path.join(outputDir, `${huggingFaceProvider.id}-benchmark.json`);
  fs.writeFileSync(jsonOutputPath, jsonReport, 'utf-8');
  console.log(`Saved machine-readable JSON report: ${jsonOutputPath}`);

  const mdOutputPath = path.join(outputDir, `${huggingFaceProvider.id}-benchmark.md`);
  fs.writeFileSync(mdOutputPath, markdownReport, 'utf-8');
  console.log(`Saved human-readable Markdown report: ${mdOutputPath}`);
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('Hugging Face benchmark execution error:', err);
  process.exit(1);
});
