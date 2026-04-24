# Project Scaffold — Hardy House App

## Folder structure

```
hardy-house/
│
├── CLAUDE.md                         ← Agent instructions (read first)
├── PROMPT.md                         ← First session prompt (delete after session 1)
├── package.json
├── .env                              ← Local only — never commit
├── .env.example
├── .gitignore
│
├── server.js                         ← Express entry point
│
├── public/
│   ├── vendor/                       ← Copy from _vendor/ — never modify
│   │   ├── three.r128.min.js
│   │   ├── gsap.3.12.2.min.js
│   │   └── ScrollTrigger.3.12.2.min.js
│   │
│   ├── css/
│   │   ├── tokens.css                ← From package root — design tokens
│   │   ├── base.css                  ← Reset, html/body, typography
│   │   ├── nav.css                   ← Navigation shell
│   │   ├── sections.css              ← Section wrappers, cards, grids
│   │   └── animations.css            ← Keyframes and transition classes
│   │
│   ├── js/
│   │   ├── app.js                    ← Browser entry point
│   │   │
│   │   ├── utils/
│   │   │   ├── createRenderer.js     ← Shared WebGLRenderer factory
│   │   │   ├── orbitControl.js       ← OrbitControl class
│   │   │   ├── motion.js             ← GSAP helpers
│   │   │   └── router.js             ← Hash router
│   │   │
│   │   ├── geometry/
│   │   │   ├── constants.js          ← PHI, SQ3H, FOL_R
│   │   │   ├── fol.js                ← FOL_AX, FOL_PTS, FRUIT_IDX, MET_PTS, MET_EDGES
│   │   │   ├── solids.js             ← PLATONIC, EXTENDED, SOLIDS
│   │   │   ├── buildGlowEdge.js      ← 4-layer glow builder
│   │   │   └── buildFaceMesh.js      ← Face mesh builder
│   │   │
│   │   ├── sections/
│   │   │   ├── home.js
│   │   │   ├── oracle.js
│   │   │   ├── geometry.js
│   │   │   ├── decomposition.js
│   │   │   ├── variants.js
│   │   │   ├── tree.js
│   │   │   ├── grow.js
│   │   │   ├── presentation.js
│   │   │   └── contact.js
│   │   │
│   │   ├── oracle.js                 ← Element Oracle quiz logic
│   │   └── elementState.js           ← Element persistence (API + localStorage)
│   │
│   └── assets/images/
│
├── views/
│   ├── index.html                    ← Shell: nav, section divs, footer
│   └── partials/
│
├── routes/
│   ├── pages.js
│   └── api/
│       ├── element.js
│       ├── export.js
│       └── agents.js
│
├── src/
│   └── middleware/
│       └── session.js
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── api/
│
├── _source/                          ← Migration source — do not deploy
├── _docs/                            ← Reference docs — do not deploy
├── _vendor/                          ← Copy to public/vendor/ — do not import directly
│
└── .github/workflows/ci.yml
```

---

## File specs

### `server.js`
```js
import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pagesRouter   from './routes/pages.js';
import elementRouter from './routes/api/element.js';
import exportRouter  from './routes/api/export.js';
import agentsRouter  from './routes/api/agents.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '5mb' }));
app.use(express.static(join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use('/',             pagesRouter);
app.use('/api/element',  elementRouter);
app.use('/api/export',   exportRouter);
app.use('/api/agents',   agentsRouter);

app.listen(PORT, () => console.log(`Hardy House running on http://localhost:${PORT}`));
```

### `routes/pages.js`
```js
import { Router } from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();
router.get('*', (req, res) => res.sendFile(join(__dirname, '../views/index.html')));
export default router;
```

### `public/js/utils/createRenderer.js`
```js
export function createRenderer(canvas, {
  alpha = true, clearColor = 0x07040F, clearAlpha = 0
} = {}) {
  const wrap = canvas.parentElement;
  const W = wrap.clientWidth  || 400;
  const H = wrap.clientHeight || 400;
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha, preserveDrawingBuffer: true
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.setClearColor(clearColor, clearAlpha);
  new ResizeObserver(() => {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (w && h) renderer.setSize(w, h);
  }).observe(wrap);
  return renderer;
}
```

### `public/js/utils/router.js`
```js
const SECTIONS = {
  home:         () => import('./sections/home.js'),
  oracle:       () => import('./sections/oracle.js'),
  geometry:     () => import('./sections/geometry.js'),
  decomposition:() => import('./sections/decomposition.js'),
  variants:     () => import('./sections/variants.js'),
  tree:         () => import('./sections/tree.js'),
  grow:         () => import('./sections/grow.js'),
  presentation: () => import('./sections/presentation.js'),
  contact:      () => import('./sections/contact.js'),
};

const loaded = new Set();

export function initRouter() {
  window.addEventListener('hashchange', navigate);
  navigate();
}

