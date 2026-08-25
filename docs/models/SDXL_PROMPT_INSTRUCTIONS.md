# SDXL Base 1.0 — Tileable Texture Prompt Instructions

## Purpose

Generate **512×512 seamless, tileable textures** for use in games, 3D environments, materials, terrain, and procedural texture workflows.

The generated image must represent a **material surface**, not an object, scene, illustration, photograph, or character.

---

## Architectural Principles: Compact Material Prompts

The final positive SDXL prompt is **not** a concatenation of every material-profile field.

Instead, prompts follow the compact formula:

`[promptDescriptor] + [optional style] + [optional userModifier] + seamless tileable texture`

---

### 1. High Information Density & Word Count Target

* **Target Prompt Length:** **15–25 words**
* **Hard Maximum:** **30 words**

Shorter prompts are preferred when the material is already clearly described. Every word must contribute high material signal per word.

---

### 2. Single Authoritative Compact Material Descriptor

Each canonical material profile defines a single, authoritative `promptDescriptor` (8–12 words). The prompt builder emits this single descriptor rather than concatenating multiple descriptive fields independently.

Example Descriptors:
* **Wood:** `wood, warm oak grain, subtle knots and fibers, natural variation`
* **Stone:** `stone, rough porous rock, slate-gray tones, fine cracks and mineral grain, subtle variation`
* **Moss:** `moss, dense soft growth, deep green tones, fine organic variation`
* **Metal:** `brushed steel, fine grain and micro scratches, cool gray tones, subtle wear`
* **Lava:** `molten lava, dark basalt rock crust, glowing orange-red fissures, fluid flow`

---

### 3. Strict Material Isolation & Purity

Canonical material descriptions must remain isolated. A Wood prompt must **never** automatically contain `dirt`, `stone`, `brick`, `grass`, `sand`, `metal`, `lava`, `water`, or `moss`.

Secondary material concepts are permitted **only** when explicitly requested in a user modifier (e.g., `wet wood with moss`).

---

### 4. Style Separation

Style descriptors (e.g., `16-bit pixel art style`, `16-bit JRPG tile art style`) describe rendering art style only.

Styles remain subordinate to the material surface and must **never** inject camera framing or composition terms (`top-down`, `orthographic`, `tileset`, `camera`, `perspective`, `horizon`).

---

### 5. Minimal Tileability Constraint Tail

The universal tail appended to positive prompts is minimal:

`seamless tileable texture`

Do not append long quality checklists or repetitive rules. The prompt validator enforces the full quality contract.

---

## Output Examples

### Wood (Canonical)
`wood, warm oak grain, subtle knots and fibers, natural variation, seamless tileable texture` (13 words)

### Wood (Pixel Art Style)
`wood, warm oak grain, subtle knots and fibers, natural variation, 16-bit pixel art style, seamless tileable texture` (17 words)

### Stone (Stylized)
`stone, rough porous rock, slate-gray tones, fine cracks and mineral grain, subtle variation, clean stylized art style, seamless tileable texture` (19 words)

---

## Rules

### 1. Describe the material, not an object
Good: `wood, warm oak grain, subtle knots`
Bad: `an old wooden house`

### 2. Avoid composition words
Do NOT use: `centered`, `foreground`, `background`, `horizon`, `perspective`, `camera`, `close-up`, `wide shot`, `scene`, `landscape`, `top-down`, `orthographic`, `tileset`

### 3. Require uniform distribution
Prefer: `uniform detail`, `seamless tileable texture`
Avoid: `single large crack`, `one large stone`, `central pattern`, `focal point`, `distinct object`

### 4. Avoid obvious borders
Always include `seamless tileable texture`.

### 5. Keep lighting neutral
Prefer: `neutral lighting`, `flat lighting`, `uniform brightness`
Avoid: `dramatic lighting`, `cinematic lighting`, `strong shadows`, `directional spotlight`

---

## Negative Prompt

Use a consistent negative prompt to suppress objects, composition, and cross-material contamination:

`object, objects, scene, landscape, building, character, person, animal, furniture, centered object, focal point, perspective, horizon, foreground, background, frame, border, vignette, text, logo, watermark, UI, strong directional lighting, dramatic shadows, visible seams`

---

## Template

`[promptDescriptor], [optional style], [optional userModifier], seamless tileable texture`
