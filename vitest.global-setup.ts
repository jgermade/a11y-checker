import { execSync } from 'node:child_process';

/**
 * Builds every package before the e2e tests, which load built artifacts (the SDK's
 * IIFE bundle and the browser extension). Set `A11Y_CHECKER_PREBUILT=1` to skip
 * this when the packages were just built, as CI does.
 */
export default function setup(): void {
  if (process.env.A11Y_CHECKER_PREBUILT === '1') return;
  execSync('pnpm build', { stdio: 'inherit' });
}
