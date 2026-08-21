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
| **2C** | Provider research PoCs | Complete / historical | Determine which external image-generation providers are technically viable |
| **2D** | Pixazo productionization | Complete | Establish one reliable end-to-end generation vertical slice |
| **3** | Functional product / vertical slice | Next | Expand the working slice into a genuinely usable Tiler application |
| **4** | UX, quality & hardening | Planned | Make the working product pleasant, robust, observable, and safe to operate |
| **5** | Release / ecosystem | Future | Packaging, deployment, documentation, and additional providers/features |

---

# Phase 2C — Provider research

The purpose of Phase 2C was **research, not production integration**.

Each candidate provider was tested through the benchmark framework where practical. A failed provider call remains useful evidence when the reason is clearly recorded.

### Final findings

- Pollinations PoC: technically callable, but the tested account had insufficient pollen balance for the real benchmark.
- Hugging Face PoC: authentication and official SDK integration were verified, but the real FLUX.1-schnell benchmark was blocked by current provider/model availability (`Model not supported by provider fal-ai`).
- Pixazo: selected as the current production candidate.

### Exit criterion

Phase 2C is **complete**. Provider candidates have been tested sufficiently to make an explicit production-selection decision, and unsuccessful candidates are documented rather than repeatedly worked around.

---

# Phase 2D — Pixazo productionization

Phase 2D is the engineering phase that turns the selected Pixazo integration into a reliable, testable vertical generation path inside Tiler.

The goal is not to build the entire final application yet. The goal is to prove and harden one complete path:

`prompt → Pixazo → image → TileProcessor → validation → preview → export`

## 2D.1 — Functional Baseline — Complete

The real Pixazo provider path has been connected to the application and verified through the UI and backend.

Exit condition:

- Real generation request reaches Pixazo.
- Real provider image is returned to Tiler.
- The generated image enters the normal processing pipeline.
- The UI can display the generated result.

## 2D.2 — Processing & Validation — Complete

The raw provider result and processed result are handled as distinct stages.

Completed capabilities include:

- raw seam analysis
- processed seam analysis
- validation summary
- deterministic final-status handling
- independent raw/processed pass information
- UI reporting of improvement, worsening, or unchanged processing results

The backend `validationSummary.finalStatus` is the authoritative source for the user-facing final validation status.

## 2D.3 — Export & Output — Complete

The generated and processed results can be taken through the output/export path.

The phase established the minimum output contract needed for the vertical slice and separated source, processed, validation, and export concerns.

## 2D.4 — Reliability & Failure Handling — Complete

This phase hardened the real application path, handling and verifying all core success and failure states:

- missing or invalid Pixazo credentials (HTTP 502 Bad Gateway with structured `stage: 'provider'` error)
- provider rejection and network/API timeout
- invalid or empty image response
- image processing failure
- validation failure handling without treating non-tileable generation as application failure
- successful generation and validation flow
- export validation indicators and notice when exporting unvalidated results
- deterministic state transitions and prevention of silent fallback to mock output when Pixazo is selected

## 2D.5 — Vertical Slice Acceptance — Complete

End-to-end acceptance pass verified against the real local application path:

`prompt → Pixazo → image → TileProcessor → validation → preview → export`

Acceptance confirmed that UI state, backend state, `validationSummary.finalStatus` authority, raw/processed seam reports, preview renders, and exported outputs remain completely consistent.

### Phase 2D exit criteria

Phase 2D is **complete**. The local setup reliably demonstrates the complete vertical slice with explicit success and failure states, robust credential redaction, multi-tile spritesheet export compositing, and automated tests covering the provider integration and pipeline boundaries.

At that point Tiler has a **working technical product slice** and Phase 3 can focus on product completeness rather than proving whether the underlying generation path works.

---

# Phase 3 — Functional product / vertical slice

Phase 3 starts **after the Pixazo path passes the Phase 2D acceptance criteria**.

The goal is to turn the working technical slice into the actual Tiler application.

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
- clearer separation between source, candidate, processed, and validated asset

Phase 3 should be driven by real user workflows discovered while using the working application. It should not prematurely become a collection of speculative features.

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

The project has completed **Phase 2D — Pixazo Productionization**.

Completed work:

- Phase 2C provider research and production candidate selection.
- Phase 2D.1 functional Pixazo generation baseline.
- Phase 2D.2 processing and validation integration.
- Phase 2D.3 export and output path (including 3×3 tiled spritesheet compositing).
- Phase 2D.4 reliability and failure handling.
- Phase 2D.5 vertical slice acceptance and end-to-end verification.

The next planned target is **Phase 3 — Functional Product / Vertical Slice**.

> We do not need to finish the entire application before making it functional. We need one complete, reliable vertical slice first.