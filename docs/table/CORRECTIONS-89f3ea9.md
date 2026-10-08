# Table — Correction pass after the independent review of 89f3ea9

Reviewed base: `89f3ea9b5e057c5e57928e7978dda3d23ad4d750` (bundle SHA-256 `21109a71…956d5`).
Review package archived unmodified in `docs/table/source/correction-package-89f3ea9/` (manifest verified).
Implementation commit verified: see "Code identity" below and IMPLEMENTATION-STATUS.md.

**Evidence types used below.**
*Review (source-traced/probe)* = the reviewer's observation on 89f3ea9 with recording SQL doubles.
*Reproduced (this pass)* = a new expected-correctness test, run against real PostgreSQL on the
reviewed source, that FAILED there: `evidence/corrections/2026-10-08-repro-on-89f3ea9.log`
(23 of 29 regression cases failed; the 6 that passed are guard cases for behavior that must be kept).
*Resolved* = the same test passes on the implementation commit in the full verification run, and a
mutation that reintroduces the defect is KILLED by it.

| Finding | Review evidence | Reproduced on 89f3ea9 (real PostgreSQL) | Repair | Regression tests (pass on implementation commit) | Mutation | Disposition |
|---|---|---|---|---|---|---|
| **F01** whole-week admission | Probe P01 (handler double) + static budget gap | R-F01a, b, c, d FAILED (adoption accepted 7 open nights / uncovered Thursday / missing plates / known over firm budget) | `src/domain/planning/admission.ts` (complete-plan admission: 7 nights, none open, plates for every member, lunches after cooking, plates served by their night, locks kept with their cooking, current exclusions); firm budget evaluated on the full candidate in `adoptWeekProposalCommand`; UI disables **Use this week** and explains an incomplete draft | R-F01a–e (integration); R-F01-UI (browser: disabled button + 409 `incomplete_week`, no accepted write) | F01_admission_skipped KILLED | **Resolved** |
| **F02** dependency closure | Probes P02 (locked leftover orphan), P08 (lunch before moved source) | R-F02a, b, c FAILED (source retired under locked Thursday; plate not served by its night; lunch collision undisclosed) | Proposals keep a locked night's whole dependency group (source cooking + every night drawing from it, with plates and lunches); admission rejects any proposal that does not keep locked nights with their cooking; Move releases lunches that would precede the cooking and a post-pass discloses every released lunch and blocks any allocation before its cooking | R-F02a–e incl. move-vs-lunch race in both orders; independent Fri/Sun edits still both survive | F02_locked_group_dropped KILLED | **Resolved** |
| **F03** exclusions on new choices | Probe P03 | R-F03a, b FAILED (deferred fish/rice dinner placed; excluded eater re-added) | `place` calls the same exclusion check as replace/backup; a new plate for a member is checked against that member's exclusions. Existing dinners are still only flagged (X08 unchanged) | R-F03a, R-F03b; X08 tests unchanged and passing | F03_place_skips_exclusions KILLED | **Resolved** |
| **F04** order/transfer reconciliation | Probes P04, P05 | R-F04a, b, c FAILED (post-order acknowledged transfer ignored; uncertain hold cleared by "contents unknown"; acknowledged transfer forgotten) | `orders.reconciles_batch_ids` records exactly which transfers the listed contents reconcile (all transfers so far when contents are known; none when unknown). Unreconciled transfers stay sent/uncertain and are never subtracted twice; "contents not listed" is flagged | R-F04a–d (exact fake-retailer call counts: 2, 1, 1); T14/T20 unchanged | F04_order_hides_transfers KILLED | **Resolved** |
| **F05** substitutions & package identity | Probe P06 + source trace | R-F05a, b, c, d FAILED (unvalidated substitution covered demand; no validation command; no package basis; correction impossible) | Order lines store the confirmed product and package basis (never inferred from today's mapping); projection works in physical quantities on each record's own basis; substitutions cover nothing until `ValidateSubstitution` (suitable + amount, or unsuitable → need stays actionable); corrections are new receipt observations (`corrects_id`), history kept; DB triggers keep all of it append-only | R-F05a–d | F05_substitute_counts_as_original KILLED | **Resolved** |
| **F06** bound "Have enough" | Probe P07 | R-F06a (change-first order) and R-F06b FAILED | `RecordAvailability` requires the reviewed `{quantity, unit, fingerprint}` for "enough" and stores exactly that; a concurrent increase shows as a shortfall; unit-basis change is refused for re-review. UI sends what it displayed | R-F06a both commit orders, R-F06b, R-F06-UI | F06_enough_uses_current_demand KILLED | **Resolved** |
| **F07** capture lifecycle | Source trace (no dynamic repro in review) | R-F07a, b, c FAILED (capture refused before adoption; need written into confirmed pickup; no remembered usual) | Capture needs no adopted menu (creates the week's pickup list); past a confirmed order it routes to the next open pickup and reports the destination; already-ordered staples are identified before a duplicate; "Add another" is an explicit extra; `household_staples` remembers usual quantity/product and the UI shows one-tap chips | R-F07a–c, R-F07-UI (two members), X09 (assertion updated — see note) | F07_capture_into_confirmed_pickup KILLED | **Resolved** |
| **F08** cross-week inputs | Source trace (two-week repro not run in review) | R-F08a, b FAILED (week A kept old price/product after a change made from week B) | `households.purchasing_revision`; product/mapping/price/budget/ingredient-review commands bump it and recompute every cycle; each projection records the revision it used; snapshots and Send refuse a projection computed from older inputs | R-F08a (old Send → `stale_review`, zero calls), R-F08b | F08_single_week_recompute KILLED | **Resolved** |
| **V01** mutation harness false kills | Harness probe (npx exit 127 → "7 killed", exit 0) | Reproduced: the review's probe run against a worktree of 89f3ea9 printed "7 killed", exit 0, no tests executed (`evidence/corrections/v01-old-harness-probe.log`) | `tests/mutation/run.mjs`: clean baseline per selection; KILLED only when targeted tests executed and an expected test failed by assertion; runner/compiler/DB failures and anchor misses are ERROR; SHA-256 restoration check; full logs + results.json; `selftest.sh` proves npx-127 → ERROR/exit≠0 and a no-op control → SURVIVED | `tests/mutation/selftest.sh` | — | **Resolved** |
| **V02** bundle restore | Restore logs (plain clone: nothing checked out) | Reproduced with the old bundle: `evidence/corrections/v02-old-bundle.log` | `scripts/make-bundle.sh` bundles `HEAD` and `main`, then clones both ways in a fresh directory with `init.defaultBranch=master` and checks HEAD + files + fsck | run in this pass for the delivered bundle | — | **Resolved** |
| **Screenshot / header** | Image + stylesheet; undecided | Measured at 390×844: sticky header pins correctly at top and scrolled (the mid-page header in the old image is a full-page capture artifact), BUT the fixed bottom nav covered Wednesday's Change button after scroll-into-view (y=765/844), and the header was translucent | `scroll-padding-top/bottom` for the sticky header and fixed nav; opaque header | Browser test "Header overlap" (elementFromPoint at top and center of every night's Change control; trial click) + viewport screenshots in evidence | — | **Resolved for Chromium**; WebKit/iPhone **BLOCKED** (not installed; downloads not permitted; no device) |
| **B3** received goods & extra cost | Backlog | — | `receivedSurplus` per line (received physical beyond plan + requests); `outstandingPurchase` cost view; additional basket cost = change in what still has to be bought; change sheet and Explore label "Uses received …" and rank those first | `tests/integration/b3.received-goods.test.ts` (2) | B3_extra_cost_reprices_history KILLED | **Done** |

### Original tests whose code changed (pass conditions unchanged)
- **X09** (`groceries.contract.test.ts`): the old assertion expected an "Add another" extra inside the
  already-confirmed pickup — the F07 defect. It now asserts the extra goes to the next open pickup;
  the X09 pass condition (identify the ordered staple before a duplicate; extra stays extra; no
  double counting) is unchanged.
- **T19** (`groceries.contract.test.ts`): the "Have enough" call now passes the amount shown, as F06
  requires; required result unchanged.
- **B2 pickup-timing test** (added in the previous pass, not an acceptance row): order lines now name
  their product, as the UI does; an order line without a product is flagged as unknown basis.
No T01–T22 / X01–X12 test was skipped, weakened or relabelled.

### Remaining limits (unchanged by this pass)
- Simulated retailer only; Kroger live integration BLOCKED (credentials, account authorization, approval).
- No Safari/WebKit or physical-phone validation; Chromium only.
- One confirmed order per pickup cycle (a second same-week pickup is not modeled).
- `household_staples.product_id` records the mapped product at capture; it is not yet updated from approvals.
- Not deployed; no hosting decision.
