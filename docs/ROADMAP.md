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
| **4** | UX, quality & hardening | Complete | Make the working product pleasant, robust, observable, accessible, and safe to operate |
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

# Phase 4 — UX, quality & hardening — Complete

Phase 4 systematically refined, hardened, optimized, and evaluated the complete Tiler application.

## 4.1 — UX Refinement & Micro-interactions — Complete
- Refined canvas preview interaction (zoom limits 0.1x–10.0x, bounded pan constraints to keep preview in viewport, smooth wheel zooming).
- Interactive seam highlight overlay toggle and side-by-side comparison controls in `TilePreview.tsx`.

## 4.2 — Accessibility & Keyboard Navigation — Complete
- ARIA semantics (`role="region"`, `role="radiogroup"`, `role="status"`, `role="alert"`, `aria-expanded`, `aria-pressed`, `aria-live`, `aria-selected`) across control panels, asset history list, modal dialogs, and canvas viewports.
- Keyboard navigation (Tab focus rings `focus-visible:ring-2 focus-visible:ring-amber-500`, Enter/Space activation, `Escape` key handler in `ImageEditor.tsx`).

## 4.3 — Performance, Caching & Resource Management — Complete
- Client-side request cancellation support (`AbortSignal`) across fetch endpoints in `src/services/apiClient.ts`.
- Memory & canvas unmount cleanup logic in `TilePreview.tsx` preventing memory leaks during rapid asset switching.

## 4.4 — Observability, Diagnostics & Error Recovery — Complete
- Created `docs/errors.md` error taxonomy and diagnostic payload logging standard.
- Enhanced provider diagnostics (response timing, resolution, API request IDs, sanitized payload logs) in `PixazoImageGenerationProvider`.

## 4.5 — Quality Hardening & Regression Benchmarks — Complete
- Automated regression test suite (67/67 integration tests pass cleanly via `npm test`).
- Zero TypeScript compilation errors (`npm run lint` / `tsc --noEmit`).
- Clean production build output (`npm run build`).

### Phase 4 exit criteria

Phase 4 is **complete**. Tiler meets all UX polish, accessibility, performance, observability, and regression quality standards.

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

The project has completed **Phase 4 — UX, Quality & Hardening**.

Completed work:
- Phase 0–2D: Reconnaissance, pipeline, benchmark framework, PoC research, and Pixazo production candidate integration.
- Phase 3.1–3.7: Workspace state, generate/regenerate UX, interactive processing controls, multi-asset history, canvas image editor, prompt adherence engine, and dual-layer IndexedDB persistence.
- Phase 4.1–4.5: UX refinement, ARIA accessibility, request cancellation (`AbortSignal`), error taxonomy standard (`docs/errors.md`), and full regression quality hardening.

The next milestone is **Phase 5 — Release & Ecosystem**.
