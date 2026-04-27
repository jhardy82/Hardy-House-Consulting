# Contact Form Email Delivery — Fleet 22 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the read-only `#contactPanel` with a functional contact form that sends email via Resend's API; James receives messages at `james@hardyhouseconsulting.com` with reply-to set to the visitor.

**Architecture:** Three units: API route (`routes/api/contact.js`) handles validation and Resend send; front-end (`public/js/sections/contact.js`) renders the form, submit handler, and success/error states; server wiring (`server.js`) mounts the router under `/api/contact` with a dedicated rate limiter.

**Tech Stack:** Vanilla ES Modules · `resend` npm package · `express-rate-limit` (already installed) · Jest + supertest · Playwright

---

## File structure

| File | Action |
|---|---|
| `package.json` | Add `resend` dependency via `npm install resend` |
| `routes/api/contact.js` | **Create** — input validation, Resend send, dev-mode bypass |
| `server.js` | Import contact router; add dedicated rate limiter before mount |
| `tests/api/contact.test.js` | **Create** — 5 supertest tests (valid, missing name, missing email, long message, 429) |
| `public/js/sections/contact.js` | Modify — replace `#contactPanel` with form, submit handler, success/error states |
| `public/css/sections/contact.css` | Modify — form, input, textarea, error, fallback-link styles |
| `tests/e2e/sections.spec.js` | Modify — update 2 now-broken contact tests; add 2 new form tests (render + submit) |

---

### Task 1: API route (TDD)

**Files:**
- Create: `routes/api/contact.js`
- Modify: `server.js`
- Modify: `package.json`
- Create: `tests/api/contact.test.js`

**Specialists:**
- Domain: api-endpoint
- Lead expertise: Express ESM route authoring with external SDK integration and input validation
- Review focus: validation completeness (all three fields), dev-mode bypass correctness (absent key returns 200 not 503), rate-limiter state isolation between test describe blocks
- Model: Haiku triad

- [ ] **Step 1: Write the failing tests in `tests/api/contact.test.js`**

Create `tests/api/contact.test.js` with this exact content:

```js
import express from 'express';
import request from 'supertest';
import rateLimit from 'express-rate-limit';
import contactRouter from '../../routes/api/contact.js';

// App without rate limiter — used by tests 1-4
const app = express();
app.use(express.json());
app.use('/api/contact', contactRouter);

// App with rate limiter — separate instance so tests 1-4 don't drain the limit
const rateLimitedApp = express();
rateLimitedApp.use(express.json());
rateLimitedApp.use('/api/contact', rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: 'Too many requests — try again later' }),
}));
rateLimitedApp.use('/api/contact', contactRouter);

describe('POST /api/contact', () => {
  test('valid body → 200 { ok: true }', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ name: 'Alice', email: 'alice@example.com', message: 'Hello there' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('missing name → 400 with error', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ email: 'alice@example.com', message: 'Hello' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('missing email → 400 with error', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ name: 'Alice', message: 'Hello' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('message > 2000 chars → 400 with error', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ name: 'Alice', email: 'alice@example.com', message: 'x'.repeat(2001) });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('POST /api/contact — rate limiting', () => {
  test('4th request in window → 429', async () => {
    for (let i = 0; i < 3; i++) {
      await request(rateLimitedApp)
        .post('/api/contact')
        .send({ name: 'Bob', email: 'bob@example.com', message: 'Test' });
    }
    const res = await request(rateLimitedApp)
      .post('/api/contact')
      .send({ name: 'Bob', email: 'bob@example.com', message: 'Test' });
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/Too many requests/);
  });
});
```

- [ ] **Step 2: Run to confirm 5 failures**

```bash
node --experimental-vm-modules node_modules/.bin/jest tests/api/contact.test.js --no-coverage
```

Expected: 5 failures — `Cannot find module '../../routes/api/contact.js'`

- [ ] **Step 3: Install `resend`**

```bash
npm install resend
```

Expected: `resend` appears in `dependencies` in `package.json`.

- [ ] **Step 4: Create `routes/api/contact.js`**

