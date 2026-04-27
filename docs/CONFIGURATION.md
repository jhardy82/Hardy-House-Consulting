<!-- generated-by: gsd-doc-writer -->
# Configuration

This document covers all environment variables, session settings, rate limits, and static asset cache configuration for the Hardy House Consulting app.

---

## Environment Variables

Copy `.env.example` to `.env` before running locally:

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | Optional | `3000` | HTTP server port |
| `SESSION_SECRET` | **Required in production** | `dev-secret-change-in-prod` | Signs express-session cookies. In production, absence throws and halts startup. |
| `NODE_ENV` | Optional | `development` | Set to `production` to enable secure cookies, rate limiting, and strict service checks. Accepts `development` or `production`. |
| `RESEND_API_KEY` | **Required in production** | _(none)_ | Resend email service API key for the contact form. Absence in production returns `503`. In dev/test, the send is skipped and the route returns `{ ok: true, dev: true }`. |

`.env.example` canonical values:

```dotenv
PORT=3000
SESSION_SECRET=replace-with-64-random-chars
NODE_ENV=development
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
```

<!-- VERIFY: SESSION_SECRET minimum character length or entropy requirements beyond the 64-char hint in .env.example -->
<!-- VERIFY: RESEND_API_KEY format constraints (prefix, length) beyond the re_xx… placeholder shown in .env.example -->

---

## Required vs Optional Settings

| Variable | Startup behaviour if absent |
|---|---|
| `SESSION_SECRET` | **Throws** in production (`Error: SESSION_SECRET env var required in production`). In development, logs a warning and uses the insecure default. |
| `RESEND_API_KEY` | **Returns 503** from `POST /api/contact` in production. In development, skips sending and returns `{ ok: true, dev: true }`. |
| `PORT` | Falls back to `3000`. |
| `NODE_ENV` | Defaults to `development`. Rate limiting and secure cookies are disabled until this is set to `production`. |

---

## Defaults

| Variable | Default value | Where set |
|---|---|---|
| `PORT` | `3000` | `server.js` line 19: `process.env.PORT \|\| 3000` |
| `SESSION_SECRET` | `'dev-secret-change-in-prod'` | `server.js` line 51 |
| `NODE_ENV` | _(Node.js implicit)_ `undefined` / treated as development | Runtime environment |

---

## Session Configuration

Session is managed by `express-session`. Configuration in `server.js`:

| Setting | Value |
|---|---|
| `resave` | `false` |
| `saveUninitialized` | `false` |
| `cookie.secure` | `true` in production, `false` in development |
| `cookie.sameSite` | `'lax'` |

The session stores the user's assigned Oracle element (`req.session.element`). No database-backed session store is configured — sessions are in-memory (default MemoryStore). This is appropriate for single-instance deployments on Render.com free/hobby tiers.

---

## Rate Limits

Rate limiting is **active in production only** (`NODE_ENV=production`). All limits use `express-rate-limit` with standard RFC headers (`RateLimit-*`) and no legacy `X-RateLimit-*` headers.

| Route | Window | Max requests | Notes |
|---|---|---|---|
| `POST /api/element` | 60 seconds | 10 | Element assignment |
| `POST /api/export` | 60 seconds | 10 | PNG canvas export |
| `GET /api/tasks` | 60 seconds | 30 | Task summary |
| `GET /api/analytics` | 60 seconds | 30 | Page-view analytics |
| `POST /api/contact` | 10 minutes | 3 | Contact form; returns `429` with `{ error: 'Too many requests — try again later' }` |

---

## Request Body Limits

| Context | Limit | Where configured |
|---|---|---|
| Default JSON body parser | `100kb` | `server.js` — `express.json({ limit: '100kb' })` |
| `/api/export` JSON body | `2mb` | `server.js` — per-route `express.json({ limit: '2mb' })` |

---

## Static Asset Cache

| Path | Cache TTL | Behaviour |
|---|---|---|
| `public/vendor/` | 1 year | `Cache-Control: max-age=31536000, immutable` — Three.js and GSAP bundles |
| `public/` (all other assets) | 1 hour | `Cache-Control: max-age=3600` |

---

## Content Security Policy

Helmet applies the following CSP directives:

| Directive | Allowed sources |
|---|---|
| `default-src` | `'self'` |
| `script-src` | `'self'` |
| `style-src` | `'self'`, `'unsafe-inline'`, `https://fonts.googleapis.com` |
| `font-src` | `'self'`, `https://fonts.gstatic.com` |
| `img-src` | `'self'`, `data:` |
| `connect-src` | `'self'` |
| `frame-src` | `'none'` |
| `object-src` | `'none'` |

`crossOriginEmbedderPolicy` is disabled (`false`) to allow Three.js canvas rendering.

---

## Config Files

| File | Purpose |
|---|---|
| `.env.example` | Template for local environment variables — copy to `.env` |
| `.eslintrc.cjs` / `.eslintrc.json` | ESLint config covering `public/js/`, `routes/`, `tasks/` |
| `jest.config.mjs` | Jest configuration using `--experimental-vm-modules` for ESM support |
| `playwright.config.js` | Playwright E2E test configuration |

---

## Per-Environment Overrides

| Environment | Key differences |
|---|---|
| `development` | Rate limiting skipped. `cookie.secure` is `false`. Missing `SESSION_SECRET` logs a warning but does not throw. Missing `RESEND_API_KEY` skips email send and returns a dev stub. |
| `production` | Rate limiting enforced. `cookie.secure` is `true`. Missing `SESSION_SECRET` throws at startup. Missing `RESEND_API_KEY` returns `503` from the contact endpoint. |

For Render.com deployments, set `SESSION_SECRET`, `NODE_ENV=production`, and `RESEND_API_KEY` in the service's **Environment** tab in the Render dashboard.
<!-- VERIFY: Exact Render.com dashboard path or UI steps for setting environment variables -->
