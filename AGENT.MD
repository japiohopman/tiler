# Tiler Agent Operating Context

Tiler uses AI agents as implementation agents. Human maintainers own planning, review, merge, and release decisions.

## Before starting

Read `ROADMAP.md`, `AGEND.md`, `AGENT_RULES.md`, `docs/TASKBOARD.md`, and `docs/errors.md` before changing code.

## Working principle

Implement only the selected task. Preserve existing functionality unless the task explicitly changes it. Prefer small, reviewable changes over broad refactors.

## Verification

Never claim a feature works without running the relevant tests and, for user-facing or provider-dependent behavior, exercising the real workflow when practical.

## Git and security

Start from the requested starting branch. Never merge your own PR. Never commit API keys, tokens, cookies, `.env` files, or other credentials.
