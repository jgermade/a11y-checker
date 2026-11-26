import axeCore from 'axe-core';

/** Allows frames of the same origin only. This is axe-core's default. */
export const SAME_ORIGIN = '<same_origin>';
/** Allows frames of any origin. Only use it when you control every frame. */
export const ALL_ORIGINS = '<unsafe_all_origins>';

/**
 * Sets the frame origins this window's axe-core may exchange results with.
 *
 * axe-core checks iframes by talking to the axe-core instance loaded inside each
 * frame. By default it only talks to frames of the same origin, and it skips
 * cross-origin frames **without reporting them**. To check a cross-origin frame,
 * call this in both windows: in the parent with the frame's origin, and in the
 * frame with the parent's origin.
 *
 * Results include HTML from the frame, so only allow origins you trust to see it.
 *
 * @example
 * // In https://site.example, which embeds https://widget.example:
 * allowFrameOrigins([SAME_ORIGIN, 'https://widget.example']);
 * // In https://widget.example:
 * allowFrameOrigins([SAME_ORIGIN, 'https://site.example']);
 */
export function allowFrameOrigins(
  origins: readonly string[],
  axe: Pick<typeof axeCore, 'configure'> = axeCore,
): void {
  if (origins.length === 0) throw new Error('allowFrameOrigins: at least one origin is required');
  axe.configure({ allowedOrigins: [...origins] });
}
