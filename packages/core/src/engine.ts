import type { ResolvedConfig } from './config.js';
import type { Issue } from './types.js';

export interface EngineContext {
  /** Document to check. */
  document: Document;
}

/**
 * An accessibility engine (axe-core, IBM Equal Access, the in-house engine...).
 *
 * Providers translate the resolved config into engine options, run the engine and
 * return normalized issues. The runner applies the WCAG scope, outcome and rule
 * filters again afterwards, so providers may pre-filter for speed but do not have to.
 */
export interface EngineProvider {
  /** Short, stable identifier, e.g. `'axe'`. */
  readonly id: string;
  /** Version of the underlying engine. */
  readonly version: string;
  run(context: EngineContext, config: ResolvedConfig): Promise<Issue[]>;
}
