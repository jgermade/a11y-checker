# @a11y-checker/matchers

`toBeAccessible()` and `toHaveNoViolations()` for Vitest and Jest, powered by
[a11y-checker](../sdk). Use them in component tests (jsdom, happy-dom or Vitest browser
mode) and on whole documents.

```bash
npm install -D @a11y-checker/matchers
```

## Setup

**Vitest** (5+), in `vitest.config.ts`:

```ts
export default defineConfig({
  test: { setupFiles: ['@a11y-checker/matchers/vitest'] },
});
```

**Jest**, in `jest.config.js`:

```js
module.exports = { setupFilesAfterEnv: ['@a11y-checker/matchers/jest'] };
```

To set the matchers up yourself, call `expect.extend(a11yMatchers)` with
`import { a11yMatchers } from '@a11y-checker/matchers'`.

## Usage

```ts
render(<SignupForm />);
await expect(screen.getByRole('form')).toBeAccessible();

// Only fail on serious and critical violations, with WCAG 2.1 AA:
await expect(document).toBeAccessible({ failOn: 'serious', wcag: { version: '2.1' } });

// Or check once and assert on the result:
const result = await check();
expect(result).toHaveNoViolations();
```

- `toBeAccessible(options?)` is async: always `await` it. It accepts an `Element`, which
  checks only that element and its descendants, or a `Document`. The options are the
  SDK's check options plus `failOn` (`'minor'` by default, so every violation fails).
- On failure, the message lists each violation with its rule, WCAG criteria, selector,
  HTML and fix suggestions.
- Simulated DOMs (jsdom, happy-dom) do not compute layout, so rules such as color
  contrast are reported as "needs review" and never fail the assertion. Use Vitest browser
  mode or the Playwright adapter for those.

## License

MIT
