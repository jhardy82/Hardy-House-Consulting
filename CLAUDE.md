# CLAUDE.md — Hardy House Consulting App

> Read this file completely before writing any code. This is the single source of truth.

---

## Project Identity

**Name:** Hardy House Consulting App  
**Owner:** James Hardy — Modern Workplace / Endpoint Engineering Consultant, Avanade  
**Stack:** Node.js + Express · Vanilla JS (ES Modules) · Three.js r128 · GSAP 3 · Jest + Playwright  
**Deployment:** Local dev (`npm run dev`) + Render.com (Node.js, not static)  
**Entry point:** `server.js` → serves `views/index.html` → hash router loads sections

---

## Owner context — apply always

James is AuHD (autistic/ADHD). Communicate with structure, clarity, and linear logic. Use Markdown with headings and bullet points. Begin responses with action items or conclusions, then reasoning. End with 2–3 concrete next steps. Mark uncertainty as `<UNKNOWN>` rather than guessing.

He values blunt honesty. Do not soften technical problems — state them directly with the fix.

---

## This project is part of ContextForge

Sacred Geometry is the structural logic of ContextForge, not decoration:
- **Team sizes are dynamically calculated** using the `team-builder` skill — not hardcoded
- Two sizing paths exist and both apply across the app and its ContextForge mappings:

**Path A — Fibonacci (standard):** Size is computed from a complexity formula:
```
raw_complexity = domains × criticality × uncertainty
if quality_critical:        raw_complexity × 1.2
if regulatory_burden=Heavy: raw_complexity × 1.3
effective_complexity = raw_complexity / avg_agent_quality
calibrated_complexity = effective_complexity × 0.847
team_size = fibonacci_lookup(calibrated_complexity)
```
Fibonacci lookup: 2 (Duo) · 3 (Triad) · 5 (Pentad) · 8 (Octad) · 13 (Tridecad) · 21 (Hecatontad)

**Path B — GCMT (Geometric Configuration for Multi-agent Teams):** Shape determines relationships before headcount.
The shape is chosen from problem geometry, not agent count:
- Tetrahedron (Fire) — transformation, fundamental change
- Cube (Earth) — orthogonal axes, multi-domain governance
- Octahedron (Air) — hub-and-spoke routing, agent communication topology
- Icosahedron (Water) — high adaptability, fluid interconnection
- Dodecahedron (Aether) — system-of-systems, enterprise integration
- Tesseract (Temporal/4D) — current→target state evolution

UCL Triple-Check validates every GCMT output: V-E+F=2 (3D solids), element alignment, COF dimension coverage.
- Each Platonic solid maps to an element and an agent role
- The Tree of Life maps to the agent coordination chain
- PHI (φ) governs hierarchy: each system level is φ× the one below
- The PAOAL cycle (Plan→Act→Observe→Assess→Learn) maps to the Torus

**When in doubt: use the simplest complete structure.** A Tetrahedron before a Dodecahedron. Ship working minimum, expand later.

---

## Sacred geometry invariants — never violate

These counts are mathematical facts. If code produces different numbers, it is wrong.

| Constant | Value | Description |
|---|---|---|
| `PHI` | `(1 + Math.sqrt(5)) / 2` | Golden ratio — the only definition |
| `FOL_PTS.length` | 19 | Flower of Life circle centres |
| `FRUIT_IDX.length` | 13 | Fruit of Life (Metatron source) |
| `MET_EDGES.length` | 78 | C(13,2) — all Metatron edges |
| `PLATONIC.length` | 5 | The five Platonic solids |
| `EXTENDED.length` | 6 | Extended forms |
| Glow layers | 4 | Scales: 1.000/1.022/1.058/1.105 |

---

## Stack rules

### Node / Express
- `"type": "module"` in package.json — ES Modules everywhere, never `require()`
- Express serves `public/` as static, all GET requests → `views/index.html`
- API routes under `/api/` prefix only
- Session via `express-session` — element stored in `req.session.element`
- No ORM, no database — in-memory / JSON files until there's a reason for more

### JavaScript
- No TypeScript. No React. No Vue. Vanilla ES Modules.
- `public/js/app.js` is the browser entry point — imports router + elementState only
- Each section exports a single `init()` function — called once, idempotent
- Three.js is a global (`window.THREE`) loaded via `<script>` tag, not imported
- GSAP is a global (`window.gsap`) loaded via `<script>` tag, not imported

### Three.js — non-negotiable rules

```js
// ALWAYS — use the shared factory
import { createRenderer } from '../utils/createRenderer.js';
const renderer = createRenderer(canvas);

// NEVER — do not write this directly
const renderer = new THREE.WebGLRenderer({ canvas });
```

| Rule | Reason |
|---|---|
| Always `preserveDrawingBuffer: true` | Handled by `createRenderer()` — enables PNG export |
| Always `parentElement.clientWidth` not `canvas.clientWidth` | Canvas has no dimensions until CSS layout runs |
| Always 80ms `setTimeout` before reading dimensions | CSS layout must complete first |
| Never `setSize(w, h, false)` | `false` disables CSS sizing — shapes render but aren't visible |
| Always `AdditiveBlending + depthWrite:false` on glow materials | Required for glow effect |

