# Fleet 21 — 3D Metatron's Cube + Extended Shapes Design

**Date:** 2026-04-26  
**Session:** cranky-cohen-7e4630  
**Status:** Approved

---

## Goal

Expand the `#geometry` section with three additions:

1. **3D Metatron's Cube scene** — a `Metatron3DScene` class rendering 13 glowing sphere-nodes at Vector Equilibrium positions connected by all 78 Metatron lines in true 3D, with progressive draw animation, full orbit control, and mode toggle.
2. **Tesseract shape card** — 4D hypercube projected to 3D via real-time 4D rotation, added to the Extended Catalogue.
3. **Stellated Dodecahedron shape card** — 60 triangular spike faces on the base dodecahedron, added to the Extended Catalogue.

All changes live in `public/js/sections/geometry.js` and `public/css/sections/geometry.css`. No new files.

---

## Sacred Geometry Invariants (extended)

CLAUDE.md invariants are preserved and extended:

| Constant | Value | Description |
|---|---|---|
| `FOL_PTS.length` | 19 | Flower of Life circles (existing) |
| `FRUIT_IDX.length` | 13 | Fruit of Life centres (existing) |
| `MET_EDGES.length` | 78 | C(13,2) Metatron edges (existing — now also in 3D) |
| `PLATONIC.length` | 5 | Platonic solids (existing) |
| Glow layers | 4 | Scale/opacity spec (existing) |
| Tesseract vertices | **16** | 2^4 bit combinations of (±1,±1,±1,±1) |
| Tesseract edges | **32** | Vertex pairs differing in exactly one bit |
| Stellated Dodec faces | **60** | 12 pentagonal faces × 5 triangles per spike |

---

## Architecture

### Scope

- **Location:** Expand existing `#geometry` section — no new section, no new nav entry.
- **Files modified:** `geometry.js`, `geometry.css`, `tests/unit/geometry.test.js`, `tests/e2e/sections.spec.js`.
- **Files created:** `public/js/geometry/metatron3d.js` — pure-math helpers (`buildTesseractVerts`, `buildTesseractEdges`, `buildStelFaces`, `project4D`). No DOM or THREE dependency; mirrors `constants.js` pattern. Imported by `geometry.js` and the unit test suite.

### `Metatron3DScene` Class

New class alongside `MetatronScene` and `FOLScene`. Same interface contract:

```js
class Metatron3DScene {
  constructor(canvas) { ... }   // boots scene, defers draw 600ms
  tick(t, boost) { ... }        // orbit update + render
  setDisplayMode(mode) { ... }  // 'edges' | 'faces' | 'both'
  dispose() { ... }             // cleanup, remove from _allShapes
}
```

**Geometry — 13 node positions (Vector Equilibrium):**

```js
const R = 1.1;
const VE_POSITIONS = [
  [0,  0,  0],                         // centre
  [ 0,  R,  R], [ 0,  R, -R],          // YZ square face midpoints
  [ 0, -R,  R], [ 0, -R, -R],
  [ R,  0,  R], [ R,  0, -R],          // XZ square face midpoints
  [-R,  0,  R], [-R,  0, -R],
  [ R,  R,  0], [ R, -R,  0],          // XY square face midpoints
  [-R,  R,  0], [-R, -R,  0],
];
// VE_POSITIONS.length === 13 (FRUIT_IDX invariant, now in 3D)
```

**78 connecting lines:** All C(13,2) = 78 vertex pairs. Same as existing `MetatronScene` verts logic, extended to 3D.

**Scene setup:**
- `THREE.PerspectiveCamera(45, aspect, 0.1, 100)` at distance ~5.5 from origin
- `createRenderer(canvas)` — shared factory per CLAUDE.md
- `THREE.AmbientLight(0x1A0D3D, 0.65)` + 2 PointLights (gold + royal, matching `SacredShape` spec)
- `OrbitControl` bound to canvas, auto-orbit when not dragging

**Node spheres:** 13 `THREE.SphereGeometry` meshes:
- Centre node: radius 0.10
- Outer 12: radius 0.07
- Material: `MeshPhongMaterial` with element-matched color + emissive
- These are "faces" in mode toggle terminology

**78-line mesh:** Single `THREE.LineSegments` with `BufferGeometry` (156 vertices = 78 × 2). `setDrawRange(0, 0)` initially; progressive reveal via `_draw()`.

**Glow on line mesh:** Standard 4-layer spec from CLAUDE.md (scales 1.000/1.022/1.058/1.105, opacities 0.88/0.27/0.10/0.04), applied via `buildGlowEdge` or an equivalent dynamic approach.

