# Workspace Local Persistence & Continuity (Phase 3.7)

## Overview

Phase 3.7 introduces local workspace persistence and restoration for Tiler. Users can generate, edit, process, and validate 2D tile assets across browser reloads or sessions without losing their current project state.

Persistence is designed as a clean serialization layer around the single source of truth workspace state (`useWorkspaceState.ts`), adhering strictly to the principle that runtime state drives persistence, without introducing a parallel workspace model.

---

## Architecture & Persistence Boundary

All serialization, deserialization, schema validation, and storage operations are encapsulated within:

```text
src/services/workspacePersistence.ts
```

### Storage Mechanism

- **Primary Mechanism**: Browser `localStorage` key `tiler_workspace_v1`.
- **API Surface**:
  - `loadWorkspace()`: Retrieves, validates, and deserializes stored workspace data.
  - `saveWorkspace(data)`: Serializes and persists workspace state with quota handling.
  - `clearWorkspace()`: Removes stored workspace data from browser storage.
  - `serializeWorkspace(data, version)`: Pure function for payload serialization.
  - `deserializeWorkspace(jsonString)`: Pure function for schema validation & sanitization.

---

## Payload Schema (Version 1)

```typescript
export interface PersistedWorkspaceData {
  id?: string;
  name?: string;
  assets: WorkspaceAsset[];
  currentAssetId: string | null;
  params?: GenerationParams;
  processingOptions?: TileProcessingOptions;
  preview?: PreviewState;
}

export interface PersistedWorkspacePayload {
  version: number; // Currently 1
  savedAt: string; // ISO timestamp
  workspace: PersistedWorkspaceData;
}
```

---

## Persisted vs. Transient State Matrix

To prevent fake or stuck states on browser reloads, persistent state is strictly separated from transient execution state:

| State Field | Status | Notes |
| :--- | :--- | :--- |
| `assets[]` | **Persisted** | Raw, edited, and processed image data URLs, seam scores, validation summaries, generation metadata. |
| `currentAssetId` | **Persisted** | Active selected asset ID restored on reload. |
| `params` | **Persisted** | Generation parameters (`material`, `style`, `resolution`, `customPrompt`). |
| `processingOptions` | **Persisted** | Tile processing configuration (`algorithm`, `blendMarginPercent`). |
| `preview` | **Persisted** | Selected preview source (`processed` vs `raw`), mode (`3x3`, `single`, `infinite`), grid toggle. |
| `generation` state | **Transient** | Initialized to `status: 'idle'` on reload. |
| `processing` state | **Transient** | Initialized to `status: 'ready'` on reload. |
| `export` state | **Transient** | Initialized to `status: 'idle'` on reload. |
| `activeView` | **Transient** | Defaults to `'workspace'`. |
| `backendStatus` | **Transient** | Verified via live health check on reload (`'checking'`). |
| `notification` | **Transient** | Initialized to `null`. |
| Credentials / Secrets | **NEVER** | Provider API keys, tokens, or auth headers are never stored in persistence payloads. |

---

## Quota & Error Handling

- **Quota Exceeded Handling**: When browser `localStorage` capacity is reached (~5MB), `saveWorkspace()` catches `QuotaExceededError`. The current runtime session continues operating without interruption in memory, and a non-blocking notification warns the user.
- **Corrupt / Invalid Data Handling**: `deserializeWorkspace()` safely handles malformed JSON, missing fields, or unknown schema versions by discarding invalid payloads and initializing a clean workspace without crashing.
- **Current Asset Fallback**: If a stored `currentAssetId` does not match any valid asset in `assets[]`, it falls back deterministically to the most recent asset in history.

---

## Clear Workspace Behavior

Users can intentionally reset their workspace using the **Clear Workspace** action in `AssetHistoryPanel`.

- Requires explicit confirmation (`window.confirm`).
- Clears browser `localStorage` (`clearWorkspace()`).
- Resets runtime assets to empty (`assets: []`, `currentAssetId: null`).
- Resets parameters and processing options to defaults.
