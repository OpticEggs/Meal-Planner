# Full verification run
- Date (UTC): 2026-10-08T03:28:17Z
- Commit: 5f7b72f4ff30792249a9ef1e0d025cb5fac8befa
- Tree: clean; tracked-file hash before: ec6d3f150eb57f7d630ed70842000d600abfec1d37a17547ed8160c6abaf0a6e
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 3s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-5f7b72f/vitest.json` | PASS | 80s | vitest.log |
| Production build | `npx next build` | PASS | 5s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-5f7b72f/playwright.json npx playwright test --reporter=list,json` | PASS | 208s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 7s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-5f7b72f/mutation` | PASS | 212s | mutation.log |

- vitest: 118 total, 118 passed, 0 failed, 0 skipped/todo
- playwright: 57 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 30 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: ec6d3f150eb57f7d630ed70842000d600abfec1d37a17547ed8160c6abaf0a6e (unchanged — source immutable during run)
- Commit after: 5f7b72f4ff30792249a9ef1e0d025cb5fac8befa
Overall: PASS
