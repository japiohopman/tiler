# Model Benchmark Protocol

## Purpose

Provide a repeatable method for comparing image-generation models for Tiler.

The benchmark measures the usefulness of generated source material inside the complete Tiler pipeline.

## Principle

Do not optimize for a model's marketing claim, leaderboard position or visual novelty.

Measure:

```text
source quality + prompt adherence + processing result + seam validation + runtime
```

## Test materials

Use the following six materials:

1. Cobblestone
2. Grass
3. Sand
4. Water
5. Wood
6. Lava

## Prompt constraints

Use a shared base prompt for all candidates. Material and style are variables.

The prompt should request a 2D game texture and explicitly exclude:

- perspective
- horizon
- environment scenes
- objects
- characters
- borders
- frames
- text
- UI

The prompt should describe the desired material and visual style without requiring the model itself to solve mathematical seamlessness.

## Resolution

Primary benchmark resolution: 512x512.

If a model cannot natively produce 512x512, document the native resolution and the exact resize process used before comparison.

## Processing

Every generated image must pass through the same Tiler tile-processing pipeline.

Do not give one model a different seam-processing advantage.

## Validation

Run the same seam analyzer configuration against every processed result.

Record:

- horizontal seam score
- vertical seam score
- overall seam score
- pass/fail

## Runtime measurements

Where practical record:

- hardware
- runtime/backend
- model load time
- generation time
- peak memory/VRAM

Do not compare timings from different hardware as if they were directly equivalent.

## Human evaluation

Technical seam scores are necessary but not sufficient.

Inspect the generated and processed 3x3 previews for:

- obvious repetition
- unnatural structures
- lighting inconsistencies
- material identity
- texture scale
- distracting artifacts
- consistency with the requested style

Keep human assessment separate from numerical seam scores.

## Benchmark record

Each run should produce a machine-readable record where practical, containing:

```text
model
material
style
resolution
parameters
runtime
seamScores
passFail
notes
```

## Reproducibility

Record model revision/version and generation parameters whenever the backend supports it.

Do not present results as directly comparable when model versions or major inference settings differ without documenting the difference.

## Acceptance

A model can become a production candidate only after all six benchmark materials have been tested and the results have been reviewed.

---

## Benchmark Framework Implementation

The automated, provider-agnostic implementation of this protocol is documented in [`BENCHMARK_FRAMEWORK.md`](BENCHMARK_FRAMEWORK.md). It can be executed locally offline using `npm run benchmark` or tested with `npm run test:benchmark`.
