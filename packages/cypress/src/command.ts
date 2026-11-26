import type { CheckConfig, CheckResult, Impact } from '@a11y-checker/core';
import { formatTarget, resolveTarget } from '@a11y-checker/core';
import { formatIssues, violationsAtLeast } from '@a11y-checker/sdk/reporters';
import { checkWindow } from './check.js';

export interface CheckA11yOptions extends CheckConfig {
  /**
   * Lowest impact that fails the command. Default: `'minor'`, so every violation
   * fails. Use `'none'` to only yield the result.
   */
  failOn?: Impact | 'none';
  /** Log each violation in the Cypress command log. Default: `true`. */
  log?: boolean;
}

// Cypress' overloads for optional-subject commands are hard to satisfy; the public
// signature is declared on `Chainable` below.
type AddCommand = (
  name: string,
  options: { prevSubject: 'optional' },
  fn: (subject: JQuery | undefined, options?: CheckA11yOptions) => unknown,
) => void;

/** Registers `cy.checkA11y()`. `@a11y-checker/cypress/support` calls it for you. */
export function registerA11yCommands(): void {
  (Cypress.Commands.add as unknown as AddCommand)(
    'checkA11y',
    { prevSubject: 'optional' },
    (subject: JQuery | undefined, options: CheckA11yOptions = {}) => {
      const { failOn = 'minor', log = true, ...config } = options;
      const element = subject?.get(0);
      return cy.window({ log: false }).then(async (win): Promise<CheckResult> => {
        const result = await checkWindow(win, config, element);
        const failing = failOn === 'none' ? [] : violationsAtLeast(result, failOn);

        if (log) {
          for (const issue of violationsAtLeast(result, 'minor')) {
            const elements = issue.nodes
              .map((node) => resolveTarget(win.document, node.target))
              .filter((el): el is HTMLElement => el !== null);
            Cypress.log({
              name: 'a11y',
              displayName: issue.impact ? `a11y ${issue.impact}` : 'a11y',
              message: `${issue.ruleId}: ${issue.help} (${issue.nodes.length})`,
              $el: Cypress.$(elements),
              consoleProps: () => ({
                Rule: `${issue.engine}/${issue.ruleId}`,
                Impact: issue.impact,
                WCAG: issue.wcag.join(', '),
                Help: issue.helpUrl,
                Elements: elements,
                Selectors: issue.nodes.map((node) => formatTarget(node.target)),
              }),
            });
          }
        }

        if (failing.length > 0) {
          const threshold = failOn === 'minor' ? '' : ` with impact ${failOn} or higher`;
          throw new Error(
            `Expected no accessibility violations${threshold}, but found ${failing.length}:\n\n${formatIssues(failing)}`,
          );
        }
        return result;
      });
    },
  );
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Checks the page (or the subject element) for accessibility issues and fails
       * when a violation reaches `failOn`. Yields the `CheckResult`.
       *
       * @example
       * cy.checkA11y();
       * cy.get('form').checkA11y({ failOn: 'serious' });
       */
      checkA11y(options?: CheckA11yOptions): Chainable<CheckResult>;
    }
  }
}
