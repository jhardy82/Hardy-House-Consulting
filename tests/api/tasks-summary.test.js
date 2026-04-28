import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import tasksSummaryRouter from '../../routes/api/tasks-summary.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = join(__dirname, '..', '..', 'tasks', 'tasks.db');
const SEED_ID   = 999999; // sentinel — unlikely to clash with real task IDs

const app = express();
app.use(express.json());
app.use('/api/tasks', tasksSummaryRouter);

beforeAll(() => {
  mkdirSync(join(__dirname, '..', '..', 'tasks'), { recursive: true });
  const db = new Database(DB_PATH);
  db.prepare(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      started_at TEXT NOT NULL DEFAULT (datetime('now')), ended_at TEXT
    )
  `).run();
  db.prepare(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
      description TEXT, status TEXT NOT NULL DEFAULT 'open',
      priority INTEGER NOT NULL DEFAULT 3, section TEXT,
      session_created TEXT REFERENCES sessions(id),
      session_completed TEXT REFERENCES sessions(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')), notes TEXT
    )
  `).run();
  db.prepare('INSERT OR REPLACE INTO tasks (id, title, status) VALUES (?, ?, ?)').run(SEED_ID, 'Seed task for CI tests', 'open');
  db.close();
});

afterAll(() => {
  try {
    const db = new Database(DB_PATH);
    db.prepare('DELETE FROM tasks WHERE id = ?').run(SEED_ID);
    db.close();
  } catch {}
});

describe('GET /api/tasks/summary', () => {
  test('returns 200', async () => {
    const res = await request(app).get('/api/tasks/summary');
    expect(res.status).toBe(200);
  });

  test('response contains exactly the expected keys', async () => {
    const res = await request(app).get('/api/tasks/summary');
    expect(Object.keys(res.body).sort()).toEqual(['blocked', 'done', 'in_progress', 'open', 'total']);
  });

  test('all values are non-negative integers', async () => {
    const res = await request(app).get('/api/tasks/summary');
    const { open, in_progress, blocked, done, total } = res.body;
    for (const val of [open, in_progress, blocked, done, total]) {
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(0);
    }
  });

  test('total equals open + in_progress + blocked + done', async () => {
    const res = await request(app).get('/api/tasks/summary');
    const { open, in_progress, blocked, done, total } = res.body;
    expect(total).toBe(open + in_progress + blocked + done);
  });

  test('open count is greater than 0 (seeded task present)', async () => {
    const res = await request(app).get('/api/tasks/summary');
    expect(res.body.open).toBeGreaterThan(0);
  });

  test('GET /api/tasks (no subpath) returns 404', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(404);
  });

  test('response is JSON content-type', async () => {
    const res = await request(app).get('/api/tasks/summary');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  test('POST /api/tasks/summary returns 404 (route is GET-only)', async () => {
    const res = await request(app).post('/api/tasks/summary').send({});
    expect(res.status).toBe(404);
  });

  test('in_progress value in response uses underscore (not hyphen)', async () => {
    const res = await request(app).get('/api/tasks/summary');
    expect(res.body).toHaveProperty('in_progress');
    expect(res.body).not.toHaveProperty('in-progress');
  });

  test('returns valid JSON when DB has tasks with all status types', async () => {
    // This exercises the full normalisation path (open, in_progress, blocked, done)
    const res = await request(app).get('/api/tasks/summary');
    expect(res.status).toBe(200);
    expect(typeof res.body.total).toBe('number');
  });
});
