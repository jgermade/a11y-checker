import { resolveConfig } from '@a11y-checker/core';
import type axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { buildContext, buildRunOptions, tagsForTarget } from '../src/index.js';

const KNOWN = new Set(['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag22aa']);

describe('tagsForTarget', () => {
  it('includes every known tag up to the target', () => {
    expect(tagsForTarget('2.0', 'A', KNOWN)).toEqual(['wcag2a']);
    expect(tagsForTarget('2.1', 'AA', KNOWN)).toEqual(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
    expect(tagsForTarget('2.2', 'AAA', KNOWN)).toEqual([
      'wcag2a',
      'wcag2aa',
      'wcag2aaa',
      'wcag21a',
      'wcag21aa',
      'wcag22aa',
    ]);
  });
});

const rules: axe.RuleMetadata[] = [
  { ruleId: 'image-alt', description: '', help: '', helpUrl: '', tags: ['wcag2a', 'wcag111'] },
  { ruleId: 'region', description: '', help: '', helpUrl: '', tags: ['best-practice'] },
];

describe('buildRunOptions', () => {
  it('selects rules by tag for the WCAG target', () => {
    expect(buildRunOptions(resolveConfig(), rules)).toEqual({
      resultTypes: ['violations', 'incomplete'],
      iframes: true,
      runOnly: { type: 'tag', values: ['wcag2a'] },
    });
  });

  it('adds best practices when enabled', () => {
    const options = buildRunOptions(resolveConfig({ bestPractices: true }), rules);
    expect(options.runOnly).toEqual({ type: 'tag', values: ['wcag2a', 'best-practice'] });
  });

  it('runs only known included rules and disables known excluded rules', () => {
    const options = buildRunOptions(
      resolveConfig({
        rules: { include: ['image-alt', 'ibm-only-rule'], exclude: ['region', 'unknown'] },
        outcomes: ['pass'],
      }),
      rules,
    );
    expect(options).toEqual({
      resultTypes: ['passes'],
      iframes: true,
      runOnly: { type: 'rule', values: ['image-alt'] },
      rules: { region: { enabled: false } },
    });
  });
});

describe('buildContext', () => {
  it('uses the document when there are no selectors', () => {
    expect(buildContext(resolveConfig(), document)).toBe(document);
  });

  it('passes include and exclude selectors', () => {
    expect(buildContext(resolveConfig({ include: ['main'], exclude: ['.ad'] }), document)).toEqual({
      include: ['main'],
      exclude: ['.ad'],
    });
    expect(buildContext(resolveConfig({ exclude: ['.ad'] }), document)).toEqual({
      exclude: ['.ad'],
    });
  });
});
