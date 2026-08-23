# Tiler Development Roadmap

This document is the canonical high-level roadmap for Tiler. It exists to keep development phases explicit and to prevent provider research, core engineering, product work, and production hardening from becoming mixed together.

The roadmap is milestone-driven rather than calendar-driven. A phase is complete when its exit criteria are met on `main`, not simply when an implementation exists on a branch.

## Product direction

Tiler is an AI-assisted tile generator. The complete product path is:

`Prompt → Generate → Process → Validate → Preview → Edit → Export`

The deterministic processing and validation pipeline remains the authority for whether an image is actually tileable. Semantic/material adherence is a separate concern and must not be confused with tileability.

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
| **3** | Functional product / creative workflow | In progress | Turn the technical slice into a usable Tiler workspace |
| **4** | Production readiness, UX & hardening | Planned | Make the product production-ready, polished, robust, observable, and safe |
| **5** | Release / ecosystem | Future | Packaging, deployment, additional providers, and advanced workflows |

---

# Phase 2C — Provider research

Phase 2C was research, not production integration.

### Final findings

- Pollinations PoC: technically callable, but the tested account had insufficient pollen balance for the real benchmark.
- Hugging Face PoC: authentication and official SDK integration were verified, but the tested FLUX.1-schnell benchmark was blocked by current provider/model availability.
- Pixazo: selected as the current production candidate.

### Exit criterion

Phase 2C is complete. Provider candidates were tested sufficiently to make an explicit production-selection decision, and unsuccessful candidates are documented rather than repeatedly worked around.

---

# Phase 2D — Pixazo productionization

Phase 2D established the reliable technical vertical slice:

`prompt → Pixazo → image → TileProcessor → validation → preview → export`

## 2D.1 — Functional Baseline — Complete

Real Pixazo generation was connected to the application and verified through the UI and backend.

## 2D.2 — Processing & Validation — Complete

Completed capabilities include:

- raw seam analysis
- processed seam analysis
- validation summary
- deterministic final-status handling
- independent raw/processed pass information
- improvement/worsening/unchanged processing reporting

`validationSummary.finalStatus` is the authoritative source for the user-facing final validation status.

## 2D.3 — Export & Output — Complete

The output/export path was established, including multi-tile spritesheet compositing and separation of source, processed, validation, and export concerns.

## 2D.4 — Reliability & Failure Handling — Complete

The application handles provider, processing, validation, and export failure states explicitly without silently treating invalid generation as success or falling back to mock output when Pixazo is selected.

## 2D.5 — Vertical Slice Acceptance — Complete

The complete real local path was verified:

`prompt → Pixazo → image → TileProcessor → validation → preview → export`

### Phase 2D exit criteria

Phase 2D is complete. Tiler has a working technical product slice and Phase 3 can focus on product completeness rather than proving whether the underlying generation path works.

---

# Phase 3 — Functional product / creative workflow

Phase 3 turns the working technical slice into the actual Tiler workspace.

The phase is deliberately driven by real usage. Features must improve the complete creative workflow rather than becoming isolated UI experiments.

## 3.1 — Application State & Workspace Foundation — Complete

Established centralized workspace state and clear ownership of the current asset, generation results, processing state, validation state, and workspace transitions.

## 3.2 — Generation & Regenerate UX — Complete

Established the user-facing generation and regenerate flow, including clear loading/error behavior and explicit retry/regeneration semantics.

## 3.3 — Processing Controls & Live Preview — Complete

Established interactive processing controls and live preview behavior while keeping processing and validation state authoritative.

## 3.4 — Generation History & Assets — Complete

Established asset history, current-asset selection, and persistent separation of raw, processed, and generated asset representations.

## 3.5 — Tiler Image Editor & UX Foundation — Complete

Established the Tiler-owned canvas image editor without exposing Photopea through an iframe or embedding external editor UI.

Implemented capabilities include:

- non-destructive editing
- rotation and flipping
- cropping
- color adjustments
- before/after comparison
- tiled preview
- apply/cancel/reset semantics
- integration with workspace assets
- reprocessing of edited assets

The raw source remains preserved while edits and processed results are stored separately.

## 3.6 — Prompt & Material Adherence — Complete

Established a material-aware generation prompt architecture for common tile materials including lava, cobblestone, water, and grass.

Completed capabilities include:

- typed material profiles
- centralized prompt construction
- preservation of user intent
- material-specific positive constraints
- material-specific negative constraints
- tile/texture-oriented generation constraints
- developer prompt inspection
- deterministic prompt-adherence diagnostics
- separation of material adherence from seam/tileability validation
- real Pixazo verification for representative material prompts

