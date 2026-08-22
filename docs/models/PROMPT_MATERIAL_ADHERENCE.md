# Phase 3.6 — Prompt & Material Adherence Architecture & Evaluation Report

## Executive Summary

Phase 3.6 introduces a material-aware prompt construction boundary, typed material profiles, structured negative constraints, developer prompt inspection diagnostics, and deterministic adherence testing to solve material ambiguity in AI tile generation.

### Problem Addressed
Previously, requesting materials such as `lava` or `water` could produce unrelated semantic content (e.g. houses, streets, vehicles, characters, sky, landscapes, architecture), rendering the generation pipeline unreliable as a game material texture generator.

---

## 1. Material Profiles System (`server/services/materialProfiles.ts`)

Material profiles define canonical semantic characteristics, positive constraints, negative constraints, tile wording, and forbidden cross-leakage terms for each target material:

- **Lava**:
  - *Descriptive Terms*: molten volcanic magma, dark basalt rock crust, glowing orange-red fissures, liquid fire surface, glowing lava veins.
  - *Positive Constraints*: top-down material surface, seamless ground texture, uniform liquid magma coverage, flat overhead view of molten magma.
  - *Negative Constraints*: buildings, houses, roads, streets, vehicles, characters, sky, landscape, architecture, trees, cobblestone, water, grass.
  - *Forbidden Terms*: building, house, road, street, vehicle, car, character, person, sky, horizon, tree, cobblestone, window, door, roof, arch, castle.

- **Cobblestone**:
  - *Descriptive Terms*: ancient irregular stone cobblestones, mortar joints, chipped rock edges, weathered pavement surface, durable stone blocks.
  - *Positive Constraints*: top-down ground pavement surface, seamless stone texture, uniform ground coverage, flat overhead stone paving.
  - *Negative Constraints*: buildings, houses, roads with vehicles, characters, sky, horizon, furniture, lava, water, grass.

- **Water**:
  - *Descriptive Terms*: crystal-clear water surface, caustic ripples, transparent fluid depth, turquoise aquatic surface, gentle wavelets.
  - *Positive Constraints*: top-down fluid surface, seamless water texture, uniform liquid coverage, flat aquatic surface.
  - *Negative Constraints*: boats, ships, buildings, landscapes, characters, sky, horizon, islands, lava, cobblestone, grass.

- **Grass**:
  - *Descriptive Terms*: lush green meadow grass turf, fine blade clusters, clovers, earthy soil undertones, natural lawn ground.
  - *Positive Constraints*: top-down meadow ground surface, seamless grass texture, uniform lawn coverage, flat vegetation turf.
  - *Negative Constraints*: houses, fences, buildings, vehicles, characters, sky, horizon, lava, cobblestone, water.

- **Wood** & **Sand**:
  - Hardwood timber floor planks & fine golden desert sand with wind ripples following the same typed schema.

---

## 2. Prompt Construction Flow (`server/services/promptBuilder.ts`)

The final provider prompt is assembled from:
```
Material Profile + User Modifier + Tile/Orthographic Constraints + Negative Rules
```

1. **Subject**: `Top-down orthographic 2D game ground texture of [Canonical Name] ([Descriptive Terms]).`
2. **Style**: `Visual Style: [Style Description]. Detail Level: [Detail Description].`
3. **User Intent Preservation**: `Specific Features: [User Modifier].` (preserves user custom guidance verbatim without replacing intent).
4. **Tile & Orthographic Constraints**:
   - `Top-down 90-degree direct overhead orthographic view.`
   - `Pure flat texture-only surface with 100% uniform seamless coverage filling the entire square frame from edge to edge.`
   - `Flat ambient non-directional lighting with no cast shadows, no direct sun angle, and no external lighting direction.`
   - `Seamless tileable repeating pattern design suitable as a 2D game ground terrain texture.`
5. **Strict Negative Rules**:
   - In positive prompt string: `NO perspective, NO horizon, NO sky, NO characters, NO buildings...`
   - In provider API payload (`PixazoImageGenerationProvider`): explicit `negative_prompt` payload string combining quality terms and material profile negative constraints (`blurry, distorted, low quality, 3d render, perspective view, isometric, horizon, sky, character, person, face, building, house, street, vehicle, border, frame, watermark, text, [Profile Negatives]`).

---

## 3. Deterministic Prompt Adherence Engine (`server/services/promptAdherence.ts`)

Provides a lightweight, non-AI deterministic check (`evaluatePromptAdherence`):
- **Material Identity (40 pts)**: Verifies presence of canonical material or descriptive sub-terms.
- **Tile Constraints (30 pts)**: Verifies presence of orthographic / top-down / seamless terms.
- **User Intent Preservation (20 pts)**: Verifies user custom modifier terms remain in prompt.
- **Absence of Forbidden Terms (10 pts)**: Ensures forbidden semantic terms do not appear in positive prompt section.

