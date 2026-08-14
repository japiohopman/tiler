# Repository Audit

**Date:** March 2026
**Subject:** Phase 0 — Repository Reconnaissance
**Author:** Jules (Agentic Engineer)

---

## 1. Current State

The repository contains a fully functional, self-contained **AI Tile Generator** project. It is structured as a monorepo containing a React/TypeScript frontend and an Express/TypeScript backend.

### Core Codebase Layout
- **Root Configurations:** Configurations for TypeScript (`tsconfig.json`), Vite (`vite.config.ts`), Tailwind CSS v4, Package definitions (`package.json`, `package-lock.json`), and Bun lockfile (`bun.lock`).
- **Server (`server/`):**
  - `index.ts`: The web server entry point hosting the static frontend assets and API endpoints. Uses Vite middlewares for development HMR.
  - `routes/api.ts`: Implements API routing for `/api/health`, `/api/generate`, `/api/generate-raw`, `/api/process`, `/api/analyze`, `/api/export`, and developer testing endpoints.
  - `services/geminiService.ts`: Communicates with Google's Gemini models via the new `@google/genai` SDK. Implements a multi-model fallback chain (`gemini-3.1-flash-image` -> `gemini-3.1-flash-lite-image` -> `imagen-3.0-generate-002`).
  - `services/promptBuilder.ts`: Builds descriptive structured prompts for game-ready materials.
  - `services/exportService.ts`: Formats and processes the tile buffer into downloadable packages.
  - `services/seamAnalysisService.ts` & `seamAnalysisService.test.ts`: Objective mathematical edge pixel analyzers assessing horizontal and vertical seam tileability.
  - `image/tileProcessor.ts` & `tileProcessor.test.ts`: Local image-processing engine performing deterministic 50% torus offsets and smooth cosine falloff edge cross-fading.
- **Client (`src/`):**
  - `App.tsx`: Main React state orchestration and layout.
  - `components/`: Modular UI sections (`Header.tsx`, `GeneratorPanel.tsx`, `TilePreview.tsx`, `SeamAnalysisPanel.tsx`, `ExportPanel.tsx`, `DeveloperTestPanel.tsx`, `CanvasPreview.tsx`).
  - `services/apiClient.ts`: Communicates with the Express API router.
  - `utils/`: Render and sample-textures helper modules (`canvasRenderer.ts`, `tileCanvasRenderer.ts`, `sampleTextures.ts`).

---

## 2. Technology Stack

The application relies on a modern, robust, and fast technical stack:

- **Runtime / Package Manager:** Node.js environment configured with npm (with support for Bun via `bun.lock`).
- **Backend Framework:** **Express 4.21.2** with TypeScript.
- **Server Tooling:** **esbuild** for high-speed production bundling and **tsx** for on-the-fly TypeScript execution in development.
- **Frontend Framework:** **React 19.0.1** and **React-DOM 19.0.1**.
- **Frontend Build Tool:** **Vite 6.2.3** with React fast refresh and a performance optimization that allows turning off HMR when needed.
- **Styling:** **Tailwind CSS 4.1.14** with the modern `@tailwindcss/vite` plugin.
- **Image Processing Library:** **Sharp 0.35.3**, enabling high-speed, compiled C++ backed image resizing, compositing, and raw pixel-level transformations.
- **AI Integration:** **@google/genai 2.4.0**, utilizing the official Google GenAI SDK.
- **Icons & Animation:** **Lucide React** icons and **Motion 12.23.24** (Framer Motion) for smooth animations.
- **Testing framework:** Custom deterministic mathematical and image-processing test runners executed through `tsx`.

---

## 3. Architecture Map

```
                     ┌────────────────────────┐
                     │   Browser (Client UI)  │
                     └───────────┬────────────┘
                                 │
                     ┌───────────▼────────────┐
                     │    Vite Dev Server     │
                     └───────────┬────────────┘
                                 │
           ┌─────────────────────┴─────────────────────┐
           │             Express Backend               │
           └─────────────────────┬─────────────────────┘
                                 │
                   ┌─────────────┴─────────────┐
                   │        API Router         │
                   └──────┬─────────────┬──────┘
                          │             │
        ┌─────────────────▼───┐     ┌───▼─────────────────┐
        │    Gemini Service   │     │   Tile Processor    │
        │ (External API call) │     │ (Local Sharp Offset)│
        └─────────────────────┘     └───────────┬─────────┘
                                                │
                                    ┌───────────▼─────────┐
                                    │    Seam Analyzer    │
                                    │ (Pixel Delta Score) │
                                    └─────────────────────┘
```

The system strictly divides duties across the boundaries outlined in `docs/development/AGENT_WORKFLOW.md`:
1. **Frontend Presentation:** Handled by client-side components; has no knowledge of API keys and performs no direct image manipulation.
2. **Generative Visuals:** Serviced by server-side `GeminiTextureService` converting options into highly optimized text descriptions and calling the Google GenAI SDK.
3. **Deterministic Tiling:** Handled by `TileProcessor` applying torus-offset shifting and raw buffer mathematics.
4. **Deterministic Validation:** Conducted by `SeamAnalysisService` calculating normalized delta offsets across Left/Right and Top/Bottom bounds, completely independent of generative AI heuristics.

