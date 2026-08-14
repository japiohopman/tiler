# ADR-002: Provider-Independent Image Generation

**Status:** Accepted

## Context

The original implementation is coupled to Gemini image generation. This creates vendor lock-in and makes model experimentation unnecessarily invasive.

Tiler's core value is not a particular image model. Its core value is the pipeline that turns generated source material into validated, seamlessly repeating game tiles.

## Decision

Introduce an `ImageGenerationProvider` abstraction and keep concrete model/provider integrations behind that boundary.

The application core must communicate through normalized generation requests and generated-image results.

Gemini is not the target provider. Existing Gemini code may temporarily remain behind the new provider boundary while the refactor is validated, but no new core functionality may depend directly on Gemini.

The next model will be selected through the documented benchmark process in `docs/models/BENCHMARK_PROTOCOL.md`.

## Consequences

- Models can be replaced without rewriting the tile engine or UI.
- Local and hosted inference can coexist later.
- Model experiments become measurable and repeatable.
- Existing Gemini functionality must be carefully migrated rather than removed blindly.
- A small amount of provider-interface code is introduced before a replacement model is selected.

## Invariants

1. The tile engine does not import model-provider code.
2. Seam validation does not import model-provider code.
3. UI components do not contain provider credentials.
4. Provider implementations return normalized image data and metadata.
5. A generated image is never considered seamless without deterministic validation.
