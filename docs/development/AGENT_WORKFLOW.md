# Agent Workflow

## Purpose

Tiler is developed with multiple specialized coding agents. This document defines the baseline workflow all agents must follow.

## Non-negotiable rules

1. Read `docs/README.md` and the relevant documentation before making changes.
2. Inspect the existing repository before proposing architecture or changing files.
3. Do not rewrite working code merely to match a preferred structure.
4. Do not introduce a dependency when the existing stack can solve the problem cleanly.
5. Keep image generation, image processing, validation and UI concerns separated.
6. Never claim an image is seamless because an image model says it is seamless. Tiler must measure it.
7. Do not hard-code a specific image model into core application logic. Use a provider abstraction.
8. Keep API keys and model credentials server-side.
9. Every behavioural change requires tests or an explicit documented reason why a test is not practical.
10. Do not silently change public behaviour, file formats or documented architecture.
11. Avoid unrelated refactors while implementing a task.
12. If requirements conflict or are ambiguous, stop and document the conflict rather than guessing.

## Agent workflow

### 1. Orient

- Read the task.
- Read `docs/README.md`.
- Read relevant architecture/decision documents.
- Inspect the files that will be affected.
- Identify existing tests.

### 2. Plan

Before editing, identify:

- affected modules
- interfaces/contracts involved
- tests that must change or be added
- risks and assumptions

For non-trivial work, record the plan in the task/PR description or relevant documentation before implementation.

### 3. Implement narrowly

Make the smallest coherent change that satisfies the task.

Do not implement future phases unless explicitly requested.

### 4. Validate

Run the most relevant tests, type checks, linting and build commands available in the repository.

For image-processing changes, include deterministic fixtures/tests wherever possible.

### 5. Report

The agent must report:

- what changed
- what was tested
- test/build results
- remaining risks
- assumptions made

## Ownership boundaries

### Architecture

Defines module boundaries, interfaces and major technical decisions.

### Image generation

Owns model providers, inference configuration, prompt construction and generation-specific code.

### Tile engine

Owns deterministic image processing, wrapping, edge handling and tile transformations.

### Validation

Owns seam metrics, validation thresholds, diagnostics and quality tests.

### Frontend

Owns presentation, controls, preview and user interaction. It must not contain model credentials or core image-processing logic.

### Testing

Owns test infrastructure, fixtures, regression coverage and verification of cross-module behaviour.

## Definition of done

A task is not done merely because the code compiles.

A task is done when:

- the requested behaviour exists
- architecture boundaries remain intact
- tests cover the changed behaviour where practical
- existing tests still pass
- type/build checks pass when available
- documentation is updated when behaviour or architecture changes
- no unrelated work was introduced
