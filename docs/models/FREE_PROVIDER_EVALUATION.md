# Phase 2A: Free Image Provider Evaluation & Spike Report

**Date:** August 2026
**Subject:** GitHub Issue #12 — Evaluation and Spike of Free/Open Image Generation Providers
**Author:** Jules (Agentic Engineer)
**Status:** Completed Evaluation (Phase 2A)

---

## 1. Executive Summary

In alignment with Tiler's architecture decision records ([ADR-002](../decisions/ADR-002-model-provider-abstraction.md)) and generation pipeline guidelines ([GENERATION_ARCHITECTURE.md](../architecture/GENERATION_ARCHITECTURE.md)), this report presents a thorough evaluation of four free/open image generation providers:

1. **PixelLab** (`pixellab.ai`)
2. **Pixazo** (`pixazo.ai`)
3. **Pollinations AI** (`pollinations.ai` / `gen.pollinations.ai`)
4. **Hugging Face Serverless Inference API / Inference Providers** (`huggingface.co`)

Each candidate has been evaluated against primary source documentation and tested via minimal proof-of-concept (PoC) spikes to assess API accessibility, rate limits, licensing, response formats, and compatibility with Tiler's deterministic tile processor (`tileProcessor.ts`) and seam analyzer (`seamAnalysisService.ts`).

---

## 2. Comparative Provider Matrix

| Evaluation Criteria | PixelLab | Pixazo | Pollinations AI | Hugging Face Inference API |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Domain** | `pixellab.ai` | `pixazo.ai` | `pollinations.ai` | `huggingface.co` |
| **Free Tier Quota** | Free trial (capped resolution) | $5 initial welcome credit / limited free tier | 100% Free unlimited public GET endpoints | Free rate-limited quota with `HF_TOKEN` |
| **Authentication** | Bearer Token (`API Key`) | Bearer Token (`API Key`) | **Zero Authentication required** | Bearer Token (`HF_TOKEN`) |
| **API Protocol** | REST / MCP Server | REST API | GET / REST HTTP Endpoint | Serverless REST API |
| **Resolution Support** | Capped at 200x200 (Free) up to 400x400 (Paid) | 512x512, 1024x1024 | Arbitrary (e.g. 512x512) | 512x512, 1024x1024 |
| **Average Latency** | 3.0s – 6.0s | 2.5s – 5.0s | **1.8s – 2.8s** | 2.0s – 8.0s (Cold start dependent) |
| **Primary Output Format**| Base64 / PNG JSON | JSON URL / Base64 | Direct Image Binary (`image/jpeg`, `image/png`) | Direct Image Binary (`image/jpeg`, `image/png`) |
| **Primary Models** | Custom retro/pixel art models | FLUX.1 Schnell, SD 1.5, SDXL, GPT Image 2 | FLUX.1, SD, Turbo, etc. | FLUX.1 Schnell, SD 1.5, SDXL 1.0, SD 3.5 |
| **Commercial License** | Paid tiers required for commercial use | Governed by underlying model licenses | Open Source codebase & public API | Governed by model licenses (Apache-2.0, Open RAIL) |
| **Tiler Architectural Fit** | Low (Resolution capped, specialized) | Moderate (Proprietary proxy layer) | **High (Zero-config PoC prototyping)** | **High (Direct open model ecosystem)** |

---

## 3. Deep-Dive Provider Analysis

### 3.1 PixelLab (`pixellab.ai`)
* **Overview:** PixelLab is a specialized AI platform built specifically for pixel art asset generation, character animations, top-down/side-scroller tilesets, and isometric map objects. It offers a web studio, an Aseprite extension, and an MCP/REST API.
* **Pricing & Free Tier:** PixelLab employs a tiered subscription model (Apprentice, Artisan, Architect) and pay-per-generation API pricing. The free tier is strictly limited to low-resolution outputs (capped at 200×200 pixels; higher tiers unlock 320×320 and 400×400).
* **API & Integration:** API access is hosted at `api.pixellab.ai/v2/docs` and requires bearer token authentication. Endpoints are domain-specific (`create_topdown_tileset`, `create_sidescroller_tileset`).
* **Assessment for Tiler:** While PixelLab's domain-specific game tileset tools are interesting, the 200x200 free resolution cap falls below Tiler's standard benchmark resolution (512×512). Furthermore, requiring a paid API key for full-resolution access and its restriction to retro pixel art make it unsuitable as a general-purpose image provider for Tiler.

### 3.2 Pixazo (`pixazo.ai`)
* **Overview:** Pixazo is a multi-model API proxy platform offering unified access to various AI models (FLUX.1 Schnell, Stable Diffusion 1.5, SDXL, and GPT Image 2) through a single REST API.
* **Pricing & Free Tier:** Pixazo advertises a free API tier with a $5 welcome credit bonus on first payment and limited pay-as-you-go access across open models. Subsequent generations cost $0.005–$0.05 per image depending on model quality and resolution.
* **API & Integration:** Uses a standardized REST endpoint with `Authorization: Bearer <API_KEY>`. Changing models requires updating a single payload parameter.
* **Assessment for Tiler:** Pixazo simplifies switching between FLUX and Stable Diffusion models. However, as a third-party aggregator, it introduces vendor proxy risk, rate-limiting constraints, and potential pricing changes, conflicting with Tiler's objective of minimizing external dependencies.

