# Jules Development Workflow

Tiler uses Jules as an implementation agent, not as the project manager or merge authority.

## Source of truth

The project has three planning layers plus one runtime queue-state file:

1. `ROADMAP.md` — long-term direction, phase gates, and the ordered `## Now / ### Ready` Jules queue.
2. `AGEND.md` — short-horizon priorities and the current development agenda.
3. `docs/TASKBOARD.md` — operational tasks and their human-maintained status.
4. `.github/jules-queue-state.json` — the single persistent record of the currently active Jules session.

Jules receives the planning documents as context when invoked.

## Standard queue flow

```text
ROADMAP.md Ready queue
        ↓
Queue orchestrator
        ↓
Read .github/jules-queue-state.json
        ↓
Reconcile active session vs first unchecked Ready task
        ↓
Dispatch exactly one Jules task
        ↓
Jules creates implementation PR
        ↓
Human review / merge gate
        ↓
Jules task checkbox becomes [x] in its PR
        ↓
Next orchestrator run advances the queue
```

The queue never requires ROADMAP lines to be physically moved between sections. Task descriptions stay together with their checkbox, so multiline Problem/Goal/Acceptance content cannot become orphaned.

## Why the queue is manual by default

The Jules REST API supports automated sessions and automatic PR creation. The API is currently documented as an alpha release, so we do not allow an unattended schedule to continuously modify the repository.

The orchestrator therefore runs through `workflow_dispatch`. A run reconciles the state file and dispatches at most one active task.

## Jules authentication

Store the Jules API key as a GitHub Actions repository secret:

`JULES_API_KEY`

Never commit the key to the repository. The workflow passes it to Jules through the `X-Goog-Api-Key` header.

## Jules source

Jules must have the GitHub repository connected through the Jules web app before the REST API can use it as a source.

The workflow resolves the source for:

`japiohopman/tiler`

rather than hard-coding an opaque source ID.

## Queue state

`.github/jules-queue-state.json` intentionally stays small:

```json
{
  "activeSession": null
}
```

When a task is dispatched it becomes:

```json
{
  "activeSession": {
    "name": "sessions/...",
    "task": "S1 — Pixazo SDXL generation reliability",
    "startedAt": "2026-09-03T00:00:00.000Z"
  }
}
```

Only this file tracks which Jules session is active. `ROADMAP.md` is the canonical queue order.

## Queue reconciliation rules

Each orchestrator run:

1. Reads the first unchecked task under `## Now` / `### Ready`.
2. If an active state entry no longer matches that canonical next task, the state is treated as stale and cleared.
3. If a session has no PR yet, the run stops and waits for Jules.
4. If its PR exists but is not merged, the run stops for human review.
5. If its PR is merged but the task checkbox is still unchecked, the run stops for manual inspection.
6. If the PR is merged and the checkbox is checked, the active state is cleared and the next task can be dispatched.
7. If there are no unchecked Ready tasks, the queue is empty.

This prevents stale session state from blocking the queue or allowing a later task to jump ahead of an earlier one.

## Task completion rule

Jules must change its own selected checkbox from `[ ]` to `[x]` only after personally verifying the implementation. The checkbox is changed **in place**; Problem/Goal/Acceptance sub-bullets remain attached to the task.

Jules does not merge its PR and does not decide that a phase is complete.

## Starting branch

Normal feature work starts from:

`main`

The queue orchestrator always dispatches from current `main`.

## Task scope rules

Every Jules invocation must identify:

- the selected task;
- the current phase context;
- acceptance criteria;
- tests to run;
- relevant error documentation;
- constraints.

Jules should not invent a new phase or expand the task into unrelated refactoring.

## PR rules

Jules must not:

- merge its own PR;
- silently close unrelated tasks;
- commit secrets;
- remove historical errors from `docs/errors.md`;
- replace real provider verification with a mock when real verification is required.

Human review remains mandatory.

## Error handling workflow

When a real runtime test finds an error:

1. Add an entry to `docs/errors.md`.
2. Reproduce it.
3. Identify the affected task.
4. Decide whether it blocks the current phase.
5. Give Jules a focused fix/investigation task.
6. Review the resulting PR.
7. Re-test on `main` after merge.

A provider error must not automatically be treated as an application bug, and an application bug must not automatically be treated as a provider outage.

## Phase gate

A task may be merged when its implementation and tests are satisfactory.

A phase may be marked `DONE` only after:

- all required tasks are complete;
- known blockers are resolved or explicitly accepted;
- real runtime verification is complete where applicable;
- documentation is updated.

## Jules API reference

The current official Jules REST API documentation is:

`https://jules.google/docs/api/reference`

The API currently uses `v1alpha`, supports GitHub sources and sessions, and can create a PR automatically using `automationMode: AUTO_CREATE_PR`.
