# Evidence — EQR correction (exact-quantity lineage and "Have enough" binding), verified at 72cf615

Code: `7332b06` (the correction: migration 016, row lineage, exact "Have enough" binding and review identity, audit
ambiguity, tests, mutations) and `72cf615` (upgrade-rehearsal data only: approvals left open across the upgrade;
step labels). Starting point `5aeecc4` (code `dbc105d`).

- `summary.md` + logs/JSON: `scripts/verify-all.sh` on `72cf615` (clean tree, source hash unchanged): vitest 1177/1177, Playwright 153/153 (Chromium), mutation self-test PASS, 121 mutations killed / 0 survived / 0 error.
- `earlier-run-7332b06/summary.md`: the same full verification on `7332b06` before the rehearsal-data commit — PASS
  (vitest 1177/1177, Playwright 153/153, 121 mutations killed). Kept for the record; `72cf615` changes only
  `scripts/rehearsal/populate.mts` and `scripts/rehearse-upgrade.sh`, which no test suite runs.
- `rehearsal-43cd1ce/`, `rehearsal-dbc105d/`: `scripts/rehearse-upgrade.sh <prev> --old-suite` on the committed
  `72cf615`, each on a throwaway PostgreSQL cluster (port 54339, deleted afterwards); `summary.txt` has every
  check. Data: the synthetic fixture plus what the previous release's own commands wrote — an imported recipe, a
  manual one, a recipe listing cucumber twice (an imported 2-for-3 and a typed 0.666666666666) and a title-only edit
  of it, a "some" and a "Have enough" observation, a partial transfer, and two approvals left open (soy sauce, black
  beans). From `dbc105d`: only the cucumber and soy-sauce lines (exact rows behind them) changed review identity;
  the open soy-sauce approval became stale and stayed stale under `dbc105d`; the black-beans approval stayed valid.
  Exports carry no credentials (by design); `1-columns.json` names columns such as `password` and holds no values.
- `dev/` — development runs, labelled; these ran on working trees, not on a commit:
  - `INVALID-eqr-red-db-down.log`: the first attempt at the red run, with local PostgreSQL stopped (ECONNREFUSED
    after a container restart). A setup failure — **not** a result.
  - `eqr-red-on-5aeecc4.log`: `tests/integration/eqr-corrections.test.ts` against the reviewed code `5aeecc4`:
    9 of 12 failed by assertion on the defects; EQR-01d, EQR-02c and
    EQR-02f are guards that already held.
  - `la04-red.log`: LA-04 against the audit as reviewed — failed (ambiguous sources reported as recoverable).
  - `eqr-browser-red-on-5aeecc4.log`: `tests/e2e/eqr-two-members.spec.ts` against a production build of `5aeecc4`:
    both failed on the defects (the changed cucumber took the onion's legacy label; "Nothing to
    buy" for 3.0004 after "Have enough" for 3).
  - `first-full-run-before-test-lineage.log`: the first full vitest run after the repair: 8 failures, all in existing
    tests that save a recipe edit without saying which row each edited row came from (B17 ×3, EQ-05, EQ-05b, URL-13/15,
    T21, U-02). They were given explicit lineage — null where the rows are restated, the stored row where inheritance
    is the point (EQ-05/05b) — as documented in ACCEPTANCE; no assertion was weakened.
  - `eqr-mutations-1/`, `eqr-mutations-2/`: targeted runs of the new and re-anchored mutations (their `head` field
    reads `5aeecc4` because the repair was not yet committed). Run 1: `EQR_lineage_reused` SURVIVED (an equivalent
    mutant — the row-count check still caught it) and `EQR_stale_enough_takes_current` SURVIVED (the "change first"
    race raced a two-command plan change, so the change never landed first). The mutation and the test were
    corrected; run 2: both KILLED. In the full run (`mutation/`) all 121 are KILLED.
- No website, Kroger, Instacart, FoodData Central, Render or Neon request was made; no household data was read or
  written; the lab branch was not written; nothing was deployed. Browser JSON secret redacted
  (`e2e-only-secret[REDACTED]`).
