import express from 'express';
import request from 'supertest';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import tasksRouter from '../../routes/tasks.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '../../tasks/cli.js');

const app = express();
app.use(express.json());
app.use('/tasks', tasksRouter);

beforeAll(() => {
  // Ensure tasks.db exists and tables are created — cli.js runs CREATE TABLE IF NOT EXISTS
  // on every invocation, so a no-args call (prints help, exits 0) is sufficient.
  spawnSync('node', [CLI], { encoding: 'utf8' });
});

describe('GET /tasks', () => {
  test('returns 200 HTML containing the page title', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/html/);
    expect(res.text).toMatch(/Hardy House/);
  });

  test('HTML response includes the four Kanban column headings', async () => {
    const res = await request(app).get('/tasks');
    expect(res.text).toMatch(/Open/);
    expect(res.text).toMatch(/In Progress/);
    expect(res.text).toMatch(/Blocked/);
    expect(res.text).toMatch(/Done/);
  });
});

describe('GET /tasks/api', () => {
  test('returns 200 JSON', async () => {
    const res = await request(app).get('/tasks/api');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/json/);
  });

  test('JSON body has session key (null when no active session)', async () => {
    const res = await request(app).get('/tasks/api');
    expect(res.body).toHaveProperty('session');
  });

  test('JSON body has tasks object with all four status buckets', async () => {
    const res = await request(app).get('/tasks/api');
    expect(res.body).toHaveProperty('tasks');
    expect(res.body.tasks).toHaveProperty('open');
    expect(res.body.tasks).toHaveProperty('in_progress');
    expect(res.body.tasks).toHaveProperty('blocked');
    expect(res.body.tasks).toHaveProperty('done');
  });

  test('tasks arrays are arrays', async () => {
    const res = await request(app).get('/tasks/api');
    const { tasks } = res.body;
    expect(Array.isArray(tasks.open)).toBe(true);
    expect(Array.isArray(tasks.in_progress)).toBe(true);
    expect(Array.isArray(tasks.blocked)).toBe(true);
    expect(Array.isArray(tasks.done)).toBe(true);
  });
});
