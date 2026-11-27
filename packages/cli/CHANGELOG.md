# @a11y-checker/cli

## 0.0.1

### Patch Changes

- ec94e54: E2E integrations:

  - `@a11y-checker/matchers`: `toBeAccessible()` and `toHaveNoViolations()` for Vitest and Jest.
  - `@a11y-checker/playwright`: `checkA11y(page | locator)` and the `toBeAccessible()` matcher, with reports attached to the test.
  - `@a11y-checker/cypress`: `cy.checkA11y()`.
  - `@a11y-checker/cli`: the `a11y-checker` command, with text, JSON, SARIF and HTML output and exit codes for CI.
  - SDK: `check({ element })` checks a single element. New `toText()`, `formatIssues()` and `violationsAtLeast()` reporters. The browser bundle exports `createAxeEngine` and `toText`.

- ec94e54: Add `@a11y-checker/engine-native`, a11y-checker's own engine. It has 12 rules that implement W3C ACT rules (image, button, link, form field and iframe names; page and element language; page title; aria-hidden focus; valid roles; label in name). All 204 official ACT test cases of these rules are consistent. It comes with an ACT test harness, an EARL report and a benchmark against axe-core and IBM Equal Access.

  The Playwright adapter, the CLI (`--engines native`) and the extension can run it. Core adds `createScopeFilter()` and `composedAncestors()`, which the IBM engine now uses.

- Updated dependencies [ec94e54]
- Updated dependencies [ec94e54]
- Updated dependencies [ec94e54]
- Updated dependencies [ec94e54]
  - @a11y-checker/sdk@0.0.1
  - @a11y-checker/playwright@0.0.1
  - @a11y-checker/core@0.0.1
  - @a11y-checker/engine-ibm@0.0.1
  - @a11y-checker/engine-native@0.0.1
