# Interactive Polish — Fleet 4A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the grow.js fractal tab-switch blank canvas bug, add an oracle quiz retake path, and add E2E interaction tests to anchor both.

**Architecture:** Three surgical edits — one event listener wired in two places in `grow.js`, one DOM addition + one function signature change in `oracle.js` + `index.html`, and two new `describe` blocks in the existing E2E spec.

**Tech Stack:** Vanilla ES Modules · Playwright E2E · no new dependencies

---

## File structure

| File | Change |
|---|---|
| `public/js/sections/grow.js` | Add `grow:resize` listener inside `_initPhyllotaxis` and `_initFractalTree` |
| `public/js/sections/oracle.js` | Extend `showReveal` signature; wire retake button |
| `views/index.html` | Add `<button data-oracle="retake">` inside `.oracle-reveal` |
| `tests/e2e/sections.spec.js` | Add oracle completion+retake tests; add grow tab-switch test |

---

### Task 1: Fix grow.js tab-switch blank canvas

**Files:**
- Modify: `public/js/sections/grow.js:648-651` (inside `_initPhyllotaxis`)
- Modify: `public/js/sections/grow.js:819-822` (inside `_initFractalTree`)

**Specialists:**
- Domain: frontend-ui
- Lead expertise: Canvas 2D event-driven resize patterns in vanilla ES Modules
- Review focus: idempotency of listener registration — confirm `canvas.addEventListener` is not called more than once per init

- [ ] **Step 1: Write the failing E2E test first (red)**

Add to `tests/e2e/sections.spec.js` inside the existing `#grow` describe block, after the `.grow-bg` test:

```js
  test('switching to fractal tab renders a non-zero canvas', async ({ page }) => {
    await goTo(page, '#grow');
    await page.locator('[data-tab="fractal"]').click();
    const canvas = page.locator('.fractal-canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npx playwright test tests/e2e/sections.spec.js --grep "fractal tab"
```

Expected: FAIL — canvas found but width/height 0, or canvas not visible.

- [ ] **Step 3: Add the `grow:resize` listener in `_initPhyllotaxis`**

In `public/js/sections/grow.js`, the current block at lines 648–651 is:

```js
  setTimeout(() => {
    resizeAndDraw();
    new ResizeObserver(resizeAndDraw).observe(canvas.parentElement);
  }, 80);
}
```

Replace it with:

```js
  setTimeout(() => {
    resizeAndDraw();
    new ResizeObserver(resizeAndDraw).observe(canvas.parentElement);
    canvas.addEventListener('grow:resize', resizeAndDraw);
  }, 80);
}
```

- [ ] **Step 4: Add the `grow:resize` listener in `_initFractalTree`**

In `public/js/sections/grow.js`, the current block at lines 819–822 is:

```js
  setTimeout(() => {
    resizeAndDraw();
    new ResizeObserver(resizeAndDraw).observe(canvas.parentElement);
  }, 80);
}
```

Replace it with:

```js
  setTimeout(() => {
    resizeAndDraw();
    new ResizeObserver(resizeAndDraw).observe(canvas.parentElement);
    canvas.addEventListener('grow:resize', resizeAndDraw);
  }, 80);
}
```

Note: both functions define a local `resizeAndDraw` — this is not a naming conflict. Each closure registers its own function on its own canvas element.

- [ ] **Step 5: Run the E2E test to confirm it passes (green)**

```bash
npx playwright test tests/e2e/sections.spec.js --grep "fractal tab"
```

Expected: PASS

- [ ] **Step 6: Run the full grow describe block to confirm no regressions**

```bash
npx playwright test tests/e2e/sections.spec.js --grep "#grow"
```

Expected: all 3 tests pass.

- [ ] **Step 7: Commit**

```bash
git add public/js/sections/grow.js tests/e2e/sections.spec.js
git commit -m "fix(grow): wire grow:resize listener so fractal canvas draws on tab switch"
```

---

### Task 2: Add oracle quiz retake path

**Files:**
- Modify: `views/index.html:44-45` (add retake button inside `.oracle-reveal`)
- Modify: `public/js/sections/oracle.js:258-284` (`showReveal` function)
- Modify: `public/js/sections/oracle.js:325-326` (call site in `handleAnswer`)

