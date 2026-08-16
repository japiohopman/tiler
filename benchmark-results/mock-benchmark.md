# Tiler Benchmark Report — Deterministic Mock Provider (Development/Test Only)

**Date & Time:** `2026-08-16T23:13:59.921Z`
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
| **Avg Raw Generation Time** | 26.4 ms |
| **Avg End-to-End Latency** | 146.9 ms |
| **Avg Raw Seam Delta (Primary)** | 0.1198 (Lower is better, ≤0.05 passes) |
| **Raw Provider Pass Rate** | 0% |
| **Avg Processed Seam Delta (Pipeline)** | 0.0098 (Lower is better, ≤0.05 passes) |
| **Processed Pipeline Pass Rate** | 100% |

## Material Results

| Material | Raw Status | Raw Seam Delta | Raw Tile % | Processed Seam | Processed Tile % | Gen / Total Latency | Objective Score | Errors |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **cobblestone** | ⚠️ Discontinuous | `0.0904` | 91% | `0.0098` | 99% | 41ms / 181ms | `37.2 / 40%` | None |
| **grass** | ⚠️ Discontinuous | `0.0915` | 91% | `0.0075` | 99% | 23ms / 159ms | `37.3 / 40%` | None |
| **sand** | ⚠️ Discontinuous | `0.1521` | 85% | `0.0127` | 99% | 22ms / 136ms | `35.5 / 40%` | None |
| **water** | ⚠️ Discontinuous | `0.1245` | 88% | `0.0103` | 99% | 22ms / 136ms | `36.4 / 40%` | None |
| **wood** | ⚠️ Discontinuous | `0.1139` | 89% | `0.0074` | 99% | 25ms / 130ms | `36.7 / 40%` | None |
| **lava** | ⚠️ Discontinuous | `0.1466` | 85% | `0.0110` | 99% | 26ms / 139ms | `35.4 / 40%` | None |

## Quality Score Methodology & Weightings

The Tiler benchmark protocol evaluates two distinct seam measurements:
1. **Raw Provider Tileability (30%)** — *Objective Primary Metric* (Measured directly on raw AI output before TileProcessor)
2. **Processed Pipeline Tileability** — *Objective Diagnostic Metric* (Measured after Tiler offset/blend processing to quantify seam improvement)

Standard category weights:
- **Tileability (30%)** — *Objective* (Raw provider seam delta score)
- **Texture Quality (25%)** — *Subjective* (Manual human evaluation of visual aesthetics and artifacts)
- **Prompt Adherence (20%)** — *Subjective* (Manual evaluation of material fidelity vs requested prompt)
- **Style Consistency (15%)** — *Subjective* (Manual evaluation of game style consistency)
- **Generation Speed (10%)** — *Objective* (Derived strictly from raw model generation time)

> **Note on Scores:** Objective scores represent machine-measurable components (40% max total weight). Subjective categories remain marked as `null` until evaluated by human reviewers.
