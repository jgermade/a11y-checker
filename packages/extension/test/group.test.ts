import type { Issue } from '@a11y-checker/core';
import { describe, expect, it } from 'vitest';
import { groupIssues } from '../src/lib/group.js';

const issue = (ruleId: string, impact: Issue['impact'], wcag: string[]): Issue => ({
  id: `axe/${ruleId}/violation`,
  ruleId,
  engine: 'axe',
  outcome: 'violation',
  ...(impact ? { impact } : {}),
  description: '',
  help: '',
  wcag,
  actRuleIds: [],
  tags: [],
  nodes: [],
});

const issues = [
  issue('region', 'moderate', []),
  issue('color-contrast', 'serious', ['1.4.3']),
  issue('image-alt', 'critical', ['1.1.1']),
  issue('label', 'critical', ['1.3.1', '4.1.2']),
  issue('link-name', undefined, ['2.4.4', '4.1.2']),
];

const summarize = (by: Parameters<typeof groupIssues>[1]) =>
  groupIssues(issues, by).map((g) => [g.label, g.issues.map((i) => i.ruleId)]);

describe('groupIssues', () => {
  it('groups by impact, most severe first', () => {
    expect(summarize('impact')).toEqual([
      ['Critical', ['image-alt', 'label']],
      ['Serious', ['color-contrast']],
      ['Moderate', ['region']],
      ['Unknown impact', ['link-name']],
    ]);
  });

  it('groups by rule, alphabetically', () => {
    expect(summarize('rule').map(([label]) => label)).toEqual([
      'color-contrast',
      'image-alt',
      'label',
      'link-name',
      'region',
    ]);
  });

  it('groups by WCAG criterion in numeric order, best practices last', () => {
    expect(summarize('wcag')).toEqual([
      ['1.1.1 Non-text Content (A)', ['image-alt']],
      ['1.3.1 Info and Relationships (A)', ['label']],
      ['1.4.3 Contrast (Minimum) (AA)', ['color-contrast']],
      ['2.4.4 Link Purpose (In Context) (A)', ['link-name']],
      ['4.1.2 Name, Role, Value (A)', ['label', 'link-name']],
      ['Best practices (no WCAG criterion)', ['region']],
    ]);
  });
});
