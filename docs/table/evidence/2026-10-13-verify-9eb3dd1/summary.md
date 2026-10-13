# Full verification run
- Date (UTC): 2026-10-13T04:30:08Z
- Commit: 9eb3dd17527d64ca9f5d0ec43237ecfa1b437edb
- Tree: clean; tracked-file hash before: 52683dc8125920a335453189fffc74de9e8d5e65cc521ea072edcfa2c07b4a22
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 5s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-9eb3dd1-20261013T042954Z/vitest.json` | PASS | 317s | vitest.log |
| Production build | `npx next build` | PASS | 6s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-9eb3dd1-20261013T042954Z/playwright.json npx playwright test --reporter=list,json` | PASS | 730s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 9s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-9eb3dd1-20261013T042954Z/mutation` | PASS | 925s | mutation.log |

- vitest: 1217 total, 1217 passed, 0 failed, 0 skipped/todo
- playwright: 170 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 131 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: 52683dc8125920a335453189fffc74de9e8d5e65cc521ea072edcfa2c07b4a22 (unchanged — source immutable during run)
- Commit after: 9eb3dd17527d64ca9f5d0ec43237ecfa1b437edb
Overall: PASS
