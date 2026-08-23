PS C:\Users\Gebruiker\Documents\GitHub\tiler> npm run dev

> react-example@0.1.0 dev
> tsx server/index.ts

◇ injected env (5) from .env // tip: ◈ encrypted .env [www.dotenvx.com]
◇ injected env (0) from .env // tip: ◈ secrets for agents [www.dotenvx.com]
[AI Tile Generator] Server running on http://0.0.0.0:3000
[Generation] request received
[Generation] selected provider: pixazo
[Generation] starting provider request: pixazo
[Generation] provider failed: pixazo — [Provider:pixazo] Pixazo API HTTP error 500: . [URL: POST https://gateway.pixazo.ai/getImage/v1/getSDXLImage | Status: 500  | Body: Internal server error]
[Generation] request received
[Generation] selected provider: pixazo
[Generation] starting provider request: pixazo
[Generation] provider failed: pixazo — [Provider:pixazo] Pixazo API HTTP error 500: . [URL: POST https://gateway.pixazo.ai/getImage/v1/getSDXLImage | Status: 500  | Body: Internal server error]
10:12:36 [vite] (client) page reload benchmark-results/pixazo-benchmark.json
10:12:37 [vite] (client) page reload package.json
10:12:37 [vite] (client) page reload benchmark-results/pixazo-benchmark.json
10:12:37 [vite] (client) page reload benchmark-results/pixazo-benchmark.md
10:12:37 [vite] (client) page reload server/services/providers/pixazoProvider.ts
10:12:37 [vite] (client) page reload server/services/promptBuilder.ts
10:12:37 [vite] (client) hmr update /src/components/GeneratorPanel.tsx, /src/index.css
10:12:37 [vite] (client) hmr update /src/App.tsx, /src/index.css, /src/components/GeneratorPanel.tsx
10:12:37 [vite] (client) page reload server/services/providers/pixazoProvider.ts
10:12:38 [vite] (client) hmr update /src/components/GeneratorPanel.tsx, /src/index.css
10:12:38 [vite] (client) hmr update /src/components/TilePreview.tsx, /src/index.css
10:12:38 [vite] (client) hmr update /src/App.tsx, /src/index.css, /src/components/GeneratorPanel.tsx
[Generation] request received
[Generation] selected provider: pixazo
[Generation] starting provider request: pixazo
[Generation] provider failed: pixazo — [Provider:pixazo] Pixazo API HTTP error 500: . [URL: POST https://gateway.pixazo.ai/getImage/v1/getSDXLImage | Status: 500  | Body: Internal server error]

XHR 
POST
http://localhost:3000/api/generate
[HTTP/1.1 502 Bad Gateway 10730ms]
Generation pipeline error: Error: [Provider:pixazo] Pixazo API HTTP error 500: . [URL: POST https://gateway.pixazo.ai/getImage/v1/getSDXLImage | Status: 500  | Body: Internal server error]
    generateTile apiClient.ts:109
    handleGenerate useGeneration.ts:60