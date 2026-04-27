<!-- generated-by: gsd-doc-writer -->
# Hardy House Consulting

Modern Workplace and Endpoint Engineering consultancy app — an interactive portfolio and tooling hub built with sacred geometry, Three.js 3D rendering, and a hash-routed single-page architecture.

## Installation

```bash
git clone <repo-url>
cd hardy-house-consulting
npm install
cp .env.example .env
```

Edit `.env` and set a strong `SESSION_SECRET` (required in production).

## Quick Start

1. Copy environment config: `cp .env.example .env`
2. Start the dev server: `npm run dev`
3. Open `http://localhost:3000` in a browser

The app is served by Express at `http://localhost:3000`. Navigation is hash-based — each section loads on demand via the client-side router.

## Usage

### Sections

The app is a single-page application with 11 sections navigated via URL hash:

| Hash | Section | Description |
|---|---|---|
| `#home` | Home | Landing/hero |
| `#oracle` | Oracle | 5-question element assignment quiz |
| `#dashboard` | Dashboard | ContextForge task and agent dashboard |
| `#geometry` | Geometry | Interactive Platonic solids viewer |
| `#decomposition` | Decomposition | Sacred geometry decomposition tool |
| `#variants` | Variants | Geometry variants explorer |
| `#tree` | Tree of Life | Tree of Life visualisation |
| `#yantra` | Yantra | Sri Yantra with PAOAL and element overlays |
| `#grow` | Grow | Growth pattern visualisation |
| `#presentation` | Presentation | Slide deck view |
| `#contact` | Contact | Contact card |

### API

```
GET  /api/element              — retrieve current session element
POST /api/element              — set element: { element: 'fire'|'earth'|'air'|'water'|'aether' }
POST /api/export               — export canvas as PNG download: { dataUrl, filename }
GET  /api/agents               — ContextForge agent graph: { nodes, links }
GET  /api/tasks/summary        — task counts: { open, in_progress, blocked, done, total }
GET  /api/analytics/elements   — element assignment distribution
POST /api/analytics/pageview   — record a page-view: { section }
GET  /api/analytics/pageviews  — retrieve page-view history
POST /api/contact              — send contact message (rate-limited: 3 per 10 min in production)
```

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `SESSION_SECRET` | Required in prod | `dev-secret-change-in-prod` | Express session signing key — must be 64 random chars in production |
| `PORT` | Optional | `3000` | HTTP port |
| `NODE_ENV` | Optional | — | Set to `production` to enforce session security and rate limits |
| `RESEND_API_KEY` | Required for contact | — | Resend API key for contact form email delivery |

## Stack

- **Runtime:** Node.js 20, ES Modules (`"type": "module"`)
- **Server:** Express 4 with Helmet CSP, express-session, express-rate-limit, compression
- **Frontend:** Vanilla JavaScript ES Modules — no React, no Vue
- **3D rendering:** Three.js r128 (loaded as global via script tag)
- **Animation:** GSAP 3.12.2 with ScrollTrigger (loaded as global via script tag)
- **Database:** better-sqlite3 (SQLite, no ORM)
- **Email:** Resend API
- **Tests:** Jest 29 (unit + API via supertest), Playwright 1.44 (E2E)

## Development

```bash
npm run dev       # nodemon dev server with .env file auto-loaded
npm run lint      # ESLint over public/js/, routes/, tasks/
npm test          # Jest unit + API tests
npm run test:unit # Unit tests only (tests/unit/)
npm run test:api  # API tests only (tests/api/)
npm run test:e2e  # Playwright E2E tests
```

CI runs on every push and PR to `main` via GitHub Actions (`.github/workflows/ci.yml`) on Node 20 with Jest and Playwright (Chromium).

## Deployment

Hosted on Render.com as a Node.js Web Service (not a static site).

1. Connect the GitHub repository to Render
2. Build command: `npm install`
3. Start command: `npm start`
4. Set environment variables: `SESSION_SECRET`, `NODE_ENV=production`, `RESEND_API_KEY`
5. Auto-deploys on push to `main`

Render free tier: 750 hours/month, spins down after 15 minutes of inactivity.

## License

MIT — see [LICENSE](LICENSE).
