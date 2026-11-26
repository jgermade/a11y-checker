# Post-MVP plan (2026-11-26)

These phases come after the MVP. The order and durations will be reviewed at MVP release,
and a new dated roadmap will be created if the plan changes.

```mermaid
gantt
    title Post-MVP
    dateFormat YYYY-MM-DD
    excludes weekends
    section P1 IBM Equal Access
    IBM provider                          :p1a, 2027-02-15, 6d
    Cross-engine dedup via ACT/WCAG       :p1b, after p1a, 6d
    Extension: per-engine filters         :p1c, after p1b, 3d
    section P2 E2E integrations
    Playwright adapter + matchers         :p2a, after p1c, 6d
    Cypress adapter                       :p2b, after p2a, 4d
    Vitest/Jest matchers (DOM-only)       :p2c, after p2b, 3d
    CLI (URL scan, CI thresholds)         :p2d, after p2c, 7d
    section P3 In-house engine
    Rule authoring API + ACT test harness :p3a, after p2d, 8d
    Accessibility tree (accname, roles)   :p3b, after p3a, 10d
    First rule set (ACT-validated)        :p3c, after p3b, 17d
    Benchmark vs axe/IBM + docs           :p3d, after p3c, 5d
```

## P1 — IBM Equal Access provider

- `engine-ibm` wraps `accessibility-checker-engine` behind the same `EngineProvider` interface.
- Results from different engines that point to the same node and the same ACT rule or WCAG
  criterion are merged into one issue that lists every engine that reported it.
- The extension and the reporters can filter results by engine.

## P2 — E2E integrations

- `@a11y-checker/playwright`: `checkA11y(page, options)` plus a `toBeAccessible()` matcher.
  Results are attached to the test report.
- `@a11y-checker/cypress`: a `cy.checkA11y()` command.
- Vitest/Jest matchers for component tests (DOM-only rules).
- CLI: scan a list of URLs, apply failure thresholds, output SARIF for CI.
- Later: screen reader automation (e.g. Guidepup) and keyboard-flow testing.

## P3 — In-house engine

- A rule authoring API modeled on the W3C ACT Rules format (applicability and expectations).
- An accessibility tree layer built on `aria-query` and `dom-accessibility-api`, with the
  option to use the browser's own tree through CDP when it is available.
- The first rule set targets gaps and known false positives in axe/IBM. Every rule must
  pass the corresponding ACT test cases, and we publish an EARL conformance report.
- The goal is a high-quality set of complementary rules, not parity with axe.
