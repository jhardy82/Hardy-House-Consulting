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