async function navigate() {
  const id  = location.hash.slice(1) || 'home';
  const all = document.querySelectorAll('[data-section]');
  all.forEach(el => el.hidden = el.dataset.section !== id);
  document.querySelectorAll('.nav-link')
    .forEach(a => a.classList.toggle('active', a.dataset.section === id));
  if (!loaded.has(id) && SECTIONS[id]) {
    const mod = await SECTIONS[id]();
    setTimeout(() => mod.init?.(), 80);
    loaded.add(id);
  }
  localStorage.setItem('hh-last-section', id);
}
```

### `public/js/elementState.js`
```js
const VALID = ['fire', 'earth', 'air', 'water', 'aether'];

export async function getElement() {
  try {
    const res  = await fetch('/api/element');
    const data = await res.json();
    if (data.element) return applyElement(data.element);
  } catch {}
  const local = localStorage.getItem('hh-element');
  if (local && VALID.includes(local)) applyElement(local);
  return local || null;
}

export async function setElement(element) {
  if (!VALID.includes(element)) return;
  localStorage.setItem('hh-element', element);
  applyElement(element);
  try {
    await fetch('/api/element', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ element })
    });
  } catch {}
}

function applyElement(element) {
  document.documentElement.dataset.element = element;
  return element;
}
```

### `routes/api/element.js`
```js
import { Router } from 'express';
const router = Router();
const VALID = ['fire', 'earth', 'air', 'water', 'aether'];

router.get('/', (req, res) => {
  res.json({ element: req.session.element || null });
});

router.post('/', (req, res) => {
  const { element } = req.body;
  if (!VALID.includes(element))
    return res.status(400).json({ error: 'Invalid element' });
  req.session.element = element;
  res.json({ element, ok: true });
});

export default router;
```

### `public/js/geometry/constants.js`
```js
export const PHI   = (1 + Math.sqrt(5)) / 2;  // Golden ratio — the only definition
export const SQ3H  = Math.sqrt(3) / 2;         // √3/2 — used in hexagonal grid math
export const FOL_R = 1.0;                       // Flower of Life circle radius
```

---

## `package.json`
```json
{
  "name": "hardy-house",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev":       "nodemon server.js",
    "start":     "node server.js",
    "test":      "jest",
    "test:unit": "jest tests/unit/",
    "test:api":  "jest tests/api/",
    "test:e2e":  "playwright test",
    "lint":      "eslint public/js/ src/ routes/"
  },
  "dependencies": {
    "express":         "^4.18",
    "express-session": "^1.17"
  },
  "devDependencies": {
    "nodemon":           "^3",
    "jest":              "^29",
    "supertest":         "^6",
    "@playwright/test":  "^1.44",
    "eslint":            "^8"
  }
}
```

---

## `.env.example`
```
PORT=3000
SESSION_SECRET=replace-with-64-random-chars
NODE_ENV=development
```

---

## `.gitignore`
```
node_modules/
.env
coverage/
playwright-report/
test-results/
*.log
.DS_Store
```

---

## First Session Checklist

Run these in order. Stop after step 21. Do not begin section migration in Session 1.

```
[ ] 1.  Read CLAUDE.md, project-scaffold.md, tokens.css fully
[ ] 2.  npm init -y  (or use the package.json above)
[ ] 3.  npm install express express-session
[ ] 4.  npm install -D nodemon jest supertest @playwright/test eslint
[ ] 5.  Create .gitignore
[ ] 6.  Create .env (generate SESSION_SECRET: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
[ ] 7.  Create .env.example
[ ] 8.  mkdir -p public/vendor public/css public/js/utils public/js/geometry public/js/sections public/assets/images views/partials routes/api src/middleware tests/unit tests/integration tests/api _source _docs _vendor
[ ] 9.  Copy tokens.css → public/css/tokens.css
[ ] 10. Copy _vendor/*.js → public/vendor/
[ ] 11. Write server.js
[ ] 12. Write routes/pages.js
[ ] 13. Write views/index.html (shell: nav bar, <div data-section="home">, etc for each section, script tags loading vendor + app.js as module)
[ ] 14. Write public/js/utils/createRenderer.js
[ ] 15. Write public/js/utils/router.js
[ ] 16. Write public/js/utils/orbitControl.js (extract from _source/hardy-house-app-demo.html)
[ ] 17. Write public/js/elementState.js
[ ] 18. Write routes/api/element.js
[ ] 19. Write public/js/geometry/constants.js
[ ] 20. Write public/js/app.js (imports initRouter + getElement, calls both on DOMContentLoaded)
[ ] 21. npm run dev → confirm http://localhost:3000 returns the shell HTML
[ ] 22. git init && git add . && git commit -m "scaffold: project structure and server"
```

After step 22: stop. Report what was created and any issues. Wait for Session 2 instruction.
