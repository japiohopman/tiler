# Workspace Local Persistence & Continuity (Phase 3.7)

## Overview

Phase 3.7 introduces local workspace persistence and restoration for Tiler. Users can generate, edit, process, and validate 2D tile assets across browser reloads or sessions without losing their current project state.

Persistence is designed as a clean dual-layer storage boundary around the single source of truth workspace state (`useWorkspaceState.ts`), adhering strictly to the principle that runtime state drives persistence, without introducing a parallel workspace model.

---

## Architecture & Storage Boundary

All serialization, deserialization, blob storage, schema validation, and cleanup operations are encapsulated within:

```text
src/services/imageStorage.ts          # Asynchronous IndexedDB blob layer for image Data URLs
src/services/workspacePersistence.ts   # Synchronous/Asynchronous metadata serialization & storage boundary
```

### Storage Mechanism (Dual-Layer)

1. **Lightweight Metadata Layer (`localStorage`)**:
   - **Storage Key**: `tiler_workspace_v1`
   - **Contents**: Asset metadata (IDs, prompts, materials, seam scores, validation summaries, creation timestamps), `currentAssetId`, `params`, `processingOptions`, and `preview` state.
   - **Image Handling**: Heavy base64 image Data URLs (`rawImageDataUrl`, `editedImageDataUrl`, `processedImageDataUrl`) are stripped from `localStorage` JSON before serialization.

2. **Heavy Binary Image Layer (`IndexedDB`)**:
   - **Database Name**: `tiler_workspace_db`
   - **Store Name**: `images`
   - **Keys**: `raw_<assetId>`, `edited_<assetId>`, `processed_<assetId>`
   - **Contents**: Full-resolution base64 Data URLs for raw provider images, committed canvas edits, and processed tile outputs.

3. **Runtime Fallback Only (Memory Map)**:
   - If IndexedDB is unavailable or fails to initialize, `imageStorage` stores images in a runtime `Map`.
   - **Important**: In-memory Map storage is a **runtime session fallback only — not durable persistence**. `saveWorkspace()` detects in-memory fallback and sets `isPersistent: false`, triggering a non-blocking user warning ("Changes stored in session memory only — will not survive reload").

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

| State Field | Storage Location | Notes |
| :--- | :--- | :--- |
| `assets` metadata | `localStorage` | Asset IDs, names, prompts, materials, seam scores, validation summaries. |
| `assets` image Data URLs | `IndexedDB` | `rawImageDataUrl`, `editedImageDataUrl`, `processedImageDataUrl` stored as binary blobs. |
| `currentAssetId` | `localStorage` | Active selected asset ID restored on reload. |
| `params` | `localStorage` | Generation parameters (`material`, `style`, `resolution`, `customPrompt`). |
| `processingOptions` | `localStorage` | Tile processing configuration (`algorithm`, `blendMarginPercent`). |
| `preview` | `localStorage` | Selected preview source (`processed` vs `raw`), mode (`3x3`, `single`, `infinite`), grid toggle. |
| `generation` state | **Transient** | Initialized to `status: 'idle'` on reload. |
| `processing` state | **Transient** | Initialized to `status: 'ready'` on reload. |
| `export` state | **Transient** | Initialized to `status: 'idle'` on reload. |
| `activeView` | **Transient** | Defaults to `'workspace'`. |
| `backendStatus` | **Transient** | Verified via live health check on reload (`'checking'`). |
| `notification` | **Transient** | Initialized to `null`. |
| Credentials / Secrets | **NEVER** | Provider API keys, tokens, or auth headers are never stored in persistence payloads. |

---

## Deletion & Clear Workspace Behavior

- **Asset Deletion**: When an asset is deleted via `deleteAsset(assetId)`, `imageStorage.deleteAssetImages(assetId)` removes `raw_<assetId>`, `edited_<assetId>`, and `processed_<assetId>` blobs from IndexedDB, preventing orphaned image storage.
- **Clear Workspace**: When the user clears the workspace via **Clear Local Workspace**:
  - Requires explicit confirmation (`window.confirm`).
  - Removes metadata JSON from `localStorage` (`clearWorkspace()`).
  - Clears all image blobs from IndexedDB (`imageStorage.clearAllImages()`).
  - Resets runtime state (`assets: []`, `currentAssetId: null`).
