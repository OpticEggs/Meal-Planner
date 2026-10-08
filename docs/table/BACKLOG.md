# Table — Backlog

Bounded items, in the order they should be taken. Stage 1–4 items already delivered are listed
in IMPLEMENTATION-STATUS.md; this file holds only open work.

| ID | Outcome | Allowed scope | Depends on | Tests | Done when |
|---|---|---|---|---|---|
| B1 | **Preserve the code outside this container** (repository destination). | Create/attach a private `table` GitHub repo or other remote **only after Jon names it**; push `main`. | Owner decision | — | Remote holds the same commit as STATUS. |
| B2 | ~~Pickup timing constrains expected supply~~ — done 2026-10-08 (projection flags ordered goods needed before pickup, and unknown pickup as unresolved; test "Expected supply respects pickup timing"). | — | — | — | — | — |
| B3 | **Replacement suggestions prefer received goods** (rank options using received, unallocated supply; never invent stock). Also: additional basket cost should count only packages beyond what is already ordered/received for the cycle. | Week change sheet ordering, library query, `computeProjection` cost views | — | integration | After a receipt, options that use received items are labeled and ranked first. |
| B4 | ~~pg_dump/pg_restore runbook~~ — done 2026-10-08: `scripts/backup.sh check` restores table_dev into a scratch DB with identical per-table row counts. Remaining: run it against the deployment candidate (B9). | — | — | — | — | — |
| B5 | **Stage 5 — Kroger adapter preparation (no live calls).** OAuth PKCE customer flow, product search with `filter.locationId`, `PUT /v1/cart/add` mapping (batch-level 204 only), token storage server-side, recorded-fixture contract tests. Keep `krogerRetailer.status().ready=false` until B6. | `src/server/integrations/kroger/*`, env validation, INTEGRATION-CAPABILITIES.md | Kroger developer app + credentials from Jon | fixture contract tests | Adapter passes recorded-fixture tests; live status still BLOCKED. |
| B6 | **Stage 5 — one live approved cart addition.** | Live call only with written approval naming account, product(s), quantity | B5 + explicit approval | redacted request/response evidence | Evidence recorded; checkout/pickup still a handoff at kroger.com. |
| B7 | **USDA FoodData Central lookup** for ingredient nutrition (server-side key, provenance, raw/cooked basis, explicit user confirmation of the match). | `src/server/integrations/fdc.ts`, Household ingredient review | FDC API key | integration with recorded fixtures | A matched ingredient shows FDC provenance; unmatched stays unknown. |
| B8 | **Device validation**: iOS Safari / Android Chrome on real phones; WebKit automation run. | none (testing) | Devices | X11 manual checklist | Results recorded as PASS/BLOCKED per device. |
| B9 | **Stage 6 — private deployment candidate**: hosting choice, managed PostgreSQL, secrets, backups, HTTPS. No paid provisioning without approval. | infra docs/scripts | Owner decision | full suite against candidate | Release record per plan §10 stage 6. |
| B10 | Optional: deliberately scoped partial handoff (named omitted lines), recipe URL import with fetch restrictions, PWA install. | — | — | — | Only if Jon asks. |
| B11 | Polish: per-night "Change" sheet focus management on open/close, recipe photos (user-supplied), richer price freshness labels. | `src/ui/*` | — | X11 | — |
