import {
  accessibleName,
  composedElements,
  flatTextNodes,
  isVisibleText,
  semanticRole,
} from '../a11y.js';
import { labelIsInName, visibleInnerText } from '../label-in-name.js';
import { actUrl, defineRule, failed, passed, type NativeRule } from '../rule.js';

/** Widget roles that support name from content. */
const WIDGETS = new Set([
  'button',
  'checkbox',
  'gridcell',
  'link',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'switch',
  'tab',
  'treeitem',
]);

export const labelInName: NativeRule = defineRule({
  id: 'label-in-name',
  actRuleIds: ['2ee8b8'],
  wcag: ['2.5.3'],
  impact: 'serious',
  description:
    'The visible label of a control is part of its accessible name, so speech input users can activate it by saying what they see.',
  help: 'Make the aria-label or aria-labelledby text include the visible label, ideally at the start',
  helpUrl: actUrl('2ee8b8'),
  *applicability({ document }) {
    for (const element of composedElements(document)) {
      if (!element.hasAttribute('aria-label') && !element.hasAttribute('aria-labelledby')) continue;
      if (!WIDGETS.has(semanticRole(element) ?? '')) continue;
      let hasVisibleText = false;
      for (const text of flatTextNodes(element)) {
        if (isVisibleText(text)) {
          hasVisibleText = true;
          break;
        }
      }
      if (hasVisibleText) yield element;
    }
  },
  expectation(target) {
    const label = visibleInnerText(target).replace(/\s+/g, ' ').trim();
    const name = accessibleName(target);
    return labelIsInName(label, name)
      ? passed(`The accessible name "${name}" contains the visible label "${label}".`)
      : failed(`The accessible name "${name}" does not contain the visible label "${label}".`);
  },
});
