# App Sections — Forensic Commit + E2E Verification Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stage, test, and commit 6,820 lines of implemented section modules (plus supporting assets) to a feature branch, add E2E coverage for all 9 sections, and open a PR.

**Architecture:** All 9 sections already exist as untracked files in the main checkout. Playwright harness also exists in the old worktree at `.claude/worktrees/gallant-bhaskara-d27866/`. Work directly in the main checkout on a feature branch — no separate worktree needed since the untracked files are already there.

**Tech Stack:** Vanilla ES Modules · Three.js r128 (global) · GSAP 3 (global) · Playwright 1.44 · Jest 29

---

## File Map

**To stage from main checkout (already exist, untracked):**
- `views/index.html` — modified on-disk; has all 9 section shells + nav
- `public/css/presentation.css` — 251 lines, styles for presentation section
- `public/js/sections/home.js` — 441 lines, Three.js hero with nested solids + particles
- `public/js/sections/oracle.js` — 329 lines, 5-question element quiz + Platonic reveal
- `public/js/sections/geometry.js` — 1,419 lines, sacred geometry explorer
- `public/js/sections/decomposition.js` — 1,216 lines, Flower of Life → Metatron demo
- `public/js/sections/variants.js` — 873 lines, brand token/colour auditor
- `public/js/sections/tree.js` — 975 lines, Tree of Life with graph canvas
- `public/js/sections/grow.js` — 869 lines, phyllotaxis + fractal canvas
- `public/js/sections/presentation.js` — 520 lines, GSAP slide deck + Three.js canvas
- `public/js/sections/contact.js` — 178 lines, contact card with clipboard

**To copy from old worktree (`.claude/worktrees/gallant-bhaskara-d27866/`):**
- `playwright.config.js` → project root
- `tests/e2e/global-setup.js` → `tests/e2e/`
- `tests/e2e/tasks.spec.js` → `tests/e2e/`

**To create (new):**
- `tests/e2e/sections.spec.js` — E2E tests for all 9 sections

---

## Task 1: Create Feature Branch

**Files:** none (git only)

**Specialists:**
- Domain: config-management
- Lead expertise: git branching from main checkout with untracked files present
- Review focus: branch name matches CI trigger, no accidental staging of untracked files during branch creation

- [ ] **Step 1: Create branch from main checkout**

```bash
git switch -c feat/app-sections
```

Expected: `Switched to a new branch 'feat/app-sections'`

- [ ] **Step 2: Verify untracked files still present**

```bash
git status --short | grep "^??" | head -5
```

Expected: `?? docs/`, `?? public/css/presentation.css`, `?? public/js/sections/`

- [ ] **Step 3: Commit**

No commit yet — this task produces only the branch.

---

## Task 2: Restore Playwright Harness

**Files:**
- Copy: `.claude/worktrees/gallant-bhaskara-d27866/playwright.config.js` → `./playwright.config.js`
- Copy: `.claude/worktrees/gallant-bhaskara-d27866/tests/e2e/global-setup.js` → `./tests/e2e/global-setup.js`
- Copy: `.claude/worktrees/gallant-bhaskara-d27866/tests/e2e/tasks.spec.js` → `./tests/e2e/tasks.spec.js`

**Specialists:**
- Domain: testing-infra
- Lead expertise: Playwright ESM config with webServer globalSetup pattern
- Review focus: webServer URL is reachable from server.js, globalSetup creates DB tables before first test

- [ ] **Step 1: Create tests/e2e directory**

```bash
mkdir -p tests/e2e
```

- [ ] **Step 2: Copy playwright.config.js**

Read from `.claude/worktrees/gallant-bhaskara-d27866/playwright.config.js` and write to `./playwright.config.js`. Content must be:

```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  globalSetup: './tests/e2e/global-setup.js',
  webServer: {
    command: 'node server.js',
    url: 'http://localhost:3000/tasks/api',
    reuseExistingServer: !process.env.CI,
    env: { SESSION_SECRET: process.env.SESSION_SECRET || 'e2e-test-secret' },
  },
  use: { baseURL: 'http://localhost:3000' },
});
```

- [ ] **Step 3: Copy global-setup.js**

Read from `.claude/worktrees/gallant-bhaskara-d27866/tests/e2e/global-setup.js` and write to `./tests/e2e/global-setup.js`.

