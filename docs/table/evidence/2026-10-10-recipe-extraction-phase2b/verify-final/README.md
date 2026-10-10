# Phase 2B final verification — tested commit `90292c1`

**Tested commit.** `90292c118a895d714131fba3e9916f8883973f53`, clean tree (`identity.txt`; index hash identical before
and after the run, 0 porcelain lines after). It merges `main` `1261cd8` into the lab branch. Node 22.22.0, PostgreSQL 16
on 127.0.0.1:54329. Logs were written outside the repository during the run and copied here afterwards.

| Check | Result | Log |
|---|---|---|
| Package typecheck | exit 0 | `pkg-typecheck.log` |
| Package tests | **5099 passed, 11 skipped** (5110). The 11 skips are the ledger's 11: 9 live parity tests in `ingredient-line.test.ts`, 1 in `benchmark-corpus.test.ts`, 1 CLI optional-scope test. No new skip, no expected failure | `pkg-test.log`, `pkg-test-verbose.log`, `skip-ledger-90292c1.txt` |
| Default-split bench | holdout-v2/holdout-v3 not scored | `pkg-bench-default-split.log` |
| `--split every --pages` twice | byte-identical, no holdout-v3 line | `pkg-bench-every-*.log`, `bench-deterministic.log` |
| CLI | `line` (semantic-v2 and the default), `engines`; `page` refuses a URL | `cli-line.log`, `cli-refuses-url.log` |
| App does not import the package | no reference in `src`, `scripts` or root config | `app-does-not-import-package.log` |
| Default engine | `DEFAULT_ENGINE_ID` = `legacy-table-import-2`, unchanged since the Phase 2 head `8131fe0` | `boundary-checks-corrected.log` |
| App code equals `main` `1261cd8` | `src`, `migrations`, `scripts`, `deploy`, `tests`, `public` and root config are identical. Every changed path is under `packages/recipe-extraction/` or `docs/table/`, plus CLAUDE.md's package sentence | `boundary-checks-corrected.log` |
| Root typecheck | exit 0 | `root-typecheck.log` |
| Root vitest | **1177/1177** (58 files), migrations 015–016 applied to `table_test`. No package file is in the root suite | `root-vitest-full.log`, `root-vitest-excludes-package.log` |
| `next build` (clean `.next`) | exit 0 | `next-build-clean.log` |
| Holdout-v3 rerun vs the scored report | every figure identical. Only `pins.packageSourceDigest` and `pins.engineSourceDigests.legacy` differ (the `a535dc9` provenance record) | `holdout3-rerun.log` |
| Mutations (selftest, scorer, parser specs) | **45/45 as expected**: KILLED 36, controls ERROR 6, KILLED-UNEXPECTED 2, SURVIVED 1 | `mutations.md`, `mutations.json`, `mutations.log` |

**Script corrections, logged.** `run-root.sh` was written before the merge. Three of its checks failed for script
reasons, not product reasons:
- `default-engine-unchanged`: it grepped for a string literal, but `DEFAULT_ENGINE_ID` is assigned from
  `LEGACY_ENGINE_ID`.
- `app-code-equals-main` and `changed-paths-vs-main`: both compared against the pre-merge base `8c9fd8c`, so they
  listed `main`'s own new work.

`boundary-checks.sh` reruns all three with the right bases. Its first version used `main` `8c9fd8c` as the base for the
default-engine check, but the package has never been on `main`. It was corrected to `8131fe0` before the logged
run. The original failing logs are kept beside the corrected one.

**Not run:** Playwright, because no app code changed (the app is identical to `main` `1261cd8`, which `main` verified at
`72cf615`).

**Earlier and separate.** `../verify-fdbcfd1/` holds the package tests at the scoring commit: 11 holdout3 test-setup
failures, fixed in `7312648`. `../recompute-r1/` holds R1's independent recomputation.