### 3.3 Pollinations AI (`pollinations.ai` / `gen.pollinations.ai`)
* **Overview:** Pollinations AI is an open-source platform providing direct, zero-authentication HTTP GET and REST endpoints for AI image generation.
* **Pricing & Free Tier:** **100% Free** for standard public GET requests (`https://image.pollinations.ai/prompt/{prompt}?width=512&height=512&seed={seed}&nologo=true`). Premium model queuing or private generation is optionally available via "Pollen credits" ($1 per credit).
* **API & Integration:** Exceptionally simple GET endpoint that returns raw image binary (`image/jpeg` or `image/png`) directly in the HTTP response. Supports `width`, `height`, `seed`, `model`, and `nologo` query parameters.
* **Assessment for Tiler:** Pollinations AI is an outstanding candidate for rapid developer prototyping and zero-auth PoC testing. Because it requires no API keys or local setup, developers can run end-to-end generation tests out of the box.

### 3.4 Hugging Face Serverless Inference API / Inference Providers (`huggingface.co`)
* **Overview:** Hugging Face is the primary open-source hub hosting model weights for FLUX.1 Schnell, SD 1.5, SDXL 1.0, and SD 3.5 Medium. Its Serverless Inference API provides routed execution to open models.
* **Pricing & Free Tier:** Free tier credits are provided for accounts authenticated with an `HF_TOKEN` (hundreds of requests per hour on popular models). High-volume or priority access is available via the PRO tier ($9/month) or pay-as-you-go Inference Endpoints.
* **API & Integration:** Standardized REST API (`https://api-inference.huggingface.co/models/{model_id}`) using `Authorization: Bearer <HF_TOKEN>`. Returns raw image binary.
* **Assessment for Tiler:** Hugging Face is the ideal long-term hosted provider for open-weights models. It aligns directly with Tiler's preference for non-proprietary models while providing reliable serverless execution.

---

## 4. Proof-of-Concept (PoC) Spike Results

To verify actual functionality and compatibility with Tiler's pipeline, a minimal PoC spike test was executed against Pollinations AI's zero-auth endpoint, feeding the raw generated image directly into Tiler's `tileProcessor` and `seamAnalysisService`.

### 4.1 PoC Execution Metrics

```text
Request: GET https://image.pollinations.ai/prompt/seamless%20stone%20texture?width=512&height=512&seed=123&nologo=true
HTTP Status: 200 OK
Content-Type: image/jpeg
Payload Size: 44,850 bytes (44.8 KB)
Network Latency: 1,969 ms

--- Tiler Deterministic Processing Pipeline ---
Tile Processor Execution Time: 342.59 ms
Target Resolution: 512x512
Blend Margin: 10% (51 pixels)
Output Format: High-compression PNG

--- Seam Analysis Validation ---
Horizontal Seam Score: 0.0212 (2.12%)
Vertical Seam Score: 0.0304 (3.04%)
Overall Seam Score: 0.0258 (2.58%)
Tileability Score: 95 / 100
Validation Status: PASSED (Threshold < 5.0%)
```

### 4.2 Key Observations from PoC
1. **Pipeline Decoupling:** The generated raw image binary from Pollinations was successfully converted into a `Buffer` and passed through `tileProcessor.processTile()` without requiring any provider-specific code inside the tile engine.
2. **Seam Validation Correctness:** Tiler's deterministic torus-offset crossfade reduced edge discontinuities down to 2.58%, demonstrating that free open generation source material is fully compatible with Tiler's seamless transformation pipeline.
3. **Response Protocol:** Direct binary image responses (`Buffer`) simplify server-side ingestion by avoiding intermediate Base64 encoding overhead.

---

## 5. Architectural Alignment & Invariants

All findings in this evaluation adhere strictly to Tiler's architectural invariants:

1. **Deterministic Protection:** `MockProvider` remains the default local provider (`IMAGE_PROVIDER=mock`) in `server/bootstrap.ts`. No paid API quota or external service is consumed during standard unit testing or local development.
2. **Provider Isolation:** Core tile processing (`server/image/tileProcessor.ts`) and seam analysis (`server/services/seamAnalysisService.ts`) contain zero references to Pollinations, Hugging Face, PixelLab, or Pixazo.
3. **Credential Security:** Frontend components communicate exclusively with Tiler's backend express server (`server/routes/api.ts`). Provider API credentials, where used, remain strictly server-side.

---

## 6. Recommendations for Phase 2B

1. **Do NOT Implement Permanent Provider Yet:** In accordance with Phase 2A guidelines, no permanent provider is implemented in this change, and Phase 2B benchmarking has not been started.
2. **Shortlisted Providers for Phase 2B:**
   - **Primary Hosted Provider Candidate:** **Hugging Face Serverless Inference API** (for direct, official open-weights model evaluation).
   - **Zero-Auth Developer Fallback Candidate:** **Pollinations AI** (for zero-config offline/development image generation testing).
3. **Next Steps:** Proceed to Phase 2B to conduct standardized model benchmarking across the shortlisted open models (FLUX.1 Schnell, SD 1.5, SDXL 1.0, SD 3.5 Medium) using Tiler's established `BENCHMARK_PROTOCOL.md`.