**Progressive draw:** 600ms startup delay, then reveals 4 vertices at a time every 22ms — mirrors existing `MetatronScene._draw()` pattern exactly.

**Mode toggle (`setDisplayMode`):**

| Mode | Lines visible | Sphere nodes visible | Pill label |
|---|---|---|---|
| `'both'` (default) | ✅ | ✅ | Both |
| `'edges'` | ✅ | ❌ | Lines |
| `'faces'` | ❌ | ✅ | Nodes |

The 3D Metatron card has its own mode pills (separate from the Platonic-grid section-level pills). Pill labels use **Lines / Nodes / Both** to distinguish from the E/F/Both labels used by Platonic solid cards.

**DOM placement:** Pills sit inside the `s2d-wrap` div for the 3D Metatron card, alongside the canvas. The scene reference is stored on `card._scene` for pill click handlers.

```html
<div class="s2d-wrap" data-card="met3d">
  <canvas id="geo-met3dCanvas"></canvas>
  <div class="geo-3d-mode-pills">
    <button class="geo-3d-mpill on" data-mode="both">Both</button>
    <button class="geo-3d-mpill" data-mode="edges">Lines</button>
    <button class="geo-3d-mpill" data-mode="faces">Nodes</button>
  </div>
</div>
```

**Lazy-load:** `IntersectionObserver` with `threshold: 0.1`, mirrors `_init2D()` — scene only created when card scrolls into view.

---

### Tesseract — `_buildTesseract()` on `SacredShape`

**4D vertices (16 total):**
```js
// Bit-indexed: vertex i has coords (±1) for each of 4 axes
const verts4d = Array.from({ length: 16 }, (_, i) => [
  i & 1 ? 1 : -1,   // x
  i & 2 ? 1 : -1,   // y
  i & 4 ? 1 : -1,   // z
  i & 8 ? 1 : -1,   // w
]);
```

**32 edges:** Pairs `[i, j]` where `(i ^ j)` is a power of 2 (exactly one bit differs). `verts4d.length === 16`, `edges.length === 32` — both are CLAUDE.md invariants.

**4D→3D projection (per frame):**
```js
// Two independent rotation planes
angleXW += 0.007 * boost;   // XW plane
angleYZ += 0.011 * boost;   // YZ plane

// For each vertex [x, y, z, w]:
const x1 = x * cos(angleXW) - w * sin(angleXW);
const w1 = x * sin(angleXW) + w * cos(angleXW);
const y1 = y * cos(angleYZ) - z * sin(angleYZ);
const z1 = y * sin(angleYZ) + z * cos(angleYZ);
// Perspective divide (viewDist = 2.5)
const s = 2.5 / (2.5 - w1);
projected = [x1 * s, y1 * s, z1 * s];
```

**Dynamic geometry:** `Float32Array` of 32 × 2 × 3 = 192 floats updated every `tick()`. `geometry.attributes.position.needsUpdate = true`. Two glow layers only (not 4 — dynamic update makes extra static layers redundant).

**Catalogue entry:**
```js
{
  id: 'tesseract', name: 'Tesseract', element: 'Time', elementColor: '#C4B0E8',
  facts: 'Vertices: 16 -- Edges: 32 -- 4D Hypercube',
  meaning: 'The 4D hypercube — a cube rotating through a dimension beyond direct perception. In GCMT it is the Tesseract topology: current-state↔target-state evolution across time. Every edge of the 3D cube is doubled here into a fourth axis.',
  edgeHex: '#C4B0E8', faceHex: '#6A60A0', faceOpacity: 0,
  rotX: 0, rotY: 0, rotZ: 0, special: 'tesseract'
}
```

No group rotation — the 4D projection animation provides all visual motion. `faceOpacity: 0` because there are no face meshes (lines only).

**Per-frame update hook in `SacredShape.tick()`:**
```js
// Same pattern as the existing Merkaba special case:
if (this.cfg.special === 'tesseract') this._updateTesseract4D(boost);
```
`_updateTesseract4D(boost)` advances the two rotation angles, reprojects all 16 vertices, fills `_tet4pos`, and sets `_tet4geo.attributes.position.needsUpdate = true`. It is called before `this.renderer.render(scene, camera)` each frame.

---

### Stellated Dodecahedron — `_buildStellatedDodecahedron()`

