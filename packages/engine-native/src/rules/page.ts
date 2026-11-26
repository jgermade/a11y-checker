// Page-level rules: language and title of the top-level document.
import {
  composedElements,
  flatParent,
  flatTextNodes,
  isHtmlElement,
  isIncludedInAccessibilityTree,
  isVisibleText,
} from '../a11y.js';
import { hasKnownPrimaryLanguage } from '../lang.js';
import { actUrl, defineRule, failed, passed, type NativeRule } from '../rule.js';

/** The `html` document element of a top-level, text/html document, if any. */
function topLevelHtml(document: Document): Element | null {
  // documentElement is null in an empty document, despite its DOM type.
  const root = document.documentElement as Element | null;
  if (!root || root.localName !== 'html' || !isHtmlElement(root)) return null;
  if (document.contentType !== 'text/html') return null;
  const view = document.defaultView;
  if (!view || view.top !== view) return null;
  return root;
}

const isBlank = (value: string | null) => value === null || value.trim() === '';

export const htmlHasLang: NativeRule = defineRule({
  id: 'html-has-lang',
  actRuleIds: ['b5c3f8'],
  wcag: ['3.1.1'],
  impact: 'serious',
  description: 'The html element of the page has a lang attribute.',
  help: 'Set the page language on the html element, e.g. <html lang="en">',
  helpUrl: actUrl('b5c3f8'),
  *applicability({ document }) {
    const root = topLevelHtml(document);
    if (root) yield root;
  },
  expectation(target) {
    const lang = target.getAttribute('lang');
    return isBlank(lang)
      ? failed('The html element has no lang attribute, or it is empty.')
      : passed(`The page language is "${lang?.trim() ?? ''}".`);
  },
});

export const htmlLangValid: NativeRule = defineRule({
  id: 'html-lang-valid',
  actRuleIds: ['bf051a'],
  wcag: ['3.1.1'],
  impact: 'serious',
  description: 'The lang attribute of the html element is a valid language tag.',
  help: 'Use a valid language tag in <html lang>, such as "en" or "fr-CA"',
  helpUrl: actUrl('bf051a'),
  *applicability({ document }) {
    const root = topLevelHtml(document);
    if (root && !isBlank(root.getAttribute('lang'))) yield root;
  },
  expectation(target) {
    const lang = target.getAttribute('lang') ?? '';
    return hasKnownPrimaryLanguage(lang)
      ? passed(`"${lang}" is a valid language tag.`)
      : failed(`"${lang}" does not start with a known language subtag.`);
  },
});

/** The element whose lang attribute a node inherits its language from. */
function languageOwner(node: Node): Element | null {
  for (let el: Element | null = node.nodeType === 1 ? (node as Element) : node.parentElement; el;) {
    if (el.hasAttribute('lang')) return el;
    const parent: Node | null = el.parentNode;
    el = parent?.nodeType === 11 ? (parent as ShadowRoot).host : el.parentElement;
  }
  return null;
}

/** Whether some text in the element inherits its language from the element itself. */
function hasTextInheritingLanguage(element: Element): boolean {
  // Only text that is visible or exposed to assistive technologies counts.
  for (const text of flatTextNodes(element)) {
    if (!text.data.trim() || languageOwner(text) !== element) continue;
    const parent = flatParent(text);
    if (isVisibleText(text) || (parent && isIncludedInAccessibilityTree(parent))) return true;
  }
  // Text alternatives in attributes also carry the element's language.
  for (const el of composedElements(element, { frames: false })) {
    if (languageOwner(el) !== element || !isIncludedInAccessibilityTree(el)) continue;
    for (const attribute of ['alt', 'aria-label', 'title', 'placeholder']) {
      if (el.getAttribute(attribute)?.trim()) return true;
    }
  }
  return false;
}

export const elementLangValid: NativeRule = defineRule({
  id: 'element-lang-valid',
  actRuleIds: ['de46e4'],
  wcag: ['3.1.2'],
  impact: 'serious',
  description: 'lang attributes on elements in the body are valid language tags.',
  help: 'Use a valid language tag in lang attributes, such as "es" or "pt-BR"',
  helpUrl: actUrl('de46e4'),
  *applicability({ document }) {
    for (const element of composedElements(document)) {
      if (!isHtmlElement(element) || element.ownerDocument.contentType !== 'text/html') continue;
      const lang = element.getAttribute('lang');
      if (lang === null || lang === '') continue;
      // Inclusive descendant (in the flat tree) of a body element.
      let inBody = false;
      for (let el: Element | null = element; el;) {
        if (el.localName === 'body') {
          inBody = true;
          break;
        }
        const parent: Node | null = el.parentNode;
        el = parent?.nodeType === 11 ? (parent as ShadowRoot).host : el.parentElement;
      }
      if (inBody && hasTextInheritingLanguage(element)) yield element;
    }
  },
  expectation(target) {
    const lang = target.getAttribute('lang') ?? '';
    return hasKnownPrimaryLanguage(lang)
      ? passed(`"${lang}" is a valid language tag.`)
      : failed(`"${lang}" does not start with a known language subtag.`);
  },
});

export const documentTitle: NativeRule = defineRule({
  id: 'document-title',
  actRuleIds: ['2779a5'],
  wcag: ['2.4.2'],
  impact: 'serious',
  description: 'The page has a non-empty title element.',
  help: 'Give the page a <title> that describes its topic or purpose',
  helpUrl: actUrl('2779a5'),
  *applicability({ document }) {
    const root = topLevelHtml(document);
    if (root) yield root;
  },
  expectation(target) {
    const titles = Array.from(target.getElementsByTagName('title'));
    if (titles.length === 0) return failed('The page has no title element.');
    const first = titles.find(isHtmlElement);
    const text = first
      ? Array.from(first.childNodes)
          .filter((n) => n.nodeType === 3)
          .map((n) => (n as Text).data)
          .join('')
      : '';
    return text.trim()
      ? passed(`The page title is "${text.trim()}".`)
      : failed('The title element is empty.');
  },
});
