import express from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import request from 'supertest';

// Use max:3 so we only need 4 requests to trigger the limit in tests.
const limiter = rateLimit({ windowMs: 60_000, max: 3, standardHeaders: true, legacyHeaders: false });

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: true, cookie: { secure: false } }));
app.use('/api/test', limiter);

// Simple test route that just returns 200 without writing to database
app.post('/api/test', (req, res) => {
  res.json({ ok: true });
});

describe('Rate limiting middleware', () => {
  test('first 3 requests succeed', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await request(app).post('/api/test').send({});
      expect(res.status).toBe(200);
    }
  });

  test('4th request in same window returns 429', async () => {
    const results = [];
    for (let i = 0; i < 4; i++) {
      const res = await request(app).post('/api/test').send({});
      results.push(res.status);
    }
    expect(results).toContain(429);
  });

  test('rate limit includes standard headers (no legacy headers)', async () => {
    const res = await request(app).post('/api/test').send({});
    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['ratelimit-remaining']).toBeDefined();
    expect(res.headers['ratelimit-reset']).toBeDefined();
    expect(res.headers['x-ratelimit-limit']).toBeUndefined();
  });
});
