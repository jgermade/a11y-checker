// The browsers the e2e tests run in. Shared by the packages' *.e2e.test.ts files.
import { chromium, firefox, webkit } from 'playwright';

export const BROWSER_TYPES = { chromium, firefox, webkit } as const;
export type BrowserName = keyof typeof BROWSER_TYPES;

const ALL = Object.keys(BROWSER_TYPES) as BrowserName[];

/**
 * All three browsers by default. `A11Y_CHECKER_BROWSERS=chromium,firefox` narrows the
 * list, for example when only some browsers are installed locally.
 */
export const E2E_BROWSERS: BrowserName[] = (() => {
  const requested = process.env.A11Y_CHECKER_BROWSERS?.split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  if (!requested?.length) return ALL;
  const unknown = requested.filter((name) => !ALL.includes(name as BrowserName));
  if (unknown.length > 0) {
    throw new Error(`A11Y_CHECKER_BROWSERS: unknown browser(s) ${unknown.join(', ')}`);
  }
  return requested as BrowserName[];
})();
