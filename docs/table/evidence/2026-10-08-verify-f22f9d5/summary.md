# Full verification run
- Date (UTC): 2026-10-08T16:07:12Z
- Commit: f22f9d56b3764193c40981d27112a2ab900d369d
- Tree: clean; tracked-file hash before: f54105159f3675561a9567958ecc991776c6fa8e36e403545373a4223258fa1b
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 6s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-f22f9d5-20261008T160711Z/vitest.json` | PASS | 172s | vitest.log |
| Production build | `npx next build` | PASS | 11s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-f22f9d5-20261008T160711Z/playwright.json npx playwright test --reporter=list,json` | PASS | 588s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 12s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-f22f9d5-20261008T160711Z/mutation` | PASS | 570s | mutation.log |

- vitest: 298 total, 298 passed, 0 failed, 0 skipped/todo
- playwright: 121 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 64 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: f54105159f3675561a9567958ecc991776c6fa8e36e403545373a4223258fa1b (unchanged — source immutable during run)
- Commit after: f22f9d56b3764193c40981d27112a2ab900d369d
Overall: PASS
