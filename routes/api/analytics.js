import { Router } from 'express';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = join(__dirname, '..', '..', 'tasks', 'tasks.db');

const router = Router();

router.get('/elements', (_req, res) => {
  let db;
  try {
    db = new Database(DB_PATH, { readonly: true });
    const rows = db.prepare(
      'SELECT element, COUNT(*) as count FROM element_assignments GROUP BY element'
    ).all();
    const counts = { fire: 0, earth: 0, air: 0, water: 0, aether: 0 };
    for (const row of rows) {
      if (row.element in counts) counts[row.element] = row.count;
    }
    counts.total = Object.values(counts).reduce((a, b) => a + b, 0);
    res.json(counts);
  } catch (err) {
    console.error('[analytics] elements read failed:', err?.message);
    res.json({ fire: 0, earth: 0, air: 0, water: 0, aether: 0, total: 0 });
  } finally {
    db?.close();
  }
});

export default router;
