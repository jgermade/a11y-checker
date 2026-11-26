import type { CheckConfig, WcagLevel, WcagVersion } from '@a11y-checker/core';
import { ENGINE_IDS, type EngineId } from './engines.js';

export type GroupBy = 'impact' | 'rule' | 'wcag';

export interface Settings {
  wcagVersion: WcagVersion;
  wcagLevel: WcagLevel;
  bestPractices: boolean;
  /** Also report results that need manual review (`incomplete`). */
  showIncomplete: boolean;
  groupBy: GroupBy;
  /** Engines to run. Never empty. */
  engines: EngineId[];
}

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  wcagVersion: '2.2',
  wcagLevel: 'AA',
  bestPractices: false,
  showIncomplete: true,
  groupBy: 'impact',
  engines: ['axe'],
};

export const WCAG_VERSION_OPTIONS: readonly WcagVersion[] = ['2.0', '2.1', '2.2'];
export const WCAG_LEVEL_OPTIONS: readonly WcagLevel[] = ['A', 'AA', 'AAA'];
export const GROUP_BY_OPTIONS: readonly { value: GroupBy; label: string }[] = [
  { value: 'impact', label: 'Impact' },
  { value: 'rule', label: 'Rule' },
  { value: 'wcag', label: 'WCAG criterion' },
];

const pick = <T>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;
const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);

function sanitizeEngines(value: unknown): EngineId[] {
  if (!Array.isArray(value)) return [...DEFAULT_SETTINGS.engines];
  // Keep the canonical order, which decides which engine wins when merging results.
  const engines = ENGINE_IDS.filter((id) => value.includes(id));
  return engines.length > 0 ? engines : [...DEFAULT_SETTINGS.engines];
}

/** Reads settings from untrusted storage, falling back to defaults per field. */
export function sanitizeSettings(raw: unknown): Settings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  return {
    wcagVersion: pick(s.wcagVersion, WCAG_VERSION_OPTIONS, d.wcagVersion),
    wcagLevel: pick(s.wcagLevel, WCAG_LEVEL_OPTIONS, d.wcagLevel),
    bestPractices: bool(s.bestPractices, d.bestPractices),
    showIncomplete: bool(s.showIncomplete, d.showIncomplete),
    groupBy: pick(
      s.groupBy,
      GROUP_BY_OPTIONS.map((o) => o.value),
      d.groupBy,
    ),
    engines: sanitizeEngines(s.engines),
  };
}

export function toCheckConfig(settings: Settings): CheckConfig {
  return {
    wcag: { version: settings.wcagVersion, level: settings.wcagLevel },
    bestPractices: settings.bestPractices,
    outcomes: settings.showIncomplete ? ['violation', 'incomplete'] : ['violation'],
  };
}
