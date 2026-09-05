import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  webServer: {
    command: 'npm run predev && node ../../scripts/testing/astro-dev.mjs',
    url: 'http://localhost:4323',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: { baseURL: 'http://localhost:4323' },
});
