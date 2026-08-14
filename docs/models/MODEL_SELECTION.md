# Model Selection

## Goal

Select an image-generation model that provides strong source material for Tiler while keeping the project free/open-source friendly and avoiding unnecessary vendor lock-in.

## Selection principles

Do not select a model because it is popular or because a provider claims it is suitable for seamless textures.

The model must be evaluated as a component of the Tiler pipeline:

```text
model generation -> tile processing -> seam validation -> human inspection
```

## Candidate requirements

A candidate should be evaluated for:

1. License and redistribution/commercial-use suitability.
2. Availability through a trustworthy public model repository, preferably Hugging Face when practical.
3. Local inference feasibility.
4. Reasonable hardware requirements.
5. Image-generation quality.
6. Material/texture quality.
7. Prompt adherence.
8. Repeatable output quality.
9. Generation speed.
10. Ecosystem maturity and maintainability.

## Important distinction

A model does NOT need to produce a mathematically seamless image itself.

Tiler's deterministic tile processor and seam analyzer exist specifically so that the generation model can focus on producing good visual source material.

A model that produces excellent textures but imperfect edges may therefore outperform a model marketed as "seamless" if its source material is more controllable and consistent.

## Benchmark candidates

Candidates are to be selected during the model-research phase. Do not hard-code a winner in architecture documentation before benchmarking.

## Required benchmark materials

Every candidate should be tested using the same material prompts for at least:

- cobblestone
- grass
- sand
- water
- wood
- lava

Where possible, keep style, resolution and generation parameters consistent.

## Required benchmark outputs

For each candidate record:

- model identifier
- repository URL
- license
- inference method
- hardware/runtime requirements
- generation settings
- generation time
- source-image quality notes
- tile-processing result
- horizontal seam score
- vertical seam score
- overall seam score
- human visual assessment
- failure modes

## Decision rule

The winning model is the model that provides the best overall fit for Tiler, not necessarily the model with the highest raw image quality.

The final selection must be recorded as an ADR after the benchmark is complete.
