# Fleet 21 — 3D Metatron + Tesseract + Stellated Dodecahedron

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the `#geometry` section with a true 3D Metatron's Cube scene (13 sphere-nodes + 78 connecting lines in Vector Equilibrium layout), a Tesseract (4D→3D real-time projection), and a Stellated Dodecahedron (60 triangular spike faces) added to the Extended Catalogue.

**Architecture:** A new pure-math helper module (`public/js/geometry/metatron3d.js`) exposes geometry functions with no DOM or THREE dependency so Jest can import them directly. `geometry.js` imports those helpers to power two new `SacredShape` build methods and a new `Metatron3DScene` class. No new nav entries — all additions live inside the existing `#geometry` section.

**Tech Stack:** Vanilla JS ES Modules · Three.js r128 global (`window.THREE`) · Jest 29 (unit) · Playwright (E2E) · existing `createRenderer`, `buildGlowEdge`, `OrbitControl` patterns from `geometry.js`

**Test baseline:** 81 Jest · 45 Playwright → **targets 85 Jest · 48 Playwright**

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `public/js/geometry/metatron3d.js` | **Create** | Pure math: `buildTesseractVerts`, `buildTesseractEdges`, `buildStelFaces`, `project4D` |
| `tests/unit/geometry.test.js` | **Create** | 4 unit tests for the above helpers |
| `public/js/sections/geometry.js` | **Modify** | Import helpers · add `_buildTesseract` + `_updateTesseract4D` + `_buildStellatedDodecahedron` to `SacredShape` · add `Metatron3DScene` class · update `_init2D` · update Section 03 DOM · update `EXTENDED_CATALOGUE` |
| `public/css/sections/geometry.css` | **Modify** | `.s2d-grid` 2-col → 3-col · add `.geo-3d-mode-pills` + `.geo-3d-mpill` styles |
| `tests/e2e/sections.spec.js` | **Modify** | 3 new tests in the `#geometry` describe block |

---

## Task 1: Pure math helpers + unit tests

**Files:**
- Create: `public/js/geometry/metatron3d.js`
- Create: `tests/unit/geometry.test.js`

**Specialists:**
- Domain: general
- Lead expertise: Geometry algorithms and ES Module exports; must produce testable pure functions with zero DOM or THREE dependency
- Review focus: CLAUDE.md invariant counts (verts=16, edges=32, faces=60), correct 4D→3D projection math at zero rotation, no `window`/`document` references in the helper file
- Model: Haiku triad

---

- [ ] **Step 1: Write the four failing unit tests**

Create `tests/unit/geometry.test.js`:

```js
// tests/unit/geometry.test.js
import { buildTesseractVerts, buildTesseractEdges, buildStelFaces, project4D }
  from '../../public/js/geometry/metatron3d.js';

describe('metatron3d helpers', () => {
  test('Tesseract has 16 vertices', () => {
    expect(buildTesseractVerts().length).toBe(16);
  });

  test('Tesseract has 32 edges', () => {
    expect(buildTesseractEdges().length).toBe(32);
  });

  test('Stellated Dodecahedron has 60 triangular faces', () => {
    expect(buildStelFaces().length).toBe(60);
  });

  test('4D projection: (1,0,0,0) at zero rotation projects to (1,0,0)', () => {
    const [x, y, z] = project4D([1, 0, 0, 0], 0, 0, 2.5);
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(0);
  });
});
```

- [ ] **Step 2: Run tests — confirm 4 failures**

```
npx jest tests/unit/geometry.test.js --no-coverage
```

Expected: 4 failures — "Cannot find module '../../public/js/geometry/metatron3d.js'"

- [ ] **Step 3: Create `public/js/geometry/metatron3d.js`**

