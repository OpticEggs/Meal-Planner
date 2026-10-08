# Full verification run
- Date (UTC): 2026-10-08T15:17:49Z
- Commit: 02a3b1a1d5177442b7fec3c3f45b39e8ac921c0a
- Tree: clean; tracked-file hash before: 1425a99bf70d2df4bdf37dd844944878d6a900d54f11bc67ba1ad55cca88bc60
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 3s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-02a3b1a-20261008T151748Z/vitest.json` | PASS | 178s | vitest.log |
| Production build | `npx next build` | PASS | 8s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-02a3b1a-20261008T151748Z/playwright.json npx playwright test --reporter=list,json` | PASS | 599s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 11s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-02a3b1a-20261008T151748Z/mutation` | PASS | 587s | mutation.log |

- vitest: 293 total, 293 passed, 0 failed, 0 skipped/todo
- playwright: 117 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 62 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: 1425a99bf70d2df4bdf37dd844944878d6a900d54f11bc67ba1ad55cca88bc60 (unchanged — source immutable during run)
- Commit after: 02a3b1a1d5177442b7fec3c3f45b39e8ac921c0a
Overall: PASS
