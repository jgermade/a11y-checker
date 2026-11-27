# Developer shortcuts. The release workflow in .github/workflows/release.yml remains
# the default way to publish; `make publish` is the manual alternative.

SHELL := /bin/bash
.SHELLFLAGS := -euo pipefail -c
.DEFAULT_GOAL := help

# Branch that `make publish` is allowed to run from.
PUBLISH_BRANCH ?= main

.PHONY: help node-version install check publish publish-dry-run extension

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

publish: ## Bump every package (BUMP=patch|minor|major), run all checks and publish to npm
	@case "$(BUMP)" in patch|minor|major) ;; *) \
	  echo "error: set BUMP=patch, BUMP=minor or BUMP=major." >&2; exit 1;; \
	esac
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
	node scripts/prepare-release.mjs $(BUMP)
	pnpm version-packages
	git add -A
	git commit -m "Release v$$(node -p "require('./packages/core/package.json').version")"
	$(MAKE) check
	pnpm changeset publish
	@echo
	@echo "Published. Push the version commit and the release tags with:"
	@echo "  git push --follow-tags"

publish-dry-run: install ## Build and list what would be published, without publishing
	pnpm build
	pnpm -r publish --dry-run --no-git-checks

extension: install ## Build and zip the browser extension for the Chrome Web Store and AMO
	@# The extension bundles the IIFE builds of the workspace packages it depends on.
	pnpm --filter "@a11y-checker/extension^..." build
	@# Clear older zips, so the listing below only shows this build.
	find packages/extension/.output -maxdepth 1 -name '*.zip' -delete 2>/dev/null || true
	pnpm --filter @a11y-checker/extension zip
	pnpm --filter @a11y-checker/extension lint:firefox
	@echo
	@echo "Upload to the Chrome Web Store: *-chrome.zip"
	@echo "Upload to Firefox Add-ons (AMO): *-firefox.zip, plus *-sources.zip as the source code"
	@ls -1 packages/extension/.output/*.zip
