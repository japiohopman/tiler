# Tiler Runtime Error Tracking & Diagnostics Standard

## Purpose

This document specifies the standard error taxonomy, diagnostic logging conventions, credential sanitization rules, and recovery behaviors across Tiler's client and server application layers.

---

## 1. Error Taxonomy & Pipeline Stages

All application runtime errors are classified under specific pipeline stages:

| Stage | Identifier | Typical Root Causes | HTTP Status / Recovery |
|---|---|---|---|
| **Provider** | `provider` | API key missing, quota exceeded (402), network timeout, provider HTTP error (502) | Propagated as HTTP 502 Bad Gateway with `stage: 'provider'` and `providerId`. Client displays clear provider configuration warning. |
| **Processing** | `processing` | Invalid image data URL, Sharp decode error, dimension mismatch | Handled locally. Preserves previous valid processed asset. |
| **Analysis** | `analysis` | Empty image buffer, invalid pixel dimensions | Returns error payload. Seam analysis failure recorded in report. |
| **Validation** | `validation` | Seam score exceeds threshold (`overallScore > threshold`) | **Expected outcome for non-tileable images.** Recorded as `VALIDATION_FAILED` status. Does not halt application. |
| **Export** | `export` | Sharp compositing error, missing image buffer | Isolated export lifecycle error. Client displays actionable alert banner. |

---

## 2. Credential Redaction & Security Guarantee

All server logs, error messages, and network payloads **must automatically redact sensitive credentials**:

- API keys (`PIXAZO_API_KEY`, `PIXAZO_SUBSCRIPTION_KEY`, `GEMINI_API_KEY`, `POLLINATIONS_API_KEY`, `HF_TOKEN`).
- Authorization bearer headers.
- Query parameters containing tokens or session secrets.

### Sanitization Implementation
In `PixazoImageGenerationProvider` (`server/services/providers/pixazoProvider.ts`):
```ts
private sanitizeErrorMessage(message: string, apiKey?: string): string {
  let sanitized = message;
  if (apiKey) {
    sanitized = sanitized.split(apiKey).join('[REDACTED_API_KEY]');
  }
  const envKey1 = process.env.PIXAZO_API_KEY;
  if (envKey1) sanitized = sanitized.split(envKey1).join('[REDACTED_API_KEY]');
  const envKey2 = process.env.PIXAZO_SUBSCRIPTION_KEY;
  if (envKey2) sanitized = sanitized.split(envKey2).join('[REDACTED_API_KEY]');
  return sanitized;
}
```

---

## 3. Provider Diagnostic Payload Structure

When a provider call succeeds or fails, diagnostic metadata is recorded on the asset and in server logs:

```json
{
  "providerId": "pixazo",
  "model": "sdxl-base-1.0",
  "requestId": "req_sdxl_981247",
  "httpStatus": 200,
  "generationTimeMs": 6420,
  "resolution": 512,
  "promptLength": 245,
  "userPrompt": "dark volcanic stone with blue glowing cracks",
  "materialProfileId": "lava",
  "negativePrompt": "object, objects, scene, landscape, building...",
  "promptAdherence": {
    "score": 100,
    "pass": true,
    "details": "Material: Lava (MATCHED) | Score: 100/100 [PASS]"
  }
}
```

---

## 4. Client Error Handling & User Recovery

1. **No Silent Mock Fallbacks:** When a real provider fails (e.g. HTTP 502 Pixazo configuration error), Tiler explicitly returns an error JSON payload instead of silently falling back to mock output.
2. **Preservation of Workspace Context:** If a regeneration or reprocessing attempt fails, the previous valid asset remains in workspace state for inspection, preview, and export.
3. **Actionable Recovery UI:** Error banners display human-readable cause information and direct users to environment settings (`PIXAZO_API_KEY`) or alternative inputs without requiring page refreshes.
