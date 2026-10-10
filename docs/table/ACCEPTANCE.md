# Table — Acceptance register

Status vocabulary: NOT IMPLEMENTED · IMPLEMENTED / NOT RUN · PASS · FAIL · BLOCKED.

**Current evidence run:** `docs/table/evidence/2026-10-08-verify-68f4549/summary.md` (multi-source handoff, implementation `c1bf933`, `99c3b99`, `2b9d83a`, `68f4549`; clean tree, source hash unchanged during the run): vitest 833/833, Playwright 128/128, 74 mutations killed, 0 survived, 0 error. Earlier runs are kept as history under `docs/table/evidence/` (latest before this: `2026-10-08-verify-579179b/`, B21/B22).
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

## Integration preparation (B9 candidate, B7 nutrition, B5 Kroger adapter) — added 2026-10-08

New IDs; no earlier row renumbered. Start `639c103` (plus the docs-only recheck receipt `0712ccb`);
implementation commits `a871af9` (B9), `c974507` (B5, worker), `668b00e` (B5 integration),
`f20a7ab` (B7, worker), `4d0e822` (integration), `c19bd5a` (background fix); verified at `c19bd5a`.
Evidence `docs/table/evidence/2026-10-08-verify-c19bd5a/summary.md` (vitest 284/284, Playwright
116/116, 57 mutations killed, 0 survived, 0 error). A first full run on `4d0e822` FAILED (T09, see
INT-10) and is kept in the same folder as `verify-4d0e822-FAIL/`.

**Red before green.** B9: on the pre-fix code all 7 dispatch-overlap integration tests failed (6 by
assertion, 1 by a missing function — `b9-overlap-red-on-0712ccb-v2.log`), the two-process e2e failed by
assertion ("uncertain" instead of "dispatch_started"; run as a variant waiting on `/login` because
`/api/health` did not exist yet — `b9-overlap-e2e-red-on-0712ccb.log`), the recovery tests failed by
assertion (`b9-recovery-red-on-2e6d8ae.log`). B5/B7: the new test files fail at import on `639c103`
(modules absent — not assertion failures); B7's one runnable behavior test failed by assertion
(`b7/red-on-639c103.log`, `b5/red-on-639c103.log`). The per-household readiness test failed before
its change (observed in-session; log not saved). INT-10: red on `4d0e822` (`background-currency-red-on-4d0e822.log`).

| ID | What is checked | Tests | Status |
|---|---|---|---|
| INT-01 Overlap-safe recovery | A process starting while another sends leaves it alone; a stalled send becomes uncertain within the bound while running; the running sweep marks an abandoned send without restart; a late answer never overwrites uncertain or a member's cart check; a timeout is not a rejection (packages not re-offered, new send refused); recovery is repeatable; nothing is replayed | integration b9.dispatch-overlap (7); e2e b9-overlap (two real processes); X05 | PASS |
| INT-02 Health and production config | 503 with codes only for weak/missing secret, non-https or path-bearing auth URL, missing DB, test-only settings, `KROGER_ACTIVATE` without the Kroger retailer, unreachable DB, pending/changed migrations; 200 otherwise | integration b9.deploy-health; local production-mode check | PASS |
| INT-03 Account recovery | Operator reset replaces the password, ends that member's sessions, leaves the other member alone; refuses unknown, non-member and short | integration b9.account-recovery | PASS |
| INT-04 Upgrade of a populated database | 006+007 on a populated schema-005 database: every pre-existing table identical over its original columns; app serves it; pre-existing credential signs in | scripted check (`upgrade-check/`) | PASS (local) |
| INT-05 Nutrition adapter and normalization | Search/detail mapping for every data type; per-100 g basis; energy fallback recorded; missing/bad units unknown; serving ≠ 100 g; ml ≠ g; incompatible form; no matches; invalid key; 429; timeout; malformed; schema mismatch; no key in errors/logs | unit fdc-normalize, fdc-client | PASS |
| INT-06 Match review | Persistence and history; household isolation; competing changes (both orders, stale refused, nothing written); changed since review refused; accepted dinners, recipe versions, targets and allergen fields unchanged; export without key | integration b7.nutrition; e2e b7-nutrition (incl. 320 px at 150%/200%) | PASS |
| INT-07 Kroger connection | State single-use, expiry, member/household/redirect binding, replay refused; denied access; tokens sealed and household-bound; coordinated refresh (one refresh for two callers; failure → re-authorization once); absent config/activation stores nothing; no secrets in logs or export | unit kroger-security/mapping/lookup; integration b5.kroger-connection; e2e b5-kroger | PASS |
| INT-08 Kroger dispatch | Readiness false with credentials and no activation, and with `connect,products`; cart not ready without a documented `modality`; household not ready → refused before freezing; stale review → zero calls; 204 → one PUT equal to the frozen bytes, batch-level only, no order; timeout/network/500/undocumented → uncertain, never replayed; 400 → failed; 401 → failed, no retried write; refresh before PUT; refresh failure → failed, nothing sent; household isolation | integration b5.kroger-dispatch | PASS (fake transport only) |
| INT-09 Kroger card | Capabilities with evidence ("not live-verified"); connect disabled while not activated; refused sign-in announced and focused; store id validated and saved; 320 px at 200% text | e2e b5-kroger | PASS (Chromium) |
| INT-10 Background refresh | A refresh completing while the app is hidden never marks it up to date; return re-establishes | e2e background-currency | PASS |
| INT mutations | B9 ×6, B5 ×6, B7 ×6 | `tests/mutation/run.mjs` | PASS — all KILLED by assertion |
| Live providers | Kroger (any request), FDC with the household's key, hosted deployment, WebKit/Safari/VoiceOver/devices | — | **BLOCKED** (not authorized / not available); FDC: 3 demo reads only |

**Existing test changed (disclosed):** **X05** (`tests/e2e/x-checks.spec.ts`) — recovery now waits until
a send is older than the dispatch bound (INT-01), so the restarted server runs with a short test-only
bound (`TABLE_DISPATCH_TIMEOUT_MS=1000`) and the test polls for the result; it now also asserts the
uncertain status came from crash recovery. Its assertions (uncertain, never retried, shown as uncertain)
are unchanged. `startServer` in that spec takes optional extra environment. No test was skipped,
deleted or weakened.

## Cook-record idempotency (delivery review of fb4d771, gate 2) — added 2026-10-08

New IDs; no earlier row renumbered. Start `fb4d771`; implementation commit `02a3b1a`; verified at
`02a3b1a`. Evidence `docs/table/evidence/2026-10-08-verify-02a3b1a/summary.md` (vitest 293/293, Playwright 117/117, 62 mutations killed, 0 survived, 0 error).

**Red before green** (all in the same folder, `red/`). Integration: on `fb4d771` 7 of 8 failed by
assertion; the operation-id replay passed, as the review predicted (`cook-records-red-on-fb4d771.log`).
Browser: the new spec fails on `fb4d771` because the cooked state does not exist (element not found —
`cook-records-e2e-red-on-fb4d771.log`, not an assertion about behavior), so a behavior variant was run
on `fb4d771` that presses "Mark cooked" twice through the old UI and counts rows: it failed by assertion,
"a second press must not add a record — expected 1, received 2"
(`cook-records-e2e-red-variant-on-fb4d771.log`, spec saved beside it). A first attempt at that variant is
kept as `INVALID-cook-records-e2e-red-variant-schema-008.log`: it ran the old code against a database
already migrated to 008, so the second press was refused by the new index (HTTP 500) — not a valid red.
Restore order: with an immediate `duplicate_of` reference the restore test failed by assertion
(`cook-restore-red-nondeferrable.log`).

