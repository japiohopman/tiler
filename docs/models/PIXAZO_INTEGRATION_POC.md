# Pixazo AI Provider Integration (Phase 2C.1 SDXL PoC — Issue #15)

## Executive Summary

This document details the controlled Proof of Concept (PoC) integration of **Pixazo AI** as Tiler's first external `ImageGenerationProvider` targeting Pixazo's **FREE SDXL** model.

The objective of Phase 2C.1 (Issue #15) is to evaluate whether Pixazo's free SDXL endpoint can reliably generate 512×512 2D game textures through Tiler's provider abstraction and benchmark pipeline.

> **Status Notice:** This integration is a controlled Proof of Concept and does **NOT** represent a final provider selection or winner declaration.

---

## Provider Architecture

Pixazo integration is implemented in `server/services/providers/pixazoProvider.ts` via the standard `ImageGenerationProvider` contract:

```typescript
export class PixazoImageGenerationProvider implements ImageGenerationProvider {
  public readonly id = 'pixazo';
  public readonly name = 'Pixazo AI Provider (SDXL PoC)';
  public isConfigured(): boolean;
  public generate(request: GenerationRequest): Promise<GeneratedImage>;
}
```

The concrete provider is registered in `server/bootstrap.ts`. Application startup and offline testing default to `MockImageGenerationProvider` to protect external quotas unless `IMAGE_PROVIDER=pixazo` is explicitly set.

---

## Official API Specifications & References

The implementation was built against current official Pixazo API documentation:

- **Free Tier Documentation:** [https://www.pixazo.ai/api/free](https://www.pixazo.ai/api/free)
- **SDXL Model Documentation:** [https://www.pixazo.ai/models/stable-diffusion](https://www.pixazo.ai/models/stable-diffusion)

### Key Technical Specs

| Spec | Value |
| :--- | :--- |
| **API Gateway Endpoint** | `https://gateway.pixazo.ai/sdxl/v1/text-to-image` |
| **Status Polling Endpoint** | `https://gateway.pixazo.ai/v2/requests/status/{request_id}` |
| **Authentication Header** | `Ocp-Apim-Subscription-Key: <YOUR_API_KEY>` |
| **Supported Dimensions** | `512x512` (`width: 512`, `height: 512`, `size: "512x512"`) |
| **Output Format** | PNG (`format: "png"`) |
| **Default Model** | `sdxl` (configurable via `PIXAZO_MODEL`) |

---

## Free-Tier & Open Beta Verification Findings

1. **Authentication Requirement:**
   - An API key (`PIXAZO_API_KEY` or `PIXAZO_SUBSCRIPTION_KEY`) is **strictly required**.
   - Unauthenticated API calls return HTTP 401 (`Unauthorized`).

2. **Free Tier Access:**
   - Free registration at [pixazo.ai](https://www.pixazo.ai/) activates free tier API access without requiring a credit card upon registration.
   - Provides access to free models including SDXL (`sdxl`), SD 1.5, and Flux Schnell.

3. **Classification:**
   - **FREE WITH LIMITS / OPEN BETA** — API key required; rate limits (429) and account balance/quota limits (402) apply.

---

## Configuration & Environment Variables

| Variable | Required | Description |
| :--- | :---: | :--- |
| `PIXAZO_API_KEY` | Yes (for real API) | Pixazo subscription API key (`Ocp-Apim-Subscription-Key`) |
| `PIXAZO_SUBSCRIPTION_KEY` | Optional | Alias for `PIXAZO_API_KEY` |
| `PIXAZO_ENDPOINT` | Optional | Override gateway endpoint URL |
| `PIXAZO_MODEL` | Optional | Model identifier (defaults to `sdxl`) |

If credentials are absent, `pixazoProvider.isConfigured()` returns `false`, preventing unauthenticated network attempts.

---

## Benchmark Execution

To execute the canonical 6-material benchmark framework against Pixazo:

```bash
npm run benchmark:pixazo
```

### Environment Variable Loading
`server/services/benchmark/cli-pixazo.ts` calls `dotenv.config()` at startup, automatically loading environment credentials from `.env` or `.env.local`.

### Unconfigured Environment Behavior
When executed without `PIXAZO_API_KEY`, the script reports:
```text
[NOTICE] Real Pixazo benchmark could not be executed because PIXAZO_API_KEY (or PIXAZO_SUBSCRIPTION_KEY) is not configured in environment.
```
This ensures offline execution and automated test suites (`npm test`) run cleanly using mocks without requiring network access or secret credentials.
