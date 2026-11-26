import { resolveConfig, summarize, type CheckResult, type Issue } from '@a11y-checker/core';

const issues: Issue[] = [
  {
    id: 'axe/image-alt/violation',
    ruleId: 'image-alt',
    engine: 'axe',
    outcome: 'violation',
    impact: 'critical',
    description: 'Ensure <img> elements have alternative text',
    help: 'Images must have alternative text',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/image-alt',
    wcag: ['1.1.1'],
    actRuleIds: ['23a2a8'],
    tags: ['wcag2a', 'wcag111'],
    nodes: [
      {
        target: [['img.logo']],
        html: '<img class="logo" src="logo.png">',
        impact: 'critical',
        message: 'Fix any of the following:\n  Element does not have an alt attribute',
      },
      { target: [['iframe#app'], ['#host', 'img']], html: '<img src="x.png">' },
    ],
  },
  {
    id: 'axe/region/violation',
    ruleId: 'region',
    engine: 'axe',
    outcome: 'violation',
    impact: 'moderate',
    description: 'Ensure all page content is contained by landmarks',
    help: 'All page content should be contained by landmarks',
    wcag: [],
    actRuleIds: [],
    tags: ['best-practice'],
    nodes: [{ target: [['div.banner']], html: '<div class="banner">' }],
  },
  {
    id: 'axe/color-contrast/incomplete',
    ruleId: 'color-contrast',
    engine: 'axe',
    outcome: 'incomplete',
    impact: 'serious',
    description: 'Ensure the contrast between foreground and background colors meets WCAG 2 AA',
    help: 'Elements must meet minimum color contrast ratio thresholds',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/color-contrast',
    wcag: ['1.4.3'],
    actRuleIds: ['afw4f7'],
    tags: ['wcag2aa', 'wcag143'],
    nodes: [{ target: [['p.hero']], html: '<p class="hero">' }],
  },
];

/** A realistic result, as produced by the axe engine. */
export function sampleResult(overrides: Partial<CheckResult> = {}): CheckResult {
  return {
    url: 'https://example.com/page',
    timestamp: '2026-11-26T12:00:00.000Z',
    duration: 42,
    engines: [{ id: 'axe', version: '4.14.1' }],
    config: resolveConfig({ bestPractices: true }),
    issues,
    summary: summarize(issues),
    errors: [],
    ...overrides,
  };
}
