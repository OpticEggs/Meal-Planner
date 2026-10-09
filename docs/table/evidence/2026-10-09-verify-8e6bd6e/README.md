# Evidence — import overhaul and mobile redesign, verified at 8e6bd6e

- `summary.md` + logs/JSON: `scripts/verify-all.sh` on `8e6bd6e` (clean tree, source hash unchanged): vitest 1078/1078,
  Playwright 143/143 (Chromium), mutation self-test PASS, 100 mutations killed / 0 survived / 0 error.
- `dev/red-on-cb7b56e.log`: the new parser, quantity, seasoning and import-overhaul tests run against the previous code
  before any fix — the reported pesto line, all five IO cases and the missing modules fail.
- `dev/io-mutations/`: the targeted runs of the new and re-targeted mutations before the full harness (all KILLED).
- Screens: `../2026-10-09-overhaul-screens/`.
- No website, Kroger, Instacart or FoodData Central request was made; the pilot was not contacted. Browser JSON secret
  redacted.
