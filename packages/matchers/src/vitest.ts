// Setup file for Vitest: `setupFiles: ['@a11y-checker/matchers/vitest']`.
import type { Impact } from '@a11y-checker/sdk';
import { expect } from 'vitest';
import { a11yMatchers, type A11yMatcherOptions } from './matchers.js';

expect.extend(a11yMatchers);

interface A11yAssertions {
  /** Checks an element or document for accessibility violations. */
  toBeAccessible(options?: A11yMatcherOptions): Promise<void>;
  /** Asserts that the result of `check()` has no violations. */
  toHaveNoViolations(options?: { failOn?: Impact }): void;
}

/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars --
   the declaration must repeat Vitest's own type parameters (Vitest 5) to merge. */
declare module 'vitest' {
  interface Matchers<
    R extends void | Promise<void> = void | Promise<void>,
    T = unknown,
  > extends A11yAssertions {}
}
/* eslint-enable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars */

export type { A11yMatcherOptions };
