import type { CheckResult } from '@a11y-checker/core';
import { toHTML, toJSON, toSARIF } from '@a11y-checker/sdk/reporters';

export type ReportFormat = 'json' | 'sarif' | 'html';

export const REPORT_FORMATS: readonly { format: ReportFormat; label: string }[] = [
  { format: 'json', label: 'JSON' },
  { format: 'sarif', label: 'SARIF' },
  { format: 'html', label: 'HTML' },
];

export interface ReportFile {
  filename: string;
  mimeType: string;
  content: string;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/[^a-z0-9.-]/gi, '_') || 'page';
  } catch {
    return 'page';
  }
}

/** `2026-11-26T12:34:56.789Z` → `2026-11-26-1234` */
const stamp = (iso: string) => iso.slice(0, 16).replace('T', '-').replace(':', '');

export function buildReport(result: CheckResult, format: ReportFormat): ReportFile {
  const base = `a11y-report-${hostOf(result.url)}-${stamp(result.timestamp)}`;
  switch (format) {
    case 'json':
      return { filename: `${base}.json`, mimeType: 'application/json', content: toJSON(result) };
    case 'sarif':
      return {
        filename: `${base}.sarif`,
        mimeType: 'application/sarif+json',
        content: JSON.stringify(toSARIF(result), null, 2),
      };
    case 'html':
      return { filename: `${base}.html`, mimeType: 'text/html', content: toHTML(result) };
  }
}