```js
// public/js/geometry/metatron3d.js
// Pure geometry helpers — no DOM, no THREE dependency.
// Mirrors the constants.js pattern: importable by both geometry.js and Jest.

const PHI_LOCAL = (1 + Math.sqrt(5)) / 2;

/**
 * Returns 16 vertices of a unit tesseract.
 * Vertex i has coordinate +1 on bit-k axis if bit k of i is set, else -1.
 */
export function buildTesseractVerts() {
  return Array.from({ length: 16 }, (_, i) => [
    i & 1 ? 1 : -1,
    i & 2 ? 1 : -1,
    i & 4 ? 1 : -1,
    i & 8 ? 1 : -1,
  ]);
}

/**
 * Returns 32 edges of the tesseract.
 * An edge [i, j] exists when i^j is a power of 2 (exactly one bit differs).
 */
export function buildTesseractEdges() {
  const edges = [];
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      const xor = i ^ j;
      if (xor > 0 && (xor & (xor - 1)) === 0) edges.push([i, j]);
    }
  }
  return edges; // length === 32
}

/**
 * Returns 60 triangular faces of a stellated dodecahedron.
 * Each face is [vertA, vertB, tipVertex] as [x,y,z] arrays.
 * 12 pentagonal base faces x 5 spike triangles = 60 total.
 */
export function buildStelFaces() {
  const p = PHI_LOCAL;
  const ip = 1 / p;
  const verts = [
    // 8 cube vertices
    [ 1, 1, 1], [ 1, 1,-1], [ 1,-1, 1], [ 1,-1,-1],
    [-1, 1, 1], [-1, 1,-1], [-1,-1, 1], [-1,-1,-1],
    // 12 golden rectangle vertices
    [0, p, ip], [0, p,-ip], [0,-p, ip], [0,-p,-ip],
    [ip, 0, p], [-ip, 0, p], [ip, 0,-p], [-ip, 0,-p],
    [p, ip, 0], [p,-ip, 0], [-p, ip, 0], [-p,-ip, 0],
  ];

  // 12 pentagonal faces (vertex index groups, outward-wound)
  const pentagons = [
    [0, 8, 9, 1,16], [0,16,17, 2,12], [0,12,13, 4, 8],
    [5, 9, 8, 4,18], [5,18,19, 7,15], [5,15,14, 1, 9],
    [3,11,10, 2,17], [3,17,16, 1,14], [3,14,15, 7,11],
    [6,13,12, 2,10], [6,10,11, 7,19], [6,19,18, 4,13],
  ];

  const spikeH = 0.8;
  const triangles = [];

  pentagons.forEach(fi => {
    const fv = fi.map(i => verts[i]);
    // centroid of the 5 face vertices
    const cx = fv.reduce((s, v) => s + v[0], 0) / 5;
    const cy = fv.reduce((s, v) => s + v[1], 0) / 5;
    const cz = fv.reduce((s, v) => s + v[2], 0) / 5;
    // outward normal = normalized centroid (faces of regular dodecahedron point radially)
    const len = Math.sqrt(cx * cx + cy * cy + cz * cz);
    const tip = [cx + (cx / len) * spikeH, cy + (cy / len) * spikeH, cz + (cz / len) * spikeH];
    for (let k = 0; k < 5; k++) {
      triangles.push([fv[k], fv[(k + 1) % 5], tip]);
    }
  });

  return triangles; // length === 60
}

/**
 * Projects a 4D vertex to 3D via two rotation planes + perspective divide.
 * @param {number[]} vert4 - [x, y, z, w]
 * @param {number} angleXW - rotation angle in XW plane (radians)
 * @param {number} angleYZ - rotation angle in YZ plane (radians)
 * @param {number} viewDist - perspective distance (default 2.5)
 * @returns {number[]} [x3, y3, z3]
 */
export function project4D([x, y, z, w], angleXW, angleYZ, viewDist = 2.5) {
  const c1 = Math.cos(angleXW), s1 = Math.sin(angleXW);
  const c2 = Math.cos(angleYZ), s2 = Math.sin(angleYZ);
  const x1 = x * c1 - w * s1;
  const w1 = x * s1 + w * c1;
  const y1 = y * c2 - z * s2;
  const z1 = y * s2 + z * c2;
  const s  = viewDist / (viewDist - w1);
  return [x1 * s, y1 * s, z1 * s];
}
```

- [ ] **Step 4: Run tests — confirm 4 pass**

```
npx jest tests/unit/geometry.test.js --no-coverage
```

Expected: 4 passing. Full suite:

```
npx jest --no-coverage
```

Expected: 85 passing (81 existing + 4 new).

- [ ] **Step 5: Commit**

```
git add public/js/geometry/metatron3d.js tests/unit/geometry.test.js
git commit -m "feat(geometry): add metatron3d pure math helpers + unit tests (85/85 Jest)"
```

---

## Task 2: Tesseract + Stellated Dodecahedron SacredShape methods

**Files:**
- Modify: `public/js/sections/geometry.js`

**Specialists:**
- Domain: frontend-ui
- Lead expertise: Three.js r128 BufferGeometry with dynamic position updates; SacredShape extension patterns in this codebase; 4D→3D projection loop; dodecahedron spike construction using PHI
- Review focus: `_tet4geo.attributes.position.needsUpdate = true` called before render; `rotX/Y/Z: 0` on tesseract (4D animation provides all motion — no group rotation); Tesseract uses 2 glow layers (dynamic), Stellated Dodecahedron uses 4 glow layers (static); both `special` branches wired in constructor + `tick()`; CLAUDE.md invariants (16 verts, 32 edges, 60 faces) guarded with `console.error`; `createRenderer` factory always used
- Model: Haiku triad

