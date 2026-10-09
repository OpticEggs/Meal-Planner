# Evidence — recheck corrections RUC-01/RUC-02 and Kroger matching UI, verified at c9a95b6

- `summary.md` + logs/JSON: `scripts/verify-all.sh` on `c9a95b6` (clean tree, source hash unchanged): vitest 1117/1117,
  Playwright 136/136 (Chromium), mutation self-test PASS, 88 mutations killed / 0 survived / 0 error.
- `verify-33c84e1-FAIL/`: the run on the correction commit `33c84e1` FAILED in the mutation step (1 ERROR: an anchor
  removed by the content-policy rewrite; 1 SURVIVED: a mutation made non-discriminating by RUC-01's second Budget Bytes
  check). Both re-targeted in `c9a95b6`; kept as the failed result it was.
- `red/ruc-red-on-988c4d1.log`: the new expected-correctness tests against the reviewed code — 11 failed for the
  reported reasons, 3 guards passed. `red/INVALID-*`: two earlier attempts that are not results (database stopped;
  a test fixture bug).
- `upgrade-012/`: populated-database check in disposable databases — `1-seed-on-011.log` (reviewed-era code, migrations
  001–011), `2-upgrade-to-current.log` (current code: 012 only, no existing value changed, photo import, export →
  restore → export identical, photo hash verified), and both scripts.
- `dev/`: the first Kroger browser run that found the bulk-match staleness bug, the passing run, and the targeted
  mutation runs. `review-package/`: the review and assignment this delivery answers (probes and probe output stay in
  the package; they characterize defects and are not acceptance tests).
- No website, Kroger, Instacart or FoodData Central request was made; the pilot was not contacted. Browser JSON secret
  redacted.
