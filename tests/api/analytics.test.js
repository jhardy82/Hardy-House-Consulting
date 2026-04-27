import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import tasks router — this runs schema creation so element_assignments exists before tests run.
import '../../routes/tasks.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = join(__dirname, '..', '..', 'tasks', 'tasks.db');

let analyticsRouter;
let app;

beforeAll(async () => {
  // Insert fixture rows directly
  const db = new Database(DB_PATH);
  db.prepare("INSERT INTO element_assignments (element) VALUES (?)").run('fire');
  db.prepare("INSERT INTO element_assignments (element) VALUES (?)").run('fire');
  db.prepare("INSERT INTO element_assignments (element) VALUES (?)").run('water');
  db.close();

  analyticsRouter = (await import('../../routes/api/analytics.js')).default;
  app = express();
  app.use(express.json());
  app.use('/api/analytics', analyticsRouter);
});

afterAll(() => {
  const db = new Database(DB_PATH);
  db.prepare("DELETE FROM element_assignments WHERE assigned_at >= datetime('now', '-1 minute')").run();
  db.prepare("DELETE FROM section_visits WHERE visited_at >= datetime('now', '-1 minute')").run();
  db.close();
});

describe('GET /api/analytics/elements', () => {
  test('returns 200 with all five element keys', async () => {
    const res = await request(app).get('/api/analytics/elements');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('fire');
    expect(res.body).toHaveProperty('earth');
    expect(res.body).toHaveProperty('air');
    expect(res.body).toHaveProperty('water');
    expect(res.body).toHaveProperty('aether');
    expect(res.body).toHaveProperty('total');
  });

  test('fire count reflects inserted fixtures', async () => {
    const res = await request(app).get('/api/analytics/elements');
    expect(res.body.fire).toBeGreaterThanOrEqual(2);
  });

  test('total equals sum of all element counts', async () => {
    const res = await request(app).get('/api/analytics/elements');
    const { fire, earth, air, water, aether, total } = res.body;
    expect(total).toBe(fire + earth + air + water + aether);
  });
});

describe('POST /api/analytics/pageview', () => {
  test('valid section returns 200 with ok:true', async () => {
    const res = await request(app)
      .post('/api/analytics/pageview')
      .send({ section: 'home' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test('invalid section returns 400', async () => {
    const res = await request(app)
      .post('/api/analytics/pageview')
      .send({ section: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('missing section field returns 400', async () => {
    const res = await request(app)
      .post('/api/analytics/pageview')
      .send({});
    expect(res.status).toBe(400);
  });

  test('all 11 valid sections are accepted', async () => {
    const sections = ['home','oracle','dashboard','geometry','decomposition',
      'variants','tree','yantra','grow','presentation','contact'];
    for (const section of sections) {
      const res = await request(app)
        .post('/api/analytics/pageview')
        .send({ section });
      expect(res.status).toBe(200);
    }
  });
});

describe('GET /api/analytics/pageviews', () => {
  test('returns 200 with all 11 section keys plus total', async () => {
    const res = await request(app).get('/api/analytics/pageviews');
    expect(res.status).toBe(200);
    for (const s of ['home','oracle','dashboard','geometry','decomposition',
      'variants','tree','yantra','grow','presentation','contact','total']) {
      expect(res.body).toHaveProperty(s);
    }
  });

  test('all values are non-negative integers', async () => {
    const res = await request(app).get('/api/analytics/pageviews');
    for (const val of Object.values(res.body)) {
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(0);
    }
  });

  test('home count reflects POST fixture from this suite', async () => {
    const before = (await request(app).get('/api/analytics/pageviews')).body.home;
    await request(app).post('/api/analytics/pageview').send({ section: 'home' });
    const after  = (await request(app).get('/api/analytics/pageviews')).body.home;
    expect(after).toBe(before + 1);
  });

  test('total equals sum of all section counts', async () => {
    const res = await request(app).get('/api/analytics/pageviews');
    const sections = ['home','oracle','dashboard','geometry','decomposition',
      'variants','tree','yantra','grow','presentation','contact'];
    const sum = sections.reduce((acc, s) => acc + res.body[s], 0);
    expect(res.body.total).toBe(sum);
  });
});
