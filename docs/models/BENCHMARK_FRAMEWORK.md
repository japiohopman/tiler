# Tiler Provider-Agnostic Benchmark Framework

## Overview

The Tiler Benchmark Framework provides a standardized, provider-agnostic harness for evaluating image generation models and providers against Tiler's core processing and seam-analysis engine.

The purpose of the framework is to allow direct, objective comparison across different providers (e.g. `mock`, `gemini`, `huggingface`, `pixazo`, `pollinations`) using identical:
- test materials
- versioned prompts
- output resolution requirements
- raw vs processed seam measurement pipeline (`SeamAnalysisService` & `TileProcessor`)
- scoring methodology

The benchmark framework does NOT depend on any external AI provider or network connection. Offline verification is validated using `MockImageGenerationProvider`.

---

## Architecture & Pipeline

The benchmark evaluates two distinct seam measurements for every generated image:

```text
               Benchmark Runner
                      ↓
        ImageGenerationProvider (generate)
                      ↓
        512×512 Raw Generated Image (Data URL)
                      ├──→ Raw SeamAnalysis → rawTileabilityScore (Primary Metric)
                      │
                      └──→ TileProcessor (50% Torus Offset + Smooth Crossfade)
                              ↓
                           Processed Image
                              ↓
                           SeamAnalysis → processedTileabilityScore (Diagnostic Metric)
```

1. **RAW PROVIDER TILEABILITY (Primary Provider Quality Metric):**
   `SeamAnalysisService` evaluates boundary pixel deltas directly against the raw 512×512 image returned by the provider BEFORE any modification. This measures whether the AI model natively generates seamless textures.

2. **PROCESSED TILEABILITY (Secondary Pipeline Diagnostic Metric):**
   The raw image enters Tiler's local `TileProcessor` (50% torus offset + smooth cosine seam crossfade), and `SeamAnalysisService` measures the resulting processed tile. This quantifies how effectively Tiler improves texture tileability.

> **IMPORTANT:** High processed tileability scores (such as MockProvider's ~99% processed score) demonstrate the effectiveness of Tiler's local tile-processing engine. They MUST NOT be interpreted as proof that a provider natively generates tileable images.

---

## Canonical Test Materials & Prompts (v1.0)

The benchmark suite defines six fixed materials tailored specifically for 2D game textures (flat top-down orthogonal view). Prompts explicitly exclude perspective, 3D depth, horizon, characters, UI, or environment scenes:

1. **`cobblestone`** — Weathered stone cobblestone pavement
2. **`grass`** — Vibrant outdoor lawn grass baseline
3. **`sand`** — Fine desert sand with subtle wind ripples
4. **`water`** — Crystal clear blue water surface with caustic reflections
5. **`wood`** — Rustic wooden planks flooring
6. **`lava`** — Molten glowing magma channels with cooling basalt crust

Prompts are versioned (`v1.0`) and do NOT contain vendor-specific prompt engineering tricks.

---

## Scoring Methodology

Tiler adheres to the following quality weighting standard:

| Category | Weight | Evaluation Basis | Evaluation Method |
| :--- | :---: | :--- | :--- |
| **Tileability** | **30%** | **Raw Provider Image** | Derived from `SeamAnalysisService` RGB edge deltas on raw AI output |
| **Texture Quality** | **25%** | **Raw / Processed Asset** | Subjective human visual inspection (defaults to `null`) |
| **Prompt Adherence** | **20%** | **Raw / Processed Asset** | Subjective human material fidelity inspection (defaults to `null`) |
| **Style Consistency** | **15%** | **Texture Set** | Subjective human game style consistency inspection (defaults to `null`) |
| **Generation Speed** | **10%** | **Raw Model Time** | Derived strictly from `rawGenerationTimeMs` (AI model inference time) |

### Objective vs Subjective Scores

Machine-measurable metrics (Raw Tileability 30% + Raw Generation Speed 10%) account for a maximum **40%** evaluated objective weight.

Subjective metrics (Texture Quality 25%, Prompt Adherence 20%, Style Consistency 15%) remain marked as **`null`** until evaluated by human reviewers during formal model assessment. The benchmark framework does NOT substitute fake or arbitrary placeholder numbers for subjective metrics.

Free vs paid status is NOT included in the quality score. It is tracked separately as provider metadata (`providerMetadata.isFree`).

---

## Running the Benchmark

### 1. Local Offline Execution (`npm run benchmark`)

To run the full 6-material benchmark locally using `MockImageGenerationProvider`:

```bash
npm run benchmark
```

This command executes the benchmark offline (no API keys or network required) and saves output reports to:
- `benchmark-results/mock-benchmark.json` (machine-readable)
- `benchmark-results/mock-benchmark.md` (human-readable)

### 2. Automated Test Suite (`npm run test:benchmark`)

To run the automated benchmark test suite verifying determinism, failure isolation, and result schemas:

```bash
npm run test:benchmark
```

---

## Provider Integration

Any provider implementing the `ImageGenerationProvider` interface can be benchmarked without modifying benchmark core logic:

```typescript
import { benchmarkRunner, benchmarkReporter } from './server/services/benchmark';
import { myNewProvider } from './server/services/providers/myNewProvider';

const result = await benchmarkRunner.run(myNewProvider, {
  resolution: 512,
  seed: 42,
});

console.log(benchmarkReporter.generateMarkdownReport(result));
```

### Failure Handling

If an individual material fails during generation (e.g. network timeout or rate limit), the failure is isolated to that specific test case (`success: false`, error string recorded). The overall benchmark run continues executing remaining materials and produces a complete report.
