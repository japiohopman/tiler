# Tiler Benchmark Framework Guide

**Date:** August 2026
**Subject:** Provider-Agnostic Benchmark Framework Documentation (Issue #14)
**Author:** Jules (Agentic Engineer)
**Version:** 1.0.0

---

## 1. Overview & Objective

The **Tiler Benchmark Framework** provides a standardized, provider-agnostic pipeline for evaluating image-generation models and providers for 2D game texture generation.

The framework ensures that every image model or provider is evaluated under identical conditions:
- **Identical Prompts:** Fixed canonical 6-material test suite (`v1.0`).
- **Fixed Output Requirements:** Standardized 512×512 target resolution and seed configuration.
- **Identical Processing Pipeline:** Source images pass directly through Tiler's deterministic `tileProcessor` engine.
- **Identical Validation Methodology:** Seam quality is measured by Tiler's mathematical `seamAnalysisService`.
- **Machine-Readable Results & Reports:** Produces structured JSON schemas (`benchmark-result.json`) and human-readable summaries (`benchmark-report.md`).

---

## 2. Benchmark Architecture & Pipeline

The benchmark pipeline connects Tiler's core subsystems:

```text
BenchmarkRunner
       │
       ▼
ImageGenerationProvider (Mock, HuggingFace, etc.)
       │
       ▼ (Raw 512×512 Image Buffer / Data URL)
tileProcessor.processTile()
       │
       ▼ (Processed Offset PNG Buffer)
seamAnalysisService.analyzeSeams()
       │
       ▼ (Objective Seam Metrics)
Metric Aggregator & Scoring Engine
       │
       ├─► benchmark-result.json (Machine-readable schema)
       └─► benchmark-report.md   (Human-readable summary)
```

---

## 3. Canonical Test Materials & Versioned Prompts

The benchmark relies on a fixed set of six game texture materials (`v1.0`):

1. **`cobblestone`** — Ancient grey cobblestone street paved with natural rounded stone tiles.
2. **`grass`** — Lush vibrant green meadow grass field with subtle blade variation.
3. **`sand`** — Smooth golden desert sand dunes with subtle wind ripples.
4. **`water`** — Clear tropical turquoise ocean water surface with soft caustic light ripples.
5. **`wood`** — Polished dark oak wooden floor planks with parallel grain patterns.
6. **`lava`** — Glowing molten volcanic lava terrain with dark basalt rock crust.

All prompts enforce a shared style constraint:
> *"top-down orthographic 2D game texture, seamless flat surface material, overhead clean view, game asset, even illumination, no perspective, no horizon, no characters, no borders"*

Negative prompts explicitly exclude perspective, 3D scenes, horizons, borders, frames, and text.

---

## 4. Execution & CLI Usage

### Running Locally with MockProvider (Offline & Zero-Quota)
The framework is fully runnable offline out-of-the-box using the deterministic `MockImageGenerationProvider`. No network access, API keys, or GPU hardware are required.

```bash
# Run the benchmark CLI locally using MockProvider
npm run benchmark

# Run with custom seed or provider ID
npm run benchmark -- --provider mock --seed 42
```

### Running Automated Framework Tests
```bash
# Run the complete test suite including benchmark tests
npm test

# Run benchmark framework tests specifically
npm run test:benchmark
```

---

## 5. Metrics & Preliminary Quality Weighting

The framework divides quality metrics into **Objective Machine Metrics** and **Subjective Human Metrics**.

### 5.1 Objective Metrics (Calculated Automatically)
- **Seam Score (0.0 – 1.0):** Lower is better. Calculated mathematically by `seamAnalysisService` along edge regions.
- **Tileability Score (0 – 100):** Higher is better. Objective mathematical score computed from seam analysis.
- **Seam Pass/Fail:** Pass threshold set to `< 0.05` (5.0% edge discontinuity).
- **Generation Latency (ms):** Provider inference duration in milliseconds.
- **Tile Processing Latency (ms):** Tiler tileProcessor offset and blending duration.
- **Checksum:** Deterministic SHA-256 hash of processed PNG asset.

### 5.2 Preliminary Quality Score Weighting (100% Total)
Quality is evaluated using the following preliminary weighting distribution:

| Metric Category | Weight | Source | Status |
| :--- | :---: | :--- | :--- |
| **Tileability** | **30%** | Objective (`seamAnalysisService`) | **Calculated** |
| **Generation Speed** | **10%** | Objective (Normalized latency in ms) | **Calculated** |
| **Texture Quality** | **25%** | Subjective (Visual inspection) | *Pending Manual Review* |
| **Prompt Adherence** | **20%** | Subjective (Material identity match) | *Pending Manual Review* |
| **Style Consistency** | **15%** | Subjective (Visual style coherence) | *Pending Manual Review* |

> **Important Invariant:** Unassigned subjective metrics are explicitly marked as `null` and `pendingManualReview: true`. The framework **never invents arbitrary placeholder scores** for subjective metrics.

### 5.3 Provider Metadata (Recorded Separately)
Provider characteristics such as free vs. paid tier, local execution, and API key requirements are recorded separately as metadata (`isFreeTier`, `isLocal`, `requiresApiKey`) and do **not** bias the quality score.

---

## 6. Failure Isolation

A single material failure (such as an API rate-limit error or network timeout) **never terminates or crashes** the benchmark run.

If a material fails during execution:
1. The error message is caught and logged in the result's `errors` array.
2. The material status is set to `success: false`.
3. The benchmark runner proceeds to evaluate all remaining materials.
4. The final JSON and Markdown reports clearly highlight failed materials.

---

## 7. Benchmarking New Providers

To benchmark a new or custom provider:

1. Implement the `ImageGenerationProvider` abstraction interface (`server/services/providers/types.ts`).
2. Pass the provider directly to `benchmarkRunner`:

```typescript
import { benchmarkRunner } from './server/services/benchmark/benchmarkRunner';
import { myCustomProvider } from './myCustomProvider';

const result = await benchmarkRunner.runBenchmark({
  customProvider: myCustomProvider,
  targetResolution: 512,
  seed: 42,
  outputDirectory: './benchmark-results',
});
```

No modification to the benchmark framework code or materials is required.