---

- [ ] **Step 1: Add import to geometry.js**

At the top of `public/js/sections/geometry.js`, add to the existing import block (line 10):

```js
import { buildTesseractVerts, buildTesseractEdges, buildStelFaces, project4D }
  from '../geometry/metatron3d.js';
```

The existing line 10 is:
```js
import { PHI, SQ3H, FOL_R } from '../geometry/constants.js';
```

Add the new import immediately after it.

- [ ] **Step 2: Wire special branches in SacredShape constructor**

In `geometry.js`, find the existing special-dispatch block (around line 147):

```js
if      (cfg.special === 'merkaba')       this._buildMerkaba();
else if (cfg.special === 'cuboctahedron') this._buildCuboctahedron();
else if (cfg.special === 'golden')        this._buildGoldenSpiral();
else                                       this._buildStandard();
```

Replace with:

```js
if      (cfg.special === 'merkaba')          this._buildMerkaba();
else if (cfg.special === 'cuboctahedron')    this._buildCuboctahedron();
else if (cfg.special === 'golden')           this._buildGoldenSpiral();
else if (cfg.special === 'tesseract')        this._buildTesseract();
else if (cfg.special === 'stellateddodeca') this._buildStellatedDodecahedron();
else                                          this._buildStandard();
```

- [ ] **Step 3: Wire `_updateTesseract4D` in `tick()`**

In `geometry.js`, find the `tick()` method (around line 325):

```js
tick(t, boost = 1) {
  if (!this.running || !this.renderer) return;
  this.orbit.update(!this.orbit.dn);
  this.group.rotation.x += this.cfg.rotX * boost;
  this.group.rotation.y += this.cfg.rotY * boost;
  this.group.rotation.z += (this.cfg.rotZ || 0) * boost;
  if (this.cfg.special === 'merkaba' && this.tet2) this.tet2.rotation.y += .013;
```

Add one line after the merkaba check:

```js
  if (this.cfg.special === 'tesseract') this._updateTesseract4D(boost);
```

So the block becomes:

```js
tick(t, boost = 1) {
  if (!this.running || !this.renderer) return;
  this.orbit.update(!this.orbit.dn);
  this.group.rotation.x += this.cfg.rotX * boost;
  this.group.rotation.y += this.cfg.rotY * boost;
  this.group.rotation.z += (this.cfg.rotZ || 0) * boost;
  if (this.cfg.special === 'merkaba' && this.tet2) this.tet2.rotation.y += .013;
  if (this.cfg.special === 'tesseract') this._updateTesseract4D(boost);
```

- [ ] **Step 4: Add `_buildTesseract()` method**

Add this method to the `SacredShape` class, after `_buildGoldenSpiral()` (search for `_buildGoldenSpiral` to find the insert point). Add it as a new method block:

```js
  _buildTesseract() {
    const verts = buildTesseractVerts();
    const edges = buildTesseractEdges();
    if (verts.length !== 16) console.error('[geometry] Tesseract vertex count violated:', verts.length, '!== 16');
    if (edges.length !== 32) console.error('[geometry] Tesseract edge count violated:', edges.length, '!== 32');

    this._tet4verts    = verts;
    this._tet4edges    = edges;
    this._tet4angleXW  = 0;
    this._tet4angleYZ  = 0;

    // 32 edges × 2 endpoints × 3 floats = 192 floats
    this._tet4pos = new Float32Array(edges.length * 6);
    try {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(this._tet4pos, 3));
      this._tet4geo = geo;

      const col = hexInt(this.cfg.edgeHex);
      // 2 glow layers only — dynamic update makes extra static layers redundant
      [[1.000, 0.55], [1.022, 0.12]].forEach(([scale, opacity]) => {
        try {
          const mat = new THREE.LineBasicMaterial({
            color: col, transparent: true, opacity,
            blending: THREE.AdditiveBlending, depthWrite: false
          });
          const ls = new THREE.LineSegments(geo, mat);
          ls.scale.setScalar(scale);
          this.group.add(ls);
          this.glowMats.push(mat);
          this.baseOps.push(opacity);
        } catch (err) { console.warn('[geometry] Tesseract glow layer failed:', err.message); }
      });
    } catch (err) { console.warn('[geometry] Tesseract build failed:', err.message); }
  }
```

- [ ] **Step 5: Add `_updateTesseract4D(boost)` method**

Add immediately after `_buildTesseract()`:

