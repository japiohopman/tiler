# SDXL Base 1.0 — Tileable Texture Prompt Instructions

## Purpose

Generate **512×512 seamless, tileable textures** for use in games, 3D environments, materials, terrain, and procedural texture workflows.

The generated image must represent a **material surface**, not an object, scene, illustration, photograph, or character.

---

## Architectural Principles & Prompt Quality Rules

### 1. High Information Density (Target: 25–45 Words)

A concise, materially precise prompt (25–45 words) is vastly superior to a verbose, repetitive prompt. Treat 60 words as an upper safety boundary, not the normal target. Every phrase must contribute unique physical or visual information.

---

### 2. One Strong Descriptor Per Category

Construct prompts using one concise, non-repetitive descriptor per semantic category:

`[MATERIAL], [SURFACE STRUCTURE], [COLOR / PALETTE], [SMALL-SCALE DETAILS], [NATURAL VARIATION], [STYLE], [USER MODIFIER], [COMPACT TILE CONSTRAINTS]`

Do **NOT** describe the same physical feature multiple times using different wording (e.g. avoid repeating "wood grain", "grain grooves", "grain variation", or "wood knots" across multiple phrases).

---

### 3. Strict Material Purity

A canonical material prompt must remain isolated from unrelated materials.
For example, a **Wood** prompt must **never** automatically contain `dirt`, `stone`, `brick`, `grass`, `sand`, `metal`, `lava`, `water`, or `moss`.

Secondary material concepts are permitted **only** when explicitly requested in a user modifier (e.g., `wet wood with moss`).

---

### 4. Style Separation from Camera Framing

Style descriptors (e.g., `16-bit JRPG tile art style`, `16-bit pixel art style`, `stylized hand-painted art style`) describe rendering art style only.

Styles remain subordinate to the material surface and must **never** inject camera framing or composition terms (`top-down`, `orthographic`, `tileset`, `camera`, `perspective`).

---

### 5. Camera Words Omission

Camera framing descriptors (`top-down`, `orthographic`, `camera`, `perspective`) are omitted from positive prompts per Rule 2 (avoiding composition/camera descriptors that encourage diffusion models to render 3D scenes or aerial map photos rather than flat material surfaces).

Instead, prompts rely on direct **material surface descriptors** (`[material] material surface`) and a **compact universal tileability tail** (`uniform detail, neutral lighting, seamless tileable texture`).

---

## Prompt Construction Structure

`[MATERIAL], [SURFACE STRUCTURE], [COLOR / PALETTE], [SMALL-SCALE DETAILS], [NATURAL VARIATION], [STYLE], [USER MODIFIER], uniform detail, neutral lighting, seamless tileable texture`

### Example Output

`wood material surface, parallel timber planks, warm oak and dark walnut tones, subtle knots and fine wood grain, organic grain variation, 16-bit JRPG tile art style, uniform detail, neutral lighting, seamless tileable texture`

---

## Rules

### 1. Describe the material, not an object

Good:
`aged wooden planks, weathered wood grain, rough surface`

Bad:
`an old wooden house`

The model must generate **the surface itself**, not an object made from the material.

---

### 2. Avoid composition words

Do NOT use:
`centered`, `foreground`, `background`, `horizon`, `perspective`, `camera`, `close-up`, `wide shot`, `scene`, `landscape`, `top-down`, `orthographic`, `tileset`

---

### 3. Require uniform distribution

The texture should contain detail across the entire image.

Prefer:
`uniform detail`, `uniform surface coverage`, `continuous material surface`

Avoid:
`single large crack`, `one large stone`, `central pattern`, `focal point`, `distinct object`

---

### 4. Avoid obvious borders

The edges of the generated image must visually connect with the opposite edges. Always include `seamless tileable texture`.

---

### 5. Keep lighting neutral

Prefer: `neutral lighting`, `flat lighting`, `uniform brightness`
Avoid: `dramatic lighting`, `cinematic lighting`, `strong shadows`, `directional spotlight`

---

## Texture Detail Profiles

### Stone
`porous rock surface, slate and charcoal gray tones, irregular small cracks and mineral pores, natural mineral grain variation`

### Cobblestone
`interlocking stone paving blocks, weathered gray and charcoal tones, tight mortar joints and chipped rock edges, natural stone wear and block orientation variation`

### Brick
`repeating brick masonry blocks, terracotta red and gray mortar tones, weathered brick edges and fine clay pores, subtle brick shade variation`

### Dirt
`compact soil surface, rich dark brown and umber tones, fine earth particles and small embedded pebbles, organic soil texture variation`

### Sand
`smooth dune granule surface, golden sand and warm beige tones, fine granules and micro ripple lines, wind-swept ripple variation`

### Wood
`parallel timber planks, warm oak and dark walnut tones, subtle knots and fine wood grain, organic grain variation`

### Metal
`industrial sheet metal plate, steel gray and gunmetal tones, fine brushed grain and micro scratches, subtle metallic sheen variation`

### Moss
`dense organic moss cushion, forest green and emerald moss tones, small moss fronds and velvety tufts, irregular organic growth patterns`

### Lava
`molten magma channels with basalt rock crust, glowing orange-red fissures and dark charcoal crust, emissive magma veins and micro embers, fluid lava flow variation`

### Water
`fluid water surface, turquoise aquatic blue and clear cyan tones, shimmering caustic light patterns, gentle surface ripple variation`

### Grass
`dense meadow lawn turf, lush green meadow and earthy soil tones, fine grass blade clusters and clovers, soft blade direction variation`

---

## Negative Prompt

Use a consistent negative prompt to suppress objects, composition, and cross-material contamination:

`object, objects, scene, landscape, building, character, person, animal, furniture, centered object, focal point, perspective, horizon, foreground, background, frame, border, vignette, text, logo, watermark, UI, strong directional lighting, dramatic shadows, visible seams`

---

## Template

`[MATERIAL], [SURFACE STRUCTURE], [COLOR / PALETTE], [SMALL-SCALE DETAILS], [NATURAL VARIATION], uniform detail, neutral lighting, seamless tileable texture`