---

## 4. Reusable Components

The following components are highly cohesive and designed with modular reuse in mind:

- **`TileProcessor` (`server/image/tileProcessor.ts`):** Extremely solid implementation of torus wrapping and pixel-level blend math. Can easily adapt to other resolution scales or blend margins.
- **`SeamAnalysisService` (`server/services/seamAnalysisService.ts`):** A robust mathematical validator. The RGB distance-based seam score calculations and diagnostic heatmap visualization (which produces Emerald Green/Amber/Crimson overlays on dimmed original textures) are highly reusable for any texture validation task.
- **`PromptBuilder` (`server/services/promptBuilder.ts`):** Encapsulates the engineering of structured prompts for game-ready materials.
- **`sampleTextures` (`src/utils/sampleTextures.ts`):** Procedural client-side texture generators (e.g., cobblestone patterns, noise generators) used as mock/fallback test cases.
- **`tileCanvasRenderer` (`src/utils/tileCanvasRenderer.ts`):** Client-side HTML5 Canvas utilities to preview 2D repeating textures on 2x2, 3x3, or 4x4 grids.

---

## 5. Problems and Risks

The following observed facts pose concrete problems or risks:

- **LACK OF LAZY/DYNAMIC SEAM REGION DEPTH CONFIGURATION FOR COMPATIBILITY:** The `SeamAnalysisService` hardcodes acceptable edge region depths to `[1, 2, 4, 8]`. If a future client wants to analyze deep structures (e.g., larger game assets with 16px or 32px borders), this constraint will trigger a fallback to `DEFAULT_EDGE_REGION` (4px).
- **MEMORY LIMITS FOR BASE64 IMAGES IN NODE RUNTIME:** Large base64 string allocations during multi-step image generation (`rawImageUrl` + `processedImageUrl` + `offsetPreviewUrl`) are heavy. The server correctly configures a `50mb` limit for JSON parsing, but high concurrent generation requests could experience memory pressure in low-resource environments.
- **FALLBACK MODEL CHAIN LACKS GRANULAR TIMEOUTS:** The fallback chain inside `geminiService.ts` (`gemini-3.1-flash-image` -> `gemini-3.1-flash-lite-image` -> `imagen-3.0-generate-002`) catches *all* errors to trigger the next model. If the Gemini service is experiencing severe latency (timeouts), the chain will run sequentially, causing the client connection to hang for up to several minutes without a dedicated step-level timeout limit.

---

## 6. Missing Foundations

Before moving to full production pipelines, the following foundations should be addressed:

- **Dedicated Timeout Handling for API Connections:** Granular HTTP client timeouts or abort signals on external Gemini API requests are missing, exposing the Express request queue to potential exhaustion.
- **Server-Side Persistent Storage/Caching:** The system does not persist generated tiles. If a user refreshes the page, the current tile is lost and must be re-generated, incurring unnecessary API key usage and cost.
- **Client API Key Configuration UI:** There is no UI in the workspace to allow users to securely supply their own API keys dynamically if the server has no pre-configured master key.

---

## 7. Recommended Next Phase: Phase 1 — Pipeline Robustness & Persistency

Based on the actual findings, we recommend proceeding to **Phase 1: Pipeline Robustness & Persistency**.

### Proposed Goals:
1. **Dynamic Provider Optimization:** Define a formal `ModelProvider` abstract class or interface. Refactor `geminiService.ts` to implement this provider pattern. This allows adding other model providers (such as local models or alternative APIs) in later phases without changing server controllers or routing.
2. **Dynamic Seam Analyzer Customization:** Expand `seamAnalysisService.ts` to support deeper edge regions (up to 32px) and expose this control in the client-side `SeamAnalysisPanel`.
3. **Transient Memory Cache:** Implement a lightweight, server-side in-memory cache with an eviction policy (LRU) to save the last N generated tiles, avoiding unnecessary regenerations on refresh.
4. **Resilience & Timeouts:** Implement client-side abort controllers and server-side timeouts on third-party model inference endpoints.

---

## 8. Questions / Decisions Required

1. **API Key Ownership:** Should the application support client-supplied Gemini API keys sent via request headers? Or must it strictly remain server-configured via `.env`?
2. **Maximum Resolution Bounds:** Currently, `tileProcessor.ts` limits resolutions to `[128, 256, 512, 1024]`. Is there a requirement to support smaller (64x64 for pixel-art) or larger (2048x2048 for HD texturing) resolutions?
3. **Persistence Mechanism:** For future tile histories, do we want to introduce a lightweight file-system database (e.g., SQLite or JSON-based store) or is an in-memory session cache sufficient?
