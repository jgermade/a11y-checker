// Loads the built Chrome extension in Chromium and drives its panel against a test site.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, type BrowserContext, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Runs in the extension's service worker.
declare const chrome: {
  tabs: { query(query: { url: string }): Promise<{ id?: number }[]> };
};

const EXTENSION = fileURLToPath(new URL('../.output/chrome-mv3', import.meta.url));
const IMG = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
const doc = (body: string, title = 'Test site') =>
  `<!doctype html><html lang="en"><head><title>${title}</title></head><body>${body}</body></html>`;

const SITE: Record<string, string> = {
  'http://site.test/': doc(`
    <main>
      <h1>Test site</h1>
      <img id="main-img" src="${IMG}">
      <div id="host"></div>
      <iframe id="same" src="/frame.html" title="Same origin"></iframe>
      <iframe id="cross" src="http://widget.test/" title="Cross origin"></iframe>
      <iframe id="sandboxed" sandbox srcdoc="<p>Sandboxed</p>" title="Sandboxed"></iframe>
    </main>
    <script>
      document.getElementById('host').attachShadow({ mode: 'open' }).innerHTML = '<button></button>';
    </script>`),
  'http://site.test/frame.html': doc(`<img id="same-img" src="${IMG}">`, 'Frame'),
  'http://widget.test/': doc(`<img id="cross-img" src="${IMG}">`, 'Widget'),
};

let context: BrowserContext;
let extensionId: string;

beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    // Extensions need the full Chromium build ("new" headless), not headless shell.
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`],
  });
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  extensionId = new URL(worker.url()).host;
  await context.route(/^http:\/\/(site|widget)\.test\//, (route) => {
    const url = new URL(route.request().url());
    const body = SITE[url.origin + url.pathname];
    return body
      ? route.fulfill({ contentType: 'text/html', body })
      : route.fulfill({ status: 404, body: 'Not found' });
  });
});

afterAll(async () => {
  await context.close();
});

let visit = 0;

/** Opens the test site in a new tab, with a unique URL to find that tab's ID. */
async function openSite(): Promise<{ site: Page; tabId: number }> {
  const site = await context.newPage();
  const url = `http://site.test/?visit=${++visit}`;
  await site.goto(url);
  const [worker] = context.serviceWorkers();
  if (!worker) throw new Error('missing extension service worker');
  const tabId = await worker.evaluate(async (tabUrl) => {
    const [tab] = await chrome.tabs.query({ url: tabUrl });
    return tab?.id ?? -1;
  }, url);
  expect(tabId).toBeGreaterThan(0);
  return { site, tabId };
}

async function openPanel(tabId: number): Promise<Page> {
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/devtools-panel.html?tabId=${tabId}`);
  return panel;
}

async function runCheck(panel: Page) {
  await panel.getByRole('button', { name: 'Check page' }).click();
  await expect.poll(() => panel.getByRole('status').first().textContent()).toMatch(/complete/);
}

const targets = (panel: Page) => panel.locator('.node-target code').allTextContents();

describe('browser extension', () => {
  it('checks every frame of the page, including cross-origin ones', async () => {
    const { site, tabId } = await openSite();
    const panel = await openPanel(tabId);
    await runCheck(panel);

    expect(await panel.getByRole('status').first().textContent()).toMatch(
      /^Check complete: 2 violations, \d+ to review/,
    );
    expect((await targets(panel)).sort()).toEqual(
      expect.arrayContaining([
        '#main-img',
        '#host >>> button',
        '#same → #same-img',
        '#cross → #cross-img',
      ]),
    );
    // The sandboxed frame cannot be injected, and the panel says so.
    await expect
      .poll(() => panel.locator('.notice').allTextContents())
      .toEqual([
        '1 frame could not be checked (for example, sandboxed frames or pages the extension cannot access).',
      ]);

    // Cross-origin access is closed again after the check.
    const allowed = await site.evaluate(() => document.title);
    expect(allowed).toBe('Test site');
    await panel.close();
    await site.close();
  });

  it('highlights a node in the page', async () => {
    const { site, tabId } = await openSite();
    const panel = await openPanel(tabId);
    await runCheck(panel);

    await panel
      .locator('details', { hasText: 'Images must have alternative text' })
      .first()
      .click();
    await panel.getByRole('button', { name: 'Highlight #cross → #cross-img' }).click();
    // The node is inside a cross-origin frame, so the frame element is highlighted.
    await expect.poll(() => site.locator('#a11y-checker-highlight').count()).toBe(1);
    const box = await site.locator('#a11y-checker-highlight').boundingBox();
    const frame = await site.locator('#cross').boundingBox();
    expect(box?.width).toBeCloseTo(frame?.width ?? 0, 0);

    // A new check removes the highlight first, so it is never part of the results.
    await runCheck(panel);
    expect(await site.locator('#a11y-checker-highlight').count()).toBe(0);
    await panel.close();
    await site.close();
  });

  it('exports reports and keeps settings', async () => {
    const { site, tabId } = await openSite();
    const panel = await openPanel(tabId);
    await runCheck(panel);

    const [download] = await Promise.all([
      panel.waitForEvent('download'),
      panel.getByRole('button', { name: 'SARIF' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^a11y-report-site\.test-.*\.sarif$/);
    const path = await download.path();
    const sarif = JSON.parse(await readFile(path, 'utf8')) as { runs: { results: unknown[] }[] };
    expect(sarif.runs[0]?.results.length).toBeGreaterThan(0);

    await panel.getByLabel('Level').selectOption('AAA');
    await panel.reload();
    await expect.poll(() => panel.getByLabel('Level').inputValue()).toBe('AAA');
    await panel.getByLabel('Level').selectOption('AA');

    // Reloading the page marks the results as stale.
    await runCheck(panel);
    await site.reload();
    await expect
      .poll(() => panel.locator('.notice').allTextContents())
      .toContain('The page has changed since this check. Run it again to update.');
    await panel.close();
    await site.close();
  });

  it('has an accessible panel, in light and dark mode', async () => {
    const { site, tabId } = await openSite();
    const engine = await readFile(new URL('a11y-checker.iife.js', `file://${EXTENSION}/`), 'utf8');

    for (const colorScheme of ['light', 'dark'] as const) {
      const panel = await openPanel(tabId);
      await panel.emulateMedia({ colorScheme });
      await runCheck(panel);
      await panel.evaluate(() => {
        document.querySelectorAll('details').forEach((d) => (d.open = true));
      });
      // Extension pages block injected <script> tags; evaluate bypasses that CSP.
      await panel.evaluate(`${engine};void 0`);
      const json = await panel.evaluate(async () => {
        const api = (
          globalThis as unknown as {
            A11yChecker: {
              check(o: object): Promise<unknown>;
              toJSON(r: unknown): string;
            };
          }
        ).A11yChecker;
        return api.toJSON(await api.check({ bestPractices: true }));
      });
      const result = JSON.parse(json) as {
        issues: { outcome: string; ruleId: string; nodes: { target: string[][] }[] }[];
      };
      const violations = result.issues
        .filter((i) => i.outcome === 'violation')
        .map((i) => [i.ruleId, i.nodes.map((n) => n.target)]);
      expect(violations, `${colorScheme} mode`).toEqual([]);
      await panel.close();
    }
    await site.close();
  });
});
