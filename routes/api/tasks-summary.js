import { Router } from 'express';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = join(__dirname, '..', '..', 'tasks', 'tasks.db');

const router = Router();

router.get('/summary', (_req, res) => {
  let db;
  try {
    db = new Database(DB_PATH, { readonly: true });
    const rows = db.prepare(
      'SELECT status, COUNT(*) as count FROM tasks GROUP BY status'
    ).all();

    const counts = { open: 0, in_progress: 0, blocked: 0, done: 0 };
    for (const row of rows) {
      const key = row.status === 'in-progress' ? 'in_progress' : row.status;
      if (key in counts) counts[key] = row.count;
    }
    counts.total = counts.open + counts.in_progress + counts.blocked + counts.done;

    res.json(counts);
  } catch {
    res.json({ open: 0, in_progress: 0, blocked: 0, done: 0, total: 0 });
  } finally {
    db?.close();
  }
});

export default router;
