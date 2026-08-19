<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Tiler - AI Tile Generator

Seamless 2D game texture generator using AI models and local seam processing/analysis.

## Run Locally

**Prerequisites:** Node.js (v18+)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables (optional for local/mock execution):
   ```bash
   cp .env.example .env.local
   ```
   - For Gemini API: Set `GEMINI_API_KEY` in `.env.local`
   - For Pixazo AI PoC: Set `PIXAZO_API_KEY` in `.env.local`
3. Run the development server:
   ```bash
   npm run dev
   ```

## Testing & Benchmarks

- **Run all unit test suites:**
  ```bash
  npm test
  ```
- **Run local deterministic benchmark (Mock provider):**
  ```bash
  npm run benchmark
  ```
- **Run Pixazo AI PoC benchmark:**
  ```bash
  npm run benchmark:pixazo
  ```
  *(Requires `PIXAZO_API_KEY` set in environment for real API execution. Reports clear notice if unconfigured.)*
