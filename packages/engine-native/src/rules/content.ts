// Content rules: headings have a name (ffd0e9), and autocomplete attributes have a
// valid value (73f2c2).
import { roles, type ARIARoleDefinitionKey } from 'aria-query';
import {
  accessibleName,
  composedElements,
  isHtmlElement,
  isIncludedInAccessibilityTree,
  isInSequentialFocusNavigation,
  isVisible,
  semanticRole,
} from '../a11y.js';
import { actUrl, defineRule, failed, passed, type NativeRule } from '../rule.js';

// --- ffd0e9: Heading has non-empty accessible name ---

export const headingName: NativeRule = defineRule({
  id: 'heading-name',
  actRuleIds: ['ffd0e9'],
  wcag: ['1.3.1', '2.4.6'],
  impact: 'moderate',
  description: 'Headings have a non-empty accessible name.',
  help: 'Give the heading visible text, or remove it if it is not a heading',
  helpUrl: actUrl('ffd0e9'),
  *applicability({ document }) {
    for (const element of composedElements(document)) {
      if (!isHtmlElement(element) || semanticRole(element) !== 'heading') continue;
      if (isIncludedInAccessibilityTree(element)) yield element;
    }
  },
  expectation(target) {
    const name = accessibleName(target);
    return name
      ? passed(`The heading has the accessible name "${name}".`)
      : failed('The heading has no accessible name.');
  },
});

// --- 73f2c2: Autocomplete attribute has valid value ---

/** Autofill field names (HTML "autocomplete fields" table). */
const FIELDS = new Set([
  'name',
  'honorific-prefix',
  'given-name',
  'additional-name',
  'family-name',
  'honorific-suffix',
  'nickname',
  'username',
  'new-password',
  'current-password',
  'one-time-code',
  'organization-title',
  'organization',
  'street-address',
  'address-line1',
  'address-line2',
  'address-line3',
  'address-level4',
  'address-level3',
  'address-level2',
  'address-level1',
  'country',
  'country-name',
  'postal-code',
  'cc-name',
  'cc-given-name',
  'cc-additional-name',
  'cc-family-name',
  'cc-number',
  'cc-exp',
  'cc-exp-month',
  'cc-exp-year',
  'cc-csc',
  'cc-type',
  'transaction-currency',
  'transaction-amount',
  'language',
  'bday',
  'bday-day',
  'bday-month',
  'bday-year',
  'sex',
  'url',
  'photo',
]);

/** Contact field names: they may follow a home/work/mobile/fax/pager token. */
const CONTACT_FIELDS = new Set([
  'tel',
  'tel-country-code',
  'tel-national',
  'tel-area-code',
  'tel-local',
  'tel-local-prefix',
  'tel-local-suffix',
  'tel-extension',
  'email',
  'impp',
]);

const CONTACT_TYPES = new Set(['home', 'work', 'mobile', 'fax', 'pager']);

/** Whether an autocomplete value is a valid list of autofill detail tokens. */
export function isValidAutocomplete(value: string): boolean {
  const tokens = value
    .trim()
    .toLowerCase()
    .split(/[\t\n\f\r ]+/);
  let i = 0;
  if (tokens[i]?.startsWith('section-')) i++;
  if (tokens[i] === 'shipping' || tokens[i] === 'billing') i++;
  const contactType = CONTACT_TYPES.has(tokens[i] ?? '');
  if (contactType) i++;
  const field = tokens[i] ?? '';
  if (contactType ? !CONTACT_FIELDS.has(field) : !FIELDS.has(field) && !CONTACT_FIELDS.has(field)) {
    return false;
  }
  i++;
  if (tokens[i] === 'webauthn') i++;
  return i === tokens.length;
}

const FIXED_VALUE_TYPES = new Set([
  'button',
  'checkbox',
  'file',
  'image',
  'radio',
  'reset',
  'submit',
]);

/** Roles that are widgets (they inherit from the abstract `widget` role). */
const WIDGET_ROLES = (() => {
  const result = new Set<string>();
  const isWidget = (role: string, seen = new Set<string>()): boolean => {
    if (role === 'widget') return true;
    if (seen.has(role)) return false;
    seen.add(role);
    const definition = roles.get(role as ARIARoleDefinitionKey);
    return (definition?.superClass ?? []).some((chain) =>
      chain.some((parent) => isWidget(parent, seen)),
    );
  };
  for (const role of roles.keys()) if (isWidget(role)) result.add(role);
  return result;
})();

/** Disabled: matches :disabled, or is inside an element with aria-disabled="true". */
function isDisabled(element: Element): boolean {
  if (element.matches(':disabled')) return true;
  for (let node: Element | null = element; node;) {
    if (node.getAttribute('aria-disabled')?.trim().toLowerCase() === 'true') return true;
    const parent: Node | null = node.parentNode;
    node =
      parent?.nodeType === 11 ? (parent as ShadowRoot).host : ((parent as Element | null) ?? null);
    if (node && node.nodeType !== 1) node = null;
  }
  return false;
}

function autocompleteApplies(element: Element): boolean {
  if (!isHtmlElement(element)) return false;
  if (!['input', 'select', 'textarea'].includes(element.localName)) return false;
  const value = element.getAttribute('autocomplete');
  if (value === null || value.trim() === '') return false;
  // toggle: a single "on" or "off" token.
  if (/^(on|off)$/i.test(value.trim())) return false;
  if (isDisabled(element)) return false;
  if (element.localName === 'input' && FIXED_VALUE_TYPES.has((element as HTMLInputElement).type)) {
    return false;
  }
  // hidden: not visible and not in the accessibility tree.
  if (!isVisible(element) && !isIncludedInAccessibilityTree(element)) return false;
  // static: out of the focus order, with a role that is not a widget.
  if (!isInSequentialFocusNavigation(element) && !WIDGET_ROLES.has(semanticRole(element) ?? '')) {
    return false;
  }
  return true;
}

export const autocompleteValid: NativeRule = defineRule({
  id: 'autocomplete-valid',
  actRuleIds: ['73f2c2'],
  wcag: ['1.3.5'],
  impact: 'serious',
  description:
    'autocomplete attributes use valid autofill tokens, so the purpose of the field is identifiable.',
  help: 'Use a valid autocomplete value, such as "email", "given-name" or "shipping postal-code"',
  helpUrl: actUrl('73f2c2'),
  *applicability({ document }) {
    for (const element of composedElements(document)) {
      if (autocompleteApplies(element)) yield element;
    }
  },
  expectation(target) {
    const value = target.getAttribute('autocomplete') ?? '';
    return isValidAutocomplete(value)
      ? passed(`autocomplete="${value.trim()}" is valid.`)
      : failed(`autocomplete="${value.trim()}" is not a valid autofill value.`);
  },
});
