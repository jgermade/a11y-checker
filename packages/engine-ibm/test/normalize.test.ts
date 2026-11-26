import { resolveConfig } from '@a11y-checker/core';
import { describe, expect, it } from 'vitest';
import {
  actIdsOf,
  classify,
  guidelineFor,
  helpUrlOf,
  normalizeResults,
  scopeFilter,
  wcagOf,
  type AceResult,
  type AceRule,
} from '../src/index.js';

describe('classify', () => {
  it.each([
    [['VIOLATION', 'FAIL'], { outcome: 'violation', impact: 'serious', requirement: true }],
    [['VIOLATION', 'POTENTIAL'], { outcome: 'incomplete', impact: 'moderate', requirement: true }],
    [['VIOLATION', 'MANUAL'], { outcome: 'incomplete', impact: 'moderate', requirement: true }],
    [['VIOLATION', 'PASS'], { outcome: 'pass', requirement: true }],
    [['RECOMMENDATION', 'FAIL'], { outcome: 'violation', impact: 'minor', requirement: false }],
    [['INFORMATION', 'FAIL'], null],
    [['VIOLATION', 'UNKNOWN'], null],
  ] as const)('%j → %j', (value, expected) => {
    expect(classify(value)).toEqual(expected);
  });
});

const rule: AceRule = {
  messages: { 'en-US': { group: 'Images must have accessible names' } },
  help: { 'en-US': { group: 'img_alt_valid.html' } },
  rulesets: [
    { id: ['WCAG_2_1', 'WCAG_2_2'], num: ['1.1.1'], level: 'VIOLATION' },
    { id: 'IBM_Accessibility', num: ['1.1.1', '502.3.1'], level: 'VIOLATION' },
  ],
  act: ['23a2a8', { qt1vmo: { pass: 'pass' } }, '23a2a8'],
};

describe('rule metadata', () => {
  it('normalizes ACT ids from strings and objects', () => {
    expect(actIdsOf(rule)).toEqual(['23a2a8', 'qt1vmo']);
    expect(actIdsOf({ act: 'abc123' })).toEqual(['abc123']);
    expect(actIdsOf({})).toEqual([]);
  });

  it('maps a guideline to WCAG criteria and drops non-WCAG numbers', () => {
    expect(wcagOf(rule, 'WCAG_2_2')).toEqual(['1.1.1']);
    expect(wcagOf(rule, 'IBM_Accessibility')).toEqual(['1.1.1']);
    expect(wcagOf(rule, 'WCAG_2_0')).toEqual([]);
  });

  it('builds help URLs', () => {
    expect(helpUrlOf(rule, 'img_alt_valid')).toBe(
      'https://able.ibm.com/rules/archives/latest/doc/en-US/img_alt_valid.html',
    );
    expect(helpUrlOf(undefined, 'x_y')).toBe(
      'https://able.ibm.com/rules/archives/latest/doc/en-US/x_y.html',
    );
  });

  it('picks the guideline from the config', () => {
    expect(guidelineFor(resolveConfig())).toBe('WCAG_2_2');
    expect(guidelineFor(resolveConfig({ wcag: { version: '2.0' } }))).toBe('WCAG_2_0');
    expect(guidelineFor(resolveConfig({ bestPractices: true }))).toBe('IBM_Accessibility');
  });
});

describe('normalizeResults', () => {
  it('groups results per rule and outcome with targets from the real nodes', () => {
    document.body.innerHTML = '<main><img id="a"><img id="b"><p id="c">x</p></main>';
    const el = (id: string) => document.getElementById(id) as Element;
    const result = (
      ruleId: string,
      value: [string, string],
      node: Element,
      message = 'msg',
    ): AceResult => ({ ruleId, value, node, message, snippet: node.outerHTML, path: {} });
    const checker = {
      engine: { getRule: (id: string) => (id === 'img_alt_valid' ? rule : undefined) },
    };

    const issues = normalizeResults(
      [
        result('img_alt_valid', ['VIOLATION', 'FAIL'], el('a'), 'no alt'),
        result('img_alt_valid', ['VIOLATION', 'FAIL'], el('b')),
        result('img_alt_valid', ['VIOLATION', 'PASS'], el('c')),
        result('style_hc', ['RECOMMENDATION', 'MANUAL'], el('c')),
        result('info', ['INFORMATION', 'FAIL'], el('c')),
      ],
      checker,
      'WCAG_2_2',
      document,
    );

    expect(issues.map((i) => [i.id, i.impact, i.wcag])).toEqual([
      ['ibm/img_alt_valid/violation', 'serious', ['1.1.1']],
      ['ibm/img_alt_valid/pass', undefined, ['1.1.1']],
      ['ibm/style_hc/incomplete', 'minor', []],
    ]);
    expect(issues[0]).toMatchObject({
      help: 'Images must have accessible names',
      helpUrl: 'https://able.ibm.com/rules/archives/latest/doc/en-US/img_alt_valid.html',
      actRuleIds: ['23a2a8', 'qt1vmo'],
      tags: ['violation', 'fail'],
      nodes: [
        { target: [['#a']], html: '<img id="a">', impact: 'serious', message: 'no alt' },
        { target: [['#b']], html: '<img id="b">', impact: 'serious', message: 'msg' },
      ],
    });
    expect(issues[1]?.nodes[0]).not.toHaveProperty('message');
    document.body.innerHTML = '';
  });
});

describe('scopeFilter', () => {
  it('applies include and exclude selectors through shadow roots', () => {
    document.body.innerHTML =
      '<main><div class="ad"><img id="ad"></div><div id="host"></div></main><aside><img id="side"></aside>';
    const root = document.getElementById('host')?.attachShadow({ mode: 'open' });
    if (!root) throw new Error('missing');
    root.innerHTML = '<img id="shadow">';
    const keep = scopeFilter(resolveConfig({ include: ['main'], exclude: ['.ad'] }));
    const shadowImg = root.getElementById('shadow');
    expect(keep(document.getElementById('ad') as Node)).toBe(false);
    expect(keep(document.getElementById('side') as Node)).toBe(false);
    expect(keep(shadowImg as Node)).toBe(true);
    expect(scopeFilter(resolveConfig())(document.getElementById('side') as Node)).toBe(true);
    document.body.innerHTML = '';
  });
});
