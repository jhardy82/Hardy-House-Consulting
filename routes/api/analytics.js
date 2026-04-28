import { Router } from 'express';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = join(__dirname, '..', '..', 'tasks', 'tasks.db');

const VALID_SECTIONS = ['home','oracle','dashboard','geometry','decomposition','variants','tree','yantra','grow','presentation','contact'];

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

router.post('/pageview', (req, res) => {
  const { section } = req.body || {};
  if (!VALID_SECTIONS.includes(section))
    return res.status(400).json({ error: 'Invalid section' });
  let db;
  try {
    db = new Database(DB_PATH);
    db.prepare('INSERT INTO section_visits (section) VALUES (?)').run(section);
  } catch (err) {
    console.error('[analytics] pageview write failed:', err.message);
  } finally {
    db?.close();
  }
  res.json({ ok: true });
});

router.get('/pageviews', (_req, res) => {
  let db;
  try {
    db = new Database(DB_PATH, { readonly: true });
    const rows = db.prepare(
      'SELECT section, COUNT(*) as count FROM section_visits GROUP BY section'
    ).all();
    const counts = {};
    for (const s of VALID_SECTIONS) counts[s] = 0;
    for (const row of rows) {
      if (row.section in counts) counts[row.section] = row.count;
    }
    counts.total = Object.values(counts).reduce((a, b) => a + b, 0);
    res.json(counts);
  } catch (err) {
    console.error('[analytics] pageviews read failed:', err?.message);
    const fallback = {};
    for (const s of VALID_SECTIONS) fallback[s] = 0;
    fallback.total = 0;
    res.json(fallback);
  } finally {
    db?.close();
  }
});

export default router;
