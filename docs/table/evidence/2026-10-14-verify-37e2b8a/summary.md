# Full verification run
- Date (UTC): 2026-10-13T23:55:58Z
- Commit: 37e2b8a85778d24c5c6e705fd1ec0b9265bd98ef
- Tree: clean; tracked-file hash before: 5296b1d31dd4d3a79ee6cbcbbf29e5dedd4936721afd6557c4cf6702270d75eb
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 5s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-37e2b8a-20261013T235557Z/vitest.json` | PASS | 394s | vitest.log |
| Production build | `npx next build` | PASS | 12s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-37e2b8a-20261013T235557Z/playwright.json npx playwright test --reporter=list,json` | PASS | 1026s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 11s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-37e2b8a-20261013T235557Z/mutation` | PASS | 1242s | mutation.log |

- vitest: 1220 total, 1220 passed, 0 failed, 0 skipped/todo
- playwright: 183 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 132 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: 5296b1d31dd4d3a79ee6cbcbbf29e5dedd4936721afd6557c4cf6702270d75eb (unchanged — source immutable during run)
- Commit after: 37e2b8a85778d24c5c6e705fd1ec0b9265bd98ef
Overall: PASS
