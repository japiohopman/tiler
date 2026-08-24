# ADR-003: Dual-Layer Local Workspace Persistence & Continuity

**Status:** Accepted

## Context

Tiler's workspace state (generated tile history, active selection, editor modifications, processing configuration, and validation reports) previously existed strictly in volatile application runtime memory. Refreshing or closing the browser resulted in lost work and required regenerating assets.

Because base64 image Data URLs (512x512 textures) exceed browser `localStorage` capacity (~5MB) when storing multi-asset histories, a naive single-localStorage approach leads to `QuotaExceededError`. Furthermore, storing binary images in memory fallbacks without clear persistence boundaries can cause silent data loss upon browser reloads.

## Decision

1. **Dual-Layer Persistence Boundary**: Implement a clean separation between lightweight metadata and heavy binary image data:
   - **Lightweight Metadata Layer**: Synchronous `localStorage` under key `tiler_workspace_v1` storing asset metadata, selection, generation params, processing options, and preview state with heavy image Data URLs stripped.
   - **Heavy Binary Image Layer**: Asynchronous `IndexedDB` (`tiler_workspace_db`, `images` store) storing `raw_<assetId>`, `edited_<assetId>`, and `processed_<assetId>` base64 Data URLs.
2. **Explicit Persistence & UI Status**:
   - `saveImage()` and `saveWorkspace()` explicitly distinguish durable IndexedDB persistence (`isPersistent: true`) from runtime memory Map fallback (`isPersistent: false`).
   - In-memory Map storage is treated strictly as runtime session fallback and never reports false persistent success.
   - The UI reflects storage state via `AssetHistoryPanel`: rendering "Saved locally" (green) when `isPersistent === true` vs. "Session only — not persisted" (amber) when falling back to memory.
3. **Lifecycle Cleanup**:
   - Deleting an asset calls `imageStorage.deleteAssetImages(assetId)`, removing raw, edited, and processed image blobs from IndexedDB.
   - Clearing the workspace removes `localStorage` metadata and executes `imageStorage.clearAllImages()`.
4. **Versioned Payload**: Version payload schema (`version: 1`) to reject corrupt or incompatible schemas safely.
5. **Strict Transient State Exclusion**: Exclude transient execution states (`isGenerating`, `isProcessing`, `isExporting`, active requests) and API keys/secrets from persistence.
6. **Graceful Quota Handling**: Catch `QuotaExceededError` gracefully, keeping the active session operating in runtime memory while issuing non-blocking warnings.

## Consequences

- Workspaces and multi-asset image histories survive browser reloads and restarts seamlessly.
- `localStorage` remains lightweight (< 50KB) while heavy image blobs reside efficiently in IndexedDB.
- In-memory Map fallback never falsely reports durable storage success and visually alerts the user ("Session only — not persisted").
- Deleting assets and clearing workspaces cleans up associated IndexedDB binary blobs without leaving orphaned storage.
- No external databases, user accounts, or backend storage servers are required.
