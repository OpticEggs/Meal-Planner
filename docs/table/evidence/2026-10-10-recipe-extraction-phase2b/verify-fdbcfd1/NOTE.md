# Package checks at the scoring commit `fdbcfd1` — failure found and fixed

- **Package typecheck:** exit 0.
- **Package tests:** 11 tests failed, all in `bench/__tests__/holdout3.test.ts`; 5088 passed and 11 were skipped
  (`pkg-vitest.log`).
- **Cause:** the test helper builds the "absent" and "synthetic present" fixture copies. It removed the real
  `holdout-v3.jsonl` and `FREEZE-v3.json` but not the real `EXPOSURE-AUDIT-v3.json`, which `f6cc0c6` had just
  added. The audit then named ids that the copies do not have.
- **Scope:** test setup only. The scoring run itself passed the bench invariants with all the real files.
- **Fix:** `7312648`. The helper now strips all three files and their manifest entries. The scorer code is
  unchanged (`bench/outcomes.ts` `7821e853…`).

The mutation run that had started after these tests was stopped and is not evidence. The complete checks were
rerun at the final tested commit, in `../verify-final/`.