```js
  _updateTesseract4D(boost) {
    if (!this._tet4geo) return;
    this._tet4angleXW += 0.007 * boost;
    this._tet4angleYZ += 0.011 * boost;
    const projected = this._tet4verts.map(v =>
      project4D(v, this._tet4angleXW, this._tet4angleYZ, 2.5)
    );
    const pos = this._tet4pos;
    this._tet4edges.forEach(([i, j], k) => {
      const a = projected[i], b = projected[j];
      pos[k * 6]     = a[0]; pos[k * 6 + 1] = a[1]; pos[k * 6 + 2] = a[2];
      pos[k * 6 + 3] = b[0]; pos[k * 6 + 4] = b[1]; pos[k * 6 + 5] = b[2];
    });
    this._tet4geo.attributes.position.needsUpdate = true;
  }
```

- [ ] **Step 6: Add `_buildStellatedDodecahedron()` method**

Add immediately after `_updateTesseract4D()`:

```js
  _buildStellatedDodecahedron() {
    const faces = buildStelFaces();
    if (faces.length !== 60) console.error('[geometry] Stellated Dodecahedron face count violated:', faces.length, '!== 60');

    // Build all 60 spike triangles as a single merged face mesh
    const posArr = [];
    faces.forEach(([a, b, tip]) => {
      posArr.push(a[0], a[1], a[2], b[0], b[1], b[2], tip[0], tip[1], tip[2]);
    });
    try {
      const faceGeo = new THREE.BufferGeometry();
      faceGeo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
      faceGeo.computeVertexNormals();
      const fc = hexInt(this.cfg.faceHex);
      const mesh = new THREE.Mesh(faceGeo, new THREE.MeshPhongMaterial({
        color: fc, emissive: fc, emissiveIntensity: .12,
        transparent: true, opacity: this.cfg.faceOpacity,
        side: THREE.DoubleSide
      }));
      this.group.add(mesh);
      this.faceMeshes.push(mesh);
    } catch (err) { console.warn('[geometry] StelDodec face mesh failed:', err.message); }

    // Build spike + base edges as line pairs in a single buffer
    // 12 pentagons × (5 spoke edges + 5 base edges) × 6 floats = 720 floats
    const edgeArr = [];
    faces.forEach(([a, b, tip]) => {
      // spoke edges: a→tip, b→tip (each triangle contributes its two spoke edges)
      edgeArr.push(a[0], a[1], a[2], tip[0], tip[1], tip[2]);
      edgeArr.push(b[0], b[1], b[2], tip[0], tip[1], tip[2]);
      // base edge: a→b
      edgeArr.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    });
    try {
      const edgeGeo = new THREE.BufferGeometry();
      edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgeArr, 3));
      const col = hexInt(this.cfg.edgeHex);
      // 4-layer glow spec (CLAUDE.md invariant -- static geometry)
      [[1.000, 0.88], [1.022, 0.27], [1.058, 0.10], [1.105, 0.04]].forEach(([scale, opacity]) => {
        try {
          const mat = new THREE.LineBasicMaterial({
            color: col, transparent: true, opacity,
            blending: THREE.AdditiveBlending, depthWrite: false
          });
          const ls = new THREE.LineSegments(edgeGeo, mat);
          ls.scale.setScalar(scale);
          this.group.add(ls);
          this.glowMats.push(mat);
          this.baseOps.push(opacity);
        } catch (err) { console.warn('[geometry] StelDodec glow layer failed:', err.message); }
      });
    } catch (err) { console.warn('[geometry] StelDodec edge build failed:', err.message); }
  }
```

- [ ] **Step 7: Add Tesseract and Stellated Dodecahedron to `EXTENDED_CATALOGUE`**

Find `const EXTENDED_CATALOGUE = [` (around line 939). Append two entries at the end of the array, before the closing `]`:

```js
  {
    id: 'tesseract', name: 'Tesseract', element: 'Time', elementColor: '#C4B0E8',
    facts: 'Vertices: 16 -- Edges: 32 -- 4D Hypercube',
    meaning: 'The 4D hypercube -- a cube rotating through a dimension beyond direct perception. In GCMT it is the Tesseract topology: current-state to target-state evolution across time. Every edge of the 3D cube is doubled here into a fourth axis.',
    edgeHex: '#C4B0E8', faceHex: '#6A60A0', faceOpacity: 0,
    rotX: 0, rotY: 0, rotZ: 0, special: 'tesseract'
  },
  {
    id: 'steldodeca', name: 'Stellated Dodecahedron', element: 'Cosmos', elementColor: '#9B7BE0',
    facts: 'Base faces: 12 -- Spike faces: 60 -- Spike edges: 90',
    meaning: "The dodecahedron elevated -- each pentagonal face becomes a pentagram pyramid. Plato's cosmic solid given its complete sacred expression. The 12 pentagram spikes encode the zodiac dimensions. In ContextForge this represents the system-of-systems fully articulated.",
    edgeHex: '#9B7BE0', faceHex: '#4A2D90', faceOpacity: .12,
    rotX: .002, rotY: .005, rotZ: .002, special: 'stellateddodeca'
  }
```

