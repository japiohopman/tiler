# ADR-003: Local Workspace Persistence & Continuity

**Status:** Accepted

## Context

Tiler's workspace state (generated tile history, active selection, editor modifications, processing configuration, and validation reports) previously existed strictly in volatile application runtime memory. Refreshing or closing the browser resulted in lost work and required regenerating assets.

To provide seamless workspace continuity without introducing cloud storage, database servers, or account authentication (out of scope for Phase 3), Tiler required a lightweight, client-side persistence strategy.

## Decision

1. **Serialization Layer Pattern**: Implement a dedicated persistence service (`src/services/workspacePersistence.ts`) acting as a serialization/deserialization boundary around the runtime workspace model (`useWorkspaceState.ts`). Do NOT create a parallel workspace model.
2. **Storage Engine**: Use browser `localStorage` under key `tiler_workspace_v1`.
3. **Versioned Payload**: Store state wrapped in a versioned payload (`version: 1`) to support future migrations and reject incompatible schemas.
4. **Strict Transient State Exclusion**: Never persist transient execution states (`isGenerating`, `isProcessing`, `isExporting`, active HTTP requests, AbortControllers) or credentials/secrets.
5. **Debounced Auto-Save**: Auto-save workspace changes with a 300ms debounce to avoid unnecessary write operations during rapid UI interactions.
6. **Graceful Quota Handling**: Wrap storage writes in `try...catch`. If `QuotaExceededError` occurs, preserve the active runtime session in memory and notify the user without crashing or deleting existing data.
7. **User-Controlled Reset**: Provide an explicit "Clear Workspace" action requiring confirmation to allow users to reset their local storage.

## Consequences

- Workspaces survive browser reloads and restarts seamlessly.
- No external databases, user accounts, or backend storage servers are required.
- Transient execution states are never restored into fake "stuck" states on reload.
- Storage limits (~5MB) are handled gracefully without application crashes or silent asset deletion.
