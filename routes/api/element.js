import { Router } from 'express';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = join(__dirname, '..', '..', 'tasks', 'tasks.db');

const router = Router();
const VALID = ['fire', 'earth', 'air', 'water', 'aether'];

router.get('/', (req, res) => {
  res.json({ element: req.session.element || null });
});

router.post('/', (req, res) => {
  const { element } = req.body;
  if (!VALID.includes(element))
    return res.status(400).json({ error: 'Invalid element' });
  req.session.element = element;
  let db;
  try {
    db = new Database(DB_PATH);
    db.prepare('INSERT INTO element_assignments (element) VALUES (?)').run(element);
  } catch (err) {
    console.error('[analytics] element write failed:', err.message);
  } finally {
    db?.close();
  }
  res.json({ element, ok: true });
});

export default router;
