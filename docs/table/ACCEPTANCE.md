# Table — Acceptance register

Status vocabulary: NOT IMPLEMENTED · IMPLEMENTED / NOT RUN · PASS · FAIL · BLOCKED.

**Current evidence run:** `docs/table/evidence/2026-10-08-verify-972e368/summary.md` (implementation commit `972e368`, B17; clean tree, source hash unchanged during the run): vitest 121/121, Playwright 72/72, 31 mutations killed. Earlier runs are kept as history: `2026-10-08-verify-5f7b72f/` (B15/B16), `2026-10-08-verify-0804381/` (B14/B12), `2026-10-08-verify-2c56267/` (correction pass), `2026-10-08-full-run*.md`.
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

## B14 accessibility & focus, B12 remembered staple products — added 2026-10-08

New IDs; no T/X/R row above was renumbered or replaced. Implementation commit `0804381`; evidence
`docs/table/evidence/2026-10-08-verify-0804381/summary.md`. Red-before-green: the 11 new browser tests
were run against a production build of the starting commit `f4f92f8` and all 11 FAILED
(`evidence/2026-10-08-verify-0804381/pre-b14-on-f4f92f8.log`); they pass on `0804381`.

| ID | What is checked (actual focus / DB state, not only ARIA) | Tests | Status on 0804381 |
|---|---|---|---|
| B14-a Keyboard-only modal | Tab to Friday's Change, Enter; `document.activeElement` is the selected tab inside the dialog; 45 Tab + 45 Shift+Tab presses never leave it; `.app` is inert, `focus()` on a background control fails and a hit-test lands on the backdrop; arrow keys move between tabs; Enter on an option focuses the new preview; Escape closes, focus returns to the opener, the accepted rows are byte-identical and the draft is still `open` | e2e accessibility "B14 keyboard only" | PASS (Chromium) |
| B14-b Closing never applies | Escape, Close and backdrop each discard a typed "less left" amount (zero `leftover_observations`, no unresolved Thursday, accepted rows unchanged) and return focus to the opener; Cancel keeps the sheet and focuses its tab; Apply by keyboard closes it, returns focus, announces "Applied." | e2e "B14 closing never applies" | PASS (Chromium) |
| B14-c Opener gone | The opener is removed while the sheet is open; on Escape focus lands on another night's Change control, never `<body>` | e2e "B14 if the opener is gone" | PASS (Chromium) |
| B14-d Names and states | 7 distinct "Change <day> dinner" / "Lock <day>" names (exact); Unlock state via `aria-pressed`; "Accepted plan status" heading; Groceries link named with its outstanding count; preview region named "draft, not applied" → "out of date" after Alex's change; the out-of-date announcement made exactly once | e2e "B14 names and states" | PASS (Chromium) |
| B14-e Announcements not excessive | One ambient live region; currency badge not live; nothing live/alert in the app at rest; focus/online refetches and a full 16 s poll interval announce nothing; Alex's decision is announced exactly once to Jon and not repeated by later refetches | e2e "B14 announcements" | PASS (Chromium) |
| B14-f Background/return, stale preview | Jon's sheet open with a preview, app backgrounded, Alex changes Friday; on return the sheet is still open, the preview is stale, Apply disabled, Tab stays in the sheet, the staleness is announced; Discard then Escape returns focus to the opener | e2e "B14 background and return" | PASS (Chromium) |
| B14-g Grocery review during a dinner change | Alex mid-typing in Groceries keeps focus and her half-typed text while Jon's change lands; the delta is shown; one announcement names Jon's change and the approved lines needing review again | e2e "B14 grocery review during a dinner change" | PASS (Chromium) |
| B14-h Narrow + large text + overlap | 320 and 390 px wide, 640 px tall, 150% text: sheet within the viewport, no sideways scroll, Close/Apply/Cancel hit-tested at their centres (not under the nav, header or sticky sheet header) | e2e "B14 sheet at 320px/390px" | PASS (Chromium) |
| B14-i Reduced motion | `animation-name` is `none` under `prefers-reduced-motion: reduce` and `sheet-in` otherwise | e2e "B14 reduced motion" | PASS (Chromium) |
| B14 WebKit / iPhone Safari / VoiceOver | Same checks on WebKit and a physical iPhone with VoiceOver | — | **BLOCKED** — only Chromium is installed (`/opt/pw-browsers`); browser downloads are not permitted; no device |
| B12a Explicit decision, both members see it | Product, revision 1→2, `updated_by`, an append-only decision row; both members' snapshots show the new product; change event text; replay/reused-id behaviour | `tests/integration/b12.staple-products.test.ts` B12a | PASS |
| B12b Future taps use it; no silent authorization | The outstanding line, its fingerprint, its approval, every purchase row and the review fingerprint are unchanged by the decision; the next one-tap request uses the new product and usual ×2 and needs review; choosing the product for this pickup invalidates the old approval, the old review's Send is `stale_review` with zero retailer calls; approving quantities never changes the remembered product | B12b | PASS |
| B12c Orders and transfers unchanged | After send + confirmed order: batches, lines, status events, orders, order lines, approvals and retailer calls identical before/after the decision; the next "Add another" routes to the next pickup with the new product | B12c | PASS |
| B12d Concurrent decisions, both orders | Database-barrier race: first wins, second is `stale_staple` naming who changed it and to what; one decision row; a deliberate retry against the new revision succeeds | B12d (Jon first / Alex first) | PASS |
| B12e Unknown / unavailable stay unresolved | Random id, malformed id, another item's product, another household's product → `unknown_product`; a Kroger product while the simulated retailer is active → `product_unavailable`; staple unchanged. A remembered product the active store doesn't sell leaves the next line unresolved, unsendable and unapprovable (never swapped for the current mapping); a staple with no product shows "No product chosen" | B12e | PASS |
| B12f Usual quantity ≠ product decision | Remembering ×3 keeps the approved product and revision | B12f | PASS |
| B12 UI | Alex adds a product for this pickup and presses "Make this our usual"; Jon's open Groceries shows it without reload; the line still `needs_review`; no purchase approval exists; the Week chip names the remembered product | e2e `tests/e2e/b12.staples.spec.ts` | PASS (Chromium) |
| B12 mutations | stale decision overwrites; tap ignores remembered product; decision swaps the outstanding purchase; unavailable product substituted; usual quantity overwrites product | `tests/mutation/run.mjs` (5 new) | PASS — all KILLED by assertion |

