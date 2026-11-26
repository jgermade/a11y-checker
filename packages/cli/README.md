# @a11y-checker/cli

Check web pages for accessibility issues (WCAG 2.0–2.2, A–AAA) from the command line or
CI, in a real browser.

```bash
npm install -D @a11y-checker/cli
npx playwright install chromium   # once: the browser the checks run in

npx a11y-checker https://example.com
```

## Examples

```bash
# Several pages, failing only on serious and critical violations
npx a11y-checker https://example.com https://example.com/docs --fail-on serious

# A list of URLs, SARIF for GitHub code scanning
npx a11y-checker --urls urls.txt --format sarif --output a11y.sarif

# One HTML report per page
npx a11y-checker --urls urls.txt --format html --output reports/

# Both engines, WCAG 2.1 AA, only the main content, after the app has rendered
npx a11y-checker http://localhost:3000 --engines axe,ibm --wcag 2.1 \
  --include main --wait-for "#app[data-ready]"
```

Run `a11y-checker --help` for every option.

## Exit codes

| Code | Meaning                                                         |
| ---- | --------------------------------------------------------------- |
| 0    | No violation at or above `--fail-on` (default: `minor`, so any) |
| 1    | At least one violation at or above `--fail-on`                  |
| 2    | Usage error, or a page or engine could not be checked           |

`--fail-on none` always exits with 0, unless there is an error.

## Output

- `text` (default): a summary and each violation, with selectors, HTML and fix
  suggestions. Add `--incomplete` to also list the items that need review.
- `json`: the `CheckResult` for one URL, or an array of results for several.
- `sarif`: one SARIF 2.1.0 log with one run per URL.
- `html`: a standalone report. With several URLs, `--output` must be a directory, and
  each page gets its own report.

Reports go to stdout unless `--output` is set. Progress and errors go to stderr.

## GitHub Actions

```yaml
- run: npx playwright install --with-deps chromium
- run: npx a11y-checker --urls urls.txt --format sarif --output a11y.sarif
- uses: github/codeql-action/upload-sarif@v3
  if: always()
  with:
    sarif_file: a11y.sarif
```

## License

MIT
