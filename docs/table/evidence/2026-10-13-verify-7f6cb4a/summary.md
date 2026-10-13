# Full verification run
- Date (UTC): 2026-10-13T06:30:07Z
- Commit: 7f6cb4a910cbb70a53f4b4bf5551ce1ab40f4996
- Tree: clean; tracked-file hash before: 3f91cb6a5c3bccd524149e5d966cd3e3f98a2e073da042e933a1f58df4de46e4
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless only); vitest 5.0.3
- Logs: complete command output in this directory (*.log), structured results (*.json)
- Not covered: Safari/WebKit (not installed; downloads not permitted), physical phones, live Kroger, production hosting.

| Step | Command | Result | Time | Log |
|---|---|---|---|---|
| Typecheck | `npx tsc --noEmit -p .` | PASS | 5s | typecheck.log |
| Unit + integration (real PostgreSQL) | `npx vitest run --reporter=verbose --reporter=json --outputFile.json=/tmp/table-verify-7f6cb4a-20261013T063007Z/vitest.json` | PASS | 331s | vitest.log |
| Production build | `npx next build` | PASS | 7s | build.log |
| Browser suite (2 authenticated Chromium contexts, production server) | `env PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/table-verify-7f6cb4a-20261013T063007Z/playwright.json npx playwright test --reporter=list,json` | PASS | 787s | playwright.log |
| Mutation harness self-test | `tests/mutation/selftest.sh` | PASS | 8s | mutation-selftest.log |
| Mutation checks | `node tests/mutation/run.mjs --out /tmp/table-verify-7f6cb4a-20261013T063007Z/mutation` | PASS | 1021s | mutation.log |

- vitest: 1220 total, 1220 passed, 0 failed, 0 skipped/todo
- playwright: 170 passed, 0 failed, 0 flaky, 0 skipped
- mutation: 132 killed, 0 survived, 0 error; sources restored: true
- Tracked-file hash after: 3f91cb6a5c3bccd524149e5d966cd3e3f98a2e073da042e933a1f58df4de46e4 (unchanged — source immutable during run)
- Commit after: 7f6cb4a910cbb70a53f4b4bf5551ce1ab40f4996
Overall: PASS
