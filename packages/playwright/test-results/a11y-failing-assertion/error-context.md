# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a11y.spec.ts >> failing assertion
- Location: a11y.spec.ts:23:1

# Error details

```
Error: Expected no accessibility violations, but found 2:

✖ [critical] axe/button-name: Buttons must have discernible text (WCAG 4.1.2)
    https://dequeuniversity.com/rules/axe/4.14/button-name?application=axeAPI
    also: ibm/input_label_exists
    • button
      <button></button>
      Fix any of the following:
      Element does not have inner text that is visible to screen readers
      aria-label attribute does not exist or is empty
      aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
      Element has no title attribute
      Element does not have an implicit (wrapped) <label>
      Element does not have an explicit <label>
      Element's default semantics were not overridden with role="none" or role="presentation"
      ibm: Form control element <button> has no associated label

✖ [critical] axe/image-alt: Images must have alternative text (WCAG 1.1.1)
    https://dequeuniversity.com/rules/axe/4.14/image-alt?application=axeAPI
    also: ibm/img_alt_valid
    • #main-img
      <img id="main-img" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">
      Fix any of the following:
      Element does not have an alt attribute
      aria-label attribute does not exist or is empty
      aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
      Element has no title attribute
      Element's default semantics were not overridden with role="none" or role="presentation"
      ibm: The image has neither an accessible name nor is marked as decorative or redundant
    • #cross → #cross-img
      <img id="cross-img" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">
      Fix any of the following:
      Element does not have an alt attribute
      aria-label attribute does not exist or is empty
      aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
      Element has no title attribute
      Element's default semantics were not overridden with role="none" or role="presentation"
```

# Page snapshot

```yaml
- main [ref=e2]:
  - heading "Site" [level=1] [ref=e3]
  - generic [ref=e5]:
    - generic [ref=e6]:
      - text: Name
      - textbox "Name" [ref=e7]
    - button [ref=e8]
  - iframe [ref=e9]
```

# Test source

```ts
  1  | // A real @playwright/test project using the published entry point of the package.
  2  | import { a11yMatchers } from '@a11y-checker/playwright';
  3  | import { expect as base, test } from '@playwright/test';
  4  | import { serve } from '../site.js';
  5  | 
  6  | const expect = base.extend(a11yMatchers);
  7  | 
  8  | test.beforeEach(async ({ page }) => {
  9  |   await serve(page);
  10 | });
  11 | 
  12 | test('accessible page', async ({ page }) => {
  13 |   await page.goto('http://site.test/good');
  14 |   await expect(page).toBeAccessible();
  15 | });
  16 | 
  17 | test('page with violations', async ({ page }) => {
  18 |   await page.goto('http://site.test/');
  19 |   await expect(page).not.toBeAccessible();
  20 |   await expect(page.locator('h1')).toBeAccessible();
  21 | });
  22 | 
  23 | test('failing assertion', async ({ page }) => {
  24 |   test.fail(); // expected to fail: the page has violations
  25 |   await page.goto('http://site.test/');
> 26 |   await expect(page).toBeAccessible({ engines: ['axe', 'ibm'] });
     |                      ^ Error: Expected no accessibility violations, but found 2:
  27 | });
  28 | 
```