# Full verification run
- Date (UTC): 2026-10-08T23:06:53Z
- Commit: 33c84e14c9dc79226e5fd514fcbb1feaf9d8728f
- Tree: clean; tracked-file hash before: 981ca301ccb14a3858e1b6099e7c23e79cdcb01d6a3a0b2d460ebf7565309ed2
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 5s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-33c84e1-20261008T230652Z/vitest.json` | PASS | 262s | vitest.log |
| Production build | `npx next build` | PASS | 8s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-33c84e1-20261008T230652Z/playwright.json npx playwright test --reporter=list,json` | PASS | 656s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 11s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-33c84e1-20261008T230652Z/mutation` | FAIL (exit 1) | 796s | mutation.log |

- vitest: 1117 total, 1117 passed, 0 failed, 0 skipped/todo
- playwright: 136 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 86 killed, 1 survived, 1 error; sources restored: true
- Tracked-file hash after: 981ca301ccb14a3858e1b6099e7c23e79cdcb01d6a3a0b2d460ebf7565309ed2 (unchanged — source immutable during run)
- Commit after: 33c84e14c9dc79226e5fd514fcbb1feaf9d8728f
Overall: FAIL
