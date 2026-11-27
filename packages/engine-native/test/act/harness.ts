// Runs the W3C ACT test cases stored in this folder against one or more engines.
// Each test case is opened as a top-level page at its original w3.org URL, served
// from the local files, so page-level rules see a real top-level document.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page, Request } from 'playwright';
import { BROWSER_TYPES, type BrowserName } from '../../../../test-browsers.js';

const require = createRequire(import.meta.url);
const ACT_DIR = fileURLToPath(new URL('.', import.meta.url));
const BASE = 'https://www.w3.org/WAI/content-assets/wcag-act-rules/';

export type ActOutcome = 'passed' | 'failed' | 'cantTell' | 'inapplicable';
export type Expected = 'passed' | 'failed' | 'inapplicable';
export type EngineName = 'native' | 'axe' | 'ibm';

export interface TestCase {
  ruleId: string;
  ruleName: string;
  testcaseId: string;
  testcaseTitle: string;
  expected: Expected;
  path: string;
  url: string;
}

export interface CaseResult {
  testcase: TestCase;
  outcomes: Partial<Record<EngineName, ActOutcome>>;
}

export async function loadTestCases(): Promise<TestCase[]> {
  const manifest = JSON.parse(await readFile(join(ACT_DIR, 'testcases.json'), 'utf8')) as {
    testcases: TestCase[];
  };
  return manifest.testcases;
}

/**
 * ACT consistency of one outcome: `consistent`, `partial` (cantTell where the expected
 * outcome is failed or passed), or `inconsistent`.
 */
export function consistency(
  expected: Expected,
  actual: ActOutcome,
): 'consistent' | 'partial' | 'inconsistent' {
  if (actual === 'cantTell') return 'partial';
  if (expected === 'failed') return actual === 'failed' ? 'consistent' : 'inconsistent';
  // Passed and inapplicable examples must not fail; either non-failing outcome is fine.
  return actual === 'failed' ? 'inconsistent' : 'consistent';
}

// Like w3.org, which serves the test cases as UTF-8.
const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

const BUNDLES: Record<EngineName, string> = {
  native: require.resolve('@a11y-checker/engine-native/iife'),
  axe: require.resolve('@a11y-checker/sdk/iife'),
  ibm: require.resolve('@a11y-checker/engine-ibm/iife'),
};

// Runs in the page: the ACT outcome of each engine for one ACT rule.
async function outcomesInPage({
  actRuleId,
  engines,
}: {
  actRuleId: string;
  engines: EngineName[];
}): Promise<Partial<Record<EngineName, ActOutcome>>> {
  interface Issue {
    outcome: string;
    actRuleIds: string[];
  }
  const scope = globalThis as unknown as {
    A11yCheckerNative?: {
      RULES: { actRuleIds: string[] }[];
      runRules(doc: Document, rules: unknown[]): unknown[];
      ruleOutcome(result: unknown): ActOutcome;
    };
    A11yChecker?: {
      check(options: object): Promise<{ issues: Issue[] }>;
      createAxeEngine(): unknown;
    };
    A11yCheckerIbm?: { createIbmEngine(): unknown };
  };
  const fromIssues = (issues: Issue[]): ActOutcome => {
    const mine = issues.filter((issue) => issue.actRuleIds.includes(actRuleId));
    if (mine.some((i) => i.outcome === 'violation')) return 'failed';
    if (mine.some((i) => i.outcome === 'incomplete')) return 'cantTell';
    return mine.some((i) => i.outcome === 'pass') ? 'passed' : 'inapplicable';
  };
  // Everything, so that each engine's own mapping decides.
  const config = {
    wcag: { version: '2.2', level: 'AAA' },
    bestPractices: true,
    dedupe: false,
    outcomes: ['violation', 'incomplete', 'pass', 'inapplicable'],
  };

  const outcomes: Partial<Record<EngineName, ActOutcome>> = {};
  for (const engine of engines) {
    if (engine === 'native' && scope.A11yCheckerNative) {
      const api = scope.A11yCheckerNative;
      const rules = api.RULES.filter((r) => r.actRuleIds.includes(actRuleId));
      const results = api.runRules(document, rules);
      outcomes.native = results.length ? api.ruleOutcome(results[0]) : 'inapplicable';
    } else if (engine === 'axe' && scope.A11yChecker) {
      const result = await scope.A11yChecker.check({
        ...config,
        engines: [scope.A11yChecker.createAxeEngine()],
      });
      outcomes.axe = fromIssues(result.issues);
    } else if (engine === 'ibm' && scope.A11yChecker && scope.A11yCheckerIbm) {
      const result = await scope.A11yChecker.check({
        ...config,
        engines: [scope.A11yCheckerIbm.createIbmEngine()],
      });
      outcomes.ibm = fromIssues(result.issues);
    }
  }
  return outcomes;
}

