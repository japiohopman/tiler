# Image Model Candidates for Tiler

**Date:** March 2026
**Subject:** Phase 2A — Image Model Candidates
**Author:** Jules (Agentic Engineer)

This document evaluates and shortlists image-generation models for integration into Tiler. Tiler uses generative models to produce raw 1:1 2D texture candidates, which are subsequently processed locally to guarantee perfect tileability.

---

## 1. Shortlist of Candidate Models

We have shortlisted four leading models for Tiler's evaluation. These represent a mix of managed server-side API models and flexible open-weights models that can be run either locally or via cloud endpoint providers.

| Model Candidate | Developer / Provider | Deployment Model | Primary Licensing |
| :--- | :--- | :--- | :--- |
| **Gemini 2.5 Flash** | Google | Managed API (AI Studio) | Google AI Studio Terms (Commercial Allowed) |
| **Imagen 3** | Google | Managed API (Vertex AI / AI Studio) | Google Cloud Terms (Commercial Allowed) |
| **Stable Diffusion 3.5 Medium** | Stability AI | Local / Managed API (Hugging Face / Fal.ai) | Stability AI Community License (Free up to $1M/yr) |
| **FLUX.1 Schnell** | Black Forest Labs | Local / Managed API (Replicate / Fal.ai) | Apache 2.0 (Fully Open-Source / Commercial) |

---

## 2. Detailed Model Profiles

### Candidate 1: Gemini 2.5 Flash
Gemini 2.5 Flash is Google's newest lightweight, high-performance multimodal model. In Tiler's context, it serves as an efficient single-gateway model that generates images via integrated Google image-generation capabilities.

- **Provider:** Google AI Studio / Google Vertex AI
- **License:** Commercial use allowed (governed by Google AI Studio terms).
- **Pricing Model:** Extremely low cost, with a generous free tier for developers.
- **Strengths:**
  - Fast response times and low API latency.
  - Excellent prompt adherence and logical reasoning.
  - Simple, clean integration using the official `@google/genai` SDK already present in Tiler.
- **Limitations:**
  - Relies on internal image generation pipelines; less direct configuration over raw diffusion parameters than dedicated image models.
- **Integration Viability:** High. Can be implemented easily with no extra package dependencies.

---

### Candidate 2: Imagen 3
Imagen 3 is Google's flagship high-quality text-to-image model, specializing in generating realistic details, complex textures, and high-fidelity structures.

- **Provider:** Google Cloud Vertex AI / Google AI Studio
- **License:** Commercial use allowed under Google Cloud/AI Studio Enterprise agreements.
- **Pricing Model:** Pay-per-image pricing via API.
- **Strengths:**
  - State-of-the-art detail generation, making it exceptionally good for photorealistic materials (e.g., cobblestone, wood grain, detailed sand).
  - Native 1:1 square output sizes and smart aspect-ratio optimization.
  - High compliance with specific textures, styles, and quality modifiers.
- **Limitations:**
  - Managed API only; cannot be run locally.
  - Strict default safety filters can sometimes flag game-related fantasy visual elements (e.g., "lava flows", "acid spills").
- **Integration Viability:** High. Fully compatible with Google GenAI SDK.

---

### Candidate 3: Stable Diffusion 3.5 Medium
Stable Diffusion 3.5 Medium is a highly customizable 2.5-billion-parameter open-weights text-to-image model, optimized to run efficiently on consumer hardware while delivering professional-grade texture quality.

- **Provider:** Stability AI (Runnable locally via PyTorch/Diffusers or hosted via Hugging Face/Fal.ai)
- **License:** Stability AI Community License. Free for research, non-commercial, and commercial use for organizations with up to $1,000,000 in annual revenue.
- **Pricing Model:** Free for local hosting; pay-per-second or pay-per-image via third-party hosted APIs.
- **Strengths:**
  - Highly customizable. Supports fine-tuning (LoRAs), allowing developers to train it on specific game styles (e.g., 16-bit retro, hand-painted hand-drawn, cell-shaded).
  - Open weights allow 100% offline generation with zero API dependency.
  - Highly robust community and tooling support.
- **Limitations:**
  - Running locally requires consumer-grade GPUs with at least 8–12 GB VRAM.
  - Requires writing a Python-based server side wrapper or integrating third-party APIs.
- **Integration Viability:** Medium-High. Offers superb customizability for indie game developers.

---

### Candidate 4: FLUX.1 Schnell
FLUX.1 Schnell is a state-of-the-art, open-weights text-to-image model developed by Black Forest Labs (the creators of Stable Diffusion). It is optimized for extremely fast, high-quality generation in just 1 to 4 steps.

- **Provider:** Black Forest Labs (Runnable locally or hosted via Replicate/Fal.ai/Hugging Face)
- **License:** **Apache 2.0**. Fully open-source and unrestricted for commercial and personal use.
- **Pricing Model:** Free for local hosting; pay-per-image on hosted API endpoints.
- **Strengths:**
  - Exceptional prompt adherence, outperforming many proprietary closed models.
  - Incredible sharpness and structural correctness, which is perfect for complex textures (e.g., repeating bricks, overlapping shingles).
  - Apache 2.0 license has zero revenue limits or royalty requirements.
  - Extremely fast generation times.
- **Limitations:**
  - Local inference requires significant VRAM (12GB+ for quantized weights).
  - Model sizes are large, making local deployment heavy.
- **Integration Viability:** High. Its unrestricted commercial license and fast inference make it an ideal open-weights candidate.

---

## 3. Recommended Benchmark Methodology

For Phase 2B, we recommend a standardized benchmarking protocol to evaluate these four candidates. The goal is to measure how well each model generates candidate textures that can be successfully converted into tileable game assets.

### Benchmark Criteria:
1. **Visual Texture Fidelity (Subjective):** Aesthetic appeal across 6 core game materials: `cobblestone`, `wood`, `water`, `grass`, `lava`, and `sand` in 3 distinct styles: `stylized`, `realistic`, and `hand-drawn`.
2. **Mathematical Tileability Score (Objective):** Measure the raw image's seam mismatch *before* processing, and the final seam score *after* processing with Tiler's local `TileProcessor`.
3. **Inference Latency (Objective):** Track the average duration (in milliseconds) from request dispatch to image delivery.
4. **Prompt Adherence (Objective):** Score whether the model correctly respects all prompt constraints (no perspective shifts, no 3D depth, flat orthographic 2D top-down view).

---

## 4. Observed Facts vs. Recommendations

### Observed Facts:
- Tiler's backend is currently built using Node/Express and the Google GenAI SDK, which natively supports Gemini models out of the box.
- The default model in `geminiService.ts` is `gemini-3.1-flash-image`, with fallbacks to `gemini-3.1-flash-lite-image` and `imagen-3.0-generate-002`.
- `seamAnalysisService.ts` provides a deterministic, local mathematical engine to measure tileability, ensuring benchmarking scores can be validated locally.

### Recommendations:
- **Primary API Candidate:** Transition the default model to **Gemini 2.5 Flash** due to its updated architecture, enhanced prompt understanding, and rapid speed.
- **Primary Open-Weights Candidate:** Introduce **FLUX.1 Schnell** as a local or hosted API alternative for developers demanding full commercial freedom under Apache 2.0, with **Stable Diffusion 3.5 Medium** as a fallback for style fine-tuning (LoRAs).
- Implement a pluggable **ModelProvider Interface** in Phase 1 to cleanly separate Express routes from specific model SDKs, ensuring smooth implementation of Phase 2B's benchmark framework.
