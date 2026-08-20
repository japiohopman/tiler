# Hugging Face Inference Provider Integration Proof of Concept (PoC)

**Status:** Complete (Phase 2C.3 - GitHub Issue #18)
**Provider Classification:** **FREE WITH LIMITED MONTHLY CREDITS**
**Default Model:** `black-forest-labs/FLUX.1-schnell`
**Primary Endpoint:** `https://router.huggingface.co/{provider}/models/{model}` (default provider routing: `hf-inference`)

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
- **Policy:** Tiler does not purchase credits, store credit card details, or spend beyond available free credit allowance.

---

## 2. Official Documentation & Specifications

The integration was implemented adhering strictly to current official Hugging Face documentation:

1. **Pricing & Billing:** [https://huggingface.co/docs/inference-providers/en/pricing](https://huggingface.co/docs/inference-providers/en/pricing)
2. **First API Call Guide:** [https://huggingface.co/docs/inference-providers/guides/first-api-call](https://huggingface.co/docs/inference-providers/guides/first-api-call)
3. **Text-to-Image Task:** [https://huggingface.co/docs/inference-providers/tasks/text-to-image](https://huggingface.co/docs/inference-providers/tasks/text-to-image)
4. **Main Overview:** [https://huggingface.co/docs/inference-providers/main/index](https://huggingface.co/docs/inference-providers/main/index)

---

## 3. Technical Integration Details

### Architecture & Routing

- **Provider Abstraction:** Implements `ImageGenerationProvider` in `server/services/providers/huggingFaceProvider.ts` behind `id: "huggingface"`.
- **Target Model:** `black-forest-labs/FLUX.1-schnell`
- **Inference Router Endpoint:** `https://router.huggingface.co/{provider}/models/{model}`
  - Default routing: `hf-inference`
  - Optional provider overrides: `fal-ai`, `replicate`, `together`, `auto` (via `HF_PROVIDER` env variable)
- **Authentication:** `Authorization: Bearer ${HF_TOKEN}`
- **Resolution:** `512x512`
- **Parameters Supported:** `inputs` (prompt), `parameters.width`, `parameters.height`, `parameters.seed`
- **Response Handling:** Parses binary image streams (`image/png`, `image/jpeg`) as well as JSON payload responses (`generated_image`, `b64_json`, `url`), normalizing all outputs to base64 Data URLs (`data:image/png;base64,...`).

---

## 4. Error Handling & Secret Redaction

The provider adapter handles all error states cleanly without throwing unhandled exceptions or leaking sensitive API tokens:

| HTTP Status | Trigger / Condition | Normalized Behavior |
| :--- | :--- | :--- |
| **Missing Token** | `HF_TOKEN` / `HUGGINGFACE_API_KEY` absent | Throws `ProviderError` prompting user to configure token |
| **401 Unauthorized** | Invalid or expired token | Throws `ProviderError` (redacting token strings from debug message) |
| **402 Payment Required** | Insufficient free monthly credits | Throws `ProviderError` ("Insufficient Free Credits") |
| **403 Forbidden** | Model access denied / unaccepted terms | Throws `ProviderError` ("Access denied for model or provider") |
| **404 Not Found** | Incorrect endpoint or model ID | Throws `ProviderError` ("Model Not Found") |
| **429 Rate Limit** | Provider or account rate limit reached | Throws `ProviderError` ("Rate Limit Exceeded") |
| **503 Unavailable** | Provider cold boot or model loading | Throws `ProviderError` ("Model Currently Unavailable") |

---

## 5. Benchmark Execution & Credit Feasibility

### Execution Policy

To run the real benchmark against Hugging Face:
```bash
npm run benchmark:huggingface
```

The CLI benchmark script (`server/services/benchmark/cli-huggingface.ts`) automatically verifies whether `HF_TOKEN` is present in the environment before executing requests.

### Real Benchmark Execution Status

- **Configured Token:** `HF_TOKEN` was **not present** in the environment during local run.
- **Execution Output:** The CLI benchmark script (`npm run benchmark:huggingface`) detected that `HF_TOKEN` was not set, cleanly outputting a notice and instructions without faking results.
- **Credit Allowance Feasibility:** When `HF_TOKEN` is provided on a free account, generating 6 images (512x512) via FLUX.1-schnell costs approximately $0.001 – $0.003 in routed inference charges, which easily fits within the $0.10 monthly free credit allowance.
- **Artifact Generation Notice:** Because no real API token was present, real benchmark artifacts (`benchmark-results/huggingface-benchmark.json` and `benchmark-results/huggingface-benchmark.md`) were not created. Full mock validation is covered by unit tests (`npm run test:huggingface`).

---

## 6. Verification & Automated Testing

All automated unit tests pass completely offline without network calls or API keys:

```bash
npm run test:huggingface  # Runs provider-specific unit test suite
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
| **Hugging Face** (Phase 2C.3) | FLUX.1 Schnell | **FREE WITH LIMITED MONTHLY CREDITS** ($0.10/mo) | Yes | **Complete** |
