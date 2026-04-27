# Global Chrome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the missing `base.css` global stylesheet — styled nav bar with active states, body/layout rules, mobile hamburger for ≤768px, and GSAP section-transition fade — so the app shell looks intentional during a live demo.

**Architecture:** Three self-contained files. `base.css` is pure CSS (token-only, no hardcoded hex). The hamburger adds one `<button>` to `index.html` and a 30-line JS toggle in a new `nav.js` utility. Section transitions hook into the existing `router.js` navigate function via a thin GSAP wrapper — no structural changes to the router contract.

**Tech Stack:** Vanilla CSS (tokens.css custom properties) · Vanilla ES Modules · GSAP 3 (global `window.gsap`) · Playwright E2E

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `public/css/base.css` | **Create** | Body reset, nav, footer, `.section-inner`, `.muted`, toast, skip-link |
| `public/js/utils/nav.js` | **Create** | Hamburger open/close toggle + keyboard/click-outside dismiss |
| `public/js/utils/router.js` | **Modify** | Wrap section show/hide with GSAP fade (100ms out → instant swap → 150ms in) |
| `views/index.html` | **Modify** | `<link>` for `base.css`; hamburger `<button>` in `<nav>`; `<script>` for `nav.js` |
| `tests/e2e/sections.spec.js` | **Modify** | 3 new tests: nav active state, mobile hamburger open/close, section transition |

---

### Task 1 — `base.css`: Global chrome stylesheet

**Files:**
- Create: `public/css/base.css`
- Modify: `views/index.html` — add `<link rel="stylesheet" href="/css/base.css">` as first stylesheet (after `tokens.css`)

**Specialists:**
- Domain: frontend-ui
- Lead expertise: CSS custom property systems, dark-mode design token application, sticky nav patterns
- Review focus: token compliance (no hardcoded hex), z-index stack integrity (`--z-sticky: 50` for nav, `--z-toast: 200` for toast), mobile overflow behaviour of 10 nav items before hamburger is added in T2
- Model: Haiku triad

- [ ] **Step 1: Create `public/css/base.css`**

```css
/* base.css — Hardy House Consulting global chrome
 * All values from tokens.css. Never hardcode hex here.
 * Loaded after tokens.css, before all section stylesheets.
 */

/* ── Reset ─────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Body ──────────────────────────────────────────────── */
html { scroll-behavior: smooth; }

body {
  background: var(--hh-void);
  color: var(--hh-fg);
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  min-height: 100dvh;
  overflow-x: hidden;
}

/* ── Skip link (accessibility) ─────────────────────────── */
.skip-link {
  position: absolute;
  top: -999px;
  left: var(--space-4);
  background: var(--hh-gold);
  color: var(--hh-void);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  text-decoration: none;
  z-index: var(--z-toast);
}
.skip-link:focus { top: var(--space-2); }

/* ── Nav ────────────────────────────────────────────────── */
.site-nav {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  display: flex;
  align-items: center;
  gap: var(--space-6);
  height: var(--nav-h);
  padding: 0 var(--section-pad-x);
  background: rgba(7, 4, 15, 0.80);
  backdrop-filter: var(--blur-md);
  -webkit-backdrop-filter: var(--blur-md);
  border-bottom: 1px solid var(--border-1);
}

.brand {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: var(--tracking-tight);
  color: var(--hh-fg);
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
}
.brand:hover { color: var(--accent-fg); }

.nav-links {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  list-style: none;
  flex-wrap: nowrap;
  overflow: hidden;
}

.nav-link {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--hh-fg-3);
  text-decoration: none;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  transition: color var(--dur-base), border-color var(--dur-base), background var(--dur-base);
  white-space: nowrap;
}

.nav-link:hover {
  color: var(--hh-fg-2);
  background: var(--surface-2);
}

.nav-link.active {
  color: var(--accent-fg);
  border-color: var(--accent-border);
  background: var(--accent-muted);
}

/* Hamburger button — hidden on desktop, shown on mobile (T2 adds responsive rules) */
.nav-toggle {
  display: none;
  margin-left: auto;
  background: none;
  border: 1px solid var(--border-2);
  border-radius: var(--radius-sm);
  color: var(--hh-fg-2);
  cursor: pointer;
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wide);
  flex-shrink: 0;
}
.nav-toggle:hover { border-color: var(--border-3); color: var(--hh-fg); }

/* ── Main / Sections ────────────────────────────────────── */
.sections {
  min-height: calc(100dvh - var(--nav-h));
}

/* Default section wrapper — JS may override with richer DOM */
.section-inner {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--section-pad-y) var(--section-pad-x);
}

/* ── Typography helpers ──────────────────────────────────── */
.muted {
  color: var(--hh-fg-3);
  font-size: var(--text-sm);
}

h1, h2, h3 {
  font-family: var(--font-display);
  font-weight: 600;
  line-height: var(--leading-tight);
  color: var(--hh-fg);
}

a { color: var(--accent-fg); text-decoration: none; }
a:hover { text-decoration: underline; }

/* ── Footer ─────────────────────────────────────────────── */
.site-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-6) var(--section-pad-x);
  border-top: 1px solid var(--border-1);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wide);
  color: var(--hh-fg-4);
}

/* ── Toast ──────────────────────────────────────────────── */
#toast {
  position: fixed;
  bottom: var(--space-8);
  left: 50%;
  transform: translateX(-50%) translateY(var(--space-4));
  background: var(--surface-3);
  border: 1px solid var(--border-2);
  color: var(--hh-fg-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wide);
  padding: var(--space-2) var(--space-6);
  border-radius: var(--radius-full);
  backdrop-filter: var(--blur-sm);
  z-index: var(--z-toast);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--dur-base) var(--ease-out),
              transform var(--dur-base) var(--ease-out);
}

#toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* ── Focus ring (global) ────────────────────────────────── */
:focus-visible { outline: none; box-shadow: var(--ring); }
```