Existing tests whose code changed in this pass (assertions unchanged): **T04** (e2e) now closes Wednesday's
sheet with Escape before locking Thursday and reopens it — with a modal sheet the background Lock is
correctly unreachable, which is exactly what B14 requires; **R-F07-UI** scopes its chip locator to the
Week form because grocery-line controls now carry the item name in their accessible names. No test
was skipped, deleted or weakened.

## B15 Groceries accessibility, B16 staple management, scenarios A–E — added 2026-10-08

New IDs; no earlier row was renumbered or replaced. Implementation commit `5f7b72f`; evidence
`docs/table/evidence/2026-10-08-verify-5f7b72f/summary.md`. Red-before-green: all 14 tests of
`tests/e2e/b15-b16.spec.ts` were run against a production build of `b8fa763` (isolated worktree,
database and port) and all 14 FAILED at the missing feature, none passed
(`evidence/2026-10-08-verify-5f7b72f/pre-b15-on-b8fa763.log`; the spec copied was the working-tree
version just before the remove-conflict step was added to test 5, which already failed earlier on
b8fa763 at its first focus check).

| ID | What is checked (actual focus / database state) | Tests | Status on 5f7b72f |
|---|---|---|---|
| B15-a Product dialog | Keyboard open; focus on the current product's radio; 30 Tab + 30 Shift+Tab stay inside; typed product then Escape → no product row, approval intact, focus back on the opener; empty name + bad size → errors attached (`aria-invalid`, accessible description) and the name field focused; Arrow-key choice → approval withdrawn, said so once, focus back on the opener | e2e b15-b16 "B15 product dialog" | PASS (Chromium) |
| B15-b Order confirmation | Two deliberate steps; per-field errors focused; review heading focused; Escape and Back save nothing (zero orders); "Yes, record this order" records exactly one; focus lands in the new order card (opener gone), never `<body>`; headings say "Sent to cart" then "Ordered" | "B15 order confirmation" | PASS (Chromium) |
| B15-c Receipts | No native `prompt()`/`confirm()` (a native dialog fails the test); substitute, "does it work?" and correction dialogs with required, attached field errors; Escape records nothing; results are append-only rows (correction alongside the original) | "B15 receipts" | PASS (Chromium) |
| B15-d Uncertain transfer | Worded state; the cart check has no default choice, Escape records no status event, "not in the cart" warns about double-adding; recording never resends (1 retailer call) | "B15 uncertain transfer" | PASS (Chromium) |
| B15-e Remove a request | "Keep it" has focus and Enter keeps the request; a member joining while the confirmation is open holds it until reviewed; removing leaves the dinner's own need on the list | "B15 removing a request" | PASS (Chromium) |
| B15-f States for screen readers | Line headings named "<item>: <status>, <product issue>, Unresolved"; unavailable product disabled in the dialog with its reason | "B15 unavailable and unresolved lines" + B15-b/d | PASS (Chromium) |
| B15-g 320/390 px, 150% text, reduced motion | Dialogs inside the viewport, no sideways scroll, buttons hit-tested; all five nav tabs on-screen and hittable (caught and fixed a B14 nav regression); `animation-name: none` under reduced motion | "B15 dialogs at 320px/390px" | PASS (Chromium) |
| B15 stale review | A product change during review withdraws only that line's approval; the old review's Send is `stale_review` with zero retailer calls; unaffected approvals stay valid | integration "Scenario B: choosing the new product…" | PASS |
| B16a–c Staples | Add (item, display name, amount in packages or measured unit, explicit or default product), rename, amount, remove/restore, inactive rules, field-tagged refusals, append-only change log | `tests/integration/b16.staple-management.test.ts` B16a–c; e2e "B16 Household" | PASS (e2e Chromium) |
| Scenario A | Concurrent edits (both orders): first survives, second `stale_staple` with the current values, deliberate resubmit succeeds; edit vs removal (both orders); in the browser (both orders) the second dialog shows the conflict live, keeps typed values, holds Save until reviewed | integration Scenario A ×4; e2e Scenario A ×2 | PASS |
| Scenario B | Staple product/amount changes during Alex's review leave her reviewed purchase sendable unchanged (Send accepted with the old product ref); choosing the new product for this pickup withdraws only that line's approval and the old review cannot Send | integration Scenario B ×2, Scenario B/E ×2 (both orders) | PASS |
| Scenario C | Removing a staple with a usual request and recipe demand leaves the line, requests and every purchasing row unchanged; later typed capture merges | integration Scenario C; e2e B16 Household | PASS |
| Scenario D | After send, confirmed order, substitution + validation and a receipt: product change, amount change and removal leave transfers, order lines, receipts, validations and requests identical | integration Scenario D | PASS |
| Scenario E | Both orders in the browser: product dialog open during the other member's choice keeps typed name, selection and focus (`pd-name`), shows the conflict, holds saving until reviewed; a stale choice sent anyway is `product_changed` | e2e Scenario E ×2 + server-side | PASS (Chromium) |
| Review regressions | Cross-household week refused without disclosure; last-change attribution; stale substitution decision refused; stale removal refused; export covers every household table and staples | integration "B15/B16 review regressions" | PASS |
| B15/B16 mutations | 10 new (stale edit/removal applied, removed staple still a shortcut, removal drops need, amount rounds down, re-point keeps old count, stale product choice applied, any-household week, substitution overwritten) + B12 anchors updated | `tests/mutation/run.mjs` | PASS — all KILLED by assertion (30 killed, 0 survived, 0 error in the evidence run) |
| WebKit / iPhone Safari / VoiceOver | Same checks on WebKit and devices | — | **BLOCKED** — only Chromium is installed; downloads not permitted; no device |

