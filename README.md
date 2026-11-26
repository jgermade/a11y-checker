# a11y-checker

An accessibility validator with a multi-engine core. It is offered as an SDK and as a
browser extension for Chrome and Firefox. E2E test integrations will follow.

The first engine provider wraps [axe-core](https://github.com/dequelabs/axe-core).
IBM Equal Access and an in-house engine are planned. See the
[current roadmap](ROADMAP/2026-11-26/overview.md).

## Packages

| Package                                           | Description                                          |
| ------------------------------------------------- | ---------------------------------------------------- |
| [`@a11y-checker/core`](packages/core)             | Engine core: result model, config, runner, WCAG data |
| [`@a11y-checker/engine-axe`](packages/engine-axe) | axe-core engine provider                             |

## Development

Requires Node 22+ and pnpm (via Corepack: `corepack enable`).

```bash
pnpm install
pnpm build        # build all packages
pnpm test         # unit tests (happy-dom) + browser tests (Chromium)
pnpm test:unit    # happy-dom only
pnpm lint
pnpm typecheck
pnpm format
```

Browser tests run in Chromium through Vitest browser mode. Install the browser once with
`pnpm exec playwright install chromium`.

Tests named `*.browser.test.ts` run in a real browser. Use them for anything that depends
on layout or rendering. All other `*.test.ts` files run in happy-dom.

To record a change to a published package, run `pnpm changeset`.

## Repository conventions

- [`AGENTS.md`](AGENTS.md) contains the rules for agents and humans. `CLAUDE.md` is a
  symlink to it.
- [`ROADMAP/`](ROADMAP/) holds the project plan, by date, with Mermaid Gantt diagrams.
- [`RECORD/`](RECORD/) is the project memory (`.WIP` files are append-only, `.completed`
  files are read-only).

All code and documentation in this repository are written in English.

## License

[MIT](LICENSE)
