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

Browser and e2e tests run in Chromium, Firefox and WebKit (Vitest browser mode and
Playwright). Install the browsers once with
`pnpm exec playwright install chromium firefox webkit` (add `--with-deps` on Linux). To
run only some of them, set `A11Y_CHECKER_BROWSERS`, for example
`A11Y_CHECKER_BROWSERS=chromium pnpm test`. The browser extension e2e test always runs in
Chromium, because Playwright can only load extensions there. The Cypress e2e test needs the Cypress binary
(`pnpm --filter @a11y-checker/cypress exec cypress install`); without it, that test is
skipped locally.

Tests named `*.browser.test.ts` run in a real browser. Use them for anything that depends
on layout or rendering. All other `*.test.ts` files run in happy-dom.

To record a change to a published package, run `pnpm changeset`.

## Releasing

All packages share one version. To release, run the **Release** workflow
(`.github/workflows/release.yml`) by hand from the Actions tab, on `main`, and choose the
bump: `patch`, `minor` or `major`. The workflow:

1. Applies that bump to every package with
   [Changesets](https://github.com/changesets/changesets). Pending changesets only provide
   the changelog text; their own bump types are replaced by the chosen one.
2. Calls `.github/workflows/build.yml` on the release commit to test and build it.
3. Fast-forwards `main` to the "Release vX.Y.Z" commit, publishes the built packages to
   npm and pushes the version tags.

`build.yml` also runs on every push, as the regular CI.

The workflow uses npm [trusted publishing](https://docs.npmjs.com/trusted-publishers)
(OIDC), so no npm token is stored in GitHub. Each public package needs a trusted
publisher on npmjs.com with repository `jgermade/a11y-checker`, workflow `release.yml`
and environment `production`. A new package must be published once by hand (for example
with `make publish`) before its trusted publisher can be added.

To publish manually from a local checkout of `main`, run `make publish BUMP=minor` (or
`patch`, `major`) after `npm login`. It applies the bump the same way, commits it as
"Release vX.Y.Z", runs every check and runs `changeset publish`. Push the commit and tags afterwards with
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
