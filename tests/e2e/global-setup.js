import { spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '../../tasks/cli.js');

/**
 * Runs before webServer starts.
 * Invokes cli.js with no args — triggers CREATE TABLE IF NOT EXISTS,
 * then exits 0 — ensuring tasks.db tables exist before the server boots.
 */
export default async function globalSetup() {
  spawnSync('node', [CLI], { encoding: 'utf8' });
}