- [ ] **Step 2: Add `base.css` link to `views/index.html`**

In `views/index.html`, change line 20:
```html
  <link rel="stylesheet" href="/css/tokens.css">
```
to:
```html
  <link rel="stylesheet" href="/css/tokens.css">
  <link rel="stylesheet" href="/css/base.css">
```

- [ ] **Step 3: Run Playwright to confirm no regressions**

```bash
npm run test:e2e
```
Expected: 36 passed. If any section test fails, the CSS is conflicting with section-specific styles — check specificity.

- [ ] **Step 4: Commit**

```bash
git add public/css/base.css views/index.html
git commit -m "feat(chrome): add base.css — nav, body, footer, toast global styles"
```

---

### Task 2 — Mobile hamburger nav

**Files:**
- Create: `public/js/utils/nav.js`
- Modify: `public/css/base.css` — append responsive rules
- Modify: `views/index.html` — add `<button class="nav-toggle">` and `<script type="module" src="/js/utils/nav.js">`

**Specialists:**
- Domain: frontend-ui
- Lead expertise: Accessible hamburger patterns, focus-trap, `aria-expanded`, keyboard dismiss
- Review focus: focus management when menu closes (return focus to toggle), `click outside` listener cleanup, touch-target size ≥44px, nav overflow at exactly 768px boundary
- Model: Sonnet triad

- [ ] **Step 1: Add hamburger button to `views/index.html`**

After line 38 (`<a class="brand" href="#home">Hardy House</a>`), add:
```html
    <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false" aria-controls="nav-links-list">&#9776;</button>
```

Add `id="nav-links-list"` to the `<ul>`:
```html
    <ul class="nav-links" id="nav-links-list">
```

- [ ] **Step 2: Add responsive CSS to `public/css/base.css`**

Append to the end of `base.css`:
```css
/* ── Mobile nav (≤768px) ────────────────────────────────── */
@media (max-width: 768px) {
  .nav-toggle { display: flex; align-items: center; }

  .nav-links {
    display: none;
    position: fixed;
    top: var(--nav-h);
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    background: rgba(7, 4, 15, 0.96);
    backdrop-filter: var(--blur-lg);
    -webkit-backdrop-filter: var(--blur-lg);
    border-bottom: 1px solid var(--border-1);
    padding: var(--space-4) var(--section-pad-x);
    gap: var(--space-2);
    z-index: calc(var(--z-sticky) - 1);
  }

  .nav-links.open { display: flex; }

  .nav-link {
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-sm);
  }

  /* Push hamburger to right edge */
  .site-nav { justify-content: space-between; }
}
```

- [ ] **Step 3: Create `public/js/utils/nav.js`**

```js
// nav.js — mobile hamburger toggle
// Runs once on DOMContentLoaded; no framework dependency.

const toggle = document.querySelector('.nav-toggle');
const list   = document.getElementById('nav-links-list');

if (toggle && list) {
  function open()  {
    list.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.textContent = '✕'; // ✕
  }
  function close() {
    list.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '☰'; // ☰
    toggle.focus();
  }

  toggle.addEventListener('click', () =>
    list.classList.contains('open') ? close() : open()
  );

  // Close on nav-link click (hash navigation)
  list.addEventListener('click', e => {
    if (e.target.matches('.nav-link')) close();
  });

  // Close on click outside
  document.addEventListener('click', e => {
    if (!toggle.contains(e.target) && !list.contains(e.target)) close();
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && list.classList.contains('open')) close();
  });
}
```

- [ ] **Step 4: Add `nav.js` to `views/index.html`**

Before the closing `</body>` tag, add after the existing `<script type="module" src="/js/app.js">` line:
```html
  <script type="module" src="/js/utils/nav.js"></script>
```

- [ ] **Step 5: Run Jest + Playwright**

```bash
npm test -- --testPathPattern="^(?!.*worktrees)"
npm run test:e2e
```
Expected: 64/64 Jest · 36/36 Playwright (no regressions).

- [ ] **Step 6: Commit**

```bash
git add public/css/base.css public/js/utils/nav.js views/index.html
git commit -m "feat(nav): mobile hamburger toggle with aria-expanded and keyboard dismiss"
```

