// A real @playwright/test project using the published entry point of the package.
import { a11yMatchers } from '@a11y-checker/playwright';
import { expect as base, test } from '@playwright/test';
import { serve } from '../site.js';

const expect = base.extend(a11yMatchers);

test.beforeEach(async ({ page }) => {
  await serve(page);
});

test('accessible page', async ({ page }) => {
  await page.goto('http://site.test/good');
  await expect(page).toBeAccessible();
});

test('page with violations', async ({ page }) => {
  await page.goto('http://site.test/');
  await expect(page).not.toBeAccessible();
  await expect(page.locator('h1')).toBeAccessible();
});

test('failing assertion', async ({ page }) => {
  test.fail(); // expected to fail: the page has violations
  await page.goto('http://site.test/');
  await expect(page).toBeAccessible({ engines: ['axe', 'ibm'] });
});
