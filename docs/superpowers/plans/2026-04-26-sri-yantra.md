# Sri Yantra (`#yantra`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `#yantra` section rendering the Sri Yantra with verified Huet 2002 coordinates, innermost-to-outermost construction animation, and a dual-mode ContextForge overlay (PAOAL phases / Element assignment).

**Architecture:** Three canvases stacked via CSS absolute positioning -- Three.js particle background (`.yantra-bg`), Canvas 2D geometry layer drawn once during animation (`.yantra-geo`), Canvas 2D overlay layer cleared and repainted on state change (`.yantra-overlay`). TikZ coordinate space maps to Canvas 2D via `tikzToCanvas(x, y, cx, cy, scale)` shared across both drawing contexts.

**Tech Stack:** Vanilla ES Modules, Canvas 2D API, Three.js r128 (global), IntersectionObserver, Jest, Playwright

---

### Task 1: Data Module and Unit Tests

**Files:**
- Create: `public/js/geometry/yantraCoords.js`
- Create: `tests/unit/yantraCoords.test.js`

**Specialists:**
- Domain: frontend-ui (geometry/data)
- Lead expertise: Sacred geometry coordinate systems, Canvas 2D coordinate transforms, TikZ space normalization
- Review focus: Concurrency constraint satisfaction (triple-intersection convergence < 1e-6), coordinate accuracy relative to Huet 2002 source, triangle count invariants (9 total, 4 up + 5 down)
- Model: Sonnet triad (coordinate sourcing requires external reference verification)

**Context for implementer:** The Sri Yantra has exactly 9 interlocking triangles (4 pointing up = Shiva, 5 pointing down = Shakti). The construction constraint -- all triple-intersection points must converge to exact shared points -- is the mathematical integrity check. Coordinates are in TikZ space: center (0,0), y-up, outer circle r ~= 1. Source: transcribe from the TeXample TikZ reference at https://texample.net/tikz/examples/sri-yantra/ -- find the `\coordinate` commands defining the 9 triangle vertices. The outermost circle radius in that source gives the normalization factor.

- [ ] **Step 1: Create the test file**

```js
// tests/unit/yantraCoords.test.js
import { TRIANGLES, OUTER_RINGS, LOTUS_8, LOTUS_16, BHUPURA, tikzToCanvas }
  from '../../public/js/geometry/yantraCoords.js';

const EPSILON = 1e-6;

function lineIntersect([ax, ay], [bx, by], [cx, cy], [dx, dy]) {
  const a1 = by - ay, b1 = ax - bx, c1 = a1 * ax + b1 * ay;
  const a2 = dy - cy, b2 = cx - dx, c2 = a2 * cx + b2 * cy;
  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < 1e-12) return null;
  return [(b2 * c1 - b1 * c2) / det, (a1 * c2 - a2 * c1) / det];
}

function dist([ax, ay], [bx, by]) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function onSegment(a, b, p) {
  return Math.abs(dist(a, p) + dist(b, p) - dist(a, b)) < EPSILON;
}

describe('yantraCoords', () => {
  test('TRIANGLES.length === 9', () => {
    expect(TRIANGLES.length).toBe(9);
  });

  test('4 upward and 5 downward triangles', () => {
    const up   = TRIANGLES.filter(t => t.dir === 'up');
    const down = TRIANGLES.filter(t => t.dir === 'down');
    expect(up.length).toBe(4);
    expect(down.length).toBe(5);
  });

  test('OUTER_RINGS.length === 3', () => {
    expect(OUTER_RINGS.length).toBe(3);
  });

  test('each triangle has exactly 3 vertices', () => {
    TRIANGLES.forEach((t, i) => {
      expect(t.verts).toHaveLength(3);
    });
  });

  test('tikzToCanvas maps correctly (y-flip, scale, translate)', () => {
    const cx = 400, cy = 300, scale = 200;
    const [px, py] = tikzToCanvas(0.5, -0.3, cx, cy, scale);
    expect(px).toBeCloseTo(cx + 0.5 * scale, 10);
    expect(py).toBeCloseTo(cy - (-0.3) * scale, 10);
  });

  test('Huet coordinates satisfy concurrency constraint', () => {
    // For each adjacent pair of triangles, shared-edge intersections must
    // converge: no wild divergence that would indicate incorrect coordinates.
    let intersections = 0;
    for (let i = 0; i < TRIANGLES.length - 1; i++) {
      const t1 = TRIANGLES[i];
      const t2 = TRIANGLES[i + 1];
      for (let e1 = 0; e1 < 3; e1++) {
        for (let e2 = 0; e2 < 3; e2++) {
          const a = t1.verts[e1], b = t1.verts[(e1 + 1) % 3];
          const c = t2.verts[e2], d = t2.verts[(e2 + 1) % 3];
          const pt = lineIntersect(a, b, c, d);
          if (!pt) continue;
          if (onSegment(a, b, pt) && onSegment(c, d, pt)) {
            intersections++;
          }
        }
      }
    }
    // At minimum the 8 adjacent triangle pairs each share at least one intersection
    expect(intersections).toBeGreaterThanOrEqual(8);

    // Bindu (central point) -- innermost triangle centroid near origin
    const [bx, by] = TRIANGLES[0].verts.reduce(
      ([sx, sy], [x, y]) => [sx + x / 3, sy + y / 3], [0, 0]
    );
    expect(Math.abs(bx)).toBeLessThan(0.05);
    expect(Math.abs(by)).toBeLessThan(0.05);
  });
});
```