The provider-facing prompt, generation metadata, developer diagnostics, and adherence diagnostics must refer to the same authoritative assembled prompt.

### Phase 3.6 exit criterion

Phase 3.6 is complete when the material-aware prompt architecture is merged and verified on `main`, deterministic tests pass, real representative Pixazo cases have been inspected, and no material-adherence regression remains in the generation pipeline.

---

## Phase 3.7 — Persistence & Workspace Continuity — Planned

The next planned product phase is persistence and workspace continuity.

Likely areas include:

- durable workspace state
- reload/reopen continuity
- asset persistence
- project/workspace identity
- restoration of the current asset and relevant editor state
- safe handling of incomplete or failed generation states

Implementation details should be determined from the current codebase and real usage rather than invented in advance.

---

## Phase 3 exit criteria

Phase 3 should not be declared complete merely because 3.1–3.7 have implementations.

The complete creative workflow must be usable on `main`:

`Prompt → Generate → Process → Validate → Preview → Edit → Export`

The Phase 3 acceptance review must verify:

- generation is understandable and recoverable;
- assets can be selected and revisited;
- processing controls behave predictably;
- validation status is authoritative and understandable;
- the editor is discoverable and functional;
- edited assets remain non-destructive to their raw source;
- preview and export use the intended asset state;
- material/prompt adherence is separated from tileability;
- major failure states are explicit and recoverable;
- the workflow feels coherent rather than like a collection of separate panels.

A broader UI/UX polish pass is intentionally part of the Phase 3 exit review and Phase 4 rather than being mistaken for completion of individual feature phases.

---

# Phase 4 — Production readiness, UX & hardening

Phase 4 begins after the Phase 3 creative workflow passes its exit criteria.

This phase is intentionally substantial. The goal is not cosmetic polishing alone; it is to make Tiler production-ready.

Areas include:

- comprehensive UX and information architecture polish
- editor and generation feature discoverability
- accessibility
- responsive/browser/device behavior
- performance and memory management
- request cancellation and retry behavior
- provider resilience and timeout handling
- observability and diagnostics
- security and secret handling
- resource limits
- image-generation quality controls
- material adherence improvements where evidence supports them
- regression benchmarks
- browser automation and end-to-end testing
- clear empty/loading/error/success states
- production-grade export behavior
- removal of developer-only UI from normal workflows
- documentation and operational readiness

Phase 4 may also revisit the image-generation strategy, including stronger control over image content and composition. External editing services such as Photopea may be integrated through APIs where useful, but Tiler's primary user experience remains Tiler-owned and must not depend on an embedded external editor UI.

---

# Phase 5 — Release & ecosystem

Future work can include:

- deployment and hosted operation
- packaging/distribution
- provider selection/configuration for users
- additional validated providers
- batch generation
- advanced texture workflows
- project presets
- extended documentation
- ecosystem/community features

New providers should only be added when they provide a concrete product or quality benefit. Provider count is not itself a product goal.

---

## How we work through the roadmap

We are not going to invent every future implementation detail up front.

- **Roadmap:** stable direction and phase boundaries.
- **Issues / PRs:** concrete engineering tasks.
- **PoCs:** evidence used to make decisions.
- **Benchmarks:** objective measurements where possible.
- **ADRs:** durable project decisions.

### Documentation synchronization rule

After every completed phase or sub-phase:

1. implementation is merged to `main`;
2. the merged state is tested on `main`;
3. the roadmap is updated to reflect the verified state;
4. the next implementation task is started only after the documentation is synchronized.

The roadmap must never mark work complete based only on an unmerged branch or an unverified PR.

## Current position

The project has completed **Phase 3.6 — Prompt & Material Adherence**.

Completed work:

- Phase 2C provider research and production candidate selection.
- Phase 2D.1–2D.5 Pixazo productionization and vertical-slice acceptance.
- Phase 3.1 application state and workspace foundation.
- Phase 3.2 generation and regenerate UX.
- Phase 3.3 processing controls and live preview.
- Phase 3.4 generation history and asset management.
- Phase 3.5 Tiler-owned image editor and editor/workspace integration.
- Phase 3.6 prompt and material adherence architecture.
- Post-Phase-3.6 wheel-event regression fix and Pixazo provider-failure investigation.

The next planned implementation target is **Phase 3.7 — Persistence & Workspace Continuity**.

Phase 3 is **not yet complete**. Its final acceptance review still needs to validate the complete creative workflow and overall UX coherence before Phase 4 begins.
