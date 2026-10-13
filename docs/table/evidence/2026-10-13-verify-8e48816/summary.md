# Full verification run
- Date (UTC): 2026-10-13T21:13:00Z
- Commit: 8e4881622d39d4d083f3966b1453a54b5f9710f2
- Tree: clean; tracked-file hash before: da481df94595a7c1d5ad8cb8182e6844883d2e1a74bffa5c14ad215d6683e065
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 5s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-8e48816-20261013T211258Z/vitest.json` | PASS | 410s | vitest.log |
| Production build | `npx next build` | PASS | 9s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-8e48816-20261013T211258Z/playwright.json npx playwright test --reporter=list,json` | PASS | 1004s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 12s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-8e48816-20261013T211258Z/mutation` | PASS | 1297s | mutation.log |

- vitest: 1220 total, 1220 passed, 0 failed, 0 skipped/todo
- playwright: 177 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 132 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: da481df94595a7c1d5ad8cb8182e6844883d2e1a74bffa5c14ad215d6683e065 (unchanged — source immutable during run)
- Commit after: 8e4881622d39d4d083f3966b1453a54b5f9710f2
Overall: PASS
