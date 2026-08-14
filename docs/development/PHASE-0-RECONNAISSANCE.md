# Phase 0 — Repository Reconnaissance

## Status

Active.

## Goal

Understand the current Tiler repository before implementing the product architecture.

This phase is intentionally read-only with respect to product implementation.

## Agent instructions

Inspect the entire repository and determine:

1. Current project type and runtime.
2. Existing frontend/backend structure.
3. Existing dependencies and their purpose.
4. Existing scripts and commands.
5. Existing tests and test framework.
6. Existing image-processing capabilities.
7. Existing AI/model integrations, if any.
8. Existing UI components, if any.
9. Existing configuration and environment-variable handling.
10. Existing CI/CD configuration.
11. Existing documentation.
12. Existing technical debt or architectural risks.
13. Which parts are usable foundations and which parts are placeholders.

## Constraints

Do not:

- add the image-generation model
- implement the tile engine
- redesign the UI
- introduce a database
- add authentication
- add unrelated dependencies
- perform broad refactors
- delete existing code merely because it is incomplete

## Expected output

Create a concise repository audit at:

`docs/architecture/REPOSITORY_AUDIT.md`

The audit must contain:

### 1. Current state

What actually exists.

### 2. Technology stack

Languages, frameworks, libraries and tooling currently present.

### 3. Architecture map

A simple textual map of the current application.

### 4. Reusable components

Existing code worth keeping.

### 5. Problems and risks

Concrete issues discovered. Do not speculate without evidence.

### 6. Missing foundations

What must exist before the core tile-generation pipeline can be implemented.

### 7. Recommended next phase

A proposed Phase 1, based on the actual repository rather than assumptions.

### 8. Questions / decisions required

Anything that requires a human decision before implementation.

## Acceptance criteria

Phase 0 is complete when:

- the repository has been inspected
- `docs/architecture/REPOSITORY_AUDIT.md` exists
- no product implementation was added
- no working functionality was unnecessarily changed
- the audit distinguishes facts from recommendations
- the recommended next phase is justified by the repository contents