| ID | What is checked | Tests | Status |
|---|---|---|---|
| COOK-01 One record per event | A second press by the same member (new operation id) adds nothing and names who recorded it; the same operation id replays the receipt; both members at once, in both orders → exactly one record, by the first, the other told "already recorded"; the database refuses a repeated insert of the current record if a command were bypassed (since B21/D84 for every generation and every writer — CR-21-01) | integration cook-records (5); b21-b22 | PASS |
| COOK-02 Cooked state shown | The snapshot carries who recorded the night and when; the Cook page shows "Cooked · recorded by …" instead of the button, live for the other member; a press from a stale page is answered "already recorded" and adds nothing | integration cook-records; e2e cook-records | PASS (Chromium) |
| COOK-03 Correction | "This wasn't cooked" appends a correction (nothing deleted); history, "new to you" and the Cook page ignore the corrected record; cooking can be recorded again, once; refusals for another household (`not_found`), unknown reason (`invalid`), already corrected (`stale`) write nothing; the dialog opens on "Keep the record", Escape keeps it, focus returns | integration cook-records; e2e cook-records | PASS (Chromium) |
| COOK-04 Existing duplicates and restore | Duplicates are kept and marked, shown once; export/restore keeps records, duplicates and corrections in the worst row order; upgrade of a populated 007 database holding duplicates (only `schema_migrations` differs over pre-existing tables; 2 effective, 2 marked) | integration cook-records "export and restore"; scripted upgrade check (`upgrade-008/`) | PASS (local) |
| COOK mutations | second record added, correction applied twice, history counts a corrected record, "new to you" counts a corrected record, snapshot ignores the record | `tests/mutation/run.mjs` | PASS — all KILLED by assertion |
| Devices | Cook page cooked state and correction dialog on iPhone Safari/VoiceOver | DEVICE-CHECKLIST D-row added | **NOT RUN** (B8) |

**Existing tests changed:** none. T06 (cook mode records cooking) passes unchanged.

## Visual update (UI-VISUAL-UPDATE-PROPOSAL.md §5) — added 2026-10-08

New IDs; no earlier row renumbered. Start `d0c8df8` (code `02a3b1a`); implementation commit `f22f9d5`;
verified at `f22f9d5`. Evidence `docs/table/evidence/2026-10-08-verify-f22f9d5/summary.md` (vitest 298/298, Playwright 121/121, 64 mutations killed, 0 survived, 0 error).
Before/after screenshots at 390 px and 320 px, light and dark preference, in `screens-before-02a3b1a/` and
`screens-after-f22f9d5/` (each view on arrival `-top` and as a full page `-full`; in a full-page capture the
fixed header and tab bar appear once, at the scroll position). The code before this update has one theme,
so its "light" captures are dark.

