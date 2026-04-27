# Dashboard Section -- Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `#dashboard` SPA section showing the ContextForge 5-element agent constellation and live task status board.

**Architecture:** Three.js orbital scene (5 Platonic solids in pentagon arrangement) as hero canvas, 4-metric task stat bar below. Data sourced from new `/api/tasks/summary` endpoint (SQLite) and `/api/agents`. User's oracle element glows at 1.3x scale. Task counts auto-refresh every 30 seconds.

**Source spec:** `docs/superpowers/specs/2026-04-25-dashboard-design.md`

**Tech Stack:** Node.js/Express + better-sqlite3 (backend), Vanilla JS ES Modules + Three.js r128 (frontend), CSS custom properties from `tokens.css`

**Codebase corrections vs spec:**
- Section registry is in `public/js/utils/router.js` (not `app.js`)
- No `main.css` exists -- CSS loaded via `<link>` in `index.html`
- No `buildGlowEdge.js` utility exists yet -- implement inline in `dashboard.js`
- Tasks DB path: `tasks/tasks.db` (relative to project root `tasks/` directory)

---

### Task 1: Create `/api/tasks/summary` route

**Files:**
- Create: `routes/api/tasks-summary.js`

**Specialists:**
- Domain: api-endpoint
- Lead expertise: better-sqlite3 read-only access, SQL GROUP BY, status normalisation
- Review focus: read-only DB open, correct status normalisation (`in-progress` to `in_progress`), DB path resolves correctly from routes dir

- [ ] **Step 1: Create the route module**

Create `routes/api/tasks-summary.js`:

```js
import { Router } from 'express';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = join(__dirname, '..', '..', 'tasks', 'tasks.db');

const router = Router();

router.get('/summary', (req, res) => {
  let db;
  try {
    db = new Database(DB_PATH, { readonly: true });
    const rows = db.prepare(
      'SELECT status, COUNT(*) as count FROM tasks GROUP BY status'
    ).all();

    const counts = { open: 0, in_progress: 0, blocked: 0, done: 0 };
    for (const row of rows) {
      const key = row.status === 'in-progress' ? 'in_progress' : row.status;
      if (key in counts) counts[key] = row.count;
    }
    counts.total = counts.open + counts.in_progress + counts.blocked + counts.done;

    res.json(counts);
  } catch {
    // DB may not exist yet (no tasks created) -- return zeros
    res.json({ open: 0, in_progress: 0, blocked: 0, done: 0, total: 0 });
  } finally {
    db?.close();
  }
});

export default router;
```

- [ ] **Step 2: Verify module syntax**

```bash
node --input-type=module --eval "import './routes/api/tasks-summary.js'; console.log('OK')"
```

Expected: `OK` (no syntax errors). Errors at request time are caught -- this just checks the parse succeeds.

---

### Task 2: Wire the new route in `server.js`

**Files:**
- Modify: `server.js`

**Specialists:**
- Domain: api-endpoint
- Lead expertise: Express router registration order, `/api/tasks` vs `/tasks` prefix isolation
- Review focus: route prefix `/api/tasks` must not collide with existing `/tasks` tasks router

- [ ] **Step 1: Add import and route registration**

In `server.js`, add after the `agentsRouter` import:
```js
import tasksSummaryRouter from './routes/api/tasks-summary.js';
```

Add after `app.use('/api/agents', agentsRouter)`:
```js
app.use('/api/tasks', tasksSummaryRouter);
```

Full final import block and route block:
```js
import pagesRouter        from './routes/pages.js';
import elementRouter      from './routes/api/element.js';
import exportRouter       from './routes/api/export.js';
import agentsRouter       from './routes/api/agents.js';
import tasksSummaryRouter from './routes/api/tasks-summary.js';
import tasksRouter        from './routes/tasks.js';

// ...

app.use('/api/element',  elementRouter);
app.use('/api/export',   exportRouter);
app.use('/api/agents',   agentsRouter);
app.use('/api/tasks',    tasksSummaryRouter);
app.use('/tasks',        tasksRouter);
app.use('/',             pagesRouter);
```

- [ ] **Step 2: Start server and test endpoint**

```bash
npm run dev &
sleep 2
curl http://localhost:3000/api/tasks/summary
```

Expected response: `{"open":0,"in_progress":0,"blocked":0,"done":0,"total":0}`. HTTP 200.

Kill the background server after testing.

---

### Task 3: Create `public/css/sections/dashboard.css`

**Files:**
- Create: `public/css/sections/dashboard.css`

**Specialists:**
- Domain: frontend-ui
- Lead expertise: CSS custom properties from `tokens.css`, responsive canvas layout, flex/grid stat bar
- Review focus: tokens used (no hardcoded hex), canvas fills available space, stat bar 4-column grid, responsive at 768px breakpoint