**Specialists:**
- Domain: frontend-ui
- Lead expertise: idempotent ES Module init patterns — reset module-level guards without breaking closure state
- Review focus: double-listener risk on retake; `{ once: true }` removes listener after click; verify `progEl`/`stepsEl` display resets correctly before re-init

- [ ] **Step 1: Write the failing E2E tests first (red)**

Add two new tests to `tests/e2e/sections.spec.js` inside the existing `#oracle` describe block:

```js
  test('completing all 5 questions shows the reveal panel', async ({ page }) => {
    await goTo(page, '#oracle');
    for (let i = 0; i < 5; i++) {
      await page.locator('.oracle-step.active .oracle-choice').first().click();
    }
    await expect(page.locator('[data-oracle="reveal"]')).toBeVisible();
    await expect(page.locator('[data-oracle="element-name"]')).not.toBeEmpty();
  });

  test('retake button resets the quiz to the first question', async ({ page }) => {
    await goTo(page, '#oracle');
    for (let i = 0; i < 5; i++) {
      await page.locator('.oracle-step.active .oracle-choice').first().click();
    }
    await page.locator('[data-oracle="retake"]').click();
    await expect(page.locator('[data-oracle="steps"]')).toBeVisible();
    await expect(page.locator('[data-oracle="steps"]')).toContainText('How do you work best?');
  });
```

- [ ] **Step 2: Run them to confirm they fail**

```bash
npx playwright test tests/e2e/sections.spec.js --grep "oracle"
```