---

### Task 3 — Section transition fade via router

**Files:**
- Modify: `public/js/utils/router.js` — wrap `el.hidden` toggle with GSAP fade
- Modify: `tests/e2e/sections.spec.js` — 3 new tests (nav active, mobile nav, transition)

**Specialists:**
- Domain: frontend-ui
- Lead expertise: GSAP timeline sequencing with async/await, Three.js RAF interaction with CSS opacity changes, idempotent animation guard
- Review focus: RAF frames continuing during fade (Three.js animates independently of CSS opacity — confirm canvas stays live), `hidden` attribute timing vs GSAP opacity timing, rapid double-navigation cancelling in-flight animation
- Model: Sonnet triad

- [ ] **Step 1: Read current `public/js/utils/router.js`**

Confirm the `navigate()` function structure before editing.

- [ ] **Step 2: Modify `navigate()` in `router.js`**

Replace the `all.forEach` section inside `navigate()` with a GSAP-guarded version. The current code (lines 26–35 approximately):

```js
async function navigate() {
  const id  = location.hash.slice(1) || 'home';
  const all = document.querySelectorAll('[data-section]');
  all.forEach(el => {
    if (el.tagName === 'SECTION') el.hidden = el.dataset.section !== id;
  });
  // ... module loading below
```

Replace with:
```js
async function navigate() {
  const id   = location.hash.slice(1) || 'home';
  const all  = document.querySelectorAll('section[data-section]');
  const next = document.querySelector(`section[data-section="${id}"]`);
  const curr = document.querySelector('section[data-section]:not([hidden])');

  if (window.gsap && curr && curr !== next) {
    // Fade out current, swap, fade in next
    await window.gsap.to(curr, { opacity: 0, duration: 0.1, ease: 'power1.in' });
    all.forEach(el => { el.hidden = el.dataset.section !== id; });
    if (next) {
      next.style.opacity = '0';
      window.gsap.to(next, { opacity: 1, duration: 0.15, ease: 'power1.out' });
    }
  } else {
    // No GSAP or first load — instant swap
    all.forEach(el => { el.hidden = el.dataset.section !== id; });
  }
  // ... rest of navigate() unchanged (module loading, nav-link active toggle)
```

- [ ] **Step 3: Add 3 E2E tests to `tests/e2e/sections.spec.js`**

Add a new top-level `describe` block at the end of the file, after the `#contact` block:

```js
describe('global chrome', () => {
  test('nav link for current section has class active', async ({ page }) => {
    await goTo(page, '#oracle');
    await expect(page.locator('.nav-link[href="#oracle"]')).toHaveClass(/active/);
    await expect(page.locator('.nav-link[href="#home"]')).not.toHaveClass(/active/);
  });

  test('section transition does not leave opacity:0 on arriving section', async ({ page }) => {
    await goTo(page, '#home');
    await goTo(page, '#geometry');
    const section = page.locator('section[data-section="geometry"]');
    await expect(section).toBeVisible();
    // Opacity should be 1 (or unset) after transition completes
    const opacity = await section.evaluate(el => getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeGreaterThan(0.9);
  });

  test('mobile nav toggle shows and hides the nav list', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    await goTo(page, '#home');
    const toggle = page.locator('.nav-toggle');
    const list   = page.locator('#nav-links-list');
    await expect(toggle).toBeVisible();
    await expect(list).toBeHidden();
    await toggle.click();
    await expect(list).toBeVisible();
    await toggle.click();
    await expect(list).toBeHidden();
  });
});
```

- [ ] **Step 4: Run full test suite**

```bash
npm test -- --testPathPattern="^(?!.*worktrees)"
npm run test:e2e
```
Expected: 64/64 Jest · 39/39 Playwright (36 existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add public/js/utils/router.js tests/e2e/sections.spec.js
git commit -m "feat(router): GSAP fade transition between sections + E2E chrome tests"
```

---

## Verification

```bash
npm test -- --testPathPattern="^(?!.*worktrees)"   # 64/64
npm run test:e2e                                    # 39/39
```

Manual smoke (run `npm run dev` first):
1. Navigate to any section — nav bar is dark with brand name + links on the right; active link is gold-tinted
2. Resize to ≤768px — hamburger appears; click it → menu drops down; click a link → menu closes and section changes
3. Navigate between sections — 100–150ms GSAP fade is visible but not jarring
4. `#toast` notification (trigger via contact click) — appears from bottom, auto-fades

---

## Fleet Composition

**Fleet 14: 0 direct · 0 Explore · 3 single specialists · 0 triads**

| Task | Role | Model |
|---|---|---|
| T1 — `base.css` | CSS specialist | Haiku |
| T2 — Mobile hamburger | Frontend specialist | Sonnet |
| T3 — Section transitions + tests | Frontend/E2E specialist | Sonnet |

Each task produces a standalone commit. T2 depends on T1 (needs `.nav-toggle` CSS). T3 is independent of T2 but shares the E2E file — dispatch T1 first, then T2 and T3 in parallel.
