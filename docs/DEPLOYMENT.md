<!-- generated-by: gsd-doc-writer -->
# Deployment

Hardy House Consulting is deployed as a Node.js Web Service on Render.com. There is no Dockerfile — the service runs directly via `node server.js`. `main` is always deployable; feature work lands on `feat/section-name` branches and merges via PR after CI passes.

---

## Deployment Targets

| Target | Config | Notes |
|---|---|---|
| Render.com (primary) | No config file — configured in Render dashboard | Node.js Web Service, not Static Site |
| Local dev | `.env` + `npm run dev` | Nodemon watch mode |

No `Dockerfile`, `docker-compose.yml`, `vercel.json`, `netlify.toml`, or `fly.toml` are present in the repository.

---

## Render.com Setup

### First-time deployment

1. Log in to [https://render.com](https://render.com) and click **+ New** → **Web Service**.
2. Connect your GitHub account and select the `Hardy-House-Consulting` repository.
3. Configure the service:

| Setting | Value |
|---|---|
| **Environment** | Node |
| **Region** | Choose closest to your users |
| **Branch** | `main` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free (or Starter for always-on) |

4. Add environment variables (see [Environment Setup](#environment-setup) below).
5. Click **Create Web Service**.

Render will pull `main`, run `npm install`, then execute `node server.js`. The service is live when the deploy log shows `Hardy House running on http://localhost:<PORT>`.

### Auto-deploy on push

Render auto-deploys on every push to `main` by default. No additional configuration is required. Feature branches do not trigger deploys.

---

## Build Pipeline (CI/CD)

### GitHub Actions — `.github/workflows/ci.yml`

| Property | Value |
|---|---|
| **Workflow name** | CI |
| **Triggers** | Push to `main`, pull requests targeting `main` |
| **Runner** | `ubuntu-latest` |
| **Node.js version** | `20` |

**Steps (in order):**

1. `actions/checkout@v4` — check out repository
2. `actions/setup-node@v4` with Node 20 and npm cache enabled
3. `npm ci` — install exact locked dependencies
4. `npx playwright install --with-deps chromium` — install Playwright browser
5. `npm test -- --testPathPattern="^(?!.*worktrees)"` — Jest unit + API tests
6. `npm run test:e2e` — Playwright E2E tests

CI must pass before any PR can merge to `main`. Render's auto-deploy fires only after the push to `main` — if CI fails, the deploy does not trigger.

---

## Environment Setup

All required variables must be set in the Render dashboard under **Environment** before the first deploy.

| Variable | Required | Example / Notes |
|---|---|---|
| `SESSION_SECRET` | **Required** | 64 random characters — server throws on startup if absent in production |
| `NODE_ENV` | **Required** | Set to `production` — enables secure cookies and activates all rate limiters |
| `RESEND_API_KEY` | **Required** | `re_xxxxxxxxxxxxxxxxxxxx` — contact form email delivery via Resend |
| `PORT` | Optional | Render sets this automatically — do not override |

`SESSION_SECRET` is validated at startup in `server.js`:

```js
if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET env var required in production');
  }
}
```

If `SESSION_SECRET` is missing in production the process exits immediately with that error — the deploy will show as failed in the Render dashboard.

See [CONFIGURATION.md](CONFIGURATION.md) for the full variable reference including defaults and validation rules.

---

## Rate Limiting (production only)

Rate limiters are skipped when `NODE_ENV !== 'production'`. In production:

| Route | Window | Max requests |
|---|---|---|
| `POST /api/element` | 60 seconds | 10 |
| `POST /api/export` | 60 seconds | 10 |
| `GET /api/tasks` | 60 seconds | 30 |
| `GET /api/analytics` | 60 seconds | 30 |
| `POST /api/contact` | 10 minutes | 3 |

The contact endpoint returns `429 Too many requests — try again later` on breach; all others use the `express-rate-limit` default 429 response.

---

## Branch Strategy

| Branch | Purpose | Deploys to |
|---|---|---|
| `main` | Always deployable production state | Render.com (auto) |
| `feat/section-name` | Feature development | No auto-deploy |

PRs from feature branches must pass CI (Jest + Playwright) before merge. Direct pushes to `main` are not blocked by convention but CI still runs on the push.

---

## Rollback Procedure

Render stores previous deploy artifacts. To roll back:

1. Open the Render dashboard and navigate to the service.
2. Click the **Events** tab.
3. Find the last known-good deploy and click **Rollback**.
4. Confirm by clicking **Rollback to this deploy** on the confirmation page.

> **Free tier limitation:** Render only retains the two most recent previous deploys for rollback on the free tier.

Alternatively, revert the offending commit on `main` and push — Render will auto-deploy the reverted state.

```bash
git revert HEAD --no-edit
git push origin main
```

The revert approach is preferred: it creates an auditable commit and keeps the deploy history clean.

---

## Free Tier Behaviour

- Free tier instances **spin down after 15 minutes of inactivity**. The first request after a spin-down incurs a cold-start delay of approximately 30–60 seconds.
- Free tier includes approximately 750 compute hours per month.
- To keep the service always-on, upgrade to the **Starter** paid tier (approximately $7/month as of last check).

---

## Monitoring

No third-party monitoring library (`@sentry/*`, `dd-trace`, `newrelic`, `@opentelemetry/*`) is present in `package.json`.

Runtime errors are written to stdout/stderr via `console.error` in the global error handler and `unhandledRejection` listener. Render captures all stdout/stderr output and makes it available in the **Logs** tab of the service dashboard.
Log retention is **7 days** on the free tier and **14 days** on Starter and above. For log streaming to external providers (Datadog, Better Stack, Papertrail), configure a log drain from the service **Settings** tab.

For production alerting, Render's built-in notification settings (email on deploy failure, service crash) can be configured from the service **Settings** tab.
