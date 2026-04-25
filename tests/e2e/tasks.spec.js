import { test, expect } from '@playwright/test';

test.describe('GET /tasks — Kanban dashboard', () => {
  test('returns the Hardy House Tasks page', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page).toHaveTitle(/Hardy House/);
  });

  test('renders all four Kanban column headings', async ({ page }) => {
    await page.goto('/tasks');
    const headings = page.locator('h2.col-head');
    await expect(headings).toHaveCount(4);
    await expect(headings.nth(0)).toContainText('Open');
    await expect(headings.nth(1)).toContainText('In Progress');
    await expect(headings.nth(2)).toContainText('Blocked');
    await expect(headings.nth(3)).toContainText('Done');
  });
});

test.describe('GET /tasks/api — JSON endpoint', () => {
  test('returns 200 JSON with tasks structure', async ({ request }) => {
    const res = await request.get('/tasks/api');
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body).toHaveProperty('session');
    expect(body).toHaveProperty('tasks');
    expect(body.tasks).toMatchObject({
      open: expect.any(Array),
      in_progress: expect.any(Array),
      blocked: expect.any(Array),
      done: expect.any(Array),
    });
  });
});
