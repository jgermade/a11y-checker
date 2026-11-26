import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  reporter: [['json']],
  // Keep run artifacts out of the source tree.
  outputDir: '../../node_modules/.cache/a11y-playwright-test-results',
  use: { browserName: 'chromium' },
});
