# Full verification run
- Date (UTC): 2026-10-09T20:39:55Z
- Commit: bca110ed802ee89e6f78a864a4f07a9c5aedfb62
- Tree: clean; tracked-file hash before: bcbce3621950e2582c03367f2e4f969191855e8e2abe13323a7d3623fc8d2a50
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 3s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-bca110e-20261009T203953Z/vitest.json` | PASS | 285s | vitest.log |
| Production build | `npx next build` | PASS | 7s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-bca110e-20261009T203953Z/playwright.json npx playwright test --reporter=list,json` | PASS | 700s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 10s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-bca110e-20261009T203953Z/mutation` | PASS | 790s | mutation.log |

- vitest: 1091 total, 1091 passed, 0 failed, 0 skipped/todo
- playwright: 145 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 102 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: bcbce3621950e2582c03367f2e4f969191855e8e2abe13323a7d3623fc8d2a50 (unchanged — source immutable during run)
- Commit after: bca110ed802ee89e6f78a864a4f07a9c5aedfb62
Overall: PASS
