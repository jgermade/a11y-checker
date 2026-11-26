export * from './types.js';
export { resolveConfig, ConfigError, type CheckConfig, type ResolvedConfig } from './config.js';
export type { EngineContext, EngineProvider } from './engine.js';
export {
  runCheck,
  isIssueInScope,
  compareIssues,
  summarize,
  IMPACTS,
  type RunOptions,
  type CheckResult,
} from './runner.js';
export {
  SUCCESS_CRITERIA,
  WCAG_LEVELS,
  WCAG_VERSIONS,
  isCriterionInScope,
  type SuccessCriterion,
} from './wcag.js';
export { hasLayoutSupport } from './environment.js';
