import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '../../tasks/cli.js');
const run = (args) => spawnSync('node', [CLI, ...args], { encoding: 'utf8' });

describe('CLI: add command --priority validation', () => {
  test('rejects float --priority (1.9) with exit code 1', () => {
    const r = run(['add', 'Test task', '--priority', '1.9']);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/integer/i);
  });

  test('rejects out-of-range --priority (5) with exit code 1', () => {
    const r = run(['add', 'Test task', '--priority', '5']);
    expect(r.status).toBe(1);
  });

  test('rejects non-numeric --priority (abc) with exit code 1', () => {
    const r = run(['add', 'Test task', '--priority', 'abc']);
    expect(r.status).toBe(1);
  });
});

describe('CLI: no-args help', () => {
  test('prints help text and exits 0', () => {
    const r = run([]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Hardy House Task Manager/i);
  });
});

describe('CLI: exit codes — happy paths and unknown commands', () => {
  test('exit code 0: list command succeeds', () => {
    const r = run(['list']);
    expect(r.status).toBe(0);
  });

  test('exit code 0: add command succeeds with valid title', () => {
    const r = run(['add', 'Exit-code regression test task']);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/added/i);
  });

  test('exit code 1: unknown command fails with non-zero status', () => {
    const r = run(['nonexistent-command']);
    expect(r.status).toBe(1);
  });
});