- [ ] **Step 4: Copy tasks.spec.js**

Read from `.claude/worktrees/gallant-bhaskara-d27866/tests/e2e/tasks.spec.js` and write to `./tests/e2e/tasks.spec.js`.

- [ ] **Step 5: Smoke-run existing e2e suite**

```bash
npx playwright test tests/e2e/tasks.spec.js --reporter=line
```

Expected: `3 passed` (tasks suite from PR #1)

- [ ] **Step 6: Commit Playwright harness**

```bash
git add playwright.config.js tests/e2e/global-setup.js tests/e2e/tasks.spec.js
git commit -m "test(e2e): restore Playwright harness from worktree"
```

---

## Task 3: Commit HTML + CSS Foundation

**Files:**
- Modify: `views/index.html` (already modified on-disk)
- Create: `public/css/presentation.css` (already on-disk, untracked)

**Specialists:**
- Domain: frontend-ui
- Lead expertise: SPA section shell HTML with hash-router data-section attributes
- Review focus: every `[data-section]` in HTML matches exactly one key in `router.js` SECTIONS map, no section shell is missing

- [ ] **Step 1: Verify section shells match router keys**

Run:
```bash
grep 'data-section=' views/index.html | grep -o '"[^"]*"' | sort
```

Expected output (9 values): `"contact"` `"decomposition"` `"geometry"` `"grow"` `"home"` `"oracle"` `"presentation"` `"tree"` `"variants"`

Cross-check against router.js SECTIONS keys:
```bash
grep "import('../sections" public/js/utils/router.js | grep -o "'[^']*'" | sort
```

Expected: same 9 keys. If any mismatch, fix `views/index.html`.

- [ ] **Step 2: Stage and commit HTML + CSS**

```bash
git add views/index.html public/css/presentation.css
git commit -m "feat(app): add section shells to index.html and presentation styles"
```

---

## Task 4: Commit Section Modules

**Files:**
- Create: `public/js/sections/*.js` (9 files, all untracked)

**Specialists:**
- Domain: frontend-ui
- Lead expertise: Vanilla ESM section modules with Three.js + GSAP, idempotent init() pattern
- Review focus: every section imports only from `../utils/` or `../geometry/` (no external imports that break ESM), no missing files, no circular deps

- [ ] **Step 1: Verify imports resolve**

```bash
grep "^import" public/js/sections/*.js | grep -v "from '../" | grep -v "from '../../"
```

Expected: no output (all imports are relative and valid)

- [ ] **Step 2: Stage all section modules**

```bash
git add public/js/sections/
```

- [ ] **Step 3: Verify what will be committed**

```bash
git diff --cached --stat
```

Expected: 9 files, total ~6,820 insertions

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(app): implement all 9 SPA section modules

home: Three.js hero with nested Dodecahedron/Icosahedron/Octahedron and particle field
oracle: 5-question element quiz with Platonic solid reveal
geometry: interactive sacred geometry explorer with shape cards
decomposition: Flower of Life to Metatron's Cube walkthrough with canvas
variants: brand token and colour contrast auditor
tree: Tree of Life visualisation with sefirot graph
grow: phyllotaxis and fractal growth patterns
presentation: GSAP slide deck with Three.js background
contact: card with clipboard email copy"
```

---

## Task 5: Write E2E Tests for All 9 Sections

**Files:**
- Create: `tests/e2e/sections.spec.js`

**Specialists:**
- Domain: testing-infra
- Lead expertise: Playwright E2E tests for hash-router SPA with Three.js canvases
- Review focus: each test navigates to the correct hash, waits for init() to complete (80ms setTimeout + render), asserts a DOM element injected by the section's init() — not a static placeholder

- [ ] **Step 1: Write the test file**

Create `tests/e2e/sections.spec.js`:

```js
import { test, expect } from '@playwright/test';

// Each section uses an 80ms setTimeout before reading canvas dimensions.
// Wait 600ms after navigation to guarantee init() has completed.
const INIT_WAIT = 600;

async function goTo(page, hash) {
  await page.goto('/' + hash);
  await page.waitForTimeout(INIT_WAIT);
}

// -- home ---------------------------------------------------------------
test.describe('#home — hero section', () => {
  test('injects .hero-content with heading text', async ({ page }) => {
    await goTo(page, '#home');
    const content = page.locator('.hero-content');
    await expect(content).toBeVisible();
    await expect(content).toContainText('Geometry is not');
  });

  test('canvas #heroCanvas is mounted and non-zero', async ({ page }) => {
    await goTo(page, '#home');
    const canvas = page.locator('#heroCanvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });
});

// -- oracle -------------------------------------------------------------
test.describe('#oracle — element quiz', () => {
  test('renders the first question text', async ({ page }) => {
    await goTo(page, '#oracle');
    await expect(page.locator('[data-oracle="steps"]')).toBeVisible();
    await expect(page.locator('[data-oracle="steps"]')).toContainText('How do you work best?');
  });
});

// -- geometry -----------------------------------------------------------
test.describe('#geometry — sacred geometry explorer', () => {
  test('renders the section heading', async ({ page }) => {
    await goTo(page, '#geometry');
    await expect(page.locator('[data-section="geometry"]')).toContainText('Sacred Geometry of the Brand');
  });

  test('at least one .sc-canvas is present', async ({ page }) => {
    await goTo(page, '#geometry');
    const canvases = page.locator('.sc-canvas');
    await expect(canvases.first()).toBeVisible();
  });
});

// -- decomposition ------------------------------------------------------
test.describe('#decomposition — Flower of Life demo', () => {
  test('renders the section heading', async ({ page }) => {
    await goTo(page, '#decomposition');
    await expect(page.locator('[data-section="decomposition"]')).toContainText('From Circle to');
  });

  test('renders the Metatron step node', async ({ page }) => {
    await goTo(page, '#decomposition');
    await expect(page.locator('#dec-pn-met')).toBeVisible();
  });
});

// -- variants -----------------------------------------------------------
test.describe('#variants — brand token auditor', () => {
  test('section is visible after init', async ({ page }) => {
    await goTo(page, '#variants');
    const section = page.locator('[data-section="variants"]');
    await expect(section).toBeVisible();
    // variants injects colour swatches — check at least one .vt-sw is present
    const swatches = section.locator('.vt-sw');
    await expect(swatches.first()).toBeVisible();
  });
});

// -- tree ---------------------------------------------------------------
test.describe('#tree — Tree of Life', () => {
  test('renders the Tree of Life heading', async ({ page }) => {
    await goTo(page, '#tree');
    await expect(page.locator('[data-section="tree"]')).toContainText('The Tree of Life');
  });

  test('#tree-canvas is present and non-zero', async ({ page }) => {
    await goTo(page, '#tree');
    const canvas = page.locator('#tree-canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });
});

// -- grow ---------------------------------------------------------------
test.describe('#grow — phyllotaxis and fractal', () => {
  test('renders the grow tabs', async ({ page }) => {
    await goTo(page, '#grow');
    await expect(page.locator('[data-tab="phyllo"]')).toBeVisible();
    await expect(page.locator('[data-tab="fractal"]')).toBeVisible();
  });

  test('.grow-bg canvas is present', async ({ page }) => {
    await goTo(page, '#grow');
    const canvas = page.locator('.grow-bg');
    await expect(canvas).toBeVisible();
  });
});

// -- presentation -------------------------------------------------------
test.describe('#presentation — slide deck', () => {
  test('section is visible and canvas is present', async ({ page }) => {
    await goTo(page, '#presentation');
    const section = page.locator('[data-section="presentation"]');
    await expect(section).toBeVisible();
    const canvas = section.locator('canvas');
    await expect(canvas).toBeVisible();
  });
});

// -- contact ------------------------------------------------------------
test.describe('#contact — contact card', () => {
  test('renders #contactContainer with name and role', async ({ page }) => {
    await goTo(page, '#contact');
    await expect(page.locator('#contactContainer')).toBeVisible();
    await expect(page.locator('#contactName')).toContainText('James');
    await expect(page.locator('#contactRole')).toContainText('Modern Workplace');
  });

  test('"Get in touch" panel is visible', async ({ page }) => {
    await goTo(page, '#contact');
    await expect(page.locator('#contactPanelTitle')).toContainText('Get in touch');
  });
});
```

- [ ] **Step 2: Run the new tests**

```bash
npx playwright test tests/e2e/sections.spec.js --reporter=line
```

Expected: all tests pass. If a test fails, investigate whether:
  a) The section's init() is not running (check browser console output with `--headed`)
  b) The DOM selector is wrong (cross-check against the section JS file)
  c) The page needs more wait time (increase `INIT_WAIT` to 1000)

- [ ] **Step 3: Commit the test file**

```bash
git add tests/e2e/sections.spec.js
git commit -m "test(e2e): add Playwright coverage for all 9 SPA sections"
```

---

## Task 6: Full Suite Verification + Push + PR

**Files:** none (verification + git only)

**Specialists:**
- Domain: testing-infra
- Lead expertise: full test suite coordination — Jest unit + API + Playwright e2e
- Review focus: no regressions in unit/API tests from section commits, all 9 new e2e tests pass

- [ ] **Step 1: Run Jest suites (regression guard)**

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js 2>&1 | tail -5
```

Expected: `Test Suites: 3 passed, 3 total · Tests: 17 passed, 17 total`

- [ ] **Step 2: Run full Playwright suite**

```bash
npx playwright test --reporter=line 2>&1 | tail -10
```

Expected: `tasks.spec.js` 3 tests + `sections.spec.js` ~14 tests = all passed

- [ ] **Step 3: Stage any docs or cleanup**

```bash
git add docs/
git status --short
```

Review status. Commit any remaining tracked docs:
```bash
git commit -m "chore: add superpowers session logs" --allow-empty-message
```

Only commit docs/ if any docs files are staged. Skip this step if nothing staged.

- [ ] **Step 4: Push branch**

```bash
git push -u origin feat/app-sections
```

- [ ] **Step 5: Open PR**

```bash
gh pr create \
  --title "feat(app): implement all 9 SPA section modules with E2E coverage" \
  --body "$(cat <<'EOF'
## Summary

- Restores and commits 6,820 lines of implemented section modules previously left untracked
- Adds `playwright.config.js` + Playwright E2E harness (3 tasks tests + 14 section tests)
- Commits `views/index.html` (all 9 section shells + nav) and `public/css/presentation.css`
- All sections: idempotent `init()`, Three.js via `createRenderer()` factory, GSAP entrance animations
- No hardcoded hex values — all colours via `tokens.css` custom properties

## Sections

| Hash | Module | Status |
|------|--------|--------|
| `#home` | `home.js` | Hero: Three.js nested solids + 350-particle field |
| `#oracle` | `oracle.js` | 5-question element quiz → Platonic solid reveal |
| `#geometry` | `geometry.js` | Sacred geometry explorer, shape cards with orbitControl |
| `#decomposition` | `decomposition.js` | FoL → Fruit of Life → Metatron → Platonic walkthrough |
| `#variants` | `variants.js` | Brand token + WCAG contrast auditor |
| `#tree` | `tree.js` | Tree of Life with sefirot graph canvas |
| `#grow` | `grow.js` | Phyllotaxis + fractal growth patterns |
| `#presentation` | `presentation.js` | GSAP slide deck with Three.js canvas background |
| `#contact` | `contact.js` | Contact card with clipboard email copy |

## Test plan
- [ ] Jest: 17 unit/API tests pass (no regressions)
- [ ] Playwright: 3 tasks tests + 14 section tests pass
- [ ] CI green on all checks

🤖 Generated with [Claude Code](https://claude.ai/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- All 9 sections from CLAUDE.md section map ✅
- Each section has an E2E test ✅
- `views/index.html` updated ✅
- `public/css/presentation.css` committed ✅
- `playwright.config.js` restored ✅
- `tests/e2e/tasks.spec.js` restored ✅

**Placeholder scan:** None found.

**Type consistency:** All DOM selectors in tests cross-referenced against section JS files — `.hero-content`, `#heroCanvas`, `[data-oracle="steps"]`, `.sc-canvas`, `.dec-title`, `#dec-pn-met`, `.vt-sw`, `#tree-canvas`, `[data-tab="phyllo"]`, `.grow-bg`, `#contactContainer`, `#contactName`, `#contactRole`, `#contactPanelTitle` — all confirmed present in the JS files.

**Specialist annotations:** All tasks have Specialists blocks ✅

---

## Fleet Budget

**Fleet 4: 6 direct tasks · 0 subagents · 0 triads**

All tasks are mechanical: copy files, stage, commit, write deterministic tests with known DOM selectors. No adversarial triad needed — correctness is verified by the test run itself.
