# Table — Backlog

Bounded items, in the order they should be taken. Stage 1–4 items already delivered are listed
in IMPLEMENTATION-STATUS.md; this file holds only open work.

| ID | Outcome | Allowed scope | Depends on | Tests | Done when |
|---|---|---|---|---|---|
| B1 | ~~Repository destination~~ — done 2026-10-08: pushed to `https://github.com/OpticEggs/Meal-Planner` (`main`). | — | — | — | — | — |
| B2 | ~~Pickup timing constrains expected supply~~ — done 2026-10-08 (projection flags ordered goods needed before pickup, and unknown pickup as unresolved; test "Expected supply respects pickup timing"). | — | — | — | — | — |
| B3 | ~~Received goods and genuine extra cost~~ — done 2026-10-08 after the F04/F05 supply-accounting repairs (`b3.received-goods.test.ts`, mutation B3 killed). | — | — | — | — | — |
| B4 | ~~pg_dump/pg_restore runbook~~ — done 2026-10-08: `scripts/backup.sh check` restores table_dev into a scratch DB with identical per-table row counts. Remaining: run it against the deployment candidate (B9). | — | — | — | — | — |
| B5 | **Stage 5 — Kroger adapter preparation (no live calls).** OAuth PKCE customer flow, product search with `filter.locationId`, `PUT /v1/cart/add` mapping (batch-level 204 only), token storage server-side, recorded-fixture contract tests. Keep `krogerRetailer.status().ready=false` until B6. | `src/server/integrations/kroger/*`, env validation, INTEGRATION-CAPABILITIES.md | Kroger developer app + credentials from Jon | fixture contract tests | Adapter passes recorded-fixture tests; live status still BLOCKED. |
| B6 | **Stage 5 — one live approved cart addition.** | Live call only with written approval naming account, product(s), quantity | B5 + explicit approval | redacted request/response evidence | Evidence recorded; checkout/pickup still a handoff at kroger.com. |
| B7 | **USDA FoodData Central lookup** for ingredient nutrition (server-side key, provenance, raw/cooked basis, explicit user confirmation of the match). | `src/server/integrations/fdc.ts`, Household ingredient review | FDC API key | integration with recorded fixtures | A matched ingredient shows FDC provenance; unmatched stays unknown. |
| B8 | **Device validation**: iOS Safari / Android Chrome on real phones; WebKit automation run (WebKit is not installed in this container and downloads are not permitted; the header-overlap test is ready to run under a WebKit project). | none (testing) | Devices | X11 manual checklist | Results recorded as PASS/BLOCKED per device. |
| B9 | **Stage 6 — private deployment candidate**: hosting choice, managed PostgreSQL, secrets, backups, HTTPS. No paid provisioning without approval. | infra docs/scripts | Owner decision | full suite against candidate | Release record per plan §10 stage 6. |
| B10 | Optional: deliberately scoped partial handoff (named omitted lines), recipe URL import with fetch restrictions, PWA install. | — | — | — | Only if Jon asks. |
| B11 | Polish: per-night "Change" sheet focus management on open/close, recipe photos (user-supplied), richer price freshness labels. | `src/ui/*` | — | X11 | — |
| B12 | **Staple product from approvals**: update `household_staples.product_id` when a usual line is approved (today it records the mapped product at capture). | `src/server/commands/groceries.ts` | — | integration | Approving a different product for a staple changes the remembered product. |
| B13 | **Second pickup in the same week** (more than one confirmed order per cycle) if the household ever needs it. | purchasing model | Owner need | integration | Two orders in one week reconcile their own transfers. |
| B14 | **Focus restoration** after closing the Change sheet / preview, and a screen-reader pass. | `src/ui/*` | — | X11 | Keyboard focus returns to the invoking control; tested. |
