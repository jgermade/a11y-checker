import { describe, expect, it } from 'vitest';
import { toHTML, toJSON, toSARIF, toText, violationsAtLeast } from '../src/reporters/index.js';
import { VERSION } from '../src/version.js';
import { sampleResult } from './sample.js';

describe('toJSON', () => {
  it('round-trips the result', () => {
    const result = sampleResult();
    expect(JSON.parse(toJSON(result))).toEqual(result);
    expect(toJSON(result)).toContain('\n  "url"');
    expect(toJSON(result, { pretty: false })).not.toContain('\n');
  });
});

describe('toSARIF', () => {
  const log = toSARIF(sampleResult());
  const run = log.runs[0];

  it('writes a SARIF 2.1.0 log', () => {
    expect(log.version).toBe('2.1.0');
    expect(log.$schema).toBe('https://json.schemastore.org/sarif-2.1.0.json');
    expect(run?.tool.driver).toMatchObject({ name: 'a11y-checker', version: VERSION });
    expect(run?.invocations[0]).toEqual({
      executionSuccessful: true,
      startTimeUtc: '2026-11-26T12:00:00.000Z',
      toolExecutionNotifications: [],
    });
  });

  it('declares each rule once, with WCAG and ACT tags', () => {
    expect(run?.tool.driver.rules.map((r) => r.id)).toEqual([
      'axe/image-alt',
      'axe/region',
      'axe/color-contrast',
    ]);
    expect(run?.tool.driver.rules[0]).toMatchObject({
      name: 'image-alt',
      shortDescription: { text: 'Images must have alternative text' },
      helpUri: 'https://dequeuniversity.com/rules/axe/4.14/image-alt',
      properties: { tags: ['accessibility', 'WCAG 1.1.1', 'ACT 23a2a8'] },
    });
  });

  it('writes one result per node, with kind and level from outcome and impact', () => {
    expect(run?.results.map((r) => [r.ruleId, r.ruleIndex, r.kind, r.level])).toEqual([
      ['axe/image-alt', 0, 'fail', 'error'],
      ['axe/image-alt', 0, 'fail', 'error'],
      ['axe/region', 1, 'fail', 'warning'],
      ['axe/color-contrast', 2, 'review', 'none'],
    ]);
    const second = run?.results[1];
    expect(second?.message.text).toBe('Images must have alternative text');
    expect(second?.locations[0]).toEqual({
      physicalLocation: {
        artifactLocation: { uri: 'https://example.com/page' },
        region: { snippet: { text: '<img src="x.png">' } },
      },
      logicalLocations: [{ fullyQualifiedName: 'iframe#app → #host >>> img', kind: 'element' }],
    });
    expect(second?.properties).toEqual({
      impact: 'critical',
      target: [['iframe#app'], ['#host', 'img']],
    });
  });

  it('reports engine errors as failed execution', () => {
    const failed = toSARIF(sampleResult({ errors: [{ engine: 'axe', message: 'boom' }] }));
    expect(failed.runs[0]?.invocations[0]).toMatchObject({
      executionSuccessful: false,
      toolExecutionNotifications: [{ level: 'error', message: { text: 'axe: boom' } }],
    });
  });
});

describe('toHTML', () => {
  it('renders a standalone page with summary and issues', () => {
    const html = toHTML(sampleResult());
    expect(html).toMatch(/^<!doctype html>\n<html lang="en">/);
    expect(html).toContain('<title>Accessibility report – https://example.com/page</title>');
    expect(html).toContain('WCAG 2.2 AA + best practices');
    expect(html).toContain('<h2 id="section-violation">Violations (2)</h2>');
    expect(html).toContain('<h2 id="section-incomplete">Needs review (1)</h2>');
    expect(html).not.toContain('section-pass');
    expect(html).toContain('WCAG: 1.1.1 Non-text Content (A)');
    expect(html).toContain('Best practice (no WCAG criterion)');
    expect(html).toContain('https://www.w3.org/WAI/standards-guidelines/act/rules/23a2a8/');
    expect(html).toContain('<code>iframe#app → #host &gt;&gt;&gt; img</code>');
    expect(html).not.toMatch(/<(link|script)\b/);
  });

  it('escapes content from the page and drops unsafe links', () => {
    const result = sampleResult();
    const [first] = result.issues;
    if (!first) throw new Error('missing sample issue');
    const hostile = {
      ...first,
      help: '<script>alert(1)</script>',
      helpUrl: 'javascript:alert(1)',
      nodes: [{ target: [['img']], html: '<img src=x onerror="alert(1)">' }],
    };
    const html = toHTML({ ...result, url: '"><script>x</script>', issues: [hostile] });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  });

  it('lists engine errors', () => {
    const html = toHTML(sampleResult({ errors: [{ engine: 'axe', message: 'boom <b>' }] }));
    expect(html).toContain('<code>axe</code>: boom &lt;b&gt;');
  });
});

describe('merged results', () => {
  const merged = sampleResult();
  const [first] = merged.issues;
  if (!first) throw new Error('missing sample issue');
  const issue = {
    ...first,
    relatedRules: [
      {
        engine: 'ibm',
        ruleId: 'img_alt_valid',
        help: 'Images must have accessible names',
        helpUrl: 'https://able.ibm.com/rules/archives/latest/doc/en-US/img_alt_valid.html',
      },
    ],
    nodes: [{ ...first.nodes[0], target: [['img.logo']], html: '<img>', engines: ['axe', 'ibm'] }],
  };
  const result = { ...merged, issues: [issue] };

  it('lists related rules and node engines in SARIF', () => {
    const run = toSARIF(result).runs[0];
    expect(run?.tool.driver.rules[0]?.properties.relatedRules).toEqual(issue.relatedRules);
    expect(run?.results[0]?.properties.engines).toEqual(['axe', 'ibm']);
  });

  it('lists related rules and node engines in HTML', () => {
    const html = toHTML(result);
    expect(html).toContain(
      'Also reported by: <a href="https://able.ibm.com/rules/archives/latest/doc/en-US/img_alt_valid.html">img_alt_valid (ibm)</a>',
    );
    expect(html).toContain('(reported by axe, ibm)');
  });
});

describe('toText', () => {
  it('summarizes the result and lists violations', () => {
    const text = toText(sampleResult());
    expect(text).toContain('Accessibility check of https://example.com/page');
    expect(text).toContain('WCAG 2.2 AA · axe 4.14.1');
    expect(text).toContain('2 violations (1 critical, 1 moderate), 1 to review');
    expect(text).toContain(
      '✖ [critical] axe/image-alt: Images must have alternative text (WCAG 1.1.1)',
    );
    expect(text).toContain('    • iframe#app → #host >>> img');
    expect(text).toContain('      Element does not have an alt attribute');
    expect(text).not.toContain('color-contrast');
    expect(toText(sampleResult(), { incomplete: true })).toContain(
      '? [serious] axe/color-contrast',
    );
  });

  it('limits the nodes listed per issue', () => {
    expect(toText(sampleResult(), { maxNodes: 1 })).toContain('… and 1 more');
  });
});

describe('violationsAtLeast', () => {
  it('filters violations by impact threshold', () => {
    const ids = (failOn?: Parameters<typeof violationsAtLeast>[1]) =>
      violationsAtLeast(sampleResult(), failOn).map((i) => i.ruleId);
    expect(ids()).toEqual(['image-alt', 'region']);
    expect(ids('serious')).toEqual(['image-alt']);
    expect(ids('critical')).toEqual(['image-alt']);
  });
});