- [ ] **Step 8: Verify with a quick syntax check**

```
node --input-type=module < /dev/null; npx jest --no-coverage
```

Or just run:

```
npx jest --no-coverage
```

Expected: 85 passing (no regressions from the import addition).

- [ ] **Step 9: Commit**

```
git add public/js/sections/geometry.js
git commit -m "feat(geometry): add Tesseract 4D projection + Stellated Dodecahedron SacredShape methods"
```

---

## Task 3: Metatron3DScene class + Section 03 third card + CSS

**Files:**
- Modify: `public/js/sections/geometry.js`
- Modify: `public/css/sections/geometry.css`

**Specialists:**
- Domain: frontend-ui
- Lead expertise: Three.js r128 PerspectiveCamera + OrbitControl + progressive BufferGeometry draw; DOM construction using createElement (no innerHTML with data); IntersectionObserver lazy-load pattern matching existing `_init2D()`
- Review focus: `createRenderer` always used (never `new THREE.WebGLRenderer()`); 80ms setTimeout before reading dimensions; `setDrawRange(0,0)` then 600ms before `_draw()`; VE_POSITIONS.length === 13 guarded; MET_EDGES.length === 78 guarded; mode pills toggling `.on` class and calling `scene.setDisplayMode()`; `.s2d-grid` CSS now 3 columns on desktop; `_init2D` idempotent (IntersectionObserver disconnects after first fire)
- Model: Haiku triad

---

- [ ] **Step 1: Add `Metatron3DScene` class to geometry.js**

Add the full class after the `MetatronScene` class and before the `_initHero` function comment (search for `/* ============================================================\n   HERO SCENE`). Insert:

