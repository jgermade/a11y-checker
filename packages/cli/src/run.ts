import type { CheckConfig, CheckResult } from '@a11y-checker/core';
import { checkA11y } from '@a11y-checker/playwright';
import { toHTML, toSARIF, toText, violationsAtLeast } from '@a11y-checker/sdk/reporters';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, firefox, webkit, type Browser } from 'playwright';
import pkg from '../package.json' with { type: 'json' };
import {
  HELP,
  normalizeUrls,
  parseCliArgs,
  parseUrlList,
  UsageError,
  type CliOptions,
} from './args.js';

export interface CliIO {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

export const EXIT = { OK: 0, VIOLATIONS: 1, ERROR: 2 } as const;

const BROWSERS = { chromium, firefox, webkit };

export function toCheckConfig(options: CliOptions): CheckConfig {
  const config: CheckConfig = {
    wcag: { version: options.wcag, level: options.level },
    bestPractices: options.bestPractices,
    include: options.include,
    exclude: options.exclude,
    rules: { exclude: options.disableRules },
  };
  if (options.rules && config.rules) config.rules.include = options.rules;
  return config;
}

/** File name for a URL's HTML report: `example.com-docs-page.html`. */
export function reportFileName(url: string): string {
  const { hostname, pathname } = new URL(url);
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    // Keep the encoded path.
  }
  const slug = `${hostname}${path}`
    .replace(/[^a-z0-9.-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  return `${slug || 'page'}.html`;
}

function render(results: CheckResult[], options: CliOptions): string {
  switch (options.format) {
    case 'json':
      return `${JSON.stringify(results.length === 1 ? results[0] : results, null, 2)}\n`;
    case 'sarif': {
      const logs = results.map((r) => toSARIF(r));
      const [first] = logs;
      if (!first) return '';
      return `${JSON.stringify({ ...first, runs: logs.flatMap((l) => l.runs) }, null, 2)}\n`;
    }
    case 'html':
      return results[0] ? toHTML(results[0]) : '';
    case 'text':
      return results.map((r) => toText(r, { incomplete: options.incomplete })).join('\n');
  }
}

async function writeReports(results: CheckResult[], options: CliOptions, io: CliIO) {
  const { output, format } = options;
  if (format === 'html' && results.length > 1) {
    if (!output) throw new UsageError('--format html with several URLs needs --output <directory>');
    await mkdir(output, { recursive: true });
    for (const result of results) {
      const file = join(output, reportFileName(result.url));
      await writeFile(file, toHTML(result));
      io.stderr(`Wrote ${file}\n`);
    }
    return;
  }
  const report = render(results, options);
  if (output) {
    await writeFile(output, report);
    io.stderr(`Wrote ${output}\n`);
  } else {
    io.stdout(report);
  }
}

/**
 * Runs the CLI and returns its exit code: 0 when no violation reaches `--fail-on`, 1
 * when one does, 2 on usage errors or when a page could not be checked.
 */
export async function runCli(argv: readonly string[], io: CliIO): Promise<number> {
  let options: CliOptions;
  let urls: string[];
  try {
    options = parseCliArgs(argv);
    if (options.help) {
      io.stdout(`${HELP}\n`);
      return EXIT.OK;
    }
    if (options.version) {
      io.stdout(`${pkg.version}\n`);
      return EXIT.OK;
    }
    const listed = options.urlsFile ? parseUrlList(await readFile(options.urlsFile, 'utf8')) : [];
    urls = normalizeUrls([...options.urls, ...listed]);
    if (urls.length === 0) throw new UsageError('No URL to check. Run with --help for usage.');
  } catch (error) {
    if (error instanceof UsageError || (error as NodeJS.ErrnoException).code === 'ENOENT') {
      io.stderr(`a11y-checker: ${(error as Error).message}\n`);
      return EXIT.ERROR;
    }
    throw error;
  }

  const config = toCheckConfig(options);
  const results: CheckResult[] = [];
  let failed = false;
  let browser: Browser;
  try {
    browser = await BROWSERS[options.browser].launch();
  } catch (error) {
    io.stderr(
      `a11y-checker: could not launch ${options.browser}. Install it with "npx playwright install ${options.browser}".\n${(error as Error).message}\n`,
    );
    return EXIT.ERROR;
  }

  try {
    for (const url of urls) {
      const page = await browser.newPage();
      try {
        await page.goto(url, { timeout: options.timeout, waitUntil: 'load' });
        if (options.waitFor) {
          await page.waitForSelector(options.waitFor, { timeout: options.timeout });
        }
        const result = await checkA11y(page, { ...config, engines: options.engines });
        results.push(result);
        for (const error of result.errors) {
          io.stderr(`a11y-checker: ${url}: engine ${error.engine} failed: ${error.message}\n`);
          failed = true;
        }
      } catch (error) {
        io.stderr(`a11y-checker: ${url}: ${(error as Error).message.split('\n')[0] ?? ''}\n`);
        failed = true;
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  try {
    if (results.length > 0) await writeReports(results, options, io);
  } catch (error) {
    io.stderr(`a11y-checker: ${(error as Error).message}\n`);
    return EXIT.ERROR;
  }

  if (failed) return EXIT.ERROR;
  const failOn = options.failOn;
  if (failOn && results.some((r) => violationsAtLeast(r, failOn).length > 0)) {
    return EXIT.VIOLATIONS;
  }
  return EXIT.OK;
}
