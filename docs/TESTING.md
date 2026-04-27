<!-- generated-by: gsd-doc-writer -->
# Testing

## Test framework and setup

The project uses two test frameworks:

- **Jest 29** for unit and API tests — invoked via `--experimental-vm-modules` to support ES Modules (`"type": "module"` in `package.json`)
- **Playwright 1.44** for E2E tests — chromium only in CI

Config files:
- `jest.config.mjs` — sets `testEnvironment: 'node'`, module name mapper for `.js` extension resolution, and excludes `tests/e2e/` and `.claude/` from Jest runs
- `playwright.config.js` — sets `testDir: './tests/e2e'`, 30-second timeout, chromium-only, starts `node server.js` automatically before E2E runs

No additional setup is required beyond `npm install`. The E2E global setup (`tests/e2e/global-setup.js`) runs `tasks/cli.js` before the server boots to ensure the SQLite `tasks.db` tables exist.

## Running tests

**Run all Jest tests (unit + API):**
```bash
npm test
```

**Run unit tests only:**
```bash
npm run test:unit
```
Targets `tests/unit/`.

**Run API tests only:**
```bash
npm run test:api
```
Targets `tests/api/`.

**Run E2E tests:**
```bash
npm run test:e2e
```
Playwright spins up `node server.js` on `http://localhost:3000` before running. If a server is already running locally, it is reused (CI always starts a fresh server).

**Run a single test file:**
```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js tests/unit/geometry-constants.test.js
```

**Run E2E tests for a specific spec:**
```bash
npx playwright test tests/e2e/sections.spec.js
```

## Test structure

```
tests/
├── unit/
│   ├── geometry-constants.test.js   -- sacred geometry mathematical invariants (PHI, FOL_PTS, MET_EDGES, glow layers)
│   ├── geometry.test.js             -- geometry utility functions
│   ├── oracle-scoring.test.js       -- oracle quiz scoring logic and element reachability
│   ├── tasks-cli.test.js            -- tasks CLI argument parsing
│   ├── tasks-flags.test.js          -- tasks status flag handling
│   └── yantraCoords.test.js         -- Sri Yantra coordinate generation
├── api/
│   ├── analytics.test.js            -- GET/POST /api/analytics/* routes
│   ├── contact.test.js              -- POST /api/contact route
│   ├── element.test.js              -- GET/POST /api/element, session persistence, analytics write
│   ├── export.test.js               -- POST /api/export route
│   ├── rate-limit.test.js           -- rate limiter middleware on /api/export, /api/tasks, /api/analytics
│   ├── tasks-summary.test.js        -- GET /api/tasks/summary counts and shape
│   └── tasks.test.js                -- GET /api/tasks routes
└── e2e/
    ├── global-setup.js              -- runs cli.js to initialise tasks.db before server boot
    ├── sections.spec.js             -- per-section render, interaction, and navigation tests
    └── tasks.spec.js                -- tasks dashboard E2E tests
```

## Writing new tests

### Unit tests

Unit tests cover pure functions from `public/js/geometry/` and `tasks/`. Because section modules use `window.THREE` and the DOM, geometry logic that depends on the browser cannot be imported directly — duplicate the logic in the test file and note the dependency (see `oracle-scoring.test.js` for the established pattern).

File naming: `{module-name}.test.js` in `tests/unit/`.

Pattern:

```js
import { PHI, SQ3H } from '../../public/js/geometry/constants.js';

const EPSILON = 1e-10;

describe('PHI (Golden Ratio)', () => {
  test('equals (1 + sqrt(5)) / 2', () => {
    const expected = (1 + Math.sqrt(5)) / 2;
    expect(Math.abs(PHI - expected)).toBeLessThan(EPSILON);
  });

  test('satisfies phi^2 == phi + 1 (defining identity)', () => {
    expect(Math.abs(PHI * PHI - (PHI + 1))).toBeLessThan(EPSILON);
  });
});
```

**Sacred geometry invariants** must always be tested against their mathematical definition, not just a hardcoded count. See `geometry-constants.test.js` for the full invariant suite.

### API tests

API tests use `supertest` to mount the router directly on a minimal Express app — no full server boot required. Sessions are tested using `request.agent(app)` to persist cookies across calls.

File naming: `{route-name}.test.js` in `tests/api/`.

Pattern:

```js
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import myRouter from '../../routes/api/my-route.js';

const app = express();
app.use(express.json());
app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: true, cookie: { secure: false } }));
app.use('/api/my-route', myRouter);

describe('GET /api/my-route', () => {
  test('returns 200', async () => {
    const res = await request(app).get('/api/my-route');
    expect(res.status).toBe(200);
  });

  test('returns expected keys', async () => {
    const res = await request(app).get('/api/my-route');
    expect(Object.keys(res.body).sort()).toEqual(['key1', 'key2']);
  });
});

describe('session persistence', () => {
  test('POST then GET in same agent returns the posted value', async () => {
    const agent = request.agent(app);
    await agent.post('/api/my-route').send({ value: 'test' });
    const res = await agent.get('/api/my-route');
    expect(res.body.value).toBe('test');
  });
});
```

Every route must cover: success case, invalid input returning 400, missing/wrong session state, and method-not-allowed (e.g. POST on a GET-only route returns 404).

### E2E tests

E2E tests use Playwright against the running server at `http://localhost:3000`. Each section has its own `test.describe` block in `sections.spec.js`.

Pattern for a new section:

```js
import { test, expect } from '@playwright/test';

async function goTo(page, hash) {
  await page.goto('/' + hash);
}

test.describe('#my-section — description', () => {
  test('section heading is visible', async ({ page }) => {
    await goTo(page, '#my-section');
    await expect(page.locator('section[data-section="my-section"]')).toBeVisible();
  });

  test('canvas is mounted and non-zero', async ({ page }) => {
    await goTo(page, '#my-section');
    const canvas = page.locator('#my-canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });
});
```

Every section must have at minimum: a heading/render test and, if a canvas is present, a non-zero bounding box test. Interactive sections (tabs, overlays, forms) require interaction tests. Check for console errors on rapid re-entry using `page.on('console', ...)`.

For sections that depend on `IntersectionObserver` before rendering (e.g. `#yantra`), use `scrollIntoViewIfNeeded()` and `page.waitForFunction()` to wait for construction to complete before asserting.

## Coverage requirements

| Scope | Target |
|---|---|
| Geometry modules (`public/js/geometry/`) | 85% lines |
| API routes (`routes/api/`) | 100% |
| Combined | 83%+ |

No coverage threshold is configured in `jest.config.mjs` — the targets above are enforced by code review convention, not automated gate. To measure coverage manually:

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --coverage
```

## CI integration

Workflow file: `.github/workflows/ci.yml`

**Triggers:** push to `main`, pull request targeting `main`

**Runtime:** `ubuntu-latest`, Node.js 20

**Steps:**
1. `npm ci` — install dependencies
2. `npx playwright install --with-deps chromium` — install chromium browser for E2E
3. `npm test -- --testPathPattern="^(?!.*worktrees)"` — run all Jest tests, excluding worktree paths
4. `npm run test:e2e` — run Playwright E2E suite against a fresh server instance

CI always starts a fresh server for E2E (the `reuseExistingServer` option in `playwright.config.js` is disabled when `CI=true`).
