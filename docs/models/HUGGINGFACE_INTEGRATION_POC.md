# Hugging Face Inference Provider Integration Proof of Concept (PoC)

**Status:** Complete (Phase 2C.3 - GitHub Issue #18)
**Provider Classification:** **FREE WITH LIMITED MONTHLY CREDITS**
**Default Model:** `black-forest-labs/FLUX.1-schnell`
**Default Provider Routing:** `auto` (optional explicit provider override via `HF_PROVIDER`, e.g. `together`, `replicate`, `fal-ai`)
**Official SDK:** `@huggingface/inference` (`InferenceClient.textToImage`)

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
2. **Huggingface.js Inference README:** [https://huggingface.co/docs/huggingface.js/en/inference/README](https://huggingface.co/docs/huggingface.js/en/inference/README)
3. **Hub API Documentation:** [https://huggingface.co/docs/inference-providers/hub-api](https://huggingface.co/docs/inference-providers/hub-api)
4. **Pricing & Billing:** [https://huggingface.co/docs/inference-providers/en/pricing](https://huggingface.co/docs/inference-providers/en/pricing)
5. **Text-to-Image Task:** [https://huggingface.co/docs/inference-providers/tasks/text-to-image](https://huggingface.co/docs/inference-providers/tasks/text-to-image)

---

## 3. Technical Integration Details

### Authentication Requirements

Hugging Face requires a fine-grained User Access Token with:
- Permission: **"Make calls to Inference Providers"** (`inference.serverless.write`)
- Generated from: [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

Provider-specific credentials (e.g. fal keys) or classic read/write tokens without the Inference Providers permission are not accepted.

### Architecture & SDK Integration

- **Provider Abstraction:** Implements `ImageGenerationProvider` in `server/services/providers/huggingFaceProvider.ts` behind `id: "huggingface"`.
- **Target Model:** `black-forest-labs/FLUX.1-schnell`
- **Provider Routing:** `provider: "auto"` (default) or explicit provider override via `HF_PROVIDER` (e.g. `together`, `replicate`, `fal-ai`)
- **Official Client SDK:** Uses `@huggingface/inference` `InferenceClient` to invoke:
  ```ts
  const client = new InferenceClient(HF_TOKEN);
  const imageBlob = await client.textToImage({
    model: "black-forest-labs/FLUX.1-schnell",
    inputs: builtPrompt,
    provider: "auto", // or process.env.HF_PROVIDER
    parameters: { width: 512, height: 512, seed: 42 }
  });
  ```
- **Authentication:** `Authorization: Bearer ${HF_TOKEN}`
- **Resolution:** `512x512`
- **Parameters Supported:** `inputs` (prompt), `parameters.width`, `parameters.height`, `parameters.seed` (seed: 42 preserved)
- **Metadata Captured:**
  - `model`: Model identifier (`black-forest-labs/FLUX.1-schnell`)
  - `underlyingInferenceProvider`: Provider identifier or `"auto"`
  - `routingMode`: `"auto"` (default) or `"explicit-provider"`
  - `pricingClassification`: `FREE WITH LIMITED MONTHLY CREDITS`
- **Response Handling:** Converts the SDK `Blob` output or data URL string to base64 Data URLs (`data:image/png;base64,...`).

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

### Real Benchmark Execution Status

When `HF_TOKEN` is unconfigured in the execution environment, `npm run benchmark:huggingface` cleanly outputs a notice and token setup instructions without faking results or making billing commitments.

When `HF_TOKEN` with "Make calls to Inference Providers" permission is present, the SDK routes requests dynamically (`provider: "auto"`).

No benchmark results are fabricated. Offline mock integration and error normalization are 100% verified via unit tests (`npm run test:huggingface`).

---

## 6. Verification & Automated Testing

All automated unit tests pass completely offline without network calls or API keys:

```bash
npm run test:huggingface  # Runs provider-specific unit test suite (13/13 passed)
npm test                 # Runs full project test suite (123/123 passed)
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
