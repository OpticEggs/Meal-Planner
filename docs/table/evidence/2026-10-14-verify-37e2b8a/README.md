# Evidence — checklist "Match products at Kroger" and trimmed Buy it (D156), verified at 37e2b8a

Branch `claude/checklist-kroger` from `b094fc2`. Source delta: `src/ui/Groceries.tsx`, `src/app/globals.css`.
Presentation only; no command, query, schema or data change. The calendar's grocery list renders as before.

`summary.md` + logs/JSON: `scripts/verify-all.sh` on `37e2b8a` (clean tree, tracked-file hash unchanged): typecheck
PASS; vitest 1220/1220; build PASS; Playwright 183/183 (0 flaky; new: kroger-matching KM-E6); mutation self-test PASS;
132 mutations killed, 0 survived, 0 error.

`screens-kroger/` — from KM-E6's run against the test server with the store set to Kroger, only the `products`
capability on, placeholder credentials and the in-process Kroger fake answering from a synthetic fixture: the checklist
with "Match products at Kroger…", the matching dialog, and Buy it trimmed (the orange line is that server's honest
"not configured" reason for the cart, which is off). Every product, price and store in them is synthetic.

Nothing reached Kroger: KM-E6 asserts zero cart requests to the fake; no Kroger host was contacted. No household data
read or written; nothing deployed. Browser JSON secret redacted (`e2e-only-secret[REDACTED]`).