### Glow edge pattern — exact layer spec

```js
// buildGlowEdge.js — use this exact spec, never approximate
[[1.000, 0.88], [1.022, 0.27], [1.058, 0.10], [1.105, 0.04]]
  .forEach(([scale, opacity]) => {
    const mat = new THREE.LineBasicMaterial({
      color: col, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const ls = new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat);
    ls.scale.setScalar(scale);
    group.add(ls);
  });
```

### CSS
- `tokens.css` is imported first — never hardcode hex values
- `data-element` on `<html>` drives `var(--accent)` cascade throughout
- Breakpoints: 480px / 768px / 1050px / 1280px — no others
- Z-index: use `var(--z-*)` tokens only

---

## Design system

### Brand palette
```
--hh-void:   #07040F   Page background
--hh-purple: #2E1760   Deep Royal Purple — primary brand
--hh-gold:   #C49A1F   Burnished Gold — accent, interactive
--hh-royal:  #1E3FAA   Royal Blue
--hh-forest: #1B5E35   Forest Green
--hh-aether: #9B7BE0   Aether Violet — ContextForge accent
```

### Element accent system

Oracle assigns element via 5 binary questions. Sets `data-element` on `<html>`.
All interactive accents use `var(--accent)` — never hardcode element colours directly.

| Element | Solid | Hex | Role |
|---|---|---|---|
| fire | Tetrahedron | `#C49A1F` | Initiator |
| earth | Hexahedron | `#2D8050` | Builder |
| air | Octahedron | `#3B5FC8` | Orchestrator |
| water | Icosahedron | `#20A8C8` | Connector |
| aether | Dodecahedron | `#9B7BE0` | Framework |

### Typography
- Display: `'Cormorant', Georgia, serif`
- Body: `'Lora', Georgia, serif`
- Mono: `'JetBrains Mono', 'Fira Code', monospace`

---

## Section map

| Hash | Module | Status | Source file |
|---|---|---|---|
| `#home` | `home.js` | Build new | `_source/hardy-house-app-demo.html` hero |
| `#oracle` | `oracle.js` | Build new | `_source/hardy-house-app-demo.html` oracle |
| `#dashboard` | `dashboard.js` | Built | `docs/superpowers/plans/2026-04-25-dashboard.md` |
| `#geometry` | `geometry.js` | Migrate | `_source/hardy-house-geometry.html` |
| `#decomposition` | `decomposition.js` | Migrate | `_source/hardy-house-decomposition.html` |
| `#variants` | `variants.js` | Migrate | `_source/hardy-house-variants.html` |
| `#tree` | `tree.js` | Build new | See `_docs/next-steps-research.html` |
| `#grow` | `grow.js` | Build new | See `_docs/next-steps-research.html` |
| `#presentation` | `presentation.js` | Migrate | `_source/demo-presentation.html` |
| `#contact` | `contact.js` | Migrate | `_source/phone-card.html` |

---

## API spec (minimal — add only when a section requires it)

```
GET  /api/element     → { element: string|null }
POST /api/element     → { element, ok: true }  body: { element: 'fire'|'earth'|'air'|'water'|'aether' }
POST /api/export      → file download (PNG)    body: { dataUrl, filename }
GET  /api/agents      → { nodes, links }       ContextForge agent graph data
GET  /api/tasks/summary → { open, in_progress, blocked, done, total }  SQLite task counts
```

Do not add routes speculatively. Add a route only when a section module requires it.

---

## Testing

- **Unit (Jest):** Every function in `public/js/geometry/` has a unit test. All 3 invariant counts tested.
- **API (supertest):** Every route: success case + invalid input + missing session.
- **E2E (Playwright):** Every section: page loads, canvas non-zero, key interactions reachable.
- Coverage: 85% lines for geometry modules, 100% for API routes.
- Tests run on every commit via GitHub Actions.

---

## Git conventions

```
feat:     new section or feature
fix:      bug fix
migrate:  move HTML file logic into section module
style:    CSS/token changes only
test:     test additions or fixes
docs:     CLAUDE.md or other documentation
chore:    dependencies, config, scaffolding
```

Branch: `main` is always deployable. Feature branches: `feat/section-name`. CI required on PRs.

---

## Deployment — Render.com

1. Connect GitHub repo
2. Create Web Service (not Static Site)
3. Build command: `npm install`
4. Start command: `npm start`
5. Set env vars: `SESSION_SECRET`, `NODE_ENV=production`
6. Auto-deploy on push to `main`

Render free tier: 750h/month, spins down after 15min. Upgrade to $7/month for always-on.

---

## James's scripting preferences (apply to all code)

- **Idempotent:** every `init()` function safe to call twice without side effects
- **Try/catch on all Three.js constructors** — WebGL can fail silently; log + continue
- **No em dashes** in comments or docs — use `--` or restructure
- **`<UNKNOWN>`** when uncertain rather than inventing
- **Overview → deep-dive → digest** structure for explanations
- **Confirm platform/OS/privileges** before executing scripts that touch the system
- **Blunt, direct reporting** — state problems clearly with the fix, no softening
