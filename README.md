# a11y-checker

An accessibility validator with a multi-engine core. It is offered as an SDK and as a
browser extension for Chrome and Firefox. E2E test integrations will follow.

Three engines are available: [axe-core](https://github.com/dequelabs/axe-core) (the
default), [IBM Equal Access](https://github.com/IBMa/equal-access), and a11y-checker's
own engine, whose rules are W3C ACT rules validated against every official test case
([ACT benchmark](packages/engine-native/ACT-REPORT.md)). Issues that several engines
report on the same element are merged. See the
[current roadmap](ROADMAP/2026-11-26/overview.md).

## Packages

| Package                                                 | Description                                                                  |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [`@a11y-checker/sdk`](packages/sdk)                     | **Start here.** Public API, reporters (JSON, SARIF, HTML), browser bundle    |
| [`@a11y-checker/core`](packages/core)                   | Engine core: result model, config, runner, WCAG data                         |
| [`@a11y-checker/engine-axe`](packages/engine-axe)       | axe-core engine provider                                                     |
| [`@a11y-checker/engine-ibm`](packages/engine-ibm)       | IBM Equal Access engine provider                                             |
| [`@a11y-checker/engine-native`](packages/engine-native) | a11y-checker's own engine: W3C ACT rules, all official test cases consistent |
| [`@a11y-checker/matchers`](packages/matchers)           | `toBeAccessible()` for Vitest and Jest                                       |
| [`@a11y-checker/playwright`](packages/playwright)       | `checkA11y()` and `toBeAccessible()` for Playwright                          |
| [`@a11y-checker/cypress`](packages/cypress)             | `cy.checkA11y()` for Cypress                                                 |
| [`@a11y-checker/cli`](packages/cli)                     | Command line and CI: scan URLs, SARIF/HTML/JSON reports                      |

## Development

Requires Node 22+ and pnpm (via Corepack: `corepack enable`).

```bash
pnpm install
pnpm build        # build all packages
pnpm test         # unit (happy-dom) + browser (Chromium) + e2e (built artifacts)
pnpm test:unit    # happy-dom only
pnpm test:e2e     # builds everything, then tests the IIFE bundle and the extension
pnpm lint
pnpm typecheck
pnpm format
```

Browser tests run in Chromium through Vitest browser mode. Install the browser once with
`pnpm exec playwright install chromium`. The Cypress e2e test needs the Cypress binary
(`pnpm --filter @a11y-checker/cypress exec cypress install`); without it, that test is
skipped locally.

Tests named `*.browser.test.ts` run in a real browser. Use them for anything that depends
on layout or rendering. All other `*.test.ts` files run in happy-dom.

To record a change to a published package, run `pnpm changeset`.

## Releasing

Packages are published by `.github/workflows/release.yml` with
[Changesets](https://github.com/changesets/changesets). When there are pending changesets
on `main`, it opens a "Version packages" PR; merging that PR publishes to npm. This needs
an `NPM_TOKEN` repository secret with publish access to the `@a11y-checker` scope.

To publish manually from a local checkout of `main`, run `make publish` after
`npm login`. It applies pending changesets (committing them as "Version packages"),
runs every check and runs `changeset publish`. Push the commit and tags afterwards with
`git push --follow-tags`. Local publishes have no npm provenance. `make publish-dry-run`
builds and shows what would be published without publishing.

## Repository conventions

- [`AGENTS.md`](AGENTS.md) contains the rules for agents and humans. `CLAUDE.md` is a
  symlink to it.
- [`ROADMAP/`](ROADMAP/) holds the project plan, by date, with Mermaid Gantt diagrams.
- [`RECORD/`](RECORD/) is the project memory (`.WIP` files are append-only, `.completed`
  files are read-only).

All code and documentation in this repository are written in English.

## License

[MIT](LICENSE)
