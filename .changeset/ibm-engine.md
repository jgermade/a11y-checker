---
'@a11y-checker/core': minor
'@a11y-checker/engine-ibm': minor
'@a11y-checker/sdk': minor
'@a11y-checker/extension': minor
---

Add the IBM Equal Access engine (`@a11y-checker/engine-ibm`) and merge duplicate issues across engines (`dedupe`, on by default). Merged issues list `relatedRules`, and each merged node lists the `engines` that reported it. New `getNodeTarget()` and `resolveTarget()` helpers. Reporters show related rules and engines. In the extension, engines can be chosen in the settings, and results can be filtered by engine.
