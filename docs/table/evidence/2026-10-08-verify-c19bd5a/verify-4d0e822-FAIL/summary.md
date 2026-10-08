# Full verification run
- Date (UTC): 2026-10-08T13:44:42Z
- Commit: 4d0e822c43186cd3ff1ceda2690bc55b92fb83eb
- Tree: clean; tracked-file hash before: 51f4178d35bbdc1d3f1a157eda636d2f4d385cdb9cb33938379ad8ba92e6e9c4
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 15s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-4d0e822-20261008T134441Z/vitest.json` | PASS | 198s | vitest.log |
| Production build | `npx next build` | PASS | 9s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-4d0e822-20261008T134441Z/playwright.json npx playwright test --reporter=list,json` | FAIL (exit 1) | 645s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 12s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-4d0e822-20261008T134441Z/mutation` | PASS | 608s | mutation.log |

- vitest: 284 total, 284 passed, 0 failed, 0 skipped/todo
- playwright: 114 passed, 1 failed, 0 flaky, 0 skipped
- mutation: 57 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: 51f4178d35bbdc1d3f1a157eda636d2f4d385cdb9cb33938379ad8ba92e6e9c4 (unchanged — source immutable during run)
- Commit after: 4d0e822c43186cd3ff1ceda2690bc55b92fb83eb
Overall: FAIL
