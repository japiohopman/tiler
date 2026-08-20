# Tiler Documentation

Tiler is an open-source AI-assisted tile generator for creating technically valid, seamlessly repeating 2D game textures.

## Documentation principles

This directory is part of the project's source of truth. Agents must read the relevant documentation before changing implementation.

The project separates four concerns:

1. **Generation** — an image model creates visual source material.
2. **Processing** — deterministic image processing turns source material into tile candidates.
3. **Validation** — deterministic analysis measures whether a candidate actually tiles.
4. **Presentation/export** — the UI previews and exports validated assets.

AI generation must never be treated as proof that an image is seamless. Seamlessness is a technical property that must be measured by Tiler.

## Documentation structure

- `docs/ROADMAP.md` — canonical development phases, goals, dependencies, and exit criteria.
- `docs/architecture/` — system architecture and component boundaries.
- `docs/models/` — image-model research, benchmarks, licensing and provider decisions.
- `docs/tile-engine/` — tile processing and seamlessness algorithms.
- `docs/development/` — development workflow, testing and conventions.
- `docs/decisions/` — Architecture Decision Records (ADRs).

## Current development state

The provider research phase is transitioning into productionization. The canonical next target is **Phase 2D: Pixazo productionization**. See `docs/ROADMAP.md` for the complete phase map and exit criteria.

The immediate goal is a minimal but genuinely working vertical slice:

`prompt → generation → processing → validation → preview → export`

The project should not prematurely expand into a large feature set before this path works reliably.

## Core rule

Prefer deterministic, testable software over AI-dependent behaviour wherever possible. AI should generate or assist with visual content; the application must remain responsible for correctness.