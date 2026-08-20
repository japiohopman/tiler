# Pollinations AI Provider Integration & Benchmark PoC (Phase 2C.2)

**Issue / Feature:** GitHub Issue #17 — Phase 2C.2: Pollinations Provider PoC & Benchmark
**Author:** Jules (Agentic Software Engineer)
**Status:** Completed PoC Implementation & Benchmark Framework Integration

---

## 1. Overview & Objectives

Phase 2C.2 evaluates Pollinations AI as a second real open/serverless image generation provider for Tiler's game texture pipeline. This proof-of-concept (PoC) implements the `PollinationsImageGenerationProvider` behind Tiler's unified `ImageGenerationProvider` abstraction interface and integrates it into Tiler's provider-agnostic benchmark framework (`server/services/benchmark/`).

The purpose of this PoC is to evaluate Pollinations using **exactly the same benchmark methodology** previously used for Pixazo (SDXL Base 1.0) and Mock providers across the 6 canonical materials (cobblestone, grass, sand, water, wood, lava) at 512×512 resolution.

---

## 2. Official API Verification & Protocol Specs

In accordance with Phase 2C.2 requirements, the implementation was verified against the **CURRENT official Pollinations API documentation** and OpenAPI v0.3.0 schema as of August 2026.

### 2.1 Official Sources
* **Official API OpenAPI Documentation:** [https://gen.pollinations.ai/docs](https://gen.pollinations.ai/docs)
* **OpenAPI Schema Specification:** `https://gen.pollinations.ai/openapi.json` (OpenAPI v0.3.0)
* **API Key Management Portal:** [https://enter.pollinations.ai/keys](https://enter.pollinations.ai/keys)

### 2.2 Endpoint & Authentication Details
* **Default Host / Gateway:** `https://gen.pollinations.ai`
* **Primary Endpoint:** `GET https://gen.pollinations.ai/image/{prompt}`
* **Alternative Endpoint:** `POST https://gen.pollinations.ai/v1/images/generations` (OpenAI-compatible)
* **Authentication Method:** HTTP Bearer token via `Authorization: Bearer <POLLINATIONS_API_KEY>` header (or `?key=` query parameter).
* **Authentication Requirement:** The current official API (`gen.pollinations.ai`) requires a valid API key (`pk_` or `sk_`). Anonymous requests return HTTP `401 Unauthorized`.
* **Credential Safety:** Credentials are supplied exclusively via the `POLLINATIONS_API_KEY` environment variable. Never hard-coded, never exposed to client bundles, and strictly redacted from error messages and logs.

### 2.3 Primary Model Identifier
* **Model Identifier:** `flux`
* **Official Model Title:** FLUX.1 Schnell
* **Model Category:** Text-to-Image / Open Weights Diffusion
* **Description:** Fast, high-quality open-weights image generation model.

### 2.4 Parameters & Schema
* **URL Encoding:** The prompt string is URL-encoded directly into the GET path (`/image/{encodedPrompt}`).
* **Query Parameters:**
  * `model`: `flux` (Default model identifier)
  * `width`: `512` (Target pixel width)
  * `height`: `512` (Target pixel height)
  * `seed`: Integer seed (e.g., `42`) when provided in generation requests
  * `nologo`: `true` (Disables watermark/logo branding overlay)
* **Response Format:**
  * Direct binary stream (`content-type: image/jpeg` or `image/png`) or JSON (`application/json`) containing `data[0].b64_json` or `url`.
  * Normalized inside `PollinationsImageGenerationProvider` to a Base64 Data URL (`data:image/png;base64,...`).

---

## 3. Provider Architecture & Implementation

The provider is implemented in `server/services/providers/pollinationsProvider.ts` as `PollinationsImageGenerationProvider`.

### 3.1 Architectural Contract Adherence
* **Interface:** Implements `ImageGenerationProvider` (`id: 'pollinations'`).
* **Decoupling:** Fully isolated from core tile processing (`tileProcessor.ts`) and seam analysis (`seamAnalysisService.ts`).
* **Application Composition:** Registered in `server/bootstrap.ts` and selectable via `IMAGE_PROVIDER=pollinations`.
* **Quota Protection:** Unconfigured by default (`isConfigured()` returns `false` if `POLLINATIONS_API_KEY` is missing), preventing unexpected network calls or quota usage during local development.

### 3.2 Robust Error & Single-Stream Handling
* **Single-Read Response Policy:** HTTP responses are inspected once to extract error details, preventing double-read crashes (`TypeError: Already read`).
* **Status Code Mapping:**
  * `401 Unauthorized`: API key missing or invalid.
  * `402 Payment Required`: Insufficient Pollen balance or quota exhausted.
  * `403 Forbidden`: Access denied or model restricted.
  * `404 Not Found`: Resource or endpoint unavailable.
  * `429 Rate Limit Exceeded`: Request rate limit hit.
  * `500 Internal Server Error`: Pollinations backend failure.
* **Redaction Guarantee:** The provider explicitly strips `POLLINATIONS_API_KEY` from error logs/messages before throwing `ProviderError`.

---

## 4. Configuration

To configure Pollinations AI locally:

1. Obtain an API key from [https://enter.pollinations.ai/keys](https://enter.pollinations.ai/keys).
2. Set the key in `.env` or `.env.local`:

```bash
# Select Pollinations AI Provider
IMAGE_PROVIDER=pollinations

# Pollinations API Key
POLLINATIONS_API_KEY=your_api_key_here

# Optional Overrides
# POLLINATIONS_ENDPOINT=https://gen.pollinations.ai/image
# POLLINATIONS_MODEL=flux
```

---

## 5. Benchmark Framework Integration

The CLI runner for Pollinations is implemented in `server/services/benchmark/cli-pollinations.ts` and can be executed using:

```bash
npm run benchmark:pollinations
```

### 5.1 Comparison Integrity
The benchmark uses the **exact same benchmark engine** (`server/services/benchmark/runner.ts`) and parameters used for Pixazo:
* **Canonical Materials:** `cobblestone`, `grass`, `sand`, `water`, `wood`, `lava`
* **Prompts:** Versioned `v1.0` canonical prompts unchanged
* **Resolution:** 512×512
* **Base Seed:** `42`
* **Seam Thresholds & Scoring Weights:** Unchanged (Dual seam measurement: Raw Provider Tileability vs. Processed Pipeline Tileability)

### 5.2 Artifact Outputs
Upon execution, reports are saved to:
* `benchmark-results/pollinations-benchmark.json` (Machine-readable metrics)
* `benchmark-results/pollinations-benchmark.md` (Human-readable Markdown report)

---

## 6. Execution Status & Results Summary

### 6.1 Unit Test Verification
All 24 provider unit tests in `server/services/providers/pollinationsProvider.test.ts` pass with 100% code coverage across mocked HTTP endpoints, error status codes, request parameter URL construction, Bearer token headers, and single-stream response parsing.

```bash
npm run test:pollinations
# Result: 24/24 Tests Passed
```

### 6.2 Real Benchmark Execution Status
When `POLLINATIONS_API_KEY` is configured in the environment, `npm run benchmark:pollinations` executes live against Pollinations' `flux` (FLUX.1 Schnell) model. If `POLLINATIONS_API_KEY` is unset, the CLI outputs a clear notice and skips live execution without failing build processes.
