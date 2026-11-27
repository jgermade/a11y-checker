// ARIA attribute rules: states and properties permitted on the role (5c01ea), with
// valid values (6a7281), and required states and properties set (4e8ab6).
import { aria, roles, type ARIAPropertyDefinition, type ARIARoleDefinitionKey } from 'aria-query';
import {
  composedElements,
  isFocusableElement,
  isHtmlElement,
  isIncludedInAccessibilityTree,
  isSvgElement,
  semanticRole,
} from '../a11y.js';
import { actUrl, defineRule, failed, passed, type NativeRule } from '../rule.js';

type AriaAttribute = Parameters<typeof aria.get>[0];

const isAriaAttribute = (name: string): name is AriaAttribute => aria.has(name as AriaAttribute);

/** The WAI-ARIA states and properties set on an element (known names only). */
function ariaAttributes(element: Element): Attr[] {
  return Array.from(element.attributes).filter((attr) => isAriaAttribute(attr.name));
}

const roleDefinition = (role: string | null) =>
  role ? roles.get(role as ARIARoleDefinitionKey) : undefined;

/** Global states and properties: the ones of the base `roletype` role. */
const GLOBAL = new Set(Object.keys(roles.get('roletype')?.props ?? {}));

const isHtmlOrSvg = (element: Element) => isHtmlElement(element) || isSvgElement(element);

/** The first valid, non-abstract token of the role attribute. */
function explicitRole(element: Element): string | null {
  const tokens = (element.getAttribute('role') ?? '').trim().toLowerCase().split(/\s+/);
  for (const token of tokens) {
    const definition = roleDefinition(token);
    if (definition && !definition.abstract) return token;
  }
  return null;
}

/** The role the element would have without its role attribute. */
function implicitRole(element: Element): string | null {
  const clone = element.cloneNode(false) as Element;
  clone.removeAttribute('role');
  return semanticRole(clone);
}

// --- 5c01ea: ARIA state or property is permitted ---

/**
 * ARIA in HTML: states and properties that native elements support without a role
 * that declares them (for example `aria-checked` on a native checkbox).
 */
function allowedByHtml(element: Element, attribute: string): boolean {
  if (!isHtmlElement(element)) return false;
  const type = element.localName === 'input' ? (element as HTMLInputElement).type : '';
  switch (attribute) {
    case 'aria-checked':
      return type === 'checkbox' || type === 'radio';
    case 'aria-required':
    case 'aria-readonly':
      return ['input', 'select', 'textarea'].includes(element.localName);
    case 'aria-disabled':
    case 'aria-invalid':
    case 'aria-errormessage':
      return ['button', 'input', 'select', 'textarea', 'fieldset'].includes(element.localName);
    default:
      return false;
  }
}

export const ariaAllowedAttr: NativeRule = defineRule({
  id: 'aria-allowed-attr',
  actRuleIds: ['5c01ea'],
  wcag: ['4.1.2'],
  impact: 'critical',
  description: 'ARIA states and properties are allowed on the role of the element they are on.',
  help: 'Remove ARIA attributes that the role does not support, or use a role that supports them',
  helpUrl: actUrl('5c01ea'),
  *applicability({ document }) {
    for (const element of composedElements(document)) {
      if (!isHtmlOrSvg(element) || ariaAttributes(element).length === 0) continue;
      if (isIncludedInAccessibilityTree(element)) yield element;
    }
  },
  expectation(target) {
    const role = semanticRole(target);
    const supported = roleDefinition(role)?.props ?? {};
    const notAllowed = ariaAttributes(target)
      .map((attr) => attr.name)
      .filter((name) => !GLOBAL.has(name) && !(name in supported) && !allowedByHtml(target, name));
    if (notAllowed.length === 0) {
      return passed('Every ARIA state and property is allowed on this element.');
    }
    const where = role ? `the role "${role}"` : `a <${target.localName}> element`;
    return failed(
      `${notAllowed.join(', ')} ${notAllowed.length === 1 ? 'is' : 'are'} not allowed on ${where}.`,
    );
  },
});

// --- 6a7281: ARIA state or property has valid value ---

const BOOLEAN = ['true', 'false'];

