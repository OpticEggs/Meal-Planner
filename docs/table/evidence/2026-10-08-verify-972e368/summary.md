# Full verification run
- Date (UTC): 2026-10-08T04:21:44Z
- Commit: 972e368144590b8c04095e8f062d84441cdea2cd
- Tree: clean; tracked-file hash before: 20bd2c9ab44577df7cb41b82976dfd929b5b99dff88d8dd10ff469a918dc5e44
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 3s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-b17/vitest.json` | PASS | 80s | vitest.log |
| Production build | `npx next build` | PASS | 5s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-b17/playwright.json npx playwright test --reporter=list,json` | PASS | 250s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 7s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-b17/mutation` | PASS | 211s | mutation.log |

- vitest: 121 total, 121 passed, 0 failed, 0 skipped/todo
- playwright: 72 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 31 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: 20bd2c9ab44577df7cb41b82976dfd929b5b99dff88d8dd10ff469a918dc5e44 (unchanged — source immutable during run)
- Commit after: 972e368144590b8c04095e8f062d84441cdea2cd
Overall: PASS
