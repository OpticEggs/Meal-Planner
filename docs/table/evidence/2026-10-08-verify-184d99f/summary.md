# Full verification run
- Date (UTC): 2026-10-08T21:54:42Z
- Commit: 184d99f4c02ec502a1d8b1d20ade18a8b56e19d7
- Tree: clean; tracked-file hash before: 557d92e4986ade91b4af1f6bc6e5f169dfc9c18c956f95ba73cb531713411e15
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 4s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-184d99f-20261008T215442Z/vitest.json` | PASS | 267s | vitest.log |
| Production build | `npx next build` | PASS | 9s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-184d99f-20261008T215442Z/playwright.json npx playwright test --reporter=list,json` | PASS | 622s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 12s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-184d99f-20261008T215442Z/mutation` | PASS | 806s | mutation.log |

- vitest: 1095 total, 1095 passed, 0 failed, 0 skipped/todo
- playwright: 131 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 83 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: 557d92e4986ade91b4af1f6bc6e5f169dfc9c18c956f95ba73cb531713411e15 (unchanged — source immutable during run)
- Commit after: 184d99f4c02ec502a1d8b1d20ade18a8b56e19d7
Overall: PASS
