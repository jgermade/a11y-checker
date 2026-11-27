// ACT conformance: every W3C test case of the implemented rules must be consistent.
import { describe, expect, it } from 'vitest';
import { E2E_BROWSERS } from '../../../test-browsers.js';
import { RULES } from '../src/index.js';
import { consistency, loadTestCases, runActSuite } from './act/harness.js';

const implemented = new Set(RULES.flatMap((rule) => rule.actRuleIds));

describe('W3C ACT test cases', () => {
  it('has test cases for every implemented rule', async () => {
    const covered = new Set((await loadTestCases()).map((t) => t.ruleId));
    expect([...implemented].filter((id) => !covered.has(id))).toEqual([]);
  });

  it.each(E2E_BROWSERS)(
    'is consistent with every test case in %s',
    { timeout: 300_000 },
    async (browser) => {
      const results = await runActSuite(['native'], (t) => implemented.has(t.ruleId), browser);
      const problems = results
        .map(({ testcase, outcomes }) => ({
          testcase,
          actual: outcomes.native ?? 'inapplicable',
        }))
        .filter(({ testcase, actual }) => consistency(testcase.expected, actual) !== 'consistent')
        .map(
          ({ testcase, actual }) =>
            `${testcase.ruleId} ${testcase.testcaseTitle} (${testcase.path}): expected ${testcase.expected}, got ${actual}`,
        );
      expect(problems).toEqual([]);
      expect(results.length).toBeGreaterThan(200);
    },
  );
});
