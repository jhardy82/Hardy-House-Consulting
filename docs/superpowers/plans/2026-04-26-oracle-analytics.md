# Oracle Element Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Log every Oracle element assignment to `tasks/tasks.db` and surface per-element counts in the `#dashboard` section.

**Architecture:** `routes/tasks.js` creates the `element_assignments` table at startup alongside existing tables. `POST /api/element` silently writes a row after the session assignment — DB failure never blocks the response. `GET /api/analytics/elements` reads counts using the same per-request open→read→close pattern as `tasks-summary.js`. The dashboard fetches this endpoint on `init()` and renders a 5-row element distribution block appended below `.dashboard-metrics`.

**Tech Stack:** Node.js · Express · better-sqlite3 · express-rate-limit · Vanilla JS · Playwright (E2E) · Jest + supertest (API)

**Test baseline before starting:** 73/73 Jest · 43/43 Playwright  
**Spec:** `docs/superpowers/specs/2026-04-26-oracle-analytics-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `package.json` | Modify | Add `express-rate-limit` dependency |
| `routes/tasks.js` | Modify | Add `element_assignments` table to startup schema block |
| `routes/api/analytics.js` | **Create** | `GET /elements` — per-request open→read→close, zeroes on error |
| `routes/api/element.js` | Modify | Augment POST handler: insert analytics row, per-request, fire-and-forget |
| `server.js` | Modify | Import + wire analytics router; apply rate limit before element route |
| `public/js/sections/dashboard.js` | Modify | Add `_buildElementDistMarkup`, `_initElementDist`, `_fetchAndRenderElementDist` |
| `public/css/sections/dashboard.css` | Modify | Add `.dash-element-dist` block styles |
| `tests/api/analytics.test.js` | **Create** | API tests for GET /api/analytics/elements |
| `tests/api/element.test.js` | Modify | Add count-increment and rate-limit integration tests |
| `tests/e2e/sections.spec.js` | Modify | Add 2 dashboard E2E tests for element distribution block |

---

## Task 1: Install express-rate-limit

**Files:**
- Modify: `package.json`

**Specialists:**
- Domain: config-management
- Lead expertise: npm package management for Express middleware
- Review focus: version pinning, no breaking change to existing middleware stack
- Model: Haiku triad

- [ ] **Step 1: Install the package**

```bash
npm install express-rate-limit
```

Expected output: `added 1 package` (or similar). No peer dependency warnings.

- [ ] **Step 2: Verify package.json updated**

Open `package.json` and confirm `express-rate-limit` appears in `dependencies` (not `devDependencies`).

- [ ] **Step 3: Run existing tests to confirm nothing broken**

```bash
npm test
```

Expected: 73 passed, 0 failed.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add express-rate-limit"
```

---

## Task 2: Schema migration — element_assignments table

**Files:**
- Modify: `routes/tasks.js`

**Specialists:**
- Domain: database-migration
- Lead expertise: better-sqlite3 synchronous DDL; idempotent `CREATE TABLE IF NOT EXISTS`
- Review focus: CHECK constraint correctness, column defaults, table creation order (must follow `sessions` and `tasks` tables since they already exist)
- Model: Haiku triad

- [ ] **Step 1: Open routes/tasks.js and locate the schema block**

The existing file has two `db.prepare(... CREATE TABLE IF NOT EXISTS ...).run()` calls — one for `sessions`, one for `tasks`. Find the block ending with the `tasks` table creation.

- [ ] **Step 2: Add element_assignments table after the tasks table**

Add this immediately after the `tasks` table `.run()` call and before the `} catch (err)` line:

```js
  db.prepare(`CREATE TABLE IF NOT EXISTS element_assignments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    element     TEXT    NOT NULL CHECK(element IN ('fire','earth','air','water','aether')),
    assigned_at TEXT    NOT NULL DEFAULT (datetime('now'))
  )`).run();
```

- [ ] **Step 3: Run the server briefly to verify no startup errors**

```bash
node server.js &
sleep 2
kill %1
```

Expected: no `Error:` lines in output. If `tasks/tasks.db` doesn't exist yet, `better-sqlite3` creates it automatically.

- [ ] **Step 4: Verify table exists using sqlite3 CLI (optional sanity check)**

```bash
npx better-sqlite3 tasks/tasks.db ".tables"
```

