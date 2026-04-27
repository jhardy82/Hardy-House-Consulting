<!-- generated-by: gsd-doc-writer -->
# Architecture

Hardy House Consulting is a single-page application (SPA) built on Node.js + Express. The server renders one HTML shell and routes all page navigation client-side via a hash router. Sections are lazy-loaded ES Modules. Three.js visualisations use a shared renderer factory. A SQLite database backs analytics and task tracking.

---

## System Overview

The application is a server-rendered SPA with a layered architecture:

1. **Server layer** -- Express serves static assets and a JSON API. All `GET` requests that are not API or static asset routes are caught by `routes/pages.js` and serve `views/index.html`.
2. **Client shell** -- `views/index.html` is the single HTML document. It contains all `<section data-section="…">` elements pre-declared but hidden; the hash router reveals one at a time.
3. **Hash router** -- `public/js/utils/router.js` listens on `hashchange`, lazy-imports each section module on first visit, and calls its `init()` after an 80 ms delay to allow CSS layout to complete before any canvas dimension reads.
4. **Section modules** -- Each section in `public/js/sections/` exports a single idempotent `init()` function. Modules guard first-run setup with an `_initialized` flag so re-navigation never duplicates work.
5. **Element system** -- The Oracle quiz assigns one of five elements to the user. The assignment is persisted in the Express session and in `localStorage` as a fallback. `elementState.js` writes `data-element` to `<html>`, which cascades `var(--accent)` CSS tokens throughout the UI.

