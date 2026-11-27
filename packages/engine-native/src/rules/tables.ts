// Table rules: headers attributes refer to cells of the same table (a25f45).
import {
  composedElements,
  isHtmlElement,
  isIncludedInAccessibilityTree,
  isVisible,
  semanticRole,
} from '../a11y.js';
import { actUrl, defineRule, failed, passed, type NativeRule } from '../rule.js';

const TABLE_ROLES = new Set(['table', 'grid', 'treegrid']);

const isCell = (element: Element) =>
  isHtmlElement(element) && (element.localName === 'td' || element.localName === 'th');

/** The table a cell belongs to: its nearest table ancestor in the same tree. */
const ownerTable = (cell: Element) => cell.parentElement?.closest('table') ?? null;

const tokens = (value: string) =>
  value
    .trim()
    .split(/[\t\n\f\r ]+/)
    .filter(Boolean);

export const tdHeadersAttr: NativeRule = defineRule({
  id: 'td-headers-attr',
  actRuleIds: ['a25f45'],
  wcag: ['1.3.1'],
  impact: 'serious',
  description: 'headers attributes of table cells refer to other cells of the same table.',
  help: 'Make every ID in the headers attribute point to a header cell of the same table, and not to the cell itself',
  helpUrl: actUrl('a25f45'),
  *applicability({ document }) {
    for (const element of composedElements(document)) {
      if (!isCell(element) || !element.hasAttribute('headers')) continue;
      const table = ownerTable(element);
      if (!table || !isHtmlElement(table)) continue;
      if (!isVisible(table) || !isIncludedInAccessibilityTree(table)) continue;
      if (TABLE_ROLES.has(semanticRole(table) ?? '')) yield element;
    }
  },
  expectation(target) {
    const table = ownerTable(target);
    const ids = tokens(target.getAttribute('headers') ?? '');
    const own = target.getAttribute('id');
    if (own && ids.includes(own)) {
      return failed(`The headers attribute refers to the cell itself ("${own}").`);
    }
    const root = target.getRootNode() as Document | ShadowRoot;
    const outside = ids.filter((id) => {
      const referenced = root.getElementById(id);
      return !referenced || !isCell(referenced) || ownerTable(referenced) !== table;
    });
    if (ids.length === 0) return failed('The headers attribute is empty.');
    return outside.length === 0
      ? passed('Every ID in the headers attribute refers to a cell of the same table.')
      : failed(
          `The headers attribute refers to ${outside.map((id) => `"${id}"`).join(', ')}, which ${outside.length === 1 ? 'is' : 'are'} not a cell of the same table.`,
        );
  },
});
