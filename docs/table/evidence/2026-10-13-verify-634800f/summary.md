# Full verification run
- Date (UTC): 2026-10-13T19:06:36Z
- Commit: 634800f566af3e9a006048bf745543b2bf019749
- Tree: clean; tracked-file hash before: eb131f8e43662fed1d6a6e7dccfe0ab3a4fc6011cd2ad38d0f4d345783aff988
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 6s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-634800f-20261013T190634Z/vitest.json` | PASS | 452s | vitest.log |
| Production build | `npx next build` | PASS | 12s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-634800f-20261013T190634Z/playwright.json npx playwright test --reporter=list,json` | FAIL (exit 1) | 1017s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 11s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-634800f-20261013T190634Z/mutation` | PASS | 1372s | mutation.log |

- vitest: 1220 total, 1220 passed, 0 failed, 0 skipped/todo
- playwright: 172 passed, 1 failed, 0 flaky, 0 skipped
- mutation: 132 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: eb131f8e43662fed1d6a6e7dccfe0ab3a4fc6011cd2ad38d0f4d345783aff988 (unchanged — source immutable during run)
- Commit after: 634800f566af3e9a006048bf745543b2bf019749
Overall: FAIL
