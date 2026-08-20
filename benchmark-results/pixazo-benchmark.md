# Tiler Benchmark Report — Pixazo AI Provider (SDXL Base 1.0)

**Date & Time:** `2026-08-20T22:51:45.553Z`
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
| **Avg Raw Generation Time** | 6062.4 ms |
| **Avg End-to-End Latency** | 7144.5 ms |
| **Avg Raw Seam Delta (Primary)** | 0.2309 (Lower is better, ≤0.05 passes) |
| **Raw Provider Pass Rate** | 17% |
| **Avg Processed Seam Delta (Pipeline)** | 0.1726 (Lower is better, ≤0.05 passes) |
| **Processed Pipeline Pass Rate** | 0% |

## Material Results

| Material | Raw Status | Raw Seam Delta | Raw Tile % | Processed Seam | Processed Tile % | Gen / Total Latency | Objective Score | Errors |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **cobblestone** | ⚠️ Discontinuous | `0.2999` | 70% | `0.3597` | 64% | 5827ms / 6315ms | `21.0 / 40%` | None |
| **grass** | ⚠️ Discontinuous | `0.4750` | 53% | `0.1408` | 86% | 5876ms / 6961ms | `15.9 / 40%` | None |
| **sand** | ⚠️ Discontinuous | `0.2824` | 72% | `0.1764` | 82% | 6090ms / 7577ms | `21.6 / 40%` | None |
| **water** | ⚠️ Discontinuous | `0.2336` | 77% | `0.1249` | 88% | 7188ms / 9091ms | `23.1 / 40%` | None |
| **wood** | ✅ Pass | `0.0052` | 99% | `0.1540` | 85% | 5548ms / 6421ms | `29.7 / 40%` | None |
| **lava** | ⚠️ Discontinuous | `0.0894` | 91% | `0.0798` | 92% | 5846ms / 6503ms | `27.3 / 40%` | None |

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
