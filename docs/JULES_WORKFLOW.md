# Jules Development Workflow

Tiler uses Jules as an implementation agent, not as the project manager or merge authority.

## Source of truth

The project has three planning layers:

1. `ROADMAP.md` — long-term direction and phase gates.
2. `AGEND.md` — short-horizon priorities and the current development agenda.
3. `docs/TASKBOARD.md` — operational tasks and their state.

Jules receives these documents as context when invoked by the GitHub Actions workflow.

## Standard flow

```text
Task Board
   ↓
Human selects task
   ↓
GitHub Actions
   ↓
Jules Session
   ↓
Jules implementation
   ↓
Jules PR
   ↓
Human review
   ↓
Merge to main
   ↓
Real local verification
   ↓
Error log / docs update
   ↓
Next task
```

## Why the workflow is manual by default

The Jules REST API supports automated sessions and automatic PR creation. The API is currently documented as an alpha release, so we do not allow an unattended schedule to continuously modify the repository.

Instead, the orchestrator is started deliberately through `workflow_dispatch` with a task ID.

This gives us speed without giving an agent authority to silently advance the project.

## Jules authentication

Store the Jules API key as a GitHub Actions repository secret:

`JULES_API_KEY`

Never commit the key to the repository. Jules requires the key in the `X-Goog-Api-Key` header, and publicly exposed keys can be disabled by Google.

## Jules source

Jules must have the GitHub repository connected through the Jules web app before the REST API can use it as a source.

The workflow resolves the source for:

`japiohopman/tiler`

rather than hard-coding an opaque source ID.

## Starting branch

Normal feature work starts from:

`main`

A different starting branch may be supplied manually when deliberately continuing a recovery/fix workflow.

The selected starting branch must be explicitly stated in the task context.

## Task scope rules

Every Jules invocation must identify:

- task ID;
- objective;
- current phase;
- starting branch;
- acceptance criteria;
- tests to run;
- relevant error documentation;
- constraints.

Jules should not invent a new phase or expand the task into unrelated refactoring.

## PR rules

Jules may create the implementation branch and PR.

Jules must not:

- merge its own PR;
- rewrite the roadmap to declare its own work complete;
- silently close unrelated tasks;
- remove known errors from `docs/errors.md`;
- commit secrets;
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

## Recommended Jules prompt structure

```text
Task: <task id>
Phase: <phase>
Starting branch: <branch>

Context:
<short explanation>

Goal:
<one clear outcome>

Requirements:
- ...

Constraints:
- stay within task scope
- preserve existing behavior unless explicitly changing it
- do not merge

Tests:
- ...

Definition of Done:
- ...
```

The orchestrator adds the current roadmap, agenda, task board, and error log automatically so Jules has project context without requiring a huge hand-written prompt every time.

## Jules API reference

The current official Jules REST API documentation is:

`https://jules.google/docs/api/reference`

The API currently uses `v1alpha`, supports GitHub sources and sessions, and can create a PR automatically using `automationMode: AUTO_CREATE_PR`.
