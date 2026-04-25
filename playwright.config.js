import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  globalSetup: './tests/e2e/global-setup.js',
  webServer: {
    command: 'node server.js',
    url: 'http://localhost:3000/tasks/api',
    reuseExistingServer: !process.env.CI,
    env: { SESSION_SECRET: process.env.SESSION_SECRET || 'e2e-test-secret' },
  },
  use: { baseURL: 'http://localhost:3000' },
});
