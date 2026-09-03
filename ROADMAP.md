# Tiler Roadmap

This is the canonical high-level roadmap for Tiler.

The roadmap defines **direction, phase boundaries, and exit criteria**. It does not replace the task board. Individual implementation tasks belong in `docs/TASKBOARD.md`.

## Product vision

Tiler is a production-oriented AI-assisted tile/texture workstation. AI generation is only one part of the product. The deterministic processing, seam analysis, validation, asset management, editing, and export pipeline must remain understandable and trustworthy.

The target product flow is:

`Create → Generate → Review → Edit → Process → Validate → Export`

The application should never require the user to understand internal benchmark or provider machinery in order to use the core workflow.

## Current status

| Phase | Focus | Status |
|---|---|---|
| 0 | Reconnaissance & architecture | Complete |
| 1 | Core deterministic tile engine | Complete / foundation |
| 2A | Provider abstraction | Complete |
| 2B | Provider benchmark framework | Complete |
| 2C | Provider research / PoCs | Complete |
| 2D | Pixazo productionization / vertical slice | Complete |
| 3.1 | Application state & workspace foundation | Complete |
| 3.2 | Generation / regenerate UX | Complete |
| 3.3 | Processing controls & live preview | Complete |
| 3.4 | Generation history & assets | Complete |
| 3.5 | Tiler image editor UX | Complete |
| 3.6 | Prompt & material adherence | Complete |
| 3.7 | Persistence & workspace continuity | In review / final verification |
| 4.0 | Production UX, information architecture & hardening | Planned |
| 5.0 | Release, ecosystem & advanced workflows | Future |

## Phase 3 — Functional product

Phase 3 turns the technical vertical slice into a usable workstation.

### 3.1 Application state & workspace foundation

- Central workspace state.
- Current asset identity.
- Explicit generation and processing states.
- Predictable workspace transitions.

**Exit:** application state is deterministic and suitable for subsequent product features.

### 3.2 Generation & regenerate UX

- Generate and regenerate flows.
- Clear loading/error states.
- Correct asset creation semantics.
- No fake success when a provider fails.

**Exit:** generation can be performed repeatedly without corrupting workspace state.

### 3.3 Processing controls & live preview

- Processing controls.
- Reprocess existing assets.
- Live preview.
- Raw/processed distinction.

**Exit:** users can understand and control the transformation from generated source to processed tile.

### 3.4 Generation history & asset management

- Persistent asset history model.
- Asset selection.
- Current asset context.
- Asset metadata and statuses.

**Exit:** multiple generated assets can be safely managed in one workspace.

### 3.5 Image editor UX

- Application-owned editor experience.
- Editing integrated with asset lifecycle.
- Edited source can feed subsequent processing.
- Raw, edited, and processed states remain distinct.

**Exit:** an asset can be edited and the edit remains part of the asset lifecycle.

### 3.6 Prompt & material adherence

- Material-aware prompt construction.
- User intent preservation.
- Negative constraints where appropriate.
- Prompt adherence tests.
- Provider diagnostics.

**Exit:** the system reliably expresses the requested material/style constraints to the provider and measures adherence separately from tileability.

### 3.7 Persistence & workspace continuity

- Metadata persistence in localStorage.
- Image persistence in IndexedDB.
- Restore after reload.
- Durable vs session-only status.
- Complete asset deletion cleanup.
- Workspace clearing.

**Exit:** a reload restores the durable workspace correctly and destructive operations remove associated persisted data.

## Phase 4.0 — Production UX, information architecture & hardening

Phase 4 is **not another feature pile**. It is the consolidation phase where the accumulated functionality becomes a coherent product.

### 4.1 Information architecture

Separate the product workflow from development tooling.

**Production workspace:**

`Create → Generate → Review → Edit → Process → Validate → Export`

**Developer / QA workspace:**

- Prompt inspector.
- Benchmark controls.
- Test texture presets.
- Seam diagnostics.
- Provider diagnostics.
- Raw metrics.
- Engine diagnostics.

The development tools remain available but must not dominate the normal workflow.

### 4.2 UI/UX simplification

- Remove redundant controls.
- Establish clear primary/secondary actions.
- Reduce simultaneous panels.
- Improve empty, loading, success, warning, and error states.
- Make the current asset and current operation obvious.
- Eliminate stale phase/branding language.
- Ensure every visible control has a current purpose.

**Design rule:** Every UI element must justify its presence in the current workflow.

### 4.3 Generation quality & provider resilience

- Restore reliable real-provider generation.
- Provider contract verification.
- Clear provider failures.
- Retry/cancellation semantics.
- Request diagnostics without secret leakage.
- Quality evaluation using reproducible prompts and benchmarks.
- Avoid coupling product correctness to one provider.

### 4.4 Editor architecture

The editor must have an application-owned UI.

External engines such as Photopea may be evaluated as processing/editing engines, but Tiler must not depend on an iframe-based product UI.

Target architecture:

`Tiler Editor UI → Editor abstraction → editing engine`

### 4.5 Validation & quality UX

- Distinguish generation quality from tileability.
- Make validation status authoritative and consistent.
- Explain why an asset failed.
- Show useful seam diagnostics without overwhelming normal users.
- Preserve deterministic validation authority.

### 4.6 Performance & reliability

- Request lifecycle management.
- Cancellation.
- Avoid duplicate generation requests.
- Image memory management.
- Persistence performance.
- Error boundaries.
- Browser compatibility.

### 4.7 Accessibility

- Keyboard navigation.
- Focus management.
- Accessible controls and labels.
- Reduced-motion consideration.
- Contrast and status communication.

### 4.8 Production hardening

- Secret handling.
- Input validation.
- Resource limits.
- Safe error messages.
- Dependency/security review.
- CI verification.
- Regression tests.

## Phase 5.0 — Release & ecosystem

Future work after production readiness:

### 5.1 Release & deployment

- Production deployment.
- Environment configuration.
- Monitoring.
- Backup/recovery strategy.

### 5.2 Provider ecosystem

- Additional providers only when they provide measurable product value.
- Provider capability matrix.
- Provider-specific constraints and quality scoring.
- Graceful provider switching.

### 5.3 Advanced generation workflows

- Batch generation.
- Variation sets.
- Seed/parameter presets.
- Advanced prompt controls.
- Material libraries.

### 5.4 Asset workflows

- Asset collections.
- Import/export projects.
- Reusable presets.
- Versioned asset history.

### 5.5 Advanced editing

- Layer-aware workflows where justified.
- Masks/selections.
- Seam-aware editing.
- Automated repair tools.

### 5.6 Collaboration / ecosystem

Only if the product needs it:

- Shareable projects.
- Preset exchange.
- Community asset libraries.
- Plugin/provider integrations.

## Phase gates

A phase does not become complete because a branch or PR exists.

The normal gate is:

`Implementation → Tests → PR review → Merge → Real main test → Docs update → Next phase`

A phase may not advance when a known blocker is merely hidden or deferred without documentation.

## Planning rules

1. Work on one primary phase at a time.
2. Keep the current phase small enough for a meaningful review.
3. Fix regressions before adding unrelated features.
4. Record runtime errors in `docs/errors.md`.
5. Update `docs/TASKBOARD.md` when work changes state.
6. Update this roadmap after meaningful phase completion or replanning.
7. Never let benchmark/developer UI silently become production UI.
8. Never merge provider changes based only on mocked tests when real-provider verification is required.
9. Human review and merge remain mandatory for Jules-created PRs.
10. The roadmap is directional; the task board is operational.
