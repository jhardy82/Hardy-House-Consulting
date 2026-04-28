<!-- generated-by: gsd-doc-writer -->
# Development Guide

A practical reference for working on the Hardy House Consulting app. Read this alongside
[GETTING-STARTED.md](GETTING-STARTED.md) (prerequisites and first run) and
[ARCHITECTURE.md](ARCHITECTURE.md) (system overview).

---

## Local Setup

```bash
git clone <repo-url>
cd hardy-house-consulting
npm install
cp .env.example .env   # fill in SESSION_SECRET and RESEND_API_KEY
npm run dev
```

The dev server starts on `http://localhost:3000`. nodemon watches all files and restarts the
server automatically on save. There is no bundler or compile step -- the browser loads ES
Modules directly.

**Required `.env` values:**

| Variable | Dev requirement |
|---|---|
| `SESSION_SECRET` | Any non-empty string (server warns if absent, does not crash) |
| `RESEND_API_KEY` | Required only if testing the contact form email send |
| `PORT` | Defaults to `3000` if omitted |
| `NODE_ENV` | Set to `development` in `.env` -- controls session cookie `secure` flag and rate limit enforcement |

---

## Build Commands

No build step. Source is served as-is.

| Command | What it does |
|---|---|
| `npm run dev` | Start server with nodemon hot-reload (`--env-file=.env`) |
| `npm start` | Start server without nodemon (production-style) |
| `npm run lint` | Run ESLint across `public/js/`, `routes/`, `tasks/` |
| `npm test` | Run all Jest tests (unit + API) via `--experimental-vm-modules` |
| `npm run test:unit` | Jest unit tests only (`tests/unit/`) |
| `npm run test:api` | Jest API/supertest tests only (`tests/api/`) |
| `npm run test:e2e` | Playwright end-to-end tests |

---

## Adding a New Section

Each section is a single ES Module in `public/js/sections/` that exports one idempotent
`init()` function. The router calls `init()` on every navigation to the section, so guard
against repeated setup with a module-level flag.

### 1. Create the section module

```js
// public/js/sections/myfeature.js

let initialised = false;

export function init() {
  if (initialised) return;
  initialised = true;

  const section = document.querySelector('[data-section="myfeature"]');
  if (!section) {
    console.warn('[myfeature] section element not found');
    return;
  }

  // Build DOM, set up Three.js, attach event listeners...
}
```

`init()` is called on every navigation visit. For Three.js scenes, the `initialised` guard
prevents spawning a second renderer. For pure DOM sections, ensure `appendChild` calls
check whether the element already exists.

### 2. Register in the router

Add the section to `public/js/utils/router.js`:

```js
const SECTIONS = {
  // ...existing entries...
  myfeature: () => import('../sections/myfeature.js'),
};
```

### 3. Add the `<section>` element to the HTML

In `views/index.html`, add a hidden section element inside `<main class="sections">`:

```html
<section data-section="myfeature" hidden></section>
```

### 4. Add a nav link (if the section is top-level)

```html
<li><a class="nav-link" href="#myfeature">My Feature</a></li>
```

### 5. Add a CSS file for the section

Create `public/css/sections/myfeature.css` and link it in `views/index.html` head:

```html
<link rel="stylesheet" href="/css/sections/myfeature.css">
```

---

## Three.js Patterns

### Always use the renderer factory

Never call `new THREE.WebGLRenderer()` directly. Use the shared factory:

```js
import { createRenderer } from '../utils/createRenderer.js';

// Inside init() or a scene-build function:
const renderer = createRenderer(canvas);
```

The factory sets `preserveDrawingBuffer: true` (required for PNG export), wires a
`ResizeObserver` to the parent element so the canvas tracks CSS layout, and sets the pixel
ratio cap at 2.

### Read dimensions from the parent element

The canvas element has no dimensions until CSS layout runs. Always read from the parent:

```js
const parent = canvas.parentElement;
const W = parent.clientWidth  || 400;
const H = parent.clientHeight || 400;
```

### Defer canvas reads by 80 ms

The router calls `init()` inside a `setTimeout(..., 80)` to let CSS layout settle before
any canvas dimension reads. The 80 ms is a hard requirement -- do not reduce it.

If you call `createRenderer()` or read canvas dimensions from within `init()`, they are
already inside the 80 ms window. If you set up a Three.js scene in a nested function called
from `init()`, the delay is inherited automatically.

### THREE and gsap are window globals -- never import them

Three.js and GSAP are loaded via `<script>` tags in `views/index.html`. They are available
as `window.THREE` and `window.gsap`. Do not add them to `package.json` or import them as
modules.

ESLint is configured to recognise `THREE` and `gsap` as read-only globals so they will not
trigger `no-undef` errors.

```js
// Correct -- THREE is a global
const geo = new THREE.BoxGeometry(1, 1, 1);

// Wrong -- this will fail at runtime
import * as THREE from 'three'; // Do not do this
```

### Guard all Three.js constructors with try/catch

WebGL can fail silently or throw without crashing the browser tab. Wrap constructors:

```js
let mesh = null;
try {
  mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
} catch (err) {
  console.warn('[mysection] mesh construction failed:', err.message);
}
```

### Glow edge pattern

When building glow edges on a geometry, use the exact 4-layer spec:

```js
function buildGlowEdge(geo, col) {
  const group = new THREE.Group();
  [[1.000, 0.88], [1.022, 0.27], [1.058, 0.10], [1.105, 0.04]]
    .forEach(([scale, opacity]) => {
      try {
        const mat = new THREE.LineBasicMaterial({
          color: col, transparent: true, opacity,
          blending: THREE.AdditiveBlending, depthWrite: false
        });
        const ls = new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat);
        ls.scale.setScalar(scale);
        group.add(ls);
      } catch (err) {
        console.warn('[mysection] glow layer failed:', err.message);
      }
    });
  return group;
}
```