```js
import { Router } from 'express';
import { Resend } from 'resend';

const router = Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/', async (req, res) => {
  const { name, email, message } = req.body ?? {};

  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 100)
    return res.status(400).json({ error: 'Name is required and must be 100 characters or fewer' });

  if (!email || !EMAIL_REGEX.test(email))
    return res.status(400).json({ error: 'A valid email address is required' });

  if (!message || typeof message !== 'string' || message.trim().length === 0 || message.length > 2000)
    return res.status(400).json({ error: 'Message is required and must be 2000 characters or fewer' });

  if (!process.env.RESEND_API_KEY) {
    console.warn('[contact] RESEND_API_KEY not set — skipping send in dev/test');
    return res.json({ ok: true, dev: true });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Hardy House Consulting <onboarding@resend.dev>',
      to: 'james@hardyhouseconsulting.com',
      replyTo: email,
      subject: `Hardy House — message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[contact] Resend error:', err.message);
    res.status(500).json({ error: 'Delivery failed' });
  }
});

export default router;
```

- [ ] **Step 5: Wire contact router in `server.js`**

Add this import at line 14, after the `analyticsRouter` import line:

```js
import contactRouter    from './routes/api/contact.js';
```

Add these two lines after `app.use('/api/analytics', analyticsRouter)` (line 65), before `app.use('/tasks', tasksRouter)`:

```js
app.use('/api/contact', rateLimit({ windowMs: 10 * 60 * 1000, max: 3, standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV !== 'production', handler: (_req, res) => res.status(429).json({ error: 'Too many requests — try again later' }) }));
app.use('/api/contact',    contactRouter);
```

- [ ] **Step 6: Run the 5 tests to confirm all pass**

```bash
node --experimental-vm-modules node_modules/.bin/jest tests/api/contact.test.js --no-coverage
```

Expected: 5 passing. `RESEND_API_KEY` is absent in dev so valid requests return `{ ok: true, dev: true }`.

- [ ] **Step 7: Run the full Jest suite to confirm no regressions**

```bash
npm test
```

Expected: 97 tests passing, 0 failures.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json routes/api/contact.js server.js tests/api/contact.test.js
git commit -m "feat(contact): add API route, Resend integration, rate limiter, and API tests"
```

---

### Task 2: Front-end form + CSS + E2E (TDD)

**Files:**
- Modify: `public/js/sections/contact.js`
- Modify: `public/css/sections/contact.css`
- Modify: `tests/e2e/sections.spec.js`

**Specialists:**
- Domain: frontend-ui
- Lead expertise: Vanilla ES Module DOM construction with safe DOM methods (no innerHTML), fetch submit handler, idempotent `init()` guard
- Review focus: no innerHTML anywhere (use textContent + safe DOM methods — project-wide invariant), idempotency on re-entry, success state replaces form HTML entirely, existing logo/name/role nodes preserved unchanged
- Model: Haiku triad

- [ ] **Step 1: Update `tests/e2e/sections.spec.js` — replace the `#contact` describe block**

The current `#contact — contact card` describe block (lines 388–406) has 3 tests. Replace the entire block with:

```js
// -- contact ------------------------------------------------------------
test.describe('#contact — contact card', () => {
  test('renders #contactContainer with name and role', async ({ page }) => {
    await goTo(page, '#contact');
    await expect(page.locator('#contactContainer')).toBeVisible();
    await expect(page.locator('#contactName')).toContainText('James');
    await expect(page.locator('#contactRole')).toContainText('Modern Workplace');
  });

  test('contact form is rendered with required fields', async ({ page }) => {
    await goTo(page, '#contact');
    await expect(page.locator('#contactForm')).toBeVisible();
    await expect(page.locator('#contactFormName')).toBeVisible();
    await expect(page.locator('#contactFormEmail')).toBeVisible();
    await expect(page.locator('#contactFormMsg')).toBeVisible();
    await expect(page.locator('#contactFormSubmit')).toBeVisible();
  });

  test('filling and submitting the form shows success message', async ({ page }) => {
    await goTo(page, '#contact');
    await page.fill('#contactFormName', 'Test User');
    await page.fill('#contactFormEmail', 'test@example.com');
    await page.fill('#contactFormMsg', 'Hello from Playwright');
    await page.locator('#contactFormSubmit').click();
    await expect(page.locator('[data-contact="success"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-contact="success"]')).toContainText('Message sent');
  });

  test('fallback mailto link is present', async ({ page }) => {
    await goTo(page, '#contact');
    await expect(page.locator('a[href="mailto:james@hardyhouseconsulting.com"]')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run contact E2E tests to confirm 3 failures**

```bash
npx playwright test tests/e2e/sections.spec.js --grep "contact"
```

Expected: test 1 PASS (name/role still render) · tests 2, 3, 4 FAIL (form not yet built).

- [ ] **Step 3: Replace `public/js/sections/contact.js` entirely**

```js
let initialised = false;

