# Tiler Agent Rules

## Verification

Do not claim something works unless it was actually verified. Run relevant automated tests and, for user-facing or provider-dependent changes, run the real workflow when practical.

## Scope

Work only on the assigned task and directly required fixes. Do not expand a focused task into unrelated refactoring.

## Preservation

Do not silently remove existing functionality, diagnostics, benchmark infrastructure, or provider support.

## Project authority

`ROADMAP.md` is the canonical direction and Jules queue. `docs/TASKBOARD.md` is the operational board. Human maintainers own phase completion, review, and merge decisions.

## Queue completion

For a task dispatched from `ROADMAP.md` under `## Now` / `### Ready`, change only that task checkbox from `[ ]` to `[x]` after personally verifying the completed work. Keep the task text and all sub-bullets in place.

## Git and security

Never merge your own PR. Never commit API keys, tokens, cookies, `.env` files, or other credentials. Do not weaken secret redaction or error handling.

## Provider verification

When changing a provider integration, do not replace required real-provider verification with mocks. Distinguish provider failures from application failures.

## Errors and documentation

Record reproducible runtime errors in `docs/errors.md` without storing secrets. Preserve historical error entries after they are fixed. Do not rewrite roadmap/task-board status merely to declare a phase complete.
