# Recipe Extraction Lab — verification at `3ca998a` (clean tree)

Run 2026-10-09T19:01Z with `run.sh` (this folder) from the repository root; `identity.txt` records the commit,
a clean `git status` before and after, and an unchanged index hash.

| Step | Result | Log |
|---|---|---|
| Package typecheck | pass | `pkg-typecheck.log` |
| Package tests (unit, contract, legacy ports of Table's 5 parser test files, parity, hostile, purity, bench) | **28 files · 921 passed · 1 expected fail · 1 skipped** | `pkg-test.log` (verbose) |
| Benchmark (ingredients × 2 engines + pages) | ran; report written | `benchmark-report.json`, `benchmark-report.md`, `pkg-bench-1.log` |
| Benchmark determinism (second run, `cmp`) | byte-identical | `bench-deterministic.log` |
| Root typecheck | pass | `root-typecheck.log` |
| Table parser unit tests (5 files) | **459/459** (same as baseline) | `root-parser-tests.log` |
| Table URL-import integration (`u2c-url-import`, real PostgreSQL `table_test`) | **11/11** | `root-u2c-integration.log` |
| Root Vitest does not collect package tests | 0 package files | `root-vitest-excludes-package.log` |
| `next build` (production) | pass (incremental; a full build on the same tree also passed earlier) | `next-build.log` |

The expected fail is the Phase 2 pesto target (`it.fails`); the skip is the CLI's "bench not installed" check,
skipped by design once `bench/cli.ts` exists.

**Not run:** full `scripts/verify-all.sh` (Playwright browser suite, mutation suite, full Vitest). No Table app
code, configuration, schema or dependency changed (`git diff cb7b56e -- . ':!packages' ':!docs'` is empty), so
the last full verification (`7c79eb6`: 1129 Vitest, 139 Playwright, 93 mutations killed) is not re-claimed here.
Nothing was deployed; no network request was made by any test or by the benchmark.
