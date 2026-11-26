import type { Impact, WcagLevel, WcagVersion } from '@a11y-checker/core';
import { parseArgs } from 'node:util';

export type Format = 'text' | 'json' | 'sarif' | 'html';
export type BrowserName = 'chromium' | 'firefox' | 'webkit';
export type EngineName = 'axe' | 'ibm' | 'native';

export interface CliOptions {
  urls: string[];
  urlsFile?: string;
  wcag: WcagVersion;
  level: WcagLevel;
  bestPractices: boolean;
  engines: EngineName[];
  include: string[];
  exclude: string[];
  rules?: string[];
  disableRules: string[];
  /** `null`: never fail on violations. */
  failOn: Impact | null;
  format: Format;
  output?: string;
  /** Also list items that need review in the text report. */
  incomplete: boolean;
  browser: BrowserName;
  timeout: number;
  waitFor?: string;
  help: boolean;
  version: boolean;
}

export class UsageError extends Error {
  override name = 'UsageError';
}

export const HELP = `Usage: a11y-checker [options] <url...>

Checks web pages for accessibility issues (WCAG 2.0-2.2) in a real browser.

Target
  --wcag <version>        WCAG version: 2.0, 2.1 or 2.2 (default: 2.2)
  --level <level>         Conformance level: A, AA or AAA (default: AA)
  --best-practices        Also report rules that are not tied to a WCAG criterion
  --engines <list>        Engines, comma-separated: axe, ibm, native (default: axe)

Scope
  --include <selector>    Check only matching elements (repeatable)
  --exclude <selector>    Skip matching elements (repeatable)
  --rules <ids>           Run only these rule IDs (comma-separated)
  --disable-rules <ids>   Skip these rule IDs (comma-separated)

Output
  --format <format>       text, json, sarif or html (default: text)
  --output <path>         Write the report to a file instead of stdout. With html
                          and several URLs, a directory (one report per URL).
  --incomplete            List items that need review in the text report
  --fail-on <impact>      Exit with 1 when a violation has this impact or higher:
                          minor, moderate, serious, critical, or none (default: minor)

Browser
  --urls <file>           Read more URLs from a file, one per line (# for comments)
  --browser <name>        chromium, firefox or webkit (default: chromium)
  --timeout <ms>          Navigation timeout in milliseconds (default: 30000)
  --wait-for <selector>   Wait for this selector before checking

  -h, --help              Show this help
  -v, --version           Show the version

Exit codes: 0 = no failing violations, 1 = failing violations, 2 = error.
Browsers are provided by Playwright: npx playwright install chromium`;

function oneOf<T extends string>(value: string, allowed: readonly T[], flag: string): T {
  if (!allowed.includes(value as T)) {
    throw new UsageError(`${flag} must be one of: ${allowed.join(', ')} (got "${value}")`);
  }
  return value as T;
}

const list = (value: string | undefined) =>
  value
    ?.split(',')
    .map((v) => v.trim())
    .filter(Boolean) ?? [];

export function parseCliArgs(argv: readonly string[]): CliOptions {
  let parsed;
  try {
    parsed = parseArgs({
      args: [...argv],
      allowPositionals: true,
      options: {
        wcag: { type: 'string', default: '2.2' },
        level: { type: 'string', default: 'AA' },
        'best-practices': { type: 'boolean', default: false },
        engines: { type: 'string', default: 'axe' },
        include: { type: 'string', multiple: true, default: [] },
        exclude: { type: 'string', multiple: true, default: [] },
        rules: { type: 'string' },
        'disable-rules': { type: 'string' },
        'fail-on': { type: 'string', default: 'minor' },
        format: { type: 'string', default: 'text' },
        output: { type: 'string' },
        incomplete: { type: 'boolean', default: false },
        urls: { type: 'string' },
        browser: { type: 'string', default: 'chromium' },
        timeout: { type: 'string', default: '30000' },
        'wait-for': { type: 'string' },
        help: { type: 'boolean', short: 'h', default: false },
        version: { type: 'boolean', short: 'v', default: false },
      },
    });
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : String(error));
  }
  const { values: v, positionals } = parsed;

  const engines = list(v.engines).map((e) =>
    oneOf(e, ['axe', 'ibm', 'native'] as const, '--engines'),
  );
  if (engines.length === 0) throw new UsageError('--engines needs at least one engine');
  const timeout = Number(v.timeout);
  if (!Number.isInteger(timeout) || timeout <= 0) {
    throw new UsageError('--timeout must be a positive number of milliseconds');
  }
  const failOn = oneOf(
    v['fail-on'],
    ['minor', 'moderate', 'serious', 'critical', 'none'] as const,
    '--fail-on',
  );

  const options: CliOptions = {
    urls: positionals,
    wcag: oneOf(v.wcag, ['2.0', '2.1', '2.2'] as const, '--wcag'),
    level: oneOf(v.level.toUpperCase(), ['A', 'AA', 'AAA'] as const, '--level'),
    bestPractices: v['best-practices'],
    engines: [...new Set(engines)],
    include: v.include,
    exclude: v.exclude,
    disableRules: list(v['disable-rules']),
    failOn: failOn === 'none' ? null : failOn,
    format: oneOf(v.format, ['text', 'json', 'sarif', 'html'] as const, '--format'),
    incomplete: v.incomplete,
    browser: oneOf(v.browser, ['chromium', 'firefox', 'webkit'] as const, '--browser'),
    timeout,
    help: v.help,
    version: v.version,
  };
  if (v.rules !== undefined) options.rules = list(v.rules);
  if (v.urls !== undefined) options.urlsFile = v.urls;
  if (v.output !== undefined) options.output = v.output;
  if (v['wait-for'] !== undefined) options.waitFor = v['wait-for'];
  return options;
}

/** Parses a URL list file: one URL per line, blank lines and `#` comments ignored. */
export function parseUrlList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*/, '').trim())
    .filter(Boolean);
}

/** Validates and normalizes URLs. Bare host names get `https://`. */
export function normalizeUrls(urls: readonly string[]): string[] {
  return urls.map((raw) => {
    const value = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new UsageError(`Invalid URL: ${raw}`);
    }
    if (!['http:', 'https:', 'file:'].includes(url.protocol)) {
      throw new UsageError(`Unsupported URL scheme: ${raw}`);
    }
    return url.href;
  });
}
