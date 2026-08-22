# Tiler Benchmark Report — Pixazo AI Provider (SDXL Base 1.0)

**Date & Time:** `2026-08-22T14:29:37.689Z`
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
| **Avg Raw Generation Time** | 10900.9 ms |
| **Avg End-to-End Latency** | 11734.9 ms |
| **Avg Raw Seam Delta (Primary)** | 0.2329 (Lower is better, ≤0.05 passes) |
| **Raw Provider Pass Rate** | 0% |
| **Avg Processed Seam Delta (Pipeline)** | 0.0817 (Lower is better, ≤0.05 passes) |
| **Processed Pipeline Pass Rate** | 33% |

## Material Results

| Material | Raw Status | Raw Seam Delta | Raw Tile % | Processed Seam | Processed Tile % | Gen / Total Latency | Objective Score | Errors |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **cobblestone** | ⚠️ Discontinuous | `0.1754` | 82% | `0.0586` | 94% | 8926ms / 9581ms | `24.6 / 40%` | None |
| **grass** | ⚠️ Discontinuous | `0.5428` | 46% | `0.0587` | 94% | 11704ms / 12330ms | `13.8 / 40%` | None |
| **sand** | ⚠️ Discontinuous | `0.3487` | 65% | `0.2749` | 73% | 17055ms / 18299ms | `19.5 / 40%` | None |
| **water** | ⚠️ Discontinuous | `0.1185` | 88% | `0.0277` | 97% | 5662ms / 6515ms | `26.4 / 40%` | None |
| **wood** | ⚠️ Discontinuous | `0.1073` | 89% | `0.0201` | 98% | 15660ms / 16601ms | `26.7 / 40%` | None |
| **lava** | ⚠️ Discontinuous | `0.1048` | 90% | `0.0502` | 95% | 6398ms / 7083ms | `27.0 / 40%` | None |

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
