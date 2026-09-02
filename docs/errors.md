# Tiler Error & Incident Investigation Log

## Incident Report — September 2026

**Date:** September 2026
**Branch:** `fix/sdxl-tile-generation-quality-14257814159547491656`
**Provider / Endpoint:** Pixazo AI Provider (`POST https://gateway.pixazo.ai/getImage/v1/getSDXLImage`)
**Status:** **RESOLVED & VERIFIED**

---

### 1. Observed Issue
Live requests to Pixazo AI Provider were failing with HTTP 500:
```text
[Provider:pixazo] Pixazo API HTTP error 500: Internal Server Error.
[URL: POST https://gateway.pixazo.ai/getImage/v1/getSDXLImage | Status: 500 Internal Server Error | Body: Error processing request]
```

### 2. Root Cause Analysis
During previous prompt tuning, the request payload key `guidance_scale` was inadvertently renamed to `guidance: 7.5` in `server/services/providers/pixazoProvider.ts`.

Pixazo's serverless gateway request validator strictly enforces the official SDXL Base 1.0 schema:
- `guidance_scale` (number, default: 5)
- `num_steps` (integer, default: 20)

When `guidance: 7.5` was sent instead of `guidance_scale: 5`, the backend API request validator failed to parse the guidance scale, throwing an unhandled exception and returning `HTTP 500 Error processing request`.

---

### 3. Controlled Incremental Isolation Test Results

To isolate the failure and verify payload compatibility, incremental request variations were tested against the live endpoint `POST /getImage/v1/getSDXLImage`:

| Test Case | Payload Modification | HTTP Status | Response Payload | Result |
| :--- | :--- | :---: | :--- | :---: |
| **Test A (Minimal)** | `{ "prompt": "a seamless cobblestone ground texture" }` | `200 OK` | `{"imageUrl":"https://...r2.dev/sdxl/..."}` | **SUCCESS** |
| **Test B (+Params)** | `{ ..., "height": 512, "width": 512, "num_steps": 20, "guidance_scale": 5 }` | `200 OK` | `{"imageUrl":"https://...r2.dev/sdxl/..."}` | **SUCCESS** |
| **Test C (+Negative)** | `{ ..., "negative_prompt": "blurry, distorted, low quality" }` | `200 OK` | `{"imageUrl":"https://...r2.dev/sdxl/..."}` | **SUCCESS** |
| **Test D (+Full Prompt)** | `{ ..., "prompt": "Seamless tileable top-down orthographic surface texture of Lava..." }` | `200 OK` | `{"imageUrl":"https://...r2.dev/sdxl/..."}` | **SUCCESS** |
| **Test E (+Seed)** | `{ ..., "seed": 42 }` | `200 OK` | `{"imageUrl":"https://...r2.dev/sdxl/..."}` | **SUCCESS** |
| **Control Test (Old Field)** | `{ ..., "guidance": 7.5 }` | `500 Internal Server Error` | `Error processing request` | **REPRODUCED BUG** |

---

### 4. Resolution & Fix Applied

1. **Schema Correction (`server/services/providers/pixazoProvider.ts`)**:
   Corrected parameter key back to official specification:
   ```ts
   const payload: Record<string, any> = {
     prompt: builtPrompt,
     negative_prompt: negativePrompt,
     height: resolution,
     width: resolution,
     num_steps: 20,
     guidance_scale: 5,
   };
   ```

2. **Unit Test Assertions (`server/services/providers/pixazoProvider.test.ts`)**:
   Updated unit test captured request body assertions to strictly verify `guidance_scale === 5` and `num_steps === 20`.

---

### 5. Verification Summary

- **Unit & Integration Tests**: `npm test` passes 100% (67/67 API & unit tests pass).
- **TypeScript Type Safety**: `npm run lint` (`tsc --noEmit`) passes with 0 errors.
- **Production Build**: `npm run build` generates clean Vite/esbuild bundles.
- **Live Endpoint Test**: Live requests using `guidance_scale: 5` against Pixazo return HTTP 200 OK with valid hosted image Data URLs.
