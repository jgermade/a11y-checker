import type { Outcome, WcagLevel, WcagVersion } from './types.js';
import { WCAG_LEVELS, WCAG_VERSIONS } from './wcag.js';

export interface CheckConfig {
  /** Conformance target. Default: WCAG 2.2 AA. */
  wcag?: { version?: WcagVersion; level?: WcagLevel };
  /**
   * Rule selection, by engine rule ID.
   *
   * When `include` is set, only those rules run, and they are reported even if they
   * fall outside the WCAG target or are best practices.
   */
  rules?: { include?: string[]; exclude?: string[] };
  /** CSS selectors to limit the check to. Default: the whole document. */
  include?: string[];
  /** CSS selectors to leave out of the check. */
  exclude?: string[];
  /** Outcomes to report. Default: `['violation', 'incomplete']`. */
  outcomes?: Outcome[];
  /** Also report rules that are not tied to a WCAG criterion. Default: `false`. */
  bestPractices?: boolean;
}

export interface ResolvedConfig {
  wcag: { version: WcagVersion; level: WcagLevel };
  rules: { include: string[] | null; exclude: string[] };
  include: string[];
  exclude: string[];
  outcomes: Outcome[];
  bestPractices: boolean;
}

export class ConfigError extends Error {
  override name = 'ConfigError';
}

const OUTCOMES: readonly Outcome[] = ['violation', 'incomplete', 'pass', 'inapplicable'];

function stringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string' || v.trim() === '')) {
    throw new ConfigError(`${path} must be an array of non-empty strings`);
  }
  return [...new Set(value as string[])];
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
  if (!allowed.includes(value as T)) {
    throw new ConfigError(`${path} must be one of ${allowed.map((a) => `'${a}'`).join(', ')}`);
  }
  return value as T;
}

/** Validates a user config and fills in the defaults. Throws `ConfigError` on invalid input. */
export function resolveConfig(config: CheckConfig = {}): ResolvedConfig {
  // Runtime checks: the config may come from JSON or untyped callers.
  const c = config as Record<string, unknown>;
  if (typeof c !== 'object' || Array.isArray(c)) throw new ConfigError('config must be an object');

  const wcag = (c.wcag ?? {}) as Record<string, unknown>;
  const rules = (c.rules ?? {}) as Record<string, unknown>;

  const outcomes =
    c.outcomes === undefined
      ? (['violation', 'incomplete'] as Outcome[])
      : stringArray(c.outcomes, 'outcomes').map((o, i) => oneOf(o, OUTCOMES, `outcomes[${i}]`));
  if (outcomes.length === 0) throw new ConfigError('outcomes must not be empty');

  if (c.bestPractices !== undefined && typeof c.bestPractices !== 'boolean') {
    throw new ConfigError('bestPractices must be a boolean');
  }

  return {
    wcag: {
      version:
        wcag.version === undefined ? '2.2' : oneOf(wcag.version, WCAG_VERSIONS, 'wcag.version'),
      level: wcag.level === undefined ? 'AA' : oneOf(wcag.level, WCAG_LEVELS, 'wcag.level'),
    },
    rules: {
      include: rules.include === undefined ? null : stringArray(rules.include, 'rules.include'),
      exclude: rules.exclude === undefined ? [] : stringArray(rules.exclude, 'rules.exclude'),
    },
    include: c.include === undefined ? [] : stringArray(c.include, 'include'),
    exclude: c.exclude === undefined ? [] : stringArray(c.exclude, 'exclude'),
    outcomes,
    bestPractices: c.bestPractices ?? false,
  };
}
