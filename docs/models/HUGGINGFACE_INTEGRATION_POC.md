# Hugging Face Inference Provider Integration Proof of Concept (PoC)

**Status:** TECHNICALLY INTEGRATED — REAL BENCHMARK BLOCKED BY CURRENT PROVIDER/MODEL AVAILABILITY (Phase 2C.3 - GitHub Issue #18)
**Provider Selection Decision:** **NOT SELECTED AS CURRENT PROVIDER CANDIDATE**
**Provider Classification:** **FREE WITH LIMITED MONTHLY CREDITS**
**Target Model:** `black-forest-labs/FLUX.1-schnell`
**Official SDK:** `@huggingface/inference` (`InferenceClient.textToImage`)
**Default Provider Routing:** `auto` (optional explicit provider override via `HF_PROVIDER`, e.g. `together`, `replicate`, `fal-ai`)

---

## 1. Executive Summary

This document evaluates the Hugging Face Inference Providers API for seamless 2D game tile generation in Tiler under Phase 2C.3.

The adapter was successfully integrated behind Tiler's provider abstraction (`ImageGenerationProvider`) using the official `@huggingface/inference` SDK. Unit test suites pass completely (13/13 test cases).

However, execution of the real 6-material benchmark against Hugging Face Inference Providers consistently failed across all requests with:
> **HTTP 400:** `"Model not supported by provider fal-ai"`

Because 0 out of 6 generations succeeded, no visual tileability scores or quality metrics could be evaluated. **Hugging Face is NOT selected as a current provider candidate for Tiler.**

---

## 2. Critical Classification & Free Allowance Notice

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

## 3. Official Documentation & Specifications

The integration was implemented adhering strictly to current official Hugging Face documentation:

1. **First API Call Guide:** [https://huggingface.co/docs/inference-providers/guides/first-api-call](https://huggingface.co/docs/inference-providers/guides/first-api-call)
2. **Huggingface.js Inference README:** [https://huggingface.co/docs/huggingface.js/en/inference/README](https://huggingface.co/docs/huggingface.js/en/inference/README)
3. **Hub API Documentation:** [https://huggingface.co/docs/inference-providers/hub-api](https://huggingface.co/docs/inference-providers/hub-api)
4. **Pricing & Billing:** [https://huggingface.co/docs/inference-providers/en/pricing](https://huggingface.co/docs/inference-providers/en/pricing)
5. **Text-to-Image Task:** [https://huggingface.co/docs/inference-providers/tasks/text-to-image](https://huggingface.co/docs/inference-providers/tasks/text-to-image)

---

## 4. Technical Integration Details

### Test Configuration & Authentication

- **Authentication Token:** Fine-grained Hugging Face User Access Token configured via `HF_TOKEN`.
- **Verified Permission Scope:** **"Make calls to Inference Providers"** (`inference.serverless.write`).
- **Authentication Verification:** Successful. Token authentication and scope validation succeeded; requests reached partner routing without HTTP 401 Unauthorized errors.

### Architecture & SDK Integration

- **Provider Abstraction:** Implements `ImageGenerationProvider` in `server/services/providers/huggingFaceProvider.ts` behind `id: "huggingface"`.
- **Target Model:** `black-forest-labs/FLUX.1-schnell`
- **Provider Routing:** `provider: "auto"` (default)
- **Official Client SDK:** Uses `@huggingface/inference` `InferenceClient` to invoke:
  ```ts
  const client = new InferenceClient(HF_TOKEN);
  const imageBlob = await client.textToImage({
    model: "black-forest-labs/FLUX.1-schnell",
    inputs: builtPrompt,
    provider: "auto",
    parameters: { width: 512, height: 512, seed: 42 }
  });
  ```
- **Resolution:** `512x512`
- **Canonical Benchmark Prompts:** Prompts, seeds (`seed: 42`), and seam analysis thresholds were preserved unchanged according to benchmark methodology.
- **Metadata Captured:**
  - `model`: `black-forest-labs/FLUX.1-schnell`
  - `providerRouting`: `auto`
  - `routingMode`: `auto`
  - `pricingClassification`: `FREE WITH LIMITED MONTHLY CREDITS`
- **Response Normalization:** Converts SDK `Blob` output or data URLs to base64 Data URLs (`data:image/png;base64,...`).

---

## 5. Error Handling & Secret Redaction

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

## 6. Real Benchmark Execution Results

### Execution Command

```bash
npm run benchmark:huggingface
```

### Benchmark Summary & Error Findings

The real 6-material benchmark (cobblestone, grass, sand, water, wood, lava) was executed using a valid fine-grained token with `provider="auto"` against `black-forest-labs/FLUX.1-schnell`.

- **Total Materials Attempted:** 6
- **Successful Generations:** 0
- **Failed Generations:** 6
- **Real Benchmark Error:**
  `HTTP 400: "Model not supported by provider fal-ai"`
- **Quality Score:** **NONE** (no images were produced)

### Interpretation Notice

> **IMPORTANT:** This result must **NOT** be interpreted as a model-quality failure for FLUX.1-schnell.
>
> Because 0 images were generated due to an upstream provider routing error (`fal-ai` rejecting the model request via HF Inference Providers API), no image output was produced to evaluate for tileability, seams, or visual fidelity.

---

## 7. Final Recommendation & Conclusion

1. **Provider Selection:** **Hugging Face is NOT selected** for Tiler's active generation route.
2. **Current Feasibility:** While the adapter code and test suite are technically complete and verified, real-world usage is currently blocked by Hugging Face's server-side provider routing for FLUX.1-schnell.
3. **Verification:**
   ```bash
   npm run test:huggingface  # Passes 13/13 unit tests offline
   npm test                 # Passes 123/123 project unit tests
   npm run lint             # Clean TypeScript check
   npm run build            # Builds Vite & Esbuild bundles successfully
   ```
