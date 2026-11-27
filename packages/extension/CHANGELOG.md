# @a11y-checker/extension

## 0.0.1

### Patch Changes

- ec94e54: Add the IBM Equal Access engine (`@a11y-checker/engine-ibm`) and merge duplicate issues across engines (`dedupe`, on by default). Merged issues list `relatedRules`, and each merged node lists the `engines` that reported it. New `getNodeTarget()` and `resolveTarget()` helpers. Reporters show related rules and engines. In the extension, engines can be chosen in the settings, and results can be filtered by engine.
- ec94e54: First release. The core provides the result model, config, runner and WCAG data. The axe-core engine provider is included. The SDK provides `check()`, `createChecker()`, an injectable IIFE bundle, and JSON, SARIF and HTML reporters. The browser extension (Chrome and Firefox) adds a DevTools panel to check pages, highlight and inspect elements, and export reports.
- ec94e54: Add `@a11y-checker/engine-native`, a11y-checker's own engine. It has 12 rules that implement W3C ACT rules (image, button, link, form field and iframe names; page and element language; page title; aria-hidden focus; valid roles; label in name). All 204 official ACT test cases of these rules are consistent. It comes with an ACT test harness, an EARL report and a benchmark against axe-core and IBM Equal Access.

  The Playwright adapter, the CLI (`--engines native`) and the extension can run it. Core adds `createScopeFilter()` and `composedAncestors()`, which the IBM engine now uses.

- 79baa73: The DevTools panel waits for the stored settings before showing its controls, so a change made right after opening it is no longer overwritten.
- Updated dependencies [ec94e54]
- Updated dependencies [ec94e54]
- Updated dependencies [ec94e54]
- Updated dependencies [ec94e54]
  - @a11y-checker/sdk@0.0.1
  - @a11y-checker/core@0.0.1
  - @a11y-checker/engine-ibm@0.0.1
  - @a11y-checker/engine-native@0.0.1