- [ ] **Step 1: Create the CSS file**

Create `public/css/sections/dashboard.css`:

```css
/* dashboard.css -- #dashboard section styles */

.dashboard-wrap {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--nav-h));
  padding: var(--space-4) var(--section-pad-x);
  gap: var(--space-4);
  background: var(--surface-1);
}

.dashboard-header {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
}

.dashboard-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--hh-fg);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
}

.dashboard-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--hh-fg-3);
  letter-spacing: var(--tracking-wider);
}

.dashboard-constellation {
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-1);
  background: var(--surface-0);
  display: block;
}

.dashboard-legend {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--hh-fg-3);
  text-align: center;
  letter-spacing: var(--tracking-wide);
  min-height: 1.4em;
}

.dashboard-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
  flex-shrink: 0;
}

.metric-cell {
  background: var(--surface-2);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  transition: border-color var(--dur-base) var(--ease-out);
}

.metric-cell:hover {
  border-color: var(--accent-border);
}

.metric-value {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  line-height: 1;
}

.metric-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--hh-fg-3);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.metric-cell[data-status="open"]        .metric-value { color: #2D8050; }
.metric-cell[data-status="in_progress"] .metric-value { color: #3B5FC8; }
.metric-cell[data-status="blocked"]     .metric-value { color: #C49A1F; }
.metric-cell[data-status="done"]        .metric-value { color: #9B7BE0; }

@media (max-width: 768px) {
  .dashboard-metrics { grid-template-columns: repeat(2, 1fr); }
  .dashboard-wrap    { padding: var(--space-3) var(--space-4); }
}
```

---

### Task 4: Create `public/js/sections/dashboard.js`

**Files:**
- Create: `public/js/sections/dashboard.js`

**Specialists:**
- Domain: frontend-ui
- Lead expertise: Three.js orbital animation, glow edge pattern from CLAUDE.md, elementState subscription, `createRenderer` factory usage
- Review focus: glow layers exact spec (4 layers, correct scale/opacity), orbital angles correct (Fire 270°, pentagon 72° spacing), user element at 1.3x scale with 2x outer glow opacity, 30s interval cleaned on re-init, idempotent `init()`
- Note: All dynamic text must be set via `textContent` (never via string interpolation into DOM property assignments), consistent with safe DOM practices

- [ ] **Step 1: Create `public/js/sections/dashboard.js`**

