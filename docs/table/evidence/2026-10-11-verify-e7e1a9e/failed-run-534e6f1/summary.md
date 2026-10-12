# Full verification run
- Date (UTC): 2026-10-11T23:08:04Z
- Commit: 534e6f12853e0ccbb99bfbd85dc077746b66485d
- Tree: clean; tracked-file hash before: 93fdbca396027989ea8ffef28d1e7c7d9bf3d170ed39364d7916b4b8bae95971
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 2s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-534e6f1-20261011T230802Z/vitest.json` | PASS | 323s | vitest.log |
| Production build | `npx next build` | PASS | 6s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-534e6f1-20261011T230802Z/playwright.json npx playwright test --reporter=list,json` | PASS | 665s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 7s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-534e6f1-20261011T230802Z/mutation` | FAIL (exit 1) | 751s | mutation.log |

- vitest: 1217 total, 1217 passed, 0 failed, 0 skipped/todo
- playwright: 170 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 128 killed, 0 survived, 3 error; sources restored: true
- Tracked-file hash after: 93fdbca396027989ea8ffef28d1e7c7d9bf3d170ed39364d7916b4b8bae95971 (unchanged — source immutable during run)
- Commit after: 534e6f12853e0ccbb99bfbd85dc077746b66485d
Overall: FAIL
