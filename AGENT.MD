# Tiler Agent Operating Context

Tiler uses AI agents as implementation agents. Human maintainers own planning, review, merge, and release decisions.

## Before starting

Read `ROADMAP.md`, `AGEND.md`, `docs/TASKBOARD.md`, `docs/errors.md`, and the relevant module documentation.

## Working principle

Implement only the selected task. Preserve existing functionality unless the task explicitly changes it. Prefer small, reviewable changes over broad refactors.

## Verification

Never claim a feature works without running the relevant tests and, for user-facing behavior, exercising the real workflow when practical.

## Git rules

Start from the branch specified by the orchestration request. Never merge your own PR. Never commit credentials, secrets, or local environment files.