```js
import { createRenderer } from '../utils/createRenderer.js';

const ELEMENTS = [
  { id: 'fire',   solidFn: 'Tetrahedron',  angle: 270, color: 0xC49A1F },
  { id: 'earth',  solidFn: 'Hexahedron',   angle: 342, color: 0x2D8050 },
  { id: 'air',    solidFn: 'Octahedron',   angle:  54, color: 0x3B5FC8 },
  { id: 'water',  solidFn: 'Icosahedron',  angle: 126, color: 0x20A8C8 },
  { id: 'aether', solidFn: 'Dodecahedron', angle: 198, color: 0x9B7BE0 },
];

// Glow edge spec from CLAUDE.md -- exact values
const GLOW_LAYERS        = [[1.000, 0.88], [1.022, 0.27], [1.058, 0.10], [1.105, 0.04]];
const GLOW_LAYERS_ACTIVE = [[1.000, 0.88], [1.022, 0.54], [1.058, 0.20], [1.105, 0.08]];

const ORBIT_RADIUS = 2.2;
const ROT_SPEED    = 0.003;

let _intervalId  = null;
let _initialized = false;

export function init() {
  if (_initialized) return;
  _initialized = true;

  const section = document.querySelector('[data-section="dashboard"]');
  if (!section) return;

  _buildMarkup(section);

  // 80ms delay -- CSS layout must complete before reading canvas dimensions
  setTimeout(() => {
    _initConstellation(section);
    _initMetrics(section);
  }, 80);
}

// ── DOM (safe construction -- no HTML string injection) ──────────
function _el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'className') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function _buildMarkup(section) {
  const wrap = _el('div', { className: 'dashboard-wrap' });

  const header = _el('div', { className: 'dashboard-header' },
    _el('span', { className: 'dashboard-title' }, 'Agent Constellation'),
    _el('span', { className: 'dashboard-label' }, 'ContextForge · Live'),
  );

  const canvas = _el('canvas', { className: 'dashboard-constellation' });
  const legend = _el('div',   { className: 'dashboard-legend' });

  const metrics = _el('div', { className: 'dashboard-metrics' });
  for (const [status, label] of [
    ['open', 'Open'], ['in_progress', 'Active'], ['blocked', 'Blocked'], ['done', 'Done'],
  ]) {
    const cell = _el('div', { className: 'metric-cell', dataset: { status } });
    const val  = _el('span', { className: 'metric-value', id: `metric-${status}` }, '—');
    const lbl  = _el('span', { className: 'metric-label' }, label);
    cell.appendChild(val);
    cell.appendChild(lbl);
    metrics.appendChild(cell);
  }

  wrap.appendChild(header);
  wrap.appendChild(canvas);
  wrap.appendChild(legend);
  wrap.appendChild(metrics);

  section.appendChild(wrap);
}

// ── Three.js constellation ───────────────────────────────────────
function _initConstellation(section) {
  const canvas = section.querySelector('.dashboard-constellation');
  if (!canvas) return;

  const W = canvas.parentElement.clientWidth;
  const H = Math.max(canvas.parentElement.clientHeight * 0.6, 340);

  let renderer;
  try {
    renderer = createRenderer(canvas);
    renderer.setSize(W, H);
    renderer.setClearColor(0x050210, 1);
  } catch (err) {
    console.error('[dashboard] WebGL init failed:', err);
    return;
  }

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
  camera.position.set(0, 0, 8);

  const element = document.documentElement.dataset.element || null;
  const groups  = {};

  for (const el of ELEMENTS) {
    const group = _buildSolid(el, element);
    scene.add(group);
    groups[el.id] = group;
  }

  _positionSolids(groups, element, 0);
  _updateLegend(section, element);

  let frame = 0;
  (function animate() {
    requestAnimationFrame(animate);
    frame += ROT_SPEED;
    _positionSolids(groups, element, frame);
    renderer.render(scene, camera);
  })();
}

function _buildSolid(el, activeElement) {
  const group    = new THREE.Group();
  const isActive = el.id === activeElement;
  const layers   = isActive ? GLOW_LAYERS_ACTIVE : GLOW_LAYERS;

  let geo;
  try {
    switch (el.solidFn) {
      case 'Tetrahedron':  geo = new THREE.TetrahedronGeometry(0.55); break;
      case 'Hexahedron':   geo = new THREE.BoxGeometry(0.8, 0.8, 0.8); break;
      case 'Octahedron':   geo = new THREE.OctahedronGeometry(0.6); break;
      case 'Icosahedron':  geo = new THREE.IcosahedronGeometry(0.6); break;
      case 'Dodecahedron': geo = new THREE.DodecahedronGeometry(0.6); break;
      default:             geo = new THREE.IcosahedronGeometry(0.5);
    }
  } catch (err) {
    console.error('[dashboard] geometry failed:', err);
    return group;
  }

  for (const [scale, opacity] of layers) {
    const mat = new THREE.LineBasicMaterial({
      color: el.color, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const ls = new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat);
    ls.scale.setScalar(scale);
    group.add(ls);
  }

  group.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color: el.color, transparent: true,
    opacity: isActive ? 0.08 : 0.04, side: THREE.DoubleSide,
  })));

  return group;
}

function _positionSolids(groups, activeElement, rotOffset) {
  for (const el of ELEMENTS) {
    const group = groups[el.id];
    if (!group) continue;
    const isActive = el.id === activeElement;
    const a = (el.angle * Math.PI / 180) + rotOffset;
    group.position.set(
      Math.cos(a) * ORBIT_RADIUS,
      Math.sin(a) * ORBIT_RADIUS * 0.55,
      0,
    );
    group.scale.setScalar(isActive ? 1.3 : 1.0);
    group.rotation.y += isActive ? 0.012 : 0.006;
    group.rotation.x += 0.003;
  }
}

function _updateLegend(section, element) {
  const legend = section.querySelector('.dashboard-legend');
  if (!legend) return;
  if (element) {
    const el   = ELEMENTS.find(e => e.id === element);
    const name = el ? el.id.charAt(0).toUpperCase() + el.id.slice(1) : element;
    legend.textContent = 'Your element — ' + name + ' — colours the constellation';
  } else {
    legend.textContent = 'Complete the Oracle to unlock your element assignment';
  }
}

// ── Task metrics ─────────────────────────────────────────────────
async function _fetchAndRender(section) {
  try {
    const res  = await fetch('/api/tasks/summary');
    const data = await res.json();
    for (const key of ['open', 'in_progress', 'blocked', 'done']) {
      const node = section.querySelector('#metric-' + key);
      if (node) node.textContent = String(data[key] ?? '—');
    }
  } catch (err) {
    console.error('[dashboard] metrics fetch failed:', err);
  }
}

function _initMetrics(section) {
  _fetchAndRender(section);
  if (_intervalId) clearInterval(_intervalId);
  _intervalId = setInterval(() => _fetchAndRender(section), 30_000);
}
```

- [ ] **Step 2: Verify parse (no syntax errors)**

```bash
node --check public/js/sections/dashboard.js && echo OK
```

Expected: `OK`

---

### Task 5: Wire into HTML and router

**Files:**
- Modify: `views/index.html`
- Modify: `public/js/utils/router.js`

