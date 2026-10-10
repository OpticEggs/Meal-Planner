# Full verification run
- Date (UTC): 2026-10-10T01:32:33Z
- Commit: dbc105d01d9ede9ad9d7b614e15689dae5bae672
- Tree: clean; tracked-file hash before: 042afcc2b1265c62ad7d2ee04eaaf7ba93bd5cdffb60aaabdb1dfa0689040afb
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 3s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-dbc105d-20261010T013231Z/vitest.json` | PASS | 280s | vitest.log |
| Production build | `npx next build` | PASS | 7s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-dbc105d-20261010T013231Z/playwright.json npx playwright test --reporter=list,json` | PASS | 626s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 8s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-dbc105d-20261010T013231Z/mutation` | PASS | 772s | mutation.log |

- vitest: 1164 total, 1164 passed, 0 failed, 0 skipped/todo
- playwright: 151 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 112 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: 042afcc2b1265c62ad7d2ee04eaaf7ba93bd5cdffb60aaabdb1dfa0689040afb (unchanged — source immutable during run)
- Commit after: dbc105d01d9ede9ad9d7b614e15689dae5bae672
Overall: PASS
