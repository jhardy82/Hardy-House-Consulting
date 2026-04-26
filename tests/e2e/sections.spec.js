import { test, expect } from '@playwright/test';

async function goTo(page, hash) {
  await page.goto('/' + hash);
}

// -- home ---------------------------------------------------------------
test.describe('#home — hero section', () => {
  test('active nav link has aria-current="page"; inactive links do not', async ({ page }) => {
    await page.goto('http://localhost:3000/#home');
    await expect(page.locator('a.nav-link[href="#home"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('a.nav-link[href="#oracle"]')).not.toHaveAttribute('aria-current');
    await page.goto('http://localhost:3000/#oracle');
    await expect(page.locator('a.nav-link[href="#oracle"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('a.nav-link[href="#home"]')).not.toHaveAttribute('aria-current');
  });

  test('injects .hero-content with heading text', async ({ page }) => {
    await goTo(page, '#home');
    const content = page.locator('.hero-content');
    await expect(content).toBeVisible();
    await expect(content).toContainText('Geometry is not');
  });

  test('canvas #heroCanvas is mounted and non-zero', async ({ page }) => {
    await goTo(page, '#home');
    await expect(page.locator('#heroCanvas')).toBeVisible();
    const box = await page.locator('#heroCanvas').boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });
});

// -- oracle -------------------------------------------------------------
test.describe('#oracle — element quiz', () => {
  test('renders the first question text', async ({ page }) => {
    await goTo(page, '#oracle');
    const steps = page.locator('[data-oracle="steps"]');
    await expect(steps).toBeVisible();
    await expect(steps).toContainText('How do you work best?');
  });

  test('progress dots are rendered', async ({ page }) => {
    await goTo(page, '#oracle');
    const prog = page.locator('[data-oracle="progress"]');
    await expect(prog).toBeVisible();
    await expect(prog.locator('.oracle-dot').first()).toBeVisible();
  });

  test('answer buttons are rendered in the active step', async ({ page }) => {
    await goTo(page, '#oracle');
    const steps = page.locator('[data-oracle="steps"]');
    await expect(steps).toBeVisible();
    await expect(steps.locator('.oracle-step.active .oracle-choice').first()).toBeVisible();
  });

  test('full quiz flow reveals the result panel', async ({ page }) => {
    await goTo(page, '#oracle');
    const steps = page.locator('[data-oracle="steps"]');
    await expect(steps).toBeVisible();

    for (let i = 0; i < 5; i++) {
      const activeFirstChoice = page.locator(`#oracle-step-${i} .oracle-choice`).first();
      await expect(activeFirstChoice).toBeVisible();
      await activeFirstChoice.click();
    }

    const reveal = page.locator('[data-oracle="reveal"]');
    await expect(reveal).toBeVisible();
    await expect(reveal.locator('[data-oracle="element-name"]')).not.toBeEmpty();
  });

  test('completed quiz sets data-element on html element', async ({ page }) => {
    await goTo(page, '#oracle');
    const steps = page.locator('[data-oracle="steps"]');
    await expect(steps).toBeVisible();
    for (let i = 0; i < 5; i++) {
      const choice = page.locator(`#oracle-step-${i} .oracle-choice`).first();
      await expect(choice).toBeVisible();
      await choice.click();
    }
    const attr = await page.locator('html').getAttribute('data-element');
    expect(['fire', 'earth', 'air', 'water', 'aether']).toContain(attr);
  });

  test('quiz resets to step 0 on re-entry after mid-quiz navigation', async ({ page }) => {
    await goTo(page, '#oracle');
    const steps = page.locator('[data-oracle="steps"]');
    await expect(steps).toBeVisible();

    // Answer question 0 — advances to step 1
    await page.locator('#oracle-step-0 .oracle-choice').first().click();

    // Navigate away mid-quiz then return
    await goTo(page, '#home');
    await goTo(page, '#oracle');
    await expect(steps).toBeVisible();

    // Step 0 must be the active step; result panel must be hidden
    await expect(page.locator('#oracle-step-0')).toHaveClass(/active/);
    await expect(page.locator('[data-oracle="reveal"]')).toBeHidden();
  });

  test('retake button resets the quiz to the first question', async ({ page }) => {
    await goTo(page, '#oracle');
    for (let i = 0; i < 5; i++) {
      await page.locator('.oracle-step.active .oracle-choice').first().click();
    }
    await page.locator('[data-oracle="retake"]').click();
    await expect(page.locator('[data-oracle="steps"]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-oracle="steps"]')).toContainText('How do you work best?');
  });
});

// -- geometry -----------------------------------------------------------
test.describe('#geometry — sacred geometry explorer', () => {
  test('renders the section heading', async ({ page }) => {
    await goTo(page, '#geometry');
    await expect(page.locator('section[data-section="geometry"]')).toContainText('Sacred Geometry of the Brand');
  });

  test('at least one .sc-canvas is present', async ({ page }) => {
    await goTo(page, '#geometry');
    await expect(page.locator('.sc-canvas').first()).toBeVisible();
  });

  test('clicking a mode pill activates it', async ({ page }) => {
    await goTo(page, '#geometry');
    // geo-mpill: three pills rendered (both/edges/faces); first is active by default
    const pills = page.locator('.geo-mpill');
    await expect(pills.first()).toBeVisible();
    const secondPill = pills.nth(1);
    await secondPill.click();
    await expect(secondPill).toHaveClass(/on/);
  });

  test('expand button opens fullscreen overlay', async ({ page }) => {
    await goTo(page, '#geometry');
    // Each shape card has 3 .sc-btn buttons: [0] mode toggle, [1] fullscreen (⛶), [2] export (↓)
    // The fullscreen button is index 1 within each card's .sc-btns group
    const fsBtn = page.locator('.sc-btns .sc-btn:nth-child(2)').first();
    await expect(fsBtn).toBeVisible();
    await fsBtn.click();
    await expect(page.locator('#geo-fsOverlay')).toBeVisible();
  });

  test('close button dismisses fullscreen overlay', async ({ page }) => {
    await goTo(page, '#geometry');
    // Open overlay via the fullscreen (2nd) button in the first card's button group
    await page.locator('.sc-btns .sc-btn:nth-child(2)').first().click();
    await expect(page.locator('#geo-fsOverlay')).toBeVisible();
    await page.locator('#geo-fsClose').click();
    await expect(page.locator('#geo-fsOverlay')).toBeHidden();
  });

  test('FS overlay is hidden on re-entry after navigating away with overlay open', async ({ page }) => {
    await goTo(page, '#geometry');
    // Open fullscreen overlay via second button in first card's button group
    await page.locator('.sc-btns .sc-btn:nth-child(2)').first().click();
    await expect(page.locator('#geo-fsOverlay')).toBeVisible();

    // Navigate away without closing FS overlay
    await goTo(page, '#home');
    // Return — _closeFS() is called at the top of init() (geometry.js line 361)
    await goTo(page, '#geometry');
    await expect(page.locator('section[data-section="geometry"]')).toBeVisible();

    // Overlay must be hidden — no zombie overlay
    await expect(page.locator('#geo-fsOverlay')).toBeHidden();
  });

  test('GSAP entry animations target elements that exist in the DOM', async ({ page }) => {
    // Collect GSAP warnings about zero-target selectors
    const gsapWarnings = [];
    page.on('console', msg => {
      if (msg.type() === 'warning' && msg.text().includes('gsap')) {
        gsapWarnings.push(msg.text());
      }
    });
    await goTo(page, '#geometry');
    await expect(page.locator('[data-section="geometry"]')).toBeVisible();
    // Allow GSAP's 80ms animation init to run
    await page.waitForTimeout(200);
    // Assert: .h-eyebrow heading element is present (proves selectors resolve)
    await expect(page.locator('[data-section="geometry"] .h-eyebrow')).toBeAttached();
    // Assert: no GSAP warnings about missing targets
    expect(gsapWarnings).toHaveLength(0);
  });

  test('3D Metatron canvas is mounted and non-zero', async ({ page }) => {
    await goTo(page, '#geometry');
    const canvas = page.locator('#geo-met3dCanvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });

  test('Tesseract card is present in the extended grid', async ({ page }) => {
    await goTo(page, '#geometry');
    const card = page.locator('.shape-card[data-id="tesseract"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Tesseract');
  });

  test('Stellated Dodecahedron card is present in the extended grid', async ({ page }) => {
    await goTo(page, '#geometry');
    const card = page.locator('.shape-card[data-id="steldodeca"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Stellated Dodecahedron');
  });
});

// -- decomposition ------------------------------------------------------
test.describe('#decomposition — Flower of Life demo', () => {
  test('renders the section heading', async ({ page }) => {
    await goTo(page, '#decomposition');
    await expect(page.locator('section[data-section="decomposition"]')).toContainText('From Circle to');
  });

  test('renders the Metatron step node', async ({ page }) => {
    await goTo(page, '#decomposition');
    await expect(page.locator('#dec-pn-met')).toBeVisible();
  });
});

// -- variants -----------------------------------------------------------
test.describe('#variants — brand token auditor', () => {
  test('section is visible and colour swatches are injected', async ({ page }) => {
    await goTo(page, '#variants');
    const section = page.locator('section[data-section="variants"]');
    await expect(section).toBeVisible();
    await expect(section.locator('.vt-sw').first()).toBeVisible();
  });
});

// -- tree ---------------------------------------------------------------
test.describe('#tree — Tree of Life', () => {
  test('renders the Tree of Life heading', async ({ page }) => {
    await goTo(page, '#tree');
    await expect(page.locator('section[data-section="tree"]')).toContainText('The Tree of Life');
  });

  test('#tree-canvas is present and non-zero', async ({ page }) => {
    await goTo(page, '#tree');
    await expect(page.locator('#tree-canvas')).toBeVisible();
    const box = await page.locator('#tree-canvas').boundingBox();
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
    await expect(page.locator('.grow-bg')).toBeVisible();
  });

  test('switching tabs changes active canvas', async ({ page }) => {
    await goTo(page, '#grow');
    const fractalTab = page.locator('[data-tab="fractal"]');
    await expect(fractalTab).toBeVisible();
    await fractalTab.click();
    await expect(page.locator('.fractal-canvas')).toBeVisible();
  });

  test('rapid section re-entry does not leave stale RAF or crash', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await goTo(page, '#grow');
    // 4 rapid away/back cycles — exercises IntersectionObserver pause/resume
    for (let i = 0; i < 4; i++) {
      await goTo(page, '#home');
      await goTo(page, '#grow');
    }

    await expect(page.locator('.grow-bg')).toBeVisible();

    // Tab switching still functions after rapid cycles
    const fractalTab = page.locator('[data-tab="fractal"]');
    await fractalTab.click();
    await expect(page.locator('.fractal-canvas')).toBeVisible();

    expect(errors).toHaveLength(0);
  });
});

// -- presentation -------------------------------------------------------
test.describe('#presentation — slide deck', () => {
  test('section is visible and canvas is present', async ({ page }) => {
    await goTo(page, '#presentation');
    const section = page.locator('section[data-section="presentation"]');
    await expect(section).toBeVisible();
    await expect(section.locator('canvas')).toBeVisible();
  });
});

// -- dashboard ----------------------------------------------------------
test.describe('#dashboard — agent constellation', () => {
  test('.dashboard-constellation canvas is mounted and non-zero', async ({ page }) => {
    await goTo(page, '#dashboard');
    const canvas = page.locator('.dashboard-constellation');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });

  test('.dashboard-metrics container is present', async ({ page }) => {
    await goTo(page, '#dashboard');
    await expect(page.locator('.dashboard-metrics')).toBeVisible();
  });

  test('GET /api/tasks/summary returns 200 with total field', async ({ page }) => {
    const [response] = await Promise.all([
      page.waitForResponse('**/api/tasks/summary'),
      goTo(page, '#dashboard'),
    ]);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('total');
  });

  test('section title "Agent Constellation" is visible', async ({ page }) => {
    await goTo(page, '#dashboard');
    await expect(page.locator('.dashboard-title')).toContainText('Agent Constellation');
  });

  test('element distribution block is present with 5 rows', async ({ page }) => {
    await goTo(page, '#dashboard');
    await expect(page.locator('.dash-element-dist')).toBeVisible();
    const rows = page.locator('.dash-element-row');
    await expect(rows).toHaveCount(5);
  });

  test('GET /api/analytics/elements returns 200 with total field', async ({ page }) => {
    const [response] = await Promise.all([
      page.waitForResponse('**/api/analytics/elements'),
      goTo(page, '#dashboard'),
    ]);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('total');
  });
});

// -- global chrome ------------------------------------------------------
test.describe('global chrome', () => {
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
    await page.waitForTimeout(300);
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

  test('clicking the contact panel triggers a toast notification', async ({ page }) => {
    await goTo(page, '#contact');
    await page.locator('#contactPanel').click();
    await expect(page.locator('#toast')).toBeVisible({ timeout: 3000 });
  });
});

// -- yantra ---------------------------------------------------------------
test.describe('#yantra — Sri Yantra', () => {
  test('section renders', async ({ page }) => {
    await goTo(page, '#yantra');
    const section = page.locator('[data-section="yantra"]');
    await expect(section).toBeVisible();
  });

  test('yantra-geo canvas is non-zero after construction', async ({ page }) => {
    await goTo(page, '#yantra');
    const canvas = page.locator('.yantra-geo');
    // Scroll into view to ensure IntersectionObserver triggers
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const w = document.querySelector('.yantra-geo')?.width;
      const h = document.querySelector('.yantra-geo')?.height;
      return w > 0 && h > 0;
    }, { timeout: 20000 });
    const width = await canvas.evaluate(el => el.width);
    const height = await canvas.evaluate(el => el.height);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  test('toggle becomes enabled after construction', async ({ page }) => {
    await goTo(page, '#yantra');
    const section = page.locator('[data-section="yantra"]');
    // Scroll into view to ensure IntersectionObserver triggers construction
    await section.scrollIntoViewIfNeeded();
    // Wait for construction to complete: aria-disabled removed and toggle enabled
    await page.waitForFunction(() => {
      const ctrl = document.querySelector('.yantra-controls');
      const toggle = document.querySelector('[data-yantra="toggle"]');
      return ctrl && !ctrl.hasAttribute('aria-disabled') && !toggle.disabled;
    }, { timeout: 20000 });
    const toggle = page.locator('[data-yantra="toggle"]');
    await expect(toggle).not.toBeDisabled();
  });

  test('PAOAL mode: overlay shows at least 4 legend rows', async ({ page }) => {
    await goTo(page, '#yantra');
    const section = page.locator('[data-section="yantra"]');
    // Scroll into view to ensure IntersectionObserver triggers construction
    await section.scrollIntoViewIfNeeded();
    // Wait for construction to complete
    await page.waitForFunction(() => {
      const ctrl = document.querySelector('.yantra-controls');
      const toggle = document.querySelector('[data-yantra="toggle"]');
      return ctrl && !ctrl.hasAttribute('aria-disabled') && !toggle.disabled;
    }, { timeout: 20000 });
    await page.locator('[data-yantra="paoal"]').click();
    await page.locator('[data-yantra="toggle"]').click();
    const legend = page.locator('[data-yantra="legend"]');
    await expect(legend).toBeVisible();
    const rows = legend.locator('.yantra-legend-row');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });
});
