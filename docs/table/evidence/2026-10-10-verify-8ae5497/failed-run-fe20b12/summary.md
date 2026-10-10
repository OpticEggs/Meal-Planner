# Full verification run
- Date (UTC): 2026-10-10T13:37:16Z
- Commit: fe20b12409151bbf46d837ce597cb4c9ad1943e9
- Tree: clean; tracked-file hash before: aa474f8d1fb1b9cabbf7886323f2a0fce48508dbdf86a0a2ec68fb4ccb5c6b16
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 6s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-fe20b12-20261010T133701Z/vitest.json` | PASS | 424s | vitest.log |
| Production build | `npx next build` | PASS | 56s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-fe20b12-20261010T133701Z/playwright.json npx playwright test --reporter=list,json` | FAIL (exit 1) | 952s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 12s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-fe20b12-20261010T133701Z/mutation` | PASS | 1363s | mutation.log |

- vitest: 1178 total, 1178 passed, 0 failed, 0 skipped/todo
- playwright: 152 passed, 1 failed, 0 flaky, 0 skipped
- mutation: 123 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: aa474f8d1fb1b9cabbf7886323f2a0fce48508dbdf86a0a2ec68fb4ccb5c6b16 (unchanged — source immutable during run)
- Commit after: fe20b12409151bbf46d837ce597cb4c9ad1943e9
Overall: FAIL
