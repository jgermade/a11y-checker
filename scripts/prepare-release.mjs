// Prepares the pending changesets for a release with a fixed bump type.
//
// Usage: node scripts/prepare-release.mjs <patch|minor|major>
//
// The release workflow decides the bump with its input, not with the changesets:
// - every pending changeset is rewritten to use that bump type, so its summary still
//   ends up in the changelogs;
// - if there are no pending changesets, one is created for every public package.
// All packages share one version (the `fixed` group in .changeset/config.json), so
// `changeset version` then bumps all of them to the same new version.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const BUMPS = ['patch', 'minor', 'major'];
const bump = process.argv[2];
if (!BUMPS.includes(bump)) {
  console.error(`usage: node scripts/prepare-release.mjs <${BUMPS.join('|')}>`);
  process.exit(1);
}

const root = new URL('../', import.meta.url);
const changesetDir = new URL('.changeset/', root);
const pending = readdirSync(changesetDir).filter(
  (name) => name.endsWith('.md') && name !== 'README.md',
);

// A package line in the front matter, for example `'@a11y-checker/core': minor`.
const PACKAGE_LINE = /^(\s*['"]?[^'"\s:]+['"]?\s*:\s*)(patch|minor|major)\s*$/;

for (const name of pending) {
  const file = new URL(name, changesetDir);
  const content = readFileSync(file, 'utf8');
  const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---/;
  if (!FRONT_MATTER.test(content)) throw new Error(`.changeset/${name} has no front matter`);
  const rewritten = content.replace(FRONT_MATTER, (_, frontMatter) => {
    const lines = frontMatter.split(/\r?\n/).map((line) => line.replace(PACKAGE_LINE, `$1${bump}`));
    return `---\n${lines.join('\n')}\n---`;
  });
  writeFileSync(file, rewritten);
}

if (pending.length === 0) {
  const publicPackages = readdirSync(new URL('packages/', root), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) =>
      JSON.parse(readFileSync(new URL(`packages/${entry.name}/package.json`, root), 'utf8')),
    )
    .filter((pkg) => !pkg.private)
    .map((pkg) => pkg.name)
    .sort();
  const lines = publicPackages.map((name) => `'${name}': ${bump}`).join('\n');
  writeFileSync(
    new URL('release.md', changesetDir),
    `---\n${lines}\n---\n\nMaintenance release.\n`,
  );
}

console.log(
  pending.length === 0
    ? `No pending changesets: created .changeset/release.md (${bump}).`
    : `Set ${pending.length} pending changeset(s) to ${bump}.`,
);
