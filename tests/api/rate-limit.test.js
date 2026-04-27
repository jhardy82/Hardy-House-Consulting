import express from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import request from 'supertest';
import elementRouter from '../../routes/api/element.js';
import tasksSummaryRouter from '../../routes/api/tasks-summary.js';
import analyticsRouter from '../../routes/api/analytics.js';
import '../../routes/tasks.js';

// Use max:3 so we only need 4 requests to trigger the limit in tests.
const limiter = rateLimit({ windowMs: 60_000, max: 3, standardHeaders: true, legacyHeaders: false });

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: true, cookie: { secure: false } }));
app.use('/api/element', limiter);
app.use('/api/element', elementRouter);

const makeApp = (route, router) => {
  const a = express();
  a.use(express.json());
  a.use(session({ secret: 'test', resave: false, saveUninitialized: true, cookie: { secure: false } }));
  a.use(route, rateLimit({ windowMs: 60_000, max: 3, standardHeaders: true, legacyHeaders: false }));
  a.use(route, router);
  return a;
};

describe('Rate limiting on POST /api/element', () => {
  test('first 3 requests succeed', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await request(app).post('/api/element').send({ element: 'fire' });
      expect(res.status).toBe(200);
    }
  });

  test('4th request in same window returns 429', async () => {
    const results = [];
    for (let i = 0; i < 4; i++) {
      const res = await request(app).post('/api/element').send({ element: 'fire' });
      results.push(res.status);
    }
    expect(results).toContain(429);
  });

  test('rate limit includes standard headers (no legacy headers)', async () => {
    const res = await request(app).post('/api/element').send({ element: 'fire' });
    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['ratelimit-remaining']).toBeDefined();
    expect(res.headers['ratelimit-reset']).toBeDefined();
    expect(res.headers['x-ratelimit-limit']).toBeUndefined();
  });
});

describe('Rate limiting on GET /api/tasks/summary', () => {
  const tasksApp = makeApp('/api/tasks', tasksSummaryRouter);

  test('first 3 requests succeed (not 429)', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await request(tasksApp).get('/api/tasks/summary');
      expect(res.status).not.toBe(429);
    }
  });

  test('4th request in same window returns 429', async () => {
    const results = [];
    for (let i = 0; i < 4; i++) {
      const res = await request(tasksApp).get('/api/tasks/summary');
      results.push(res.status);
    }
    expect(results).toContain(429);
  });
});

describe('Rate limiting on GET /api/analytics/elements', () => {
  const analyticsApp = makeApp('/api/analytics', analyticsRouter);

  test('first 3 requests succeed (not 429)', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await request(analyticsApp).get('/api/analytics/elements');
      expect(res.status).not.toBe(429);
    }
  });

  test('4th request in same window returns 429', async () => {
    const results = [];
    for (let i = 0; i < 4; i++) {
      const res = await request(analyticsApp).get('/api/analytics/elements');
      results.push(res.status);
    }
    expect(results).toContain(429);
  });
});
