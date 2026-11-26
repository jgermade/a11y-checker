// Integration tests in a real browser (Chromium), with layout.
import { runCheck, type CheckConfig } from '@a11y-checker/core';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { createAxeEngine } from '../src/index.js';
import { FIXTURES, render, renderFrame, renderShadow } from './fixtures.js';

const check = (config: CheckConfig = {}) =>
  runCheck({ engines: [createAxeEngine()], config: { include: ['#fixture'], ...config } });

const targets = (
  result: Awaited<ReturnType<typeof check>>,
  ruleId: string,
  outcome = 'violation',
) =>
  result.issues
    .find((i) => i.ruleId === ruleId && i.outcome === outcome)
    ?.nodes.map((n) => n.target);

describe('axe engine (Chromium)', () => {
  it('reports violations with WCAG and ACT mappings', async () => {
    render(FIXTURES.basic);
    const result = await check();

    expect(result.errors).toEqual([]);
    expect(result.engines).toEqual([{ id: 'axe', version: axe.version }]);
    expect(targets(result, 'image-alt')).toEqual([[['#no-alt']], [['#ad-no-alt']]]);
    expect(targets(result, 'button-name')).toEqual([[['#no-name']]]);
    // Contrast needs layout, so it is only decided in a real browser.
    expect(targets(result, 'color-contrast')).toEqual([[['#low-contrast']]]);

    const contrast = result.issues.find((i) => i.ruleId === 'color-contrast');
    expect(contrast?.wcag).toEqual(['1.4.3']);
    expect(contrast?.impact).toBe('serious');
    expect(contrast?.actRuleIds).toContain('afw4f7');
    expect(result.issues[0]?.impact).toBe('critical');
    expect(result.summary.outcomes.violation).toBe(3);
  });

  it('limits rules to the WCAG target', async () => {
    render(FIXTURES.basic);
    const levelA = await check({ wcag: { version: '2.2', level: 'A' } });
    expect(targets(levelA, 'color-contrast')).toBeUndefined();

    const aaa = await check({ wcag: { version: '2.2', level: 'AAA' } });
    // axe does not repeat in the AAA rule what already fails the AA rule.
    expect(targets(aaa, 'color-contrast')).toEqual([[['#low-contrast']]]);
    expect(targets(aaa, 'color-contrast-enhanced')).toEqual([[['#aaa-contrast']]]);
  });

  it('applies rule and selector filters', async () => {
    render(FIXTURES.basic);
    const onlyImages = await check({ rules: { include: ['image-alt'] }, exclude: ['.ad'] });
    expect(onlyImages.issues.map((i) => i.ruleId)).toEqual(['image-alt']);
    expect(targets(onlyImages, 'image-alt')).toEqual([[['#no-alt']]]);

    const noImages = await check({ rules: { exclude: ['image-alt'] } });
    expect(targets(noImages, 'image-alt')).toBeUndefined();
  });

  it('reports passes when requested', async () => {
    render(FIXTURES.basic);
    const result = await check({ outcomes: ['pass'] });
    expect(result.issues.every((i) => i.outcome === 'pass')).toBe(true);
    expect(targets(result, 'image-alt', 'pass')).toEqual([[['#with-alt']]]);
  });

  it('finds violations inside shadow DOM', async () => {
    renderShadow();
    const result = await check();
    expect(targets(result, 'button-name')).toEqual([[['#host', 'button']]]);
  });

  it('finds violations inside iframes', async () => {
    renderFrame(axe.source);
    const result = await check();
    expect(result.errors).toEqual([]);
    expect(targets(result, 'image-alt')).toEqual([[['#frame'], ['#frame-no-alt']]]);
  });

  it('sees content added after a previous check', async () => {
    const main = render('<button>Ok</button>');
    expect((await check()).summary.outcomes.violation).toBe(0);

    main.insertAdjacentHTML('beforeend', '<button id="late"></button>');
    expect(targets(await check(), 'button-name')).toEqual([[['#late']]]);
  });

  it('queues concurrent checks instead of failing', async () => {
    render(FIXTURES.basic);
    const engine = createAxeEngine();
    const [a, b] = await Promise.all([
      runCheck({ engines: [engine], config: { include: ['#fixture'] } }),
      runCheck({ engines: [engine], config: { include: ['#fixture'] } }),
    ]);
    expect(a.errors).toEqual([]);
    expect(b.errors).toEqual([]);
    expect(a.summary).toEqual(b.summary);
  });
});
