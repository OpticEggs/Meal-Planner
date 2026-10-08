# Table — Acceptance register

Status vocabulary: NOT IMPLEMENTED · IMPLEMENTED / NOT RUN · PASS · FAIL · BLOCKED.

**Current evidence run:** `docs/table/evidence/2026-10-08-verify-2c56267/summary.md` (implementation commit `2c56267`, clean tree, source hash unchanged during the run). Earlier runs (`2026-10-08-full-run*.md`) are kept as history; they predate the review of 89f3ea9.
Environment: real PostgreSQL 16.15, production `next start` server, two independently signed-in
Chromium contexts, recording fake retailer (simulated; nothing reaches a store), fixed household clock
2026-10-12 15:00 America/New_York. Concurrency orders are forced with database lock barriers.

All PASS results are against the **simulated retailer**. No result here claims live Kroger behavior,
Safari/device behavior, or a deployed environment.

## T01–T22 (preserved verbatim from the plan §9.1) + status

| ID | Scenario | Required result | Tests | Status | Notes |
|---|---|---|---|---|---|
| T01 | Preview Friday while Alex reviews groceries; then cancel. | Accepted week, portions, and active grocery requirements remain unchanged. No household edit or external call. | tests/integration/plan.contract.test.ts "T01"; tests/e2e/first-slice.spec.ts "T01" | PASS |  |
| T02 | Either member adopts the displayed week. | One shared accepted plan; no order, cooking, or consumption record is created. Both contexts render the same accepted revision. | tests/integration/plan.contract.test.ts "T02"; tests/e2e/journey.spec.ts "T02" | PASS |  |
| T03 | Save Sounds good or change a preference. | Preference/interest persists; accepted assignments, portions, and requirements do not change. | tests/integration/plan.contract.test.ts "T03"; tests/e2e/journey.spec.ts "T03" | PASS |  |
| T04 | Preview move/replacement affecting leftovers or a locked night. | Consequences show before Apply. Cancellation changes nothing. Protected dinners are not silently moved. | tests/integration/plan.contract.test.ts "T04"; tests/e2e/journey.spec.ts "T04" | PASS |  |
| T05 | Dinners covered, product/price unresolved. | Meals chosen may be shown. Grocery readiness, availability, and budget compliance are not falsely asserted. | tests/integration/groceries.contract.test.ts "T05"; tests/e2e/journey.spec.ts "T05" | PASS |  |
| T06 | Return after adoption. | Home shows next dinner and actual work. Cooking and leftover nights expose the appropriate instructions. Also need remains reachable. | tests/e2e/journey.spec.ts "T06" | PASS | Browser only (rendering/navigation behavior). |
| T07 | Record less left than planned. | Dependent coverage becomes unresolved; original selected dinner remains. Recovery is proposed, not applied. | tests/integration/plan.contract.test.ts "T07"; tests/e2e/journey.spec.ts "T07" | PASS |  |
| T08 | Alex changes Friday while Jon's Friday preview remains open. | Jon sees current accepted Friday and visible stale-preview status without pressing Apply. Draft remains separate and cannot apply as old authorization. | tests/e2e/first-slice.spec.ts "T08"; tests/integration/plan.contract.test.ts "T08 (server boundary)" | PASS |  |
| T09 | Repeat T08 while Jon's app is backgrounded; return later. | Refresh reveals the newer decision and marks the draft stale on return. No stale week is presented as confirmed current state. | tests/e2e/first-slice.spec.ts "T09" (hidden page + offline context, events missed, return) | PASS | Backgrounding is simulated in Chromium (visibilityState + offline); not a real mobile OS suspend. |
| T10 | Concurrent independent Friday and Sunday replacements. | Both accepted edits survive. Neither restores other nights. Combined groceries are recalculated correctly. Run both commit orders. | tests/e2e/first-slice.spec.ts "T10" ×2 orders; tests/integration/plan.contract.test.ts "T10" ×2 orders | PASS |  |
| T11 | Concurrent replacements of the same target. | One command commits first; the other requires current review and makes no accepted write. Preserve the losing draft. Run both commit orders. | tests/e2e/first-slice.spec.ts "T11" ×2 orders; tests/integration/plan.contract.test.ts "T11" ×2 orders | PASS |  |
| T12 | Adopt a whole proposal after any newer accepted-week change. | Adoption stops; it cannot restore an obsolete seven-day snapshot. Current week and refreshed consequences are shown. | tests/e2e/first-slice.spec.ts "T12"; tests/integration/plan.contract.test.ts "T12" ×2 orders | PASS |  |
| T13 | Apply an accepted meal change while Alex's grocery review is open. | Alex sees the delta. Unaffected approvals remain. Stale Send produces zero outbound calls. | tests/e2e/journey.spec.ts "T13"; tests/integration/groceries.contract.test.ts "T13" | PASS |  |
| T14 | Apply replacement after order confirmation. | Current plan/requirements change. Confirmed order and purchased packages remain unchanged. Independent requests remain. Newly needed chicken is not sent. Stale Send produces zero outbound calls. | tests/e2e/journey.spec.ts "T14/T20"; tests/integration/groceries.contract.test.ts "T14" | PASS |  |
| T15 | Duplicate click or retry of an accepted command. | Same recorded result; no duplicate adoption, meal edit, or handoff initiation. | tests/integration/plan.contract.test.ts "T15"; tests/integration/groceries.contract.test.ts "T15 (handoff)"; tests/e2e/first-slice.spec.ts "T15" | PASS |  |
| T16 | External transfer times out after possible acceptance. | Outcome is uncertain; no automatic replay of that ambiguous line or whole basket. | tests/integration/groceries.contract.test.ts "T16 / X05"; tests/e2e/journey.spec.ts "T16" | PASS |  |
| T17 | Change a plan after a valid batch has started sending. | Exact started payload and its receipt remain intact; revised needs are separate. No claimed reversal of an external action. | tests/integration/groceries.contract.test.ts "T17 / X04" | PASS | Command/integration level with real dispatch race (barrier); the UI path shares the same server code. |
| T18 | Repeated staple taps, overlapping recipe need, and explicit extra. | Usual request deduplicates with names; source reasons persist; explicit extra quantity survives. | tests/integration/groceries.contract.test.ts "T18"; tests/e2e/journey.spec.ts "T18" | PASS |  |
| T19 | Have some lacks a quantity or reviewed demand increases. | No invented pantry subtraction; quantity uncertainty or renewed review is visible. | tests/integration/groceries.contract.test.ts "T19" | PASS | Integration level (UI controls exist; no separate browser test). |
| T20 | Confirm an order, then receive one item and report another missing. | Confirmation did not imply receipt. Received need resolves; missing need remains actionable. | tests/integration/groceries.contract.test.ts "T20"; tests/e2e/journey.spec.ts "T14/T20" | PASS |  |
| T21 | Edit a recipe in the library after adopting it. | Existing accepted assignment retains its selected recipe version unless a deliberate plan change is applied. | tests/integration/plan.contract.test.ts "T21"; tests/e2e/journey.spec.ts "T21" | PASS |  |
| T22 | Two night edits interact through a leftover source, destination lock, or firm constraint. | Treat the actual dependency as a conflict when necessary; never overwrite a lock or silently relax the requirement. Unrelated-night test T10 must still pass. | tests/integration/plan.contract.test.ts "T22" (leftover source ×2 orders, destination lock, firm budget); tests/e2e/first-slice.spec.ts "T22" ×2 orders | PASS |  |

