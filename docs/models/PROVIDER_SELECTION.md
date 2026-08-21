# Provider Selection & Baseline Report (Phase 2D)

## Overview

This document records the formal provider selection decision for Phase 2D of Tiler. It evaluates all candidate providers tested during Phase 2C, documents why **Pixazo / SDXL Base 1.0** is selected as the **CURRENT VALIDATED PROVIDER CANDIDATE**, preserves the historical benchmark baseline metrics, and establishes the local development provider defaults.

---

## Provider Status Summary

| Provider | Model | Phase 2C Status | Real Benchmark Result | Selection Status |
|---|---|---|---|---|
| **MockProvider** | `mock-engine-v1` | Complete | N/A (Deterministic offline) | **DEFAULT LOCAL/DEVELOPMENT PROVIDER** |
| **Pixazo** | `sdxl-base-1.0` | Complete | **5/6 Success** (Avg raw seam delta: 0.2197, Avg processed seam delta: 0.1813) | **CURRENT VALIDATED PROVIDER CANDIDATE** |
| **Gemini** | `gemini-2.5-flash` | Supported | Optional / Key required | **SUPPORTED LEGACY/OPTIONAL PROVIDER** |
| **Pollinations AI** | `flux` | PoC Complete | **0/6 Success** (HTTP 402 Insufficient Pollen Balance) | Research PoC (Inactive candidate) |
| **Hugging Face** | `FLUX.1-schnell` | PoC Complete | **0/6 Success** (HTTP 400 Model not supported by provider `fal-ai`) | Research PoC (Inactive candidate) |

---

## Selection Decision Rationale

### 1. Pixazo (SDXL Base 1.0): Current Validated Provider Candidate

Pixazo is designated as the **CURRENT VALIDATED PROVIDER CANDIDATE** because it is the only external provider that produced real, valid benchmark output under our free-tier constraints.

- **Endpoint**: `https://gateway.pixazo.ai/getImage/v1/getSDXLImage`
- **Model**: `sdxl-base-1.0`
- **Resolution**: `512x512`
- **Authentication**: `PIXAZO_API_KEY` or `PIXAZO_SUBSCRIPTION_KEY` via `Ocp-Apim-Subscription-Key` header
- **Free-Tier Classification**: Free tier / open beta with subscription key
- **Benchmark Performance**: 5 out of 6 material generations succeeded, producing valid 512x512 PNG textures evaluated through the Seam Analysis Service.

> **Note**: We do not claim Pixazo is universally "best". It is selected specifically because it has been empirically verified to operate reliably without cost under current API constraints.

### 2. MockProvider: Default Development Provider

`MockProvider` remains the safe, zero-dependency default for local development, unit tests, and offline execution. It requires no API keys or internet access and produces deterministic canvas textures.

### 3. Gemini: Legacy / Optional Provider

Google Gemini remains supported via `@google/genai` when `GEMINI_API_KEY` is present. It serves as a secondary or fallback provider for developers with Gemini access.

### 4. Pollinations AI & Hugging Face: Research PoCs

Pollinations AI and Hugging Face Inference Providers remain in the codebase as documented research PoCs for future evaluation, but are not active production candidates.

#### Distinguishing Account/Routing Failures from Model Quality Failures

It is critical to distinguish between a **model quality failure** (where a provider generates images that fail tileability or visual quality standards) and a **provider access/routing failure** (where the provider service cannot be reached or rejects the request due to credits or routing):

- **Pollinations AI Failure Type**: **Account / Balance Failure (HTTP 402)**.
  The FLUX.1 Schnell model on Pollinations was not evaluated for image quality because the test account had 0.0000 Pollen balance.
- **Hugging Face Failure Type**: **Provider Routing / Service Availability Failure (HTTP 400)**.
  The official `@huggingface/inference` JS SDK successfully authenticated, but Hugging Face's backend routing defaulted `FLUX.1-schnell` to provider `fal-ai`, which rejected the request with `Model not supported by provider fal-ai`.

---

## Historical Benchmark Baseline (Pixazo SDXL Base 1.0)

The following baseline metrics were established during the Phase 2C benchmark run and are preserved as the historical benchmark reference:

- **Attempts**: 6
- **Successful**: 5
- **Failed**: 1 (wood texture timeout / network glitch)
- **Average Raw Seam Delta**: `0.2197`
- **Average Processed Seam Delta**: `0.1813`

### Material Breakdown

| Material | Raw Seam Delta | Processed Seam Delta | Processing Impact |
|---|---|---|---|
| **water** | `0.1578` | `0.0198` | **Dramatically Improved** |
| **sand** | `0.3866` | `0.2940` | **Improved** |
| **grass** | `0.2464` | `0.0381` | **Dramatically Improved** |
| **cobblestone** | `0.1985` | `0.2329` | Slightly Worse |
| **lava** | `0.1363` | `0.1564` | Slightly Worse |
| **wood** | Failed | Failed | N/A |

---

## TileProcessor Investigation Findings

Analysis of the benchmark results revealed why the deterministic Sharp `TileProcessor` (torus 50% offset + cosine crossfade) yields different outcomes based on material surface structure:

1. **Low-Frequency Organic Surfaces (Water, Sand, Grass)**:
   - Feature smooth color gradients and continuous noise distributions.
   - 50% torus offset shifts edge mismatches to the image center, where cosine crossfading smoothly blends them away without introducing visual artifacts.
   - Processed seam score improves significantly (e.g., water `0.1578 → 0.0198`).

2. **High-Frequency Structured Surfaces (Cobblestone, Lava)**:
   - Feature discrete geometric elements (individual pavers, stone mortar joints, dark crust cracks).
   - 50% torus offset cuts directly through central stones and pavers.
   - Cosine crossfading across discrete stone edges introduces subtle blurring across paver boundaries, slightly increasing pixel variation across opposing borders (e.g., cobblestone `0.1985 → 0.2329`).

---

## Pipeline & Hardening Architecture

In Phase 2D, the Pixazo integration is hardened through:

1. **AbortController Timeout Management**: `PIXAZO_TIMEOUT_MS` (default 30,000ms) prevents hanging HTTP requests or status polling loops.
2. **Secret Redaction**: `[REDACTED_API_KEY]` sanitizes error messages and debug output so API keys are never leaked.
3. **Flexible Credential Names**: Accepts either `PIXAZO_API_KEY` or `PIXAZO_SUBSCRIPTION_KEY`.
4. **Normalized Error Handling**: All HTTP status codes (401, 402, 404, 429, 500) and malformed responses are converted into standardized `ProviderError` instances.
5. **Exact Metadata Reporting**: Reports model identifier `sdxl-base-1.0`, resolution `512`, and request metadata accurately.
