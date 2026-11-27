# @a11y-checker/matchers

## 0.2.0

### Minor Changes

- Maintenance release.

### Patch Changes

- Updated dependencies
  - @a11y-checker/sdk@0.2.0

## 0.0.2

### Patch Changes

- Maintenance release.
- Updated dependencies
  - @a11y-checker/sdk@0.0.2

## 0.0.1

### Patch Changes

- ec94e54: E2E integrations:

  - `@a11y-checker/matchers`: `toBeAccessible()` and `toHaveNoViolations()` for Vitest and Jest.
  - `@a11y-checker/playwright`: `checkA11y(page | locator)` and the `toBeAccessible()` matcher, with reports attached to the test.
  - `@a11y-checker/cypress`: `cy.checkA11y()`.
  - `@a11y-checker/cli`: the `a11y-checker` command, with text, JSON, SARIF and HTML output and exit codes for CI.
  - SDK: `check({ element })` checks a single element. New `toText()`, `formatIssues()` and `violationsAtLeast()` reporters. The browser bundle exports `createAxeEngine` and `toText`.

- Updated dependencies [ec94e54]
- Updated dependencies [ec94e54]
- Updated dependencies [ec94e54]
  - @a11y-checker/sdk@0.0.1
