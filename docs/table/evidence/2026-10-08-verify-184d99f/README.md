# Evidence — URL to cart (B25), verified at 184d99f

- `summary.md` and the logs/JSON beside it: `scripts/verify-all.sh` on `184d99f` (clean tree, source hash unchanged):
  vitest 1095/1095, Playwright 131/131 (Chromium), mutation self-test PASS, 83 mutations killed / 0 survived / 0 error.
- `verify-6fde009-FAIL/`: the first full run, on the implementation commit `6fde009`, **FAILED** one test (X12
  export round-trip: rows listed in a different order when the two databases chose different query plans). Fixed in
  `184d99f` (stable export order) with a new test; kept as the failed result it was.
- `red/u2c-red-on-9623de4.log`: the new URL-to-cart tests on the base commit (14 failed; two files fail at import —
  the capabilities did not exist). `red/x12-order-red-on-6fde009.log`: the new export-order test failing without the fix.
- `dev/`: development runs before the commit — the first full browser run that caught the dropped add-from-link
  result (U2C-E2), the repeat run that showed the test-reset deadlock, and the targeted mutation runs.
- No website, Kroger, Instacart or FoodData Central request was made by any test. The secret in browser JSON is redacted.
