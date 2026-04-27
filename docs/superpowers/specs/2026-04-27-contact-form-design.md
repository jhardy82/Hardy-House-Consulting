# Contact Form Email Delivery — Design Spec

**Date:** 2026-04-27  
**Status:** Approved  
**Fleet:** 22

---

## Goal

Replace the read-only "Get in touch" panel in `#contact` with a functional contact form. Visitors fill name, email, and message; the server calls Resend's API; James receives an email at `james@hardyhouseconsulting.com` with reply-to set to the visitor's address.

---

## Architecture

Three units with clean boundaries:

| Unit | File | Responsibility |
|---|---|---|
| API route | `routes/api/contact.js` | Validate input, call Resend, return `{ ok: true }` or `{ error }` |
| Front-end | `public/js/sections/contact.js` | Render form, handle submit, render success/error state |
| Server wiring | `server.js` | Mount contact router under `/api/`, apply rate limiter |

Data flow:

```
Visitor submits form
  → fetch POST /api/contact { name, email, message }
  → server validates (length, email regex)
  → Resend SDK sends email to james@hardyhouseconsulting.com
      reply-to: visitor's email
      subject: "Hardy House — message from {name}"
      body: plain text with name, email, message
  → 200 { ok: true } → front-end shows success state
  → 400 { error } (validation) → front-end shows inline error
  → 500 { error } (Resend failure) → front-end shows fallback message
```

---

## API Route — `routes/api/contact.js`

**Endpoint:** `POST /api/contact`

**Request body:**
```json
{ "name": "string", "email": "string", "message": "string" }
```

**Validation (server-side):**
- `name`: required, string, ≤ 100 chars
- `email`: required, matches `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- `message`: required, string, 1–2000 chars

Returns `400 { error: "..." }` on validation failure.

**Resend integration:**
- Uses the `resend` npm package (`import { Resend } from 'resend'`)
- `RESEND_API_KEY` env var — if absent, route returns 503 in production, skips send in test
- From: `Hardy House Consulting <onboarding@resend.dev>` initially (Resend's default sender, works immediately). To use `noreply@hardyhouseconsulting.com`, the domain must be verified in the Resend dashboard — leave that as a post-launch step.
- To: `james@hardyhouseconsulting.com`
- Reply-To: visitor's `email`
- Subject: `Hardy House — message from {name}`
- Text body:
  ```
  Name: {name}
  Email: {email}

  {message}
  ```

Returns `200 { ok: true }` on success, `500 { error: "Delivery failed" }` on Resend error.

**Rate limiting:**
- Separate limiter: 3 requests per 10 minutes per IP
- 429 response with `{ error: "Too many requests — try again later" }`
- Applied in `server.js` before mounting the contact router

---

## Front-end — `contact.js`

The existing `#contactPanel` is replaced by the form. The "tap to copy email" behavior moves to a small mailto link below the form (fallback path preserved).

**Form fields:**

| Field | Element | Attributes |
|---|---|---|
| Name | `<input type="text">` | `id="contactFormName"`, `required`, `maxlength="100"`, `placeholder="Your name"` |
| Email | `<input type="email">` | `id="contactFormEmail"`, `required`, `placeholder="your@email.com"` |
| Message | `<textarea>` | `id="contactFormMsg"`, `required`, `maxlength="2000"`, `rows="4"`, `placeholder="What's on your mind?"` |
| Submit | `<button type="submit">` | `id="contactFormSubmit"`, text "Send message" |

**Submit flow:**
1. Prevent default
2. Set button text to "Sending…" + `disabled`
3. `fetch('POST /api/contact', { name, email, message })`
4. On `{ ok: true }`: replace form HTML with success message `"Message sent — I'll be in touch soon."`
5. On `{ error }` or network failure: show inline error `<div id="contactFormError">` below submit button; re-enable button; form stays intact for retry
6. Special case for rate-limit (429): show `"Too many requests — please wait a few minutes."`

**Fallback link:**
Below the form, a small line: `Or email me directly: <a href="mailto:james@hardyhouseconsulting.com">james@hardyhouseconsulting.com</a>`

---

## CSS additions — `contact.css`

Additions to `public/css/sections/contact.css`:

- `#contactForm` — flex column, gap 0.75rem
- `#contactForm input, #contactForm textarea` — match existing token-driven dark input style (`--hh-void` bg, `--hh-fg-2` text, `--accent` focus ring, no border-radius beyond 4px)
- `#contactForm textarea` — `resize: vertical; min-height: 80px`
- `#contactFormSubmit` — uses `.btn-primary` tokens already in `base.css`; `width: 100%`
- `#contactFormSubmit[disabled]` — reduced opacity
- `#contactFormError` — `color: #e07070; font-size: 0.85rem; margin-top: 0.25rem`
- `.contact-mailto-fallback` — `font-size: 0.8rem; opacity: 0.6; text-align: center; margin-top: 0.5rem`

---

## Environment Variables

| Var | Purpose | Required |
|---|---|---|
| `RESEND_API_KEY` | Resend API key | Yes (production) |

In dev/test: if `RESEND_API_KEY` is absent, the route logs a warning and returns `200 { ok: true, dev: true }` without sending.

---

## Testing

**`tests/api/contact.test.js`** (new) — 5 supertest tests:
1. `POST /api/contact` with valid body → 200 `{ ok: true }` (Resend module mocked)
2. Missing `name` → 400 with error message
3. Missing `email` → 400
4. `message` > 2000 chars → 400
5. 4th request in 10 min window from same IP → 429

**`tests/e2e/sections.spec.js`** — 1 new test in the `#contact` describe block:
- Navigate to `#contact`, fill name + email + message, click send, assert success text visible

---

## File Map

| File | Action |
|---|---|
| `package.json` | Add `resend` dependency |
| `routes/api/contact.js` | **Create** — validation + Resend send + error handling |
| `server.js` | Import + wire contact router; add contact rate limiter |
| `public/js/sections/contact.js` | Modify — replace panel with form, submit handler, success/error states |
| `public/css/sections/contact.css` | Modify — form input/textarea/error/fallback styles |
| `tests/api/contact.test.js` | **Create** — 5 API tests |
| `tests/e2e/sections.spec.js` | Modify — 1 new contact form E2E test |

---

## Constraints from CLAUDE.md

- No TypeScript, no React — vanilla ES Modules
- Three.js and GSAP are globals — not relevant here
- `createRenderer` factory not relevant (no canvas)
- Rate limiting follows the existing pattern from `routes/api/element.js` + Fleet 20
- `express-rate-limit` already installed — reuse, different limiter instance
- `"type": "module"` in package.json — all imports use ESM syntax
