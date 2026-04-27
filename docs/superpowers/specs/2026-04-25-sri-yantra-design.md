# Sri Yantra Section — Design Spec

**Date:** 2026-04-25
**Fleet:** 4B
**Hash:** `#yantra`
**Placement:** After `#tree`, before `#grow` in page flow and `index.html`

---

## Goal

Add a `#yantra` section to the Hardy House Consulting SPA that renders the Sri Yantra using verified pre-computed coordinates (Gérard Huet, TCS 281, 2002), animates construction innermost-to-outermost on scroll entry, and provides a dual-mode ContextForge overlay (PAOAL phases and Element assignment) that colours the 9 triangle layers independently of the geometry.

---

## Architecture

### Rendering approach: Dual Canvas 2D + Three.js background

Three surfaces per section:

| Surface | Purpose | API |
|---|---|---|
| `.yantra-bg` canvas | Ambient Three.js particle field (same pattern as `grow.js`) | `createRenderer()` |
| `.yantra-geo` canvas | Geometry layer — stroked triangles + outer rings. Drawn once during animation, never cleared except on Replay. | Canvas 2D |
| `.yantra-overlay` canvas | Color fill layer — transparent polygon fills for ContextForge overlay. Cleared and repainted on mode/visibility change. | Canvas 2D |

The geometry and overlay canvases are stacked via CSS `position: absolute` with identical dimensions. The overlay sits above the geometry layer. Both share the same coordinate transform function.

### Coordinate transform

TikZ coordinate space (center 0,0, outer circle r=1, y-up) maps to Canvas 2D (y-down):

```
canvasX = cx + x * scale
canvasY = cy - y * scale
```

`cx` and `cy` are the canvas centre pixels. `scale` is computed from `Math.min(w, h) * 0.44` to leave margin. Both canvases use an identical `tikzToCanvas(x, y, cx, cy, scale)` utility exported from `yantraCoords.js`.

---

## File Structure

### New files

**`public/js/geometry/yantraCoords.js`** — Pure data module. No drawing code. Exports:

```js
export const TRIANGLES = [
  // 9 entries ordered innermost → outermost
  // Each: { verts: [[x,y],[x,y],[x,y]], dir: 'up' | 'down' }
  // Huet 2002 values in TikZ space (centre 0,0, outer circle r=1)
  // Source: TeXample verified TikZ implementation (texample.net, 2025)
];

export const OUTER_RINGS = [r1, r2, r3]; // 3 concentric circle radii (TikZ units)

export const LOTUS_8 = { r, petalW, petalH };  // 8-petal inner ring
export const LOTUS_16 = { r, petalW, petalH }; // 16-petal outer ring

export const BHUPURA = { halfSize, gateWidth }; // square outer frame

export function tikzToCanvas(x, y, cx, cy, scale) {
  return [cx + x * scale, cy - y * scale];
}
```

Sourcing task for implementation: transcribe from the TeXample TikZ source. Validate the concurrency constraint (all triple-intersection points must converge to exact points) by computing pairwise line intersections for each adjacent triangle pair and asserting distance < 1e-6.

**`public/js/sections/yantra.js`** — Section module. Exports `init()`. Structure:

- `_injectStyles()` — CSS injected as `<style>` tag (same pattern as `grow.js`)
- `_buildMarkup(section)` — DOM construction via `el()` helper, no innerHTML
- `_initBackground(section)` — Three.js ambient particle field via `createRenderer()`
- `_initGeoCanvas(section)` — Sets up geometry canvas, starts `IntersectionObserver`
- `_initOverlay(section)` — Sets up overlay canvas and wires control buttons
- `animateConstruction(geoCtx, cx, cy, scale)` — Draws the 9 triangles + outer rings in sequence
- `paintOverlay(overlayCtx, cx, cy, scale, mode)` — Fills overlay canvas for PAOAL or Element mode

**`public/css/sections/yantra.css`** — Imported in `public/css/main.css`. Styles for `.yantra-wrap`, canvas stack, control panel, mode pills.

### Modified files

**`views/index.html`** — Two changes:
1. Add `<li><a class="nav-link" href="#yantra">Yantra</a></li>` to `.nav-links` between the `#tree` and `#grow` entries.
2. Add `<section data-section="yantra" hidden>` between `#tree` and `#grow` sections. Markup structure:

```html
<section data-section="yantra" hidden>
  <div class="yantra-wrap">
    <canvas class="yantra-bg" aria-hidden="true"></canvas>
    <div class="yantra-stage">
      <canvas class="yantra-geo" aria-label="Sri Yantra geometry"></canvas>
      <canvas class="yantra-overlay" aria-hidden="true"></canvas>
    </div>
    <div class="yantra-controls" aria-disabled="true">
      <div class="yantra-mode-pills">
        <button class="yantra-pill" data-yantra="paoal">PAOAL</button>
        <button class="yantra-pill" data-yantra="element">Element</button>
      </div>
      <button class="yantra-toggle" data-yantra="toggle" disabled>Show overlay</button>
      <button class="yantra-replay" data-yantra="replay">Replay</button>
    </div>
    <div class="yantra-legend" data-yantra="legend" hidden></div>
  </div>
</section>
```

