<!-- generated-by: gsd-doc-writer -->
# Contributing to Hardy House Consulting

See [README.md](README.md) for project overview and [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md) for prerequisites and first-run instructions.

---

## Development setup

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the full local setup walkthrough. Short path:

```bash
git clone <repo-url>
cd hardy-house
npm install
cp .env.example .env   # set SESSION_SECRET
npm run dev
```

---

## Branch strategy

| Branch type | Pattern | Notes |
|---|---|---|
| Main | `main` | Always deployable -- do NOT push directly |
| Feature | `feat/section-name` | New section or feature work |
| Bug fix | `fix/description` | Bug fix or regression |

CI must pass on all PRs to `main`. Direct pushes to `main` are blocked.

---

## Commit conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

**Allowed types:**

| Type | When to use |
|---|---|
| `feat` | New section or feature |
| `fix` | Bug fix |
| `migrate` | Move logic from a source HTML file into a section module |
| `style` | CSS/token changes only |
| `test` | Test additions or fixes |
| `docs` | CLAUDE.md or other documentation |
| `chore` | Dependencies, config, scaffolding |

**Examples:**

```
feat(oracle): add fire element quiz variant
fix(geometry): correct Metatron edge count invariant
migrate(geometry): port hardy-house-geometry.html into geometry.js
test(api): add contact rate-limit edge case
style(tokens): adjust --hh-gold contrast ratio
```

---

## Pre-PR checklist

Before opening a PR, confirm all of the following pass locally:

- [ ] `npm test` -- Jest unit + API tests pass
- [ ] `npm run test:e2e` -- Playwright E2E tests pass
- [ ] `npm run lint` -- ESLint reports no errors
- [ ] No temp files present (`*.scratch.*`, `temp_*`)

---

## Key code rules

These rules are enforced by CI and tests. Violations will block merge.

### Section modules

Each section lives in `public/js/sections/` and exports exactly one function:

```js
// public/js/sections/mysection.js
export function init() {
  // idempotent -- safe to call more than once
}
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the full section pattern.

### Three.js renderer

Always use the shared factory. Never instantiate `WebGLRenderer` directly.

```js
// CORRECT
import { createRenderer } from '../utils/createRenderer.js';
const renderer = createRenderer(canvas);

// WRONG -- do not write this
const renderer = new THREE.WebGLRenderer({ canvas });
```

The factory sets `preserveDrawingBuffer: true` (required for PNG export) and handles canvas sizing correctly.

### CSS tokens

Never hardcode hex values. Use design tokens from `tokens.css`:

```css
/* CORRECT */
color: var(--accent);
background: var(--hh-void);

/* WRONG */
color: #C49A1F;
background: #07040F;
```

Breakpoints are fixed at `480px / 768px / 1050px / 1280px`. Do not add others.

### Sacred geometry invariants

These constants are mathematical facts. Tests enforce them. Do not change these values:

| Constant | Value |
|---|---|
| `PHI` | `(1 + Math.sqrt(5)) / 2` |
| `FOL_PTS.length` | `19` |
| `FRUIT_IDX.length` | `13` |
| `MET_EDGES.length` | `78` |
| `PLATONIC.length` | `5` |
| `EXTENDED.length` | `6` |
| Glow layers | `4` |

If your code produces different numbers, the code is wrong -- not the constants.

---

## CI gate

CI runs on every push and PR via `.github/workflows/ci.yml` (Node.js 20, Ubuntu):

1. `npm ci` -- install dependencies
2. `npm test` -- Jest unit + API tests
3. `npm run test:e2e` -- Playwright E2E (Chromium)

PRs cannot merge until CI is green. There is no lint step in CI currently -- run `npm run lint` locally before pushing.

---

## Testing guidance

See [docs/TESTING.md](docs/TESTING.md) for the full testing reference, including coverage targets, file naming conventions, and how to write new tests.

**Coverage requirements:**
- Geometry modules: 85% line coverage minimum
- API routes: 100% line coverage

---

## Issue reporting

Open an issue on GitHub. Include:

- Steps to reproduce
- Expected behaviour
- Actual behaviour
- Browser and OS (for rendering issues, include GPU/driver info)
- Console errors (screenshot or paste)
