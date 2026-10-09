# Full verification run
- Date (UTC): 2026-10-08T23:37:22Z
- Commit: c9a95b60a6f656020651b8597041e404cf6fbfc8
- Tree: clean; tracked-file hash before: 9387c53acfad5801d98cc1342b958eead3cf060ade610692a4408ac49aab2871
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 4s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-c9a95b6-20261008T233722Z/vitest.json` | PASS | 273s | vitest.log |
| Production build | `npx next build` | PASS | 8s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-c9a95b6-20261008T233722Z/playwright.json npx playwright test --reporter=list,json` | PASS | 650s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 11s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-c9a95b6-20261008T233722Z/mutation` | PASS | 835s | mutation.log |

- vitest: 1117 total, 1117 passed, 0 failed, 0 skipped/todo
- playwright: 136 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 88 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: 9387c53acfad5801d98cc1342b958eead3cf060ade610692a4408ac49aab2871 (unchanged — source immutable during run)
- Commit after: c9a95b60a6f656020651b8597041e404cf6fbfc8
Overall: PASS
