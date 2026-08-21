# Tiler Development Roadmap

This document is the canonical high-level roadmap for Tiler. It exists to make the development phases explicit and to prevent provider research, core engineering, and product work from becoming mixed together.

The roadmap is intentionally **milestone-driven rather than calendar-driven**. A phase is complete when its exit criteria are met, not simply when an implementation exists.

## Product direction

Tiler is an AI-assisted tile generator, but AI generation is only one part of the product. The complete product path is:

`Prompt → Generate → Process → Validate → Preview → Export`

The deterministic processing and validation pipeline remains the authority for whether an image is actually tileable.

---

## Phase map

| Phase | Focus | Status | Main outcome |
|---|---|---|---|
| **0** | Reconnaissance & architecture | Complete / historical | Understand the codebase, boundaries, and engineering constraints |
| **1** | Core tile engine & deterministic pipeline | Foundation | Reliable processing, seam analysis, and validation |
| **2A** | Provider abstraction | Complete / historical | Stable provider interface and configuration model |
| **2B** | Benchmark framework | Complete / historical | Repeatable provider benchmarking and comparable reports |
| **2C** | Provider research PoCs | In progress / closing | Determine which external image-generation providers are technically viable |
| **2C.3** | Provider PoC closure | Complete / historical | Record real-world provider results without forcing unsuitable providers into production |
| **2D** | Pixazo productionization | Complete | Turn the selected provider path into a reliable end-to-end application path |
| **3** | Functional product / vertical slice | Next | Make the application genuinely usable from prompt to exported tile |
| **4** | UX, quality & hardening | Planned | Make the working product pleasant, robust, observable, and safe to operate |
| **5** | Release / ecosystem | Future | Packaging, deployment, documentation, and additional providers/features |

---

# Phase 2C — Provider research

The purpose of Phase 2C is **research, not production integration**.

Each candidate provider should be tested through the same benchmark framework where possible. A failed provider call is still a useful result when the reason is clearly recorded.

### Current findings

- Pollinations PoC: technically callable, but the tested account had insufficient pollen balance for the real benchmark.
- Hugging Face PoC: authentication and official SDK integration were verified, but the real FLUX.1-schnell benchmark was blocked by current provider/model availability (`Model not supported by provider fal-ai`).
- Pixazo: selected as the current production candidate for the next phase.

### Exit criterion

Phase 2C is complete when provider candidates have been tested sufficiently to make an explicit production-selection decision and the unsuccessful candidates are documented rather than repeatedly worked around.

---

# Phase 2D — Pixazo productionization

**This is the next engineering phase.** It is not merely another benchmark.

The goal is to take the selected Pixazo integration and establish a **working vertical generation path** inside Tiler.

## 2D workstreams

### 2D.1 Provider integration hardening

- Verify credentials and environment handling.
- Verify request/response handling against the real Pixazo API.
- Normalize provider errors and timeouts.
- Keep provider-specific details behind the provider abstraction.
- Ensure generated image data enters the existing processing pipeline correctly.

### 2D.2 End-to-end generation path

The application must be able to perform the real sequence:

1. User enters a prompt.
2. Tiler submits the generation request.
3. Pixazo returns an image.
4. Tiler receives and stores the source image safely.
5. Tile processing runs on the generated image.
6. Seam analysis validates the result.
7. The UI displays the source and processed tile.
8. The user can export a valid result.

This is the first point at which the application should be considered **functionally alive** rather than merely architecturally complete.

### 2D.3 Failure and state handling

The UI and backend must handle at least:

- missing credentials
- provider rejection
- network/API failure
- invalid image response
- processing failure
- validation failure
- successful generation with a non-tileable result
- successful generation and validation

A generated image that fails tile validation is **not an application failure**; it is a valid generation result that needs further processing or regeneration.

### 2D.4 Minimal usable UI

Phase 2D should include enough UI functionality to exercise the complete path:

- prompt input
- generate action
- loading state
- error state
- source image preview
- processed tile preview
- validation/seam result
- export/download action

This is deliberately a **minimal functional UI**, not the final UX.

### 2D exit criteria

Phase 2D is complete when a clean local setup can reliably demonstrate:

`prompt → Pixazo → image → TileProcessor → validation → preview → export`

with explicit success and failure states and automated tests covering the provider integration and critical pipeline boundaries.

---

# Phase 3 — Functional product / vertical slice

Phase 3 starts **after the Pixazo path works end-to-end**.

The goal is to turn the technical vertical slice into the actual Tiler application.

Likely areas include:

- proper application state management
- generation history
- regenerate / retry flows
- configurable tile-processing options
- side-by-side and tiled previews
- useful validation feedback
- asset naming and metadata
- export formats and dimensions
- persistence where appropriate
- clearer separation between source, candidate, and validated asset

The important distinction is that Phase 3 is about **product completeness**, whereas Phase 2D is about proving and hardening the real production path.

---

# Phase 4 — UX, quality & hardening

Once the complete product flow works, improve it systematically rather than prematurely polishing individual screens.

Areas include:

- UX refinement
- accessibility
- performance
- caching and request management
- cancellation/retry behaviour
- observability and diagnostics
- security and secret handling
- resource limits
- image quality controls
- regression benchmarks
- browser/device testing

---

# Phase 5 — Release & ecosystem

Future work can include:

- deployment and hosted operation
- packaging/distribution
- provider selection/configuration for users
- additional validated providers
- batch generation
- advanced texture workflows
- community or project presets
- extended documentation

New providers should only be added when they have a concrete product or quality benefit. Provider count is not itself a product goal.

---

## How we work through the roadmap

We are **not** going to invent every future implementation detail up front. The roadmap defines the destination and exit criteria; individual issues define the implementation details discovered along the way.

That means:

- **Roadmap:** stable direction and phase boundaries.
- **Issues / PRs:** concrete engineering tasks.
- **PoCs:** evidence used to make decisions.
- **Benchmarks:** objective measurements where possible.
- **ADRs:** decisions that should remain durable project knowledge.

When implementation reveals a genuinely new constraint, the issue/ADR can refine the plan. The phase itself should only change when the project's goals or evidence justify changing it.

## Current position

The project is transitioning from **provider research into productionization**.

The immediate target is therefore **Phase 2D: Pixazo productionization**, with one important principle:

> We do not need to finish the entire application before making it functional. We need one complete, reliable vertical slice first.

Once that slice works, Phase 3 can expand it into the full application without guessing whether the underlying generation pipeline actually works.