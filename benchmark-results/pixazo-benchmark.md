# Tiler Benchmark Report — Pixazo AI Provider (SDXL Base 1.0)

**Date & Time:** `2026-08-20T23:48:36.483Z`
**Benchmark Version:** `1.0.0`
**Provider:** `pixazo` (Pixazo AI Provider (SDXL Base 1.0))
**Model:** `sdxl-base-1.0`
**Resolution:** `512x512`
**Base Seed:** `42`

## Executive Summary

| Metric | Value |
| :--- | :--- |
| **Total Materials Tested** | 6 |
| **Successful Generations** | 6 / 6 (100%) |
| **Failed Generations** | 0 |
| **Avg Raw Generation Time** | 6603.8 ms |
| **Avg End-to-End Latency** | 7586 ms |
| **Avg Raw Seam Delta (Primary)** | 0.2557 (Lower is better, ≤0.05 passes) |
| **Raw Provider Pass Rate** | 0% |
| **Avg Processed Seam Delta (Pipeline)** | 0.1357 (Lower is better, ≤0.05 passes) |
| **Processed Pipeline Pass Rate** | 17% |

## Material Results

| Material | Raw Status | Raw Seam Delta | Raw Tile % | Processed Seam | Processed Tile % | Gen / Total Latency | Objective Score | Errors |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **cobblestone** | ⚠️ Discontinuous | `0.3995` | 60% | `0.2686` | 73% | 6329ms / 6614ms | `18.0 / 40%` | None |
| **grass** | ⚠️ Discontinuous | `0.1097` | 89% | `0.0684` | 93% | 5755ms / 6729ms | `26.7 / 40%` | None |
| **sand** | ⚠️ Discontinuous | `0.1667` | 83% | `0.1088` | 89% | 8324ms / 9604ms | `24.9 / 40%` | None |
| **water** | ⚠️ Discontinuous | `0.5095` | 49% | `0.2106` | 79% | 5606ms / 7100ms | `14.7 / 40%` | None |
| **wood** | ⚠️ Discontinuous | `0.1949` | 81% | `0.0219` | 98% | 6601ms / 7479ms | `24.3 / 40%` | None |
| **lava** | ⚠️ Discontinuous | `0.1536` | 85% | `0.1357` | 86% | 7008ms / 7990ms | `25.5 / 40%` | None |

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
