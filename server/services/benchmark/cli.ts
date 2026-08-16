/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import { bootstrapProviders } from '../../bootstrap';
import { benchmarkRunner } from './benchmarkRunner';

async function main() {
  // Ensure provider bootstrap is executed
  bootstrapProviders();

  // Parse command line arguments
  const args = process.argv.slice(2);
  let providerId: string | undefined;
  let seed: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--provider' && args[i + 1]) {
      providerId = args[i + 1];
      i++;
    } else if (args[i] === '--seed' && args[i + 1]) {
      seed = parseInt(args[i + 1], 10);
      i++;
    }
  }

  console.log('======================================================');
  console.log('  [Tiler Benchmark Framework] Starting Benchmark Run');
  console.log('======================================================');

  try {
    const outputDir = path.join(process.cwd(), 'benchmark-results');
    const result = await benchmarkRunner.runBenchmark({
      providerId: providerId || 'mock',
      seed: seed || 42,
      outputDirectory: outputDir,
    });

    console.log(result.markdownReport);
    console.log('======================================================');
    console.log(`  Benchmark Completed Successfully!`);
    console.log(`  JSON Result: ${path.join(outputDir, `benchmark-${result.providerId}-result.json`)}`);
    console.log(`  Markdown Report: ${path.join(outputDir, `benchmark-${result.providerId}-report.md`)}`);
    console.log('======================================================');
  } catch (err) {
    console.error('❌ Benchmark Failed:', err);
    process.exit(1);
  }
}

main();
