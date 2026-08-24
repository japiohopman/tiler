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
| **3** | Product completion | In progress | Turn the technical slice into a genuinely usable creative application |
| **4** | Production readiness, UX polish & hardening | Planned | Make the complete product polished, robust, accessible, observable, and safe to operate |
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

The raw provider result and processed result are handled as distinct stages.

Completed capabilities include raw seam analysis, processed seam analysis, validation summary, deterministic final-status handling, independent raw/processed pass information, and UI reporting of improvement, worsening, or unchanged processing results.

The backend `validationSummary.finalStatus` is the authoritative source for the user-facing final validation status.

## 2D.3 — Export & Output — Complete

The generated and processed results can be taken through the output/export path, including multi-tile spritesheet compositing.

## 2D.4 — Reliability & Failure Handling — Complete

The real application path handles and verifies core success and failure states, including provider credential failures, provider/API failures, invalid image responses, processing failures, validation failures, explicit export validation state, deterministic state transitions, and no silent fallback to mock output when Pixazo is selected.

## 2D.5 — Vertical Slice Acceptance — Complete

End-to-end acceptance verified:

`prompt → Pixazo → image → TileProcessor → validation → preview → export`

### Phase 2D exit criteria

Phase 2D is **complete**. The local setup reliably demonstrates the complete vertical slice with explicit success and failure states, robust credential redaction, multi-tile spritesheet export compositing, and automated tests covering the provider integration and pipeline boundaries.

At this point Tiler has a **working technical product slice**. Phase 3 is therefore focused on product completion and real user workflow quality rather than proving whether the underlying generation path works.

---

# Phase 3 — Product completion

Phase 3 is now the active product-building phase.

The goal is to turn the working technical slice into the actual Tiler application: a coherent creative workflow in which users can generate, inspect, edit, process, validate, manage, and export tile assets without needing to understand the underlying engineering pipeline.

Phase 3 work should be driven by real use of the application. We should prefer meaningful workflow improvements over isolated technical tasks or speculative infrastructure.

## 3.1 — Application State & Workspace Foundation — Complete

Established the workspace state boundaries and the foundation for treating the application as a coherent workspace rather than a collection of disconnected component states.

## 3.2 — Generation & Regenerate UX — Complete

Established clear Generate and Regenerate behavior, including duplicate-generation protection and user-visible generation state.

## 3.3 — Processing Controls & Live Preview — Complete

Established explicit processing controls and live preview behavior while preserving the distinction between raw and processed imagery.

## 3.4 — Generation History & Asset Management — Complete

Established in-memory asset history and current-asset selection.

Completed capabilities include:

- distinct assets for successful generations and regenerations;
- independent raw and processed image state per asset;
- per-asset validation summary and metadata;
- selecting historical assets without triggering generation or processing;
- isolated reprocessing of the selected asset;
- deterministic asset deletion behavior;
- bounded in-memory history;
- guaranteed unique workspace asset identities.

## 3.5 — Tiler Image Editor & UX Foundation — Next

This is the next major product milestone.

The objective is to give the user meaningful control over generated imagery instead of treating provider output as untouchable.

The editor must use a **Tiler-owned UI**. Do not expose a third-party editor UI through an iframe.

Photopea may be evaluated and used as an underlying image-processing/editing engine where technically appropriate, but its UI must not become the Tiler user experience.

Likely capabilities include:

- crop and framing;
- rotate and flip;
- transform;
- brightness, contrast, saturation and related basic adjustments;
- before/after inspection;
- editing raw or selected source imagery without corrupting immutable source data;
- applying edits back into the workspace asset model;
- reprocessing, validation and export after editing;
- a substantial UX/UI refinement pass around the complete creative workflow;
- clearer empty, loading, success, failure and recovery states;
- clearer RAW vs PROCESSED semantics;
- consistent controls and interaction patterns;
- accessibility and responsive-layout fundamentals.

