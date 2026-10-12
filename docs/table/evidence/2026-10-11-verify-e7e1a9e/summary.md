# Full verification run
- Date (UTC): 2026-10-11T23:39:53Z
- Commit: e7e1a9e051bc46c51862854f7b05f81fd51c3fa8
- Tree: clean; tracked-file hash before: 5df8985ff0bcd8bd28f0217ff01d05d164ae54d15c3369249ef3829ee6b35be9
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 9s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-e7e1a9e-20261011T233932Z/vitest.json` | PASS | 389s | vitest.log |
| Production build | `npx next build` | PASS | 40s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-e7e1a9e-20261011T233932Z/playwright.json npx playwright test --reporter=list,json` | PASS | 971s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 10s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-e7e1a9e-20261011T233932Z/mutation` | PASS | 1264s | mutation.log |

- vitest: 1217 total, 1217 passed, 0 failed, 0 skipped/todo
- playwright: 170 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 131 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: 5df8985ff0bcd8bd28f0217ff01d05d164ae54d15c3369249ef3829ee6b35be9 (unchanged — source immutable during run)
- Commit after: e7e1a9e051bc46c51862854f7b05f81fd51c3fa8
Overall: PASS
