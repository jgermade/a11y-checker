import type { CheckResult, Impact } from '@a11y-checker/core';
import { formatIssues, toHTML, toJSON, violationsAtLeast } from '@a11y-checker/sdk/reporters';
import { checkA11y, type PlaywrightCheckOptions } from './check.js';
import type { LocatorLike, PageLike } from './types.js';

export interface ToBeAccessibleOptions extends PlaywrightCheckOptions {
  /**
   * Lowest impact that fails the assertion. Default: `'minor'`, so every violation
   * fails. Violations without an impact always fail.
   */
  failOn?: Impact;
  /** Attach the HTML and JSON reports to the running test. Default: `true`. */
  attach?: boolean;
}

interface TestInfoLike {
  attach(name: string, options: { body: string; contentType: string }): Promise<void>;
}

/**
 * Attaches a result to a Playwright test as an HTML report and as JSON. Outside a
 * running test, or without `@playwright/test`, it does nothing.
 */
export async function attachA11yReport(
  result: CheckResult,
  testInfo?: TestInfoLike,
): Promise<void> {
  let info = testInfo;
  if (!info) {
    try {
      const { test } = (await import('@playwright/test')) as {
        test: { info(): TestInfoLike };
      };
      info = test.info();
    } catch {
      return;
    }
  }
  await info.attach('accessibility-report.html', {
    body: toHTML(result),
    contentType: 'text/html',
  });
  await info.attach('accessibility-report.json', {
    body: toJSON(result),
    contentType: 'application/json',
  });
}

/**
 * Playwright matchers. Add them with `expect.extend(a11yMatchers)`.
 *
 * @example
 * import { expect as base } from '@playwright/test';
 * import { a11yMatchers } from '@a11y-checker/playwright';
 * export const expect = base.extend(a11yMatchers);
 *
 * await expect(page).toBeAccessible();
 * await expect(page.getByRole('dialog')).toBeAccessible({ failOn: 'serious' });
 */
export const a11yMatchers = {
  async toBeAccessible(
    this: { isNot?: boolean },
    received: PageLike | LocatorLike,
    options: ToBeAccessibleOptions = {},
  ) {
    const { failOn = 'minor', attach = true, ...checkOptions } = options;
    const result = await checkA11y(received, { outcomes: ['violation'], ...checkOptions });
    if (attach) await attachA11yReport(result);

    const failing = violationsAtLeast(result, failOn);
    const threshold = failOn === 'minor' ? '' : ` with impact ${failOn} or higher`;
    const unchecked = result.frames.total - result.frames.checked;
    const note = unchecked > 0 ? `\n\n(${unchecked} frame(s) could not be checked.)` : '';
    return {
      name: 'toBeAccessible',
      pass: failing.length === 0,
      message: () =>
        (failing.length === 0
          ? `Expected accessibility violations${threshold}, but none were found.`
          : `Expected no accessibility violations${threshold}, but found ${failing.length}:\n\n${formatIssues(failing)}`) +
        note,
    };
  },
};
