# Full verification run
- Date (UTC): 2026-10-10T03:09:27Z
- Commit: 7332b0609e985f90da8cc538d6deb67fd74d43d5
- Tree: clean; tracked-file hash before: 91b5cc71c89f2adcccb4cf07a1875669c6cc3de0ec3801bb5a8ee2c2e73c85bc
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 4s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-7332b06-20261010T030925Z/vitest.json` | PASS | 305s | vitest.log |
| Production build | `npx next build` | PASS | 6s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-7332b06-20261010T030925Z/playwright.json npx playwright test --reporter=list,json` | PASS | 657s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 9s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-7332b06-20261010T030925Z/mutation` | PASS | 875s | mutation.log |

- vitest: 1177 total, 1177 passed, 0 failed, 0 skipped/todo
- playwright: 153 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 121 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: 91b5cc71c89f2adcccb4cf07a1875669c6cc3de0ec3801bb5a8ee2c2e73c85bc (unchanged — source immutable during run)
- Commit after: 7332b0609e985f90da8cc538d6deb67fd74d43d5
Overall: PASS
