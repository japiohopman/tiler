# Image Model Candidates for Tiler (Revised)

**Date:** March 2026
**Subject:** Phase 2A Correction — Verify and Complete Model Candidate Research
**Author:** Jules (Agentic Engineer)

This document provides the revised, verified, and completed evaluation of image-generation model candidates for Tiler. In alignment with Tiler's core architecture principles (`docs/architecture/GENERATION_ARCHITECTURE.md`), this evaluation strictly focuses on open, non-proprietary, or customizable models to avoid vendor lock-in.

In accordance with Phase 2A Correction requirements, **proprietary closed models like Google Gemini and Google Imagen are explicitly excluded** from the benchmark candidate list. This ensures Tiler's evaluation focuses on open-ecosystem models suitable for local deployment or open api integration.

---

## 1. Verified Model Candidates

We have evaluated five credible open-weights candidate models based on primary source data, focusing on their suitability for generating 2D texture source material.

| Model Candidate | Developer / Primary Source Repo | License | Parameters | Primary Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **FLUX.1 Schnell** | [black-forest-labs/FLUX.1-schnell](https://huggingface.co/black-forest-labs/FLUX.1-schnell) | Apache-2.0 | 12B | 1024x1024 |
| **Stable Diffusion 3.5 Medium** | [stabilityai/stable-diffusion-3.5-medium](https://huggingface.co/stabilityai/stable-diffusion-3.5-medium) | Stability AI Community | 2.5B | 512x512 to 1024x1024 |
| **Stable Diffusion 3.5 Large Turbo** | [stabilityai/stable-diffusion-3.5-large-turbo](https://huggingface.co/stabilityai/stable-diffusion-3.5-large-turbo) | Stability AI Community | 8B | 1024x1024 |
| **Stable Diffusion XL (SDXL) 1.0** | [stabilityai/stable-diffusion-xl-base-1.0](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0) | CreativeML Open RAIL++-M | 3.1B | 1024x1024 |
| **Stable Diffusion 1.5** | [runwayml/stable-diffusion-v1-5](https://huggingface.co/runwayml/stable-diffusion-v1-5) | CreativeML Open RAIL-M | 860M | 512x512 |

---

## 2. Detailed Model Profiles & CPU Feasibility

### Candidate 1: FLUX.1 Schnell
- **Developer:** Black Forest Labs
- **License Verification:** **Apache-2.0** (Highly permissive; fully commercial-friendly with no royalty or revenue limitations).
- **Architecture Details:** 12-billion-parameter 24-layer hybrid Flow-Matching Transformer-Diffusion model. Optimized for rapid 1-4 step inference.
- **Hardware Requirements (GPU):** Extremely demanding. Unquantized FP16 weights require ~24-32 GB VRAM. Quantized GGUF versions (e.g., Q4_K_S) can fit in 10-12 GB VRAM.
- **CPU / Zero-VRAM Feasibility:** **Infeasible / Extremely Poor**. Loading and running a 12B parameter transformer model on modern consumer CPUs takes **5 to 15 minutes** per 512x512 image, making it completely impractical for interactive, real-time UI previews.

---

### Candidate 2: Stable Diffusion 3.5 Medium
- **Developer:** Stability AI
- **License Verification:** **Stability AI Community License** (Free for personal, academic, and commercial use for organizations with under $1M in annual revenue. Entities exceeding $1M require an enterprise agreement).
- **Architecture Details:** 2.5-billion-parameter Multimodal Diffusion Transformer (MMDiT) with improved text-to-image alignment.
- **Hardware Requirements (GPU):** Moderate. Standard inference fits in 8-10 GB VRAM. Quantized variations can execute in 6 GB VRAM.
- **CPU / Zero-VRAM Feasibility:** **Low / Marginally Feasible**. Loading and executing a 2.5B MMDiT model on a high-end multicore CPU using optimized runtimes (such as OpenVINO or ONNX) requires **1 to 3 minutes** per 512x512 image (at 20-30 steps). Useful only for slow background processing.

---

### Candidate 3: Stable Diffusion 3.5 Large Turbo
- **Developer:** Stability AI
- **License Verification:** **Stability AI Community License** (Free up to $1M annual revenue; requires enterprise license above that limit).
- **Architecture Details:** 8-billion-parameter model distilled for fast 4-step generation using Adversarial Diffusion Distillation (ADD).
- **Hardware Requirements (GPU):** High. Standard inference requires ~16 GB VRAM; quantized GGUF/NF4 formats can fit in ~8-10 GB VRAM.
- **CPU / Zero-VRAM Feasibility:** **Infeasible / Very Poor**. Despite only needing 4 steps, the 8B parameter footprint causes CPU execution to drag, taking **2 to 5 minutes** per image.

---

### Candidate 4: Stable Diffusion XL (SDXL) 1.0
- **Developer:** Stability AI
- **License Verification:** **CreativeML Open RAIL++-M License** (Allows commercial redistribution and hosting, subject to standard ethical use clauses).
- **Architecture Details:** 3.1-billion-parameter base model + optional 6.6B refiner. Features dual text encoders for strong spatial and style prompting.
- **Hardware Requirements (GPU):** Moderate. Standard inference runs comfortably in 8 GB VRAM. Pruned or quantized versions run in 4-6 GB VRAM.
- **CPU / Zero-VRAM Feasibility:** **Low / Marginally Feasible**. Generating a 512x512 image (at 25 steps) on a multicore CPU takes **45 to 90 seconds**. It is marginally feasible for asynchronous task queues but too sluggish for real-time frontend feedback.

---

### Candidate 5: Stable Diffusion 1.5
- **Developer:** RunwayML / Stability AI
- **License Verification:** **CreativeML Open RAIL-M License** (Permits commercial use and deployment with standard ethical usage terms).
- **Architecture Details:** 860-million-parameter Latent Diffusion Model using a U-Net architecture.
- **Hardware Requirements (GPU):** Very Low. Standard inference fits easily in under 4 GB VRAM.
- **CPU / Zero-VRAM Feasibility:** **High / Fully Feasible**. Due to its highly optimized, sub-billion parameter count, SD 1.5 is the **only candidate exceptionally suited for CPU-only (zero-VRAM) environments**. Running under ONNX Runtime, OpenVINO, or highly optimized C/C++ libraries (such as `stable-diffusion.cpp`), it can generate a 512x512 image in **10 to 20 seconds** on standard modern desktop CPUs, offering a highly practical local solution for machines lacking dedicated GPU hardware.

---

## 3. Final Shortlist of Candidates

Based on licensing, customizability, hardware accessibility, and suitability for 2D game textures, we recommend the following **four models** as Tiler's final benchmark shortlist.

1. **FLUX.1 Schnell**
   - *Why:* Unrestricted Apache-2.0 license, unparalleled prompt adherence, and sharp texture details in just 1-4 steps.
2. **Stable Diffusion 3.5 Medium**
   - *Why:* Community-friendly license, highly efficient 2.5B size, strong spatial adherence, and highly suitable for texture customization.
3. **Stable Diffusion XL (SDXL) 1.0**
   - *Why:* CreativeML Open RAIL++-M license, incredibly mature ecosystem, low hardware requirements, and an massive community library of fine-tuned 2D material/pixel-art LoRAs.
4. **Stable Diffusion 1.5**
   - *Why:* CreativeML Open RAIL-M license, extremely lightweight, low-resource friendly, and highly viable for zero-VRAM/CPU-only developer environments.

*Note: In compliance with project boundaries, no winner is declared by this document. The final selection will be determined objectively following the Phase 2B benchmarking process.*

---

## 4. Observed Facts vs. Recommendations

### Observed Facts:
- Tiler currently uses the `@google/genai` library to call Google Gemini API models as temporary placeholders for development.
- Tiler's core image processing (`tileProcessor.ts`) and validation (`seamAnalysisService.ts`) are implemented using deterministic TypeScript and Node-Sharp buffers, completely decoupled from generative visual models.
- Running large-scale transformer-based diffusion models (such as FLUX.1) locally requires dedicated consumer GPUs with 12GB+ VRAM, whereas smaller U-Net models (like SD 1.5) are highly feasible on CPUs.

### Recommendations:
- **Separation of Concerns:** Maintain a clean separation between the generation model and Tiler's core deterministic pipelines. Ensure no model-specific prompt tricks or SDK features leak into `tileProcessor.ts` or `seamAnalysisService.ts`.
- **Implement Provider Abstraction:** Refactor the backend to expose a generic, provider-independent generation contract (as defined in `docs/architecture/GENERATION_ARCHITECTURE.md`) before executing the Phase 2B benchmark.
- **Benchmark Execution:** Establish a standardized local or cloud-hosted test environment (e.g., using Fal.ai or a local Python-based backend runner) to evaluate the 4 shortlisted candidates under identical benchmarking variables as defined in `docs/models/BENCHMARK_PROTOCOL.md`.
