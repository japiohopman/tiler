# Tiler Development Roadmap

This document is the canonical high-level roadmap for Tiler. It exists to make the development phases explicit and to prevent provider research, core engineering, and product work from becoming mixed together.

The roadmap is intentionally **milestone-driven rather than calendar-driven**. A phase is complete when its exit criteria are met, not simply when an implementation exists.

## Product direction

Tiler is an AI-assisted tile generator, but AI generation is only one part of the product. The complete product path is:

`Prompt → Generate → Process → Validate → Preview → Edit → Export`

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
| **3** | Functional product / creative workflow | In progress | Turn the technical slice into a coherent, usable Tiler workflow |
| **4** | Production readiness, UX & hardening | Planned | Make the product production-ready, polished, observable, performant, and robust |
| **5** | Release / ecosystem | Future | Packaging, deployment, additional providers, and advanced workflows |

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

## 2D.2 — Processing & Validation — Complete

The raw provider result and processed result are handled as distinct stages. `validationSummary.finalStatus` is the authoritative source for the user-facing final validation status.

## 2D.3 — Export & Output — Complete

The generated and processed results can be taken through the output/export path, including multi-tile spritesheet compositing.

## 2D.4 — Reliability & Failure Handling — Complete

Core provider, processing, validation, and export failure states are handled explicitly without silent mock fallback when Pixazo is selected.

## 2D.5 — Vertical Slice Acceptance — Complete

The real local application path was verified end-to-end:

`prompt → Pixazo → image → TileProcessor → validation → preview → export`

### Phase 2D exit criteria

Phase 2D is **complete**. The local setup reliably demonstrates the complete vertical slice with explicit success and failure states, robust credential redaction, multi-tile spritesheet export compositing, and automated tests covering the provider integration and pipeline boundaries.

---

# Phase 3 — Functional product / creative workflow

Phase 3 turns the working technical slice into the actual Tiler application. The phase is driven by real user workflows and observed product problems rather than speculative features.

## 3.1 — Application State & Workspace Foundation — Complete

Established unified workspace state with separate generation, processing, validation, and export concerns while preserving raw/processed asset separation and authoritative validation state.

## 3.2 — Generation & Regenerate UX — Complete

Established clear generation/regeneration behavior, duplicate-request protection, preserved existing assets during regeneration, and explicit generation error handling.

## 3.3 — Processing Controls & Live Preview — Complete

Added interactive processing controls, explicit local reprocessing, semantic processing states, RAW/PROCESSED preview synchronization, and safe retry behavior without triggering new AI generation.

## 3.4 — Generation History & Asset Management — Complete

Introduced multi-asset workspace history with `assets[]` and `currentAssetId`, isolated asset selection/reprocessing/deletion, bounded history, and per-asset state preservation.

## 3.5 — Tiler Image Editor & UX Foundation — Complete

Integrated a Tiler-owned Canvas image editor with the Phase 3.4 asset-history architecture.

Capabilities include:

- rotate and flip transforms;
- 1:1 and free crop;
- brightness, contrast, saturation, and hue adjustment;
- RAW vs EDIT comparison;
- 1×1 and 3×3 tiled preview;
- Apply, Cancel, Reset, and Remove Edits semantics;
- editing strictly scoped to `currentAssetId`;
- immutable RAW source preservation;
- explicit reprocessing after committed edits;
- validation invalidation when edited source changes;
- no Photopea iframe or exposed Photopea UI.

The editor is technically complete, but discoverability and broader UI polish are intentionally deferred to the Phase 3 exit review and Phase 4 production-readiness work.

## 3.6 — Prompt & Material Adherence — In progress

Improve the reliability of generation as a material/texture tool rather than a generic image generator.

Focus areas:

- typed material profiles;
- centralized prompt construction;
- preservation of user intent;
- material-specific positive constraints;
- negative constraints where provider-supported;
- explicit seamless tile/texture constraints;
- deterministic prompt-adherence diagnostics;
- representative material benchmarks;
- honest distinction between generation success and semantic/material adherence.

Observed motivating failure: requests such as lava can produce unrelated semantic content such as buildings or architecture. Phase 3.6 addresses prompt construction and adherence; it does not replace deterministic seam validation.

## 3.7 — Persistence & Workspace Continuity — Planned

Add persistence only after the creative workflow is understood. The goal is to preserve useful workspace state across sessions without prematurely coupling the application to infrastructure that the workflow may not require.

### Phase 3 exit criteria

Phase 3 is complete when the core creative workflow is coherent and usable end-to-end:

`Prompt → Generate → History → Select → Edit → Reprocess → Validate → Preview → Export`

and when:

- generated assets remain isolated and manageable through history;
- editing is scoped to the selected asset;
- RAW source remains immutable;
- explicit reprocessing remains the processing boundary;
- validation remains authoritative and cannot silently become stale;
- material/prompt adherence is materially improved and measurable;
- persistence requirements are understood and implemented where justified;
- the major user-facing workflow is ready for a production-readiness pass.

A Phase 3 implementation may be functionally complete while still requiring substantial visual/interaction polish. That polish belongs to the Phase 3 acceptance review and Phase 4 rather than being confused with core workflow correctness.

---

# Phase 4 — Production readiness, UX & hardening

Phase 4 begins after the Phase 3 creative workflow is accepted. It is deliberately broader than cosmetic UI polish.

Areas include:

- comprehensive UI/UX polish and visual consistency;
- editor and workflow discoverability;
- accessibility;
- responsive/browser/device behavior;
- performance and perceived performance;
- caching and request management;
- cancellation/retry behavior;
- observability and diagnostics;
- security and secret handling;
- resource limits;
- image quality controls;
- regression benchmarks;
- browser/device testing;
- production error states and recovery flows;
- release-quality documentation.

The production-readiness goal is not simply to make the application prettier. It is to make the complete workflow understandable, dependable, and safe to operate.

---

# Phase 5 — Release & ecosystem

Future work can include:

- deployment and hosted operation;
- packaging/distribution;
- provider selection/configuration for users;
- additional validated providers;
- batch generation;
- advanced texture workflows;
- community or project presets;
- extended documentation.

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

## Documentation rule

After every completed phase or meaningful sub-phase, update this roadmap before starting the next phase. The documentation must describe the state of the actual `main` branch, not the intended or proposed state of a feature branch.

Do not mark work complete solely because a PR exists. A phase is complete after the implementation has been merged and its exit criteria have been verified.

## Current position

Phase 2D is complete. Phase 3.1 through 3.5 are now complete and merged into `main`.

Completed Phase 3 work:

- Phase 3.1 application state and workspace foundation.
- Phase 3.2 generation and regenerate UX.
- Phase 3.3 processing controls and live preview.
- Phase 3.4 generation history and asset management.
- Phase 3.5 Tiler-owned image editor integrated with asset history.

Current target:

**Phase 3.6 — Prompt & Material Adherence**.

After Phase 3.6 and 3.7 are complete, perform a dedicated Phase 3 exit/acceptance review before beginning Phase 4.
