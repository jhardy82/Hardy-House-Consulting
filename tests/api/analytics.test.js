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
  app.use('/api/analytics', analyticsRouter);
});

afterAll(() => {
  const db = new Database(DB_PATH);
  db.prepare("DELETE FROM element_assignments WHERE assigned_at >= datetime('now', '-1 minute')").run();
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