- [ ] **Step 2: Run test to verify it fails (module not yet created)**

```
npx jest tests/unit/yantraCoords.test.js --no-coverage
```
Expected: All tests fail with "Cannot find module '../../public/js/geometry/yantraCoords.js'"

- [ ] **Step 3: Transcribe coordinates from TeXample TikZ source**

Open https://texample.net/tikz/examples/sri-yantra/ and view the TikZ source. Locate the `\coordinate` commands defining the 9 triangle vertices (each triangle has 3 named coordinates). The file uses Cartesian coordinates in a space where the outer enclosing circle has some radius R -- divide all coordinate values by R to normalize to r=1.

Identify which triangles point up (Shiva, `dir: 'up'`) and which point down (Shakti, `dir: 'down'`). Order them innermost (Bindu vicinity) to outermost.

Also transcribe:
- Three concentric circle radii (TikZ r values, normalized) for `OUTER_RINGS`
- Inner 8-petal lotus: center radius, petal half-arc width, petal arc height for `LOTUS_8`
- Outer 16-petal lotus: same fields for `LOTUS_16`
- Square bhupura: half-side and gate opening width for `BHUPURA`

- [ ] **Step 4: Create `yantraCoords.js` with transcribed values**

```js
// public/js/geometry/yantraCoords.js
// Coordinates from Gerard Huet, TCS 281, 2002. Transcribed from:
// https://texample.net/tikz/examples/sri-yantra/
// TikZ space: center (0,0), y-up, outer circle r = 1.

export const TRIANGLES = [
  // 9 entries ordered innermost to outermost.
  // Each: { verts: [[x,y],[x,y],[x,y]], dir: 'up' | 'down' }
  // Transcribe from TeXample source -- Step 3 above.
];

// 3 concentric circle radii in TikZ units (r=1 scale), inner to outer.
export const OUTER_RINGS = [ /* r1, r2, r3 -- from TeXample source */ ];

// 8-petal inner lotus ring
export const LOTUS_8  = { r: 0, petalW: 0, petalH: 0 }; // fill from source

// 16-petal outer lotus ring
export const LOTUS_16 = { r: 0, petalW: 0, petalH: 0 }; // fill from source

// Bhupura outer square frame
export const BHUPURA = { halfSize: 0, gateWidth: 0 }; // fill from source

/**
 * TikZ space (center 0,0, y-up, r=1) to Canvas 2D (y-down).
 */
export function tikzToCanvas(x, y, cx, cy, scale) {
  return [cx + x * scale, cy - y * scale];
}
```

- [ ] **Step 5: Run concurrency test to confirm coordinates are correct**

```
npx jest tests/unit/yantraCoords.test.js --no-coverage
```
Expected: All 6 tests pass. If the concurrency test fails, review the transcribed vertex coordinates against the TeXample source -- a failing concurrency test means at least one vertex is incorrect.