**`public/js/app.js`** — Add `yantra` to the section registry (same import pattern as other sections).

**`public/css/main.css`** — Add `@import './sections/yantra.css'`.

**`server.js`** — No change required; hash routing is handled client-side.

**`CLAUDE.md`** section map — Add `#yantra` row.

---

## Animation Sequencing

Entry trigger: `IntersectionObserver({ threshold: 0.3 })` on `.yantra-stage`. Fires once; a `constructed` boolean prevents double-triggering.

Draw order (innermost → outermost for visual drama):

1. Triangles 1–9 via `setTimeout` chain, 35ms per triangle
2. Three concentric circles (immediate after triangle 9)
3. 8-petal lotus ring
4. 16-petal lotus ring
5. Bhupura square frame with 4 gates

After construction completes:
- `.yantra-controls` `aria-disabled` removed, overlay toggle button enabled
- A CSS transition fades the controls in

**Replay:** clears geometry canvas + overlay canvas, resets `constructed = false`, re-runs `animateConstruction()`. Controls disabled again until re-construction completes.

---

## Overlay State Machine

Two independent axes:

| Axis | Values |
|---|---|
| `mode` | `'paoal'` \| `'element'` |
| `visible` | `true` \| `false` |

Default: `mode = 'paoal'`, `visible = false`.

Behaviour:
- Clicking a mode pill sets `mode` and repaints if `visible = true`
- Clicking the toggle button flips `visible` and repaints
- Toggle button label: `'Show overlay'` when hidden, `'Hide overlay'` when shown
- Active mode pill gets `.yantra-pill--active` class

**Legend** (`.yantra-legend`): appears when overlay is visible. Text list of triangle → phase/element mapping. No canvas annotations.

---

## PAOAL Overlay Mapping

9 triangles ordered innermost → outermost. Inner = deepest cognitive processing = Learn:

| Triangles | Phase | Colour |
|---|---|---|
| 1 | Learn | `#9B7BE0` (aether) |
| 2–3 | Assess | `#1E3FAA` (royal blue) |
| 4–5 | Observe | `#20A8C8` (water) |
| 6–7 | Act | `#1B5E35` (forest) |
| 8–9 | Plan | `#C49A1F` (gold) |

All fills at `rgba(r, g, b, 0.35)` opacity so geometry lines remain visible.

---

## Element Overlay Mapping

Reads `getElement()` from `elementState.js` (returns `null` if oracle not completed).

**If element is set:** The user's element colours all 9 triangles with the element hex at 0.40 opacity. Other overlay areas use 0.08 opacity (near-transparent). Produces a "your element saturates the whole pattern" effect.

**If no element is set:** All 9 triangles use `var(--hh-gold)` at 0.25 opacity (equal weight, neutral).

Legend text:
- **Element is set:** *"Your element — [Name] — colours the Sri Yantra."*
- **Element is null:** *"Complete the Oracle to unlock your element assignment."*

---

## Coordinate Validation (Implementation Gate)

Before any drawing code is written, `yantraCoords.js` must pass a concurrency test in Jest:

```js
// For each pair of adjacent triangles, compute the intersection of their shared edges.
// Assert that all triple-intersection points converge: distance < 1e-6 TikZ units.
test('Huet coordinates satisfy concurrency constraint', () => {
  // ...
});
```

If coordinates fail this test, the implementation is blocked until corrected values are sourced. This is the highest-risk step in the fleet.

---

## Testing

**Unit (`tests/unit/yantraCoords.test.js`):**
- Concurrency constraint (all triple-intersection points exact)
- Coordinate transform round-trip: `tikzToCanvas` then back via inverse
- `TRIANGLES.length === 9`
- 4 upward + 5 downward triangle count
- `OUTER_RINGS.length === 3`

**E2E (`tests/e2e/sections.spec.js` — new describe block):**
- Section `[data-section="yantra"]` is visible after navigation to `#yantra`
- `.yantra-geo` canvas is non-zero after construction completes
- Overlay toggle button becomes enabled after construction
- Clicking `PAOAL` pill + toggle shows overlay canvas with non-transparent pixels

---

## Sacred Geometry Invariants

These are mathematical facts from `CLAUDE.md`. The implementation must preserve them:

| Constant | Value |
|---|---|
| Triangle count | 9 (4 up + 5 down) |
| Outer concentric circles | 3 |
| Inner lotus petals | 8 |
| Outer lotus petals | 16 |
| Glow layers (if applied) | 4 at scales 1.000/1.022/1.058/1.105 |

---

## Open Constraints

- Huet 2002 coordinate values must be transcribed from the TeXample TikZ reference during implementation — they are not pre-computed in this spec
- Lotus petal geometry (ellipse arcs) must be verified against the reference before committing
- The Three.js background field reuses the `grow.js` particle approach — no new Three.js patterns introduced
