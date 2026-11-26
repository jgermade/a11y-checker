# @a11y-checker/core

The environment-agnostic core of a11y-checker. It only needs `window` and `document`, so it
runs in browser extensions, in E2E test runners and in simulated DOMs (happy-dom, jsdom).

It defines:

- **The result model**: `Issue`, `IssueNode`, `CheckResult`. Each issue maps to WCAG success
  criteria and W3C ACT rule IDs.
- **The config**: `CheckConfig`, validated and filled with defaults by `resolveConfig()`.
- **The `EngineProvider` interface**, which every engine implements (axe-core, IBM Equal
  Access, the in-house engine).
- **The runner**: `runCheck()` runs the engines and merges, filters and sorts their results.
- **WCAG data**: every WCAG 2.x success criterion with its level and version
  (`SUCCESS_CRITERIA`, `isCriterionInScope()`).

## Usage

```ts
import { runCheck } from '@a11y-checker/core';
import { createAxeEngine } from '@a11y-checker/engine-axe';

const result = await runCheck({
  engines: [createAxeEngine()],
  config: {
    wcag: { version: '2.2', level: 'AA' }, // default
    include: ['main'],
    exclude: ['.third-party-widget'],
    outcomes: ['violation', 'incomplete'], // default
  },
});

for (const issue of result.issues) {
  console.log(issue.impact, issue.ruleId, issue.wcag, issue.nodes.length);
}
```

## Config

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
