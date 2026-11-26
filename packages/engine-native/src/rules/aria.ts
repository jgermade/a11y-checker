// ARIA rules: valid roles, and aria-hidden content that can still get focus.
import { roles } from 'aria-query';
import {
  composedElements,
  isHtmlElement,
  isInSequentialFocusNavigation,
  isProgrammaticallyHidden,
  isSvgElement,
} from '../a11y.js';
import { actUrl, defineRule, failed, passed, type NativeRule } from '../rule.js';

export const ariaHiddenFocus: NativeRule = defineRule({
  id: 'aria-hidden-focus',
  actRuleIds: ['6cfa84'],
  wcag: ['1.3.1', '4.1.2'],
  impact: 'serious',
  description: 'Content hidden with aria-hidden cannot be reached with the keyboard.',
  help: 'Remove focusable content from aria-hidden elements, or make it unfocusable (tabindex="-1", disabled or inert)',
  helpUrl: actUrl('6cfa84'),
  *applicability({ document }) {
    for (const element of composedElements(document)) {
      if (element.getAttribute('aria-hidden')?.trim().toLowerCase() === 'true') yield element;
    }
  },
  expectation(target) {
    for (const element of composedElements(target)) {
      if (isInSequentialFocusNavigation(element) && !redirectsFocus(element)) {
        return failed(
          `The aria-hidden content contains a focusable <${element.localName}> element that keyboard users can reach but screen readers do not announce.`,
        );
      }
    }
    return passed('The aria-hidden content has nothing in the keyboard navigation order.');
  },
});

/**
 * Whether an element hands focus to another element as soon as it receives it, like
 * the focus "sentinels" of modal dialogs. Such an element cannot keep focus, so it is
 * not focusable in the sense of the ACT rules. Focus is restored afterwards.
 */
function redirectsFocus(element: Element): boolean {
  const doc = element.ownerDocument;
  const previous = doc.activeElement as HTMLElement | null;
  try {
    (element as HTMLElement).focus({ preventScroll: true });
    const now = doc.activeElement;
    return now !== element && now !== previous && !element.matches(':focus');
  } catch {
    return false;
  } finally {
    if (previous && typeof previous.focus === 'function') previous.focus({ preventScroll: true });
    else (element as HTMLElement).blur();
  }
}

/** Non-abstract roles of WAI-ARIA 1.2, the Graphics module and DPUB-ARIA. */
const CONCRETE_ROLES = new Set(
  [...roles.entries()].filter(([, definition]) => !definition.abstract).map(([name]) => name),
);

export const roleValid: NativeRule = defineRule({
  id: 'role-valid',
  actRuleIds: ['674b10'],
  wcag: ['4.1.2'],
  impact: 'critical',
  description: 'role attributes contain at least one valid, non-abstract WAI-ARIA role.',
  help: 'Use valid WAI-ARIA role names in role attributes (for example "button" or "navigation")',
  helpUrl: actUrl('674b10'),
  *applicability({ document }) {
    for (const element of composedElements(document)) {
      if (!isHtmlElement(element) && !isSvgElement(element)) continue;
      if (!element.getAttribute('role')?.trim()) continue;
      if (!isProgrammaticallyHidden(element)) yield element;
    }
  },
  expectation(target) {
    const tokens = (target.getAttribute('role') ?? '').trim().toLowerCase().split(/\s+/);
    const valid = tokens.filter((token) => CONCRETE_ROLES.has(token as never));
    return valid.length > 0
      ? passed(`The role "${valid[0] ?? ''}" is valid.`)
      : failed(`"${tokens.join(' ')}" contains no valid WAI-ARIA role.`);
  },
});
