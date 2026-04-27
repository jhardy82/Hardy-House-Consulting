# Hardy House Client Deck — Design Spec

**Date:** 2026-04-25
**Fleet:** 4C
**Output:** `docs/hardy-house-deck.pptx`

---

## Goal

Generate a 12-slide PowerPoint presentation for Hardy House Consulting client pitches. Hybrid structure: 3-slide pitch wrapper (intro) + 7-slide ContextForge framework core + 2-slide pitch wrapper (outro). Content migrated from `_source/demo-presentation.html` and adapted for a static document format.

---

## Slide Structure

| # | Title | Type | Content |
|---|---|---|---|
| 1 | Hardy House Consulting | Cover | Brand name, tagline "Structured Intelligence for Complex Systems", Dodecahedron visual, ContextForge mark |
| 2 | The Problem | Intro | 3-bullet challenge framing: complexity grows, coordination fails, delivery slows |
| 3 | Our Approach | Intro | ContextForge = geometry-backed agent coordination. Introduce 5 elements + PAOAL cycle. |
| 4 | The Five Elements | Framework | Fire/Earth/Air/Water/Aether mapped to Platonic solids + agent roles |
| 5 | Sacred Geometry | Framework | FOL (19 pts), Fruit of Life (13), Metatron (78 edges) — why structure = intelligence |
| 6 | PAOAL Cycle | Framework | Plan→Act→Observe→Assess→Learn. Maps to Torus. Self-reinforcing loop. |
| 7 | The Golden Ratio | Framework | PHI = 1.618. Each system level is φ× the one below. Fibonacci team sizing. |
| 8 | Tree of Life | Framework | 10 Sephirot → ContextForge agent coordination chain |
| 9 | Team Architecture | Framework | GCMT shapes: Triad/Pentad/Octad/Tridecad. Fibonacci sizing formula. |
| 10 | Sri Yantra | Framework | 9-triangle mandala as PAOAL phase map. Innermost = Learn, outermost = Plan. |
| 11 | How We Engage | Outro | Discovery → Framework → Delivery. Typical engagement shape and duration. |
| 12 | Start the Conversation | Outro | Contact details. One action: james.hardy1124@gmail.com. Minimalist close. |

---

## Visual Design

### Theme
- **Background:** `#07040F` (void black) — all slides
- **Primary accent:** `#C49A1F` (burnished gold) — headings, key emphasis
- **Secondary accent:** `#9B7BE0` (aether violet) — ContextForge branding
- **Body text:** `#F4F0EB` — primary, `rgba(244,240,235,0.6)` — secondary

### Typography
- **Display/headings:** Cormorant (300/700 weight) — or Georgia as fallback in PPTX
- **Body:** Lora (400/500) — or Times New Roman as fallback
- **Labels/mono:** JetBrains Mono — or Courier New as fallback

### Platonic Solid Visuals
- Slides 4–10: right-side visual element per slide (static render, not animated)
- Source: extract from `_source/demo-presentation.html` Three.js renders or generate as SVG paths
- Each solid uses its element colour: Fire `#C49A1F`, Earth `#2D8050`, Air `#3B5FC8`, Water `#20A8C8`, Aether `#9B7BE0`

### Layout Variants
- **Cover (slide 1):** Full-bleed centred — title large, tagline below, solid bottom-right
- **Intro/Outro (slides 2–3, 11–12):** Left-aligned text column, right side breathing room or minimal accent shape
- **Framework (slides 4–10):** Split layout — text column left (max 55% width), geometry visual right

---

## File Output

- Path: `docs/hardy-house-deck.pptx`
- Tool: `python-pptx` library via the `pptx` skill
- Slide dimensions: 33.87cm × 19.05cm (widescreen 16:9)

---

## Open Constraints

- Cormorant/JetBrains Mono may not embed correctly in PPTX — fallback fonts acceptable, document in output
- Three.js shape renders: either use placeholder geometry shapes (python-pptx primitives) or embed pre-exported SVG
- Slide 3 (Our Approach) content: James to provide final body text for the engagement model description
