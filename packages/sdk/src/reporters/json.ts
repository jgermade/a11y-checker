import type { CheckResult } from '@a11y-checker/core';

export interface JsonReportOptions {
  /** Indent the output. Default: `true`. */
  pretty?: boolean;
}

/** Serializes a result as JSON. `JSON.parse()` gives back an equal `CheckResult`. */
export function toJSON(result: CheckResult, options: JsonReportOptions = {}): string {
  return JSON.stringify(result, null, options.pretty === false ? undefined : 2);
}
