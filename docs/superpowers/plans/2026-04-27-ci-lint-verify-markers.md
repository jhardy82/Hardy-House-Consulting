# CI Lint Gate + VERIFY Marker Resolution

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `npm run lint` to the GitHub Actions CI pipeline and resolve all 7 `<!-- VERIFY: -->` markers in `docs/CONFIGURATION.md` and `docs/DEPLOYMENT.md` using researched facts.

**Architecture:** Three targeted file edits — one to `.github/workflows/ci.yml` (add lint step), two to documentation (replace VERIFY markers with verified content). No new files, no logic changes. Research-confirmed values for all markers; two factual corrections to existing content.

**Tech Stack:** GitHub Actions YAML · Markdown

---

## Research Summary (pre-confirmed — do not re-research)

| Fact | Verified value | Source |
|------|---------------|--------|
| Render button label | `+ New` → `Web Service` | render.com/docs/web-services |
| Render env vars tab | `Environment` | render.com/docs/configure-environment-variables |
| Render deploy history tab | `Events` (not "Deploys") | render.com/docs/rollbacks |
| Render rollback | Click `Rollback` on event → confirm `Rollback to this deploy` | render.com/docs/rollbacks |
| Render free rollback limit | 2 most-recent previous deploys only | render.com/free |
| Render free tier spin-down | 15 min inactivity | render.com/free |
| Render free hours/month | 750 instance hours | render.com/free |
| Render Starter price | $7/month | render.com/pricing |
| Render log retention (free) | 7 days | render.com/pricing |
| Render log retention (Starter) | 14 days | render.com/pricing |
| SESSION_SECRET generation | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` → 64-char hex | crypto best practice |
| RESEND_API_KEY format | `re_` prefix + 48 alphanumeric chars (total ≈51 chars) | resend.com/docs |

**Corrections vs. current doc content:**
- `DEPLOYMENT.md` line 25: `New +` → `+ New`
- `DEPLOYMENT.md` line 134: `Deploys` tab → `Events` tab (affects rollback steps)
- `DEPLOYMENT.md` line 164: add log retention periods (currently blank)

---

## File Map

| File | Change |
|------|--------|
| `.github/workflows/ci.yml` | Add lint step after `npm ci`, before Playwright install |
| `docs/CONFIGURATION.md` | Remove 3 VERIFY markers; add SESSION_SECRET gen command + RESEND format note |
| `docs/DEPLOYMENT.md` | Remove 4 VERIFY markers; fix 2 label errors; add log retention details + rollback limit |

---

### Task 1: Add lint step to CI

**Files:**
- Modify: `.github/workflows/ci.yml`

**Specialists:**
- Domain: devops-infra
- Lead expertise: GitHub Actions YAML step ordering; fail-fast linting before expensive browser install
- Review focus: step placement (lint must run after `npm ci`; must come before Playwright install to fail fast), correct `run:` command
- Model: Haiku triad

- [ ] **Step 1: Edit `.github/workflows/ci.yml` — insert lint step**

Insert after the `Install dependencies` step (after `run: npm ci`), before `Install Playwright browsers`:

```yaml
      - name: Lint
        run: npm run lint
```

Full resulting `steps:` block after the edit:

```yaml
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run Jest tests
        run: npm test -- --testPathPattern="^(?!.*worktrees)"

      - name: Run Playwright E2E tests
        run: npm run test:e2e
```

- [ ] **Step 2: Verify lint passes locally**

```bash
npm run lint
```

Expected: exits 0, no output. If ESLint errors appear, fix them before continuing.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add npm run lint step before Playwright install"
```

---

### Task 2: Resolve VERIFY markers in `docs/CONFIGURATION.md`

**Files:**
- Modify: `docs/CONFIGURATION.md`

**Specialists:**
- Domain: config-management
- Lead expertise: Technical documentation accuracy; express-session security conventions; Resend API key format
- Review focus: claim accuracy against known facts; no fabricated values; VERIFY markers fully removed
- Model: Haiku triad

Three markers to resolve — all on lines 32–33 and 143.

- [ ] **Step 1: Replace VERIFY markers on lines 32–33**

Remove these two lines:
```
<!-- VERIFY: SESSION_SECRET minimum character length or entropy requirements beyond the 64-char hint in .env.example -->
<!-- VERIFY: RESEND_API_KEY format constraints (prefix, length) beyond the re_xx… placeholder shown in .env.example -->
```

Replace with:

```markdown
> **Generating `SESSION_SECRET`:** Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` to produce a cryptographically random 64-character hex string. Any secret of equivalent entropy (32+ random bytes) is acceptable.

