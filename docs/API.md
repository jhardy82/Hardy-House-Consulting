<!-- generated-by: gsd-doc-writer -->
# API Reference

Hardy House Consulting exposes a small REST API under the `/api` prefix. All endpoints accept and return JSON. Rate limits apply in production only (`NODE_ENV=production`) — they are bypassed in development and test environments.

---

## Endpoints Overview

| Method | Path | Description | Session Required | Rate Limit (prod) | Auth |
|--------|------|-------------|-----------------|-------------------|------|
| GET | `/api/element` | Read current element from session | No | 10 req/min | None |
| POST | `/api/element` | Assign element to session | No | 10 req/min | None |
| POST | `/api/export` | Export canvas as PNG download | No | 10 req/min | None |
| GET | `/api/agents` | ContextForge agent graph data | No | None | None |
| GET | `/api/tasks/summary` | Task status counts from SQLite | No | 30 req/min | None |
| GET | `/api/analytics/elements` | Element assignment distribution | No | 30 req/min | None |
| POST | `/api/analytics/pageview` | Record a section page view | No | 30 req/min | None |
| GET | `/api/analytics/pageviews` | Section visit counts | No | 30 req/min | None |
| POST | `/api/contact` | Send contact form email via Resend | No | 3 req/10 min | None |

---

## Session

The app uses `express-session` with cookie-based sessions. Sessions are not required to call any endpoint, but the element endpoints read from and write to `req.session.element`. Cookie settings:

- `secure: true` in production, `false` in development
- `sameSite: 'lax'`
- `saveUninitialized: false` — no session is created until one is written

---

## Rate Limiting

Rate limits use `express-rate-limit` with `RateLimit-*` standard headers. They are **active in production only** — the `skip` function returns `true` when `NODE_ENV !== 'production'`.

When a rate limit is exceeded the server returns:

```json
HTTP 429 Too Many Requests
{ "error": "Too many requests — try again later" }
```

The `/api/contact` endpoint uses a custom 429 handler with this message. All other rate-limited endpoints use the library default.

---

## Endpoints

### GET /api/element

Read the element currently stored in the caller's session.

**Rate limit:** 10 requests per 60 seconds (production only)

**Request:** No body required.

**Response 200:**

```json
{ "element": "fire" }
```

Returns `null` if no element has been assigned to the session yet:

```json
{ "element": null }
```

**Errors:** None — always returns 200.

---

### POST /api/element

Assign an element to the caller's session. Also writes an analytics record to `tasks/tasks.db` (`element_assignments` table). A failed DB write is logged but does not fail the request.

**Rate limit:** 10 requests per 60 seconds (production only)

**Request body:**

```json
{ "element": "fire" }
```

`element` must be one of: `fire`, `earth`, `air`, `water`, `aether`.

**Response 200:**

```json
{ "element": "fire", "ok": true }
```

**Errors:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Invalid element" }` | `element` not in the valid set |

---

### POST /api/export

Convert a PNG data URL to a file download. The server decodes the base64 payload, validates the PNG magic bytes, sanitises the filename, and streams the binary back as an attachment.

**Rate limit:** 10 requests per 60 seconds (production only)

**Body size limit:** 2 MB (overrides the global 100 KB JSON limit for this route only)

**Request body:**

```json
{
  "dataUrl": "data:image/png;base64,iVBORw0KGgo...",
  "filename": "geometry-export"
}
```

- `dataUrl` — required. Must start with `data:image/png;base64,`. Base64 characters only after the prefix. Payload must decode to a valid PNG (magic bytes `89 50 4E 47`).
- `filename` — optional. Alphanumeric, dots, hyphens, underscores, and spaces allowed; max 255 characters. Path traversal sequences are stripped. Extension is always forced to `.png`.

**Response 200:** Binary PNG file download.

```
Content-Type: image/png
Content-Disposition: attachment; filename="geometry-export.png"; filename*=UTF-8''geometry-export.png
Content-Length: <bytes>
```

**Errors:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Missing dataUrl" }` | `dataUrl` absent or empty string |
| 400 | `{ "error": "Invalid dataUrl format; expected data:image/png;base64," }` | Wrong prefix |
| 400 | `{ "error": "Invalid base64 payload" }` | Non-base64 characters in payload |
| 400 | `{ "error": "Malformed base64" }` | `Buffer.from` decode failure |
| 400 | `{ "error": "Invalid image format" }` | PNG magic bytes mismatch |
| 500 | `{ "error": "Internal server error" }` | Unhandled exception |

---

### GET /api/agents

