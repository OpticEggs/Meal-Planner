# Full verification run
- Date (UTC): 2026-10-09T03:59:39Z
- Commit: 7c79eb6105d456e3e0bc7933aa21d7053b4965f4
- Tree: clean; tracked-file hash before: 68f81827b8b229ed835292f7fb423a0fd2e002ad9270b32bc9e2fc1ea157d908
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 4s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-7c79eb6-20261009T035939Z/vitest.json` | PASS | 276s | vitest.log |
| Production build | `npx next build` | PASS | 7s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-7c79eb6-20261009T035939Z/playwright.json npx playwright test --reporter=list,json` | PASS | 643s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 10s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-7c79eb6-20261009T035939Z/mutation` | PASS | 812s | mutation.log |

- vitest: 1129 total, 1129 passed, 0 failed, 0 skipped/todo
- playwright: 139 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 93 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: 68f81827b8b229ed835292f7fb423a0fd2e002ad9270b32bc9e2fc1ea157d908 (unchanged — source immutable during run)
- Commit after: 7c79eb6105d456e3e0bc7933aa21d7053b4965f4
Overall: PASS
