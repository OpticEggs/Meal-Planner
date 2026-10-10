# Full verification run
- Date (UTC): 2026-10-10T03:54:59Z
- Commit: 72cf61515d653775171840aee624812c5da54056
- Tree: clean; tracked-file hash before: 83c50f50342221cc7b702c98bbd58a08b1d0cf6407945b66c2bf2cff1f2261fd
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 3s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-72cf615-20261010T035459Z/vitest.json` | PASS | 279s | vitest.log |
| Production build | `npx next build` | PASS | 6s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-72cf615-20261010T035459Z/playwright.json npx playwright test --reporter=list,json` | PASS | 634s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 9s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-72cf615-20261010T035459Z/mutation` | PASS | 901s | mutation.log |

- vitest: 1177 total, 1177 passed, 0 failed, 0 skipped/todo
- playwright: 153 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 121 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: 83c50f50342221cc7b702c98bbd58a08b1d0cf6407945b66c2bf2cff1f2261fd (unchanged — source immutable during run)
- Commit after: 72cf61515d653775171840aee624812c5da54056
Overall: PASS
