# Application & Provider Error Log

This document records runtime errors encountered during development, testing, and provider integration analysis.

---

## Error Entry #001: Pixazo Gateway HTTP 500 Internal Server Error

- **Date:** 2026-08-23
- **Environment:** Node.js v20.18.0 / Express Server / Development Sandbox
- **Provider:** Pixazo AI Provider (`pixazo`)
- **Endpoint:** `POST https://gateway.pixazo.ai/getImage/v1/getSDXLImage`
- **Observed Error:**
  - Application receives: `HTTP 502 Bad Gateway` from `/api/generate` with provider error payload `[Provider:pixazo] Pixazo API HTTP error 500`.
  - Upstream Pixazo response: `HTTP 500 Internal Server Error`
  - Body: `{"statusCode": 500, "message": "Internal server error", "activityId": "8882f07a-06ff-47cc-8a4f-64679b81d329"}`

### Diagnostic Reproduction & Findings

Controlled diagnostic HTTP requests were executed against `https://gateway.pixazo.ai/getImage/v1/getSDXLImage` using `Ocp-Apim-Subscription-Key`:

1. **Authentication Verification (Header Validation):**
   - Header `Ocp-Apim-Subscription-Key: invalid_key` -> HTTP 401 Unauthorized (`Access denied due to invalid subscription key`).
   - Header `Authorization: Bearer <key>` or `x-api-key: <key>` -> HTTP 401 Unauthorized (`Access denied due to missing subscription key`).
   - **Result:** Gateway authentication correctly validates subscription keys.

2. **Payload Boundary Isolation:**
   - Minimal request `{ prompt: "lava" }` -> HTTP 500 Internal Server Error (10.3s).
   - Minimal request + resolution `{ prompt: "lava", width: 512, height: 512 }` -> HTTP 500 Internal Server Error (10.1s).
   - Full structured request with `prompt`, `negative_prompt`, `height`, `width`, `num_steps`, `guidance` -> HTTP 500 Internal Server Error (10.0s).
   - PromptBuilder output inspection: `builtPrompt` is valid, non-empty, and free of syntax errors.

3. **Classification:**
   - **Root Cause:** Upstream Provider Outage. The Pixazo serverless backend or downstream GPU cluster for `getSDXLImage` is currently returning HTTP 500 Internal Server Error for all text-to-image requests, regardless of payload parameters.
   - **Evidence:** Minimal valid requests (`{ prompt: "lava" }`) fail identically to full requests. Subscription authentication succeeds (not 401), but the generation service fails internally on Pixazo's infrastructure after a 10-second timeout window.

### Fix & Mitigations Applied

1. **Developer Diagnostics:** Enhanced `PixazoImageGenerationProvider` to parse and expose `activityId` and request diagnostic details (prompt length, negative prompt length, resolution) in developer logs while strictly redacting subscription keys.
2. **Error Preservation & Transparency:** Propagate HTTP 502 Bad Gateway with structured provider error details so users and developers receive clear feedback without silent mock output fallback.
3. **Local Offline Development:** `MockImageGenerationProvider` remains available for local frontend development and testing during provider downtime.
