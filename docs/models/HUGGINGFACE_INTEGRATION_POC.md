# Hugging Face Inference API Integration — Research & Proof-of-Concept

**Date:** March 2026
**Subject:** Issue #12 — Hugging Face Provider Research & Proof-of-Concept
**Author:** Jules (Agentic Engineer)

---

## 1. Overview

This document presents the research findings and minimal Proof-of-Concept (PoC) architecture for integrating the **Hugging Face Inference API** into Tiler. In alignment with Tiler's provider abstraction (`docs/architecture/GENERATION_ARCHITECTURE.md`), this integration demonstrates how open-weights models hosted on Hugging Face Hub can serve as generation providers without modifying Tiler's core tile engine or seam analysis pipeline.

---

## 2. API Specifications & Integration Mechanics

### Endpoint Format
Hugging Face provides a Serverless Inference API endpoint for diffusion models:
`POST https://api-inference.huggingface.co/models/{model_id}`

Example target models evaluated:
- `black-forest-labs/FLUX.1-schnell`
- `stabilityai/stable-diffusion-3.5-medium`
- `runwayml/stable-diffusion-v1-5`

### Authentication
Authentication requires a User Access Token (read permission) configured in the environment:
- Environment variable: `HF_TOKEN` or `HUGGINGFACE_API_KEY`
- Header: `Authorization: Bearer <HF_TOKEN>`

### Request Payload Structure
```json
{
  "inputs": "top-down seamless cobblestone pavement texture, flat lighting, game asset",
  "parameters": {
    "width": 512,
    "height": 512,
    "num_inference_steps": 4,
    "guidance_scale": 3.5,
    "seed": 12345
  },
  "options": {
    "use_cache": true,
    "wait_for_model": true
  }
}
```

### Response Format Handling
Unlike JSON-based APIs, the Hugging Face Serverless Inference API returns the raw binary image stream (`image/png` or `image/jpeg`).
Tiler's provider converts this binary array buffer into a normalized base64 Data URL:
`data:image/png;base64,...`

---

## 3. Error Codes & Resilience Handling

| Status Code | Cause | Tiler Provider Handling |
| :--- | :--- | :--- |
| **503 Service Unavailable** | Model is cold-starting / loading into GPU memory. | Returns `estimated_time` in response JSON. Provider throws a retryable `ProviderError`. |
| **401 Unauthorized** | Missing or invalid `HF_TOKEN`. | Throws non-retryable `ProviderError` prompting credential check. |
| **429 Too Many Requests** | Serverless rate limits exceeded. | Throws `ProviderError` indicating quota limit. |
| **400 Bad Request** | Invalid parameter format or resolution bound. | Throws `ProviderError` with payload details. |

---

## 4. Proof-of-Concept Implementation (`HuggingFacePoCProvider`)

A minimal, experimental provider implementation was created at `server/services/providers/huggingFacePoCProvider.ts`.

### Key Characteristics:
- Implements `ImageGenerationProvider` interface.
- Isolates Hugging Face REST communication behind the unified `generate(request: GenerationRequest)` contract.
- Clearly marked as an **experimental Proof-of-Concept** (not the default provider).
- Requires `HF_TOKEN` or `HUGGINGFACE_API_KEY` for live remote inference, but provides a safe fallback when credentials are absent.
- Converts raw binary responses into normalized `GeneratedImage` objects.

---

## 5. Invariants & Scope Boundaries

1. **Zero Modifications to Core Engine:** Neither `tileProcessor.ts` nor `seamAnalysisService.ts` were altered.
2. **Provider Isolation:** `HuggingFacePoCProvider` is registered dynamically in `server/bootstrap.ts`. `GenerationService` remains 100% provider-agnostic.
3. **Default Protection:** `mockProvider` remains the default provider for offline local development, ensuring no remote API credits are consumed unexpectedly.
