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
| **2D** | Pixazo productionization | Complete / historical | Establish one reliable end-to-end generation vertical slice |
| **3** | Functional product / vertical slice | Complete | Build a fully usable, multi-asset, persistent Tiler application |
| **4** | UX, quality & hardening | Active | Make the working product pleasant, robust, observable, accessible, and safe to operate |
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

Phase 2D was the engineering phase that turned the selected Pixazo integration into a reliable, testable vertical generation path inside Tiler.

`prompt → Pixazo → image → TileProcessor → validation → preview → export`

### Phase 2D exit criteria

Phase 2D is **complete**. The local setup reliably demonstrates the complete vertical slice with explicit success and failure states, robust credential redaction, multi-tile spritesheet export compositing, and automated tests covering the provider integration and pipeline boundaries.

---

# Phase 3 — Functional product / vertical slice — Complete

Phase 3 turned the technical vertical slice into a feature-complete, interactive 2D game tile generator workspace.

## 3.1 — Application State & Workspace Foundation — Complete
- Introduced single source of truth workspace model in `src/types/index.ts` orchestrated via `useWorkspaceState`.
- Pure state transition logic encapsulated in `workspaceTransitions.ts` for deterministic behavior testing.
- Clean separation of generation lifecycle (`idle` | `generating` | `processing` | `analyzing` | `completed` | `error`) and export lifecycle (`idle` | `exporting` | `completed` | `error`).

## 3.2 — Generation & Regenerate UX — Complete
- Distinct initial generation ("GENERATE TILE") and re-generation ("REGENERATE TILE") workflows.
- Active generation status communicated honestly without fake percentage meters.
- Existing valid assets preserved in workspace during regeneration failures.

## 3.3 — Processing Controls & Live Preview — Complete
- Interactive processing controls (algorithm, blend margin 0–20%, threshold, edge-region depth 1–8px).
- Explicit reprocessing action operating strictly on raw source images (`rawImageDataUrl`) without firing network requests.
- Synchronized preview and seam inspection across raw and processed image sources.

## 3.4 — Generation History & Asset Management — Complete
- In-memory multi-asset history management (up to 20 assets) with human-readable collision-free names.
- Non-destructive asset switching, selection, and deletion with deterministic selection fallbacks.

## 3.5 — Tiler Image Editor & UX Foundation — Complete
- Integrated HTML5 Canvas image editor for non-destructive local editing (transform, rotate 90° CW/CCW, flip H/V, 1:1 crop, color adjustments).
- Non-destructive asset model preserving immutable `rawImageDataUrl` while storing edits in `editedImageDataUrl`.

## 3.6 — Prompt & Material Adherence — Complete
- Typed material profiles (`server/services/materialProfiles.ts`) and deterministic prompt adherence engine (`server/services/promptAdherence.ts`).
- Standardized SDXL Base 1.0 template (`[MATERIAL], [SURFACE STRUCTURE], [COLOR / PALETTE], [SMALL-SCALE DETAILS], [NATURAL VARIATION], evenly distributed detail, uniform surface, flat neutral lighting, seamless tileable texture, continuous pattern, no visible borders`) and composition-filtering negative prompts.
- Developer prompt inspection diagnostics in UI.

## 3.7 — Persistence & Workspace Continuity — Complete
- Dual-layer local workspace persistence: lightweight metadata in `localStorage` (`tiler_workspace_v1`) and heavy binary image Data URLs in `IndexedDB` (`tiler_workspace_db`).
- In-memory Map fallback with visual persistence indicator ("Saved locally" green vs "Session only — not persisted" amber).

### Phase 3 exit criteria

Phase 3 is **complete**. Tiler provides a complete, persistent, multi-asset workflow for generating, editing, processing, analyzing, inspecting, and exporting 2D game terrain textures.

---

# Phase 4 — UX, quality & hardening — Active Focus

The goal of Phase 4 is to systematically refine, harden, optimize, and evaluate the complete Tiler application.

## 4.1 — UX Refinement & Micro-interactions
- Refine canvas preview interaction (zoom limits, pan bounds, smooth wheel zooming).
- Visual feedback for seam analysis heatmaps and side-by-side raw vs. processed comparison.
- Toast notification polish and status indicators.

## 4.2 — Accessibility & Keyboard Navigation
- ARIA semantics across control panels, asset history list, modal dialogs, and image editor canvas.
- Complete keyboard navigation (Tab indices, Enter/Space activation, Escape for editor/modal closing).
- High contrast and screen reader readability for seam scores and validation status labels.

## 4.3 — Performance, Caching & Resource Management
- Memory management for high-resolution canvas surfaces and IndexedDB blobs.
- Asynchronous image decoding and thumbnail generation in asset history list.
- Request cancellation via `AbortController` during quick navigation or asset switching.

## 4.4 — Observability, Diagnostics & Error Recovery
- Structured client-side and server-side runtime error tracking standard (`docs/errors.md`).
- Enhanced provider diagnostics (response timing, resolution, API request IDs, sanitized payload logs).
- Graceful recovery paths for network disconnects, quota limits, and canvas context loss.

## 4.5 — Quality Hardening & Regression Benchmarks
- Automated regression test suite for prompt adherence, tile processing, seam analysis, and API contracts.
- Provider benchmark harness validation against canonical materials (cobblestone, grass, sand, water, wood, lava).
- Production build optimization (Vite/esbuild bundle sizes, asset preloading, zero type errors).

### Phase 4 exit criteria

- 100% test pass rate across unit, integration, and adherence test suites (`npm test`).
- Zero TypeScript compilation errors (`npm run lint`).
- Clean production build output (`npm run build`).
- Full accessibility and keyboard navigation compliance.
- Documented runtime diagnostics and error recovery procedures.

---

# Phase 5 — Release & ecosystem — Future

Future work includes:

- Hosted deployment configurations and containerization (Docker).
- Packaging and distribution for desktop or web environments.
- User-selectable provider options and API key configuration dialogs.
- Advanced procedural material synthesis and batch generation.
- Community presets and extended material library documentation.

---

## Current position

The project has completed **Phase 3 — Functional Product / Vertical Slice** and **SDXL Base 1.0 Tileable Texture Prompt Instructions Integration**.

Completed work:
- Phase 0–2D: Reconnaissance, pipeline, benchmark framework, PoC research, and Pixazo production candidate integration.
- Phase 3.1–3.7: Workspace state, generate/regenerate UX, interactive processing controls, multi-asset history, canvas image editor, prompt adherence engine, and dual-layer IndexedDB persistence.
- SDXL Base 1.0 Prompt Engineering: Canonical template formula, expanded material profiles, compact word targets (25–60 words), composition-filtering negative prompts, and documented instructions in `docs/models/SDXL_PROMPT_INSTRUCTIONS.md`.

The active focus is **Phase 4 — UX, Quality & Hardening**.
