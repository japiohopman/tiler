# Tiler Benchmark Report — Hugging Face Provider (FLUX.1 Schnell PoC)

**Date & Time:** `2026-08-20T08:09:42.786Z`  
**Benchmark Version:** `1.0.0`  
**Provider:** `huggingface` (Hugging Face Provider (FLUX.1 Schnell PoC))  
**Model:** `black-forest-labs/FLUX.1-schnell`  
**Resolution:** `512x512`  
**Base Seed:** `42`  

## Executive Summary

| Metric | Value |
| :--- | :--- |
| **Total Materials Tested** | 6 |
| **Successful Generations** | 0 / 6 (0%) |
| **Failed Generations** | 6 |
| **Avg Raw Generation Time** | 0 ms |
| **Avg End-to-End Latency** | 149.8 ms |
| **Avg Raw Seam Delta (Primary)** | N/A (Lower is better, ≤0.05 passes) |
| **Raw Provider Pass Rate** | 0% |
| **Avg Processed Seam Delta (Pipeline)** | N/A (Lower is better, ≤0.05 passes) |
| **Processed Pipeline Pass Rate** | 0% |

## Material Results

| Material | Raw Status | Raw Seam Delta | Raw Tile % | Processed Seam | Processed Tile % | Gen / Total Latency | Objective Score | Errors |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **cobblestone** | ❌ Fail | `N/A` | N/A | `N/A` | N/A | N/A / 340ms | `N/A` | [Provider:huggingface] Hugging Face API HTTP error 400: . [URL: POST https://router.huggingface.co/fal-ai/models/black-forest-labs/FLUX.1-schnell | Status: 400  | Body: Model not supported by provider fal-ai] |
| **grass** | ❌ Fail | `N/A` | N/A | `N/A` | N/A | N/A / 118ms | `N/A` | [Provider:huggingface] Hugging Face API HTTP error 400: . [URL: POST https://router.huggingface.co/fal-ai/models/black-forest-labs/FLUX.1-schnell | Status: 400  | Body: Model not supported by provider fal-ai] |
| **sand** | ❌ Fail | `N/A` | N/A | `N/A` | N/A | N/A / 110ms | `N/A` | [Provider:huggingface] Hugging Face API HTTP error 400: . [URL: POST https://router.huggingface.co/fal-ai/models/black-forest-labs/FLUX.1-schnell | Status: 400  | Body: Model not supported by provider fal-ai] |
| **water** | ❌ Fail | `N/A` | N/A | `N/A` | N/A | N/A / 108ms | `N/A` | [Provider:huggingface] Hugging Face API HTTP error 400: . [URL: POST https://router.huggingface.co/fal-ai/models/black-forest-labs/FLUX.1-schnell | Status: 400  | Body: Model not supported by provider fal-ai] |
| **wood** | ❌ Fail | `N/A` | N/A | `N/A` | N/A | N/A / 110ms | `N/A` | [Provider:huggingface] Hugging Face API HTTP error 400: . [URL: POST https://router.huggingface.co/fal-ai/models/black-forest-labs/FLUX.1-schnell | Status: 400  | Body: Model not supported by provider fal-ai] |
| **lava** | ❌ Fail | `N/A` | N/A | `N/A` | N/A | N/A / 113ms | `N/A` | [Provider:huggingface] Hugging Face API HTTP error 400: . [URL: POST https://router.huggingface.co/fal-ai/models/black-forest-labs/FLUX.1-schnell | Status: 400  | Body: Model not supported by provider fal-ai] |

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
