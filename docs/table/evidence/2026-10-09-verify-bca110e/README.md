# Evidence — import-overhaul corrections RIO-01..03, verified at bca110e

- `summary.md` + logs/JSON: `scripts/verify-all.sh` on `bca110e` (clean tree, source hash unchanged): vitest 1091/1091,
  Playwright 145/145 (Chromium), mutation self-test PASS, 102 mutations killed / 0 survived / 0 error.
- RIO-01..03 are **reconstructed** from the three problems the owner named: the correction package
  (`Table-Import-Overhaul-Correction-12434c0.zip`) did not reach this session.
- `dev/rio-01-02-red-on-12434c0.log`: the new integration tests (real commands, PostgreSQL) against `12434c0` before
  any fix — RIO-01 buys 4 cucumbers instead of 3; RIO-02 leaves "1 pepper, diced" out of the import.
- `dev/rio-03-red-on-12434c0.log`, `dev/rio-03a-red-on-12434c0.log`: the browser tests against the `12434c0`
  production build — Save is not held and nothing names the row; there is no Cancel; in the 03a run the database
  then holds the old ⅓ cup (0.083333333333 per serving) although ½ cup had been typed.
- `dev/rio-mutations/`: targeted runs of the two new mutations and the existing seasoning mutations before the full
  harness (all KILLED).
- `lab-reconciliation/`: the Recipe Extraction Lab provenance commit, prepared and tested but not pushed (see its README).
- No website, Kroger, Instacart or FoodData Central request was made; the pilot was not contacted. Browser JSON secret
  redacted.
