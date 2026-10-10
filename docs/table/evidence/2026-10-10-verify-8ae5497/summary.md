# Full verification run
- Date (UTC): 2026-10-10T14:36:41Z
- Commit: 8ae5497d5a4dc6cbb49ad1d2ba8cbc52bc481d11
- Tree: clean; tracked-file hash before: 9e9c8fe7ce57e94090acf1d532c09c7af77f2d1fa457d35e24cf5309fbec2978
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 5s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-8ae5497-20261010T143640Z/vitest.json` | PASS | 405s | vitest.log |
| Production build | `npx next build` | PASS | 10s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-8ae5497-20261010T143640Z/playwright.json npx playwright test --reporter=list,json` | PASS | 916s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 13s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-8ae5497-20261010T143640Z/mutation` | PASS | 1331s | mutation.log |

- vitest: 1178 total, 1178 passed, 0 failed, 0 skipped/todo
- playwright: 153 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 123 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: 9e9c8fe7ce57e94090acf1d532c09c7af77f2d1fa457d35e24cf5309fbec2978 (unchanged — source immutable during run)
- Commit after: 8ae5497d5a4dc6cbb49ad1d2ba8cbc52bc481d11
Overall: PASS
