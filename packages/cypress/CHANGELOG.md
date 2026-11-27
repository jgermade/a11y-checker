# @a11y-checker/cypress

## 0.1.0

### Minor Changes

- ec94e54: E2E integrations:

  - `@a11y-checker/matchers`: `toBeAccessible()` and `toHaveNoViolations()` for Vitest and Jest.
  - `@a11y-checker/playwright`: `checkA11y(page | locator)` and the `toBeAccessible()` matcher, with reports attached to the test.
  - `@a11y-checker/cypress`: `cy.checkA11y()`.
  - `@a11y-checker/cli`: the `a11y-checker` command, with text, JSON, SARIF and HTML output and exit codes for CI.
  - SDK: `check({ element })` checks a single element. New `toText()`, `formatIssues()` and `violationsAtLeast()` reporters. The browser bundle exports `createAxeEngine` and `toText`.

### Patch Changes

- Updated dependencies [ec94e54]
- Updated dependencies [ec94e54]
- Updated dependencies [ec94e54]
- Updated dependencies [ec94e54]
  - @a11y-checker/sdk@0.1.0
  - @a11y-checker/core@0.1.0
