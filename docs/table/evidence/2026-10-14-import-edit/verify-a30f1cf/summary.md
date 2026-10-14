# Full verification run
- Date (UTC): 2026-10-14T04:59:39Z
- Commit: a30f1cf77b7ade66ece7b4645890ef7449fe6a53
- Tree: clean; tracked-file hash before: 92f42d47ef6bee2fad5e326f90228e949e433d3bd5c40e255d84636718c333d9
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 5s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-a30f1cf-20261014T045938Z/vitest.json` | PASS | 447s | vitest.log |
| Production build | `npx next build` | PASS | 10s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-a30f1cf-20261014T045938Z/playwright.json npx playwright test --reporter=list,json` | PASS | 1104s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 12s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-a30f1cf-20261014T045938Z/mutation` | FAIL (exit 1) | 1325s | mutation.log |

- vitest: 1234 total, 1234 passed, 0 failed, 0 skipped/todo
- playwright: 186 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 130 killed, 0 survived, 2 error; sources restored: true
- Tracked-file hash after: 92f42d47ef6bee2fad5e326f90228e949e433d3bd5c40e255d84636718c333d9 (unchanged — source immutable during run)
- Commit after: a30f1cf77b7ade66ece7b4645890ef7449fe6a53
Overall: FAIL