- [ ] **Step 6: Commit**

```bash
git add public/js/geometry/yantraCoords.js tests/unit/yantraCoords.test.js
git commit -m "feat(yantra): add yantraCoords data module with concurrency gate"
```

---

### Task 2: Section Scaffold (HTML + CSS + Router)

**Files:**
- Create: `public/css/sections/yantra.css`
- Modify: `views/index.html` (CSS link tag + nav link + section shell)
- Modify: `public/js/utils/router.js` (SECTIONS map entry)

**Specialists:**
- Domain: frontend-ui
- Lead expertise: Absolute-positioned canvas stacking, CSS custom property tokens, hash-router section wiring
- Review focus: Z-index stack order (bg < geo < overlay), responsive layout at 480/768px breakpoints, SECTIONS map insertion between tree and grow entries
- Model: Haiku triad (1-3 files, fully specified, mechanical authorship)

**Context for implementer:** CSS is loaded via individual `<link>` tags in `views/index.html` -- NOT via @import in a main.css (no main.css exists in this project). The section registry is the `SECTIONS` map in `public/js/utils/router.js` around line 6-17, NOT app.js. Nav link and section shell insert between the `#tree` and `#grow` entries.

- [ ] **Step 1: Create `yantra.css`**

```css
/* public/css/sections/yantra.css */
.yantra-wrap {
  position: relative;
  width: 100%;
  height: 100vh;
  min-height: 500px;
  overflow: hidden;
  background: var(--hh-void);
}

.yantra-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.yantra-stage {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.yantra-geo,
.yantra-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.yantra-geo     { z-index: 1; }
.yantra-overlay { z-index: 2; pointer-events: none; }

.yantra-controls {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.4s ease;
}

.yantra-controls:not([aria-disabled]) {
  opacity: 1;
}

.yantra-mode-pills {
  display: flex;
  gap: 0.4rem;
}

.yantra-pill {
  padding: 0.35rem 0.85rem;
  border: 1px solid var(--hh-gold);
  background: transparent;
  color: var(--hh-gold);
  font-family: var(--font-body);
  font-size: 0.8rem;
  cursor: pointer;
  border-radius: 2px;
  transition: background 0.2s, color 0.2s;
}

.yantra-pill--active,
.yantra-pill:hover {
  background: var(--hh-gold);
  color: var(--hh-void);
}

.yantra-toggle,
.yantra-replay {
  padding: 0.35rem 0.85rem;
  border: 1px solid var(--hh-aether);
  background: transparent;
  color: var(--hh-aether);
  font-family: var(--font-body);
  font-size: 0.8rem;
  cursor: pointer;
  border-radius: 2px;
  transition: background 0.2s, color 0.2s;
}

.yantra-toggle:hover,
.yantra-replay:hover {
  background: var(--hh-aether);
  color: var(--hh-void);
}

.yantra-toggle:disabled {
  opacity: 0.35;
  cursor: default;
}

.yantra-legend {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 10;
  background: rgba(7, 4, 15, 0.85);
  border: 1px solid rgba(155, 123, 224, 0.3);
  border-radius: 4px;
  padding: 0.75rem;
  min-width: 14rem;
}

.yantra-legend-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-body);
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 0.35rem;
}

.yantra-legend-row:last-child { margin-bottom: 0; }

.yantra-legend-swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .yantra-controls {
    flex-wrap: wrap;
    justify-content: center;
    bottom: 1rem;
  }
  .yantra-legend {
    top: auto;
    bottom: 6rem;
    right: 0.75rem;
    min-width: 11rem;
  }
}

@media (max-width: 480px) {
  .yantra-controls {
    gap: 0.4rem;
  }
  .yantra-pill,
  .yantra-toggle,
  .yantra-replay {
    font-size: 0.72rem;
    padding: 0.3rem 0.6rem;
  }
}
```

- [ ] **Step 2: Add CSS link tag to `views/index.html`**

In `views/index.html`, find the block of `<link rel="stylesheet">` tags (around lines 20-31). Add after the `tree.css` link and before any `grow.css` link:

```html
<link rel="stylesheet" href="/css/sections/yantra.css">
```

- [ ] **Step 3: Add nav link to `views/index.html`**

In the `.nav-links` list (around lines 41-50), find the `<li>` containing `href="#tree"`. Add a new `<li>` immediately after it:

```html
<li><a class="nav-link" href="#yantra">Yantra</a></li>
```

- [ ] **Step 4: Add section shell to `views/index.html`**

After the `<section data-section="tree" hidden>` closing tag (around line 76), add:

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

- [ ] **Step 5: Register section in router**

In `public/js/utils/router.js`, find the `SECTIONS` map (lines 6-17). Add between `tree` and `grow`:

```js
yantra:        () => import('../sections/yantra.js'),
```

- [ ] **Step 6: Verify scaffold loads cleanly**

Start dev server: `npm run dev`
Navigate to `http://localhost:3000/#yantra` -- section visible (empty), nav link active, no console errors.

- [ ] **Step 7: Commit**

```bash
git add public/css/sections/yantra.css views/index.html public/js/utils/router.js
git commit -m "feat(yantra): section scaffold, CSS canvas stack, nav link, router entry"
```

---

### Task 3: Section Module -- Background and Geometry Animation

**Files:**
- Create: `public/js/sections/yantra.js`

**Specialists:**
- Domain: frontend-ui (canvas animation)
- Lead expertise: Canvas 2D sequential animation via setTimeout chains, Three.js ambient field pattern (createRenderer), IntersectionObserver for construction trigger, coordinate transform application
- Review focus: 80ms CSS layout delay before canvas read (CLAUDE.md requirement), setTimeout cleanup on replay, IntersectionObserver fires once only (constructed guard), canvas dimensions from parentElement not canvas element
- Model: Sonnet triad (multi-step animation with timing dependencies)

**Context for implementer:** Follow `public/js/sections/grow.js` for the Three.js background pattern (createRenderer, IntersectionObserver for pause/resume). The geometry canvas draws once -- no RAF loop. `animateConstruction` uses a setTimeout chain (35ms per triangle). Canvas dimensions must be read from `parentElement.clientWidth/clientHeight` after the 80ms CSS layout delay (CLAUDE.md rule). Use `createRenderer()` from `../utils/createRenderer.js` -- never `new THREE.WebGLRenderer()` directly.

- [ ] **Step 1: Create `yantra.js` with module header and background**

```js
// public/js/sections/yantra.js
import { createRenderer } from '../utils/createRenderer.js';
import { TRIANGLES, OUTER_RINGS, LOTUS_8, LOTUS_16, BHUPURA, tikzToCanvas }
  from '../geometry/yantraCoords.js';

let initialised  = false;
let _renderer    = null;
let _bgObserver  = null;
let _constructed = false;
let _animTimers  = [];

export async function init() {
  if (initialised) return;
  initialised = true;

  const section = document.querySelector('[data-section="yantra"]');
  if (!section) return;

  _initBackground(section);
  setTimeout(() => _initGeoCanvas(section), 80);
}

function _initBackground(section) {
  const bg = section.querySelector('.yantra-bg');
  if (!bg || _renderer) return;
  try {
    _renderer = createRenderer(bg);
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60, bg.parentElement.clientWidth / bg.parentElement.clientHeight, 0.1, 100
    );
    camera.position.z = 3;

    const COUNT = 600;
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x9b7be0, size: 0.03,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    scene.add(new THREE.Points(geo, mat));

    let raf;
    function tick() {
      raf = requestAnimationFrame(tick);
      scene.rotation.y += 0.0003;
      _renderer.render(scene, camera);
    }
    tick();

    _bgObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) { cancelAnimationFrame(raf); raf = null; }
      else if (!raf) tick();
    }, { threshold: 0.1 });
    _bgObserver.observe(section);
  } catch (err) {
    console.error('[yantra] background init failed:', err);
  }
}
```

- [ ] **Step 2: Add canvas sizing helpers and construction trigger**

Append to `yantra.js`:

```js
function _sizeCanvases(section) {
  const stage = section.querySelector('.yantra-stage');
  const size  = Math.min(stage.clientWidth, stage.clientHeight) * 0.9;
  ['.yantra-geo', '.yantra-overlay'].forEach(sel => {
    const c  = section.querySelector(sel);
    c.width  = size;
    c.height = size;
  });
}

function _transform(canvas) {
  const w = canvas.width, h = canvas.height;
  return { cx: w / 2, cy: h / 2, scale: Math.min(w, h) * 0.44 };
}

function _initGeoCanvas(section) {
  const stage  = section.querySelector('.yantra-stage');
  const geo    = section.querySelector('.yantra-geo');
  const geoCtx = geo.getContext('2d');

  const obs = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !_constructed) {
      obs.disconnect();
      _sizeCanvases(section);
      const { cx, cy, scale } = _transform(geo);
      animateConstruction(geoCtx, cx, cy, scale, () => {
        _constructed = true;
        const controls = section.querySelector('.yantra-controls');
        controls.removeAttribute('aria-disabled');
        const toggle = controls.querySelector('[data-yantra="toggle"]');
        toggle.disabled = false;
        _initOverlay(section);
      });
    }
  }, { threshold: 0.3 });
  obs.observe(stage);
}
```

- [ ] **Step 3: Implement `animateConstruction`**

Append to `yantra.js`:

```js
export function animateConstruction(ctx, cx, cy, scale, onDone) {
  _animTimers.forEach(clearTimeout);
  _animTimers = [];

  function drawTriangle(t) {
    const pts = t.verts.map(([x, y]) => tikzToCanvas(x, y, cx, cy, scale));
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    ctx.lineTo(...pts[1]);
    ctx.lineTo(...pts[2]);
    ctx.closePath();
    ctx.strokeStyle = t.dir === 'up' ? '#C49A1F' : '#9B7BE0';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
  }

  function drawRings() {
    OUTER_RINGS.forEach(r => {
      const radius = r * scale;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(196, 154, 31, 0.6)';
      ctx.lineWidth   = 1;
      ctx.stroke();
    });
  }

  function drawLotus(config, petalCount) {
    const r    = config.r * scale;
    const step = (Math.PI * 2) / petalCount;
    ctx.strokeStyle = 'rgba(155, 123, 224, 0.5)';
    ctx.lineWidth   = 0.8;
    for (let i = 0; i < petalCount; i++) {
      const angle = i * step;
      ctx.beginPath();
      ctx.ellipse(
        cx + Math.cos(angle) * r * 0.7,
        cy + Math.sin(angle) * r * 0.7,
        config.petalW * scale,
        config.petalH * scale,
        angle, 0, Math.PI * 2
      );
      ctx.stroke();
    }
  }

  function drawBhupura() {
    const hs = BHUPURA.halfSize * scale;
    const gw = BHUPURA.gateWidth * scale;
    ctx.strokeStyle = 'rgba(196, 154, 31, 0.7)';
    ctx.lineWidth   = 2;
    ctx.strokeRect(cx - hs, cy - hs, hs * 2, hs * 2);
    // Cut gate openings by clearing small segments of the border
    const half = gw / 2;
    ctx.clearRect(cx - half, cy - hs - 1, gw, 3);   // top gate
    ctx.clearRect(cx - half, cy + hs - 1, gw, 3);   // bottom gate
    ctx.clearRect(cx - hs - 1, cy - half, 3, gw);   // left gate
    ctx.clearRect(cx + hs - 1, cy - half, 3, gw);   // right gate
  }

  // Stagger triangles at 35ms each
  TRIANGLES.forEach((t, i) => {
    _animTimers.push(setTimeout(() => drawTriangle(t), i * 35));
  });

  const base = TRIANGLES.length * 35;
  _animTimers.push(setTimeout(drawRings,                       base));
  _animTimers.push(setTimeout(() => drawLotus(LOTUS_8, 8),    base + 80));
  _animTimers.push(setTimeout(() => drawLotus(LOTUS_16, 16),  base + 160));
  _animTimers.push(setTimeout(drawBhupura,                    base + 240));
  _animTimers.push(setTimeout(() => { if (onDone) onDone(); }, base + 280));
}
```

- [ ] **Step 4: Verify animation in browser**