export function init() {
  if (initialised) return;
  initialised = true;

  const section = document.querySelector('[data-section="contact"]');
  if (!section) return;

  const container = document.createElement('div');
  container.id = 'contactContainer';

  // Logo area — unchanged from original
  const logoArea = document.createElement('div');
  logoArea.id = 'contactLogo';
  const symbol = document.createElement('div');
  symbol.id = 'contactSymbol';
  symbol.textContent = '◇ ◈ ◇';
  const word = document.createElement('div');
  word.id = 'contactWord';
  word.textContent = 'Hardy House Consulting';
  const divider = document.createElement('div');
  divider.id = 'contactDivider';
  logoArea.append(symbol, word, divider);

  // Centre — name and role, unchanged
  const centre = document.createElement('div');
  centre.id = 'contactCentre';
  const nameEl = document.createElement('div');
  nameEl.id = 'contactName';
  const first = document.createElement('span');
  first.textContent = 'James';
  const last = document.createElement('span');
  last.textContent = 'Hardy';
  nameEl.append(first, last);
  const role = document.createElement('div');
  role.id = 'contactRole';
  role.textContent = 'Modern Workplace · Endpoint Engineering';
  centre.append(nameEl, role);

  // Contact form — replaces the old panel
  const formWrap = document.createElement('div');
  formWrap.id = 'contactFormWrap';

  const form = document.createElement('form');
  form.id = 'contactForm';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.id = 'contactFormName';
  nameInput.required = true;
  nameInput.maxLength = 100;
  nameInput.placeholder = 'Your name';

  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.id = 'contactFormEmail';
  emailInput.required = true;
  emailInput.placeholder = 'your@email.com';

  const msgInput = document.createElement('textarea');
  msgInput.id = 'contactFormMsg';
  msgInput.required = true;
  msgInput.maxLength = 2000;
  msgInput.rows = 4;
  msgInput.placeholder = "What's on your mind?";

  const errorDiv = document.createElement('div');
  errorDiv.id = 'contactFormError';
  errorDiv.style.display = 'none';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.id = 'contactFormSubmit';
  submitBtn.textContent = 'Send message';

  form.append(nameInput, emailInput, msgInput, errorDiv, submitBtn);

  // Fallback mailto link
  const fallback = document.createElement('div');
  fallback.className = 'contact-mailto-fallback';
  const fallbackLink = document.createElement('a');
  fallbackLink.href = 'mailto:james@hardyhouseconsulting.com';
  fallbackLink.textContent = 'james@hardyhouseconsulting.com';
  fallback.append(document.createTextNode('Or email me directly: '), fallbackLink);

  formWrap.append(form, fallback);
  container.append(logoArea, centre, formWrap);
  section.appendChild(container);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.textContent = 'Sending…';
    submitBtn.disabled = true;
    errorDiv.style.display = 'none';

    const body = {
      name:    nameInput.value.trim(),
      email:   emailInput.value.trim(),
      message: msgInput.value.trim(),
    };

    try {
      const res  = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        const success = document.createElement('div');
        success.dataset.contact = 'success';
        success.textContent = "Message sent — I'll be in touch soon.";
        form.replaceWith(success);
        return;
      }

      errorDiv.textContent = res.status === 429
        ? 'Too many requests — please wait a few minutes.'
        : (data.error || 'Something went wrong — please try again.');
      errorDiv.style.display = '';
    } catch {
      errorDiv.textContent = 'Network error — please try again.';
      errorDiv.style.display = '';
    }

    submitBtn.textContent = 'Send message';
    submitBtn.disabled = false;
  });
}
```

- [ ] **Step 4: Add form styles to the end of `public/css/sections/contact.css`**

Append to `public/css/sections/contact.css`:

```css
#contactFormWrap {
  flex: 0 0 auto;
  width: 100%;
  max-width: 360px;
  padding: 0 20px;
}

