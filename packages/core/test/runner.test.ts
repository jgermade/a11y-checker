import { describe, expect, it } from 'vitest';
import { compareIssues, isIssueInScope, resolveConfig, runCheck } from '../src/index.js';
import { fakeEngine, makeIssue } from './helpers.js';

describe('isIssueInScope', () => {
  const config = resolveConfig();

  it('keeps issues mapped to an in-scope criterion', () => {
    expect(isIssueInScope(makeIssue({ ruleId: 'r', wcag: ['1.4.3'] }), config)).toBe(true);
  });

  it('drops issues only mapped to out-of-scope criteria', () => {
    expect(isIssueInScope(makeIssue({ ruleId: 'r', wcag: ['1.4.6'] }), config)).toBe(false);
  });

  it('drops best practices unless enabled', () => {
    const issue = makeIssue({ ruleId: 'r', wcag: [] });
    expect(isIssueInScope(issue, config)).toBe(false);
    expect(isIssueInScope(issue, resolveConfig({ bestPractices: true }))).toBe(true);
  });

  it('drops outcomes that were not requested', () => {
    expect(isIssueInScope(makeIssue({ ruleId: 'r', outcome: 'pass' }), config)).toBe(false);
  });

  it('applies rule include and exclude lists', () => {
    const aaa = makeIssue({ ruleId: 'r', wcag: ['1.4.6'] });
    expect(isIssueInScope(aaa, resolveConfig({ rules: { include: ['r'] } }))).toBe(true);
    expect(isIssueInScope(aaa, resolveConfig({ rules: { include: ['other'] } }))).toBe(false);
    const ok = makeIssue({ ruleId: 'r' });
    expect(isIssueInScope(ok, resolveConfig({ rules: { exclude: ['r'] } }))).toBe(false);
  });
});

describe('compareIssues', () => {
  it('sorts by outcome, impact, rule and engine', () => {
    const issues = [
      makeIssue({ ruleId: 'b', outcome: 'incomplete', impact: 'critical' }),
      makeIssue({ ruleId: 'z', impact: 'minor' }),
      makeIssue({ ruleId: 'b', impact: 'critical', engine: 'y' }),
      makeIssue({ ruleId: 'b', impact: 'critical', engine: 'x' }),
      makeIssue({ ruleId: 'a', impact: 'serious' }),
    ];
    expect(issues.sort(compareIssues).map((i) => `${i.outcome}:${i.ruleId}:${i.engine}`)).toEqual([
      'violation:b:x',
      'violation:b:y',
      'violation:a:fake',
      'violation:z:fake',
      'incomplete:b:fake',
    ]);
  });
});

describe('runCheck', () => {
  it('merges engines, filters, sorts and summarizes', async () => {
    const result = await runCheck({
      config: { dedupe: false },
      engines: [
        fakeEngine('one', [
          makeIssue({ ruleId: 'minor-rule', engine: 'one', impact: 'minor' }),
          makeIssue({ ruleId: 'aaa-rule', engine: 'one', wcag: ['1.4.6'] }),
        ]),
        fakeEngine('two', [
          makeIssue({ ruleId: 'critical-rule', engine: 'two', impact: 'critical' }),
          makeIssue({ ruleId: 'review', engine: 'two', outcome: 'incomplete' }),
        ]),
      ],
    });

    expect(result.issues.map((i) => i.ruleId)).toEqual(['critical-rule', 'minor-rule', 'review']);
    expect(result.engines).toEqual([
      { id: 'one', version: '1.0.0' },
      { id: 'two', version: '1.0.0' },
    ]);
    expect(result.summary.outcomes).toEqual({
      violation: 2,
      incomplete: 1,
      pass: 0,
      inapplicable: 0,
    });
    expect(result.summary.violationsByImpact).toEqual({
      critical: 1,
      serious: 0,
      moderate: 0,
      minor: 1,
    });
    expect(result.errors).toEqual([]);
    expect(result.url).toBe(document.URL);
    expect(result.config.wcag).toEqual({ version: '2.2', level: 'AA' });
  });

  it('reports a failing engine without losing the others', async () => {
    const result = await runCheck({
      engines: [
        fakeEngine('broken', new Error('boom')),
        fakeEngine('ok', [makeIssue({ ruleId: 'r' })]),
      ],
    });
    expect(result.errors).toEqual([{ engine: 'broken', message: 'boom' }]);
    expect(result.issues).toHaveLength(1);
  });

  it('runs engines one at a time', async () => {
    const log: string[] = [];
    const slow = (id: string) => ({
      id,
      version: '1',
      run: async () => {
        log.push(`${id}:start`);
        await new Promise((r) => setTimeout(r, 5));
        log.push(`${id}:end`);
        return [];
      },
    });
    await runCheck({ engines: [slow('a'), slow('b')] });
    expect(log).toEqual(['a:start', 'a:end', 'b:start', 'b:end']);
  });

  it('rejects missing or duplicate engines and invalid config', async () => {
    await expect(runCheck({ engines: [] })).rejects.toThrow('at least one engine');
    await expect(runCheck({ engines: [fakeEngine('x', []), fakeEngine('x', [])] })).rejects.toThrow(
      "engine 'x' is registered twice",
    );
    await expect(
      runCheck({ engines: [fakeEngine('x', [])], config: { outcomes: [] } }),
    ).rejects.toThrow('outcomes must not be empty');
  });
});
