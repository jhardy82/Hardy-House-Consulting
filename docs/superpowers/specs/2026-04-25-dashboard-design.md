# ContextForge Dashboard — Design Spec

**Date:** 2026-04-25
**Fleet:** 4D
**Hash:** `#dashboard`
**Placement:** After `#oracle`, before `#geometry` in page flow and `index.html`

---

## Goal

Add a `#dashboard` SPA section showing the ContextForge 5-element agent constellation and live task status board. Data sourced from the existing `/api/agents` route and a new `/api/tasks/summary` endpoint. User's oracle element glows/pulses to indicate assignment. Task counts refresh every 30 seconds.

---

## Layout: Command Centre

Agent constellation dominates the top two-thirds as a Three.js hero canvas. Task metrics appear as a tight 4-number stat bar below.

```
┌────────────────────────────────────────────────────┐
│                                                    │
│         🔥    🌍    ✨    💨    💧                  │
│        [Three.js orbital agent constellation]      │
│         Fire  Earth Aether Air  Water              │
│               (user's element glows)               │
│                                                    │
├──────────┬───────────┬───────────┬─────────────────┤
│  Open    │  Active   │  Blocked  │   Done          │
│   12     │    5      │    2      │   28            │
└──────────┴───────────┴───────────┴─────────────────┘
```

---

## Architecture

### Three surfaces

| Surface | Purpose |
|---|---|
| `.dashboard-constellation` canvas | Three.js — 5 Platonic solids in orbital arrangement, glow edges, element colours |
| `.dashboard-metrics` div | HTML — 4-column stat bar, live task counts |
| `.dashboard-legend` div | HTML — element name + role label for hovered/user's solid |

### Orbital arrangement

The 5 solids orbit a common centre using `sin/cos` positioning with a slow rotation (`0.003 rad/frame`). User's oracle element is centred and scaled 1.3× larger than peers. All solids use the existing `buildGlowEdge` + `buildFace` pattern from `oracle.js`.

| Element | Solid | Orbit angle | Colour |
|---|---|---|---|
| Fire | Tetrahedron | 270° (top) | `#C49A1F` |
| Earth | Hexahedron | 342° | `#2D8050` |
| Air | Octahedron | 54° | `#3B5FC8` |
| Water | Icosahedron | 126° | `#20A8C8` |
| Aether | Dodecahedron | 198° | `#9B7BE0` |

User's assigned element: centred, scaled 1.3×, glows with 2× opacity on the outer glow layer. Reads from `getElement()` in `elementState.js` — if null, all 5 solids render at equal scale with `--hh-gold` tint.

---

## File Structure

### New files

**`public/js/sections/dashboard.js`** — Section module. Exports `init()`.

- `_injectStyles()` — CSS injected as `<style>` tag
- `_buildMarkup(section)` — DOM via `el()` helper
- `_initConstellation(section)` — Three.js orbital scene, shared render loop
- `_initMetrics(section)` — Fetches `/api/tasks/summary`, renders stat bar, sets 30s interval
- `_updateElement(element)` — Called on `elementState` change; repositions and rescales the user's solid

**`public/css/sections/dashboard.css`** — Imported in `public/css/main.css`.

### New API route

**`routes/api/tasks-summary.js`**

```js
// GET /api/tasks/summary → { open, in_progress, blocked, done, total }
// Queries the tasks SQLite DB and returns status counts.
```

Registered in `server.js` as `app.use('/api/tasks', tasksSummaryRouter)` so the endpoint is `/api/tasks/summary`.

### Modified files

**`views/index.html`** — Add:
1. `<li><a class="nav-link" href="#dashboard">Dashboard</a></li>` between `#oracle` and `#geometry`
2. `<section data-section="dashboard" hidden>...</section>` in the same position

**`public/js/app.js`** — Add `dashboard` to section registry

**`public/css/main.css`** — Add `@import './sections/dashboard.css'`

**`server.js`** — Add `import tasksSummaryRouter from './routes/api/tasks-summary.js'` and `app.use('/api/tasks', tasksSummaryRouter)`

**`CLAUDE.md`** section map — Add `#dashboard` row

---

## Data Model

### `/api/tasks/summary` response

```json
{ "open": 12, "in_progress": 5, "blocked": 2, "done": 28, "total": 47 }
```

SQL: `SELECT status, COUNT(*) as count FROM tasks GROUP BY status`

Map DB values: `open`, `in-progress` (note hyphen), `blocked`, `done` → normalise `in-progress` → `in_progress` in response.

### Element state

Reads `getElement()` from `elementState.js` on `init()`. Subscribes to element changes via a module-level listener if the Oracle is completed after the dashboard loads.

---

## Refresh Strategy

- Task counts: `setInterval(fetchAndRender, 30_000)` — no SSE needed given low update frequency
- Agent graph: `/api/agents` fetched once on init, not polled (static graph data)
- Element change: reactive via `elementState.js` listener, no polling

---

## Testing

**Unit:** No geometry invariants to test — the orbital positions are decorative.

**E2E (`tests/e2e/sections.spec.js` — new describe block):**
- Section `[data-section="dashboard"]` is visible after navigation to `#dashboard`
- `.dashboard-constellation` canvas is non-zero after init
- `.dashboard-metrics` shows 4 numeric cells
- `/api/tasks/summary` returns valid JSON with correct keys

---

## Open Constraints

- The tasks SQLite DB path is determined by `tasks/cli.js` — confirm path before querying in new route
- If oracle not completed, element is null — all 5 solids render equally (no highlight)
- `tasks-summary.js` must open the DB read-only to avoid interfering with CLI write operations
