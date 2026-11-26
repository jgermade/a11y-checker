import type { CheckConfig, CheckResult, NodeTarget } from '@a11y-checker/core';

export interface FrameCoverage {
  /** Frames found in the page, including the top-level document. */
  total: number;
  /** Frames the engine was injected into and checked. */
  checked: number;
}

export type Request =
  | { type: 'check'; tabId: number; config: CheckConfig }
  | { type: 'highlight'; tabId: number; target: NodeTarget | null };

export type CheckResponse =
  { ok: true; result: CheckResult; frames: FrameCoverage } | { ok: false; error: string };

export type HighlightResponse = { ok: true; found: boolean } | { ok: false; error: string };

export function isRequest(value: unknown): value is Request {
  if (!value || typeof value !== 'object') return false;
  const { type, tabId } = value as Record<string, unknown>;
  return (type === 'check' || type === 'highlight') && typeof tabId === 'number';
}
