# Tiler Benchmark Report — Deterministic Mock Provider (Development/Test Only)

**Date & Time:** `2026-08-16T22:28:08.307Z`
**Benchmark Version:** `1.0.0`
**Provider:** `mock` (Deterministic Mock Provider (Development/Test Only))
**Model:** `mock`
**Resolution:** `512x512`
**Base Seed:** `42`

## Executive Summary

| Metric | Value |
| :--- | :--- |
| **Total Materials Tested** | 6 |
| **Successful Generations** | 6 / 6 (100%) |
| **Failed Generations** | 0 |
| **Average Latency** | 134 ms |
| **Average Seam Delta Score** | 0.0098 (Lower is better, ≤0.05 passes) |
| **Overall Pass Rate** | 100% |

## Material Results

| Material | Status | Seam Score | Tileability | Latency | Objective Score | Errors |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **cobblestone** | ✅ Pass | `0.0098` | 99% | 167 ms | `39.4 / 40%` | None |
| **grass** | ✅ Pass | `0.0075` | 99% | 147 ms | `39.4 / 40%` | None |
| **sand** | ✅ Pass | `0.0127` | 99% | 132 ms | `39.4 / 40%` | None |
| **water** | ✅ Pass | `0.0103` | 99% | 123 ms | `39.5 / 40%` | None |
| **wood** | ✅ Pass | `0.0074` | 99% | 112 ms | `39.5 / 40%` | None |
| **lava** | ✅ Pass | `0.0110` | 99% | 123 ms | `39.5 / 40%` | None |

## Quality Score Methodology & Weightings

The Tiler benchmark protocol specifies the following weighting standard:

- **Tileability (30%)** — *Objective* (Measured via `SeamAnalysisService` RGB boundary pixel deltas)
- **Texture Quality (25%)** — *Subjective* (Manual human evaluation of visual aesthetics and artifacts)
- **Prompt Adherence (20%)** — *Subjective* (Manual evaluation of material fidelity vs requested prompt)
- **Style Consistency (15%)** — *Subjective* (Manual evaluation of game style consistency)
- **Generation Speed (10%)** — *Objective* (Measured via generation + processing latency)

> **Note on Scores:** The objective scores reported above represent the machine-measurable component (40% max total weight). Subjective categories remain marked as `null` until evaluated by human reviewers and are not substituted with arbitrary placeholder values.
