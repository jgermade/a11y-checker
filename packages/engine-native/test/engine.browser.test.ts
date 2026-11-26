// The native engine through the core runner, in Chromium.
import { runCheck, type CheckResult } from '@a11y-checker/core';
import { createAxeEngine } from '@a11y-checker/engine-axe';
import { afterEach, describe, expect, it } from 'vitest';
import { createNativeEngine, defineRule, failed, passed, RULES, runRules } from '../src/index.js';

function render(html: string) {
  document.getElementById('fixture')?.remove();
  document.documentElement.lang = 'en';
  document.title = 'Fixture';
  const main = document.createElement('main');
  main.id = 'fixture';
  main.innerHTML = html;
  document.body.appendChild(main);
  return main;
}

afterEach(() => {
  document.getElementById('fixture')?.remove();
});

const violations = (result: CheckResult) =>
  result.issues
    .filter((i) => i.outcome === 'violation')
    .map((i) => [i.ruleId, i.nodes.map((n) => n.target)]);

describe('native engine', () => {
  it('reports violations with WCAG and ACT metadata', async () => {
    render(`
      <img src="a.png" id="no-alt">
      <button id="icon" aria-label="Find">Search</button>
      <a href="/x" id="empty-link"></a>
      <div role="buttton" id="typo">Go</div>
      <p lang="english">Hello</p>
      <div aria-hidden="true"><a href="/y" id="hidden-link">Hidden</a></div>`);
    const result = await runCheck({
      engines: [createNativeEngine()],
      config: { include: ['#fixture'] },
    });
    expect(result.engines).toEqual([{ id: 'native', version: expect.any(String) as string }]);
    // Sorted by impact (critical first), then by rule.
    expect(violations(result)).toEqual([
      ['image-name', [[['#no-alt']]]],
      ['role-valid', [[['#typo']]]],
      ['aria-hidden-focus', [[['#fixture > div:nth-of-type(2)']]]],
      ['element-lang-valid', [[['#fixture > p']]]],
      ['label-in-name', [[['#icon']]]],
      ['link-name', [[['#empty-link']]]],
    ]);
    const image = result.issues.find((i) => i.ruleId === 'image-name');
    expect(image).toMatchObject({
      engine: 'native',
      impact: 'critical',
      wcag: ['1.1.1'],
      actRuleIds: ['23a2a8'],
      helpUrl: 'https://www.w3.org/WAI/standards-guidelines/act/rules/23a2a8/',
    });
    expect(image?.nodes[0]?.message).toBe('The image has no accessible name.');
  });

  it('reports passes and inapplicable rules', async () => {
    render('<img src="a.png" alt="Logo" id="logo">');
    const result = await runCheck({
      engines: [createNativeEngine()],
      config: { include: ['#fixture'], outcomes: ['pass', 'inapplicable'] },
    });
    expect(result.issues.find((i) => i.ruleId === 'image-name')?.outcome).toBe('pass');
    expect(result.issues.find((i) => i.ruleId === 'iframe-name')?.outcome).toBe('inapplicable');
  });

  it('merges its results with axe-core through shared ACT rules', async () => {
    render('<img src="a.png" id="no-alt"><button id="empty"></button>');
    const result = await runCheck({
      engines: [createAxeEngine(), createNativeEngine()],
      config: { include: ['#fixture'] },
    });
    const image = result.issues.find((i) => i.ruleId === 'image-alt');
    expect(image?.nodes[0]?.engines).toEqual(['axe', 'native']);
    expect(image?.relatedRules?.map((r) => `${r.engine}/${r.ruleId}`)).toEqual([
      'native/image-name',
    ]);
    expect(result.issues.some((i) => i.engine === 'native' && i.outcome === 'violation')).toBe(
      false,
    );
  });

  it('runs custom rules, and reports a rule that throws as cantTell', () => {
    render('<p id="a">One</p><p id="b">Two</p>');
    const custom = defineRule({
      id: 'no-two',
      actRuleIds: [],
      wcag: [],
      impact: 'minor',
      description: 'Paragraphs do not say "Two".',
      help: 'Remove "Two"',
      *applicability({ document }) {
        yield* Array.from(document.querySelectorAll('#fixture p'));
      },
      expectation: (el) => (el.textContent === 'Two' ? failed('It says Two.') : passed()),
    });
    const broken = defineRule({
      ...custom,
      id: 'broken',
      expectation: () => {
        throw new Error('boom');
      },
    });
    const [ok, bad] = runRules(document, [custom, broken]);
    expect(ok?.targets.map((t) => [t.element.id, t.outcome])).toEqual([
      ['a', 'passed'],
      ['b', 'failed'],
    ]);
    expect(bad?.targets.every((t) => t.outcome === 'cantTell' && t.message?.includes('boom'))).toBe(
      true,
    );
  });

  it('has unique rule IDs, ACT IDs and help URLs', () => {
    expect(new Set(RULES.map((r) => r.id)).size).toBe(RULES.length);
    for (const rule of RULES) {
      expect(rule.actRuleIds.length).toBeGreaterThan(0);
      expect(rule.helpUrl).toMatch(
        /^https:\/\/www\.w3\.org\/WAI\/standards-guidelines\/act\/rules\//,
      );
    }
  });
});
