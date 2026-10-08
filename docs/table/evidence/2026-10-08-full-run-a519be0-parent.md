# Full verification run
- Date (UTC): 2026-10-08T00:15:04Z
- Code: 76dd8f4683894e72f03550ebb8adb1c045dc834f (+ uncommitted changes)
- Runtime: node v22.22.0; postgres (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1); Next 16.3.8; Playwright 1.56.1 (Chromium headless); vitest 5.0.3
- Not covered by this run: Safari/WebKit, physical mobile devices, live Kroger, production hosting.

## Typecheck
```
$ npx tsc --noEmit -p .
exit 0
```
## Unit + integration (vitest, real PostgreSQL)
```
$ npx vitest run --reporter=verbose
 ✓ tests/integration/plan.contract.test.ts > T01 preview Friday while the other member reviews groceries; cancel > leaves accepted week, portions and active requirements unchanged with no household edit or external call 837ms
 ✓ tests/integration/plan.contract.test.ts > T02 either member adopts the displayed week > creates one shared accepted plan and no order, cooking or consumption record 691ms
 ✓ tests/integration/plan.contract.test.ts > T03 Sounds good and preference changes > persist without changing accepted assignments, portions or requirements 651ms
 ✓ tests/integration/plan.contract.test.ts > T04 previews affecting leftovers or a locked night > shows consequences before Apply, cancellation changes nothing, protected dinners are not moved 673ms
 ✓ tests/integration/plan.contract.test.ts > T07 record less left than planned > makes the dependent night unresolved, keeps the selected dinner, proposes but does not apply recovery 661ms
 ✓ tests/integration/plan.contract.test.ts > T08 (server boundary) other member changes Friday while a Friday preview is open > reports the current Friday and stale draft from the snapshot before Apply; the old draft cannot apply 686ms
 ✓ tests/integration/plan.contract.test.ts > T10 concurrent independent Friday and Sunday replacements — Jon (Sunday) first > both survive, neither restores other nights, groceries are recalculated 820ms
 ✓ tests/integration/plan.contract.test.ts > T10 concurrent independent Friday and Sunday replacements — Alex (Friday) first > both survive, neither restores other nights, groceries are recalculated 850ms
 ✓ tests/integration/plan.contract.test.ts > T11 concurrent replacements of the same target — Jon first > one commits; the other makes no accepted write and keeps its draft 671ms
 ✓ tests/integration/plan.contract.test.ts > T11 concurrent replacements of the same target — Alex first > one commits; the other makes no accepted write and keeps its draft 703ms
 ✓ tests/integration/plan.contract.test.ts > T12 adopt a whole proposal after a newer accepted change — adoption first > never restores an obsolete seven-day snapshot 662ms
 ✓ tests/integration/plan.contract.test.ts > T12 adopt a whole proposal after a newer accepted change — Friday change first > never restores an obsolete seven-day snapshot 672ms
 ✓ tests/integration/plan.contract.test.ts > T15 (plan commands) duplicate click or retry > returns the same recorded result with no duplicate edit; reused id with different payload is refused 712ms
 ✓ tests/integration/plan.contract.test.ts > T21 edit a recipe in the library after adopting it > keeps the accepted assignment on its pinned recipe version 736ms
 ✓ tests/integration/plan.contract.test.ts > T22 two night edits interacting through a real dependency > leftover source: conflict in either order (Wednesday first) 777ms
 ✓ tests/integration/plan.contract.test.ts > T22 two night edits interacting through a real dependency > leftover source: conflict in either order (Thursday first) 679ms
 ✓ tests/integration/plan.contract.test.ts > T22 two night edits interacting through a real dependency > destination lock: a move onto a night that was locked meanwhile is stopped, never overwritten 655ms
 ✓ tests/integration/plan.contract.test.ts > T22 two night edits interacting through a real dependency > firm constraint: each change fits a firm budget alone, the combination does not, and is not silently relaxed 757ms
 ✓ tests/integration/plan.contract.test.ts > X01 (commands) household isolation > another household cannot read or write plans, drafts or purchases by id substitution, with no side effects 695ms
 ✓ tests/integration/plan.contract.test.ts > X03 (command identity) > same id + same payload returns the original; same id + different payload is rejected with no write 555ms
 ✓ tests/integration/plan.contract.test.ts > Negative control: a stale target is rejected > a lock request bound to an old revision makes no write 573ms
 ✓ tests/integration/groceries.contract.test.ts > Fixture arithmetic (explicit expected grocery lines) > computes the specified quantities and packages 691ms
 ✓ tests/integration/groceries.contract.test.ts > T05 dinners covered, product/price unresolved > shows meals chosen without asserting grocery readiness or budget compliance 659ms
 ✓ tests/integration/groceries.contract.test.ts > T13 accepted meal change while the other member's grocery review is open > shows the delta, keeps unaffected approvals, and stale Send makes zero outbound calls 1207ms
 ✓ tests/integration/groceries.contract.test.ts > T14 replacement after order confirmation > changes current requirements but never the confirmed order; new chicken is not sent; stale Send makes zero calls 1134ms
 ✓ tests/integration/groceries.contract.test.ts > T15 (handoff) duplicate click or retry > one batch and one outbound call for one operation id 660ms
 ✓ tests/integration/groceries.contract.test.ts > X03 purchase deduplication across different operation ids > concurrent sends of the same review produce one transfer (first wins) 692ms
 ✓ tests/integration/groceries.contract.test.ts > X03 purchase deduplication across different operation ids > concurrent sends of the same review produce one transfer (second wins) 674ms
 ✓ tests/integration/groceries.contract.test.ts > T16 / X05 external transfer times out after possible acceptance > is uncertain and never replayed automatically; granularity stays batch-level 1030ms
 ✓ tests/integration/groceries.contract.test.ts > T16 / X05 external transfer times out after possible acceptance > a process stop after dispatch-started becomes uncertain on recovery, with no replay 720ms
 ✓ tests/integration/groceries.contract.test.ts > T17 / X04 plan change after a valid batch has started sending > keeps the exact started payload; revised needs are a separate delta; nothing is reversed 776ms
 ✓ tests/integration/groceries.contract.test.ts > T17 / X04 plan change after a valid batch has started sending > superseded queued work is canceled before dispatch-started (other race order) 768ms
 ✓ tests/integration/groceries.contract.test.ts > T18 repeated staple taps, overlapping recipe need, explicit extra > dedupes the usual request with names, keeps reasons, keeps the extra 724ms
 ✓ tests/integration/groceries.contract.test.ts > T19 'Have some' without a quantity, or reviewed demand increases > never invents a pantry subtraction and reopens review visibly 586ms
 ✓ tests/integration/groceries.contract.test.ts > T20 confirm an order, then receive one item and report another missing > confirmation does not imply receipt; received resolves; missing stays actionable 1162ms
 ✓ tests/integration/groceries.contract.test.ts > X09 capture after confirmation > identifies a staple already in the confirmed order before creating a duplicate; Add another is an explicit extra 695ms
 ✓ tests/integration/household.more.test.ts > Backup and deferred dinners > keeps the original as a deferred dinner, never stacked, and it can be placed deliberately later 873ms
 ✓ tests/integration/household.more.test.ts > Proposal controls > Fewer sessions and Different dinners revise open nights only and explain the actual change 691ms
 ✓ tests/integration/household.more.test.ts > X08 new exclusion flags, never replaces > flags Friday's salmon after a fish exclusion and leaves the accepted dinner in place 730ms
 ✓ tests/integration/household.more.test.ts > Separate per-person targets and portions > each member sets their own daily and dinner targets; plates show nutrition against the dinner target only 733ms
 ✓ tests/integration/household.more.test.ts > Separate per-person targets and portions > settings are saved inputs with revision checks; nothing starts set 652ms
 ✓ tests/integration/x12.environment.test.ts > X12 test helpers are blocked outside the test environment > refuses a fixed clock, fixture seeding and test barriers in production 5ms
 ✓ tests/integration/x12.environment.test.ts > X12 incomplete real retailer configuration never reports mock success as live > Kroger mode without configuration (or without verified authorization) refuses handoff with zero calls 798ms
 ✓ tests/integration/x12.environment.test.ts > X12 export omits secrets and round-trips into an isolated database > exports household data without credentials and restores it faithfully 906ms
 ✓ tests/unit/domain.test.ts > X06 portion, unit and nutrition arithmetic > component-only changes affect only that component's ingredients 4ms
 ✓ tests/unit/domain.test.ts > X06 portion, unit and nutrition arithmetic > a leftover batch is counted once: plates on later nights draw from the same cooking 1ms
 ✓ tests/unit/domain.test.ts > X06 portion, unit and nutrition arithmetic > rounds packages up exactly and never with binary floating point 1ms
 ✓ tests/unit/domain.test.ts > X06 portion, unit and nutrition arithmetic > mass ounces are not fluid ounces; custom units only match themselves 1ms
 ✓ tests/unit/domain.test.ts > X06 portion, unit and nutrition arithmetic > missing nutrition or conversion stays unknown, never zero 1ms
 ✓ tests/unit/domain.test.ts > X07 cost scopes and unknowns > keeps dinner ingredient cost, pickup spending and unknown prices distinct 13ms
 ✓ tests/unit/domain.test.ts > X07 cost scopes and unknowns > a firm budget cannot be proven by unknown prices, and a known excess is 'over' 3ms
 ✓ tests/unit/domain.test.ts > X07 cost scopes and unknowns > usual replenishment is a minimum, shared with recipe demand; explicit extras add 1ms
 ✓ tests/unit/domain.test.ts > X08 dates, DST, locks, exclusions > uses household-local dates across local midnight and daylight-saving transitions 11ms
 ✓ tests/unit/domain.test.ts > X08 dates, DST, locks, exclusions > a new exclusion flags the current dinner without replacing it 1ms
 ✓ tests/unit/domain.test.ts > X08 dates, DST, locks, exclusions > unknown ingredient information cannot pass a hard-exclusion check for a new choice 2ms
 ✓ tests/unit/domain.test.ts > X08 dates, DST, locks, exclusions > locks are never overwritten; leftovers never precede their cooking 1ms
 ✓ tests/unit/domain.test.ts > X08 dates, DST, locks, exclusions > closure staleness is per target: an unrelated night's revision does not stale a preview 0ms
 ✓ tests/unit/domain.test.ts > Proposal engine (deterministic, explainable) > is deterministic and applies hard eligibility before preference 2ms
 ✓ tests/unit/domain.test.ts > Proposal engine (deterministic, explainable) > keeps locked nights unchanged 1ms
 Test Files  5 passed (5)
      Tests  59 passed (59)
exit 0
```
## Production build
```
$ npx next build
✓ Compiled successfully in 291ms
exit 0
```
## Browser suite (Playwright, two authenticated contexts, production server)
```
$ npx playwright test
  ✓   1 [chromium] › tests/e2e/first-slice.spec.ts:11:1 › T01: Jon previews Friday while Alex reviews groceries, then cancels — nothing accepted changes (3.6s)
  ✓   2 [chromium] › tests/e2e/first-slice.spec.ts:38:1 › T08: Alex changes Friday while Jon's Friday preview is open — Jon sees it without pressing Apply (3.4s)
  ✓   3 [chromium] › tests/e2e/first-slice.spec.ts:73:1 › T09: same as T08 while Jon's app is backgrounded; the newer decision and stale draft appear on return (2.9s)
  ✓   4 [chromium] › tests/e2e/first-slice.spec.ts:109:3 › T10: concurrent independent Friday and Sunday replacements — Jon (Sunday) commits first (3.6s)
  ✓   5 [chromium] › tests/e2e/first-slice.spec.ts:109:3 › T10: concurrent independent Friday and Sunday replacements — Alex (Friday) commits first (3.5s)
  ✓   6 [chromium] › tests/e2e/first-slice.spec.ts:141:3 › T11: concurrent replacements of Friday — Jon first (2.7s)
  ✓   7 [chromium] › tests/e2e/first-slice.spec.ts:141:3 › T11: concurrent replacements of Friday — Alex first (3.0s)
  ✓   8 [chromium] › tests/e2e/first-slice.spec.ts:169:1 › T12: adopting an old whole-week proposal after a newer accepted change stops and shows the current week (3.2s)
  ✓   9 [chromium] › tests/e2e/first-slice.spec.ts:199:1 › Reload preserves accepted state, previews and stale status (persistence, not browser memory) (3.5s)
  ✓  10 [chromium] › tests/e2e/first-slice.spec.ts:218:3 › T22: Wednesday and Thursday edits interact through the leftover source — Wednesday first (3.1s)
  ✓  11 [chromium] › tests/e2e/first-slice.spec.ts:218:3 › T22: Wednesday and Thursday edits interact through the leftover source — Thursday first (2.8s)
  ✓  12 [chromium] › tests/e2e/first-slice.spec.ts:243:1 › T15: a double-clicked Apply records one change (2.2s)
  ✓  13 [chromium] › tests/e2e/journey.spec.ts:10:1 › T02: Jon proposes, Alex adopts the displayed week; one accepted plan, no order/cooking/eating records (4.0s)
  ✓  14 [chromium] › tests/e2e/journey.spec.ts:34:1 › T03: Sounds good, preferences, favorites and notes persist without changing the accepted week (3.3s)
  ✓  15 [chromium] › tests/e2e/journey.spec.ts:62:1 › T04: a Wednesday preview shows Thursday's leftover consequence; a locked Thursday blocks it; cancel changes nothing (2.3s)
  ✓  16 [chromium] › tests/e2e/journey.spec.ts:81:1 › T05: dinners covered while a price is unknown — meals chosen, groceries and budget not asserted (1.5s)
  ✓  17 [chromium] › tests/e2e/journey.spec.ts:94:1 › T06: after adoption Home shows the next dinner and real work; Cook and Reheat open the right instructions; Also need is reachable (2.4s)
  ✓  18 [chromium] › tests/e2e/journey.spec.ts:126:1 › T07: less left than planned makes Thursday unresolved without replacing it (2.8s)
  ✓  19 [chromium] › tests/e2e/journey.spec.ts:142:1 › T13: Jon's Friday change reaches Alex's open grocery review as a delta; unaffected approvals stay; stale Send makes zero calls (3.7s)
  ✓  20 [chromium] › tests/e2e/journey.spec.ts:169:1 › T14/T20: simulated send, order confirmed with different contents, then a Friday change and receipt exceptions (4.4s)
  ✓  21 [chromium] › tests/e2e/journey.spec.ts:204:1 › T16: an uncertain transfer is shown as uncertain with a cart check, and is not resent (2.3s)
  ✓  22 [chromium] › tests/e2e/journey.spec.ts:219:1 › T18: repeated staple taps from Week, Groceries and Cook merge with names; an explicit extra stays extra (3.1s)
  ✓  23 [chromium] › tests/e2e/journey.spec.ts:243:1 › T21: editing a recipe in the library keeps the accepted dinner on its pinned version (1.8s)
  ✓  24 [chromium] › tests/e2e/x-checks.spec.ts:10:1 › X01: unauthenticated and other-household sessions cannot read or write this household (2.1s)
  ✓  25 [chromium] › tests/e2e/x-checks.spec.ts:47:1 › X10: discovery — focus-stable search, real sorts with an unknown group, opening the selected recipe, persisted notes (2.2s)
  ✓  26 [chromium] › tests/e2e/x-checks.spec.ts:75:1 › X11: narrow mobile layout, keyboard operation, text scaling, distinct identities (6.0s)
  ✓  27 [chromium] › tests/e2e/x-checks.spec.ts:142:3 › process restart › X02: server restart, missed events and a delayed older response cannot roll back accepted state (12.8s)
  ✓  28 [chromium] › tests/e2e/x-checks.spec.ts:177:3 › process restart › X05: the server dies after dispatch started; on restart the transfer is uncertain and never replayed (5.8s)
  28 passed (1.7m)
exit 0
```
## Mutation checks
```
$ tests/mutation/run.sh
mutation killed: blanket_week_conflict —  Tests 2 failed | 19 skipped (21)
mutation killed: last_write_wins —  Tests 5 failed | 2 passed | 14 skipped (21)
mutation killed: stale_adoption —  Tests 1 failed | 1 passed | 19 skipped (21)
mutation killed: stale_send —  Tests 2 failed | 13 skipped (15)
mutation killed: approvals_not_consumed —  Tests 2 failed | 13 skipped (15)
mutation killed: uncertain_as_unsent —  Tests 1 failed | 1 passed | 13 skipped (15)
mutation killed: dispatch_superseded —  Tests 1 failed | 1 passed | 13 skipped (15)
exit 0
```
Overall: PASS