## X01–X12 supplemental engineering checks (plan §9.2) + status

| ID | Required check | Pass condition | Tests | Status | Notes |
|---|---|---|---|---|---|
| X01 | Authorization and household isolation | Another household's IDs and an unauthenticated session cannot read/write plans, drafts, purchases, events, or exports; no side effects. | tests/integration/plan.contract.test.ts "X01"; tests/e2e/x-checks.spec.ts "X01" | PASS |  |
| X02 | Persistent state and event recovery | App/database process restart, missed events, duplicate events, and delayed older responses cannot erase or roll back the accepted state; both users re-fetch coherent snapshots. | tests/e2e/x-checks.spec.ts "X02" (SIGKILL + restart, missed events, delayed older response); tests/e2e/first-slice.spec.ts "Reload…" | PASS |  |
| X03 | Command identity and purchase deduplication | Same command ID plus same payload returns the original result; same ID/different payload rejects. Concurrent sends with different IDs for the same consumed review/demand produce one authorized transfer, not two. | tests/integration/plan.contract.test.ts "X03"; tests/integration/groceries.contract.test.ts "X03" ×2 orders, "T15 (handoff)" | PASS |  |
| X04 | Send/change race at dispatch boundary | Superseded queued work is canceled before dispatch-started. Once dispatch-started, exact payload/history remain immutable and later demand becomes a separate delta. Neither race order silently resends the basket. | tests/integration/groceries.contract.test.ts "T17 / X04" (both race orders) | PASS |  |
| X05 | Realistic adapter granularity and crash recovery | Batch-only responses do not become invented per-line successes. Acceptance plus lost response, or crash after dispatch intent, becomes uncertain and is not automatically retried. | tests/integration/groceries.contract.test.ts "T16 / X05"; tests/e2e/x-checks.spec.ts "X05" (real server SIGKILL after dispatch-started) | PASS |  |
| X06 | Portion/unit/nutrition arithmetic | Component-only changes affect the selected components, leftover batches are counted once, units round packages correctly, and missing conversion/nutrition values remain unknown. | tests/unit/domain.test.ts "X06"; tests/integration/groceries.contract.test.ts "Fixture arithmetic" | PASS |  |
| X07 | Cost scope and unknowns | Recipe usage cost, pickup package spending, and incremental basket cost stay distinct. Unknown prices are not zero. New constraints/facts can change validation without changing dinner selection. | tests/unit/domain.test.ts "X07"; tests/integration/groceries.contract.test.ts "T05" | PASS |  |
| X08 | Locked choices, coverage, dates, and policy changes | Timing across pickup, cooking, leftovers, local midnight and daylight-saving transitions uses household dates correctly; locks and exclusions remain enforced. A new exclusion flags current dinner rather than replacing it. | tests/unit/domain.test.ts "X08"; tests/integration/household.more.test.ts "X08"; pickup timing test | PASS |  |
| X09 | Capture-to-receipt lifecycle and supply | A staple already in the confirmed order is identified before a next-cycle duplicate is created; explicit extra remains extra. Ordered/received views of the same package are not double-counted. | tests/integration/groceries.contract.test.ts "X09" | PASS |  |
| X10 | Functional discovery and persistence | Multi-character search keeps focus; advertised sorts use actual values; preferences/notes/favorites/Sounds good persist; opening a recipe opens the selected recipe; editing one does not mutate pinned meals. | tests/e2e/x-checks.spec.ts "X10"; tests/e2e/journey.spec.ts "T03", "T21" | PASS |  |
| X11 | Mobile, accessibility, and genuine two-user operation | Controls work on narrow/mobile layouts and with keyboard/text scaling; stale state is visible without color alone; two sessions use distinct authenticated identities. Do not claim device Safari testing from WebKit automation alone. | tests/e2e/x-checks.spec.ts "X11" (Chromium at 320/390 px, 150% text, keyboard, distinct identities) | PASS (partial scope — see notes) | PASS for what was run. NOT RUN: Safari/WebKit, physical phones, screen readers → BLOCKED on devices (B8). |
| X12 | Export/restore, secrets, and environment separation | Export omits secrets and round-trips supported household data; isolated restore works; test helpers are blocked in production; incomplete real configuration never reports mock success as live. | tests/integration/x12.environment.test.ts (3 tests); scripts/backup.sh check | PASS | Export/restore, secrets, production refusal of test helpers, fail-closed Kroger mode. Production hosting secrets: not applicable yet (no deployment). |