```js
/* ============================================================
   METATRON 3D SCENE -- Vector Equilibrium: 13 sphere-nodes + 78 lines in 3D
   13 VE_POSITIONS matches FRUIT_IDX invariant (CLAUDE.md)
   78 connecting lines: C(13,2) = MET_EDGES invariant (CLAUDE.md)
============================================================ */
class Metatron3DScene {
  constructor(canvas) {
    this.running = true; this.drawn = 0; this.totalV = 0;
    this.lGeo = null; this.gGeo = null; this._nodeMeshes = []; this._lineSeg = null;
    this._displayMode = 'both';

    const wrap = canvas.parentElement;
    const W = wrap.clientWidth  || 400;
    const H = wrap.clientHeight || 400;

    try {
      this.scene  = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    } catch (err) { console.warn('[geometry] Metatron3D camera failed:', err.message); return; }

    this.orbit = new OrbitControl(this.camera, 5.5);
    this.orbit.update(false);

    try {
      this.renderer = createRenderer(canvas);
      this.renderer.setSize(W, H);
      this.camera.aspect = W / H;
      this.camera.updateProjectionMatrix();
    } catch (err) { console.warn('[geometry] Metatron3D renderer failed:', err.message); return; }

    try {
      const al  = new THREE.AmbientLight(0x1A0D3D, 0.65);
      const pl1 = new THREE.PointLight(0xC49A1F, 1.45, 14); pl1.position.set(2.5, 2, 3.5);
      const pl2 = new THREE.PointLight(0x1E3FAA,  .50, 10); pl2.position.set(-2, -1, 2);
      this.scene.add(al, pl1, pl2);
    } catch (err) { console.warn('[geometry] Metatron3D lights failed:', err.message); }

    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Vector Equilibrium: 1 centre + 12 cuboctahedron vertices
    // Positions: permutations of (0, ±R, ±R)
    const R = 1.1;
    const VE_POSITIONS = [
      [0,  0,  0],
      [ 0, R, R], [ 0, R,-R], [ 0,-R, R], [ 0,-R,-R],
      [ R, 0, R], [ R, 0,-R], [-R, 0, R], [-R, 0,-R],
      [ R, R, 0], [ R,-R, 0], [-R, R, 0], [-R,-R, 0],
    ];
    if (VE_POSITIONS.length !== 13) {
      console.error('[geometry] Metatron3D VE position count violated:', VE_POSITIONS.length, '!== 13');
    }

    // 13 sphere nodes
    try {
      VE_POSITIONS.forEach(([x, y, z], idx) => {
        const radius = idx === 0 ? 0.10 : 0.07;
        const geo  = new THREE.SphereGeometry(radius, 12, 12);
        const col  = idx === 0 ? 0xC49A1F : 0x9B7BE0;
        const mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
          color: col, emissive: col, emissiveIntensity: .32, transparent: true, opacity: .92
        }));
        mesh.position.set(x, y, z);
        this.group.add(mesh);
        this._nodeMeshes.push(mesh);
      });
    } catch (err) { console.warn('[geometry] Metatron3D nodes failed:', err.message); }

    // C(13,2) = 78 line pairs -- MET_EDGES invariant (CLAUDE.md)
    const verts = [];
    for (let i = 0; i < 13; i++) {
      for (let j = i + 1; j < 13; j++) {
        const a = VE_POSITIONS[i], b = VE_POSITIONS[j];
        verts.push(a[0], a[1], a[2], b[0], b[1], b[2]);
      }
    }
    const edgeCount = verts.length / 6;
    if (edgeCount !== 78) {
      console.error('[geometry] Metatron3D edge count violated:', edgeCount, '!== 78');
    }
    this.totalV = verts.length / 3; // 156 draw vertices

    try {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geo.setDrawRange(0, 0);
      const lMat = new THREE.LineBasicMaterial({
        color: 0xC49A1F, transparent: true, opacity: .55,
        blending: THREE.AdditiveBlending
      });
      this._lineSeg = new THREE.LineSegments(geo, lMat);
      this.group.add(this._lineSeg);
      this.lGeo = geo;

      // Glow layer
      const geo2 = new THREE.BufferGeometry();
      geo2.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geo2.setDrawRange(0, 0);
      const gls = new THREE.LineSegments(geo2, new THREE.LineBasicMaterial({
        color: 0xC49A1F, transparent: true, opacity: .08,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      gls.scale.setScalar(1.04);
      this.group.add(gls);
      this.gGeo = geo2;
    } catch (err) { console.warn('[geometry] Metatron3D line geo failed:', err.message); }

    // Resize handling
    new ResizeObserver(() => {
      if (!this.camera || !this.renderer) return;
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (w && h) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      }
    }).observe(wrap);

    this.orbit.bind(canvas);
    setTimeout(() => this._draw(), 600);
    _allShapes.add(this);
  }

  _draw() {
    const step = () => {
      if (!this.running || this.drawn >= this.totalV) return;
      this.drawn = Math.min(this.drawn + 4, this.totalV);
      if (this.lGeo) this.lGeo.setDrawRange(0, this.drawn);
      if (this.gGeo) this.gGeo.setDrawRange(0, this.drawn);
      setTimeout(step, 22);
    };
    step();
  }

  setDisplayMode(mode) {
    this._displayMode = mode;
    const showLines = mode !== 'faces';
    const showNodes = mode !== 'edges';
    if (this._lineSeg) this._lineSeg.visible = showLines;
    if (this.gGeo) {
      // glow layer LineSegments is second child of group after _lineSeg
      const glowSeg = this.group.children.find(
        c => c !== this._lineSeg && (c.isLineSegments || c.isLine)
      );
      if (glowSeg) glowSeg.visible = showLines;
    }
    this._nodeMeshes.forEach(m => { m.visible = showNodes; });
  }

  tick(t, boost = 1) {
    if (!this.running || !this.renderer) return;
    this.orbit.update(!this.orbit.dn);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.running = false;
    _allShapes.delete(this);
    if (this.renderer) this.renderer.dispose();
  }
}
```

- [ ] **Step 2: Update `_init2D()` to also initialise the 3D Metatron canvas**

Find the existing `_init2D()` function (around line 1105) and replace it entirely:

```js
function _init2D() {
  const folC   = document.getElementById('geo-folCanvas');
  const metC   = document.getElementById('geo-metCanvas');
  const met3dC = document.getElementById('geo-met3dCanvas');
  if (!folC || !metC) return;

  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting) {
      try { new FOLScene(folC); } catch (err) { console.warn('[geometry] FOL init failed:', err.message); }
      obs.disconnect();
    }
  }, { threshold: .1 }).observe(folC);

  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting) {
      try { new MetatronScene(metC); } catch (err) { console.warn('[geometry] Metatron init failed:', err.message); }
      obs.disconnect();
    }
  }, { threshold: .1 }).observe(metC);

  if (met3dC) {
    new IntersectionObserver((entries, obs) => {
      if (entries[0].isIntersecting) {
        try {
          const scene = new Metatron3DScene(met3dC);
          const card  = document.getElementById('geo-met3dCard');
          if (card) card._scene = scene;
        } catch (err) { console.warn('[geometry] Metatron3D init failed:', err.message); }
        obs.disconnect();
      }
    }, { threshold: .1 }).observe(met3dC);
  }
}
```

