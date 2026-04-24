-- Hardy House Task Manager — Schema
-- Reference only. tables are initialized inline in cli.js.
-- Run `node tasks/cli.js reset-schema` to drop and recreate.

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active',
  started_at  TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at    TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  title             TEXT NOT NULL,
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'open',
  priority          INTEGER NOT NULL DEFAULT 3,
  section           TEXT,
  session_created   TEXT REFERENCES sessions(id),
  session_completed TEXT REFERENCES sessions(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  notes             TEXT
);

-- status values: open | in_progress | done | blocked
-- priority values: 1=critical | 2=high | 3=medium | 4=low