## Negative controls / mutation checks

`tests/mutation/run.sh` injects each forbidden behavior and requires the contract tests to fail.
All 7 were caught in the evidence run: blanket whole-week conflict (T10 fails), last-write-wins (T08/T11/T22 fail),
stale whole-week adoption (T12), Send ignoring the reviewed fingerprint (T13/T14), approvals not consumed (X03),
uncertain transfers treated as unsent (T16), superseded queued work dispatched (T17).
Also: `plan.contract.test.ts` "Negative control: a stale target is rejected".

## Review regressions (independent review of 89f3ea9) — added 2026-10-08

These are additional regression IDs; no T/X row above was renumbered or replaced. Full dispositions:
`docs/table/CORRECTIONS-89f3ea9.md`. On 89f3ea9 the integration cases below FAILED (23 of 29;
`evidence/corrections/2026-10-08-repro-on-89f3ea9.log`); all pass on `2c56267`.

| ID | Tests | Status on 2c56267 |
|---|---|---|
| R-F01 whole-week admission | `tests/integration/review-regressions.test.ts` R-F01a–e; `tests/e2e/review-regressions.spec.ts` R-F01-UI | PASS |
| R-F02 dependency closure | review-regressions R-F02a–e (incl. move vs lunch race, both orders) | PASS |
| R-F03 exclusions on new choices | review-regressions R-F03a–b | PASS |
| R-F04 order/transfer reconciliation | review-regressions R-F04a–d (exact fake-retailer call counts) | PASS |
| R-F05 substitutions & package identity | review-regressions R-F05a–d | PASS |
| R-F06 bound "Have enough" | review-regressions R-F06a (both orders), R-F06b; e2e R-F06-UI | PASS |
| R-F07 capture lifecycle | review-regressions R-F07a–c; e2e R-F07-UI | PASS |
| R-F08 cross-week purchasing inputs | review-regressions R-F08a–b | PASS |
| B3 received goods / extra cost | `tests/integration/b3.received-goods.test.ts` (2) | PASS |
| Layout: sticky header / fixed nav overlap | e2e "Header overlap" (Chromium 390×844) | PASS (Chromium); WebKit/iPhone BLOCKED |
| V01 mutation classification | `tests/mutation/selftest.sh`; `tests/mutation/run.mjs` (16 mutations incl. one per finding + B3) | PASS — 16 killed, 0 survived, 0 error |
| V02 bundle restore | `scripts/make-bundle.sh` (plain and `--branch main` clones, default branch master) | PASS for the delivered bundle |

Original tests whose code changed (pass conditions unchanged): **X09** assertion now expects the
"Add another" extra in the next open pickup (the old assertion encoded the F07 defect); **T19** passes
the reviewed amount to "Have enough" (F06). No original test was skipped or weakened.