**Base:** 20 dodecahedron vertices using the known formula (φ = golden ratio):
- `(±1, ±1, ±1)` — 8 cube vertices
- `(0, ±φ, ±1/φ)`, `(±1/φ, 0, ±φ)`, `(±φ, ±1/φ, 0)` — 12 rectangle vertices

**12 pentagonal faces:** Hardcoded vertex index groups (known dodecahedron topology).

**Spike construction:**
```
For each pentagonal face [v0, v1, v2, v3, v4]:
  centroid = average of 5 vertex positions
  normal = normalize(centroid)  // faces of a regular dodecahedron point radially
  spike_tip = centroid + normal × spikeHeight  // spikeHeight ≈ 0.8
  triangles: [v0,v1,tip], [v1,v2,tip], [v2,v3,tip], [v3,v4,tip], [v4,v0,tip]
```

**Total: 60 triangular faces** (12 faces × 5 triangles). CLAUDE.md invariant.

**Materials:** `MeshPhongMaterial` on faces + `buildGlowEdge` on spike edges (connecting base vertices to spike tip, 5 edges per face = 60 spike edges + 30 base edges = 90 total).

**Catalogue entry:**
```js
{
  id: 'steldodeca', name: 'Stellated Dodecahedron', element: 'Cosmos', elementColor: '#9B7BE0',
  facts: 'Base faces: 12 -- Spike faces: 60 -- Spike edges: 90',
  meaning: "The dodecahedron elevated — each pentagonal face becomes a pentagram pyramid. Plato's cosmic solid given its complete sacred expression. The 12 pentagram spikes encode the zodiac dimensions. In ContextForge this represents the system-of-systems fully articulated.",
  edgeHex: '#9B7BE0', faceHex: '#4A2D90', faceOpacity: .12,
  rotX: .002, rotY: .005, rotZ: .002, special: 'stellateddodeca'
}
```

---

## Section 03 Layout Change

The `s2d-grid` currently holds 2 cards (FOL + 2D Metatron). Fleet 21 adds a third:

| Card | Scene class | Canvas id |
|---|---|---|
| Flower of Life | `FOLScene` | `geo-folCanvas` |
| Metatron's Cube (2D) | `MetatronScene` | `geo-metCanvas` |
| Metatron's Cube (3D) | `Metatron3DScene` | `geo-met3dCanvas` |

**CSS change:** `.s2d-grid` updates from `repeat(2, 1fr)` to `repeat(3, 1fr)` on desktop (≥768px). Collapses to `1fr` on mobile — same breakpoint as the rest of the section.

The 3D card has its own **Lines / Nodes / Both** mode pill row (within the card, not section-global).

---

## Testing

### Unit tests — `tests/unit/geometry.test.js`

Four new tests (pure geometry helpers, no DOM or THREE):

```js
test('Tesseract has 16 vertices', () => expect(buildTesseractVerts().length).toBe(16));
test('Tesseract has 32 edges', () => expect(buildTesseractEdges().length).toBe(32));
test('Stellated Dodecahedron has 60 triangular faces', () => expect(buildStelFaces().length).toBe(60));
test('4D projection: (1,0,0,0) at zero rotation projects to (1,0,0)', () => {
  const [x, y, z] = project4D([1, 0, 0, 0], 0, 0, 2.5);
  expect(x).toBeCloseTo(1); expect(y).toBeCloseTo(0); expect(z).toBeCloseTo(0);
});
```

Geometry helpers (`buildTesseractVerts`, `buildTesseractEdges`, `buildStelFaces`, `project4D`) are exported from `geometry.js` only when `typeof process !== 'undefined'` (test env guard), or extracted to `public/js/geometry/metatron3d.js`.

### E2E tests — `tests/e2e/sections.spec.js`

Three new tests in the `#geometry` describe block:

```js
test('3D Metatron canvas is non-zero', ...)
test('Tesseract card present in extended grid', ...)
test('Stellated Dodecahedron card present in extended grid', ...)
```

### Baseline targets

| Suite | Before Fleet 21 | After Fleet 21 |
|---|---|---|
| Jest | 81/81 | 85/85 |
| Playwright | 45/45 | 48/48 |

---

## Constraints

- THREE.js r128 global (`window.THREE`) — no imports
- Always `createRenderer(canvas)` — never `new THREE.WebGLRenderer()`
- Always 80ms setTimeout before reading canvas dimensions
- `buildGlowEdge` 4-layer spec for static geometries; 2-layer acceptable for dynamic (Tesseract)
- Each `init()` is idempotent — try/catch on all THREE constructors
- No group rotation for Tesseract — 4D animation provides all motion
