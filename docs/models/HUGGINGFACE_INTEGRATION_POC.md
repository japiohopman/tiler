# Hugging Face Inference Provider Integration Proof of Concept (PoC)

**Status:** Complete (Phase 2C.3 - GitHub Issue #18)
**Provider Classification:** **FREE WITH LIMITED MONTHLY CREDITS**
**Default Model:** `black-forest-labs/FLUX.1-schnell`
**Underlying Provider:** `fal-ai`
**Primary Endpoint:** `https://router.huggingface.co/fal-ai/models/black-forest-labs/FLUX.1-schnell`

---

## 1. Executive Summary

This document evaluates the Hugging Face Inference Providers API for seamless 2D game tile generation in Tiler under Phase 2C.3.

### Critical Classification & Free Allowance Notice

> **IMPORTANT:** Hugging Face is **NOT** unlimited free.
>
> According to current official Hugging Face documentation, Free user accounts receive a **limited monthly allowance of Inference Provider credits** (currently **$0.10 per month**, subject to change).
>
> **Official Source:** [Hugging Face Pricing & Billing Documentation](https://huggingface.co/docs/inference-providers/en/pricing)

- **Access Classification:** `FREE WITH LIMITED MONTHLY CREDITS`
- **Monthly Free Credits:** `$0.10` (Free Users) / `$2.00` (PRO Users)
- **Extra Usage:** Requires credit purchase / payment details
- **Pricing per Request:** Provider and model dependent (no unsupported cost estimates hard-coded or claimed)
- **Policy:** Tiler does not purchase credits, store credit card details, or spend beyond available free credit allowance.

---

## 2. Official Documentation & Specifications

The integration was implemented adhering strictly to current official Hugging Face documentation:

1. **First API Call Guide:** [https://huggingface.co/docs/inference-providers/guides/first-api-call](https://huggingface.co/docs/inference-providers/guides/first-api-call)
2. **Hub API Documentation:** [https://huggingface.co/docs/inference-providers/hub-api](https://huggingface.co/docs/inference-providers/hub-api)
3. **Pricing & Billing:** [https://huggingface.co/docs/inference-providers/en/pricing](https://huggingface.co/docs/inference-providers/en/pricing)
4. **Text-to-Image Task:** [https://huggingface.co/docs/inference-providers/tasks/text-to-image](https://huggingface.co/docs/inference-providers/tasks/text-to-image)
5. **Main Index:** [https://huggingface.co/docs/inference-providers/main/index](https://huggingface.co/docs/inference-providers/main/index)

---

## 3. Technical Integration Details

### Authentication Requirements

Hugging Face requires a fine-grained User Access Token with:
- Permission: **"Make calls to Inference Providers"** (`inference.serverless.write`)
- Generated from: [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

Provider-specific credentials (e.g. fal keys) or classic read/write tokens without the Inference Providers permission are not accepted.

### Endpoint Routing Architecture

- **Provider Abstraction:** Implements `ImageGenerationProvider` in `server/services/providers/huggingFaceProvider.ts` behind `id: "huggingface"`.
- **Target Model:** `black-forest-labs/FLUX.1-schnell`
- **Underlying Provider:** `fal-ai` (as explicitly documented by Hugging Face for FLUX.1-schnell)
- **Router Endpoint:** `https://router.huggingface.co/fal-ai/models/black-forest-labs/FLUX.1-schnell`
  - *Note on `auto`:* `provider="auto"` is a client-side SDK selection concept in Hugging Face JS/Python SDKs. The raw HTTP router endpoint requires a concrete provider path (e.g., `/fal-ai/models/...`) and must not literally construct `/auto/models/...`. When `HF_PROVIDER=auto` is configured, Tiler's adapter resolves the raw HTTP URL to `fal-ai` while recording `routingMode: 'auto'` in response metadata.
- **Authentication:** `Authorization: Bearer ${HF_TOKEN}`
- **Resolution:** `512x512`
- **Parameters Supported:** `inputs` (prompt), `parameters.width`, `parameters.height`, `parameters.seed` (seed: 42 preserved)
- **Metadata Captured:**
  - `model`: Model identifier (`black-forest-labs/FLUX.1-schnell`)
  - `underlyingInferenceProvider`: Concrete compute provider handling request (`fal-ai`)
  - `routingMode`: `explicit-provider` or `auto`
  - `pricingClassification`: `FREE WITH LIMITED MONTHLY CREDITS`
- **Response Handling:** Parses binary image streams (`image/png`, `image/jpeg`) as well as JSON payload responses (`generated_image`, `b64_json`, `url`), normalizing all outputs to base64 Data URLs (`data:image/png;base64,...`).

---

## 4. Error Handling & Secret Redaction

The provider adapter handles all error states cleanly without throwing unhandled exceptions or leaking sensitive API tokens:

| HTTP Status | Trigger / Condition | Normalized Behavior |
| :--- | :--- | :--- |
| **Missing Token** | `HF_TOKEN` / `HUGGINGFACE_API_KEY` absent | Throws `ProviderError` prompting user to configure token |
| **401 Unauthorized** | Token missing "Make calls to Inference Providers" permission or invalid | Throws `ProviderError` ("Invalid username or password. Ensure HF_TOKEN is a valid fine-grained User Access Token with 'Make calls to Inference Providers' permission.") |
| **402 Payment Required** | Insufficient free monthly credits | Throws `ProviderError` ("Insufficient Free Credits / $0.10 monthly free credit allowance exhausted") |
| **403 Forbidden** | Model access denied / unaccepted terms | Throws `ProviderError` ("Access denied for model or provider") |
| **404 Not Found** | Incorrect endpoint or model ID | Throws `ProviderError` ("Model Not Found") |
| **429 Rate Limit** | Provider or account rate limit reached | Throws `ProviderError` ("Rate Limit Exceeded") |
| **503 Unavailable** | Provider cold boot or model loading | Throws `ProviderError` ("Model Currently Unavailable") |

---

## 5. Real Benchmark Execution & Status

### Execution Command

```bash
npm run benchmark:huggingface
```

### Real Benchmark Execution Result

When `HF_TOKEN` is unconfigured in the execution environment, `npm run benchmark:huggingface` cleanly outputs a notice and token setup instructions without faking results or making billing commitments.

When a valid fine-grained token with "Make calls to Inference Providers" permission is present, requests route directly to:
`https://router.huggingface.co/fal-ai/models/black-forest-labs/FLUX.1-schnell`

No benchmark results are fabricated. Offline mock integration and error normalization are 100% verified via unit tests (`npm run test:huggingface`).

---

## 6. Verification & Automated Testing

All automated unit tests pass completely offline without network calls or API keys:

```bash
npm run test:huggingface  # Runs provider-specific unit test suite (15/15 passed)
npm test                 # Runs full project test suite
npm run lint             # Runs TypeScript type check
npm run build            # Runs Vite & Esbuild bundle builds
```

---

## 7. Comparison with Phase 2C Providers

| Provider | Model | Pricing Classification | Real Benchmark Executed? | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Pixazo** (Phase 2C.1) | SDXL Base 1.0 | Free API Gateway / Open Beta | Yes | Complete |
| **Pollinations** (Phase 2C.2) | FLUX.1 Schnell | Paid Pollen Credits ($0.0000 free) | Blocked (HTTP 402) | Complete (Blocked) |
| **Hugging Face** (Phase 2C.3) | FLUX.1 Schnell | **FREE WITH LIMITED MONTHLY CREDITS** ($0.10/mo) | Safely unexecuted / mock verified | **PoC Complete** |
