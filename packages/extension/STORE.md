# Store listing and review notes

Texts and answers for the Chrome Web Store and Firefox Add-ons (AMO) submissions.

## Listing

**Name:** a11y-checker

**Summary (132 characters max):** Check web pages for WCAG 2.2 accessibility issues from a
DevTools panel, then highlight elements and export reports.

**Description:**

> a11y-checker adds an accessibility panel to your browser's DevTools.
>
> - Check any page against WCAG 2.0, 2.1 or 2.2 at level A, AA or AAA.
> - Results cover the whole page, including shadow DOM and iframes, even cross-origin ones.
> - See violations and the items that need a manual review. Group them by impact, rule or
>   WCAG criterion.
> - Each result links to its WCAG success criterion, the W3C ACT rules and fix guidance.
> - Highlight any element in the page, or inspect it in the Elements panel.
> - Export reports as JSON, SARIF (for CI and code scanning) or a standalone HTML page.
>
> Choose the engines: axe-core, IBM Equal Access, a11y-checker's own W3C ACT rules, or any
> combination. Issues that several engines report are merged. Everything runs locally: no data leaves your browser.
>
> Automated checks find only part of accessibility problems. Always review your pages
> manually as well.

**Category:** Developer Tools

## Permission justifications (Chrome Web Store)

- **scripting:** The extension injects its accessibility engine into the inspected tab
  only when the user clicks "Check page" in the DevTools panel. It also uses this
  permission to draw a highlight over the element the user selects.
- **storage:** Saves the user's panel settings (WCAG version and level, filters).
- **Host permissions (`<all_urls>`):** Users can check any page they open in DevTools. A
  full check must also inject the engine into the page's iframes, which often come from
  other origins (embedded widgets, video players, forms), so access to every site is
  needed. Nothing runs until the user starts a check.
- **Remote code:** None. All code is bundled in the package.

## Privacy

- **Data collection:** none. The extension does not collect, transmit or sell any data.
  Results stay in the DevTools panel unless the user exports a file.
- Firefox manifest: `data_collection_permissions.required = ["none"]`.

## Notes for Firefox reviewers

- Build from `a11y-checker-<version>-sources.zip`:

  ```bash
  corepack enable
  pnpm install --frozen-lockfile
  pnpm --filter "@a11y-checker/extension..." build
  # Output: packages/extension/.output/firefox-mv3
  ```

  Requirements: Node 22+ and pnpm 10 (pinned in `package.json` through Corepack).

- `a11y-checker.iife.js` is the SDK's bundle. It includes
  [axe-core](https://github.com/dequelabs/axe-core) (MPL-2.0) unmodified. The linter's
  `DANGEROUS_EVAL` and `innerHTML` warnings come from axe-core's own code.
- `engine-ibm.iife.js` bundles IBM's
  [accessibility-checker-engine](https://github.com/IBMa/equal-access) (Apache-2.0)
  unmodified.
- The remaining `innerHTML` warning in the panel chunk comes from Preact's renderer.
