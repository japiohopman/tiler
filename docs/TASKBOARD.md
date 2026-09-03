# Tiler Task Board

This is the operational task board. `ROADMAP.md` defines the long-term direction and Jules queue; this file defines what is ready, active, blocked, and next.

## Status legend

- `DONE` — merged and verified.
- `REVIEW` — PR exists and needs human review.
- `READY` — sufficiently specified and ready for Jules/development.
- `ACTIVE` — currently being worked on.
- `BLOCKED` — cannot proceed until a dependency is resolved.
- `DEFERRED` — intentionally postponed.

## Phase 3 — Functional product

| ID | Task | Status | Branch / reference | Notes |
|---|---|---|---|---|
| 3.1 | Application State & Workspace Foundation | DONE | `feat/phase-3-1-workspace-state-12188370678240787233` | Central workspace state and asset identity |
| 3.2 | Generation & Regenerate UX | DONE | `feat/phase-3-2-generation-regenerate-ux-7398474216262472003` | Generation/retry flow |
| 3.3 | Processing Controls & Live Preview | DONE | `feat/phase-3-3-processing-controls-live-preview-5127854276200567434` | Processing/reprocess UX |
| 3.4 | Generation History & Assets | DONE | `feat/phase-3-4-generation-history-assets-5020864432258936564` | Asset history and selection |
| 3.5 | Tiler Image Editor UX | DONE | `feat/phase-3-5-tiler-image-editor-ux-v2-9307531337403305463` | Application-owned editor integration |
| 3.6 | Prompt & Material Adherence | DONE | `feat/phase-3-6-prompt-material-adherence-5702148789242012166` | Material-aware generation constraints |
| 3.7 | Persistence & Workspace Continuity | REVIEW / VERIFY | `feat/phase-3-7-persistence-workspace-continuity-15010728190953028754` | Final Phase 3 gate; verify locally before merge |

## Immediate stabilization

| ID | Task | Status | Priority | Notes |
|---|---|---|---|---|
| S1 | Pixazo SDXL generation reliability | READY / QUEUED | P0 | Canonical Jules queue item; queue orchestrator dispatches it from `ROADMAP.md` |
| S2 | Runtime error log discipline | READY | P0 | Keep `docs/errors.md` as the chronological error record |
| S3 | Main-branch verification gate | READY | P0 | Every merged phase gets a real local verification pass |

## Phase 4.0 — Production UX & hardening

### 4.1 Information Architecture — BLOCKED

- Map all current screens/panels/controls.
- Define the primary production workflow.
- Separate production UI from developer/QA UI.
- Define navigation and workspace hierarchy.
- Remove stale phase/engine terminology.
- Move into `ROADMAP.md` `### Ready` only after Phase 3.7 and stabilization gates allow Phase 4 to begin.

### 4.2 Production Workspace UX — READY

- Current asset context always visible.
- Clear next action.
- Better empty/loading/error/success states.
- Reduce simultaneous panels.
- Establish primary/secondary action hierarchy.

### 4.3 Developer / QA Workspace — READY

Move, group, or isolate:

- benchmark controls;
- test texture presets;
- prompt inspector;
- seam diagnostics;
- provider diagnostics;
- raw metrics;
- engine diagnostics.

These tools remain available but should not clutter the normal product path.

### 4.4 Generation UX — READY

- Prompt input clarity.
- Material/style controls.
- Generation progress.
- Cancellation.
- Retry/regenerate semantics.
- Provider error presentation.
- Prevent duplicate submissions.

### 4.5 Asset & History UX — READY

- Better asset cards.
- Clear selected/current asset.
- Naming and metadata.
- Version/state visibility.
- Delete confirmation and cleanup feedback.
- Persistence status that is honest and understandable.

### 4.6 Image Editor UX — READY

- Make editing discoverable.
- Clear edit/apply/cancel semantics.
- Maintain raw/edited/processed distinction.
- Evaluate Photopea or another engine behind an application-owned editor abstraction.
- No iframe-based product UI.

### 4.7 Processing & Validation UX — READY

- Explain processing options.
- Distinguish raw vs processed.
- Show validation status clearly.
- Explain seam failures in user language.
- Keep detailed diagnostics available in developer mode.

### 4.8 Export UX — READY

- Clear output target.
- Clear format and resolution.
- Explain validated/unvalidated export state.
- Preview final output.
- Keep spritesheet generation deterministic.

### 4.9 Quality & Benchmarking — READY

- Preserve provider benchmark infrastructure.
- Separate benchmark UI from production UI.
- Define repeatable generation quality fixtures.
- Track material adherence separately from tileability.
- Avoid declaring provider quality from mocked tests.

### 4.10 Reliability & Performance — READY

- Request lifecycle management.
- Cancellation.
- Memory management.
- Persistence performance.
- Error boundaries.
- Browser compatibility.
- Avoid unnecessary rerenders and duplicate work.

### 4.11 Accessibility — READY

- Keyboard navigation.
- Focus management.
- Accessible labels.
- Status announcements.
- Contrast review.
- Reduced-motion behavior.

### 4.12 Security & Production Hardening — READY

- Secret handling.
- Input validation.
- Safe error messages.
- Dependency review.
- Resource limits.
- CI/build checks.

## Phase 5.0 — Future backlog

| ID | Area | Status |
|---|---|---|
| 5.1 | Production deployment & monitoring | DEFERRED |
| 5.2 | Additional validated providers | DEFERRED |
| 5.3 | Provider capability matrix | DEFERRED |
| 5.4 | Batch generation / variations | DEFERRED |
| 5.5 | Reusable material/style presets | DEFERRED |
| 5.6 | Project import/export | DEFERRED |
| 5.7 | Asset collections / versions | DEFERRED |
| 5.8 | Advanced seam-aware editing | DEFERRED |
| 5.9 | Advanced layer/mask workflows | DEFERRED |
| 5.10 | Optional collaboration/ecosystem | DEFERRED |

## Phase 4 ordering rule

Do not execute 4.2–4.12 as independent cosmetic tickets before 4.1 is established.

The order should generally be:

`Information Architecture → Core UX → Developer/QA separation → Feature UX → Reliability → Accessibility → Hardening`

## Definition of ready

A task is `READY` when:

- the goal is unambiguous;
- the starting branch/base is known;
- dependencies are known;
- acceptance criteria are measurable;
- the scope is appropriate for one Jules session/PR;
- relevant docs and errors are identified.

## Definition of done

A task is `DONE` only after:

1. Implementation exists.
2. Relevant automated tests pass.
3. Typecheck/lint passes.
4. Build passes.
5. Real runtime behavior has been checked where applicable.
6. PR has been human-reviewed.
7. PR is merged to `main`.
8. `docs/errors.md` is updated when errors were found.
9. Roadmap/task board are updated.

## Jules rule

Jules can implement tasks. Jules does not decide that a phase is complete.

Human review remains the merge authority.
