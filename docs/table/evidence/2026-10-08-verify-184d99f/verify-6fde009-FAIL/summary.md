# Full verification run
- Date (UTC): 2026-10-08T21:25:07Z
- Commit: 6fde00904b3c00f202331f2202a0b2be137cd576
- Tree: clean; tracked-file hash before: e81686f44dffcb5c20c8002562119c1f9c1075ec789921204821697592a57245
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 4s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-6fde009-20261008T212506Z/vitest.json` | FAIL (exit 1) | 251s | vitest.log |
| Production build | `npx next build` | PASS | 8s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-6fde009-20261008T212506Z/playwright.json npx playwright test --reporter=list,json` | PASS | 605s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 11s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-6fde009-20261008T212506Z/mutation` | PASS | 789s | mutation.log |

- vitest: 1094 total, 1093 passed, 1 failed, 0 skipped/todo
- playwright: 131 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 83 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: e81686f44dffcb5c20c8002562119c1f9c1075ec789921204821697592a57245 (unchanged — source immutable during run)
- Commit after: 6fde00904b3c00f202331f2202a0b2be137cd576
Overall: FAIL
