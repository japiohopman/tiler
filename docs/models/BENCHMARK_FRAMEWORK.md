# Tiler Provider-Agnostic Benchmark Framework

## Overview

The Tiler Benchmark Framework provides a standardized, provider-agnostic harness for evaluating image generation models and providers against Tiler's core processing and seam-analysis engine.

The purpose of the framework is to allow direct, objective comparison across different providers (e.g. `mock`, `gemini`, `huggingface`, `pixazo`, `pollinations`) using identical:
- test materials
- versioned prompts
- output resolution requirements
- processing pipeline (`TileProcessor`)
- seam validation analysis (`SeamAnalysisService`)
- scoring methodology

The benchmark framework does NOT depend on any external AI provider or network connection. Offline verification is validated using `MockImageGenerationProvider`.

---

## Architecture & Pipeline

The framework executes generated assets through Tiler's full deterministic processing pipeline:

```text
Benchmark Runner
       ↓
ImageGenerationProvider (generate)
       ↓
512×512 Raw Generated Image (Data URL)
       ↓
TileProcessor (50% Torus Offset + Smooth Cosine Crossfade)
       ↓
SeamAnalysisService (RGB Boundary Delta Comparison)
       ↓
Metrics & Score Calculation
       ↓
BenchmarkRunResult (JSON & Markdown)
```

No phase of the tile-processing or seam-analysis pipeline is bypassed during benchmark execution.

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

| Category | Weight | Evaluation Method | Note |
| :--- | :---: | :---: | :--- |
| **Tileability** | **30%** | **Objective** | Derived from `SeamAnalysisService` RGB edge pixel deltas |
| **Texture Quality** | **25%** | **Subjective** | Evaluated via human visual inspection (defaults to `null`) |
| **Prompt Adherence** | **20%** | **Subjective** | Evaluated via human material fidelity inspection (defaults to `null`) |
| **Style Consistency** | **15%** | **Subjective** | Evaluated via human set consistency inspection (defaults to `null`) |
| **Generation Speed** | **10%** | **Objective** | Derived from end-to-end latency (generation + processing) |

### Objective vs Subjective Scores

Machine-measurable metrics (Tileability 30% + Speed 10%) account for a maximum **40%** evaluated objective weight.

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