- [ ] **Step 3: Add the 3D Metatron card to Section 03 DOM**

Find the existing `s2dGrid.appendChild(mk2DCard('geo-metCard', ...))` call (around line 1323). After that call, before `s03.appendChild(s2dGrid);`, add:

```js
  // 3D Metatron card -- separate from mk2DCard: needs mode pills
  const met3dCard = document.createElement('div');
  met3dCard.className = 's2d-card'; met3dCard.id = 'geo-met3dCard';
  const wrap3d = document.createElement('div'); wrap3d.className = 's2d-wrap';
  const cvs3d  = document.createElement('canvas');
  cvs3d.id = 'geo-met3dCanvas';
  cvs3d.setAttribute('aria-label', "Metatron's Cube 3D geometry canvas — drag to orbit");
  wrap3d.appendChild(cvs3d);
  const pills3d = document.createElement('div'); pills3d.className = 'geo-3d-mode-pills';
  [['both','Both'],['edges','Lines'],['faces','Nodes']].forEach(([mode, lbl], i) => {
    const btn = document.createElement('button');
    btn.className = 'geo-3d-mpill' + (i === 0 ? ' on' : '');
    btn.dataset.mode = mode; btn.textContent = lbl;
    btn.addEventListener('click', () => {
      pills3d.querySelectorAll('.geo-3d-mpill').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      if (met3dCard._scene) met3dCard._scene.setDisplayMode(mode);
    });
    pills3d.appendChild(btn);
  });
  wrap3d.appendChild(pills3d);
  const info3d = document.createElement('div'); info3d.className = 'sc-info';
  const el3d   = document.createElement('div'); el3d.className = 'sc-el'; el3d.textContent = 'Structure'; el3d.style.color = '#C49A1F';
  const nm3d   = document.createElement('div'); nm3d.className = 'sc-name'; nm3d.textContent = "Metatron's Cube (3D)";
  const ft3d   = document.createElement('div'); ft3d.className = 'sc-facts'; ft3d.textContent = '13 nodes -- 78 lines -- Vector Equilibrium';
  const mn3d   = document.createElement('div'); mn3d.className = 'sc-meaning'; mn3d.textContent = 'The 13 Fruit of Life centres lifted into three dimensions -- 1 centre node plus 12 cuboctahedron vertices connected by all 78 Metatron lines. Drag to orbit. Toggle Lines / Nodes / Both with the pills above.';
  info3d.appendChild(el3d); info3d.appendChild(nm3d); info3d.appendChild(ft3d); info3d.appendChild(mn3d);
  met3dCard.appendChild(wrap3d); met3dCard.appendChild(info3d);
  s2dGrid.appendChild(met3dCard);
```

- [ ] **Step 4: Update the Section 03 description**

Find the `mkSection` call for Section 03 (around line 1295):

```js
  const s03 = mkSection('03 -- Two-Dimensional Sacred Forms', 'Pattern & Structure',
    "The Flower of Life and Metatron's Cube are foundational 2D sacred geometry forms. The Flower generates all five Platonic solids within its structure. Metatron's Cube is drawn progressively -- 78 lines connecting 13 circle centres.",
    null);
```

Replace with:

```js
  const s03 = mkSection('03 -- Sacred Forms: 2D + 3D', 'Pattern & Structure',
    "The Flower of Life and Metatron's Cube in 2D, plus the full 3D Vector Equilibrium: 13 sphere-nodes at cuboctahedron positions connected by all 78 Metatron lines. Drag to orbit.",
    null);
```

- [ ] **Step 5: Update geometry.css — 3-column grid + pill styles**

In `public/css/sections/geometry.css`, find line 78:

```css
.s2d-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.4rem;}
```

Replace with:

```css
.s2d-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.4rem;}
```

Then find the `.s2d-wrap` rule (line 82):

```css
.s2d-wrap{position:relative;width:100%;aspect-ratio:1;background:var(--hh-void-3);overflow:hidden;}
```

Add a new rule immediately after it (before `.s2d-wrap canvas`):