Existing tests whose code changed (assertions unchanged): **T14** (e2e) adds the second
confirmation click "Yes, record this order"; **b12.staples.spec** opens the product dialog
instead of the inline form. No test was skipped, deleted or weakened.

## B17 remaining forms — added 2026-10-08

New IDs; no earlier row renumbered or replaced. Implementation commit `972e368`; evidence
`docs/table/evidence/2026-10-08-verify-972e368/summary.md`. Red-before-green on `81f94e4` (isolated
worktrees, databases and ports): the 8 recipe/plan browser tests (7 at the time of the run; the
"start over" test was added after the review) and the 3 integration tests all FAILED
(`pre-b17-recipes-on-81f94e4.log`, `pre-b17-recipes-vitest-on-81f94e4.log`), and the 7 Household
browser tests all FAILED against the old `Household.tsx` (`pre-b17-household-on-81f94e4.log`); none passed.

| ID | What is checked (actual focus / database state) | Tests | Status on 972e368 |
|---|---|---|---|
| B17-a Recipe editor dialog | Keyboard open, focus on Title, Tab trapped (25 each way); attached errors with first invalid focused, nothing saved; add row focuses its name; remove focuses a survivor (or the lone survivor's name); removing a component re-points its rows; discard guard ("Keep editing" focused, Escape again keeps editing and restores focus, Discard saves nothing); save returns focus and announces | e2e b17-plan-recipes "new recipe" | PASS (Chromium) |
| B17-b Concurrent recipe edits | Both orders: second editor sees who saved version 2 and what changed, keeps typed title and focus, Save held; "Keep my edits" saves version 3; "Start over from version 2" replaces the draft and keeps the other member's added ingredient | e2e ×2 + "starting over"; integration b17.recipes ×2 (database barrier, both orders) | PASS |
| B17-c Lists and notes | Filter tablist (arrows, Home, labelled panel, empty state); per-row Favorite names with aria-pressed; empty note → attached error, focus | e2e "recipe lists" | PASS (Chromium) |
| B17-d Explore and placement | Sounds good names per card, result reported; placement controls named by dinner; new placement preview takes focus | e2e "Explore and deferred dinners" | PASS (Chromium) |
| B17-e 320/390 px, 150% text, reduced motion | Recipe editor fits, no sideways scroll, controls hit-tested, no animation | e2e ×2 | PASS (Chromium) |
| B17-f Household forms | Settings conflict (typed values kept, Save held, revision +1 after review), field errors, server rejection alert; targets errors and save; exclusion add errors, removal confirmation (Enter/Escape keep, Remove removes, focus survives); ingredient review tags-or-confirmation; 320 px / 150% | e2e b17-household (7) | PASS (Chromium) |
| B17 mutation | Stale recipe version stacked | `tests/mutation/run.mjs` B17_stale_recipe_version_stacked | PASS — KILLED by assertion |
| WebKit / iPhone Safari / VoiceOver | Same checks | — | **BLOCKED** — only Chromium installed; downloads not permitted; no device |

Existing test changed (assertions unchanged): **b15-b16.spec** "B16 Household" waits for the Week page
before an absence check and clicks the nav by test id (a navigation race: the absence check could pass
on the still-open Household page, whose export link also matches the name "Household").

## B17 correction (RB17-01..03) and B18 text scaling — added 2026-10-08

New IDs; no earlier row renumbered. Start `7220679`; implementation commit `abdd5a2`; evidence
`docs/table/evidence/2026-10-08-verify-abdd5a2/summary.md` (vitest 141/141, Playwright 104/104,
39 mutations killed, 0 survived, 0 error; tracked-file hash unchanged during the run).

**Reproduction before repair (real PostgreSQL + two signed-in Chromium contexts, on `7220679`):**
`rb17-characterization-on-7220679.log` observed all three review findings: the old steps/reheat text
saved over the newer version after "Keep my edits"; summary, source label, ingredient form and note
reverted by a title-only save; "Nothing you can edit here changed" for a change to the first of two
turkey rows; a versionless save accepted. The expected-correctness tests then FAILED on `7220679`:
8 of 8 browser tests (`rb17-red-e2e-on-7220679.log`) and the RB17-03 integration test
(`rb17-red-vitest-on-7220679.log`). The text-scaling sweep FAILED 13 of 16 on `7220679`
(`pre-b18-sweep-on-7220679.log`); the recipe-editor states FAILED 3 of 4 before their fixes
(`b18-recipe-states-red-on-65882e7.log`). Of the second review's regressions, "focus stays on the
ingredient field" FAILED on the pre-review code (`review2-red-e2e-on-5cd4324.log`); "own save never
reported as the other member's" PASSED there — that race did not reproduce, so it is a guard with a
regression test, not a demonstrated failure.

| ID | What is checked | Tests | Status on abdd5a2 |
|---|---|---|---|
| RB17-01a Content shown and kept | Both commit orders: the other member's new steps and reheat text are shown in full and kept; only the member's title edit is applied (exact saved version row) | e2e b17-correction ×2; unit "rebase" | PASS (Chromium) |
| RB17-01b Hidden fields | A newer API-created version changing summary, source label, ingredient form and note survives a stale title-only editor's save | e2e; unit | PASS |
| RB17-01c Both changed | Both full texts shown; nothing chosen for the member; "Keep my" / "Use version n's" saved exactly; focus moves to the next decision or Save, never `<body>` | e2e ×2 (keep mine, use theirs) | PASS (Chromium) |
| RB17-01d Third version | A version arriving after a decision is brought in before Save; a re-changed field re-conflicts; an undecided field stays undecided across a later version; Save held, nothing written | e2e ×2; unit "editor state" | PASS |
| RB17-01e Editor state | Keystrokes after a rebase apply to the merged draft; older/late versions ignored; start over clears edits, decisions and the rebase record; unsaved changes by content; own save not rebased; focus kept on the field being edited | unit ×4; e2e ×3 | PASS |
| RB17-02 Occurrences | First of two occurrences changed (quantity, unit, form/note), additions/removals of identical occurrences, reorder, rename by key; both rows survive save and storage | unit ×9; e2e duplicate turkey rows; integration storage | PASS |
| RB17-03 Required version | Existing recipe: missing / null → `version_required`, "two" / 0 / 1.5 → `invalid`, stale → `stale_version`; versions, pointer and ingredient rows unchanged; the current version is accepted; creation needs none | integration b17.recipes | PASS |
| B18 sweep | 320×640 at 150% and 200% text: login, Week (proposal, adopted, Change sheet tabs, draft), Cook, Reheat, Explore, Our Recipes (all tabs), recipe detail, recipe editor, Groceries (lines, product, removal, order, receipts, substitution, uncertain transfer, cart check), Household (settings, conflict, targets, exclusions, ingredient review, usual items and their dialogs, staple conflict). Text actually scales; no sideways scroll; nothing past the edge; every control scrolled into view and hit-tested at its centre (not under the header, nav or sheet title); Tab order and actual focus | e2e b18-text-scaling (16) | PASS (Chromium) |
| B18 recipe states | Conflict with long unbroken content (full text readable, decisions hittable and in keyboard order, focus to Save after the last decision); field errors attached and focused; a newer version's long text; a form-level error with nothing written | e2e b18-recipe-states (4) | PASS (Chromium) |
| RB17 mutations | 8: version optional again; untouched field reverted; conflict decided silently; occurrences collapsed; undecided field dropped; older version rebased; compared by display name; compared unlike stored | `tests/mutation/run.mjs` | PASS — all KILLED by assertion |
| WebKit / iPhone Safari / VoiceOver / devices | Same checks | — | **BLOCKED** — only Chromium installed; downloads not permitted; no device |

**Existing tests changed (disclosed):**
- `tests/integration/b17.recipes.test.ts` — the test "callers that do not name a version keep the old
  behavior; a malformed expectation is refused" asserted that a versionless edit of an existing
  recipe was accepted: it encoded the RB17-03 bypass. It is replaced by the RB17-03 test above,
  which keeps its malformed-expectation assertion ("two" → `invalid`) and adds missing, null, 0,
  1.5 and stale, with no write in any case.
- `tests/integration/plan.contract.test.ts` (T21) — its direct `SaveRecipeVersion` call now passes
  `expectedVersionNo: 1` (an internal caller update). T21's assertions are unchanged.
- `tests/e2e/b17-plan-recipes.spec.ts` — "editing the same recipe" now decides the title conflict with
  "Keep my Title" instead of the removed single "Keep my edits (I've reviewed version 2)"
  acknowledgement; its database assertions are unchanged. The test "starting over from the other
  member's version…" is renamed "non-overlapping edits…": its scenario (Jon edits the title, Alex
  adds cumin) no longer conflicts, so the cumin is brought in automatically and Jon's title stands.
  Its final assertions (version 3 keeps the cumin and carries Jon's title) are unchanged. Start-over
  behaviour (draft replaced, conflict gone, focus on Title) is asserted by the new
  b17-correction test "'Start over' in a conflict…".

No test was skipped, deleted or weakened.
