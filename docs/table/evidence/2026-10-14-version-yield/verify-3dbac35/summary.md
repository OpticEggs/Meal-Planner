# Full verification run
- Date (UTC): 2026-10-14T14:13:09Z
- Commit: 3dbac35cf05bfb62f697e0e0450422b65a984945
- Tree: clean; tracked-file hash before: 954354909cc56dbb0533e37a522c08628d844ea612d7be559bbda3ed027f4c58
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 6s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-3dbac35-20261014T141301Z/vitest.json` | PASS | 523s | vitest.log |
| Production build | `npx next build` | PASS | 13s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-3dbac35-20261014T141301Z/playwright.json npx playwright test --reporter=list,json` | PASS | 1279s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 14s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-3dbac35-20261014T141301Z/mutation` | PASS | 1638s | mutation.log |

- vitest: 1242 total, 1242 passed, 0 failed, 0 skipped/todo
- playwright: 189 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 137 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: 954354909cc56dbb0533e37a522c08628d844ea612d7be559bbda3ed027f4c58 (unchanged — source immutable during run)
- Commit after: 3dbac35cf05bfb62f697e0e0450422b65a984945
Overall: PASS