async function inject(page: Page, engines: EngineName[]): Promise<void> {
  const names = new Set<EngineName>(engines);
  if (names.has('ibm')) names.add('axe'); // the IBM engine runs through the SDK
  for (const name of names) {
    await page.evaluate(`${await readFile(BUNDLES[name], 'utf8')}\n;void 0`);
  }
}

/**
 * Runs every test case (optionally only some rules) against the given engines, in the
 * given browser (Chromium by default).
 */
export async function runActSuite(
  engines: EngineName[],
  filter: (testcase: TestCase) => boolean = () => true,
  browserName: BrowserName = 'chromium',
): Promise<CaseResult[]> {
  const testcases = (await loadTestCases()).filter(filter);
  const browser = await BROWSER_TYPES[browserName].launch();
  const context = await browser.newContext();
  // Test cases with a meta refresh reload or redirect the page. Only the first
  // top-level navigation of each test case goes through, so the checked document stays.
  // Later ones get "204 No Content", which browsers ignore (an aborted navigation would
  // replace the page with an error page).
  let topLevelNavigations = 0;
  const isTopLevelNavigation = (request: Request) =>
    request.isNavigationRequest() && request.frame().parentFrame() === null;
  await context.route(`${BASE}**`, async (route) => {
    const request = route.request();
    if (isTopLevelNavigation(request) && ++topLevelNavigations > 1) {
      await route.fulfill({ status: 204 });
      return;
    }
    const path = new URL(request.url()).pathname.replace('/WAI/content-assets/wcag-act-rules/', '');
    try {
      const contentType = CONTENT_TYPES[extname(path)] ?? 'application/octet-stream';
      let body = await readFile(join(ACT_DIR, path));
      // Playwright's WebKit ignores the charset of a fulfilled response and decodes
      // pages without <meta charset> as windows-1252 ("…" becomes "â€¦"). A UTF-8 BOM
      // fixes the encoding in every browser without changing the document.
      if (contentType.includes('charset=utf-8') && !body.subarray(0, 3).equals(UTF8_BOM)) {
        body = Buffer.concat([UTF8_BOM, body]);
      }
      await route.fulfill({ body, contentType });
    } catch {
      await route.fulfill({ status: 404, body: '' });
    }
  });
  // Nothing else is needed: block the network so results never depend on it.
  await context.route(
    /^(?!https:\/\/www\.w3\.org\/WAI\/content-assets\/wcag-act-rules\/)/,
    (route) =>
      isTopLevelNavigation(route.request()) ? route.fulfill({ status: 204 }) : route.abort(),
  );

  const results: CaseResult[] = [];
  try {
    const page = await context.newPage();
    for (const testcase of testcases) {
      topLevelNavigations = 0;
      await page.goto(testcase.url, { waitUntil: 'load' });
      await inject(page, engines);
      const outcomes = await page.evaluate(outcomesInPage, { actRuleId: testcase.ruleId, engines });
      results.push({ testcase, outcomes });
    }
  } finally {
    await browser.close();
  }
  return results;
}
