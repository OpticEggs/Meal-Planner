# Evidence — RIO recheck correction against the original package, verified at 43cd1ce

- `summary.md` + logs/JSON: `scripts/verify-all.sh` on `43cd1ce` (clean tree, source hash unchanged): vitest 1142/1142,
  Playwright 150/150 (Chromium), mutation self-test PASS, 104 mutations killed / 0 survived / 0 error.
  A first run on the same commit was cut off when the container restarted during the browser stage (no result); the
  run recorded here was started afresh from a clean tree.
- `dev/rio-02-original-red-on-bca110e.log`: the new RIO-02 tests (exact original cases) against unchanged `bca110e`
  source (`git diff HEAD -- src` empty): 19 failures — `1 tsp salt (smoked)` / `pepper (white)` / `salt (garlic)`
  omitted by the parser, `salt (smoked)` etc. classified as household seasonings, the import and the saved-recipe
  grocery projection dropping them. The explicit-request case passed already.
- `dev/rio-03f-focus-red-before-fix.log`: the new RIO-03e–g browser tests on the unchanged review screen. RIO-03f failed
  on a product defect (focus not on the row after Use moved it to another group). The RIO-03e and RIO-03g failures in
  that log were test-setup errors of mine, not product defects: the saved draft is reopened from the "Saved links" tab,
  and Alex's saved draft legitimately leaves two lines undecided; both tests were corrected, not the product.
- `dev/rio01/`: the RIO-01 measurement script and its output — 295,472 cases (single recipes and 200,000 pairs sharing an
  ingredient, count/volume/mass with conversions, 7,571 exactly on a package boundary): current storage 0 over / 0
  under; 12-place half-up (before `bca110e`) 1,222 over; legacy 4-place half-up (before `8e6bd6e`) 1,242 over and 115
  under. The committed test `tests/unit/rio01-boundaries.test.ts` runs a reduced matrix on every verification.
- `dev/rio02-mutations/`: targeted runs of the two new and three related seasoning mutations (all KILLED; one existing
  mutation was re-anchored with the same injected defect).
- No website, Kroger, Instacart or FoodData Central request was made; the pilot was not contacted; no lab branch was
  written. Browser JSON secret redacted.