Expected: first test FAILS (no retake button in DOM yet causes locator miss; or reveal isn't correctly confirmed), second test FAILS (no retake button).

- [ ] **Step 3: Add the retake button to `views/index.html`**

Current oracle-reveal block (lines 38–46):

```html
        <div class="oracle-reveal" data-oracle="reveal" style="display:none">
          <div class="oracle-solid-wrap">
            <canvas data-oracle="canvas"></canvas>
          </div>
          <div class="oracle-element-name" data-oracle="element-name"></div>
          <div class="oracle-solid-name"   data-oracle="solid-name"></div>
          <div class="oracle-meaning"      data-oracle="meaning"></div>
          <button class="btn-primary oracle-cta" onclick="window.location.hash='#geometry'">Explore the Geometry &#x2192;</button>
        </div>
```

Replace with:

```html
        <div class="oracle-reveal" data-oracle="reveal" style="display:none">
          <div class="oracle-solid-wrap">
            <canvas data-oracle="canvas"></canvas>
          </div>
          <div class="oracle-element-name" data-oracle="element-name"></div>
          <div class="oracle-solid-name"   data-oracle="solid-name"></div>
          <div class="oracle-meaning"      data-oracle="meaning"></div>
          <div class="oracle-reveal-actions">
            <button class="btn-primary oracle-cta" onclick="window.location.hash='#geometry'">Explore the Geometry &#x2192;</button>
            <button class="btn-secondary oracle-retake" data-oracle="retake">Retake quiz</button>
          </div>
        </div>
```

- [ ] **Step 4: Extend `showReveal` to accept `progEl` and `stepsEl` and wire the retake button**

In `public/js/sections/oracle.js`, the current `showReveal` function signature and body (lines 258–284):

```js
function showReveal(revealDiv, winner) {
  const data = ELEMENT_DATA[winner];

  // Persist + propagate element to entire app via elementState
  setElement(winner);

  // Populate text fields -- these elements must exist in the markup
  const nameEl    = revealDiv.querySelector('[data-oracle="element-name"]');
  const solidEl   = revealDiv.querySelector('[data-oracle="solid-name"]');
  const meaningEl = revealDiv.querySelector('[data-oracle="meaning"]');
  if (nameEl)    nameEl.textContent    = data.name;
  if (solidEl)   solidEl.textContent   = data.solid;
  if (meaningEl) meaningEl.textContent = data.meaning;

  revealDiv.style.display = 'block';

  // 3D canvas -- 80ms delay lets CSS layout complete first
  const canvas = revealDiv.querySelector('[data-oracle="canvas"]');
  if (canvas) {
    setTimeout(() => {
      buildRevealCanvas(canvas, data);
      if (window.gsap) {
        gsap.from(revealDiv, { opacity: 0, y: 20, duration: 0.6, ease: 'power2.out' });
      }
    }, 80);
  }
}
```

Replace with:

```js
function showReveal(revealDiv, winner, progEl, stepsEl) {
  const data = ELEMENT_DATA[winner];

  // Persist + propagate element to entire app via elementState
  setElement(winner);

  // Populate text fields -- these elements must exist in the markup
  const nameEl    = revealDiv.querySelector('[data-oracle="element-name"]');
  const solidEl   = revealDiv.querySelector('[data-oracle="solid-name"]');
  const meaningEl = revealDiv.querySelector('[data-oracle="meaning"]');
  if (nameEl)    nameEl.textContent    = data.name;
  if (solidEl)   solidEl.textContent   = data.solid;
  if (meaningEl) meaningEl.textContent = data.meaning;

  revealDiv.style.display = 'block';

  // Retake button -- once: true prevents double-binding on repeated quiz completions
  const retakeBtn = revealDiv.querySelector('[data-oracle="retake"]');
  if (retakeBtn && progEl && stepsEl) {
    retakeBtn.addEventListener('click', () => {
      revealDiv.style.display = 'none';
      progEl.style.display    = '';
      stepsEl.style.display   = '';
      initialised = false;
      init();
    }, { once: true });
  }

  // 3D canvas -- 80ms delay lets CSS layout complete first
  const canvas = revealDiv.querySelector('[data-oracle="canvas"]');
  if (canvas) {
    setTimeout(() => {
      buildRevealCanvas(canvas, data);
      if (window.gsap) {
        gsap.from(revealDiv, { opacity: 0, y: 20, duration: 0.6, ease: 'power2.out' });
      }
    }, 80);
  }
}
```

- [ ] **Step 5: Update the `showReveal` call site in `handleAnswer`**

In `public/js/sections/oracle.js`, current line 326:

```js
      showReveal(revealDiv, winner);
```

Replace with:

```js
      showReveal(revealDiv, winner, progEl, stepsEl);
```

- [ ] **Step 6: Run oracle E2E tests to confirm green**

```bash
npx playwright test tests/e2e/sections.spec.js --grep "oracle"
```

Expected: all 4 oracle tests pass (original 1 + new 3).

- [ ] **Step 7: Commit**

```bash
git add views/index.html public/js/sections/oracle.js tests/e2e/sections.spec.js
git commit -m "feat(oracle): add retake quiz path and E2E completion tests"
```

---

### Task 3: Full E2E suite regression check

**Files:**
- Read-only: `tests/e2e/sections.spec.js`

**Specialists:**
- Domain: testing-infra
- Lead expertise: Playwright E2E suite validation
- Review focus: confirm no existing tests regressed; confirm new tests are deterministic (no timing flaps)

- [ ] **Step 1: Run the complete E2E suite**

```bash
npx playwright test tests/e2e/sections.spec.js
```

Expected output: all tests pass. Prior test count was 16. New count should be 19 (added: fractal tab switch, oracle completion, oracle retake).

- [ ] **Step 2: If any test is flappy, add a `waitFor` guard**

For oracle retake, if timing fails after `click()`:

```js
    await expect(page.locator('[data-oracle="steps"]')).toBeVisible({ timeout: 3000 });
```

- [ ] **Step 3: Commit if Step 1 required any timing fixes**

Only commit if Step 2 produced changes:

```bash
git add tests/e2e/sections.spec.js
git commit -m "test(e2e): stabilise timing on oracle retake assertion"
```

---

## Verification checklist

Before declaring Fleet 4A complete:

- [ ] `npx playwright test tests/e2e/sections.spec.js` → 19 tests, 0 failures
- [ ] `node tasks/cli.js list` → still works (unrelated smoke check)
- [ ] `git log --oneline -5` → 2 commits from this fleet visible
- [ ] grow section: fractal tab shows drawn tree (visual confirm in browser)
- [ ] oracle section: complete quiz → retake → first question reappears (visual confirm)

## Commit history target

```
feat(oracle): add retake quiz path and E2E completion tests
fix(grow): wire grow:resize listener so fractal canvas draws on tab switch
```
