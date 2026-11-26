import type { Outcome, ResolvedConfig, WcagLevel, WcagVersion } from '@a11y-checker/core';
import type axe from 'axe-core';

const VERSION_PREFIX: Record<WcagVersion, string> = {
  '2.0': 'wcag2',
  '2.1': 'wcag21',
  '2.2': 'wcag22',
};
const LEVEL_SUFFIX: Record<WcagLevel, string> = { A: 'a', AA: 'aa', AAA: 'aaa' };
const VERSIONS: readonly WcagVersion[] = ['2.0', '2.1', '2.2'];
const LEVELS: readonly WcagLevel[] = ['A', 'AA', 'AAA'];

/**
 * axe tags for every version and level up to the target, e.g. 2.1 AA →
 * `wcag2a, wcag2aa, wcag21a, wcag21aa`. Only tags that axe knows are returned,
 * because axe rejects unknown tags.
 */
export function tagsForTarget(
  version: WcagVersion,
  level: WcagLevel,
  knownTags: ReadonlySet<string>,
): string[] {
  const tags: string[] = [];
  for (const v of VERSIONS.slice(0, VERSIONS.indexOf(version) + 1)) {
    for (const l of LEVELS.slice(0, LEVELS.indexOf(level) + 1)) {
      tags.push(VERSION_PREFIX[v] + LEVEL_SUFFIX[l]);
    }
  }
  return tags.filter((tag) => knownTags.has(tag));
}

const RESULT_TYPES: Record<Outcome, axe.resultGroups> = {
  violation: 'violations',
  incomplete: 'incomplete',
  pass: 'passes',
  inapplicable: 'inapplicable',
};

/** Translates a resolved config into `axe.run()` options. */
export function buildRunOptions(
  config: ResolvedConfig,
  rules: readonly axe.RuleMetadata[],
): axe.RunOptions {
  const knownRules = new Set(rules.map((r) => r.ruleId));
  const options: axe.RunOptions = {
    resultTypes: config.outcomes.map((o) => RESULT_TYPES[o]),
    iframes: true,
  };

  if (config.rules.include) {
    // axe throws on unknown rule IDs; they may belong to another engine.
    options.runOnly = {
      type: 'rule',
      values: config.rules.include.filter((id) => knownRules.has(id)),
    };
  } else {
    const knownTags = new Set(rules.flatMap((r) => r.tags));
    const tags = tagsForTarget(config.wcag.version, config.wcag.level, knownTags);
    if (config.bestPractices && knownTags.has('best-practice')) tags.push('best-practice');
    options.runOnly = { type: 'tag', values: tags };
  }

  const excluded = config.rules.exclude.filter((id) => knownRules.has(id));
  if (excluded.length > 0) {
    options.rules = Object.fromEntries(excluded.map((id) => [id, { enabled: false }]));
  }
  return options;
}

/** Translates the config's include/exclude selectors into an axe context. */
export function buildContext(config: ResolvedConfig, doc: Document): axe.ElementContext {
  if (config.include.length === 0 && config.exclude.length === 0) return doc;
  const context: { include?: string[]; exclude?: string[] } = {};
  if (config.include.length > 0) context.include = [...config.include];
  if (config.exclude.length > 0) context.exclude = [...config.exclude];
  return context as axe.ElementContext;
}
