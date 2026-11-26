# a11y-checker browser extension

A DevTools panel for Chrome and Firefox that checks the inspected page against WCAG
2.0–2.2 (levels A–AAA) with the [a11y-checker SDK](../sdk).

## Features

- **Check page**: checks the whole page, including shadow DOM and iframes, both
  same-origin and cross-origin.
- **Results** are split into violations and items that need manual review. They can be
  grouped by impact, rule or WCAG criterion, and each one links to the WCAG criterion,
  the W3C ACT rules and the rule documentation.
- **Highlight** marks an element in the page. **Inspect** (in DevTools only) opens the
  element in the Elements panel.
- **Settings**: WCAG version and level, best practices, and whether to show items that
  need review. Settings are saved.
- **Export** to JSON, SARIF 2.1.0 or a standalone HTML report.
- The panel warns when the page has changed since the last check, and when some frames
  could not be checked (for example, sandboxed frames).

## How it works

Nothing runs in a page until **Check page** is clicked. Then the background service
worker:

1. Injects the SDK's IIFE bundle (`a11y-checker.iife.js`, axe-core included) into every
   frame of the tab that does not have it yet. It runs in the extension's isolated world,
   so page scripts cannot see or tamper with it.
2. Lets the frames of that tab, and only those origins, exchange results across origins.
3. Runs the check from the top frame and sends the result to the panel.
4. Restores the same-origin default, so no cross-origin channel stays open.

Results never leave the browser. Highlighting draws an overlay in the page, and the
overlay is removed before each new check.

## Permissions

| Permission                 | Why                                                             |
| -------------------------- | --------------------------------------------------------------- |
| `scripting`                | Inject the checker into the inspected page when you run a check |
| `storage`                  | Remember your settings                                          |
| `<all_urls>` (host access) | Check any page you inspect, including its cross-origin iframes  |

## Development

```bash
pnpm install
pnpm --filter @a11y-checker/sdk build    # the extension ships the SDK's IIFE bundle
pnpm --filter @a11y-checker/extension dev           # Chrome, with live reload
pnpm --filter @a11y-checker/extension dev:firefox   # Firefox
```

To load a production build by hand:

```bash
pnpm build
```

- **Chrome**: open `chrome://extensions`, enable _Developer mode_, choose _Load
  unpacked_, and select `packages/extension/.output/chrome-mv3`.
- **Firefox**: open `about:debugging#/runtime/this-firefox`, choose _Load Temporary
  Add-on_, and select `packages/extension/.output/firefox-mv3/manifest.json`.

Then open DevTools on any page and select the **a11y-checker** panel.

### Tests

- `test/*.test.ts` (unit, happy-dom): settings, grouping, export.
- `test/locate.browser.test.ts` (Chromium): finding and highlighting nodes through shadow
  DOM and frames.
- `test/extension.e2e.test.ts` loads the built Chrome extension in Chromium. It opens the
  panel as a regular extension page with `?tabId=<id>` (the same code without DevTools)
  and checks a test site that has shadow DOM and same-origin, cross-origin and sandboxed
  iframes. It covers highlighting, export, settings, stale results, and the panel's own
  accessibility in light and dark mode.

### Packaging for the stores

```bash
pnpm --filter @a11y-checker/extension zip           # Chrome + Firefox zips, plus sources
pnpm --filter @a11y-checker/extension lint:firefox  # Mozilla's add-on linter
```

The zips are written to `.output/`:

- `a11y-checker-<version>-chrome.zip` for the Chrome Web Store.
- `a11y-checker-<version>-firefox.zip` and `a11y-checker-<version>-sources.zip` for
  Firefox Add-ons (AMO).

CI also attaches them to every run as the `browser-extension` artifact. See
[STORE.md](STORE.md) for the listing texts and review notes.
