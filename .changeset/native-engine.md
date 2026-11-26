---
'@a11y-checker/core': minor
'@a11y-checker/engine-native': minor
'@a11y-checker/engine-ibm': patch
'@a11y-checker/playwright': minor
'@a11y-checker/cli': minor
'@a11y-checker/extension': minor
---

Add `@a11y-checker/engine-native`, a11y-checker's own engine. It has 12 rules that implement W3C ACT rules (image, button, link, form field and iframe names; page and element language; page title; aria-hidden focus; valid roles; label in name). All 204 official ACT test cases of these rules are consistent. It comes with an ACT test harness, an EARL report and a benchmark against axe-core and IBM Equal Access.

The Playwright adapter, the CLI (`--engines native`) and the extension can run it. Core adds `createScopeFilter()` and `composedAncestors()`, which the IBM engine now uses.
