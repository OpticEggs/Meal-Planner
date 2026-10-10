# Phase 2C final verification — tested commit `44251ec`

The tested commit is `44251ec46987cc3c8ebf10f4b5574427d4d612b7`. The tree was clean before and after the run, and the
index hash did not change (`identity.txt`). It merges `main` `8ae5497`. The last engine change is `3372dfb`; the last
code change (the `semantic-v3` mutation spec) is `b0c4b1c`. Logs were written outside the repository during the run
and copied here afterwards. Scripts: `run-verify.sh`, `sub.sh`, `h3-equivalence.py`.

| Check | Result | Log |
|---|---|---|
| Package typecheck | exit 0 | `pkg-typecheck.log` |
| Package tests | **12 143 passed, 11 skipped**. The 11 skips are the ledger's 11 (9 + 1 live-parity tests, 1 CLI optional-scope test). No new skip. The suite includes both required `semantic-v3` harnesses (2C corpus 4 082 firm; frozen sets 1 035), the unit-alias manifest test and purity (no I/O, clock, randomness or console in `src/`) | `pkg-test-verbose.log`, `skip-ledger.txt` |
| Frozen code unchanged since `1d312a8` | no diff in `semantic-v1`, `semantic-v2`, legacy, `bench/`, `fixtures/`, their tests, parity, the 2B corpus and harness, or EVALUATION-PLAN-v3 | `frozen-unchanged.log` |
| `--split every --pages`, run twice | byte-identical; no holdout-v3 line | `bench-every.log` |
| Holdout-v3 rerun vs the preserved historical report (`7eb25ebf…`) | **numerically equivalent, not byte-identical**. For the four historically scored engines every figure is equal. The only differences are the provenance pins (`legacy` and package digests; the new `semantic-v3` digest) | `holdout3-equivalence.log` |
| CLI | `line` with `semantic-v3` (`tub` → review; tamarind → review), with the default engine, and `engines`; `page` refuses a URL | `cli.log` |
| App boundary against `main` `8ae5497` | default engine `legacy-table-import-2`, unchanged; app code identical to `main`; every changed path is under the package or `docs/table/`, plus CLAUDE.md's package sentence; the app does not import the package | `boundary.log`, `app-does-not-import-package.log` |
| Mutations (51 run) | **Real parser and scorer mutations: 41/41 KILLED** (6 `parser-v3`, 24 `parser` for v2, 11 `scorer`). **Harness self-test controls: 10/10 as designed** (1 KILLED, 2 KILLED-UNEXPECTED, 1 SURVIVED, 6 ERROR). They are reported separately and are not defects found | `mutations.md`, `mutations.json` |
| Root typecheck | exit 0 | `root-typecheck.log` |
| Root vitest | **1178/1178**, with migrations applied to `table_test` | `root-vitest.log` |
| `next build` | exit 0 | `next-build.log` |

**Not run:**
- **Playwright:** no app code changed (it is identical to `main` `8ae5497`).
- **Any holdout-v4 evaluation:** none exists, because Phase 2C stopped before evaluation.
