# SDXL Base 1.0 — Tileable Texture Prompt Instructions

## Purpose

Generate **512×512 seamless, tileable textures** for use in games, 3D environments, materials, terrain, and procedural texture workflows.

The generated image must represent a **material surface**, not an object, scene, illustration, photograph, or character.

---

## Architectural Decision: Omitting Camera Framing Terms (`top-down`, `orthographic`)

In earlier prompt systems, camera framing descriptors such as `top-down` and `orthographic` were hardcoded into positive prompts. Under SDXL Base 1.0, camera and composition descriptors (including `top-down`, `orthographic`, `camera`, `perspective`) encourage the diffusion model to create composed 3D scenes or aerial photograph representations rather than pure material surfaces.

Therefore, SDXL Base 1.0 prompts omit camera words in favor of direct **material surface descriptors** (`[MATERIAL] material surface`) combined with explicit **seamless tileability constraints** (`evenly distributed detail, uniform surface, flat neutral lighting, seamless tileable texture, continuous pattern, no visible borders`).

---

## Prompt Construction

Build the prompt around the following structure:

`[material] + [surface characteristics] + [color/palette] + [physical details] + [surface variation] + [texture quality] + seamless texture`

### Example

`weathered dark stone, rough porous surface, irregular small cracks, subtle gray and charcoal color variation, natural mineral patterns, fine surface detail, evenly distributed texture, seamless tileable texture`

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

* `centered`
* `foreground`
* `background`
* `horizon`
* `perspective`
* `camera`
* `close-up`
* `wide shot`
* `scene`
* `landscape`

These encourage the model to create a composed image instead of a texture.

---

### 3. Require uniform distribution

The texture should contain detail across the entire image.

Prefer:

* `evenly distributed detail`
* `uniform surface coverage`
* `consistent surface pattern`
* `continuous material surface`
* `random natural variation`

Avoid:

* `single large crack`
* `one large stone`
* `central pattern`
* `focal point`
* `distinct object`

---

### 4. Avoid obvious borders

The edges of the generated image must visually connect with the opposite edges.

Always include:

`seamless tileable texture, continuous pattern, no visible borders`

The texture should not contain:

* a frame
* a border
* a vignette
* an obvious center
* an obvious top or bottom
* lighting that changes strongly across the image

---

### 5. Keep lighting neutral

Textures should preferably represent **albedo/material information**, not a rendered surface.

Prefer:

`flat lighting, neutral illumination, uniform brightness`

Avoid:

`dramatic lighting, cinematic lighting, strong shadows, rim lighting, directional spotlight`

This prevents the texture from baking a particular lighting direction into the material.

---

## Texture Detail

The amount of detail should match the intended material.

### Stone

`irregular rock structure, small cracks, pores, mineral variation, rough granular surface`

### Dirt

`fine soil particles, small stones, subtle organic variation, irregular granular structure`

### Sand

`fine grains, subtle ripples, small particles, natural granular variation`

### Wood

`continuous wood grain, subtle knots, fine fibers, irregular grain variation`

### Brick

`repeating masonry structure, individual brick surfaces, mortar variation, weathered edges`

### Metal

`subtle scratches, fine brushed surface, small imperfections, realistic material variation`

### Moss

`dense organic texture, small moss structures, irregular growth patterns, subtle green variation`

---

## Prompt Length

Keep the final prompt relatively compact.

Target approximately:

**25–60 words**

The prompt should describe the material and its important characteristics without turning into a long narrative.

Prioritize the most important information:

1. Material
2. Surface structure
3. Color
4. Scale of detail
5. Variation
6. Seamless/tileable requirement

Do not fill the prompt with generic quality words such as:

`masterpiece, beautiful, stunning, epic, 8k, award winning`

These are less useful than describing the actual material.

---

## Negative Prompt

Use a consistent negative prompt to suppress objects and image composition:

`object, objects, scene, landscape, building, character, person, animal, furniture, centered object, focal point, perspective, horizon, foreground, background, frame, border, vignette, text, logo, watermark, UI, strong directional lighting, dramatic shadows, visible seams`

---

## Output Requirements

Target:

* **Resolution:** 512×512
* **Format:** square
* **Purpose:** seamless/tileable texture
* **Composition:** uniform surface
* **Lighting:** neutral and consistent
* **Detail:** distributed across the entire image
* **No focal point**
* **No identifiable objects**
* **No borders**
* **No text**
* **No baked-in dramatic shadows**

SDXL Base 1.0 is natively optimized around 1024×1024, so if maximum texture quality is important, consider generating at 1024×1024 and downscaling to 512×512 rather than generating directly at 512×512.

---

## Template

Use this template when generating prompts:

`[MATERIAL], [SURFACE STRUCTURE], [COLOR / PALETTE], [SMALL-SCALE DETAILS], [NATURAL VARIATION], evenly distributed detail, uniform surface, flat neutral lighting, seamless tileable texture, continuous pattern, no visible borders`

### Example Output

`dark volcanic stone, rough porous surface, irregular small cracks, charcoal gray and dark brown palette, fine mineral particles and subtle color variation, evenly distributed detail, uniform surface, flat neutral lighting, seamless tileable texture, continuous pattern, no visible borders`