function isValidValue(definition: ARIAPropertyDefinition, raw: string): boolean {
  const value = raw.trim().toLowerCase();
  const tokens = (definition.values ?? []).map(String);
  switch (definition.type) {
    case 'boolean':
      // "true/false/undefined" value types, such as aria-expanded.
      return (
        BOOLEAN.includes(value) || (definition.allowundefined === true && value === 'undefined')
      );
    case 'tristate':
      // aria-checked and aria-pressed also accept "undefined" (not checkable/pressable).
      return [...BOOLEAN, 'mixed', 'undefined'].includes(value);
    case 'token':
      return tokens.includes(value);
    case 'tokenlist':
      return value.split(/\s+/).every((token) => tokens.includes(token));
    case 'integer':
      return /^[-+]?\d+$/.test(value);
    case 'number':
      return value !== '' && Number.isFinite(Number(value));
    case 'id':
      // One ID: no whitespace. The referenced element does not have to exist.
      return !/\s/.test(raw.trim());
    case 'idlist':
    case 'string':
      return true;
    default:
      return true;
  }
}

/** ARIA states and properties with a non-empty value. */
const nonEmptyAriaAttributes = (element: Element) =>
  ariaAttributes(element).filter((attr) => attr.value.trim() !== '');

export const ariaValidAttrValue: NativeRule = defineRule({
  id: 'aria-valid-attr-value',
  actRuleIds: ['6a7281'],
  wcag: ['4.1.2'],
  impact: 'critical',
  description: 'ARIA states and properties have values that are valid for their value type.',
  help: 'Use a value allowed for the attribute, such as "true" or "false" for aria-expanded',
  helpUrl: actUrl('6a7281'),
  *applicability({ document }) {
    for (const element of composedElements(document)) {
      if (isHtmlOrSvg(element) && nonEmptyAriaAttributes(element).length > 0) yield element;
    }
  },
  expectation(target) {
    const invalid = nonEmptyAriaAttributes(target).filter((attr) => {
      const definition = aria.get(attr.name as AriaAttribute);
      return definition !== undefined && !isValidValue(definition, attr.value);
    });
    if (invalid.length === 0) return passed('Every ARIA state and property has a valid value.');
    return failed(
      `Invalid value: ${invalid.map((attr) => `${attr.name}="${attr.value}"`).join(', ')}.`,
    );
  },
});

// --- 4e8ab6: Element with role attribute has required states and properties ---

/**
 * Implicit values that aria-query still lists from WAI-ARIA 1.1 but that WAI-ARIA 1.2
 * removed: these properties must now be set explicitly.
 */
const NO_DEFAULT_IN_ARIA_1_2: Record<string, string[]> = {
  checkbox: ['aria-checked'],
  combobox: ['aria-expanded'],
  heading: ['aria-level'],
  switch: ['aria-checked'],
};

/** The required states and properties of a role that have no implicit value. */
function requiredWithoutDefault(role: string, element: Element): string[] {
  const required = Object.entries(roleDefinition(role)?.requiredProps ?? {})
    .filter(
      ([name, defaultValue]) =>
        defaultValue === null ||
        defaultValue === undefined ||
        NO_DEFAULT_IN_ARIA_1_2[role]?.includes(name),
    )
    .map(([name]) => name);
  // A focusable separator is a widget, and then aria-valuenow is required.
  if (role === 'separator' && isFocusableElement(element) && !required.includes('aria-valuenow')) {
    required.push('aria-valuenow');
  }
  return required;
}

export const ariaRequiredAttr: NativeRule = defineRule({
  id: 'aria-required-attr',
  actRuleIds: ['4e8ab6'],
  wcag: ['4.1.2'],
  impact: 'critical',
  description: 'Elements with a role have the states and properties that the role requires.',
  help: 'Add the required ARIA states and properties of the role (for example aria-checked on role="checkbox")',
  helpUrl: actUrl('4e8ab6'),
  *applicability({ document }) {
    for (const element of composedElements(document)) {
      if (!isHtmlOrSvg(element)) continue;
      const role = explicitRole(element);
      if (!role || role !== semanticRole(element) || role === implicitRole(element)) continue;
      if (isIncludedInAccessibilityTree(element)) yield element;
    }
  },
  expectation(target) {
    const role = explicitRole(target) ?? '';
    // A property with an implicit value for the role is never missing.
    const missing = requiredWithoutDefault(role, target).filter(
      (name) => !target.getAttribute(name)?.trim(),
    );
    if (missing.length === 0) {
      return passed(`The role "${role}" has all its required states and properties.`);
    }
    return failed(`The role "${role}" requires ${missing.join(', ')}.`);
  },
});
