# Full verification run
- Date (UTC): 2026-10-09T23:45:20Z
- Commit: 43cd1ce3d4e5f262db11792b43e1e42d17d6fcd2
- Tree: clean; tracked-file hash before: 4b0f32f0f1174bc2ed83d5e9ae4917d5bdd068f61f89cc47d2881a0c940f22f6
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 7s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-43cd1ce-20261009T234506Z/vitest.json` | PASS | 252s | vitest.log |
| Production build | `npx next build` | PASS | 34s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-43cd1ce-20261009T234506Z/playwright.json npx playwright test --reporter=list,json` | PASS | 614s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 8s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-43cd1ce-20261009T234506Z/mutation` | PASS | 733s | mutation.log |

- vitest: 1142 total, 1142 passed, 0 failed, 0 skipped/todo
- playwright: 150 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 104 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: 4b0f32f0f1174bc2ed83d5e9ae4917d5bdd068f61f89cc47d2881a0c940f22f6 (unchanged — source immutable during run)
- Commit after: 43cd1ce3d4e5f262db11792b43e1e42d17d6fcd2
Overall: PASS
