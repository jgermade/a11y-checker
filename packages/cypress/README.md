# @a11y-checker/cypress

Accessibility checks for [Cypress](https://www.cypress.io): `cy.checkA11y()`.

```bash
npm install -D @a11y-checker/cypress
```

In `cypress/support/e2e.js` (or `.ts`):

```js
import '@a11y-checker/cypress/support';
```

## Usage

```js
it('home page', () => {
  cy.visit('/');
  cy.checkA11y(); // fails on any violation
  cy.get('form').checkA11y({ failOn: 'serious' }); // only the form, serious or worse
  cy.checkA11y({ wcag: { version: '2.1', level: 'AA' }, exclude: ['.ads'] });

  // Yield the result without failing:
  cy.checkA11y({ failOn: 'none' }).then((result) => {
    expect(result.summary.outcomes.violation).to.be.lessThan(5);
  });
});
```

- Each violation is logged in the Cypress command log, and clicking it highlights the
  elements. On failure, the error lists each violation with its selector and fix
  suggestions.
- The options are the SDK's check options, plus `failOn` (`'minor'` by default, or
  `'none'`) and `log` (default `true`).

## How it works

Cypress runs specs in a different window from the application. The command loads the
SDK's browser bundle (axe-core included) into the application's window and its
same-origin iframes, then runs the check there. The bundle ships as text inside this
package, so Cypress' bundler never rewrites it.

Cross-origin iframes are not reachable from Cypress tests. Use the Playwright adapter or
the CLI to check them.

## License

MIT
