# @a11y-checker/sdk

Check web pages for accessibility issues (WCAG 2.0–2.2, levels A–AAA) in any DOM: a real
browser, a browser extension, an E2E test, or a simulated DOM such as jsdom or happy-dom.
Report the results as JSON, SARIF or a standalone HTML page.

The checks currently come from [axe-core](https://github.com/dequelabs/axe-core). Other
engines (IBM Equal Access, an in-house engine) plug into the same API.

```bash
npm install @a11y-checker/sdk
```

## Quick start

```ts
import { check, toHTML } from '@a11y-checker/sdk';

const result = await check({ wcag: { version: '2.2', level: 'AA' } });

console.log(`${result.summary.outcomes.violation} violations`);
for (const issue of result.issues) {
  console.log(issue.impact, issue.ruleId, issue.wcag.join(', '), issue.helpUrl);
}

const report = toHTML(result); // a standalone HTML page
```

## API

### `check(options?)`

Checks the page once and returns a `Promise<CheckResult>`.

| Option          | Default                       | Description                                                      |
| --------------- | ----------------------------- | ---------------------------------------------------------------- |
| `wcag.version`  | `'2.2'`                       | `'2.0'`, `'2.1'` or `'2.2'`                                      |
| `wcag.level`    | `'AA'`                        | `'A'`, `'AA'` or `'AAA'`                                         |
| `rules.include` | all rules in the WCAG target  | Run only these rule IDs, even outside the WCAG target            |
| `rules.exclude` | `[]`                          | Rule IDs to skip                                                 |
| `include`       | whole document                | CSS selectors to check                                           |
| `exclude`       | `[]`                          | CSS selectors to skip                                            |
| `outcomes`      | `['violation', 'incomplete']` | Any of `'violation'`, `'incomplete'`, `'pass'`, `'inapplicable'` |
| `bestPractices` | `false`                       | Also report rules that are not tied to a WCAG criterion          |
| `engines`       | `[createAxeEngine()]`         | Engines to run                                                   |
| `document`      | global `document`             | Document to check                                                |

Invalid options reject with a `ConfigError`.

### `createChecker(options?)`

Creates a reusable checker. The options are validated immediately, and each
`checker.check(overrides?)` call merges `overrides` over them.

```ts
const checker = createChecker({ exclude: ['.third-party'], bestPractices: true });
const page = await checker.check();
const header = await checker.check({ include: ['header'] });
```

### `CheckResult`

```ts
interface CheckResult {
  url: string;
  timestamp: string; // ISO 8601
  duration: number; // ms
  engines: { id: string; version: string }[];
  config: ResolvedConfig; // the config with defaults applied
  issues: Issue[]; // sorted: violations first, most severe first
  summary: { outcomes: Record<Outcome, number>; violationsByImpact: Record<Impact, number> };
  errors: { engine: string; message: string }[]; // engines that failed
}

interface Issue {
  id: string; // '<engine>/<ruleId>/<outcome>'
  ruleId: string;
  engine: string;
  outcome: 'violation' | 'incomplete' | 'pass' | 'inapplicable';
  impact?: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  help: string;
  helpUrl?: string;
  wcag: string[]; // e.g. ['1.4.3']; empty for best practices
  actRuleIds: string[]; // W3C ACT rule IDs
  tags: string[];
  nodes: { target: string[][]; html: string; impact?: Impact; message?: string }[];
}
```

A node `target` has one entry per frame level. Each entry is a chain of selectors that
goes through shadow roots. `formatTarget()` turns it into a string:
`[['iframe#app'], ['#host', 'button']]` → `'iframe#app → #host >>> button'`.

## Reporters

```ts
import { toJSON, toSARIF, toHTML } from '@a11y-checker/sdk';
// or, without loading any engine: import { ... } from '@a11y-checker/sdk/reporters';

toJSON(result); // string; JSON.parse() gives back the result
toSARIF(result); // SARIF 2.1.0 object; one SARIF result per node
toHTML(result); // standalone, accessible HTML page (light and dark mode)
```

In SARIF output, violations with `critical` or `serious` impact have level `error`, and
other violations have level `warning`. Incomplete results have kind `review`. The page URL
is the artifact location, and the formatted selector is the logical location.

## Browser bundle

`@a11y-checker/sdk/iife` resolves to a self-contained script (axe-core included) that
defines `window.A11yChecker`:

```ts
// Playwright
await page.addScriptTag({ path: require.resolve('@a11y-checker/sdk/iife') });
const json = await page.evaluate(async () => {
  const { check, toJSON } = window.A11yChecker;
  return toJSON(await check());
});
```

## Iframes

To check the content of an iframe, the script must be loaded in that frame too, as
content scripts with `all_frames: true` do. Same-origin frames then work without extra
setup.

**Cross-origin frames are skipped by axe-core without any warning**, unless both sides
allow each other's origin:

```ts
// In https://site.example (the parent):
A11yChecker.allowFrameOrigins([A11yChecker.SAME_ORIGIN, 'https://widget.example']);
// In https://widget.example (the frame):
A11yChecker.allowFrameOrigins([A11yChecker.SAME_ORIGIN, 'https://site.example']);
```

Results include HTML from the frame, so only allow origins you trust to see it.

## Simulated DOMs

In happy-dom and jsdom, rules that need layout (such as color contrast) are reported as
`incomplete`. To check a jsdom window that is not the global one, pass that window's axe
instance:

```ts
import axeCore from 'axe-core';
import { JSDOM } from 'jsdom';
import { check, createAxeEngine } from '@a11y-checker/sdk';

const { window } = new JSDOM(html, { runScripts: 'outside-only' });
window.eval(axeCore.source);
const result = await check({
  engines: [createAxeEngine({ axe: window.axe })],
  document: window.document,
});
```

## License

MIT. axe-core is distributed under MPL-2.0.
