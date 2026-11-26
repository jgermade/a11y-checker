import {
  check,
  formatIssues,
  violationsAtLeast,
  type CheckResult,
  type Impact,
  type SingleCheckOptions,
} from '@a11y-checker/sdk';

export interface A11yMatcherOptions extends Omit<SingleCheckOptions, 'element' | 'document'> {
  /**
   * Lowest impact that fails the assertion. Default: `'minor'`, so every violation
   * fails. Violations without an impact always fail.
   */
  failOn?: Impact;
}

export interface MatcherResult {
  pass: boolean;
  message: () => string;
}

function isDocument(value: unknown): value is Document {
  return typeof value === 'object' && value !== null && (value as Node).nodeType === 9;
}

function isElement(value: unknown): value is Element {
  return typeof value === 'object' && value !== null && (value as Node).nodeType === 1;
}

function isResult(value: unknown): value is CheckResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as CheckResult).issues) &&
    typeof (value as CheckResult).summary === 'object'
  );
}

function evaluate(result: CheckResult, failOn: Impact): MatcherResult {
  const failing = violationsAtLeast(result, failOn);
  const threshold = failOn === 'minor' ? '' : ` with impact ${failOn} or higher`;
  return {
    pass: failing.length === 0,
    message: () =>
      failing.length === 0
        ? `Expected accessibility violations${threshold}, but none were found.`
        : `Expected no accessibility violations${threshold}, but found ${failing.length}:\n\n${formatIssues(failing)}`,
  };
}

/**
 * Checks an element or a document and passes when it has no violations at or above
 * `failOn`. Rules that need layout are reported as incomplete in simulated DOMs
 * (jsdom, happy-dom) and do not fail the assertion.
 *
 * @example
 * await expect(screen.getByRole('form')).toBeAccessible();
 * await expect(document).toBeAccessible({ failOn: 'serious' });
 */
export async function toBeAccessible(
  received: unknown,
  options: A11yMatcherOptions = {},
): Promise<MatcherResult> {
  const { failOn = 'minor', ...config } = options;
  let result: CheckResult;
  if (isDocument(received)) {
    result = await check({ outcomes: ['violation'], ...config, document: received });
  } else if (isElement(received)) {
    result = await check({ outcomes: ['violation'], ...config, element: received });
  } else {
    throw new TypeError('toBeAccessible() expects an Element or a Document.');
  }
  return evaluate(result, failOn);
}

/**
 * Passes when a `CheckResult` has no violations at or above `failOn`.
 *
 * @example
 * expect(await check()).toHaveNoViolations({ failOn: 'serious' });
 */
export function toHaveNoViolations(
  received: unknown,
  options: { failOn?: Impact } = {},
): MatcherResult {
  if (!isResult(received)) {
    throw new TypeError('toHaveNoViolations() expects the result of check().');
  }
  return evaluate(received, options.failOn ?? 'minor');
}

/** Pass to `expect.extend()` in Vitest or Jest. */
export const a11yMatchers = { toBeAccessible, toHaveNoViolations };