---

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│                                                                 │
│  ┌──────────┐    hashchange    ┌──────────────────────────────┐ │
│  │ app.js   │─────────────────▶│ router.js (hash router)      │ │
│  │ (entry)  │                  │ lazy-imports section modules  │ │
│  └──────────┘                  └──────────┬───────────────────┘ │
│       │                                   │ init()              │
│       │ getElement()                       ▼                     │
│  ┌────▼────────────┐           ┌──────────────────────────────┐ │
│  │ elementState.js │           │ sections/ (11 modules)        │ │
│  │ session + LS    │           │ home · oracle · dashboard     │ │
│  └────┬────────────┘           │ geometry · decomposition      │ │
│       │ data-element           │ variants · tree · yantra      │ │
│       ▼                        │ grow · presentation · contact │ │
│  ┌──────────┐                  └──────────┬───────────────────┘ │
│  │ tokens.css│                            │ createRenderer()     │
│  │ --accent  │                  ┌─────────▼───────────────────┐ │
│  │ cascade   │                  │ utils/createRenderer.js      │ │
│  └──────────┘                   │ (shared WebGLRenderer        │ │
│                                 │  factory -- THREE global)    │ │
│                                 └─────────────────────────────┘ │
│                                                                 │
│          geometry/ (pure math, no DOM)                          │
│          constants.js · metatron3d.js · yantraCoords.js         │
└─────────────────────────────────────────────────────────────────┘
         │ fetch /api/*
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Express server (server.js)                                     │
│                                                                 │
│  Middleware: helmet · compression · express-session             │
│  Rate limiting: per-route (production only)                     │
│                                                                 │
│  /api/element   ─── routes/api/element.js ──┐                  │
│  /api/export    ─── routes/api/export.js    │                  │
│  /api/agents    ─── routes/api/agents.js    ├─── tasks/tasks.db │
│  /api/tasks     ─── routes/api/tasks-summary.js               │
│  /api/analytics ─── routes/api/analytics.js─┘  (better-sqlite3)│
│  /api/contact   ─── routes/api/contact.js ──── Resend API      │
│  /tasks         ─── routes/tasks.js (CLI task manager)         │
│  GET *          ─── routes/pages.js → views/index.html         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

A typical user session flows as follows:

1. Browser requests any URL. Express matches `GET *` in `routes/pages.js` and returns `views/index.html`.
2. The HTML shell loads CSS tokens, section stylesheets, Three.js, and GSAP as globals via `<script>` tags, then loads `public/js/app.js` as a module.
3. `app.js` calls `getElement()` from `elementState.js`, which `fetch`es `GET /api/element`. The server returns the element from `req.session.element` (or `null`). If the fetch fails, `localStorage` is checked as fallback. The returned element is written to `document.documentElement.dataset.element`.
4. `app.js` calls `initRouter()`. The router reads `location.hash` (defaulting to `home`), reveals the matching `<section>`, and lazy-imports the section module if not yet loaded.
5. After an 80 ms timeout (CSS layout settle), the router calls the section's `init()`. For sections with Three.js canvases, `init()` calls `createRenderer(canvas)` which reads `canvas.parentElement.clientWidth/clientHeight` and wires a `ResizeObserver`.
6. On Oracle quiz completion, `setElement(element)` in `elementState.js` writes to `localStorage`, updates `data-element` on `<html>`, and `POST`s `/api/element`. The server stores the assignment in `req.session.element` and inserts a row into `element_assignments` in SQLite.
7. On every hash navigation, the router fires `POST /api/analytics/pageview` (fire-and-forget) to record the section visit in SQLite.
8. PNG export: a section captures the WebGL canvas as a data URL (possible because `preserveDrawingBuffer: true`) and `POST`s it to `/api/export`. The server decodes the base64, validates the PNG signature, and streams the binary back as a file download.
9. Contact form: `POST /api/contact` validates input server-side and delivers email via the Resend API.

---

## Key Abstractions

| Abstraction | Location | Description |
|---|---|---|
| `createRenderer(canvas, opts?)` | `public/js/utils/createRenderer.js` | Shared WebGLRenderer factory. Always use instead of `new THREE.WebGLRenderer()`. Enables `preserveDrawingBuffer`, wires `ResizeObserver` to parent element for responsive sizing. |
| `initRouter()` | `public/js/utils/router.js` | Hash-based SPA router. Lazy-loads section modules, serialises navigation to prevent race conditions, calls `init()` after 80 ms CSS settle delay. Fires analytics pageview on each navigation. |
| `getElement()` / `setElement(el)` | `public/js/elementState.js` | Element state manager. Reads from server session with localStorage fallback. Writes `data-element` to `<html>`. Syncs assignments to server and SQLite. |
| Section `init()` contract | `public/js/sections/*.js` | Every section exports a single idempotent `init()`. Safe to call multiple times -- each module guards first-run setup internally with an `_initialized` flag. |
| `PHI`, `SQ3H`, `FOL_R` | `public/js/geometry/constants.js` | Core sacred geometry constants. `PHI = (1 + Math.sqrt(5)) / 2`. These are mathematical facts enforced by the test suite. |
| `buildTesseractVerts/Edges()`, `buildStelFaces()`, `project4D()` | `public/js/geometry/metatron3d.js` | Pure geometry helpers with no DOM or Three.js dependency. Safe to import in Jest. |
| `TRIANGLES` | `public/js/geometry/yantraCoords.js` | Sri Yantra geometry data -- 9 interlocking triangles normalised to unit outer circle radius, sourced from Huet (2002). |

---

## Directory Structure Rationale

```
hardy-house/
├── server.js                  Express entry point -- middleware, routes, session, error handler
├── views/
│   └── index.html             Single HTML shell -- all sections pre-declared; hash router controls visibility
├── public/
│   ├── js/
│   │   ├── app.js             Browser entry point -- elementState init + router init only
│   │   ├── sections/          11 section modules, each exporting init()
│   │   ├── geometry/          Pure math modules (no DOM, no THREE) -- testable by Jest
│   │   └── utils/             Shared browser utilities (router, createRenderer, nav, orbitControl)
│   ├── css/
│   │   ├── tokens.css         Design system single source of truth -- all CSS custom properties
│   │   ├── base.css           Global resets and layout
│   │   ├── sections/          Per-section stylesheets (lazy-loaded via link tags in index.html)
│   │   └── presentation.css   Presentation section styles
│   └── vendor/                Third-party globals (Three.js r128, GSAP 3) -- 1-year cache, immutable
├── routes/
│   ├── pages.js               Catch-all GET * → views/index.html
│   ├── tasks.js               /tasks path -- task management CLI bridge
│   └── api/                   JSON API route handlers (element, export, agents, tasks-summary, analytics, contact)
├── tasks/
│   ├── cli.js                 Task management CLI
│   ├── flags.js               CLI flag parser
│   └── tasks.db               SQLite database (better-sqlite3) -- runtime-generated on first run, not committed
└── tests/
    ├── unit/                  Jest tests -- geometry invariants, oracle scoring, task CLI
    ├── api/                   Supertest tests -- all API routes
    └── e2e/                   Playwright tests -- section loads, canvas renders, interactions
```

**Why this structure:**

- `public/js/geometry/` is isolated from the DOM so the same modules can be imported by Jest without a browser environment. Three.js is a global in the browser but must not be `import`ed in test files.
- `public/vendor/` is served with a 1-year immutable cache header, distinct from `public/` which is served with a 1-hour cache -- this prevents stale third-party globals while allowing app code to update freely.
- `routes/api/` contains one file per endpoint, making rate-limit and error-handling configuration visible at the route registration site in `server.js` without requiring readers to open each file.
- `tasks/tasks.db` co-locates the SQLite file with the CLI code that manages it, so the task management subsystem is self-contained.

---

## Sacred Geometry Invariants

These counts are mathematical facts. The test suite (`tests/unit/geometry-constants.test.js`) enforces them. If code produces different numbers it is wrong.

| Constant | Value | Definition |
|---|---|---|
| `PHI` | `(1 + Math.sqrt(5)) / 2` ≈ 1.618 | Golden ratio -- the only definition |
| `FOL_PTS.length` | 19 | Flower of Life: 1 centre + 6 inner ring + 12 outer ring |
| `FRUIT_IDX.length` | 13 | Fruit of Life: 1 centre + 6 inner ring + 6 alternating outer |
| `MET_EDGES.length` | 78 | Metatron's Cube: C(13,2) -- all unique pairs of 13 centres |
| `PLATONIC.length` | 5 | The five Platonic solids |
| `EXTENDED.length` | 6 | Extended forms including the star tetrahedron (merkaba) |
| Glow layers | 4 | Scales 1.000 / 1.022 / 1.058 / 1.105, opacities 0.88 / 0.27 / 0.10 / 0.04 |

---

## API Routes

| Method | Path | Rate Limit (prod) | Description |
|---|---|---|---|
| `GET` | `/api/element` | 10/min | Return session element (`null` if unset) |
| `POST` | `/api/element` | 10/min | Assign element; persist to session + SQLite |
| `POST` | `/api/export` | 10/min | Decode base64 PNG data URL; stream file download (2 MB body limit) |
| `GET` | `/api/agents` | -- | ContextForge agent graph (stub: 501 Not Implemented) |
| `GET` | `/api/tasks/summary` | 30/min | SQLite task counts by status |
| `GET` | `/api/analytics/elements` | 30/min | Element assignment counts from SQLite |
| `GET` | `/api/analytics/pageviews` | 30/min | Section visit counts from SQLite |
| `POST` | `/api/analytics/pageview` | 30/min | Record a section visit |
| `POST` | `/api/contact` | 3/10 min | Validate and deliver contact form via Resend API |

Rate limits apply in production only (`NODE_ENV=production`). They are skipped in development and test environments.

---

## Element System

The element system is the primary personalisation mechanism. It flows from Oracle quiz to CSS cascade:

```
Oracle quiz (5 binary questions)
        │
        ▼ setElement('fire'|'earth'|'air'|'water'|'aether')
elementState.js
        ├── localStorage.setItem('hh-element', element)
        ├── document.documentElement.dataset.element = element
        └── POST /api/element → req.session.element + SQLite
                │
                ▼
tokens.css: :root[data-element="fire"] { --accent: #C49A1F; ... }
                │
                ▼
All interactive accents via var(--accent) throughout every section
```

| Element | Platonic Solid | Hex | Role |
|---|---|---|---|
| fire | Tetrahedron | `#C49A1F` | Initiator |
| earth | Hexahedron | `#2D8050` | Builder |
| air | Octahedron | `#3B5FC8` | Orchestrator |
| water | Icosahedron | `#20A8C8` | Connector |
| aether | Dodecahedron | `#9B7BE0` | Framework |

---

## Three.js Integration Pattern

All WebGL canvases follow the same pattern to ensure consistent behaviour and PNG export capability:

```js
// Always -- use the shared factory
import { createRenderer } from '../utils/createRenderer.js';
const renderer = createRenderer(canvas);

// Never -- do not call directly
const renderer = new THREE.WebGLRenderer({ canvas });
```

`createRenderer` enforces:
- `preserveDrawingBuffer: true` -- required for PNG export via `canvas.toDataURL()`
- Dimension reads from `canvas.parentElement.clientWidth/clientHeight` -- canvas has no dimensions until CSS layout runs
- A `ResizeObserver` on the parent element -- keeps the renderer responsive without polling

The 80 ms `setTimeout` in the router before calling `init()` is the CSS layout settle delay. It is not negotiable -- removing it causes canvas dimensions to read as zero.
