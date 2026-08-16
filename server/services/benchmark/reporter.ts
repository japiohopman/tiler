/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BenchmarkRunResult } from './types';

/**
 * Benchmark Reporter
 * Formats benchmark results into machine-readable (JSON) and human-readable (Markdown) formats.
 */
export class BenchmarkReporter {
  /**
   * Generates machine-readable JSON report string
   */
  public generateJsonReport(result: BenchmarkRunResult, space = 2): string {
    return JSON.stringify(result, null, space);
  }

  /**
   * Generates human-readable Markdown benchmark report
   */
  public generateMarkdownReport(result: BenchmarkRunResult): string {
    const { providerId, providerName, model, timestamp, summary, results, options } = result;

    const lines: string[] = [];

    lines.push(`# Tiler Benchmark Report — ${providerName}`);
    lines.push('');
    lines.push(`**Date & Time:** \`${timestamp}\`  `);
    lines.push(`**Benchmark Version:** \`${result.benchmarkVersion}\`  `);
    lines.push(`**Provider:** \`${providerId}\` (${providerName})  `);
    lines.push(`**Model:** \`${model}\`  `);
    lines.push(`**Resolution:** \`${options.resolution}x${options.resolution}\`  `);
    lines.push(`**Base Seed:** \`${options.seed}\`  `);
    lines.push('');

    lines.push('## Executive Summary');
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`| :--- | :--- |`);
    lines.push(`| **Total Materials Tested** | ${summary.total} |`);
    lines.push(`| **Successful Generations** | ${summary.successful} / ${summary.total} (${summary.total > 0 ? Math.round((summary.successful / summary.total) * 100) : 0}%) |`);
    lines.push(`| **Failed Generations** | ${summary.failed} |`);
    lines.push(`| **Avg Raw Generation Time** | ${summary.averageRawGenerationTimeMs} ms |`);
    lines.push(`| **Avg End-to-End Latency** | ${summary.averageLatencyMs} ms |`);
    lines.push(`| **Avg Raw Seam Delta (Primary)** | ${summary.averageRawSeamScore !== null ? summary.averageRawSeamScore : 'N/A'} (Lower is better, ≤0.05 passes) |`);
    lines.push(`| **Raw Provider Pass Rate** | ${summary.rawPassRate}% |`);
    lines.push(`| **Avg Processed Seam Delta (Pipeline)** | ${summary.averageProcessedSeamScore !== null ? summary.averageProcessedSeamScore : 'N/A'} (Lower is better, ≤0.05 passes) |`);
    lines.push(`| **Processed Pipeline Pass Rate** | ${summary.processedPassRate}% |`);
    lines.push('');

    lines.push('## Material Results');
    lines.push('');
    lines.push('| Material | Raw Status | Raw Seam Delta | Raw Tile % | Processed Seam | Processed Tile % | Gen / Total Latency | Objective Score | Errors |');
    lines.push('| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |');

    for (const res of results) {
      const rawStatusIcon = res.success ? (res.rawPass ? '✅ Pass' : '⚠️ Discontinuous') : '❌ Fail';
      const rawSeamStr = res.rawSeamScore !== null ? res.rawSeamScore.toFixed(4) : 'N/A';
      const rawTileStr = res.rawTileabilityScore !== null ? `${res.rawTileabilityScore}%` : 'N/A';

      const procSeamStr = res.processedSeamScore !== null ? res.processedSeamScore.toFixed(4) : 'N/A';
      const procTileStr = res.processedTileabilityScore !== null ? `${res.processedTileabilityScore}%` : 'N/A';

      const genTimeStr = res.rawGenerationTimeMs !== null ? `${Math.round(res.rawGenerationTimeMs)}ms` : 'N/A';
      const totalTimeStr = `${Math.round(res.latencyMs)}ms`;
      const timeStr = `${genTimeStr} / ${totalTimeStr}`;

      const scoreStr =
        res.weightedQualityScore.score !== null
          ? `${res.weightedQualityScore.score.toFixed(1)} / ${res.weightedQualityScore.maxEvaluatedWeight}%`
          : 'N/A';
      const errStr = res.errors.length > 0 ? res.errors.join('; ') : 'None';

      lines.push(
        `| **${res.material}** | ${rawStatusIcon} | \`${rawSeamStr}\` | ${rawTileStr} | \`${procSeamStr}\` | ${procTileStr} | ${timeStr} | \`${scoreStr}\` | ${errStr} |`
      );
    }

    lines.push('');
    lines.push('## Quality Score Methodology & Weightings');
    lines.push('');
    lines.push('The Tiler benchmark protocol evaluates two distinct seam measurements:');
    lines.push('1. **Raw Provider Tileability (30%)** — *Objective Primary Metric* (Measured directly on raw AI output before TileProcessor)');
    lines.push('2. **Processed Pipeline Tileability** — *Objective Diagnostic Metric* (Measured after Tiler offset/blend processing to quantify seam improvement)');
    lines.push('');
    lines.push('Standard category weights:');
    lines.push('- **Tileability (30%)** — *Objective* (Raw provider seam delta score)');
    lines.push('- **Texture Quality (25%)** — *Subjective* (Manual human evaluation of visual aesthetics and artifacts)');
    lines.push('- **Prompt Adherence (20%)** — *Subjective* (Manual evaluation of material fidelity vs requested prompt)');
    lines.push('- **Style Consistency (15%)** — *Subjective* (Manual evaluation of game style consistency)');
    lines.push('- **Generation Speed (10%)** — *Objective* (Derived strictly from raw model generation time)');
    lines.push('');
    lines.push('> **Note on Scores:** Objective scores represent machine-measurable components (40% max total weight). Subjective categories remain marked as `null` until evaluated by human reviewers.');
    lines.push('');

    return lines.join('\n');
  }
}

export const benchmarkReporter = new BenchmarkReporter();
