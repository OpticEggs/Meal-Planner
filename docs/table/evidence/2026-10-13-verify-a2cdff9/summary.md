# Full verification run
- Date (UTC): 2026-10-13T23:05:39Z
- Commit: a2cdff9ce1fd0d62cae46ee89ebb96c6f0291cd2
- Tree: clean; tracked-file hash before: 48163b61584be21404f51a0be14abab41f01670278f15bc7fbfbaa0bc0797b27
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 5s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-a2cdff9-20261013T230532Z/vitest.json` | PASS | 394s | vitest.log |
| Production build | `npx next build` | PASS | 11s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-a2cdff9-20261013T230532Z/playwright.json npx playwright test --reporter=list,json` | PASS | 1044s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 11s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-a2cdff9-20261013T230532Z/mutation` | PASS | 1221s | mutation.log |

- vitest: 1220 total, 1220 passed, 0 failed, 0 skipped/todo
- playwright: 182 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 132 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: 48163b61584be21404f51a0be14abab41f01670278f15bc7fbfbaa0bc0797b27 (unchanged — source immutable during run)
- Commit after: a2cdff9ce1fd0d62cae46ee89ebb96c6f0291cd2
Overall: PASS
