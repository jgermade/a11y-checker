# @a11y-checker/playwright

Accessibility checks for [Playwright](https://playwright.dev): `checkA11y()` and an
`expect(...).toBeAccessible()` matcher, for pages and locators.

```bash
npm install -D @a11y-checker/playwright
# Optional, for the IBM Equal Access and the native (ACT rules) engines:
npm install -D @a11y-checker/engine-ibm @a11y-checker/engine-native
```

## Matcher

```ts
// fixtures.ts
import { expect as base } from '@playwright/test';
import { a11yMatchers } from '@a11y-checker/playwright';

export const expect = base.extend(a11yMatchers);
```

```ts
import { test } from '@playwright/test';
import { expect } from './fixtures';

test('home page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toBeAccessible();
  await expect(page.getByRole('dialog')).toBeAccessible({ failOn: 'serious' });
  await expect(page).toBeAccessible({ engines: ['axe', 'ibm'], wcag: { level: 'AA' } });
});
```

- On failure, the message lists each violation with its rule, WCAG criteria, selector and
  fix suggestions.
- The HTML and JSON reports are attached to the test, so they appear in Playwright's HTML
  report. Pass `attach: false` to skip this.
- `failOn` sets the lowest impact that fails. The default, `'minor'`, fails on every
  violation.

## checkA11y

```ts
import { checkA11y } from '@a11y-checker/playwright';

const result = await checkA11y(page, { wcag: { version: '2.2', level: 'AA' } });
const form = await checkA11y(page.locator('form'));
const widget = await checkA11y(page.frameLocator('#widget').locator('body'));
```

It returns the SDK's `CheckResult` plus `frames: { total, checked }`.

## How it works

- The SDK's browser bundle (axe-core included) is loaded into **every frame** of the page,
  including cross-origin iframes. The bundle is evaluated through Playwright, so a page's
  Content Security Policy cannot block it.
- Frames may exchange results across origins only while the check runs.
- With `engines: ['axe', 'ibm', 'native']`, the IBM Equal Access engine and a11y-checker's
  own engine are loaded too, and issues that several engines report on the same element
  are merged.
- A locator check covers that element only, and runs in the locator's own frame.
- The page objects are typed structurally, so the package has no hard dependency on
  Playwright's types.

## License

MIT