#contactForm {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

#contactForm input,
#contactForm textarea {
  background: var(--hh-void);
  color: var(--hh-fg-2, rgba(244, 240, 235, 0.85));
  border: 1px solid rgba(196, 154, 31, 0.18);
  border-radius: 4px;
  padding: 0.55rem 0.75rem;
  font-family: inherit;
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s;
  width: 100%;
  box-sizing: border-box;
}

#contactForm input:focus,
#contactForm textarea:focus {
  border-color: var(--accent, #C49A1F);
}

#contactForm textarea {
  resize: vertical;
  min-height: 80px;
}

#contactFormSubmit {
  width: 100%;
}

#contactFormSubmit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

#contactFormError {
  color: #e07070;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.contact-mailto-fallback {
  font-size: 0.8rem;
  opacity: 0.6;
  text-align: center;
  margin-top: 0.5rem;
}

.contact-mailto-fallback a {
  color: inherit;
  text-decoration: underline;
}

[data-contact="success"] {
  text-align: center;
  font-size: 0.9rem;
  color: rgba(244, 240, 235, 0.85);
  padding: 1rem 0;
}
```

- [ ] **Step 5: Run the contact E2E tests to confirm all 4 pass**

```bash
npx playwright test tests/e2e/sections.spec.js --grep "contact"
```

Expected: 4 passing.

- [ ] **Step 6: Run the full Playwright suite to confirm no regressions**

```bash
npx playwright test tests/e2e/sections.spec.js
```

Prior count was 49. The `#contact` block went from 3 tests to 4 (kept 1 + replaced 2 with 3).
Expected: 50 tests passing, 0 failures.

- [ ] **Step 7: Commit**

```bash
git add public/js/sections/contact.js public/css/sections/contact.css tests/e2e/sections.spec.js
git commit -m "feat(contact): replace panel with functional form, add E2E tests"
```

---

### Task 3: Full suite regression check

**Files:**
- Read-only: all test files

**Specialists:**
- Domain: testing-infra
- Lead expertise: Playwright E2E suite validation + Jest API suite validation
- Review focus: confirm baseline counts match (97 Jest, 50 Playwright), no timing flaps in form submit test
- Model: Haiku triad

- [ ] **Step 1: Run the complete Jest suite**

```bash
npm test
```

Expected: 97 tests passing, 0 failures.

- [ ] **Step 2: Run the complete Playwright suite**

```bash
npx playwright test tests/e2e/sections.spec.js
```

Expected: 50 tests passing, 0 failures.

- [ ] **Step 3: If the form submit E2E test is flappy, add a `waitFor` guard**

Only apply this change if Step 2 shows intermittent failures on the submit test. Add `{ timeout: 8000 }` to the visibility assertion in the submit test:

```js
await expect(page.locator('[data-contact="success"]')).toBeVisible({ timeout: 8000 });
```

Commit only if the guard was needed:

```bash
git add tests/e2e/sections.spec.js
git commit -m "test(e2e): stabilise timeout on contact form submit assertion"
```

---

## Verification checklist

Before declaring Fleet 22 complete:

- [ ] `npm test` → 97 tests, 0 failures
- [ ] `npx playwright test tests/e2e/sections.spec.js` → 50 tests, 0 failures
- [ ] `node tasks/cli.js list` → still works (unrelated smoke check)
- [ ] `git log --oneline -3` → 2 Fleet 22 commits visible
- [ ] Contact section: form renders with name/email/message fields (visual confirm in browser)
- [ ] Contact section: fill form → submit → success text replaces form (visual confirm in browser)
- [ ] Fallback mailto link visible below form (visual confirm in browser)

## Commit history target

```
feat(contact): replace panel with functional form, add E2E tests
feat(contact): add API route, Resend integration, rate limiter, and API tests
```

## Post-launch user action required

Before production email delivery works, James must:
1. Create a free Resend account at resend.com
2. Generate an API key
3. Add `RESEND_API_KEY=re_...` in the Render.com environment variables dashboard
4. (Optional post-launch) Verify `hardyhouseconsulting.com` domain in Resend to switch From address from `onboarding@resend.dev` to `noreply@hardyhouseconsulting.com`
