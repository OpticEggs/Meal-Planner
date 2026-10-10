# Evidence — exact quantities for new recipe versions (EQ), verified at dbc105d

- `summary.md` + logs/JSON: `scripts/verify-all.sh` on `dbc105d` (clean tree, source hash unchanged): vitest 1164/1164,
  Playwright 151/151 (Chromium), mutation self-test PASS, 112 mutations killed / 0 survived / 0 error.
- `rehearsal/`: `scripts/rehearse-upgrade.sh 43cd1ce --old-suite` run on the committed `dbc105d`, on a throwaway
  PostgreSQL cluster (port 54339, deleted afterwards) — `summary.txt` has the ten checks, all PASS. Data is the
  synthetic test fixture plus what `43cd1ce`'s own commands wrote; exports carry no credentials (by design). The
  schema listing (`1-columns.json`) names columns such as `password`; it holds no values.
- `dev/eq-red-on-5e19991.log`: the EQ integration tests against `5e19991` before the implementation (with the new,
  not yet used `src/domain/exact.ts` and a one-line `unitFactor` export present): 10 of 10 failed — missing columns,
  no exact fraction on grocery lines; EQ-07 failed because the line had no exact amount to read.
- `dev/eq-mutations/`: targeted runs of the new EQ/LA mutations and the re-anchored/re-targeted ones. The first run
  shows two results that led to changes: `EQ_conversion_through_decimal` SURVIVED (EQ-07 only converted amounts that
  end as decimals → EQ-07b added) and `RIO01_per_serving_rounded_half_up` ERROR (migration 015 now refuses the
  defect in the database → re-targeted to the per-serving unit test). The second run: both KILLED.
- `dev/sample-recipes-check.txt`: `scripts/sample-recipes.ts` on the disposable test database writes exact rows;
  fixture rows stay legacy.
- No website, Kroger, Instacart, FoodData Central, Render or Neon request was made; no household data was read or
  written; the lab branch was not written. Browser JSON secret redacted.