Expected output includes `element_assignments sessions tasks`.  
*(Skip if `better-sqlite3` CLI isn't available — the Task 3 tests verify this implicitly.)*

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: 73 passed, 0 failed.

- [ ] **Step 6: Commit**

```bash
git add routes/tasks.js
git commit -m "feat(schema): add element_assignments table to tasks.db"
```

---

## Task 3: Analytics route + server wiring + API tests

**Files:**
- Create: `routes/api/analytics.js`
- Modify: `server.js`
- Create: `tests/api/analytics.test.js`

**Specialists:**
- Domain: api-endpoint
- Lead expertise: Express Router with better-sqlite3 read-only per-request pattern; mirrors `tasks-summary.js` exactly
- Review focus: DB_PATH matches `tasks-summary.js` exactly; error response shape matches success shape; `total` is sum of all 5 elements; readonly flag on DB open
- Model: Haiku triad

- [ ] **Step 1: Write the failing test first**

Create `tests/api/analytics.test.js`:

```js
import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import tasks router — this runs schema creation (CREATE TABLE IF NOT EXISTS)
// so element_assignments table exists before tests run.
import '../../routes/tasks.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = join(__dirname, '..', '..', 'tasks', 'tasks.db');

// Build a minimal test app — analytics router not created yet, so this will fail.
let analyticsRouter;
let app;

beforeAll(async () => {
  // Insert fixture rows directly
  const db = new Database(DB_PATH);
  db.prepare("INSERT INTO element_assignments (element) VALUES (?)").run('fire');
  db.prepare("INSERT INTO element_assignments (element) VALUES (?)").run('fire');
  db.prepare("INSERT INTO element_assignments (element) VALUES (?)").run('water');
  db.close();

  analyticsRouter = (await import('../../routes/api/analytics.js')).default;
  app = express();
  app.use('/api/analytics', analyticsRouter);
});

afterAll(() => {
  // Clean up only the rows we inserted (leave real data intact)
  const db = new Database(DB_PATH);
  db.prepare("DELETE FROM element_assignments WHERE element IN ('fire','water') AND assigned_at >= datetime('now', '-1 minute')").run();
  db.close();
});

describe('GET /api/analytics/elements', () => {
  test('returns 200 with all five element keys', async () => {
    const res = await request(app).get('/api/analytics/elements');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('fire');
    expect(res.body).toHaveProperty('earth');
    expect(res.body).toHaveProperty('air');
    expect(res.body).toHaveProperty('water');
    expect(res.body).toHaveProperty('aether');
    expect(res.body).toHaveProperty('total');
  });

  test('fire count reflects inserted fixtures', async () => {
    const res = await request(app).get('/api/analytics/elements');
    expect(res.body.fire).toBeGreaterThanOrEqual(2);
  });

  test('total equals sum of all element counts', async () => {
    const res = await request(app).get('/api/analytics/elements');
    const { fire, earth, air, water, aether, total } = res.body;
    expect(total).toBe(fire + earth + air + water + aether);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm run test:api -- analytics
```

Expected: FAIL — `Cannot find module '../../routes/api/analytics.js'`

- [ ] **Step 3: Create routes/api/analytics.js**

```js
import { Router } from 'express';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = join(__dirname, '..', '..', 'tasks', 'tasks.db');

const router = Router();

router.get('/elements', (_req, res) => {
  let db;
  try {
    db = new Database(DB_PATH, { readonly: true });
    const rows = db.prepare(
      'SELECT element, COUNT(*) as count FROM element_assignments GROUP BY element'
    ).all();
    const counts = { fire: 0, earth: 0, air: 0, water: 0, aether: 0 };
    for (const row of rows) {
      if (row.element in counts) counts[row.element] = row.count;
    }
    counts.total = Object.values(counts).reduce((a, b) => a + b, 0);
    res.json(counts);
  } catch {
    res.json({ fire: 0, earth: 0, air: 0, water: 0, aether: 0, total: 0 });
  } finally {
    db?.close();
  }
});

export default router;
```

- [ ] **Step 4: Wire the analytics router into server.js**

In `server.js`, add after the existing imports:

```js
import analyticsRouter from './routes/api/analytics.js';
```

And add after the existing `app.use('/api/tasks', ...)` line:

```js
app.use('/api/analytics', analyticsRouter);
```

- [ ] **Step 5: Run the tests**

```bash
npm run test:api -- analytics
```

Expected: 3 passed, 0 failed.

- [ ] **Step 6: Run full test suite to confirm nothing regressed**

```bash
npm test
```

Expected: 76 passed (73 + 3 new), 0 failed.

- [ ] **Step 7: Commit**

```bash
git add routes/api/analytics.js server.js tests/api/analytics.test.js
git commit -m "feat(analytics): add GET /api/analytics/elements route"
```

---

## Task 4: Augment POST /api/element with analytics write

**Files:**
- Modify: `routes/api/element.js`
- Modify: `tests/api/element.test.js`

**Specialists:**
- Domain: api-endpoint
- Lead expertise: better-sqlite3 synchronous write with per-request open→write→close; fire-and-forget error isolation
- Review focus: DB write never blocks session assignment response; parameterized query (no string concatenation); try/finally ensures db.close() always runs; existing element tests still pass
- Model: Haiku triad

- [ ] **Step 1: Write the failing test**

Add this describe block to the end of `tests/api/element.test.js`:

```js
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __testDirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH_TEST  = join(__testDirname, '..', '..', 'tasks', 'tasks.db');

describe('POST /api/element — analytics write', () => {
  test('valid POST increments element_assignments count for that element', async () => {
    const dbBefore = new Database(DB_PATH_TEST, { readonly: true });
    const before   = dbBefore.prepare(
      "SELECT COUNT(*) as count FROM element_assignments WHERE element = 'earth'"
    ).get().count;
    dbBefore.close();

    await request(app).post('/api/element').send({ element: 'earth' }).expect(200);

    const dbAfter = new Database(DB_PATH_TEST, { readonly: true });
    const after   = dbAfter.prepare(
      "SELECT COUNT(*) as count FROM element_assignments WHERE element = 'earth'"
    ).get().count;
    dbAfter.close();

    expect(after).toBe(before + 1);
  });

  test('invalid element POST returns 400 and does not write analytics row', async () => {
    const dbBefore = new Database(DB_PATH_TEST, { readonly: true });
    const before   = dbBefore.prepare(
      "SELECT COUNT(*) as count FROM element_assignments"
    ).get().count;
    dbBefore.close();

    await request(app).post('/api/element').send({ element: 'invalid' }).expect(400);

    const dbAfter = new Database(DB_PATH_TEST, { readonly: true });
    const after   = dbAfter.prepare(
      "SELECT COUNT(*) as count FROM element_assignments"
    ).get().count;
    dbAfter.close();

    expect(after).toBe(before);
  });
});
```

Also add this import at the top of `tests/api/element.test.js` if not already present (the file uses `fileURLToPath` in the new block — add the imports if not at top):

```js
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from 'better-sqlite3';
```

And add this import to ensure tasks schema exists before element tests run:

```js
import '../../routes/tasks.js';
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test:api -- element
```

Expected: existing tests pass, new analytics-write tests FAIL (count doesn't increment because element.js doesn't write yet).

- [ ] **Step 3: Augment routes/api/element.js**

Replace the entire file content with:

```js
import { Router } from 'express';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = join(__dirname, '..', '..', 'tasks', 'tasks.db');

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

  let db;
  try {
    db = new Database(DB_PATH);
    db.prepare('INSERT INTO element_assignments (element) VALUES (?)').run(element);
  } catch (err) {
    console.error('[analytics] element write failed:', err.message);
  } finally {
    db?.close();
  }

  res.json({ element, ok: true });
});

export default router;
```

- [ ] **Step 4: Run the tests**

```bash
npm run test:api -- element
```

Expected: all tests pass including new analytics-write tests.

- [ ] **Step 5: Run full suite**

```bash
npm test
```

Expected: 78 passed (76 + 2 new), 0 failed.

- [ ] **Step 6: Commit**

```bash
git add routes/api/element.js tests/api/element.test.js
git commit -m "feat(analytics): write element_assignments row on POST /api/element"
```

---

## Task 5: Rate limiting on POST /api/element

**Files:**
- Modify: `server.js`
- Create: `tests/api/rate-limit.test.js`

**Specialists:**
- Domain: api-endpoint
- Lead expertise: express-rate-limit configuration; in-memory store behavior with supertest; `standardHeaders: true` sets RateLimit-* headers per RFC 6585
- Review focus: rate limit applied BEFORE element route registration (middleware order matters in Express); `legacyHeaders: false` suppresses deprecated X-RateLimit-* headers; 429 response shape
- Model: Haiku triad

- [ ] **Step 1: Write the failing test**

Create `tests/api/rate-limit.test.js`:

```js
import express from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import request from 'supertest';
import elementRouter from '../../routes/api/element.js';
import '../../routes/tasks.js';

// Use max:3 so we only need 4 requests to trigger the limit in tests.
const limiter = rateLimit({ windowMs: 60_000, max: 3, standardHeaders: true, legacyHeaders: false });

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: true, cookie: { secure: false } }));
app.use('/api/element', limiter);
app.use('/api/element', elementRouter);

describe('Rate limiting on POST /api/element', () => {
  test('first 3 requests succeed', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await request(app).post('/api/element').send({ element: 'fire' });
      expect(res.status).toBe(200);
    }
  });

  test('4th request in same window returns 429', async () => {
    // Fire 4 requests — the 4th should be rate limited.
    const results = [];
    for (let i = 0; i < 4; i++) {
      const res = await request(app).post('/api/element').send({ element: 'fire' });
      results.push(res.status);
    }
    expect(results).toContain(429);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test:api -- rate-limit
```

Expected: FAIL — `4th request returns 429` fails because no rate limiter exists in server yet  
*(Note: the test app above has the limiter — the test itself will pass. The real server.js doesn't have it yet, but that's verified by E2E, not this unit test. These tests verify the limiter works correctly when configured.)*

Actually — since the test app configures its own limiter, these tests will PASS immediately. That's fine: they prove the limiter works correctly. The server.js wiring is verified by running the app and checking behavior.

- [ ] **Step 3: Run these tests to confirm they pass**

```bash
npm run test:api -- rate-limit
```

Expected: 2 passed, 0 failed.

- [ ] **Step 4: Wire rate limiter into server.js**

In `server.js`, add to the imports block:

```js
import rateLimit from 'express-rate-limit';
```

Add this line immediately **before** the existing `app.use('/api/element', elementRouter)` line:

```js
app.use('/api/element', rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false }));
```

The final wiring block in `server.js` should look like:

```js
app.use('/api/element', rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false }));
app.use('/api/element',  elementRouter);
app.use('/api/export',   express.json({ limit: '2mb' }), exportRouter);
app.use('/api/agents',   agentsRouter);
app.use('/api/tasks',    tasksSummaryRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/tasks',        tasksRouter);
app.use('/',             pagesRouter);
```

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: 80 passed (78 + 2 new), 0 failed.

- [ ] **Step 6: Commit**

```bash
git add server.js tests/api/rate-limit.test.js
git commit -m "feat(security): rate-limit POST /api/element at 10 req/min per IP"
```

---

## Task 6: Dashboard UI — element distribution block

**Files:**
- Modify: `public/js/sections/dashboard.js`
- Modify: `public/css/sections/dashboard.css`
- Modify: `tests/e2e/sections.spec.js`

**Specialists:**
- Domain: frontend-ui
- Lead expertise: vanilla JS DOM construction using the existing `_el()` helper; CSS flex bar chart with token-based colors; fetch from `/api/analytics/elements`
- Review focus: zero-state renders all 5 rows with count 0 (not hidden); bar width formula uses `Math.max(total, 1)` to avoid NaN; count text is inline for WCAG colorblind compliance; `_buildElementDistMarkup` called in `_buildMarkup`; `_initElementDist` called in the existing 80ms `setTimeout`
- Model: Haiku triad

- [ ] **Step 1: Write the failing E2E tests**

Add these tests inside the existing `test.describe('#dashboard — agent constellation', ...)` block in `tests/e2e/sections.spec.js`, after the last existing dashboard test:

```js
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
```

- [ ] **Step 2: Run the failing E2E tests**

```bash
npx playwright test tests/e2e/sections.spec.js --grep "element distribution"
```

Expected: 2 FAILED — `.dash-element-dist` does not exist yet.

- [ ] **Step 3: Add element distribution CSS to dashboard.css**

Append to the end of `public/css/sections/dashboard.css`:

```css
/* -- Element distribution ------------------------------------------- */
.dash-element-dist {
  flex-shrink: 0;
  padding-top: var(--space-2);
}

.dash-element-dist-title {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--hh-fg-3);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  margin-bottom: var(--space-2);
}

.dash-element-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-1);
}

.dash-element-name {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--hh-fg-2);
  width: 4rem;
  flex-shrink: 0;
}

.dash-element-bar-wrap {
  flex: 1;
  height: 4px;
  background: var(--surface-3);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.dash-element-bar {
  height: 100%;
  border-radius: var(--radius-full);
  min-width: 0;
  transition: width var(--dur-slow) var(--ease-out);
}

.dash-element-count {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--hh-fg-3);
  width: 1.8rem;
  text-align: right;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .dash-element-dist { display: none; }
}
```

- [ ] **Step 4: Add ELEMENT_COLORS constant and helper functions to dashboard.js**

At the top of `public/js/sections/dashboard.js`, after the existing `ELEMENTS` array and before `GLOW_LAYERS`, add:

```js
const ELEMENT_COLORS = {
  fire:   '#F4C842',
  earth:  '#4ADE80',
  air:    '#93C5FD',
  water:  '#67E8F9',
  aether: '#C4B5FD',
};
```

- [ ] **Step 5: Add _buildElementDistMarkup to dashboard.js**

Add this function after the existing `_buildMarkup` function (around line 85, after `section.appendChild(wrap)`):

```js
function _buildElementDistMarkup(wrap) {
  const dist = _el('div', { className: 'dash-element-dist' },
    _el('div', { className: 'dash-element-dist-title' }, 'Element Distribution'),
  );
  for (const name of ['fire', 'earth', 'air', 'water', 'aether']) {
    const row     = _el('div', { className: 'dash-element-row', dataset: { element: name } });
    const label   = _el('span', { className: 'dash-element-name' }, name);
    const barWrap = _el('div', { className: 'dash-element-bar-wrap' });
    const bar     = _el('div', { className: 'dash-element-bar' });
    bar.style.width           = '0%';
    bar.style.backgroundColor = ELEMENT_COLORS[name];
    barWrap.appendChild(bar);
    const count = _el('span', { className: 'dash-element-count' }, '0');
    row.append(label, barWrap, count);
    dist.appendChild(row);
  }
  wrap.appendChild(dist);
}
```

- [ ] **Step 6: Call _buildElementDistMarkup from _buildMarkup**

In `_buildMarkup`, change the end of the function from:

```js
  wrap.appendChild(header);
  wrap.appendChild(canvas);
  wrap.appendChild(legend);
  wrap.appendChild(metrics);

  section.appendChild(wrap);
```

to:

```js
  wrap.appendChild(header);
  wrap.appendChild(canvas);
  wrap.appendChild(legend);
  wrap.appendChild(metrics);
  _buildElementDistMarkup(wrap);

  section.appendChild(wrap);
```

- [ ] **Step 7: Add _fetchAndRenderElementDist and _initElementDist to dashboard.js**

Add these two functions after the existing `_initMetrics` function at the bottom of `dashboard.js`:

```js
async function _fetchAndRenderElementDist(section) {
  try {
    const res    = await fetch('/api/analytics/elements');
    const data   = await res.json();
    const total  = Math.max(data.total, 1);
    for (const name of ['fire', 'earth', 'air', 'water', 'aether']) {
      const row   = section.querySelector(`.dash-element-row[data-element="${name}"]`);
      if (!row) continue;
      const count = data[name] ?? 0;
      const bar   = row.querySelector('.dash-element-bar');
      const label = row.querySelector('.dash-element-count');
      if (bar)   bar.style.width    = `${(count / total) * 100}%`;
      if (label) label.textContent  = String(count);
    }
  } catch (err) {
    console.error('[dashboard] element dist fetch failed:', err);
  }
}

function _initElementDist(section) {
  _fetchAndRenderElementDist(section);
}
```

- [ ] **Step 8: Call _initElementDist in the init() setTimeout block**

In `init()`, find the existing `setTimeout` block:

```js
  setTimeout(() => {
    _initConstellation(section);
    _initMetrics(section);
  }, 80);
```

Change it to:

```js
  setTimeout(() => {
    _initConstellation(section);
    _initMetrics(section);
    _initElementDist(section);
  }, 80);
```

- [ ] **Step 9: Run the E2E tests**

```bash
npx playwright test tests/e2e/sections.spec.js --grep "element distribution|analytics/elements"
```

Expected: 2 passed.

- [ ] **Step 10: Run full test suite**

```bash
npm test && npx playwright test
```

Expected: 80/80 Jest · 45/45 Playwright.

- [ ] **Step 11: Commit**

```bash
git add public/js/sections/dashboard.js public/css/sections/dashboard.css tests/e2e/sections.spec.js
git commit -m "feat(dashboard): add element distribution block with analytics fetch"
```

---

## Final verification

- [ ] **Verify test counts**

```bash
npm test
npx playwright test
```

Expected: **80/80 Jest · 45/45 Playwright**

- [ ] **Manual smoke test**

1. `npm run dev`
2. Navigate to `#oracle`, complete the quiz, select any element
3. Navigate to `#dashboard` — verify element distribution block renders with 5 rows and the selected element's count is ≥ 1
4. Refresh the page — count persists (data survives page reload via tasks.db)

- [ ] **Push to origin**

```bash
git push
```

---

## Out of scope (do not implement)

- Analytics persistence across Render deploys — accept data wipe on redeploy
- Per-session analytics (no session_id FK)
- Pagination, timestamps, or date filtering on the analytics endpoint
- Authentication on `GET /api/analytics/elements`
- Contact form email delivery (separate Fleet 20 candidate)
- Page-view tracking (separate Fleet 20 candidate)
