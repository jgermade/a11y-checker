# Developer shortcuts. The release workflow in .github/workflows/release.yml remains
# the default way to publish; `make publish` is the manual alternative.

SHELL := /bin/bash
.SHELLFLAGS := -euo pipefail -c
.DEFAULT_GOAL := help

# Branch that `make publish` is allowed to run from.
PUBLISH_BRANCH ?= main

.PHONY: help node-version install check publish publish-dry-run

help: ## List the available targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "} {printf "  %-16s %s\n", $$1, $$2}'

node-version: ## Check that Node meets the root package.json "engines" minimum
	@node scripts/check-node-version.mjs

install: node-version ## Install dependencies from the lockfile
	pnpm install --frozen-lockfile

check: install ## Run format check, lint, typecheck, build and tests
	pnpm format:check
	pnpm lint
	pnpm typecheck
	pnpm build
	A11Y_CHECKER_PREBUILT=1 pnpm test

publish: ## Apply pending changesets, run all checks and publish to npm
	@if [ -n "$$(git status --porcelain)" ]; then \
	  echo "error: the working tree is not clean; commit or stash your changes first." >&2; \
	  exit 1; \
	fi
	@branch="$$(git branch --show-current)"; \
	if [ "$$branch" != "$(PUBLISH_BRANCH)" ]; then \
	  echo "error: publish from '$(PUBLISH_BRANCH)' (current: '$$branch'), or set PUBLISH_BRANCH=$$branch." >&2; \
	  exit 1; \
	fi
	@node scripts/check-node-version.mjs
	@npm whoami >/dev/null 2>&1 || { echo "error: not logged in to npm; run 'npm login' first." >&2; exit 1; }
	@if find .changeset -maxdepth 1 -name '*.md' ! -name README.md | grep -q .; then \
	  echo "Applying pending changesets..."; \
	  pnpm version-packages; \
	  pnpm install --lockfile-only; \
	  git add -A; \
	  git commit -m "Version packages"; \
	fi
	$(MAKE) check
	pnpm changeset publish
	@echo
	@echo "Published. Push the version commit and the release tags with:"
	@echo "  git push --follow-tags"

publish-dry-run: install ## Build and list what would be published, without publishing
	pnpm build
	pnpm -r publish --dry-run --no-git-checks
