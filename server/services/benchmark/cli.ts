/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { mockProvider } from '../providers/mockProvider';
import { benchmarkReporter } from './reporter';
import { benchmarkRunner } from './runner';

async function main() {
  console.log('======================================================');
  console.log('  [Tiler Benchmark Framework] Running Local Benchmark');
  console.log('======================================================');
  console.log(`Provider: ${mockProvider.name} (${mockProvider.id})`);
  console.log('Executing 6 canonical materials (512x512)...');
  console.log('------------------------------------------------------');

  const startTime = performance.now();

  const result = await benchmarkRunner.run(mockProvider, {
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

  // Save JSON report artifact
  const outputDir = path.join(process.cwd(), 'benchmark-results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const jsonOutputPath = path.join(outputDir, `${mockProvider.id}-benchmark.json`);
  fs.writeFileSync(jsonOutputPath, jsonReport, 'utf-8');
  console.log(`Saved machine-readable JSON report: ${jsonOutputPath}`);

  const mdOutputPath = path.join(outputDir, `${mockProvider.id}-benchmark.md`);
  fs.writeFileSync(mdOutputPath, markdownReport, 'utf-8');
  console.log(`Saved human-readable Markdown report: ${mdOutputPath}`);
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('Benchmark execution error:', err);
  process.exit(1);
});
