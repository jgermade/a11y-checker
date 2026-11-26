import type { EngineProvider, Issue } from '../src/index.js';

export function makeIssue(overrides: Partial<Issue> & Pick<Issue, 'ruleId'>): Issue {
  const engine = overrides.engine ?? 'fake';
  const outcome = overrides.outcome ?? 'violation';
  return {
    id: `${engine}/${overrides.ruleId}/${outcome}`,
    engine,
    outcome,
    description: '',
    help: '',
    wcag: ['1.1.1'],
    actRuleIds: [],
    tags: [],
    nodes: [{ target: [['img']], html: '<img>' }],
    ...overrides,
  };
}

export function fakeEngine(id: string, issues: Issue[] | Error): EngineProvider {
  return {
    id,
    version: '1.0.0',
    run: () => (issues instanceof Error ? Promise.reject(issues) : Promise.resolve(issues)),
  };
}
