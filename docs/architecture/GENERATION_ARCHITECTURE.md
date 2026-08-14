# Generation Architecture

## Purpose

Tiler must be independent of any single image-generation vendor or model.

Image generation is a replaceable subsystem. The tile engine, validation system, preview and export pipeline must not depend on Gemini, Hugging Face, FLUX, or any other specific provider.

## Target architecture

```text
Generation Request
        |
        v
ImageGenerationProvider
        |
   +----+----------------+
   |    |                |
 Local HF  Hosted HF   Other Provider
   |    |                |
   +----+----------------+
        |
        v
 GeneratedImage
        |
        v
 Tile Processor
        |
        v
 Seam Analyzer
        |
        v
 Validated Tile
```

## Provider contract

The application should expose a small provider interface, conceptually equivalent to:

```ts
interface ImageGenerationProvider {
  generate(request: GenerationRequest): Promise<GeneratedImage>;
}
```

The exact implementation should follow the repository's existing TypeScript conventions.

The core application must depend on the interface, not a concrete provider.

## Provider responsibilities

A provider is responsible for:

- accepting a normalized generation request
- model-specific prompt/input handling
- model-specific inference configuration
- communicating with the selected inference backend
- returning a normalized generated-image result
- exposing useful generation metadata
- reporting provider-specific errors through a normalized error boundary

A provider is NOT responsible for:

- making an image seamless
- deciding whether a tile is valid
- calculating seam scores
- rendering the tile preview
- exporting final assets

## Model selection

No specific model is permanently selected by this document.

The first production candidate will be selected through a documented model benchmark. Candidates should be evaluated for:

- license suitability for this project
- image quality
- texture/material quality
- consistency
- inference speed
- memory requirements
- local execution feasibility
- Hugging Face/Diffusers compatibility where applicable
- ability to provide useful source material for Tiler's deterministic tile processor

## Gemini status

Gemini is not part of the target architecture.

Existing Gemini support may remain temporarily during the provider refactor so current functionality can be tested while the abstraction is introduced. It must not leak into core domain code.

Once an alternative provider is validated, Gemini can be removed entirely in a separate controlled change.

## Security

Provider credentials must remain server-side. Frontend code must never receive provider API keys or secrets.

## Design principle

The model generates a source image.

Tiler determines whether that source image becomes a valid tile.

This distinction is a core architectural invariant.