The goal is **not** to recreate Photoshop or Photopea. Build only the editing capabilities that materially improve Tiler's tile-generation workflow.

## 3.6 — Prompt & Material Adherence — Planned

Address a major product-quality problem observed during real use: generated content can ignore the requested material or semantic subject, for example a request for lava producing architecture or unrelated scene content.

This phase should investigate and improve:

- material-aware prompt construction;
- explicit positive generation constraints;
- explicit negative constraints where supported;
- tile-specific composition instructions;
- generation parameter choices;
- deterministic prompt templates or material profiles where useful;
- measurable adherence tests and benchmark cases.

The objective is not to guarantee perfect generative output. The objective is to materially improve adherence to the user's requested material and tile intent, and to make failures understandable and recoverable.

## 3.7 — Workspace Persistence & Project Sessions — Planned

After the core creative workflow is strong, add appropriate persistence for workspace/project sessions.

The exact persistence architecture should be chosen from evidence gathered during Phase 3.5 and 3.6 rather than prematurely committing to a database or cloud architecture.

Potential capabilities include:

- saving and reopening a Tiler project;
- preserving assets and relevant generation/processing settings;
- restoring current asset selection;
- safe handling of image data and project size limits.

This phase should not begin until the editing and generation-adherence workflows have established what actually needs to be persisted.

---

# Phase 3 exit criteria

Phase 3 is complete only when Tiler is a coherent, genuinely usable creative workflow rather than merely a technically functioning pipeline.

Minimum exit criteria:

- Generate → Regenerate → Edit → Process → Validate → Preview → Export works as one coherent workflow.
- Users can manage multiple generated assets without losing previous results.
- Users can make meaningful corrections to generated imagery before processing/export.
- Material/prompt adherence is materially improved and measured for representative cases.
- Major UX friction discovered during real use has been addressed.
- Empty, loading, success, failure and recovery states are understandable without developer knowledge.
- RAW, EDITED, PROCESSED and VALIDATED states have clear semantics.
- The application does not silently substitute mock output for real provider output.
- Core automated tests and real-browser verification cover the complete workflow.

A formal Phase 3 exit audit should be performed before starting Phase 4.

---

# Phase 4 — Production readiness, UX polish & hardening

Phase 4 is **not** merely a cosmetic polish pass. It begins after the core product workflow is genuinely complete.

The goal is to make Tiler production-ready in engineering, UX, reliability and operational terms.

Areas include:

- comprehensive UI/UX polish across the application;
- accessibility and keyboard navigation;
- responsive behavior and browser/device compatibility;
- performance profiling and optimization;
- image memory/resource management;
- request cancellation, retry and concurrency controls;
- error recovery and user-safe failure states;
- observability and diagnostics;
- security and secret handling;
- resource and upload limits;
- image quality controls and regression benchmarks;
- automated regression coverage;
- CI/CD and quality gates;
- GitHub Actions and release checks;
- production configuration and environment validation;
- documentation and operational runbooks.

Phase 4 should harden the product that Phase 3 creates. It should not be used to compensate for missing core product workflows.

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

## Current position

The project has completed **Phase 2D — Pixazo Productionization** and completed Phase 3.1 through Phase 3.4.

Completed work:

- Phase 2C provider research and production candidate selection.
- Phase 2D.1 functional Pixazo generation baseline.
- Phase 2D.2 processing and validation integration.
- Phase 2D.3 export and output path.
- Phase 2D.4 reliability and failure handling.
- Phase 2D.5 vertical slice acceptance and end-to-end verification.
- Phase 3.1 application state and workspace foundation.
- Phase 3.2 generation and regenerate UX.
- Phase 3.3 processing controls and live preview.
- Phase 3.4 generation history and asset management.

The next planned target is **Phase 3.5 — Tiler Image Editor & UX Foundation**.

> The technical vertical slice is proven. The next challenge is making Tiler a genuinely controllable, understandable and pleasant creative application before production hardening begins.