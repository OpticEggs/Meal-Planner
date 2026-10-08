# Full verification run
- Date (UTC): 2026-10-08T01:16:54Z
- Commit: 2c5626744ebcd464b511ce91094e1a21e9520470
- Tree: clean; tracked-file hash before: b4932fba02160feac2c5ce74d8ed5dec884b7dd068bb3488453f4f302b93711a
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 2s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-2c56267/vitest.json` | PASS | 60s | vitest.log |
| Production build | `npx next build` | PASS | 6s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-2c56267/playwright.json npx playwright test --reporter=list,json` | PASS | 107s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 8s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-2c56267/mutation` | PASS | 129s | mutation.log |

- vitest: 91 total, 91 passed, 0 failed, 0 skipped/todo
- playwright: 32 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 16 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: b4932fba02160feac2c5ce74d8ed5dec884b7dd068bb3488453f4f302b93711a (unchanged — source immutable during run)
- Commit after: 2c5626744ebcd464b511ce91094e1a21e9520470
Overall: PASS
