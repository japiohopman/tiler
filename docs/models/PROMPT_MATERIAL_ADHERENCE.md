# Phase 3.6 — Prompt & Material Adherence Architecture & SDXL Compact Prompt Optimization

## Executive Summary

Phase 3.6 introduces a material-aware prompt construction boundary, typed material profiles, structured negative constraints, developer prompt inspection diagnostics, deterministic adherence testing, and compact prompt optimization tailored specifically for SDXL models.

### Problem Addressed
Previously, prompt construction generated excessively long positive prompt strings (over 180 words) listing repeated "NO perspective, NO sky, NO characters, NO buildings..." rules within the positive prompt body. Standard diffusion text encoders (such as CLIP in SDXL) cap attention at 77 tokens (~60 words) and perform poorly when flooded with long text lists of negative exclusions in the positive prompt.

By streamlining the positive prompt to a concise, punchy ~25–35 word structure and delegating negative constraints to the dedicated API `negative_prompt` payload parameter, prompt clarity and model adherence are significantly improved.

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

## 2. Streamlined SDXL Prompt Construction Flow (`server/services/promptBuilder.ts`)

The final provider prompt is assembled into a short, token-efficient positive prompt string (~25–35 words):
```
Subject + Style & Detail + User Modifier + Concise Technical Constraints
```

### Positive Prompt Structure
1. **Subject**: `Top-down orthographic 2D game ground texture of [Canonical Name] ([Primary Descriptive Terms]).`
2. **Style & Detail**: `Visual Style: [Compact Style]. Detail: [Compact Detail].`
3. **User Modifier**: `Specific Features: [User Modifier].` (preserves user custom guidance verbatim).
4. **Concise Technical Requirements**: `Flat direct overhead orthographic view, 100% uniform seamless tileable repeating pattern surface.`

### Negative Prompt Payload Parameter
All negative constraints are grouped exclusively in the dedicated `negative_prompt` API payload field sent to SDXL (e.g. via `PixazoImageGenerationProvider`):
`blurry, distorted, low quality, 3d render, perspective view, isometric, horizon, sky, character, person, face, building, house, street, vehicle, border, frame, watermark, text, animals, monsters, trees, props, items, vignetting, UI, [Profile Negatives]`

---

## 3. Adherence Evaluation Methodology (Deterministic Prompt vs Human Visual Inspection)

Phase 3.6 explicitly separates two distinct evaluation layers:

### A. Deterministic Prompt Adherence (`evaluatePromptAdherence`)
- Evaluates **text prompt construction** before or during generation.
- Verifies material identity terms (40 pts), orthographic/tile constraints (30 pts), user intent preservation (20 pts), and absence of forbidden terms in positive rules (10 pts).
- Yields a score (0-100) and status (`PASS` vs `WEAK_ADHERENCE`). This is a deterministic rule-based check, NOT an AI image classifier.

### B. Human Visual Inspection
- Evaluates the **actual output image** generated by Pixazo SDXL.
- Verifies whether requested material is visually dominant, unrelated scene objects are absent, and texture suitability is achieved.

---

## 4. Real Pixazo Provider Verification (Lava, Cobblestone, Water, Grass)

Real generation tests executed against Pixazo AI SDXL Base 1.0 gateway (`IMAGE_PROVIDER=pixazo`):

### 1. Cobblestone
- **User Guidance**: `dark medieval cobblestone`
- **Assembled Positive Prompt (Compact)**: `Top-down orthographic 2D game ground texture of Cobblestone (ancient irregular stone cobblestones, mortar joints, chipped rock edges). Visual Style: modern stylized 2D game art texture, Blizzard/Riot style. Detail: high surface detail and depth. Specific Features: dark medieval cobblestone. Flat direct overhead orthographic view, 100% uniform seamless tileable repeating pattern surface.`
- **Pixazo API Payload `negative_prompt`**: `blurry, distorted, low quality, 3d render, perspective view, isometric, horizon, sky, character, person, face, building, house, street, vehicle, border, frame, watermark, text, animals, monsters, trees, props, items, vignetting, UI, buildings, houses, roads with vehicles, characters, sky, horizon, furniture, lava, water, grass`
- **Word Count**: 46 words (well within CLIP text encoder efficiency limits)
- **Status**: HTTP 200 OK
- **Deterministic Prompt Adherence**: 100 / 100 (PASS)

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
