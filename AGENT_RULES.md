# Tiler Agent Rules

## 1. Verification is mandatory

Do not claim that something works unless it was actually verified. Run the relevant automated tests and, when behavior is user-facing or provider-dependent, run the real workflow where practical.

## 2. Stay within scope

Work only on the assigned task and directly required fixes. Do not turn a focused task into unrelated refactoring.

## 3. Preserve functionality

Do not silently remove existing functionality, diagnostics, benchmark infrastructure, or provider support. Move or simplify functionality only when the task explicitly requires it.

## 4. Respect project authority

`ROADMAP.md` is the canonical direction and queue. `docs/TASKBOARD.md` is the operational board. Human maintainers decide phase completion and merges.

## 5. Queue completion rule

For a task dispatched from `ROADMAP.md` under `## Now` / `### Ready`, change that task's checkbox from `- [ ]` to `- [x]` only after personally verifying the completed work. Keep the task text and all sub-bullets in place.

## 6. Git and security

Never merge your own PR. Never commit API keys, tokens, cookies, `.env` files, or other credentials. Do not weaken secret redaction or error handling.

## 7. Provider verification

When a provider integration is changed, do not substitute mocks for required real-provider verification. Clearly distinguish provider failures from application failures.

## 8. Errors

Record reproducible runtime errors in `docs/errors.md` without storing secrets. Do not delete historical incidents merely because they are fixed.

## 9. Documentation

Do not rewrite roadmap/task-board status merely to declare work complete. Update task status as part of the normal human review and merge gate unless the assigned task explicitly requires documentation changes.