> **`RESEND_API_KEY` format:** Keys begin with the prefix `re_` followed by 48 alphanumeric characters (total ≈ 51 characters). Example shape: `re_AbCdEfGhIjKlMnOpQrStUvWxYz01234567890123456`.
```

- [ ] **Step 2: Replace VERIFY marker on line 143**

Remove this line:
```
<!-- VERIFY: Exact Render.com dashboard path or UI steps for setting environment variables -->
```

The preceding sentence ("For Render.com deployments, set … in the service's **Environment** tab") is accurate — the tab is confirmed as `Environment`. No replacement text needed; just delete the marker line.

- [ ] **Step 3: Verify the file reads cleanly**

```bash
grep -n "VERIFY" docs/CONFIGURATION.md
```

Expected: no output (all markers removed).

- [ ] **Step 4: Commit**

```bash
git add docs/CONFIGURATION.md
git commit -m "docs: resolve CONFIGURATION.md VERIFY markers (session secret, RESEND key format)"
```

---

### Task 3: Resolve VERIFY markers in `docs/DEPLOYMENT.md`

**Files:**
- Modify: `docs/DEPLOYMENT.md`

**Specialists:**
- Domain: devops-infra
- Lead expertise: Render.com platform knowledge; deployment documentation accuracy
- Review focus: all three factual corrections applied (button label, tab name, rollback limit); VERIFY markers fully removed; no new inaccuracies introduced
- Model: Haiku triad

Four markers to resolve, plus two factual corrections.

- [ ] **Step 1: Fix button label and remove first VERIFY marker (lines 23–25)**

Remove the VERIFY comment:
```
<!-- VERIFY: Render dashboard navigation steps and UI labels below reflect the current Render.com interface -->
```

Also fix line 25 button label: `New +` → `+ New`:

Change:
```markdown
1. Log in to [https://render.com](https://render.com) and click **New +** → **Web Service**.
```

To:
```markdown
1. Log in to [https://render.com](https://render.com) and click **+ New** → **Web Service**.
```

- [ ] **Step 2: Fix rollback section — tab name, rollback flow, free-tier limit, remove VERIFY marker (lines 131–136)**

Remove the VERIFY comment:
```
<!-- VERIFY: Render dashboard rollback UI — confirm "Deploys" tab name and "Rollback" button label in current Render interface -->
```

Replace the rollback steps block:
```markdown
1. Open the Render dashboard and navigate to the service.
2. Click the **Deploys** tab.
3. Find the last known-good deploy and click **Rollback to this deploy**.
```

With:
```markdown
1. Open the Render dashboard and navigate to the service.
2. Click the **Events** tab.
3. Find the last known-good deploy and click **Rollback**.
4. Confirm by clicking **Rollback to this deploy** on the confirmation page.

> **Free tier limitation:** Render only retains the two most recent previous deploys for rollback on the free tier.
```

- [ ] **Step 3: Remove free-tier VERIFY marker (lines 150–154)**

Remove the VERIFY comment:
```
<!-- VERIFY: Render free-tier spin-down timeout, monthly hour limit, and Starter tier pricing below — these are subject to change at https://render.com/pricing -->
```

The values below it (15 min spin-down, 750 hours, $7/month Starter) are confirmed correct — the marker is the only thing to remove.

- [ ] **Step 4: Replace log retention VERIFY marker (line 164)**

Remove:
```
<!-- VERIFY: Render log retention period and alerting options on current free and Starter tiers -->
```

The sentence above it ("Render captures all stdout/stderr …") is accurate. Append after it:

```markdown
Log retention is **7 days** on the free tier and **14 days** on Starter and above. For log streaming to external providers (Datadog, Better Stack, Papertrail), configure a log drain from the service **Settings** tab.
```

- [ ] **Step 5: Verify all markers removed**

```bash
grep -n "VERIFY" docs/DEPLOYMENT.md
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add docs/DEPLOYMENT.md
git commit -m "docs: resolve DEPLOYMENT.md VERIFY markers; fix Events tab + button label"
```

---

## Self-Review

**Spec coverage:** Three changes (CI lint, CONFIGURATION.md, DEPLOYMENT.md) — all covered by Tasks 1–3. ✓

**Placeholder scan:** No TBD, TODO, or vague instructions present. ✓

**Type consistency:** Markdown edits only — no type/API surface. ✓

**Specialist annotations:** All three tasks have domain, lead expertise, review focus, and model filled. ✓

**Factual corrections flagged:** Two doc corrections (button label, tab name) are explicitly called out and sourced in the research summary. ✓
