import type { NodeTarget } from './types.js';

/** Separator between frame levels in a formatted target. */
export const FRAME_SEPARATOR = ' → ';
/** Separator between shadow DOM hosts and their content in a formatted target. */
export const SHADOW_SEPARATOR = ' >>> ';

/**
 * Formats a node target for display.
 *
 * @example
 * formatTarget([['iframe#app'], ['#host', 'button']]) // 'iframe#app → #host >>> button'
 */
export function formatTarget(target: NodeTarget): string {
  return target.map((chain) => chain.join(SHADOW_SEPARATOR)).join(FRAME_SEPARATOR);
}
