import { test, expect } from '@playwright/test';

async function goTo(page, hash) {
  await page.goto('/' + hash);
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
