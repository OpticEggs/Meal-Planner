# Full verification run
- Date (UTC): 2026-10-08T17:35:31Z
- Commit: 579179b43d8d1a79f2b312de414ae382e81377f1
- Tree: clean; tracked-file hash before: 389cdd75a7b4d97e0a6201ec58d854cb786ff8367ab08d3fa5a2a6a6921dd2e8
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 4s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-579179b-20261008T173530Z/vitest.json` | PASS | 208s | vitest.log |
| Production build | `npx next build` | PASS | 8s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-579179b-20261008T173530Z/playwright.json npx playwright test --reporter=list,json` | PASS | 631s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 11s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-579179b-20261008T173530Z/mutation` | PASS | 645s | mutation.log |

- vitest: 315 total, 315 passed, 0 failed, 0 skipped/todo
- playwright: 121 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 67 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: 389cdd75a7b4d97e0a6201ec58d854cb786ff8367ab08d3fa5a2a6a6921dd2e8 (unchanged — source immutable during run)
- Commit after: 579179b43d8d1a79f2b312de414ae382e81377f1
Overall: PASS
