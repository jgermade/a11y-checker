import * as aceModule from 'accessibility-checker-engine/ace-node.js';

/** The parts of the IBM engine API this provider uses. */
export interface AceRule {
  messages?: Record<string, Record<string, string>>;
  help?: Record<string, Record<string, string>>;
  rulesets?: { id: string | string[]; num: string | string[]; level: string }[];
  act?: string | (string | Record<string, unknown>)[];
}

export interface AceResult {
  ruleId: string;
  reasonId?: string | number;
  value: [string, string];
  node: Node;
  message: string;
  snippet: string;
  path: Record<string, string>;
}

export interface AceChecker {
  check(node: Node | Document, guidelineIds: string[]): Promise<{ results: AceResult[] }>;
  getGuidelineIds(): string[];
  engine: { getRule(ruleId: string): AceRule | undefined };
}

export interface AceApi {
  Checker: new () => AceChecker;
}

// `ace-node.js` is CommonJS. Bundlers expose its exports as named exports; Node's ESM
// loader only exposes them as `default`.
const loaded = aceModule as unknown as { Checker?: AceApi['Checker']; default?: AceApi };
export const bundledAce: AceApi = loaded.Checker
  ? { Checker: loaded.Checker }
  : (loaded.default as AceApi);
