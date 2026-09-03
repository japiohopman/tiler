# Tiler Development Agenda

This document is the short-horizon operating agenda for the project. It is intentionally more actionable than `ROADMAP.md` and less detailed than `docs/TASKBOARD.md`.

## Current priority

### 1. Finish Phase 3.7 safely

Current target:

`feat/phase-3-7-persistence-workspace-continuity-15010728190953028754`

Before declaring Phase 3 complete:

- Verify workspace restore after browser refresh.
- Verify raw/edited/processed image persistence.
- Verify asset deletion removes persisted image data.
- Verify Clear Workspace removes durable workspace data.
- Verify durable vs session-only status is honest.
- Verify provider failures do not create fake assets.
- Record any new runtime errors in `docs/errors.md`.

### 2. Stabilize the generation pipeline

Known concern:

`Pixazo SDXL` has produced HTTP 500 responses during real generation tests.

Do not assume the cause. Verify the actual request contract, provider response, environment, and recent code changes before changing unrelated product architecture.

### 3. Establish the Phase 4 baseline

Before Phase 4 implementation:

- Treat the current UI as a baseline, not a finished design.
- Identify production UI vs developer/QA UI.
- Inventory every visible panel, button, selector, badge, and diagnostic.
- Mark each item as keep, move, simplify, merge, or remove.
- Define the primary user journey.
- Keep benchmark and diagnostic tooling available without forcing normal users through it.

### 4. Phase 4 execution

Start with information architecture rather than cosmetic polish.

Recommended order:

1. Workspace/navigation architecture.
2. Production vs developer mode separation.
3. Generation UX.
4. Asset/history UX.
5. Editor UX.
6. Processing/validation UX.
7. Export UX.
8. Performance/reliability.
9. Accessibility.
10. Security and production hardening.

### 5. Phase 5 preparation

Do not implement Phase 5 prematurely. Keep the following as future design targets:

- additional providers;
- batch/variation generation;
- reusable presets;
- project import/export;
- advanced editing;
- deployment and monitoring;
- optional collaboration/ecosystem features.

## Review checklist for every phase

Before asking for review:

- [ ] Branch is based on the intended starting point.
- [ ] Scope matches the current task.
- [ ] Existing functionality has not been silently removed.
- [ ] Tests were added/updated where behavior changed.
- [ ] `npm run test` passes when practical.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] Runtime behavior was checked for user-facing changes.
- [ ] `docs/errors.md` was updated for newly discovered runtime errors.
- [ ] No secrets were committed.
- [ ] PR description explains what changed and what was verified.

## Merge gate

Human review remains mandatory.

After merge:

1. Pull/update `main`.
2. Run the application locally.
3. Exercise the changed workflow.
4. Record errors.
5. Update `ROADMAP.md` and `docs/TASKBOARD.md`.
6. Only then start the next phase.

## Working principle

Speed matters, but **rework is slower than a disciplined phase gate**.

The goal is not to minimize the number of Jules prompts. The goal is to minimize the amount of human time lost to duplicated work, stale branches, regressions, and unclear ownership of tasks.
