# Full verification run
- Date (UTC): 2026-10-08T17:08:02Z
- Commit: 5250e62459cdad8c6bc1a940f2c203a14d5a717d
- Tree: clean; tracked-file hash before: 05eb30055d9d25062827eadc14a6dbd87a932d2aded0ce246deae08e836544b2
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 5s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-5250e62-20261008T170800Z/vitest.json` | PASS | 202s | vitest.log |
| Production build | `npx next build` | PASS | 16s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-5250e62-20261008T170800Z/playwright.json npx playwright test --reporter=list,json` | PASS | 651s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 12s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-5250e62-20261008T170800Z/mutation` | FAIL (exit 1) | 652s | mutation.log |

- vitest: 315 total, 315 passed, 0 failed, 0 skipped/todo
- playwright: 121 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 66 killed, 0 survived, 1 error; sources restored: true
- Tracked-file hash after: 05eb30055d9d25062827eadc14a6dbd87a932d2aded0ce246deae08e836544b2 (unchanged — source immutable during run)
- Commit after: 5250e62459cdad8c6bc1a940f2c203a14d5a717d
Overall: FAIL