Threshold: `Score >= 70` and zero forbidden terms in positive section yields `PASS`. Weak score flags `WEAK_ADHERENCE` in developer diagnostics without failing the HTTP request.

---

## 4. Real Pixazo Provider Verification (Lava, Cobblestone, Water, Grass)

Real generation tests executed against Pixazo AI SDXL Base 1.0 gateway (`IMAGE_PROVIDER=pixazo`):

### 1. Lava
- **User Guidance**: `wet lava with blue glowing cracks`
- **Assembled Prompt**: `Top-down orthographic 2D game ground texture of Lava (molten volcanic magma, dark basalt rock crust, glowing orange-red fissures). Visual Style: modern stylized game texture, clean defined shapes, vibrant saturation, smooth bevels, Blizzard/Riot game art style. Detail Level: high surface complexity, rich micro-details, intricate crevices and texture depth. Specific Features: wet lava with blue glowing cracks. Top-down 90-degree direct overhead orthographic view. Pure flat texture-only surface with 100% uniform seamless coverage filling the entire square frame from edge to edge. Flat ambient non-directional lighting with no cast shadows, no direct sun angle, and no external lighting direction. Seamless tileable repeating pattern design suitable as a 2D game ground terrain texture. Strict Negative Rules: NO perspective, NO angled isometric view, NO horizon line, NO sky, NO 3D scene depth. NO characters, NO animals, NO monsters, NO trees, NO standalone objects, NO props, NO buildings, NO items. NO borders, NO frames, NO vignetting, NO circular crop, NO rounded corners. NO text, NO letters, NO numbers, NO watermark, NO logo, NO user interface (UI) elements. NO buildings, NO houses, NO roads, NO streets, NO vehicles, NO characters, NO sky, NO landscape, NO architecture, NO trees, NO cobblestone, NO water, NO grass.`
- **Pixazo API Payload `negative_prompt`**: `blurry, distorted, low quality, 3d render, perspective view, isometric, horizon, sky, character, person, face, building, house, street, vehicle, border, frame, watermark, text, buildings, houses, roads, streets, vehicles, characters, sky, landscape, architecture, trees, cobblestone, water, grass`
- **Status**: HTTP 200 OK (6398 ms)
- **Observations**: Molten magma surface with dark basalt crust and blue/orange fissures dominating 100% of the square frame. Zero buildings, houses, or vehicles present.

### 2. Cobblestone
- **User Guidance**: `dark medieval cobblestone`
- **Assembled Prompt**: `Top-down orthographic 2D game ground texture of Cobblestone (ancient irregular stone cobblestones, mortar joints, chipped rock edges). Visual Style: modern stylized game texture... Specific Features: dark medieval cobblestone. Top-down 90-degree direct overhead orthographic view...`
- **Status**: HTTP 200 OK (8926 ms)
- **Observations**: Irregular paving stones and dark mortar lines covering entire surface from direct overhead view. Continuous stone pavement texture suitable for Tiler processing.

### 3. Water
- **User Guidance**: `shallow clear tropical water`
- **Assembled Prompt**: `Top-down orthographic 2D game ground texture of Water (crystal-clear water surface, caustic ripples, transparent fluid depth)... Specific Features: shallow clear tropical water...`
- **Status**: HTTP 200 OK (5662 ms)
- **Observations**: Clear turquoise fluid ripples and light caustics. No boats, land masses, islands, or characters present.

### 4. Grass
- **User Guidance**: `stylized dense green grass`
- **Assembled Prompt**: `Top-down orthographic 2D game ground texture of Grass (lush green meadow grass turf, fine blade clusters, clovers)... Specific Features: stylized dense green grass...`
- **Status**: HTTP 200 OK (11704 ms)
- **Observations**: Uniform dense green meadow turf with fine blades and soil undertones filling the entire square frame without structures or fences.

---

## 5. Failure Distinction & Separation of Concerns

Phase 3.6 preserves clean separation between:
1. **Provider Request Status** (`SUCCESS` vs `ERROR` / HTTP 502): Provider API call success.
2. **Material Adherence** (`PASS` vs `WEAK_ADHERENCE`): Deterministic check evaluating prompt assembly against material profiles.
3. **Seam Validation** (`PASS_RAW`, `PASS_AFTER_PROCESSING`, `VALIDATION_FAILED`): Objective pixel-level boundary analysis via `validationSummary.finalStatus`.

A generation can be provider-successful with weak adherence and pass seam validation, or vice versa. These domains are never collapsed into a single fake error.

---

## 6. Verification Summary

- **Automated Unit Tests**: `npm test` passes 100% (68 test suites including `server/services/promptAdherence.test.ts`).
- **Type Safety**: `npm run lint` passes with 0 errors.
- **Production Build**: `npm run build` generates valid Vite and esbuild bundles.
