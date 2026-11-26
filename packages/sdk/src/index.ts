export {
  check,
  createChecker,
  mergeConfig,
  type Checker,
  type CheckOptions,
  type SingleCheckOptions,
} from './checker.js';
export * from './reporters/index.js';
export { VERSION } from './version.js';
export {
  allowFrameOrigins,
  ALL_ORIGINS,
  createAxeEngine,
  SAME_ORIGIN,
  type AxeEngineOptions,
} from '@a11y-checker/engine-axe';
export {
  ConfigError,
  formatTarget,
  getNodeTarget,
  resolveTarget,
  isCriterionInScope,
  SUCCESS_CRITERIA,
  type CheckConfig,
  type CheckResult,
  type CheckSummary,
  type EngineError,
  type EngineInfo,
  type EngineProvider,
  type Impact,
  type Issue,
  type IssueNode,
  type NodeTarget,
  type Outcome,
  type RelatedRule,
  type ResolvedConfig,
  type WcagLevel,
  type WcagVersion,
} from '@a11y-checker/core';
