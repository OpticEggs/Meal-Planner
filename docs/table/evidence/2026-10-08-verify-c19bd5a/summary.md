# Full verification run
- Date (UTC): 2026-10-08T14:12:48Z
- Commit: c19bd5a64047dab8aa935e48570940b5e831ad62
- Tree: clean; tracked-file hash before: 295c631b1bf4be22043fa7aefe1aad279cf7f99eaf7a93ec056ab3778281e88e
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 5s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-c19bd5a-20261008T141248Z/vitest.json` | PASS | 207s | vitest.log |
| Production build | `npx next build` | PASS | 9s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-c19bd5a-20261008T141248Z/playwright.json npx playwright test --reporter=list,json` | PASS | 635s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 12s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-c19bd5a-20261008T141248Z/mutation` | PASS | 573s | mutation.log |

- vitest: 284 total, 284 passed, 0 failed, 0 skipped/todo
- playwright: 116 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 57 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: 295c631b1bf4be22043fa7aefe1aad279cf7f99eaf7a93ec056ab3778281e88e (unchanged — source immutable during run)
- Commit after: c19bd5a64047dab8aa935e48570940b5e831ad62
Overall: PASS