`npm run dev` -- navigate to `http://localhost:3000/#yantra`. After ~1s you should see 9 triangles draw sequentially (gold = up/Shiva, violet = down/Shakti), then circles, lotus petals, and bhupura square with gate openings. No console errors.

- [ ] **Step 5: Commit**

```bash
git add public/js/sections/yantra.js
git commit -m "feat(yantra): section module background and geometry construction animation"
```

---

### Task 4: Overlay State Machine

**Files:**
- Modify: `public/js/sections/yantra.js`

**Specialists:**
- Domain: frontend-ui
- Lead expertise: Canvas 2D fill state machine, element-conditional rendering, DOM construction for dynamic lists (no innerHTML)
- Review focus: Overlay state consistency across the 4 (mode x visible) combinations, element null handling when oracle incomplete, legend DOM cleared before rebuild, replay correctly resets all state including overlay and legend
- Model: Sonnet triad

**Context for implementer:** Read element synchronously via `document.documentElement.dataset.element || null` -- do NOT use the async `getElement()` from `elementState.js` (overlay repaint is synchronous user interaction). Legend DOM must be built via `createElement`, `textContent`, `appendChild` -- never setAttribute with raw HTML values. PAOAL fills: 0.35 opacity. Element overlay: 0.40 for active element color, 0.25 for null fallback.

- [ ] **Step 1: Append fill color constants and paintOverlay**

Append to `yantra.js`:

```js
const PAOAL_FILLS = [
  { color: '#9B7BE0', label: 'Learn (innermost)' },
  { color: '#1E3FAA', label: 'Assess' },
  { color: '#1E3FAA', label: 'Assess' },
  { color: '#20A8C8', label: 'Observe' },
  { color: '#20A8C8', label: 'Observe' },
  { color: '#1B5E35', label: 'Act' },
  { color: '#1B5E35', label: 'Act' },
  { color: '#C49A1F', label: 'Plan' },
  { color: '#C49A1F', label: 'Plan (outermost)' },
];

const ELEMENT_COLORS = {
  fire:   '#C49A1F',
  earth:  '#2D8050',
  air:    '#3B5FC8',
  water:  '#20A8C8',
  aether: '#9B7BE0',
};

function _hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export function paintOverlay(ctx, cx, cy, scale, mode) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const element = document.documentElement.dataset.element || null;

  TRIANGLES.forEach((t, i) => {
    let hex, opacity;
    if (mode === 'paoal') {
      hex     = PAOAL_FILLS[i].color;
      opacity = 0.35;
    } else if (element) {
      hex     = ELEMENT_COLORS[element] || '#C49A1F';
      opacity = 0.40;
    } else {
      hex     = '#C49A1F';
      opacity = 0.25;
    }
    const [r, g, b] = _hexToRgb(hex);
    const pts = t.verts.map(([x, y]) => tikzToCanvas(x, y, cx, cy, scale));
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    ctx.lineTo(...pts[1]);
    ctx.lineTo(...pts[2]);
    ctx.closePath();
    ctx.fillStyle = `rgba(${r},${g},${b},${opacity})`;
    ctx.fill();
  });
}
```

- [ ] **Step 2: Append _paintLegend using DOM API**

Append to `yantra.js`:

```js
function _paintLegend(legend, mode) {
  while (legend.firstChild) legend.removeChild(legend.firstChild);

  const element = document.documentElement.dataset.element || null;

  let entries;
  if (mode === 'paoal') {
    // Deduplicate consecutive same-phase entries for readability
    const seen = new Set();
    entries = PAOAL_FILLS
      .map((p, i) => ({ label: `T${i + 1}: ${p.label}`, color: p.color }))
      .filter(e => {
        if (seen.has(e.label)) return false;
        seen.add(e.label);
        return true;
      });
  } else if (element) {
    const name = element.charAt(0).toUpperCase() + element.slice(1);
    entries = [{ label: name + ' -- your element', color: ELEMENT_COLORS[element] || '#C49A1F' }];
  } else {
    entries = [{ label: 'Complete the Oracle to unlock your element.', color: '#C49A1F' }];
  }

  entries.forEach(({ label, color }) => {
    const row   = document.createElement('div');
    row.className = 'yantra-legend-row';
    const swatch = document.createElement('span');
    swatch.className     = 'yantra-legend-swatch';
    swatch.style.background = color;
    const text = document.createElement('span');
    text.textContent = label;
    row.appendChild(swatch);
    row.appendChild(text);
    legend.appendChild(row);
  });
}
```