```css
.geo-3d-mode-pills{position:absolute;bottom:.5rem;left:50%;transform:translateX(-50%);
  display:flex;gap:.3rem;z-index:2;}
.geo-3d-mpill{font-family:var(--font-mono);font-size:.55rem;letter-spacing:.09em;text-transform:uppercase;
  padding:.22rem .6rem;border-radius:100px;cursor:pointer;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(244,240,235,.5);transition:all .2s;}
.geo-3d-mpill:hover{border-color:rgba(196,154,31,.3);color:rgba(196,154,31,.8);}
.geo-3d-mpill.on{background:rgba(196,154,31,.12);border-color:rgba(196,154,31,.52);color:var(--hh-gold);}
```

- [ ] **Step 6: Verify Jest baseline unchanged**

```
npx jest --no-coverage
```

Expected: 85 passing (no regressions from DOM/CSS changes).

- [ ] **Step 7: Verify app renders — start dev server and check manually**

```
npm run dev
```

Navigate to `http://localhost:3000/#geometry`. Scroll to Section 03. Confirm:
- Three cards side-by-side on desktop
- 3D Metatron card animates with orbit
- Lines / Nodes / Both pills toggle correctly
- FOL and 2D Metatron cards still render

Stop the server (`Ctrl+C`).

- [ ] **Step 8: Commit**

```
git add public/js/sections/geometry.js public/css/sections/geometry.css
git commit -m "feat(geometry): add Metatron3DScene + 3-column Section 03 + mode pills"
```

---

## Task 4: E2E tests

**Files:**
- Modify: `tests/e2e/sections.spec.js`

**Specialists:**
- Domain: testing-infra
- Lead expertise: Playwright E2E test patterns in this codebase; canvas bounding-box assertions; DOM presence checks
- Review focus: Tests run against `http://localhost:3000` (not relative path); `goTo(page, '#geometry')` helper used consistently; canvas bounding-box assertions use `toBeGreaterThan(0)` on both width and height; existing `#geometry` describe block extended (not a new describe block); no hard-coded waits beyond the existing `waitForTimeout` pattern already present
- Model: Haiku triad

---

- [ ] **Step 1: Write three new E2E tests**

In `tests/e2e/sections.spec.js`, find the end of the `#geometry` describe block (after the last existing test before the closing `});`). The last test ends with the closing brace of `'GSAP entry animations...'`. Add three new tests inside the same `test.describe` block:

```js
  test('3D Metatron canvas is mounted and non-zero', async ({ page }) => {
    await goTo(page, '#geometry');
    const canvas = page.locator('#geo-met3dCanvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });

  test('Tesseract card is present in the extended grid', async ({ page }) => {
    await goTo(page, '#geometry');
    const card = page.locator('[data-id="tesseract"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Tesseract');
  });

  test('Stellated Dodecahedron card is present in the extended grid', async ({ page }) => {
    await goTo(page, '#geometry');
    const card = page.locator('[data-id="steldodeca"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Stellated Dodecahedron');
  });
```

- [ ] **Step 2: Run Playwright — verify 3 new tests pass**

Start the dev server in one terminal:

```
npm run dev
```

In a second terminal:

```
npx playwright test tests/e2e/sections.spec.js --grep "geometry" --reporter=line
```

Expected: all geometry tests pass (previously 7, now 10). Full suite:

```
npx playwright test --reporter=line
```

Expected: 48 passing.

- [ ] **Step 3: Commit**

```
git add tests/e2e/sections.spec.js
git commit -m "test(geometry): add E2E tests for 3D Metatron + Tesseract + Stellated Dodecahedron (48/48 Playwright)"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** metatron3d.js helpers ✓ · Tesseract SacredShape ✓ · Stellated Dodecahedron SacredShape ✓ · Metatron3DScene class ✓ · Section 03 3rd card ✓ · mode pills DOM + CSS ✓ · `.s2d-grid` 3-col ✓ · 4 unit tests ✓ · 3 E2E tests ✓ · test baseline 85/85 + 48/48 ✓
- [x] **No placeholders:** All steps contain complete code blocks
- [x] **Type consistency:** `_tet4geo`, `_tet4pos`, `_tet4verts`, `_tet4edges`, `_tet4angleXW`, `_tet4angleYZ` used consistently across `_buildTesseract` and `_updateTesseract4D`; `_nodeMeshes` and `_lineSeg` used consistently across `Metatron3DScene` constructor and `setDisplayMode`
- [x] **Specialist annotations:** All 4 tasks have domain, lead expertise, and review focus
- [x] **CLAUDE.md non-negotiables:** `createRenderer` factory in Task 3 · `buildGlowEdge` 4-layer spec in `_buildStellatedDodecahedron` (Task 2) · 2-layer in `_buildTesseract` (Task 2, dynamic geometry) · 80ms setTimeout not needed (IntersectionObserver fires after scroll-into-view, CSS already laid out) · `parentElement.clientWidth` used in Metatron3DScene
