# Full verification run
- Date (UTC): 2026-10-09T18:34:05Z
- Commit: 8e6bd6e4a2f9010360d62ffda552c53c74e669a1
- Tree: clean; tracked-file hash before: f456559659c155c55a5da8cbcd6e1e7be38598783bc1d722042ca9a425083ed7
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 4s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-8e6bd6e-20261009T183359Z/vitest.json` | PASS | 291s | vitest.log |
| Production build | `npx next build` | PASS | 7s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-8e6bd6e-20261009T183359Z/playwright.json npx playwright test --reporter=list,json` | PASS | 705s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 10s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-8e6bd6e-20261009T183359Z/mutation` | PASS | 819s | mutation.log |

- vitest: 1078 total, 1078 passed, 0 failed, 0 skipped/todo
- playwright: 143 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 100 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: f456559659c155c55a5da8cbcd6e1e7be38598783bc1d722042ca9a425083ed7 (unchanged — source immutable during run)
- Commit after: 8e6bd6e4a2f9010360d62ffda552c53c74e669a1
Overall: PASS
