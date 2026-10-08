# First-slice browser evidence
Commit base: d60fd1e + working tree (auth rate-limit test-env change)
Date: 2026-10-08T00:03:13Z
Runtime: node v22.22.0, postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1), Playwright 1.56.1 chromium-1194
Command: npx next build && npx playwright test tests/e2e/first-slice.spec.ts

```
  ✓  1 [chromium] › tests/e2e/first-slice.spec.ts:11:1 › T01: Jon previews Friday while Alex reviews groceries, then cancels — nothing accepted changes (5.4s)
  ✓  2 [chromium] › tests/e2e/first-slice.spec.ts:38:1 › T08: Alex changes Friday while Jon's Friday preview is open — Jon sees it without pressing Apply (3.2s)
  ✓  3 [chromium] › tests/e2e/first-slice.spec.ts:73:1 › T09: same as T08 while Jon's app is backgrounded; the newer decision and stale draft appear on return (3.1s)
  ✓  4 [chromium] › tests/e2e/first-slice.spec.ts:109:3 › T10: concurrent independent Friday and Sunday replacements — Jon (Sunday) commits first (3.3s)
  ✓  5 [chromium] › tests/e2e/first-slice.spec.ts:109:3 › T10: concurrent independent Friday and Sunday replacements — Alex (Friday) commits first (3.7s)
  ✓  6 [chromium] › tests/e2e/first-slice.spec.ts:141:3 › T11: concurrent replacements of Friday — Jon first (3.1s)
  ✓  7 [chromium] › tests/e2e/first-slice.spec.ts:141:3 › T11: concurrent replacements of Friday — Alex first (3.0s)
  ✓  8 [chromium] › tests/e2e/first-slice.spec.ts:169:1 › T12: adopting an old whole-week proposal after a newer accepted change stops and shows the current week (3.0s)
  ✓  9 [chromium] › tests/e2e/first-slice.spec.ts:199:1 › Reload preserves accepted state, previews and stale status (persistence, not browser memory) (3.4s)
  9 passed (36.0s)
```