**Specialists:**
- Domain: frontend-ui
- Lead expertise: SPA hash routing, `<section data-section>` pattern
- Review focus: dashboard nav link between oracle and geometry, section key matches SECTIONS entry exactly, CSS link in head

- [ ] **Step 1: Add CSS link to `views/index.html` `<head>`**

After `<link rel="stylesheet" href="/css/tokens.css">` add:
```html
  <link rel="stylesheet" href="/css/sections/dashboard.css">
```

- [ ] **Step 2: Add nav link between oracle and geometry**

In the `<ul class="nav-links">` block:
```html
      <li><a class="nav-link" href="#oracle"        data-section="oracle">Oracle</a></li>
      <li><a class="nav-link" href="#dashboard"     data-section="dashboard">Dashboard</a></li>
      <li><a class="nav-link" href="#geometry"      data-section="geometry">Geometry</a></li>
```

- [ ] **Step 3: Add section element after oracle section**

```html
    <section data-section="oracle"        hidden><div class="section-inner"><h1>Element Oracle</h1><p class="muted">Placeholder.</p></div></section>
    <section data-section="dashboard"     hidden></section>
    <section data-section="geometry"      hidden><div class="section-inner"><h1>Sacred Geometry</h1><p class="muted">Placeholder.</p></div></section>
```

Note: dashboard section has no inner content -- `_buildMarkup()` populates it on first navigation.

- [ ] **Step 4: Add `dashboard` to SECTIONS in `public/js/utils/router.js`**

```js
const SECTIONS = {
  home:          () => import('../sections/home.js'),
  oracle:        () => import('../sections/oracle.js'),
  dashboard:     () => import('../sections/dashboard.js'),
  geometry:      () => import('../sections/geometry.js'),
  decomposition: () => import('../sections/decomposition.js'),
  variants:      () => import('../sections/variants.js'),
  tree:          () => import('../sections/tree.js'),
  grow:          () => import('../sections/grow.js'),
  presentation:  () => import('../sections/presentation.js'),
  contact:       () => import('../sections/contact.js'),
};
```

---

### Task 6: E2E tests

**Files:**
- Modify: `tests/e2e/sections.spec.js`

**Specialists:**
- Domain: testing-infra
- Lead expertise: Playwright, SPA hash navigation, canvas bounding box assertion, API JSON validation
- Review focus: all 4 spec assertions covered, timeout values allow 80ms init delay, API test uses `request` fixture (no browser needed)

- [ ] **Step 1: Append dashboard describe block to `tests/e2e/sections.spec.js`**

```js
describe('#dashboard section', () => {
  test('section is visible after navigation', async ({ page }) => {
    await page.goto('http://localhost:3000/#dashboard');
    await expect(page.locator('[data-section="dashboard"]')).toBeVisible({ timeout: 5000 });
  });

  test('constellation canvas has non-zero dimensions', async ({ page }) => {
    await page.goto('http://localhost:3000/#dashboard');
    await page.waitForTimeout(500);
    const canvas = page.locator('.dashboard-constellation');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });

  test('metrics bar shows 4 cells', async ({ page }) => {
    await page.goto('http://localhost:3000/#dashboard');
    await page.waitForTimeout(1000);
    await expect(page.locator('.metric-value')).toHaveCount(4);
  });

  test('GET /api/tasks/summary returns valid JSON', async ({ request }) => {
    const res  = await request.get('http://localhost:3000/api/tasks/summary');
    expect(res.ok()).toBe(true);
    const body = await res.json();
    for (const key of ['open', 'in_progress', 'blocked', 'done', 'total']) {
      expect(body).toHaveProperty(key);
    }
  });
});
```

---

### Task 7: CLAUDE.md update and commit

**Files:**
- Modify: `CLAUDE.md`

**Specialists:**
- Domain: config-management
- Lead expertise: CLAUDE.md section map format
- Review focus: row inserted between oracle and geometry rows

- [ ] **Step 1: Add `#dashboard` row to CLAUDE.md section map**

Find the section map table. Insert after the `#oracle` row:
```markdown
| `#dashboard` | `dashboard.js` | Build new | `docs/superpowers/specs/2026-04-25-dashboard-design.md` |
```

- [ ] **Step 2: Verify server starts cleanly**

```bash
npm run dev &
sleep 2
curl -sf http://localhost:3000/api/tasks/summary
```

Expected: JSON with `open`, `in_progress`, `blocked`, `done`, `total` keys. Kill dev server.

- [ ] **Step 3: Commit all changes**

```bash
git add routes/api/tasks-summary.js server.js \
        public/css/sections/dashboard.css \
        public/js/sections/dashboard.js \
        public/js/utils/router.js \
        views/index.html CLAUDE.md
git commit -m "feat(dashboard): add #dashboard section with orbital constellation and live task metrics"
```
