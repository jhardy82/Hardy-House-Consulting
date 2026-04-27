# Oracle Element Analytics — Design Spec
**Date:** 2026-04-26  
**Status:** Approved  
**Fleet:** 20 — Business Functionality  
**Author:** James Hardy + Claude Sonnet 4.6

---

## Overview

Log every Oracle element assignment to SQLite and surface per-element counts in the `#dashboard` section. Gives the site owner visibility into which Platonic solids are being assigned during demos without any external service or cost.

**Scope:** 5 files touched, 1 file created, 1 package added. No auth, no pagination, no timestamps in response.

---

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Storage | SQLite (`tasks/tasks.db`) | `better-sqlite3` already installed; extends existing table schema pattern |
| Persistence | Accept wipe on Render deploy | Ephemeral filesystem; no Render Disk needed |
| Connection pattern | Per-request open→write→close | Consistent with `tasks-summary.js`; avoids write contention with persistent connection in `tasks.js` |
| Dashboard surface | Element counts only (5 rows) | Glanceable during demo; no charts needed |
| Rate limiting | 10 req/min per IP on POST /api/element | `express-rate-limit`; prevents DB flood on unauthenticated route |
| Zero-state | Always render 5 rows with count 0 | Maintains visual structure; avoids dashes/empty |
| Accessibility | Inline count text alongside bars | Satisfies WCAG 2.1 AA colorblind requirement without patterns |

---

## Data Model

Added to `routes/tasks.js` startup block alongside existing `sessions` and `tasks` table creations:

```sql
CREATE TABLE IF NOT EXISTS element_assignments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  element     TEXT    NOT NULL CHECK(element IN ('fire','earth','air','water','aether')),
  assigned_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

Schema notes:
- `CHECK` constraint mirrors the allowlist validation in `element.js` — defense in depth
- No `session_id` foreign key — sessions are task-management scoped, not user-session scoped
- No index on `assigned_at` — aggregate COUNT query does not need it at demo scale

---

## API

### Augmented: `POST /api/element`

Existing behavior unchanged. After `req.session.element = element`, insert a row:

```js
// Parameterized query — no string concatenation
const db = new Database(DB_PATH);
try {
  db.prepare('INSERT INTO element_assignments (element) VALUES (?)').run(element);
} catch (err) {
  console.error('[analytics] element write failed:', err.message);
} finally {
  db.close();
}
```

DB write failure is logged and never propagated. Session assignment always succeeds.

Rate limit applied at server level:
```js
// server.js — applied before the element route
import rateLimit from 'express-rate-limit';
app.use('/api/element', rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false }));
```

### New: `GET /api/analytics/elements`

**Response shape:**
```json
{ "fire": 12, "earth": 4, "air": 6, "water": 8, "aether": 2, "total": 32 }
```

**Error response** (DB unavailable): identical shape with all zeroes — same pattern as `tasks-summary.js`.

**DB_PATH** (must match `tasks-summary.js`): `join(__dirname, '..', '..', 'tasks', 'tasks.db')`

**Implementation pattern** (matches `tasks-summary.js` exactly):
```js
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
```

---

## Server Wiring (`server.js`)

Two additions:

```js
import rateLimit      from 'express-rate-limit';
import analyticsRouter from './routes/api/analytics.js';

// Rate limit — before element route registration
app.use('/api/element', rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false }));

// Analytics route
app.use('/api/analytics', analyticsRouter);
```

---

## Dashboard UI

New block appended below the existing `.dashboard-metrics` grid in `#dashboard`.

**Structure:**
```
ELEMENT DISTRIBUTION
────────────────────────────────────
◆ Fire     ██████████████████  12
◆ Earth    ████                4
◆ Air      ██████████          6
◆ Water    ████████████████    8
◆ Aether   ████                2
```

**Rendering rules:**
- Always render all 5 rows — zero state shows 0-width bars and count `0`
- Bar width: `(count / Math.max(total, 1)) * 100%` — `Math.max` prevents NaN at zero total
- Element dot color: inline `style="color: var(--accent)"` where `data-element` is set on the row element; or explicit hex from the accent map
- Count is inline text after the bar — satisfies colorblind accessibility without additional patterns
- Static render on each `init()` call; no animation

**Element color map** (mirrors tokens.css):
```js
const ELEMENT_COLORS = {
  fire:   '#F4C842',
  earth:  '#4ADE80',
  air:    '#93C5FD',
  water:  '#67E8F9',
  aether: '#C4B5FD'
};
```

---

## Files Changed

| File | Change |
|---|---|
| `package.json` | Add `express-rate-limit` to dependencies |
| `server.js` | Import + wire rate limit and analytics router |
| `routes/tasks.js` | Add `CREATE TABLE IF NOT EXISTS element_assignments` to startup block |
| `routes/api/element.js` | Augment POST handler to insert analytics row (per-request, fire-and-forget) |
| `routes/api/analytics.js` | **New** — `GET /elements` route |
| `public/js/sections/dashboard.js` | Fetch `/api/analytics/elements`, render element distribution block |

---

## Testing

### API tests (supertest)

| Test | Assertion |
|---|---|
| `POST /api/element` with valid element | `GET /api/analytics/elements` count for that element increments by 1 |
| `POST /api/element` with invalid element | Returns 400; element_assignments count unchanged |
| `GET /api/analytics/elements` | Returns object with all 5 element keys + `total` |
| `POST /api/element` 11 times in 60s | 11th request returns 429 |

### E2E (Playwright)

| Test | Assertion |
|---|---|
| Navigate to `#dashboard` | Element distribution block is present |
| Block has 5 rows | `querySelectorAll('.dash-element-row').length === 5` |

### Unit tests
None — SQL group-by logic verified by API integration tests.

---

## Team Composition

**Fleet class:** Well-specified, 5-file domain task — **Haiku triad**

| Role | Model | Responsibility |
|---|---|---|
| Builder | Haiku | Implements all 6 file changes |
| Challenger | Haiku | Spec compliance, DB failure isolation, rate-limit edge cases, zero-state rendering |
| Arbiter | Haiku | Pattern consistency with `tasks-summary.js`, existing route conventions, test coverage |

---

## Out of Scope

- Analytics persistence across Render deploys (no Render Disk; accepted)
- Per-session analytics (session_id foreign key omitted)
- Pagination or timestamp-based filtering
- Authentication on GET /api/analytics/elements
- Contact form email delivery (separate Fleet 20 candidate)
- Page-view tracking (separate Fleet 20 candidate)
