// @vitest-environment node
// Tests the built IIFE bundle in Chromium, injected the way the browser extension and
// E2E adapters will inject it.
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { CheckConfig, CheckResult } from '../src/index.js';

const PACKAGE_DIR = fileURLToPath(new URL('..', import.meta.url));
const BUNDLE = fileURLToPath(new URL('../dist/a11y-checker.iife.js', import.meta.url));

type Global = typeof import('../src/iife.js');
declare global {
  interface Window {
    A11yChecker: Global;
  }
}

const IMG = '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">';
const page = (body: string) =>
  `<!doctype html><html lang="en"><head><title>Test</title></head><body><main>${body}</main></body></html>`;

let browser: Browser;

beforeAll(async () => {
  // Always test a fresh build of the current sources.
  execSync('pnpm run build', { cwd: PACKAGE_DIR, stdio: 'ignore' });
  browser = await chromium.launch();
}, 120_000);

afterAll(async () => {
  await browser.close();
});

async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const context = await browser.newContext();
  try {
    return await fn(await context.newPage());
  } finally {
    await context.close();
  }
}

// Results travel as JSON: Playwright's serialization types are too deep for CheckResult.
const runCheck = async (p: Page, config: CheckConfig = {}): Promise<CheckResult> =>
  JSON.parse(
    await p.evaluate(async (json) => {
      const { check, toJSON } = window.A11yChecker;
      return toJSON(await check(JSON.parse(json) as CheckConfig));
    }, JSON.stringify(config)),
  ) as CheckResult;

const violations = (result: CheckResult) =>
  result.issues
    .filter((i) => i.outcome === 'violation')
    .map((i) => [i.ruleId, i.nodes.map((n) => n.target)]);

describe('IIFE bundle', () => {
  it('exposes the API on window.A11yChecker', async () => {
    await withPage(async (p) => {
      await p.setContent(page(''));
      await p.addScriptTag({ path: BUNDLE });
      const api = await p.evaluate(() => ({
        version: window.A11yChecker.VERSION,
        functions: Object.keys(window.A11yChecker)
          .filter((k) => typeof window.A11yChecker[k as keyof Global] === 'function')
          .sort(),
      }));
      expect(api.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(api.functions).toEqual([
        'allowFrameOrigins',
        'check',
        'createChecker',
        'formatTarget',
        'toHTML',
        'toJSON',
        'toSARIF',
      ]);
    });
  });

  it('checks the page it is injected into', async () => {
    await withPage(async (p) => {
      await p.setContent(page(`${IMG}<button></button>`));
      await p.addScriptTag({ path: BUNDLE });
      const result = await runCheck(p);
      expect(result.errors).toEqual([]);
      expect(violations(result)).toEqual([
        ['button-name', [[['button']]]],
        ['image-alt', [[['img']]]],
      ]);
    });
  });

  async function loadCrossOriginPage(p: Page) {
    await p.route('http://site.test/**', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: page('<iframe src="http://widget.test/" title="Widget"></iframe>'),
      }),
    );
    await p.route('http://widget.test/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: page(IMG) }),
    );
    await p.goto('http://site.test/');
    // Like a content script with `all_frames: true` and `run_at: document_idle`.
    for (const frame of p.frames()) await frame.addScriptTag({ path: BUNDLE });
  }

  it('skips cross-origin iframes by default', async () => {
    await withPage(async (p) => {
      await loadCrossOriginPage(p);
      const result = await runCheck(p);
      expect(violations(result)).toEqual([]);
    });
  });

  it('checks cross-origin iframes once both origins are allowed', async () => {
    await withPage(async (p) => {
      await loadCrossOriginPage(p);
      const [top, widget] = p.frames();
      await top?.evaluate(() => {
        window.A11yChecker.allowFrameOrigins(['<same_origin>', 'http://widget.test']);
      });
      await widget?.evaluate(() => {
        window.A11yChecker.allowFrameOrigins(['<same_origin>', 'http://site.test']);
      });

      const result = await runCheck(p);
      expect(result.errors).toEqual([]);
      expect(violations(result)).toEqual([['image-alt', [[['iframe'], ['img']]]]]);
    });
  });

  it('produces an HTML report that passes its own check, in light and dark mode', async () => {
    const html = await withPage(async (p) => {
      await p.setContent(page(`${IMG}<button></button><p style="color:#bbb">Low contrast</p>`));
      await p.addScriptTag({ path: BUNDLE });
      return p.evaluate(async () => {
        const { check, toHTML } = window.A11yChecker;
        return toHTML(await check({ outcomes: ['violation', 'incomplete', 'pass'] }));
      });
    });
    expect(html).toContain('Violations (3)');

    for (const colorScheme of ['light', 'dark'] as const) {
      await withPage(async (p) => {
        await p.emulateMedia({ colorScheme });
        await p.setContent(html);
        // Expand every element list, so hidden content is checked too.
        await p.evaluate(() => {
          document.querySelectorAll('details').forEach((d) => (d.open = true));
        });
        await p.addScriptTag({ path: BUNDLE });
        const result = await runCheck(p, { bestPractices: true, wcag: { level: 'AA' } });
        expect(violations(result), `${colorScheme} mode`).toEqual([]);
      });
    }
  });
});
