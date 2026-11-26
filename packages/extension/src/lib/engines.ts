/** Engines the extension can run, in the order they run (the first one wins merges). */
export const ENGINES = [
  { id: 'axe', label: 'axe-core', script: '/a11y-checker.iife.js' },
  { id: 'ibm', label: 'IBM Equal Access', script: '/engine-ibm.iife.js' },
  { id: 'native', label: 'a11y-checker (ACT rules)', script: '/engine-native.iife.js' },
] as const;

export type EngineId = (typeof ENGINES)[number]['id'];

export const ENGINE_IDS: readonly EngineId[] = ENGINES.map((e) => e.id);

export const engineLabel = (id: string): string => ENGINES.find((e) => e.id === id)?.label ?? id;
