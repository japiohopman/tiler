# Jules Development Workflow

Tiler uses Jules as an implementation agent, not as the project manager or merge authority.

## Source of truth

The project has three planning layers plus one runtime queue-state file:

1. `ROADMAP.md` — long-term direction, phase gates, and the ordered `## Now` / `### Ready` Jules queue.
2. `AGEND.md` — short-horizon priorities and the current development agenda.
3. `docs/TASKBOARD.md` — operational tasks and their human-maintained status.
4. `.github/jules-queue-state.json` — the single persistent record of the currently active Jules session.

Jules receives the planning documents as context when invoked.

## Queue flow

```text
ROADMAP.md Ready queue
        ↓
GitHub Actions workflow_dispatch
        ↓
Queue orchestrator
        ↓
Reconcile .github/jules-queue-state.json
        ↓
Dispatch exactly one Jules task
        ↓
Jules creates implementation PR
        ↓
Human review / merge gate
        ↓
Jules checks its own task [x] after verification
        ↓
Next orchestrator run advances queue
```

The queue never requires ROADMAP task lines to be moved between sections. Multiline task descriptions remain attached to their checkbox.

## Why the workflow is manual

The Jules REST API supports automated sessions and PR creation. It is currently documented as an alpha API, so the orchestrator is deliberately started through `workflow_dispatch` rather than an unattended schedule.

Each run is also protected by a concurrency lock so two queue reconciliations cannot run simultaneously.

## Jules authentication

The repository secret must be named:

`JULES_API_KEY`

The workflow passes it to Jules through the `X-Goog-Api-Key` header. Never commit the key or any other credential.

## Jules source

Jules must have `japiohopman/tiler` connected before the workflow can create sessions. The workflow resolves the connected Jules source dynamically instead of hard-coding an opaque source ID.

## Queue state

`.github/jules-queue-state.json` stays intentionally small:

```json
{
  "activeSession": null
}
```

After dispatch:

```json
{
  "activeSession": {
    "name": "sessions/...",
    "task": "S1 — Pixazo SDXL generation reliability",
    "startedAt": "2026-09-03T00:00:00.000Z"
  }
}
```

Only this file records the active Jules session. `ROADMAP.md` remains the canonical task order.

## Queue reconciliation

Each run:

1. Reads the first unchecked task under `## Now` / `### Ready`.
2. Treats an active state entry as stale when it no longer matches that canonical next task.
3. Waits when Jules has a session but no PR yet.
4. Waits for human review when the PR exists but is not merged.
5. Stops for manual inspection when the PR is merged but Jules did not check its task checkbox.
6. Clears the active state only when the PR is merged and the task is checked `[x]`.
7. Dispatches the next task only after the previous task has cleared that gate.

This makes the state file recoverable if a workflow run is interrupted or state becomes stale.

## Task completion

Jules must change only its own dispatched task checkbox from `[ ]` to `[x]`, in place, and only after personally verifying the work. Problem/Goal/Acceptance sub-bullets must remain attached to the task.

Jules never merges its own PR and never decides that a phase is complete.

## Starting branch

Normal queue dispatches always start from current `main`. The orchestrator does not accept an arbitrary branch input, preventing accidental dispatch from stale feature branches.

## Error handling

Reproducible runtime errors belong in `docs/errors.md` without credentials. Historical incidents remain in the log after they are fixed.

## Phase gate

The project gate remains:

`Implementation → Tests → PR review → Merge → Real main test → Docs update → Next phase`

A phase does not advance merely because Jules produced a PR.

## Jules API reference

`https://jules.google/docs/api/reference`
