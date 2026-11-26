// Runs the Cypress project in test/project with the real Cypress binary.
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const CYPRESS = join(dirname(require.resolve('cypress/package.json')), 'bin', 'cypress');
const PROJECT = fileURLToPath(new URL('./project/', import.meta.url));

function cypress(args: string[]): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [CYPRESS, ...args],
      { cwd: PROJECT, maxBuffer: 50 * 1024 * 1024, env: { ...process.env, NO_COLOR: '1' } },
      (error, stdout, stderr) => {
        resolve({ code: error ? Number(error.code ?? 1) : 0, output: `${stdout}\n${stderr}` });
      },
    );
  });
}

// The Cypress binary is downloaded separately (`pnpm exec cypress install`). CI sets
// A11Y_CHECKER_REQUIRE_CYPRESS=1 so that a missing binary fails instead of skipping.
const installed = (await cypress(['verify'])).code === 0;
if (!installed && process.env.A11Y_CHECKER_REQUIRE_CYPRESS === '1') {
  throw new Error(
    'The Cypress binary is not installed. Run: pnpm --filter @a11y-checker/cypress exec cypress install',
  );
}

describe.skipIf(!installed)('cy.checkA11y (Cypress)', () => {
  it('runs the Cypress project', { timeout: 300_000 }, async () => {
    const { code, output } = await cypress(['run', '--project', PROJECT, '--browser', 'electron']);
    expect(output, output.slice(-4000)).toMatch(/All specs passed!/);
    expect(output).toMatch(/5 passing/);
    expect(code).toBe(0);
  });
});
