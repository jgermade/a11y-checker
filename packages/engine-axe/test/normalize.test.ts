import type axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { normalizeResults, normalizeTarget, wcagFromTags } from '../src/index.js';

describe('wcagFromTags', () => {
  it('extracts and sorts success criteria, ignoring other tags', () => {
    expect(
      wcagFromTags(['wcag2aa', 'wcag1410', 'wcag143', 'cat.color', 'wcag143', 'wcag21aa', 'ACT']),
    ).toEqual(['1.4.3', '1.4.10']);
  });
});

describe('normalizeTarget', () => {
  it('wraps plain selectors and keeps shadow DOM chains', () => {
    expect(normalizeTarget(['iframe#app', ['#host', 'button']])).toEqual([
      ['iframe#app'],
      ['#host', 'button'],
    ]);
  });
});

const node = (overrides: Partial<axe.NodeResult> = {}): axe.NodeResult => ({
  html: '<img src="a.png">',
  target: ['img'],
  impact: 'critical',
  any: [],
  all: [],
  none: [],
  failureSummary: 'Fix any of the following: ...',
  ...overrides,
});

const result = (id: string, overrides: Partial<axe.Result> = {}): axe.Result => ({
  id,
  description: `${id} description`,
  help: `${id} help`,
  helpUrl: `https://example.com/${id}`,
  impact: 'critical',
  tags: ['wcag2a', 'wcag111'],
  nodes: [node()],
  ...overrides,
});

describe('normalizeResults', () => {
  it('maps every result group to an outcome', () => {
    const issues = normalizeResults(
      {
        violations: [result('image-alt')],
        incomplete: [result('color-contrast', { impact: 'serious', tags: ['wcag143'] })],
        passes: [result('document-title', { impact: null, nodes: [node({ impact: null })] })],
        inapplicable: [result('video-caption', { impact: null, nodes: [] })],
      },
      new Map([['image-alt', ['23a2a8']]]),
    );

    expect(issues.map((i) => [i.id, i.outcome])).toEqual([
      ['axe/image-alt/violation', 'violation'],
      ['axe/color-contrast/incomplete', 'incomplete'],
      ['axe/document-title/pass', 'pass'],
      ['axe/video-caption/inapplicable', 'inapplicable'],
    ]);

    expect(issues[0]).toEqual({
      id: 'axe/image-alt/violation',
      ruleId: 'image-alt',
      engine: 'axe',
      outcome: 'violation',
      impact: 'critical',
      description: 'image-alt description',
      help: 'image-alt help',
      helpUrl: 'https://example.com/image-alt',
      wcag: ['1.1.1'],
      actRuleIds: ['23a2a8'],
      tags: ['wcag2a', 'wcag111'],
      nodes: [
        {
          target: [['img']],
          html: '<img src="a.png">',
          impact: 'critical',
          message: 'Fix any of the following: ...',
        },
      ],
    });
    expect(issues[1]?.actRuleIds).toEqual([]);
  });

  it('omits impact on passes and inapplicable rules', () => {
    const [pass] = normalizeResults({
      violations: [],
      incomplete: [],
      passes: [result('x', { impact: 'minor', nodes: [node({ impact: 'minor' })] })],
      inapplicable: [],
    });
    expect(pass).not.toHaveProperty('impact');
    expect(pass?.nodes[0]).not.toHaveProperty('impact');
  });
});
