import { resolveConfig, summarize, type CheckResult } from '@a11y-checker/core';
import { describe, expect, it } from 'vitest';
import { buildReport } from '../src/lib/export.js';

const result: CheckResult = {
  url: 'https://www.example.com/path?q=1',
  timestamp: '2026-11-26T09:05:59.123Z',
  duration: 10,
  engines: [{ id: 'axe', version: '4.14.1' }],
  config: resolveConfig(),
  issues: [],
  summary: summarize([]),
  errors: [],
};

describe('buildReport', () => {
  it.each([
    ['json', 'a11y-report-www.example.com-2026-11-26-0905.json', 'application/json'],
    ['sarif', 'a11y-report-www.example.com-2026-11-26-0905.sarif', 'application/sarif+json'],
    ['html', 'a11y-report-www.example.com-2026-11-26-0905.html', 'text/html'],
  ] as const)('builds a %s file', (format, filename, mimeType) => {
    const file = buildReport(result, format);
    expect(file.filename).toBe(filename);
    expect(file.mimeType).toBe(mimeType);
    expect(file.content.length).toBeGreaterThan(0);
  });

  it('uses a placeholder for pages without a host', () => {
    expect(buildReport({ ...result, url: 'about:blank' }, 'json').filename).toMatch(
      /^a11y-report-page-/,
    );
  });

  it('writes valid JSON and SARIF', () => {
    expect(JSON.parse(buildReport(result, 'json').content)).toEqual(result);
    expect(JSON.parse(buildReport(result, 'sarif').content)).toMatchObject({ version: '2.1.0' });
  });
});
