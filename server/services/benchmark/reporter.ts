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
    lines.push(`| **Average Latency** | ${summary.averageLatencyMs} ms |`);
    lines.push(`| **Average Seam Delta Score** | ${summary.averageSeamScore !== null ? summary.averageSeamScore : 'N/A'} (Lower is better, ≤0.05 passes) |`);
    lines.push(`| **Overall Pass Rate** | ${summary.overallPassRate}% |`);
    lines.push('');

    lines.push('## Material Results');
    lines.push('');
    lines.push('| Material | Status | Seam Score | Tileability | Latency | Objective Score | Errors |');
    lines.push('| :--- | :---: | :---: | :---: | :---: | :---: | :--- |');

    for (const res of results) {
      const statusIcon = res.success ? (res.pass ? '✅ Pass' : '⚠️ Discontinuous') : '❌ Fail';
      const seamStr = res.seamScore !== null ? res.seamScore.toFixed(4) : 'N/A';
      const tileStr = res.tileabilityScore !== null ? `${res.tileabilityScore}%` : 'N/A';
      const latencyStr = `${Math.round(res.latencyMs)} ms`;
      const scoreStr =
        res.weightedQualityScore.score !== null
          ? `${res.weightedQualityScore.score.toFixed(1)} / ${res.weightedQualityScore.maxEvaluatedWeight}%`
          : 'N/A';
      const errStr = res.errors.length > 0 ? res.errors.join('; ') : 'None';

      lines.push(
        `| **${res.material}** | ${statusIcon} | \`${seamStr}\` | ${tileStr} | ${latencyStr} | \`${scoreStr}\` | ${errStr} |`
      );
    }

    lines.push('');
    lines.push('## Quality Score Methodology & Weightings');
    lines.push('');
    lines.push('The Tiler benchmark protocol specifies the following weighting standard:');
    lines.push('');
    lines.push('- **Tileability (30%)** — *Objective* (Measured via `SeamAnalysisService` RGB boundary pixel deltas)');
    lines.push('- **Texture Quality (25%)** — *Subjective* (Manual human evaluation of visual aesthetics and artifacts)');
    lines.push('- **Prompt Adherence (20%)** — *Subjective* (Manual evaluation of material fidelity vs requested prompt)');
    lines.push('- **Style Consistency (15%)** — *Subjective* (Manual evaluation of game style consistency)');
    lines.push('- **Generation Speed (10%)** — *Objective* (Measured via generation + processing latency)');
    lines.push('');
    lines.push('> **Note on Scores:** The objective scores reported above represent the machine-measurable component (40% max total weight). Subjective categories remain marked as `null` until evaluated by human reviewers and are not substituted with arbitrary placeholder values.');
    lines.push('');

    return lines.join('\n');
  }
}

export const benchmarkReporter = new BenchmarkReporter();
