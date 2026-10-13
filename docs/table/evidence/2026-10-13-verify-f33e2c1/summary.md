# Full verification run
- Date (UTC): 2026-10-13T17:28:43Z
- Commit: f33e2c1eba55b56302959299de71b57f8523365b
- Tree: clean; tracked-file hash before: f19a062647f6ca6963a8e62fb58e80dfccb15a126aec5aa03bffacd2de44cd11
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 6s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-f33e2c1-20261013T172837Z/vitest.json` | PASS | 431s | vitest.log |
| Production build | `npx next build` | PASS | 12s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-f33e2c1-20261013T172837Z/playwright.json npx playwright test --reporter=list,json` | PASS | 1063s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 13s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-f33e2c1-20261013T172837Z/mutation` | PASS | 1377s | mutation.log |

- vitest: 1220 total, 1220 passed, 0 failed, 0 skipped/todo
- playwright: 173 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 132 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: f19a062647f6ca6963a8e62fb58e80dfccb15a126aec5aa03bffacd2de44cd11 (unchanged — source immutable during run)
- Commit after: f33e2c1eba55b56302959299de71b57f8523365b
Overall: PASS