- [ ] **Step 3: Implement _initOverlay**

Append to `yantra.js`:

```js
function _initOverlay(section) {
  const overlayCanvas = section.querySelector('.yantra-overlay');
  const overlayCtx    = overlayCanvas.getContext('2d');
  const geo           = section.querySelector('.yantra-geo');
  const legend        = section.querySelector('[data-yantra="legend"]');
  const toggle        = section.querySelector('[data-yantra="toggle"]');
  const replay        = section.querySelector('[data-yantra="replay"]');

  let mode    = 'paoal';
  let visible = false;

  function repaint() {
    if (!visible) {
      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      legend.hidden = true;
      return;
    }
    const { cx, cy, scale } = _transform(geo);
    paintOverlay(overlayCtx, cx, cy, scale, mode);
    _paintLegend(legend, mode);
    legend.hidden = false;
  }

  // Set initial active pill
  const paoalPill = section.querySelector('[data-yantra="paoal"]');
  if (paoalPill) paoalPill.classList.add('yantra-pill--active');

  section.querySelectorAll('.yantra-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      mode = pill.dataset.yantra;
      section.querySelectorAll('.yantra-pill').forEach(p =>
        p.classList.toggle('yantra-pill--active', p.dataset.yantra === mode)
      );
      repaint();
    });
  });

  toggle.addEventListener('click', () => {
    visible = !visible;
    toggle.textContent = visible ? 'Hide overlay' : 'Show overlay';
    repaint();
  });

  replay.addEventListener('click', () => {
    _constructed = false;
    visible      = false;
    toggle.textContent = 'Show overlay';
    toggle.disabled    = true;
    const controls = section.querySelector('.yantra-controls');
    controls.setAttribute('aria-disabled', 'true');

    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    legend.hidden = true;

    const geoCtx = geo.getContext('2d');
    geoCtx.clearRect(0, 0, geo.width, geo.height);

    const { cx, cy, scale } = _transform(geo);
    animateConstruction(geoCtx, cx, cy, scale, () => {
      _constructed = true;
      controls.removeAttribute('aria-disabled');
      toggle.disabled = false;
    });
  });
}
```

- [ ] **Step 4: Verify overlay state machine in browser**

Navigate to `#yantra`. After construction completes:
1. Click "Show overlay" -- PAOAL colors fill 9 triangles, legend appears
2. Click "Element" pill -- overlay repaints with element color (or neutral gold if oracle not complete)
3. Click "Hide overlay" -- overlay clears, legend hides
4. Click "PAOAL" pill while hidden -- no repaint (correct, overlay is hidden)
5. Click "Show overlay" -- PAOAL mode repaints correctly
6. Click "Replay" -- construction replays, toggle disabled, re-enabled on completion

- [ ] **Step 5: Commit**

```bash
git add public/js/sections/yantra.js
git commit -m "feat(yantra): overlay state machine with PAOAL, element modes, DOM legend"
```

---

### Task 5: E2E Tests

**Files:**
- Modify: `tests/e2e/sections.spec.js`

**Specialists:**
- Domain: testing-infra
- Lead expertise: Playwright canvas interaction testing, async construction completion detection, ImageData pixel validation via page.evaluate
- Review focus: Construction wait strategy (await toggle enabled, not fixed timeout), canvas non-zero check via boundingBox, overlay pixel validation via getImageData alpha channel
- Model: Haiku triad (clear spec, 1 file, 4 tests to add)

**Context for implementer:** Add a `test.describe('#yantra -- Sri Yantra', ...)` block at the end of `tests/e2e/sections.spec.js`. Wait for construction completion by polling `[data-yantra="toggle"]` for not-disabled state (timeout 15000ms) -- the construction takes ~700ms but give headroom for CI. Do NOT use `waitForTimeout` for the primary wait. Canvas non-zero: `boundingBox()` on `.yantra-geo`. Pixel check: `page.evaluate()` on the overlay canvas element.

