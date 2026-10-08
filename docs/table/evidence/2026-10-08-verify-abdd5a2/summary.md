# Full verification run
- Date (UTC): 2026-10-08T06:15:51Z
- Commit: abdd5a2cbd1014822ee09670b484eb528468ee22
- Tree: clean; tracked-file hash before: 2b5f21da599021eff1b611ff55712209bb0884e2e74af51109595d8e54073a6a
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 3s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-abdd5a2-20261008T061550Z/vitest.json` | PASS | 83s | vitest.log |
| Production build | `npx next build` | PASS | 5s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-abdd5a2-20261008T061550Z/playwright.json npx playwright test --reporter=list,json` | PASS | 407s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 8s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-abdd5a2-20261008T061550Z/mutation` | PASS | 242s | mutation.log |

- vitest: 141 total, 141 passed, 0 failed, 0 skipped/todo
- playwright: 104 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 39 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: 2b5f21da599021eff1b611ff55712209bb0884e2e74af51109595d8e54073a6a (unchanged — source immutable during run)
- Commit after: abdd5a2cbd1014822ee09670b484eb528468ee22
Overall: PASS
