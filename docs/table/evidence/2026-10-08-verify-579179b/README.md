# Evidence — B21/B22 (verify-all on 579179b)

- `summary.md` and the logs/JSON beside it: `scripts/verify-all.sh` on the clean commit `579179b`
  (B21/B22 implementation `5250e62` + disclosed test correction `579179b`): typecheck PASS · vitest 315/315 ·
  build PASS · Playwright 121/121 · mutation self-test PASS · 67 mutations killed, 0 survived, 0 error.
- `verify-5250e62-FAIL/`: the first full run, on `5250e62`. **FAILED**: one mutation (COOK_second_record_added)
  was ERROR — the new database invariant refused the mutant's record and the cook-records tests let the thrown
  error escape. Root cause and correction in ACCEPTANCE "B21/B22"; `mut-cook-fix/` shows all five COOK
  mutations killed by assertion after the correction.
- `red/b21-b22-red-on-3632963.log`: the committed B21/B22 test file run on `3632963` (schema 008): 12 of 17 fail —
  10 by assertion on the gaps, 2 because the link column did not exist yet.
- `mutation-b21-b22-first-run-ERROR/`: the first run of the three new mutations, classified ERROR (the tests let
  thrown command errors escape); fixed before commit; all three KILLED in the full run.
- `upgrade-009/`: a populated 008 database with planted cases (valid chains, a historical duplicate, two
  cross-generation violations possible under 008) upgraded to 009: original columns of all 13 rows identical,
  violations kept and marked duplicates, no event with two effective records; the upgraded database refuses a
  raw second record; a pg_dump backup restored with the trigger and indexes, which still refuse.
- The test-only auth secret is redacted. Chromium only; Safari/WebKit, VoiceOver and devices NOT RUN (B8).
