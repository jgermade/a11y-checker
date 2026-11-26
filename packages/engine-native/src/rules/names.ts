// Rules that require a non-empty accessible name.
import {
  accessibleName,
  composedElements,
  isHtmlElement,
  isIncludedInAccessibilityTree,
  isProgrammaticallyHidden,
  semanticRole,
} from '../a11y.js';
import { actUrl, defineRule, failed, passed, type NativeRule } from '../rule.js';

const PRESENTATIONAL = new Set(['none', 'presentation']);

const named = (target: Element, what: string) => {
  const name = accessibleName(target);
  return name
    ? passed(`The ${what} has the accessible name "${name}".`)
    : failed(`The ${what} has no accessible name.`);
};

export const imageName: NativeRule = defineRule({
  id: 'image-name',
  actRuleIds: ['23a2a8'],
  wcag: ['1.1.1'],
  impact: 'critical',
  description: 'Images have a non-empty accessible name, or are marked as decorative.',
  help: 'Give images a text alternative (alt), or alt="" if they are decorative',
  helpUrl: actUrl('23a2a8'),
  *applicability({ document }) {
    for (const element of composedElements(document)) {
      if (!isHtmlElement(element)) continue;
      if (element.localName !== 'img' && semanticRole(element) !== 'img') continue;
      if (!isProgrammaticallyHidden(element)) yield element;
    }
  },
  expectation(target) {
    if (PRESENTATIONAL.has(semanticRole(target) ?? '')) {
      return passed('The image is marked as decorative.');
    }
    return named(target, 'image');
  },
});

export const buttonName: NativeRule = defineRule({
  id: 'button-name',
  actRuleIds: ['97a4e1'],
  wcag: ['4.1.2'],
  impact: 'critical',
  description: 'Buttons have a non-empty accessible name.',
  help: 'Give buttons a text label, or an aria-label when they only show an icon',
  helpUrl: actUrl('97a4e1'),
  *applicability({ document }) {
    for (const element of composedElements(document)) {
      if (element.localName === 'input' && (element as HTMLInputElement).type === 'image') continue;
      if (semanticRole(element) === 'button' && isIncludedInAccessibilityTree(element)) {
        yield element;
      }
    }
  },
  expectation: (target) => named(target, 'button'),
});

/** Roles that are a link or inherit from it (DPUB-ARIA). */
const LINK_ROLES = new Set([
  'link',
  'doc-backlink',
  'doc-biblioref',
  'doc-glossref',
  'doc-noteref',
]);

export const linkName: NativeRule = defineRule({
  id: 'link-name',
  actRuleIds: ['c487ae'],
  wcag: ['2.4.4', '4.1.2'],
  impact: 'serious',
  description: 'Links have a non-empty accessible name.',
  help: 'Give links text that describes their purpose',
  helpUrl: actUrl('c487ae'),
  *applicability({ document }) {
    for (const element of composedElements(document)) {
      if (!isHtmlElement(element)) continue;
      if (LINK_ROLES.has(semanticRole(element) ?? '') && isIncludedInAccessibilityTree(element)) {
        yield element;
      }
    }
  },
  expectation: (target) => named(target, 'link'),
});

const FORM_FIELD_ROLES = new Set([
  'checkbox',
  'combobox',
  'listbox',
  'menuitemcheckbox',
  'menuitemradio',
  'radio',
  'searchbox',
  'slider',
  'spinbutton',
  'switch',
  'textbox',
]);

/** Date and time inputs have no ARIA role, but are text fields for this rule. */
const DATE_INPUTS = new Set(['date', 'datetime-local', 'month', 'time', 'week']);
const fieldRole = (element: Element) =>
  semanticRole(element) ??
  (element.localName === 'input' && DATE_INPUTS.has((element as HTMLInputElement).type)
    ? 'textbox'
    : null);

export const formFieldName: NativeRule = defineRule({
  id: 'form-field-name',
  actRuleIds: ['e086e5'],
  wcag: ['4.1.2'],
  impact: 'critical',
  description: 'Form fields have a non-empty accessible name.',
  help: 'Give form fields a label (a <label> element, aria-label or aria-labelledby)',
  helpUrl: actUrl('e086e5'),
  *applicability({ document }) {
    for (const element of composedElements(document)) {
      if (
        FORM_FIELD_ROLES.has(fieldRole(element) ?? '') &&
        isIncludedInAccessibilityTree(element)
      ) {
        yield element;
      }
    }
  },
  expectation: (target) => named(target, 'form field'),
});

export const iframeName: NativeRule = defineRule({
  id: 'iframe-name',
  actRuleIds: ['cae760'],
  wcag: ['4.1.2'],
  impact: 'serious',
  description: 'Iframes have a non-empty accessible name.',
  help: 'Give iframes a title or aria-label that describes their content',
  helpUrl: actUrl('cae760'),
  *applicability({ document }) {
    for (const element of composedElements(document)) {
      if (element.localName !== 'iframe' || !isHtmlElement(element)) continue;
      if (!isIncludedInAccessibilityTree(element)) continue;
      if ((element as HTMLIFrameElement).tabIndex < 0 && element.hasAttribute('tabindex')) continue;
      // Marked as decorative with the role attribute, even though iframes are focusable.
      const role = element.getAttribute('role')?.trim().toLowerCase().split(/\s+/)[0] ?? '';
      if (PRESENTATIONAL.has(role)) continue;
      yield element;
    }
  },
  expectation: (target) => named(target, 'iframe'),
});