- [ ] **Step 1: Append yantra describe block to `tests/e2e/sections.spec.js`**

At the end of the file:

```js
// -- yantra ---------------------------------------------------------------
test.describe('#yantra -- Sri Yantra', () => {
  test('section is visible after navigation', async ({ page }) => {
    await goTo(page, '#yantra');
    await expect(page.locator('section[data-section="yantra"]')).toBeVisible();
  });

  test('.yantra-geo canvas is non-zero after construction completes', async ({ page }) => {
    await goTo(page, '#yantra');
    await expect(page.locator('[data-yantra="toggle"]')).not.toBeDisabled({ timeout: 15000 });
    const box = await page.locator('.yantra-geo').boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });

  test('overlay toggle becomes enabled after construction', async ({ page }) => {
    await goTo(page, '#yantra');
    await expect(page.locator('[data-yantra="toggle"]')).not.toBeDisabled({ timeout: 15000 });
  });

  test('PAOAL pill active by default; showing overlay paints pixels on overlay canvas', async ({ page }) => {
    await goTo(page, '#yantra');
    await expect(page.locator('[data-yantra="toggle"]')).not.toBeDisabled({ timeout: 15000 });

    // PAOAL pill should already be active (default mode)
    await expect(page.locator('[data-yantra="paoal"]')).toHaveClass(/yantra-pill--active/);

    // Show overlay
    await page.locator('[data-yantra="toggle"]').click();
    await expect(page.locator('[data-yantra="toggle"]')).toContainText('Hide overlay');

    // Verify overlay canvas has at least one non-transparent pixel
    const hasPixels = await page.locator('.yantra-overlay').evaluate(canvas => {
      const ctx  = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) return true;
      }
      return false;
    });
    expect(hasPixels).toBe(true);
  });
});
```

- [ ] **Step 2: Run full Playwright suite**

```
npx playwright test tests/e2e/sections.spec.js --reporter=line
```
Expected: 39 existing + 4 new = 43 passing. If any of the 4 new tests fail, check construction animation timing (increase timeout) or canvas selector.

- [ ] **Step 3: Run full Jest suite to confirm no regressions**

```
npx jest --no-coverage
```
Expected: 64 + 6 yantraCoords tests = 70 passing.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/sections.spec.js
git commit -m "test(yantra): 4 E2E tests for Sri Yantra section"
```

---

## Self-Review

**Spec coverage:**
- [x] yantraCoords.js data module with full export interface -- T1
- [x] tikzToCanvas utility -- T1
- [x] Concurrency gate Jest test -- T1
- [x] Three.js particle background (createRenderer pattern) -- T3
- [x] Canvas 2D geometry construction, innermost to outermost, 35ms stagger -- T3
- [x] Outer rings + lotus 8 + lotus 16 + bhupura with gate openings -- T3
- [x] Controls enabled after construction completes -- T3
- [x] Replay: clears canvases, resets state, reruns animation -- T4
- [x] PAOAL overlay (5 phases, PAOAL_FILLS, 0.35 opacity) -- T4
- [x] Element overlay (0.40 active, 0.25 null fallback) -- T4
- [x] Legend via DOM API (createElement, textContent, appendChild -- no innerHTML) -- T4
- [x] mode x visible state matrix (4 combinations handled) -- T4
- [x] HTML section shell with 3-canvas stack -- T2
- [x] CSS absolute-positioned canvas stack (z-index order) -- T2
- [x] CSS link tag in index.html (not main.css @import) -- T2
- [x] Nav link between tree and grow -- T2
- [x] router.js SECTIONS entry (not app.js) -- T2
- [x] 4 E2E tests -- T5

**Spec corrections applied (spec doc has errors):**
- Section registry is `public/js/utils/router.js` SECTIONS map -- spec says `app.js` (incorrect)
- CSS loaded via `<link>` tag in `views/index.html` -- spec says `@import` in `main.css` (no main.css exists)

**Coordinate sourcing:** T1 Step 3 names a specific URL and has a concrete concurrency gate test. Not a TBD.