ContextForge agent graph data endpoint. **Not yet implemented — returns 501.**

**Rate limit:** None

**Response 501:**

```json
{ "error": "Not implemented in Session 1" }
```

This stub will be replaced in a future sprint with `{ nodes, links }` graph data for the ContextForge agent visualisation.

---

### GET /api/tasks/summary

Return task counts grouped by status from `tasks/tasks.db`. Reads the `tasks` table and aggregates by the `status` column. The DB status value `in-progress` is normalised to the key `in_progress` in the response. A missing or unreadable database returns zeros — no error is surfaced to the caller.

**Rate limit:** 30 requests per 60 seconds (production only)

**Request:** No body required.

**Response 200:**

```json
{
  "open": 4,
  "in_progress": 2,
  "blocked": 1,
  "done": 12,
  "total": 19
}
```

`total` is the sum of the four status counts. Statuses not in the known set (`open`, `in-progress`, `blocked`, `done`) are ignored.

**Errors:** None surfaced — always returns 200 with zero counts on DB failure.

---

### GET /api/analytics/elements

Return the count of element assignments per element type from `tasks/tasks.db` (`element_assignments` table). Falls back to zeros on DB error.

**Rate limit:** 30 requests per 60 seconds (production only)

**Response 200:**

```json
{
  "fire": 12,
  "earth": 8,
  "air": 15,
  "water": 6,
  "aether": 3,
  "total": 44
}
```

**Errors:** None surfaced — always returns 200 with zero counts on DB failure.

---

### POST /api/analytics/pageview

Record a section page view to `tasks/tasks.db` (`section_visits` table). DB write failures are logged but do not fail the request.

**Rate limit:** 30 requests per 60 seconds (production only)

**Request body:**

```json
{ "section": "oracle" }
```

`section` must be one of: `home`, `oracle`, `dashboard`, `geometry`, `decomposition`, `variants`, `tree`, `yantra`, `grow`, `presentation`, `contact`.

**Response 200:**

```json
{ "ok": true }
```

**Errors:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Invalid section" }` | `section` not in the valid set |

---

### GET /api/analytics/pageviews

Return section visit counts from `tasks/tasks.db` (`section_visits` table). All valid sections are returned with a count of `0` if no visits recorded. Falls back to zeros on DB error.

**Rate limit:** 30 requests per 60 seconds (production only)

**Response 200:**

```json
{
  "home": 43,
  "oracle": 31,
  "dashboard": 12,
  "geometry": 28,
  "decomposition": 9,
  "variants": 7,
  "tree": 5,
  "yantra": 2,
  "grow": 3,
  "presentation": 6,
  "contact": 4,
  "total": 150
}
```

**Errors:** None surfaced — always returns 200 with zero counts on DB failure.

---

### POST /api/contact

Send a contact form message via the Resend email API. The email is delivered to `james.hardy1124@gmail.com` with `replyTo` set to the sender's address.

In development (`RESEND_API_KEY` not set): returns `{ ok: true, dev: true }` without sending.

In production with `RESEND_API_KEY` missing: returns 503.

**Rate limit:** 3 requests per 10 minutes (production only) — uses a custom 429 handler.

**Request body:**

```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "message": "Hello, I would like to discuss a project."
}
```

Field constraints:

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | string | Yes | Non-empty, max 100 characters |
| `email` | string | Yes | Must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| `message` | string | Yes | Non-empty, max 2000 characters |

**Response 200 (sent):**

```json
{ "ok": true }
```

**Response 200 (dev mode — no send):**

```json
{ "ok": true, "dev": true }
```

**Errors:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Name is required and must be 100 characters or fewer" }` | `name` absent, non-string, empty, or > 100 chars |
| 400 | `{ "error": "A valid email address is required" }` | `email` absent or fails regex |
| 400 | `{ "error": "Message is required and must be 2000 characters or fewer" }` | `message` absent, non-string, empty, or > 2000 chars |
| 429 | `{ "error": "Too many requests — try again later" }` | Rate limit exceeded |
| 500 | `{ "error": "Delivery failed" }` | Resend API call threw |
| 503 | `{ "error": "Service temporarily unavailable" }` | `RESEND_API_KEY` missing in production |

---

## Global Error Handler

Unhandled errors that propagate to Express's error middleware return:

```json
HTTP 500 (or err.status/err.statusCode if set)
{ "error": "<error message>" }
```

---

## Body Size Limits

| Route | Limit |
|-------|-------|
| All routes (global) | 100 KB |
| `/api/export` | 2 MB (overrides global) |