**What the existing suite caught during development** (`dev/pw-first-run-31-failed.log`, kept): a new
"Open Groceries" link whose name contained "Groceries" made 25 tests' `getByRole('link', { name:
'Groceries' })` ambiguous (link removed — the tab bar is the route); the B18 sweep found the tab badge
widening the Groceries tab at 200% text and a wrapped "N grocery lines need someone" link covered by its
list item (both fixed in CSS); and the cook-records spec (from `02a3b1a`) looked up the correction
message page-wide, which also matched the announcer (looked up inside the Cook view now — same
assertion; disclosed below). After the fixes those 31 passed (`dev/pw-rerun-31-passed.log`).

| ID | What is checked | Tests | Status |
|---|---|---|---|
| UI-01 Theme contrast | Both themes: every text/background pair ≥ 4.5:1, focus outline ≥ 3:1, read from `globals.css` (table in `contrast.md`; lowest 5.05 light, 5.13 dark) | unit theme-contrast (5); mutations UI_light_text_too_faint, UI_dark_text_too_faint | PASS |
| UI-02 Contracts unchanged | Every existing test id and accessible name; T01–T22, X01–X12, B14–B18 focus and modal tests, the 320 px / 150% / 200% sweep, cook records | full Playwright suite | PASS (Chromium) |
| UI-03 Phone widths | Week, Cook, Groceries, Our Recipes, recipe detail, Explore, a proposal at 390 and 320 px in both themes: no horizontal page scroll | e2e ui-screens (4) | PASS (Chromium) |
| UI-04 Honest numbers | Pickup estimate is one large figure only when complete; otherwise "known + N unpriced" with the lines listed; "simulated store prices" labeled; budget in one wording on Week and Groceries; unknown time/effort shown as unknown | T05, B15 tests, ui-screens (visual) | PASS (Chromium) |
| Devices | Both themes, contrast and the new layout on iPhone Safari with VoiceOver and large text | DEVICE-CHECKLIST (existing D-rows cover every screen) | **NOT RUN** (B8) |

**Existing test changed (disclosed):** `tests/e2e/cook-records.spec.ts` line 49 — `getByText("Corrected:
this dinner is not recorded as cooked.")` → the same text inside `getByTestId("cook-view")`. The page-wide
lookup also matches the polite announcer whenever both hold the text, so whether it passed depended on
timing. The assertion (the visible message is shown) is unchanged. No test was skipped, deleted or weakened.

**Independent recheck of `bcb74ed`** (`evidence/2026-10-08-independent-recheck-bcb74ed/`): bundle hash,
refs, evidence counts and both tracked-file hashes matched; no rerun of tests. B19 and B20 closed for
the command path and Chromium-tested presentation. COOK-01's database clause narrowed above; open items
B21 (database-wide invariant) and B22 (cooking recorded for a dinner no longer scheduled) await a decision.

## B21/B22 — database cook-record invariant, stale cooking events — added 2026-10-08

New IDs; no earlier row renumbered. Start `3632963`; implementation commit `5250e62`, test correction
`579179b`; verified at `579179b`. Evidence `docs/table/evidence/2026-10-08-verify-579179b/summary.md` (vitest 315/315, Playwright 121/121, 67 mutations killed, 0 survived, 0 error).
The first full run, on `5250e62`, **FAILED** — vitest 315/315 and Playwright 121/121 passed, but the mutation
`COOK_second_record_added` was classified ERROR (kept as `verify-5250e62-FAIL/`). Root cause: with migration 009
the database itself refuses the mutant's second record, so the mutated command throws, and the cook-records
tests let that error escape instead of asserting on it. Corrected in `579179b` (below).

**Red before green** (`red/b21-b22-red-on-3632963.log`, the committed test file run on `3632963` with
its schema at 008): 12 of 17 failed. Ten by assertion on the gaps — a raw second record under another
generation accepted; two raw writers both committed (READ COMMITTED, REPEATABLE READ, SERIALIZABLE); a
new first record accepted after a correction; replaced, set-aside and removed dinners recorded; both
race orders. Two failed because the link column did not exist yet (mechanism absent, not a behavior
assertion). The five that passed are preservation checks (append-only, correction and re-record through
the command, export/restore, a moved dinner, a past dinner). A first run of the test file against a
database not named `table_test` was refused by the fixture guard and is not evidence.

| ID | What is checked | Tests | Status |
|---|---|---|---|
| CR-21-01 Database invariant | A raw insert of a second effective record under a different generation is refused; two writers outside the command framework, concurrently, in READ COMMITTED, REPEATABLE READ and SERIALIZABLE → at most one commits; one effective record remains | integration b21-b22 (4) | PASS |
| CR-21-02 Correction then re-record | Through the command, twice (generations 1→2→3), one effective record each time; a raw re-record must name the corrected record; naming an uncorrected record, a second successor, or racing an uncommitted correction is refused; concurrent re-records → one | integration b21-b22 (4) | PASS |
| CR-21-03 Append-only, restore, upgrade | UPDATE/DELETE refused; export/restore of a corrected chain plus a historical duplicate in reverse row order; upgrade of a populated 008 database with planted cases (valid chains linked, two cross-generation violations kept and marked duplicates, original columns of all 13 rows identical, no event with two effective records); pg_dump backup restored with the trigger and indexes, which still refuse an uncorrected successor | integration b21-b22; `upgrade-009/` | PASS (local) |
| CR-22-01 Stale events | Replaced, set-aside and removed dinners → `stale_event`, nothing written, accepted week and event status unchanged; moved dinner still recordable; past dinner on its plan recorded on its own date | integration b21-b22 (5) | PASS |
| CR-22-02 Replacement vs recording | Both commit orders, serialized by the household lock: stale / recorded-then-retired; a later press is stale | integration b21-b22 (2) | PASS |
| CR mutations | B21_rerecord_without_link, B22_stale_event_accepted, B22_status_only | `tests/mutation/run.mjs` | PASS — all KILLED by assertion (a first run classified them ERROR because the tests let a thrown command error escape; the tests now capture each outcome, then assert) |

**Existing test changed (disclosed):** `tests/integration/cook-records.test.ts` — the second-press, both-members
and re-record calls now capture the command's outcome (a thrown error included) and assert on it, as the B21/B22
tests do. Assertions unchanged; the five COOK mutations are killed by assertion (`mut-cook-fix/`).

## Multi-source handoff (TABLE-ACCEPTANCE-MATRIX.md) — added 2026-10-08

New IDs as in the handoff's matrix; no earlier row renumbered. Start `798a3e8` (B21/B22 in place); implementation
commits `c1bf933` (Instacart client, worker), `99c3b99` (import building blocks, worker), `2b9d83a` (integration,
phases 1–5), `68f4549` (E2E-01/02); verified at `68f4549`. Evidence
`docs/table/evidence/2026-10-08-verify-68f4549/summary.md` (vitest 833/833, Playwright 128/128, 74 mutations killed, 0 survived, 0 error). Chromium only; every external transport is a
local fixture: page reads come from `tests/fixtures/import-site` (synthetic pages), Instacart from doc-shaped synthetic
fixtures through the recording fake; `fetch` is stubbed to throw in every new test file.

**Red before green.** These are new capabilities: on `798a3e8` the new integration files fail at import (the modules
do not exist — `red/ms-red-on-798a3e8.log`), which is recorded as such, not as behavior red. Behavior-level proof is
by mutation: seven MS mutations, each killed by an assertion of the acceptance case it breaks (link de-duplication,
incomplete import confirmed, Budget Bytes page read, private address allowed, store products kept for another
destination, destination revision ignored, stale Instacart list requested). A first full verification run was
**stopped by the operator** to add the E2E-01/02 tests to the verified commit (kept as
`ABORTED-by-operator-2b9d83a/`, not a result).

| ID | Tests | Status |
|---|---|---|
| URL-01 save without importing | integration ms-sources; e2e ms-sources | PASS |
| URL-02 tracking variants, both members at once, operation-id replay | integration (both orders, replay); e2e; mutation MS_link_dedup_by_raw_url | PASS |
| URL-03 social / login-only / no recipe | integration (Instagram post, 403 page, page without Recipe) | PASS |
| URL-04 `file:`, `javascript:`, `data:`, credentials, localhost, IP, single-label, malformed | integration (8 links, nothing written); unit recipe-import-url (45); e2e | PASS |
| URL-05 private / mixed / metadata / mapped addresses, unsafe redirect, numeric hosts, ports, rebinding | integration (only the validated public address is ever connected); unit recipe-import-ip (106), recipe-import-fetcher (62); mutation MS_fetch_private_address_allowed | PASS (fixture transport; the production transport is not exercised — see INTEGRATION-CAPABILITIES) |
| URL-06 huge body, redirect loop, decompression bomb, slow stream, malformed HTML/JSON-LD | unit recipe-import-fetcher, recipe-import-jsonld | PASS |
| URL-07 scripts, event handlers, prompt-injection text | integration (synthetic page with script, onload, injection text: nothing stored); unit recipe-import-jsonld (hostile) | PASS |
| URL-08 JSON-LD Recipe incl. `@graph`, `@type` arrays | integration; unit recipe-import-jsonld (60) | PASS |
| URL-09 several Recipe nodes, unrelated JSON-LD | integration (member chooses; never mixed); unit | PASS |
| URL-10 fractions, units, can/bunch/to taste, raw/cooked | integration; unit recipe-import-ingredient-line (125) | PASS |
| URL-11 incomplete import not eligible | integration; unit ms-domain; ms-flow E2E-02; mutation MS_import_confirms_incomplete | PASS |
| URL-12 confirm → one imported version with source | integration; e2e ms-sources | PASS |
| URL-13 editing an imported recipe keeps a scheduled dinner pinned | integration | PASS |
| URL-14 both members edit one draft at once | integration (both orders: revision conflict, nothing overwritten) | PASS (revision conflict; no field-by-field rebase for drafts) |
| URL-15 archive the link after import | integration (recipe and dinner unchanged; restorable) | PASS |
| URL-16 export/restore with links and drafts; upgrade | integration (reverse row order); upgrade check of a populated 009 database (`upgrade-010-011/`) | PASS (local) |
| BB-01 Budget Bytes filter, official link, no catalog | e2e ms-sources | PASS |
| BB-02 saved once, attributed, both members | integration; e2e | PASS |
| BB-03 link-only; never read | integration (zero transport calls); e2e; mutation MS_budget_bytes_page_read | PASS |
| BB-04 member's own list → household recipe after review; posted price never a store price | integration; Explore copy | PASS |
| GR-01 no store chosen / no credentials | integration (zero calls, nothing recorded) | PASS |
| GR-02 Jon switches while Alex reviews | integration (old Send → `stale_review`, zero calls); e2e (live for Alex) | PASS |
| GR-03 store products/prices not misapplied; history unchanged | integration (switch away and back); mutation MS_destination_keeps_store_products | PASS |
| GR-04 open plan preview during a switch | integration | PASS |
| GR-05 switch after a confirmed order + new need | integration (history equal; the need goes to the next pickup — no second order) | PASS |
| GR-06 no product at another destination | integration (no product reused; Instacart lines carry no product ids/UPCs) | PASS |
| GR-07 unpriced line | integration (incomplete total, firm budget unconfirmed) | PASS |
| GR-08 copy/download | unit ms-domain (text, CSV, formula-safe); e2e (clipboard) | PASS |
| GR-09 switch while approving | integration (the old approval is refused) | PASS (server); focus/typed-input preservation during a switch not separately tested |
| GR-10 both choose at once | integration (both orders); mutation MS_destination_ignores_revision | PASS |
| GR-11 switching during an in-flight/uncertain batch | integration (acknowledged transfer history unchanged, no replay); late-answer rules unchanged and covered by INT-01/X05 | PASS (in-flight cases by the existing tests) |
| GR-12 nearby without entitlement | integration (unavailable, zero calls) | PASS |
| IC-01 nearby brands | integration; e2e (separate server, recording fake) | PASS (doc-shaped fixtures) |
| IC-02 list link from the frozen review | integration (`line_item_measurements`, no product ids, no batch/order); e2e | PASS (doc-shaped fixtures) |
| IC-03 stale review / changed destination | integration (zero calls); mutation MS_instacart_stale_list_requested | PASS (T1 refusal; the T2 cancel path is implemented, not forced in a test) |
| IC-04 duplicate, timeout, 5xx | integration (replay without a call; uncertain, called once, not repeated) | PASS |
| IC-05 401/403, untrusted link, expiry | integration (failed; no link stored; key absent from DB and export) | PASS (expiry: the docs state no expiry in the response; not exercised) |
| IC-06 not configured | integration; unit instacart-config | PASS |
| E2E-01 / E2E-02 | integration ms-flow (real PostgreSQL, commands end to end); browser pieces in ms-sources/ms-groceries | PASS (server-level end to end; not one continuous browser journey) |
| E2E-03 320/390 px, light/dark, 150/200% text, keyboard | e2e ms-sources/ms-groceries (320 px at 200% text, both themes, dialog focus and Escape); B18 sweep over Groceries with the new controls; ui-screens (Saved links) | PASS (Chromium) — Safari/VoiceOver **NOT RUN** (B8, D24–D26) |
| SEC-01 another household | integration (link, draft, import, review, confirm, discard: `not_found`, nothing leaked) | PASS |
| SEC-02 no network, secrets server-side | every new test stubs `fetch`; key absent from DB rows, receipts, change events, export | PASS |
| SEC-03 malformed provider response / unsupported units | integration (unreadable 200 → uncertain); unit instacart-client (unsupported unit refuses the whole list) | PASS |

**Existing tests changed:** `tests/e2e/ui-screens.spec.ts` also captures the Saved links tab (addition only).
No test was skipped, deleted or weakened.

## URL to cart (product priority 2026-10-08, `URL-TO-CART.md`) — added 2026-10-08

Base `9623de4`; implementation `184d99f` (extractor and line suggestions by a worker, merged into the same
commit); verified at `184d99f` — `docs/table/evidence/2026-10-08-verify-184d99f/summary.md` (vitest 1095/1095, Playwright 131/131,
83 mutations killed, 0 survived, 0 error). Chromium only. Every page, photo and Kroger answer is a local fixture (synthetic pages in
`tests/fixtures/import-site` and `recipe-pages`, a generated 2×2 PNG, the Kroger recording fake); the live
transport runs only against a local TLS server with a throwaway certificate. No request reached any website or
Kroger. **Red before green:** on `9623de4` the new files fail (`red/u2c-red-on-9623de4.log`: 14 failed — the
new behaviours don't exist; two files fail at import), recorded as such; behaviour is proven by 9 new
mutations, each killed by an assertion.

| ID | What | Tests | Status |
|---|---|---|---|
| U-01 | Paste a link → saved and read in one step; attribution, description, step/photo counts kept; method and photo **not** kept by default; no photo request | integration u2c-url-import; e2e U2C-E1; mutation U2C_content_kept_without_permission | PASS |
| U-02 | Household-private setting: method kept as editable steps, one photo stored (sniffed, hashed, permission recorded); confirm carries photo, author, site; later versions keep them | integration | PASS |
| U-03 | Per-site grants keep only what that site permitted | integration; unit CP-03 | PASS |
| U-04 | A "photo" that isn't one is not stored; the draft opens and says so | integration; unit photo sniffing; mutation U2C_photo_not_sniffed | PASS |
| U-05 | Budget Bytes never read, even with the household-private setting | integration; e2e U2C-E3, BB-01/02 | PASS |
| U-06 | 404 recorded; 429/500 passing (not recorded, retry); no recipe data says so; re-read allowed | integration; e2e U2C-E2; mutation U2C_passing_problem_recorded | PASS |
| U-07 | Microdata-only page → draft marked as older markup | integration; unit extract-details | PASS |
| U-08 | Same link again → the open review (no second read); after confirm → the recipe | integration | PASS |
| U-09 | Reading off → link saved, paste offered; invalid link → nothing saved | integration; e2e U2C-E2 | PASS |
| U-10 | Unsure lines carry suggestions, never decisions; confirm refused until each is decided | integration; unit ingredient-suggest (property loop); e2e U2C-E1; mutation U2C_suggestion_applied_unreviewed | PASS |
| U-11 | Kept photos export as base64 and restore byte-identical | integration | PASS |
| LT-01..04 | Live reader on local TLS: certificate/host verified, cookies dropped, gzip, caps, refused redirects, photo mode; resolver answers from the OS, private answers refused | unit recipe-import-live-transport; mutation LT_certificate_not_verified | PASS |
| CP-01..04 | Content policy defaults, grants, Budget Bytes, malformed settings refused in production | unit u2c-content-policy | PASS |
| KM-01..02 | Kroger matching needs the Kroger store, the `products` capability and a store; otherwise zero requests | integration u2c-kroger-mapping; mutation KM_simulated_store_searches_kroger | PASS |
| KM-03..05 | Search at the store; choice re-reads by id; UPC, package, store price (promo as promo), mapping recorded; client-sent price/package ignored | integration; mutation KM_promo_recorded_as_regular | PASS |
| KM-06..07 | Unreadable size → member states it; no UPC / gone / unknown ingredient → refused, nothing written | integration; mutation KM_package_guessed | PASS |
| KM-08..10 | Bound to what was seen (B15), a new choice withdraws the approval; replay writes once; bulk match capped at 12 and chooses nothing; no cart call anywhere | integration; mutation KM_choice_not_bound_to_seen | PASS |
| — | Kroger matching UI (product dialog search, "Match products at Kroger") | typecheck and build only — **no browser test** (the e2e server can't script the in-process Kroger fake) | NOT BROWSER-TESTED |
| — | Real pages, real photos, real Kroger, WebKit/Safari/VoiceOver/devices | — | BLOCKED (R1, C1/C2, K1–K7, B8) |

Defects found by these tests before the commit: on Our Recipes the add-from-link result was dropped, so a page
that couldn't be read showed no reason (e2e U2C-E2; fixed); a browser test's closing page could leave a live
refresh holding locks while the next test's reset ran, and PostgreSQL chose the reset as deadlock victim (test
reset now retries only on `40P01`).

## Recheck corrections RUC-01 / RUC-02 and Kroger matching UI (review of 988c4d1) — added 2026-10-08

Reviewed delivery `988c4d1` (implementation `184d99f`); corrections `33c84e1` + mutation-harness fix `c9a95b6`, verified at
`c9a95b6` — `docs/table/evidence/2026-10-08-verify-c9a95b6/summary.md`: vitest 1117/1117, Playwright 136/136, 88 mutations killed, 0 survived, 0 error.

**Failed run kept:** verify-all on `33c84e1` FAILED (`verify-33c84e1-FAIL/`): vitest 1117/1117 and Playwright 136/136
passed, but the mutation step had 1 ERROR (`U2C_content_kept_without_permission`: its anchor disappeared when
`content-policy.ts` was rewritten) and 1 SURVIVED (`MS_budget_bytes_page_read`: RUC-01 added a second, independent
Budget Bytes check, so removing only the first no longer broke a test). Both were re-targeted in `c9a95b6` (the second now
removes the shared predicate, i.e. both layers) and the whole pipeline re-run on `c9a95b6`.
The reviewer's probes (`probes/recheck.cjs`) characterize the defects and were **not** copied into the suite; the
regressions below are expected-correctness tests in the real harness (PostgreSQL, in-process fixture transport,
Kroger recording fake, Chromium).

**Red on the reviewed baseline.** `red/ruc-red-on-988c4d1.log`: with the reviewed code and the new tests, 11 failed
for the reported reasons (a redirect reached `www.budgetbytes.com` twice; the ungranted target's method was staged
under "permission recorded for licensed.example.com"; a WEIGHT product with a typed 2 lb was accepted as a fixed,
priced package), while the guards passed (direct Budget Bytes link: zero requests; fixed-unit success; history kept).
Two earlier attempts are kept and labelled invalid: `INVALID-ruc-red-db-down.log` (PostgreSQL had stopped) and
`INVALID-ruc-red-test-fixture-bug.log` (a fixture used a bare "oz" size, which Table deliberately treats as
ambiguous — corrected in the test, not the product).

| ID | What | Tests | Status |
|---|---|---|---|
| RUC-01 | Direct blocked source: zero requests | integration R1-01; unit FP-01 | PASS |
| RUC-01 | Allowed link → Budget Bytes: zero requests to it, no draft, link marked permission_blocked | integration R1-02; unit FP-02; mutation RUC01_redirect_skips_read_policy | PASS |
| RUC-01 | Photo redirect to a blocked or unlisted host: refused before the request | integration R1-03, R1-09 | PASS |
| RUC-01 | Granted → ungranted site: facts from the page actually read, nothing kept, source and label of that page | integration R1-04, R1-05 (facts-only); mutation RUC01_grant_from_entry_url | PASS |
| RUC-01 | Owner-selected household-private mode applies to the actual source and is labelled as an owner mode | integration R1-06; unit CP-02 | PASS |
| RUC-01 | Same-site redirect keeps the grant; another photo host only when the owner listed it | integration R1-07, R1-08; unit CP-05; mutation RUC01_photo_from_any_host | PASS |
| RUC-01 | Network safety unchanged (private redirect target refused, same-site redirect followed) | unit FP-03, LT-01..04, recipe-import-fetcher | PASS |
| RUC-02 | Sold by weight + typed amount → refused, nothing written, line and estimate unchanged | integration R2-01; mutation RUC02_weight_sold_accepted | PASS |
| RUC-02 | Absent or unfamiliar sale basis → refused | integration R2-02; mutation RUC02_unknown_basis_accepted | PASS |
| RUC-02 | Search shows the basis and why it can't be chosen | integration R2-03; e2e KM-E3 | PASS |
| RUC-02 | Fixed unit still works: readable size with a promotion; a member-stated size for a unit item; no price stays unknown and the estimate stays incomplete | integration R2-04, KM-04, KM-06 | PASS |
| RUC-02 | Earlier products and price history never rewritten | integration R2-05 | PASS |
| UI | Search, choose, focus back on the opener, store price shown, zero cart requests (product reads counted separately) | e2e KM-E1 | PASS |
| UI | Unreadable size: error on the field and focused, then chosen | e2e KM-E2 | PASS |
| UI | Weight / unknown basis not choosable, with the reason | e2e KM-E3 | PASS |
| UI | Other member's change while open: held back until reviewed | e2e KM-E4; integration KM-08 | PASS |
| UI | Bulk match, 320 px at 200% text, no horizontal scroll | e2e KM-E5 | PASS |
| — | Store changed after the search: re-read and priced at the store current at choice | integration KM-11 | PASS |
| — | Test-only scripted fake refused in production; log has no headers | unit KF-01..03 | PASS |

**Defect found by the new browser test before the commit:** the bulk "Match products at Kroger" dialog told the
server the member saw no product, so a choice for an item that already showed one was refused as stale (KM-E5,
first run `dev/km-e2e-1.log`); it now sends the product each item showed.

**Changed existing assertions (transparent):** U-02, U-03 and CP-01..03 pinned the old provenance wording
("household-private copy (owner setting)", "permission recorded for …") and the old three-field policy; they now
pin the corrected labels and `kind`/`source` (D103). No other assertion was weakened.

**Populated upgrade, export and restore with a photo** (`upgrade-012/`, disposable databases): a database built by
the reviewed-era code at migrations 001–011 (fixture household, an accepted week, saved links incl. Budget Bytes, a
confirmed import, an open pasted draft) was migrated by `c9a95b6`: only `012` applied, a second run applied nothing, **no
existing row or column value changed**, existing drafts read as nothing kept, the library loads; a new import with a
photo kept under the owner mode was confirmed; export → restore into a second database → export reproduced the
export exactly and the restored photo bytes match their recorded hash. ALL PASS.

**Not covered:** the pilot itself (its commit, migration level and settings are user-reported only), real recipe
sites, real Kroger, WebKit/Safari/VoiceOver/devices.

## B10 partial handoff, continuous URL-to-cart journey, phone upgrade rehearsal — added 2026-10-09

Starting `3ac64f6`; migration lock `3378e01` (worker, cherry-picked); B10 + journey + callback fix `7c79eb6`; verified at `7c79eb6` —
`docs/table/evidence/2026-10-09-verify-7c79eb6/summary.md`: vitest 1129/1129, Playwright 139/139, 93 mutations killed, 0 survived, 0 error.

**B10 behavior (integration fixture `mixed()`: cheese unpriced, cucumber without a product, seven lines approved).** Sendable
alone: black beans 1 × $1.09, broccoli 2 × $2.49, rice 1 × $3.99, salmon 1 × $10.99, soy sauce 1 × $2.79, tofu 1 × $2.29,
tortillas 1 × $2.99. Left out with reasons: cheese (price unknown), chicken thighs, Greek yogurt, olive oil, pita (not approved),
cucumber (no product, amount unknown). Choosing broccoli, rice and salmon sends exactly `SIM-BROCCOLI ×2, SIM-RICE ×1,
SIM-SALMON ×1`; the other four approvals stay unconsumed and the batch records ten omissions with their codes.

| ID | What | Tests | Status |
|---|---|---|---|
| B10-01 | Mixed list: only lines the whole-list Send would send are offered; every other line named with its reason | integration B10-01; mutation B10_unready_line_selectable | PASS |
| B10-02 | Exact outbound subset; omission summary recorded; only chosen approvals consumed; both members see it | integration B10-02; e2e B10-E1; mutation B10_all_approvals_consumed | PASS |
| B10-03 | Stale review, changed omissions, unready or duplicate selection → refused, zero calls | integration B10-03; e2e B10-E2; mutation B10_omissions_not_checked | PASS |
| B10-04 | Another way of shopping, a firm budget over or unknown, a store not ready → refused before any call | integration B10-04; mutation B10_firm_budget_relaxed | PASS |
| B10-05 | Two partial sends, or partial + full, at once, in every order → one batch, one call | integration B10-05 | PASS |
| B10-06 | Uncertain partial transfer is never replayed; the untouched remainder can still be sent | integration B10-06 | PASS |
| B10-07 | A left-out item sent later is a new transfer, never a resend; confirmed-order history unchanged; batches immutable | integration B10-07 | PASS |
| B10-E1 | Browser: separate action, not-a-complete-order notice, focus, copy of the remaining list (clipboard), acknowledgement, announcement, focus returned | e2e B10-E1 | PASS |
| — | The whole-list Send is unchanged (disabled while any line is not ready) | e2e B10-E1, journey; existing T-tests | PASS |

**Continuous journey (`tests/e2e/journey-url-to-cart.spec.ts`, test server with the scripted Kroger fake, every external
browser request aborted and counted — zero).** Kroger connect (Kroger's sign-in answered by a local route) and store
TEST0001 → add `https://wprm.example.com/skillet-taco-rice/` from its link (method and photo kept under a test grant for
that site) → the member states rice as 7 oz (the page gives cups; Table never invents a density) and leaves water out →
recipe stored per serving: black beans 3.75 oz, garlic 0.5 each, long grain rice 1.75 oz, olive oil 0.5 tbsp, onion
0.25 each, salsa 0.0833 cup → Saturday's tacos replaced through a reviewed preview (accepted revision +1) → Kroger
products chosen (black beans: Kroger's "15.5 oz" doesn't say weight or fluid, so the member enters it; chicken thighs
sold by weight: not choosable) → Alex marks salsa as on hand (0 packages) → Jon approves five lines; whole-list Send stays
disabled → partial review: 5 items, chicken left out ("isn't sold by this store") → cart body exactly
`0004000000001 ×1, …002 ×1, …003 ×1, …004 ×1, …005 ×1` (fixture modality) → acknowledged → both members see "Transfer 1
(partial)" and "Left out of this transfer (9): Broccoli, Chicken thighs, Cucumber, Plain Greek yogurt, Pita bread, Jasmine
rice, Salmon fillet, Soy sauce, Firm tofu"; chicken still "To send: 2 package(s)"; accepted week unchanged.

**Defect found by the journey and fixed in `7c79eb6`:** after Kroger's sign-in the member landed on the login page. The
callback redirected to an absolute URL built from `req.url`, which carries the server's bind address (`localhost:3105`
here; `0.0.0.0` behind a host's proxy), where the session cookie isn't sent. It now answers with a same-origin relative
`Location`. B5's assertion only checked the path suffix (`/household?kroger=…$`) and now pins the exact Location.

**Phone upgrade rehearsal (worker, `evidence/2026-10-09-deploy-rehearsal/`, local production mode only).** Start Command
`npm run db:migrate && exec node_modules/.bin/next start -H 0.0.0.0` on a 011 database populated by the 011-era code
(`9623de4`): upgrade + serve, restart (`schema up to date`, fingerprint identical), sign-in and sessions kept, failing
migration blocks start and leaves nothing half-applied, old code keeps serving on the new schema (its health also says
200). **Defect found:** two concurrent starts — one exited 1 ("relation recipe_images already exists") in 10 of 20
trials. Repaired in `3378e01` with a transaction-level advisory lock: 20 of 20 both serve; `migrate-lock.test.ts` 4 of 5
red on the previous runner, 5 of 5 green; mutation MIG_no_per_migration_lock killed. Not tried on Render or Neon.

## Import overhaul and mobile redesign — added 2026-10-09

Starting `cb7b56e`; member photo backend `dfb34cc` (worker); overhaul `8e6bd6e`; verified at `8e6bd6e` — `docs/table/evidence/2026-10-09-verify-8e6bd6e/summary.md`: vitest 1078/1078, Playwright 143/143, 100 mutations killed, 0 survived, 0 error.
Before/after screens: `docs/table/evidence/2026-10-09-overhaul-screens/` (`compare/` has them side by side).

**Red first.** `evidence/2026-10-09-verify-8e6bd6e/dev/red-on-cb7b56e.log`: the new parser, quantity, seasoning and
IO tests against the previous code — the reported line failed (`"1/3 cup pesto (homemade (or store-bought))"` →
review, "fraction not exact as a decimal", whole line as the name), all five IO cases failed, the quantity and
seasoning modules did not exist. The "Have enough" rounding test fails on the previous projection (D117).

| ID | What | Tests | Status |
|---|---|---|---|
| IO-01 | The reported line → pesto, 1/3 cup, note "homemade (or store-bought)"; clean lines start as Use; only the range and the no-amount line wait; salt and pepper left out | integration IO-01; unit parser table (67 parsed, 22 review cases); e2e IO-E1 | PASS |
| IO-02 | Confirming gives per-serving amounts from the exact whole-recipe amount: exact when the division ends (1 1/2 cups ÷ 4 = 0.375), otherwise a 12-place approximation (1/3 cup ÷ 4 = 0.083333333333 — not exact; corrected wording 2026-10-09, D131), source link kept, no salt/pepper in the recipe | integration IO-02 | PASS |
| IO-03 | A typed fraction is accepted ("2 1/2"); nonsense is refused naming the line | integration IO-03 | PASS |
| IO-04 | No suggestion workflow stored or shown | integration IO-04; e2e IO-E1, U2C-E1 | PASS |
| IO-05 | Household-private mode keeps the method, not the photo; a per-site photo grant keeps it | integration IO-05; unit CP-02; integration R1-06 | PASS |
| — | Fractions, mixed numbers, Unicode fractions, ranges, packages, nested parentheses, alternatives, hostile input; never the whole line as the name | unit recipe-import-ingredient-line, -sweep, quantity | PASS |
| — | Seasonings: salt/black pepper variants omitted; bell/chili peppers, pepper sauce, flavoured salts, white pepper kept; recipes unchanged; explicit request still bought | unit seasonings | PASS |
| MP-01..09 | Member photo: sniffed type, permission text, size cap, other household, stale revision, removal falls back, idempotent retry, route rules, export/restore | integration member-photo (worker) | PASS |
| — | Browser: compact rows, source line in the editor, uncertain lines first, seasonings left out, save, illustrated fallback, own photo added (credited) and removed, no horizontal scroll | e2e IO-E1 | PASS |
| — | Every existing screen at 320 px with 150 % and 200 % text, dark and light | e2e B18 sweeps, ui-screens, screens-overhaul | PASS |

**Changed or removed assertions (transparent).** `tests/unit/recipe-import-ingredient-suggest.test.ts` was removed with
the suggestion workflow (owner direction); its inputs are kept in `recipe-import-ingredient-sweep.test.ts` under the new
contract. Rewritten with a dated comment: parser expectations ("1/2" was "0.5"; thirds were refused; cans/cloves were
review lines), CP-02 and R1-06 (household-private keeps no photo), U-02/U-04/U-11 and member-photo's helper (a per-site
photo grant instead of household-private), U-10 and RH-02 (defaults instead of suggestions), URL-08/URL-11 and the
browser URL-12/U2C-E1 (the chili and taco pages now read cleanly), ms-domain per-portion (12 decimal places) and
wording ("needs a quick check"), the journey's salsa amount (0.083333333333). Three mutations re-targeted
(`UI_light/dark_text_too_faint` for the new palette; `U2C_suggestion_applied_unreviewed` → `U2C_uncertain_line_used_unreviewed`).

**Defects found while testing:** the "Have enough" rounding (D117, journey); text inside the fallback illustration did
not follow the text size (B18 sweep — now ordinary text); a visually hidden file input took keyboard focus (B18 sweep —
now a visible button opens the picker).

## Import-overhaul corrections RIO-01..03 — added 2026-10-09

**The correction package did not arrive.** The owner's `Table-Import-Overhaul-Correction-12434c0.zip` (with its
`CLAUDE-NEXT-PROMPT.txt`) was not present in this session's uploads, the repository or any branch. RIO-01..03 below
are **reconstructed** from the three problems the owner named (package rounding, seasoning classification, pending
row edits); their wording and acceptance must be reconciled with the package when it is available.

_Reconciled 2026-10-09: the package arrived with the independent recheck of `8c9fd8c`. The reconstructed RIO-02 (a
bare "pepper" by the piece) was **not** the original RIO-02 (descriptors in parentheses); see "Original RIO
correction package" below for the finding-by-finding disposition. The rows here stay as the record of `bca110e`._

Starting `12434c0`; corrections `bca110e`; verified at `bca110e` — `docs/table/evidence/2026-10-09-verify-bca110e/summary.md`: vitest 1091/1091, Playwright 145/145, mutation self-test PASS, 102 killed / 0 survived / 0 error.
Red on `12434c0` in the real harness: `evidence/2026-10-09-verify-bca110e/dev/` (integration RIO-01/02 against PostgreSQL
commands; browser RIO-03a/b against the production build; after RIO-03a the database held the old ⅓ cup although ½ cup
had been typed).

| ID | What | Tests | Status |
|---|---|---|---|
| RIO-01 | Package rounding: 2 cucumbers for 3 servings, planned as 3 plates, bought 4 cucumbers for the week instead of 3 (12-dp half-up per serving summed to 2.000000000001). Per-serving amounts now round toward zero; package counting itself is unchanged (24.000000001 oz is still two 24 oz packages) | integration RIO-01; unit quantity; mutation RIO01_per_serving_rounded_half_up | PASS |
| RIO-02 | Seasoning classification: "1 pepper, diced" was left out of the import and a "pepper" bought by the piece vanished from groceries. A bare "pepper" is a seasoning only by the spoon/volume or with no amount; counted or weighed it is an ingredient; named table pepper and salt unchanged | integration RIO-02; unit seasonings (pepper by unit); mutation RIO02_bare_pepper_always_seasoning | PASS |
| RIO-03 | Pending row edits: a typed but unapplied change in an open review row was dropped by Save. Saving and Save-for-later are held, the row is named, reopened and focused; Cancel restores it; applying then saving keeps the new amount | e2e RIO-03a, RIO-03b | PASS |
| — | The pesto import and the redesigned screens are unchanged | e2e IO-E1, screens-overhaul, ui-screens, B18 sweeps; integration IO-01..05 | PASS |

**Changed assertions (transparent):** `tests/unit/quantity.test.ts` per-serving `2/3` is now `0.666666666666` (was
`…667`, half-up). A first attempt also tolerated a billionth of a package in `packagesFor`; it broke the normative
`24.000000001 oz → 2 packages` test and was withdrawn, not the test.

**Not fixed (pre-existing, recorded):** recipes saved before `8e6bd6e` carry per-serving amounts rounded half-up to 4
places (e.g. 0.6667 for ⅔); such a recipe planned as exactly its servings can still round a package up. Correcting it
needs a reviewed data change, which is not authorized.

**Recipe Extraction Lab (separate workstream, branch `claude/quirky-gauss-depmd8`).** Kept isolated: no lab code,
contract, corpus, benchmark or plan was changed, and **nothing was pushed to the lab branch**. Its deliberate guard on
Table's live `ingredient-line.ts` (`tests/parity/provenance.test.ts`) is the only lab test that fails once `main` is
merged. A reconciliation (merge of `bca110e` plus one commit recording `bca110e`'s file hash `4eba6151…` as the accepted
later version, the `8e6bd6e` hash kept in the note, and §4 appended to
`docs/table/recipe-extraction/PHASE-3-DEPENDENCIES.md`) was prepared; while it was prepared the lab session pushed
seven commits ending in its holdout-v2 freeze (`dee4ed0` → `46a6547`), so it was not pushed onto that work. Rebuilt on
`46a6547`, the lab suite reads 1 failed (the guard) before the reconciliation commit and 1006 passed, 1 expected fail,
11 skipped after it; `46a6547` alone passes. The commit is kept as
`evidence/2026-10-09-verify-bca110e/lab-reconciliation/` for the lab session or the owner to apply; it touches only
`src/legacy/PROVENANCE.json` and that document, not the frozen holdout-v2 labels. These app corrections do not complete or replace the extraction engine; its Phase 3 is unauthorized.

## Original RIO correction package — finding-by-finding (recheck of `8c9fd8c`) — added 2026-10-09

The package (`ORIGINAL-CORRECTION-PACKAGE.zip`, inside `Table-RIO-Delivery-Recheck-8c9fd8c`) arrived after `bca110e`.
Starting `8c9fd8c` (code `bca110e`); corrections `9f7836f` (RIO-02), `a9fd9de` (RIO-01 tests only), `43cd1ce` (RIO-03);
verified at `43cd1ce` — `docs/table/evidence/2026-10-09-verify-43cd1ce/summary.md`: vitest 1142/1142, Playwright 150/150, mutation self-test PASS, 104 killed / 0 survived / 0 error.
Red evidence: `evidence/2026-10-09-verify-43cd1ce/dev/` — the exact original RIO-02 cases on unchanged `bca110e` source
(19 failing assertions: parser, classifier, import draft, saved-recipe projection), and the RIO-03 focus defect on the
unchanged review screen.

| Original finding | Original requirement | Disposition | Tests | Status |
|---|---|---|---|---|
| RIO-02 | `1 tsp salt (smoked)`, `1 tsp pepper (white)`, `1 tsp salt (garlic)` were omitted; descriptors must survive classification; ordinary salt/black pepper still omitted; bell/chili peppers, specialty seasonings and explicit requests kept | **Fixed.** The classifier now reads the name's parentheses, its comma tail and the line's descriptors; only words describing ordinary salt or black pepper, an amount or a purpose are ignored, and any other word keeps the ingredient (D130). The import folds the descriptor into the name ("smoked salt", so it shares the adjective-first identity). Saved recipes whose ingredient name carries the descriptor ("salt (smoked)") are bought. The pepper-by-the-piece rule (D119) is kept. | unit seasonings + ingredient-line (original cases, nested, comma tail, ordinary phrasings); integration RIO-02a (import → draft → recipe → groceries), RIO-02b (recipe saved earlier), RIO-02c (explicit request); mutations RIO02_descriptors_discarded, RIO02_classifier_ignores_descriptors | PASS |
| RIO-01 | Keep exact source quantities/divisors far enough to avoid buying an extra package; no broad epsilon; test both rounding directions, combined meals, genuine overages, approvals/partial handoffs, provenance; label approximations honestly | **Partly delivered, precisely bounded.** Storage stays a 12-place approximation rounded toward zero (`bca110e`); `packagesFor` is unchanged and no epsilon was added. Proven: a count is never above the exact source count for recipes saved since `bca110e` (D131). Measured: over 295,472 cases (single recipes; 200,000 pairs of recipes sharing an ingredient; count/volume/mass with conversions; 7,571 exactly on a package boundary) the count equals the exact count in every case. Not proven: exactness — a count could be one low only if the exact week demand passes a boundary by less than 10⁻¹² of the unit per plate. Exact provenance needs an additive schema change; proposed, not built (D131). | unit rio01-boundaries (matrix + control that catches half-up), quantity; integration RIO-01, RIO-01b (exact boundary through approval, partial transfer and retailer request), RIO-01c (genuine overage), RIO-01d (below the boundary); mutation RIO01_per_serving_rounded_half_up | PASS for the stated guarantees |
| RIO-01 legacy | Old 4-place recipes have the same mechanism | **Not changed** (needs authorized data change). Measured on the same matrix: 4-place half-up storage over-counts 1,242 and under-counts 115 of 295,472 cases (e.g. 3 lb for 9 servings plus a ⅔ g line: 3 packages instead of 4). | evidence `rio01-measurement.json` | OPEN — owner gate |
| RIO-03 | Save and Save-for-later must not ignore visible row edits; test keystrokes, saved amounts, multiple rows, name/unit, invalid entries, closing/reopening, other-member conflicts, focus | **Kept, completed.** `bca110e`'s guard held in every new case. One defect found and fixed: after Use, Leave out or Cancel focus fell to the page (and a row that moved group lost it); it now returns to that row (D132). | e2e RIO-03a–g (two dirty rows with name/unit/amount; invalid pending amount; Save-for-later + reload + reopen; regrouping; the other member saving meanwhile; focus), each asserting database rows | PASS |
| — | Keep the pesto import, compact review, member photos, source rights, pepper-by-piece fix, conversions and immutable history | Unchanged; no visual redesign | e2e IO-E1, screens-overhaul, ui-screens, journeys; integration IO-01..05; full suites | PASS |

**Known limitations (not fixed, recorded):** (1) recipes saved before `8e6bd6e` keep 4-place per-serving amounts (above);
(2) a recipe saved before this fix where a member pressed "Use" on an omitted `salt (smoked)` line stored the name
`salt` and is still treated as table salt — the descriptor survives only in that line's `From:` note; changing such
records needs the same authorized data change; (3) an import confirmed before this fix that left `salt (smoked)` out
lists it in the recipe summary ("Not counted in groceries: …") but has no ingredient row for it.

**Recipe Extraction Lab (separate workstream).** Not touched by this pass. Its owner has already applied the earlier
reconciliation (`034f2c3` on `claude/quirky-gauss-depmd8`, recording `bca110e`); the patch kept in
`evidence/2026-10-09-verify-bca110e/lab-reconciliation/` is historical and must not be applied again. This pass changes
Table's live `ingredient-line.ts` once more; the read-only notice for the lab owner is
`docs/table/LAB-SOURCE-DELTA-2026-10-09.md`. Nothing here adopts the extraction engine or completes its Phase 3.

## Exact quantities for new recipe versions (EQ) — added 2026-10-10

Owner authorization 2026-10-10 (bounded). Starting `5e19991`; code `dbc105d`; verified at `dbc105d` — `docs/table/evidence/2026-10-10-verify-dbc105d/summary.md`: vitest 1164/1164, Playwright 151/151, mutation self-test PASS, 112 killed / 0 survived / 0 error.
Red on `5e19991` (`evidence/2026-10-10-verify-dbc105d/dev/eq-red-on-5e19991.log`; taken with the new, not yet used
`src/domain/exact.ts` present): all ten EQ integration tests failed — no exact columns, no exact fractions on grocery
lines, and EQ-03's genuine overage was counted short.

| ID | What | Tests | Status |
|---|---|---|---|
| EQ-01 | An imported row keeps its exact whole-recipe amount and serving basis next to the stored decimal (`2` for 3; `3/2` for 3; `1/3` for 3) | integration EQ-01; mutation EQ_import_drops_exact | PASS |
| EQ-02 | 2 cucumbers for 3 servings with all 3 planned need **exactly 2**, alongside the legacy salmon bowls' cucumbers (old and new recipes together) | integration EQ-02; unit exact; mutation EQ_purchase_uses_stored_decimal | PASS |
| EQ-03 | A genuine amount above a package boundary (2 + 2×10⁻¹² cucumbers) needs another package — no tolerance; the stored-decimal path counted it short | integration EQ-03; mutation EQ_package_tolerance | PASS |
| EQ-04 | A legacy row (0.6667 per serving) is used exactly as stored and labelled approximate; it is not repaired | integration EQ-04 | PASS |
| EQ-05/05b | A title-only edit keeps legacy rows legacy; a changed amount is the member's exact amount; an unchanged number keeps its basis when the name or unit changes; the accepted dinner keeps its version | integration EQ-05, EQ-05b; e2e EQ-E1 (real editor); mutation EQ_title_edit_relabels_legacy | PASS |
| EQ-06 | A client cannot declare a row exact | integration EQ-06; mutation EQ_client_claims_exact | PASS |
| EQ-07/07b | Unit conversion stays exact: a cup recipe and legacy tablespoon recipes combine in ml to the exact sum on a package boundary; ⅔ of a cup recipe for 2 of 3 servings stays a fraction | integration EQ-07, EQ-07b; mutation EQ_conversion_through_decimal | PASS |
| EQ-08 | What is at home is subtracted exactly | integration EQ-08 | PASS |
| EQ-09 | An exact boundary line and a legacy line approve and go in one partial transfer with the counts shown | integration EQ-09 (and RIO-01b) | PASS |
| EQ-10 | The database refuses incoherent rows (exact without basis, a decimal that does not match, a legacy row claiming one, an unreduced fraction) | integration EQ-10 | PASS |
| LA-01..03 | Read-only legacy audit on disposable data: recoverable (import draft, earlier version) vs pattern-only, source line without servings, missing; seasoning findings; never writes; refuses a remote host | integration LA-01..03; mutations LA_audit_not_read_only, LA_pattern_counted_as_evidence | PASS |
| Upgrade | Rehearsal from `43cd1ce` on a throwaway PostgreSQL cluster: populated by `43cd1ce`'s own code (imports, a manual recipe, a planned week, home supply, approvals, a partial transfer); migration 015 left every pre-existing column of every table unchanged; all 29 existing recipe rows read legacy; both releases project the upgraded week identically to before (amounts, packages, to send, fingerprints, approval validity); after this release saved an exact recipe `43cd1ce` still recomputed every week; this release's export round-trips; `43cd1ce`'s pre-upgrade export restores as legacy rows; `43cd1ce`'s whole vitest suite (1142) passes on the new schema | `scripts/rehearse-upgrade.sh 43cd1ce --old-suite` → `evidence/2026-10-10-verify-dbc105d/rehearsal/` | PASS |

**Changed or re-targeted checks (transparent):** mutation `HE_enough_compared_unrounded` re-anchored to the exact
type (same injected defect); `RIO01_per_serving_rounded_half_up` now runs against the per-serving unit test, because
through the real commands migration 015 refuses a stored decimal above the exact value (a database error, rightly
ERROR, not KILLED). No assertion was weakened.

**Limitations before deployment:**
1. **Legacy rows stay approximations.** Recipes saved before this release keep their decimals (12 places from
   `8e6bd6e`/`bca110e`, 4 places before `8e6bd6e`) and are counted as stored. Correcting any of them needs a
   separate authorization and would create a new recipe version (D135).
2. **Exactness lives in this release.** If the pilot is rolled back to an earlier commit after new recipes were
   saved, that code ignores the exact columns and counts their stored decimals again (12 places, toward zero) —
   it still runs correctly (rehearsed), it is just not exact.
3. **An export made after exact recipes exist restores only into this release or later**; the earlier schema
   refuses it whole (rehearsed — nothing half-restored). Exports from before the upgrade restore here as legacy rows.
4. **The audit has not been run on household data.** It was tested on disposable data only and is not connected to
   Neon. Running it on the household means either a local restore of a household export, or `--remote-read-only`
   — an owner decision.
5. No visual change: the recipe screens still show the stored decimal as a kitchen fraction; the exact fraction is
   in the data and on grocery lines (`meal.rational`, `meal.exact`), not newly displayed.
6. Manual entry in the recipe editor still takes decimals (B30): a member who types `0.3333` states exactly 0.3333.

## Exact-quantity correction EQR-01/EQR-02 (review of `dbc105d`) — added 2026-10-10

Review package `Table-Exact-Quantities-Correction-dbc105d` (REVIEW.md, probes as source-level characterization).
Starting `5aeecc4` (code `dbc105d`); correction `7332b06`, rehearsal data `72cf615` (approvals left open across the upgrade); verified at `72cf615` — `docs/table/evidence/2026-10-10-verify-72cf615/summary.md`: vitest 1177/1177, Playwright 153/153 (Chromium), mutation self-test PASS, 121 mutations killed / 0 survived / 0 error.
Upgrade rehearsals on the committed `72cf615`, each with the previous release's own test suite: from `43cd1ce` PASS, from
`dbc105d` PASS (`evidence/2026-10-10-verify-72cf615/rehearsal-*/`). The rehearsal data holds a recipe listing cucumber
twice (an imported 2-for-3 and a typed 0.666666666666), a title-only edit of it, a "some" and a "Have enough"
observation, a partial transfer, and two approvals left open (soy sauce, black beans). Migration 015 is unchanged; the correction is migration 016.

Red evidence on the reviewed code (`evidence/2026-10-10-verify-72cf615/dev/`): the integration suite on `5aeecc4`
failed 9 of 12 on the defects (EQR-01d, 02c, 02f are guards that already held); the two browser tests on a
`5aeecc4` build failed on the defects (the changed cucumber took the onion's legacy label; "Nothing to buy" for
3.0004 after "Have enough" for 3); LA-04 failed on the audit's first-match recovery. A first run of the integration
suite with PostgreSQL stopped is kept as `INVALID-eqr-red-db-down.log` — a setup failure, not a result.

| Finding | Disposition | Tests | Status |
|---|---|---|---|
| EQR-01A changed amount took another row's legacy label | Basis follows verified lineage (D136): the changed cucumber is exact `1/2`, the untouched onion stays legacy | integration EQR-01a; e2e EQR-E1 | FIXED |
| EQR-01B new row took another row's 2-for-3 | A new row is exact as typed: `333333333333/500000000000` | integration EQR-01b | FIXED |
| EQR-01C repeated occurrences collapsed through a title-only save | Each occurrence keeps its own basis through a title-only save and a reorder; 3 plates + 0.000000000001 × 2 plates → exactly 4 + 1 = 5 packages (collapsed: 6) | integration EQR-01c | FIXED |
| EQR-01 renames/unit changes, invalid lineage | Rename/re-measure with lineage keeps the row's basis; missing, foreign, duplicated, unknown, other-household or malformed lineage refused, nothing saved | integration EQR-01d/e; mutations | FIXED |
| EQR-01 audit first-match / look-alike inheritance | Ambiguous sources reported as conflicting; verified lineage followed | integration LA-04; mutations LA_first_fitting_line, LA_inherit_more_rows_than_source | FIXED |
| EQR-02A old "Have enough" stretched to a larger exact requirement | Exact certification (D137): confirmed 3, now 3.0004 shown as 3 → unresolved, 0.0004 still needed, 1 package | integration EQR-02a; e2e EQR-E2 | FIXED |
| EQR-02 race, both orders | Observation first: bound to the reviewed exact requirement; change first: bound to exactly the shown decimal, never upgraded; 1 package either way | integration EQR-02b (the reviewed change is prepared first so the race is one command against one command) | FIXED |
| EQR-02 unchanged repeating requirement | ⅔-type requirement confirmed stays confirmed after an unrelated recompute | integration EQR-02c; unit seasonings "Have enough" (legacy rule) | HELD |
| EQR-02B review identity omitted the exact requirement | Exact requirement and basis in the identity (D138): sub-6th-decimal change → approval stale, the send refused, zero retailer calls; basis-only change → new identity; ½ cup vs 8 tbsp → same identity, approval valid | integration EQR-02d/e/f; mutation EQR_identity_without_exact | FIXED |
| Deployment wording | Checklist and step 5 now name migrations 015 and 016; rollback warning rewritten; existing settings left as they are | `docs/table/DEPLOYMENT.md` §0 | DONE |
| Audit check on disposable data | First-match recovery and the look-alike (`known`) map both produced a recoverable amount where the source was ambiguous; now conflicting | integration LA-04 (disposable `table_test` data only) | FIXED |
| Rehearsal with duplicate rows, a title-only edit, observations and approvals | Upgrade, export/restore and previous-release checks re-run from `43cd1ce` and `dbc105d` | `scripts/rehearse-upgrade.sh <prev> --old-suite` | PASS |
| Extraction Lab | Read-only interface notice; identifier allocation unchanged; lab branch not written | `docs/table/LAB-QUANTITY-INTERFACE-EQR-2026-10-10.md` | DONE |

**New tests (inventory):** `tests/integration/eqr-corrections.test.ts` — 12 (EQR-01a–e, EQR-02a, 02b × 2 orders,
02c–f; expected values are literal fractions worked out by hand — `Q` only sums a fixture precondition, itself
checked against a literal); `tests/integration/legacy-audit.test.ts`
— LA-04; `tests/e2e/eqr-two-members.spec.ts` — 2 (EQR-E1, EQR-E2: two signed-in members, production server);
`tests/mutation/run.mjs` — 9 new mutations (EQR_basis_by_equal_number, EQR_lineage_not_verified,
EQR_lineage_reused, EQR_missing_lineage_guessed, EQR_enough_compared_to_display, EQR_stale_enough_takes_current,
EQR_identity_without_exact, LA_first_fitting_line, LA_inherit_more_rows_than_source) and 3 re-anchored; rehearsal
data and checks (`scripts/rehearsal/{populate,snapshot,compare}.mts`, `scripts/rehearse-upgrade.sh`).

**Tests that changed (transparent):** edits through `SaveRecipeVersion` now state lineage, so the existing edit
tests pass `sourceRowId` (null where the rows are restated, the stored row where inheritance is the point —
EQ-05/05b); RB17-02's scripted duplicate row is a new occurrence (null). Mutations `F06_enough_uses_current_demand`,
`HE_enough_compared_unrounded` and `EQ_title_edit_relabels_legacy` were re-anchored to the rewritten lines with the
same injected defect. A first version of `EQR_lineage_reused` was an equivalent mutant (the count check still caught
it) and `EQR_stale_enough_takes_current` first SURVIVED because the race raced a two-command plan change; both
were corrected (mutation and test) and are KILLED. No assertion was weakened.

**Limitations:**
1. Observations recorded before migration 016 keep the 3-decimal rule; a requirement that grows below the shown
   precision after such an observation is still covered by it until a member reviews it again.
2. A screen open from before this release cannot save a recipe edit (`lineage_required`): reload and edit again.
3. If `dbc105d` was ever deployed and members edited recipes there, those versions keep the bases `dbc105d` gave
   them (number matching); nothing is rewritten. The audit does not report exact-basis rows; finding such versions
   would be a separate, authorized check (B43).
4. Rolling the code back after this upgrade keeps the data but not the behaviour: earlier code counts stored
   decimals, ignores the certified exact amounts and records no lineage (an edit made there saves legacy-only rows
   of a new version). A passing old test suite or a 200 from `/api/health` is not equality of exact behaviour.
5. Upgrading from `dbc105d`: lines with exact rows get a new review identity once; approvals on them become stale
   and must be given again. Rehearsed: amounts, packages and to-send unchanged on every line; the open soy-sauce
   approval (exact rows) became stale and stays stale under `dbc105d` after going back; the open black-beans approval
   (all legacy) stayed valid. From `43cd1ce` no identity changed.
