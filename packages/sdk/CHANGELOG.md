# @a11y-checker/sdk

## 0.0.1

### Patch Changes

- ec94e54: E2E integrations:

  - `@a11y-checker/matchers`: `toBeAccessible()` and `toHaveNoViolations()` for Vitest and Jest.
  - `@a11y-checker/playwright`: `checkA11y(page | locator)` and the `toBeAccessible()` matcher, with reports attached to the test.
  - `@a11y-checker/cypress`: `cy.checkA11y()`.
  - `@a11y-checker/cli`: the `a11y-checker` command, with text, JSON, SARIF and HTML output and exit codes for CI.
  - SDK: `check({ element })` checks a single element. New `toText()`, `formatIssues()` and `violationsAtLeast()` reporters. The browser bundle exports `createAxeEngine` and `toText`.

- ec94e54: Add the IBM Equal Access engine (`@a11y-checker/engine-ibm`) and merge duplicate issues across engines (`dedupe`, on by default). Merged issues list `relatedRules`, and each merged node lists the `engines` that reported it. New `getNodeTarget()` and `resolveTarget()` helpers. Reporters show related rules and engines. In the extension, engines can be chosen in the settings, and results can be filtered by engine.
- ec94e54: First release. The core provides the result model, config, runner and WCAG data. The axe-core engine provider is included. The SDK provides `check()`, `createChecker()`, an injectable IIFE bundle, and JSON, SARIF and HTML reporters. The browser extension (Chrome and Firefox) adds a DevTools panel to check pages, highlight and inspect elements, and export reports.
- Updated dependencies [ec94e54]
- Updated dependencies [ec94e54]
- Updated dependencies [ec94e54]
  - @a11y-checker/core@0.0.1
  - @a11y-checker/engine-axe@0.0.1
