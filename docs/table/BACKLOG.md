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
| B11 | Polish: recipe photos (user-supplied), richer price freshness labels. (The Change-sheet focus management once listed here was delivered by B14.) | `src/ui/*` | — | X11 | — |
| B12 | ~~Staple product from approvals~~ — done 2026-10-08 (`0804381`): explicit, revision-bound `ApproveStapleProduct`; request product intent; unknown/unavailable stay unresolved (`b12.staple-products.test.ts`, e2e `b12.staples.spec.ts`, 5 mutations killed). | — | — | — | — |
| B13 | **Second pickup in the same week** (more than one confirmed order per cycle) if the household ever needs it. | purchasing model | Owner need | integration | Two orders in one week reconcile their own transfers. |
| B14 | ~~Focus restoration and screen-reader pass~~ — done 2026-10-08 (`0804381`) for Chromium: modal Change sheet with inert background, focus trap/restore, Escape, distinct names, one polite announcer, narrow/large-text/reduced-motion checks (`tests/e2e/accessibility.spec.ts`). WebKit/iPhone/VoiceOver remain under B8. | — | — | — | — |
| B15 | ~~Groceries accessibility~~ — done 2026-10-08 (`5f7b72f`) for Chromium: every Groceries interaction on the B14 modal, field errors, deliberate confirmations, worded states, live conflicts that keep typed work (`tests/e2e/b15-b16.spec.ts`). WebKit/VoiceOver under B8. | — | — | — | — |
| B16 | ~~Household staple management~~ — done 2026-10-08 (`5f7b72f`): add / rename / usual amount / product / remove / restore, revision-bound, scenarios A–E (`tests/integration/b16.staple-management.test.ts`, e2e). | — | — | — | — |
| B17 | ~~Keyboard/focus/error pass over the remaining forms~~ — done 2026-10-08 (`972e368`) for Chromium: recipe editor dialog with discard guard and version conflicts, recipe/Explore/placement names and focus, Household settings/targets/exclusions/ingredient review (`tests/e2e/b17-*.spec.ts`, `tests/integration/b17.recipes.test.ts`). WebKit/VoiceOver under B8. | — | — | — | — |
| B18 | ~~Text-scaling sweep across every screen~~ — done 2026-10-08 (`abdd5a2`) for Chromium: 320 px at 150% and 200% text over every screen and dialog, including recipe conflict/error/long-content states (`tests/e2e/b18-text-scaling.spec.ts`, `b18-recipe-states.spec.ts`); eight layout defects fixed (DECISIONS D66). WebKit/Safari/VoiceOver/devices under B8. | — | — | — | — |
| RB17 | ~~Recipe-conflict correction (RB17-01..03)~~ — done 2026-10-08 (`abdd5a2`): field-by-field rebase with full content, occurrence-aware comparison, required expected version (DECISIONS D62–D65). | — | — | — | — |

**No open-ended polish work is queued.** After B18 the remaining items are owner-gated (B5/B6 Kroger,
B7 FDC key, B8 devices, B9 hosting) or optional on request (B10, B11, B13).
