// The ACT "label in name" algorithm and "visible inner text" definition, used by the
// Visible label is part of accessible name rule (2ee8b8).
import { flatParent, isRendered, isVisible } from './a11y.js';

/**
 * Tokenizes a label or name: drops parenthesized text, case-folds, normalizes to NFKD,
 * replaces every character that is not a letter or a digit with a space, and splits on
 * whitespace.
 */
export function tokenize(value: string): string[] {
  return value
    .replace(/\([^)]*\)/g, ' ')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]/gu, ' ')
    .split(/\s+/u)
    .filter(Boolean);
}

/** Whether `needle` appears as a contiguous run of tokens in `haystack`. */
export function isContiguousSubsequence(needle: string[], haystack: string[]): boolean {
  if (needle.length === 0) return true;
  outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

/**
 * Whether the visible label of an element is contained in its accessible name. A
 * label made of a single letter (such as "X" for close) is a symbol, that is non-text
 * content, so there is no text label to contain. A single digit is still text.
 */
export function labelIsInName(label: string, name: string): boolean {
  const tokens = tokenize(label);
  if (tokens.length === 1 && /^\p{L}$/u.test(tokens[0] ?? '')) return true;
  return isContiguousSubsequence(tokens, tokenize(name));
}

/** Icon fonts draw ligatures such as "search" as pictures: that text is not text. */
const ICON_FONT =
  /material (icons|symbols)|font ?awesome|glyphicons|icomoon|ionicons|bootstrap-icons/i;

function visibleTextOfTextNode(text: Text): string {
  const parent = flatParent(text) ?? text.parentElement;
  if (!parent) return '';
  const font = parent.ownerDocument.defaultView?.getComputedStyle(parent).fontFamily ?? '';
  if (ICON_FONT.test(font)) return ' ';
  if (isVisible(parent) && text.data.trim()) return text.data.replace(/\s+/g, ' ');
  return isRendered(parent) && !text.data.trim() ? ' ' : '';
}

/** The ACT "visible inner text" of a node, through the flat tree. */
export function visibleInnerText(node: Node): string {
  if (node.nodeType === 3) return visibleTextOfTextNode(node as Text);
  if (node.nodeType !== 1) return '';
  const element = node as Element;
  if (!isRendered(element)) return '';
  if (!isVisible(element)) {
    return element.getBoundingClientRect().width > 0 ? ' ' : '';
  }
  if (element.localName === 'br') return '\n';

  const children = element.shadowRoot
    ? Array.from(element.shadowRoot.childNodes)
    : element.localName === 'slot'
      ? (element as HTMLSlotElement).assignedNodes({ flatten: true })
      : Array.from(element.childNodes);
  const inner = children.map(visibleInnerText).join('');
  const display = element.ownerDocument.defaultView?.getComputedStyle(element).display ?? '';
  if (/^(block|flex|grid|list-item|table|flow-root)\b|table-caption/.test(display)) {
    return `\n${inner}\n`;
  }
  if (/table-cell|table-row/.test(display)) return ` ${inner} `;
  return inner;
}
