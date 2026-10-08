# Full verification run
- Date (UTC): 2026-10-08T02:30:04Z
- Commit: 0804381880f9104dfe23ab35f50ccf8fbe74d05b
- Tree: clean; tracked-file hash before: 52a44beef50d13ffe5ac39923574e3fb7f5dcfc4afd3b1ecd3dbe0e3a62af669
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 2s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-0804381/vitest.json` | PASS | 61s | vitest.log |
| Production build | `npx next build` | PASS | 5s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-0804381/playwright.json npx playwright test --reporter=list,json` | PASS | 163s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 7s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-0804381/mutation` | PASS | 156s | mutation.log |

- vitest: 98 total, 98 passed, 0 failed, 0 skipped/todo
- playwright: 43 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 21 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: 52a44beef50d13ffe5ac39923574e3fb7f5dcfc4afd3b1ecd3dbe0e3a62af669 (unchanged — source immutable during run)
- Commit after: 0804381880f9104dfe23ab35f50ccf8fbe74d05b
Overall: PASS
