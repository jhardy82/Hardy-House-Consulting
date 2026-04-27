<!-- generated-by: gsd-doc-writer -->
# Getting Started — Hardy House Consulting App

A walkthrough from zero to a running local instance.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | >= 20.0.0 | Required for `--env-file` flag used by `npm run dev` |
| npm | >= 10.0.0 | Bundled with Node.js 20 |

Verify your versions:

```bash
node --version
npm --version
```

No database engine or global tools are required beyond Node.js and npm.

---

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd hardy-house-consulting
```

### 2. Install dependencies

```bash
npm install
```

This installs both runtime dependencies (Express, better-sqlite3, resend, etc.) and dev dependencies (Jest, Playwright, nodemon, ESLint).

---

## Environment Setup

### 3. Copy the example env file

```bash
cp .env.example .env
```

`.env.example` contains:

```
PORT=3000
SESSION_SECRET=replace-with-64-random-chars
NODE_ENV=development
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
```

### 4. Configure `.env` for local development

For local dev, the only required change is `SESSION_SECRET`. The server will warn (but not crash) if it is missing in development — it will crash in production.

| Variable | Required | Default | Action |
|---|---|---|---|
| `PORT` | No | `3000` | Leave as-is unless port 3000 is in use |
| `SESSION_SECRET` | Yes (production) | `dev-secret-change-in-prod` (dev fallback) | Replace with any long random string for dev |
| `NODE_ENV` | No | `development` | Leave as `development` |
| `RESEND_API_KEY` | Only for contact form | — | Leave placeholder unless testing email delivery |

Minimum working `.env` for local dev:

```
PORT=3000
SESSION_SECRET=any-long-random-string-here
NODE_ENV=development
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
```

See `docs/CONFIGURATION.md` for the full environment variable reference.

---

## First Run

### 5. Start the development server

```bash
npm run dev
```

`nodemon` watches for file changes and restarts the server automatically. The `--env-file=.env` flag loads your `.env` without a separate dotenv library.

Expected output:

```
Hardy House running on http://localhost:3000
```

### 6. Open the app

Navigate to `http://localhost:3000` in your browser. The app is a single-page application with a hash-based router — all routes serve `views/index.html`.

---

## Section Tour

The app loads `#home` by default. Navigate using the top navigation bar or by changing the URL hash directly.

| Hash | Section | What it shows |
|---|---|---|
| `#home` | Home | Hero landing view |
| `#oracle` | Oracle | 5-question element assignment quiz |
| `#dashboard` | Dashboard | ContextForge agent graph + task summary |
| `#geometry` | Geometry | Interactive sacred geometry canvas (Three.js) |
| `#decomposition` | Decomposition | Geometric decomposition visualisation |
| `#variants` | Variants | Platonic solid variant explorer |
| `#tree` | Tree of Life | Tree of Life diagram |
| `#grow` | Grow | Growth pattern visualisation |
| `#yantra` | Yantra | Sri Yantra sacred geometry canvas |
| `#presentation` | Presentation | Slide-style consulting deck view |
| `#contact` | Contact | Contact form (email via Resend) |

The Oracle section sets an element (`fire`, `earth`, `air`, `water`, or `aether`) in the session. After completing the oracle, all section accents update via the `data-element` attribute on `<html>`.

---

## Common Setup Issues

**Port 3000 already in use**

Change `PORT` in `.env` to another value (e.g., `3001`) and restart.

**`SESSION_SECRET not set` warning in console**

The server runs but logs a warning. Set any non-empty string in `.env` for `SESSION_SECRET` to silence it.

**`nodemon` not found after `npm install`**

`nodemon` is a dev dependency. Run `npm install` again and confirm it appears in `node_modules/.bin/nodemon`. Alternatively run the server directly with `npm start` (no hot reload).

**Contact form sends no email**

`RESEND_API_KEY` must be a valid Resend API key. The contact route will return a 500 error if the key is a placeholder and you submit the form. This does not affect any other section.

**Canvas sections show a blank rectangle**

Three.js uses WebGL. Ensure hardware acceleration is enabled in your browser. Incognito mode or some browser extensions can disable WebGL.

---

## Next Steps

- See `docs/ARCHITECTURE.md` for how the server, router, and section modules are structured.
- See `docs/CONFIGURATION.md` for the full environment variable reference including production values.
- See `DEVELOPMENT.md` for build commands, code style, branch conventions, and PR process.
- See `TESTING.md` for running the Jest unit/API test suite and Playwright E2E tests.
