// Meta element rules: the viewport allows zoom (b4f0c3), and the page does not refresh
// or redirect after a delay (bc659a, and bisz58 without the 20-hour exception).
import { isHtmlElement } from '../a11y.js';
import { actUrl, defineRule, failed, passed, type NativeRule } from '../rule.js';

const lower = (value: string | null) => (value ?? '').trim().toLowerCase();

// --- b4f0c3: Meta viewport allows for zoom ---

/** Parses a viewport content attribute into lowercase key/value pairs. */
export function parseViewport(content: string): Map<string, string> {
  const pairs = new Map<string, string>();
  // Pairs are separated by commas, semicolons or whitespace; "=" may have whitespace
  // around it.
  const normalized = content.toLowerCase().replace(/\s*=\s*/g, '=');
  for (const part of normalized.split(/[\s,;]+/)) {
    if (!part) continue;
    const [key = '', ...rest] = part.split('=');
    if (key && !pairs.has(key)) pairs.set(key, rest.join('='));
  }
  return pairs;
}

const DEVICE = ['device-width', 'device-height'];

/** Like the CSS Device Adaptation translation: a leading number, or NaN. */
const toNumber = (value: string) => Number.parseFloat(value);

function userScalableAllowsZoom(value: string | undefined): boolean {
  if (value === undefined) return true;
  if (value === 'yes' || DEVICE.includes(value)) return true;
  const number = toNumber(value);
  return !Number.isNaN(number) && (number <= -1 || number >= 1);
}

function maximumScaleAllowsZoom(value: string | undefined): boolean {
  if (value === undefined) return true;
  if (DEVICE.includes(value)) return true;
  const number = toNumber(value);
  return !Number.isNaN(number) && (number < 0 || number >= 2);
}

export const metaViewport: NativeRule = defineRule({
  id: 'meta-viewport',
  actRuleIds: ['b4f0c3'],
  wcag: ['1.4.4'],
  impact: 'critical',
  description: 'The viewport meta element does not prevent users from zooming the page.',
  help: 'Remove user-scalable=no from the viewport meta element, and do not set maximum-scale below 2',
  helpUrl: actUrl('b4f0c3'),
  *applicability({ document }) {
    for (const meta of Array.from(document.getElementsByTagName('meta'))) {
      if (!isHtmlElement(meta) || lower(meta.getAttribute('name')) !== 'viewport') continue;
      const content = meta.getAttribute('content');
      if (content === null) continue;
      const pairs = parseViewport(content);
      if (pairs.has('user-scalable') || pairs.has('maximum-scale')) yield meta;
    }
  },
  expectation(target) {
    const pairs = parseViewport(target.getAttribute('content') ?? '');
    const problems: string[] = [];
    if (!userScalableAllowsZoom(pairs.get('user-scalable'))) {
      problems.push(`user-scalable=${pairs.get('user-scalable') ?? ''} disables zoom`);
    }
    if (!maximumScaleAllowsZoom(pairs.get('maximum-scale'))) {
      problems.push(`maximum-scale=${pairs.get('maximum-scale') ?? ''} limits zoom below 200%`);
    }
    return problems.length === 0
      ? passed('The viewport allows users to zoom.')
      : failed(`The viewport ${problems.join(', and ')}.`);
  },
});

// --- bc659a and bisz58: Meta element has no refresh delay ---

/**
 * The time of a meta refresh content value, following the HTML "shared declarative
 * refresh steps", or `null` when the value is not valid (and the browser ignores it).
 */
export function refreshTime(content: string): number | null {
  const match = /^[\t\n\f\r ]*(\d*)([\d.]*)([\s\S]*)$/.exec(content);
  if (!match) return null;
  const [, digits = '', dotsAndDigits = '', rest = ''] = match;
  // Neither digits nor a dot: not a valid refresh.
  if (digits === '' && !dotsAndDigits.startsWith('.')) return null;
  // After the time: the end, or a separator before the URL.
  if (rest !== '' && !/^[\t\n\f\r ;,]/.test(rest)) return null;
  return digits === '' ? 0 : Number.parseInt(digits, 10);
}

/** The first meta element with http-equiv="refresh" and a valid content value. */
function* firstValidRefresh(document: Document): Generator<Element> {
  for (const meta of Array.from(document.getElementsByTagName('meta'))) {
    if (!isHtmlElement(meta) || lower(meta.getAttribute('http-equiv')) !== 'refresh') continue;
    const content = meta.getAttribute('content');
    if (content !== null && refreshTime(content) !== null) {
      yield meta;
      return;
    }
  }
}

const refreshMessage = (target: Element) => {
  const content = target.getAttribute('content') ?? '';
  const time = refreshTime(content) ?? 0;
  const redirect = /[;,]/.test(content) ? 'redirects' : 'refreshes';
  return { time, text: `The page ${redirect} after ${time} second${time === 1 ? '' : 's'}.` };
};

/** 20 hours: a delay this long is considered not to limit the user's time. */
const TWENTY_HOURS = 72_000;

export const metaRefresh: NativeRule = defineRule({
  id: 'meta-refresh',
  actRuleIds: ['bc659a'],
  wcag: ['2.2.1'],
  impact: 'critical',
  description: 'The page does not refresh or redirect after a time delay with a meta element.',
  help: 'Remove the timed meta refresh, or redirect immediately (content="0; url=...")',
  helpUrl: actUrl('bc659a'),
  applicability: ({ document }) => firstValidRefresh(document),
  expectation(target) {
    const { time, text } = refreshMessage(target);
    return time === 0 || time > TWENTY_HOURS ? passed(text) : failed(text);
  },
});

export const metaRefreshNoException: NativeRule = defineRule({
  id: 'meta-refresh-no-exception',
  actRuleIds: ['bisz58'],
  wcag: ['2.2.4', '3.2.5'],
  impact: 'minor',
  description: 'The page never refreshes or redirects after a time delay (AAA, no exception).',
  help: 'Remove the timed meta refresh, or redirect immediately (content="0; url=...")',
  helpUrl: actUrl('bisz58'),
  applicability: ({ document }) => firstValidRefresh(document),
  expectation(target) {
    const { time, text } = refreshMessage(target);
    return time === 0 ? passed(text) : failed(text);
  },
});
