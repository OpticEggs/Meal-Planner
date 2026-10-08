# Full verification run
- Date (UTC): 2026-10-08T18:27:49Z
- Commit: 68f45496dd5396c81d5d66566925ef6e57a76ef1
- Tree: clean; tracked-file hash before: afc1b3ee61fc87c75307c37f7e59578781695775df64c6f083e5c25636aed926
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 5s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-68f4549-20261008T182749Z/vitest.json` | PASS | 237s | vitest.log |
| Production build | `npx next build` | PASS | 20s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-68f4549-20261008T182749Z/playwright.json npx playwright test --reporter=list,json` | PASS | 640s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 12s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-68f4549-20261008T182749Z/mutation` | PASS | 793s | mutation.log |

- vitest: 833 total, 833 passed, 0 failed, 0 skipped/todo
- playwright: 128 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 74 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: afc1b3ee61fc87c75307c37f7e59578781695775df64c6f083e5c25636aed926 (unchanged — source immutable during run)
- Commit after: 68f45496dd5396c81d5d66566925ef6e57a76ef1
Overall: PASS