Scales and opacities are exact constants. Do not approximate them.

### Sacred geometry constants

Import from `public/js/geometry/constants.js` -- do not redefine them:

```js
import { PHI } from '../geometry/constants.js';
// PHI = (1 + Math.sqrt(5)) / 2  -- golden ratio, the only definition
```

---

## CSS Token System

`public/css/tokens.css` is the single source of truth for all design values. It is loaded
first in `views/index.html`.

**Never hardcode hex values in any stylesheet or inline style.** Always use a CSS custom
property:

```css
/* Correct */
color: var(--hh-fg);
background: var(--hh-void);
border-color: var(--accent-border);

/* Wrong */
color: #F4F0EB;
background: #07040F;
```

### Element accent system

The Oracle assigns an element to the user (`fire`, `earth`, `air`, `water`, or `aether`).
The element is written to `data-element` on the `<html>` element. All interactive accents
cascade from `--accent` and its variants:

| Token | Usage |
|---|---|
| `--accent` | Primary interactive colour (buttons, links, active states) |
| `--accent-muted` | Subtle fill, hover backgrounds |
| `--accent-border` | Border colour at rest |
| `--accent-glow` | Box shadow / glow effect fill |
| `--accent-fg` | Foreground text on dark backgrounds |

```css
/* This adapts automatically when data-element changes */
.btn-primary {
  background: var(--accent);
  color: var(--hh-void);
}
```

### Z-index

Use `var(--z-*)` tokens only. Do not hardcode z-index integers.

### Breakpoints

The project uses four breakpoints: `480px`, `768px`, `1050px`, `1280px`. Do not add others.

---

## API Route Pattern

All API routes live under `/api/` in `routes/api/`. Each file creates and exports an Express
`Router` instance.

### Creating a new route file

```js
// routes/api/myroute.js
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ ok: true });
});

router.post('/', (req, res) => {
  const { value } = req.body;
  if (!value) return res.status(400).json({ error: 'value required' });
  res.json({ value, ok: true });
});

export default router;
```

### Mounting in server.js

Import the router and mount it under the `/api/` prefix:

```js
import myrouteRouter from './routes/api/myroute.js';

// Optional: add rate limiting (production-only by default)
app.use('/api/myroute', rateLimit({
  windowMs: 60_000, max: 30,
  standardHeaders: true, legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production'
}));

app.use('/api/myroute', myrouteRouter);
```

Do not add routes speculatively. Add a route only when a section module requires it.

### Session access

The Oracle-assigned element is available in any route handler via `req.session.element`. The
session is configured in `server.js` with `express-session`.

```js
router.get('/', (req, res) => {
  res.json({ element: req.session.element || null });
});
```

---

## Code Style

### ESLint

ESLint is configured in `.eslintrc.cjs`. Linting covers `public/js/`, `routes/`, and
`tasks/`.

```bash
npm run lint
```

Key rules:

- `no-undef: error` -- all variables must be declared. `THREE` and `gsap` are declared as
  read-only globals in the config so they pass without an import.
- `no-unused-vars: warn` -- prefix intentionally unused parameters with `_` to suppress
  (e.g., `_req`, `_next`).

### ES Modules only

The project has `"type": "module"` in `package.json`. Every file uses `import`/`export`.
`require()` is never used.

```js
// Correct
import { Router } from 'express';
export function init() { /* ... */ }

// Wrong
const { Router } = require('express');
module.exports = { init };
```

### Idempotent `init()` functions

Every section module must be safe to call multiple times. The pattern is a module-level flag:

```js
let initialised = false;

export function init() {
  if (initialised) return;
  initialised = true;
  // one-time setup here
}
```

### No em dashes in code or comments

Use `--` or restructure the sentence. Em dashes (`--`) are reserved for source comments as a
stylistic separator (e.g., `// section title -- description`), but the Unicode em dash
character (`—`) must not appear in source files.

---

## Branch and PR Conventions

| Type | Branch name |
|---|---|
| New section or feature | `feat/section-name` |
| Bug fix | `fix/short-description` |
| Migration from source HTML | `migrate/section-name` |
| CSS/token changes | `style/description` |
| Tests | `test/description` |
| Documentation | `docs/description` |
| Dependencies/config | `chore/description` |

`main` is always deployable. CI runs on all pull requests. Do not merge without passing CI.

Commit message format follows the same prefixes: `feat:`, `fix:`, `migrate:`, `style:`,
`test:`, `docs:`, `chore:`.

---

## Project Structure Reference

```
hardy-house-consulting/
├── server.js               Entry point -- Express app, route mounting
├── routes/
│   ├── pages.js            Catch-all GET → views/index.html
│   └── api/                One file per API resource
├── public/
│   ├── css/
│   │   ├── tokens.css      Design tokens -- always import first
│   │   ├── base.css        Reset + typography
│   │   └── sections/       Per-section stylesheets
│   ├── js/
│   │   ├── app.js          Browser entry -- imports router + elementState
│   │   ├── sections/       One module per hash route, each exports init()
│   │   ├── utils/
│   │   │   ├── router.js   Hash router -- dynamic imports + 80ms init defer
│   │   │   └── createRenderer.js  Shared WebGLRenderer factory
│   │   └── geometry/       Sacred geometry constants and math utilities
│   └── vendor/             Three.js and GSAP (loaded as globals via <script>)
├── views/
│   └── index.html          Single HTML shell; all sections are hidden <section> elements
├── tasks/                  SQLite task database and schema
└── tests/
    ├── unit/               Jest unit tests (geometry modules)
    └── api/                Jest + supertest API route tests
```
