// checkA11y() and the matcher against real pages in Chromium.
import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { a11yMatchers, checkA11y, type PlaywrightCheckResult } from '../src/index.js';
import { serve } from './site.js';

let browser: Browser;
let page: Page;

beforeAll(async () => {
  browser = await chromium.launch();
  page = await browser.newPage();
  await serve(page);
});

afterAll(async () => {
  await browser.close();
});

const violations = (result: PlaywrightCheckResult) =>
  result.issues
    .filter((i) => i.outcome === 'violation')
    .map((i) => [`${i.engine}/${i.ruleId}`, i.nodes.map((n) => n.target)]);

describe('checkA11y', () => {
  it('checks the page and its cross-origin frames', async () => {
    await page.goto('http://site.test/');
    const result = await checkA11y(page);
    expect(result.errors).toEqual([]);
    expect(result.frames).toEqual({ total: 2, checked: 2 });
    expect(violations(result)).toEqual([
      ['axe/button-name', [[['button']]]],
      ['axe/image-alt', [[['#main-img']], [['#cross'], ['#cross-img']]]],
    ]);
  });

  it('closes cross-origin access after the check', async () => {
    await page.goto('http://site.test/');
    await checkA11y(page);
    // A second check of the same page still works (bundles are reused).
    expect((await checkA11y(page)).summary.outcomes.violation).toBe(2);
  });

  it('checks only the element a locator points to', async () => {
    await page.goto('http://site.test/');
    const result = await checkA11y(page.locator('#form'));
    expect(violations(result)).toEqual([['axe/button-name', [[['button']]]]]);
    expect(JSON.stringify(result)).not.toContain('data-a11y-checker-scope');
  });

  it('checks a locator inside a cross-origin frame', async () => {
    await page.goto('http://site.test/');
    const result = await checkA11y(page.frameLocator('#cross').locator('body'));
    expect(result.url).toBe('http://widget.test/');
    expect(violations(result)).toEqual([['axe/image-alt', [[['#cross-img']]]]]);
  });

  it('works on pages whose CSP blocks scripts', async () => {
    await page.goto('http://site.test/csp');
    const result = await checkA11y(page);
    expect(violations(result)).toEqual([['axe/image-alt', [[['#csp-img']]]]]);
  });

  it('runs the IBM engine and merges its results', async () => {
    await page.goto('http://site.test/');
    const result = await checkA11y(page, { engines: ['axe', 'ibm'] });
    expect(result.errors).toEqual([]);
    expect(result.engines.map((e) => e.id)).toEqual(['axe', 'ibm']);
    const image = result.issues.find((i) => i.ruleId === 'image-alt');
    expect(image?.nodes.find((n) => n.target[0]?.[0] === '#main-img')?.engines).toEqual([
      'axe',
      'ibm',
    ]);
  });

  it('rejects an empty engine list and reports engine errors', async () => {
    await page.goto('http://site.test/good');
    await expect(checkA11y(page, { engines: [] })).rejects.toThrow('at least one engine');
    await expect(
      checkA11y(page, { wcag: { level: 'X' } } as unknown as Parameters<typeof checkA11y>[1]),
    ).rejects.toThrow('wcag.level must be one of');
  });
});

describe('toBeAccessible', () => {
  const matcher = a11yMatchers.toBeAccessible.bind({ isNot: false });

  it('passes for an accessible page and fails with details otherwise', async () => {
    await page.goto('http://site.test/good');
    expect((await matcher(page, { attach: false })).pass).toBe(true);

    await page.goto('http://site.test/');
    const failed = await matcher(page, { attach: false });
    expect(failed.pass).toBe(false);
    expect(failed.message()).toMatch(
      /^Expected no accessibility violations, but found 2:\n\n✖ \[critical\] axe\/button-name/,
    );
    expect(failed.message()).toContain('#cross → #cross-img');
  });

  it('applies failOn', async () => {
    await page.goto('http://site.test/');
    const result = await matcher(page.locator('#form'), {
      attach: false,
      bestPractices: true,
      rules: { include: ['region'] },
      failOn: 'serious',
    });
    expect(result.pass).toBe(true);
  });
});
