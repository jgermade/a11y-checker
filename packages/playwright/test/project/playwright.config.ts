import { defineConfig } from '@playwright/test';
import { E2E_BROWSERS } from '../../../../test-browsers.js';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  reporter: [['json']],
  // Keep run artifacts out of the source tree.
  outputDir: '../../node_modules/.cache/a11y-playwright-test-results',
  // One project per browser (narrow with A11Y_CHECKER_BROWSERS).
  projects: E2E_BROWSERS.map((browserName) => ({ name: browserName, use: { browserName } })),
});
