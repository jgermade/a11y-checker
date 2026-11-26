// Setup file for Jest: `setupFilesAfterEnv: ['@a11y-checker/matchers/jest']`.
import type { Impact } from '@a11y-checker/sdk';
import { a11yMatchers, type A11yMatcherOptions } from './matchers.js';

declare const expect: { extend(matchers: object): void };
expect.extend(a11yMatchers);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      /** Checks an element or document for accessibility violations. */
      toBeAccessible(options?: A11yMatcherOptions): Promise<R>;
      /** Asserts that the result of `check()` has no violations. */
      toHaveNoViolations(options?: { failOn?: Impact }): R;
    }
  }
}

export type { A11yMatcherOptions };
