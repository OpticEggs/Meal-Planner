# Table — Independent implementation review

**Disposition: return for a bounded correction pass. Retain the architecture; do not restart product design.**

Reviewed artifact: `table-89f3ea9.bundle`  
Bundle SHA-256: `21109a7166ba81b71583188a5cf933634a7903c5c448fb2cbef821c0be7956d5`  
Delivered commit: `89f3ea9b5e057c5e57928e7978dda3d23ad4d750`  
Recorded final test commit: `b1dcc803d155c1591fab1ea869e402fa5417c008`

This review is of the uploaded code, screenshot, operating records, and previously settled Table contract. It is not a live Kroger test, production certification, or verification of the publication/security status of the listed dependency versions.

## 1. What survived, and what is established

The bundle restores successfully with an explicit `main` branch. `git bundle verify` and `git fsck --full` succeed. It contains a complete reachable history with six commits. The delivery narrative says seven; the count difference is administrative, not a lost-code finding.

The application source is a substantive implementation, not the earlier single-file mockup. It includes separate domain calculations, authenticated command routes, PostgreSQL migrations, transactional command receipts, per-target dependency checks, persistent projections, append-only purchasing records, two-user browser tests, and an explicitly disabled real Kroger adapter.

The recorded final evidence reports typecheck success, 60 unit/integration tests, a production build, 28 browser tests, and seven killed mutations. The delivered HEAD differs from its recorded tested commit only in three documentation/evidence files. That establishes the committed source relationship; it does not independently establish what uncommitted files were present during the author's run. The evidence header itself says `(+ uncommitted changes)`.

**This review did not rerun that complete suite.** Dependency installation could not resolve `registry.npmjs.org` (`EAI_AGAIN`), and PostgreSQL binaries are absent in this environment. The install was stopped after diagnosis. No source was changed in the restored review checkout. No application was deployed and no store or remote repository was contacted.

Instead, the review executed nine narrow source probes using the actual supplied TypeScript functions, plus a separate verification-harness failure probe. These are described precisely below. They expose cases not established by the existing green report; they do not invalidate every earlier passing scenario.

### Method and evidence limits

`source-probes.cjs` uses TypeScript's `transpileModule` to load actual source. Command handlers receive recording SQL doubles, not PostgreSQL. Projection probes use household-request-only inputs so they do not exercise decimal arithmetic; the substituted arithmetic dependency throws if invoked, and the final assertion confirms zero arithmetic operations. Proposal, operation, hash, date, constraint, and formatting functions are the supplied functions.

The probe assertions describe observed defects. A probe succeeding means the counterexample reproduced, **not** that Table passed its contract. Translate these observations into ordinary expected-correctness tests in the real PostgreSQL/browser harness. Do not install these counterexample assertions as release gates whose continued success is desirable.

Evidence is packaged under `evidence/`, including `source-probe-results.json`, line-numbered source excerpts, restore logs, environment limitations, and the mutation-harness probe.

## 2. Findings requiring correction

### F01 — Whole-week adoption lacks the agreed admission checks

**Priority:** block completion of the planning contract.  
**Evidence:** source probe P01; `src/ui/Week.tsx:88–99`; `src/server/commands/plan.ts:195–283`.

The generator legitimately returns unresolved drafts when it cannot cover a week. The UI nevertheless enables **Use this week** based on busy/current/stale status alone. The adoption handler validates identity, revision, and exclusions for newly proposed recipe events, but does not reject uncovered nights or validate the complete candidate's coverage and known hard budget requirements before writing it.

P01 uses the real generator with no eligible recipes. It returns seven open nights. The real adoption handler, with a recording database double, returns `accepted` and requests seven assignment writes. There is no complete-week coverage check on that path. This is an isolated handler observation, not a claimed PostgreSQL commit.

A known-over-firm-budget whole-week adoption is a related static gap: the adoption path does not call the budget evaluation used by scoped previews. Add a fully priced reproduction in the integration suite. Do not confuse this with unknown prices: unresolved price/product matching may leave dinners selected without proving shopping readiness or budget compliance.

**Required correction:** preserve an incomplete proposal as a draft, but do not let **Use this week** adopt it as the settled complete week. Validate intended dinner coverage, allocations, protected dependencies, current exclusions, and known hard limits at the authoritative command boundary. Keep fact updates and explicitly reviewed scoped recoveries able to expose a named unresolved dinner; those are different commands.

**Regression cases:** empty recipe collection; too few eligible recipes; an uncovered Thursday; missing required plates; known-over-firm-budget complete proposal; complete meal coverage with unknown grocery prices. Assert both UI affordance and server behavior, including no accepted writes on refusal.

### F02 — Whole proposals and moves do not preserve the entire meal dependency chain

**Priority:** block lock/coverage completion.  
**Evidence:** source probes P02 and P08; `src/domain/planning/proposal.ts:162–181`; `src/server/commands/plan.ts:239–258`; `src/domain/planning/operations.ts:188–224`.

**Locked leftover source.** With Thursday locked as leftovers from an unlocked Wednesday cooking event, the generator keeps Thursday's `keep:<event>` reference but creates a retained event entry only when the locked night itself is a cooking night. The source is absent from the proposal's retained-event set. The adoption handler then requests retirement of that Wednesday source while leaving the locked Thursday row alone.

P02 reproduces the orphaned reference and the requested source retirement. Preserving the row's title/lock is not preservation of the agreed dinner. The proposal must retain the actual dependencies required by a locked meal or present a conflict before adoption.

**Reserved lunch.** Moving Wednesday cooking to Friday shifts that day's dinner allocations and examines dependent dinner assignments. A Thursday lunch allocation is neither shifted nor invalidated. P08 returns zero blockers while leaving Thursday's reserved lunch before Friday's source cooking; the consequence text does not disclose that lunch collision.

**Required correction:** compute dependency closure across cooking events, dinner leftovers, reserved lunches, dates, allocations, and locks. Retain required source choices or reject a conflicting whole proposal. For scoped changes, disclose any newly invalid allocation before Apply. Do not silently move a locked meal or silently erase a reserved lunch.

**Regression cases:** locked leftover with unlocked source; locked source with an unlocked dependent dinner; reserved lunch before a moved source; both real edit orders for interacting sources/allocations. Keep independent Friday/Sunday edits valid.

### F03 — Placing a deferred dinner bypasses current hard exclusions

**Priority:** block hard-constraint completion.  
**Evidence:** source probe P03; `src/domain/planning/operations.ts:225–250`, compared with its `replace`/`backup` validation at `103–128`.

The `place` operation schedules a deferred cooking event without invoking `checkNewRecipe` or another equivalent current exclusion check. P03 supplies a deferred fish dinner after fish is excluded. `checkRecipe` returns `violated`, while the actual placement operation returns zero blockers and schedules a cooking night.

Flagging an already accepted dinner after a newly recorded exclusion is correct. Deliberately scheduling that dinner anew without enforcing the current exclusion is a different operation and is not covered by that rule.

**Required correction:** apply current hard-constraint validation to every command that creates or materially changes a scheduled meal/allocation, including placement and added eaters where applicable. Do not rewrite an existing dinner merely because new information flags it.

**Regression cases:** defer → add exclusion → attempt placement; existing accepted dinner merely flagged after a new exclusion; a changed eater/allocation that changes which personal exclusions apply. Assert no new violating accepted choice.

### F04 — Confirming an order causes later and uncertain cart batches to disappear from requirement reconciliation

**Priority:** block purchasing correctness before any real retailer write.  
**Evidence:** source probes P04 and P05; `src/domain/groceries/projection.ts:260–294`; `src/server/commands/purchasing.ts:33–55`.

The projection counts acknowledged, pending, and uncertain cart batches only inside `if (!orderActive)`. Once any order exists, every batch is ignored for that reconciliation, without a relationship identifying which batches the order actually covers.

P04: the same acknowledged milk batch yields `sent=1, toSend=0` with no order, but `sent=0, toSend=1` when a separately confirmed rice order exists. This also describes the later-addition path: confirm an order, add a new need, send it, and recompute. The acknowledged additional batch is still ignored. The app can offer the same demand for another send after renewed approval.

P05: an uncertain milk transfer followed by **Order confirmed — contents unknown** yields `uncertain=0, toSend=1`. Supplying a fresh matching approval makes the actual projection `ready=true` with no blockers. Unknown order contents have not established whether that milk is in the cart/order, yet the reconciliation hold has disappeared.

This is not evidence of an automatic background retry or a real duplicate Kroger operation. It is a demonstrated path making unresolved/already-transferred demand eligible again.

**Required correction:** explicitly reconcile which immutable transfers are represented in a confirmed order, which remain uncertain, and which are later pending purchases. Preserve quantities and uncertainty outside that confirmed snapshot. Do not simply remove the conditional and subtract every batch as well as every order: that would double-count the same goods. Unknown contents must remain unknown until actual reconciliation evidence exists.

**Regression cases:** confirmed order → new need → acknowledged send → reload/re-review; acknowledged and uncertain pre-order batches with partial/unknown order contents; a later batch unrelated to the order; concurrent follow-on sends. Assert exact fake-retailer calls and unresolved status, not just immutable historical rows.

### F05 — Substitutions and package identity are not reconciled as actual supply

**Priority:** block receipt/supply correctness.  
**Evidence:** source probe P06; `src/domain/groceries/projection.ts:260–277`; `src/server/groceries/recompute.ts:96–109`; `src/server/commands/groceries.ts:265–271,281–301`.

A `substituted` receipt is neither counted as received nor subtracted from the original ordered quantity. P06 uses a one-package milk requirement with a substituted order line and no validated replacement identity. The projection returns `toSend=0`, `received=0`, status `ordered`, and no unresolved reason. The intended original ingredient has effectively remained covered without establishing what arrived or whether it is suitable.

Separately, the loader feeds order supply to the projection as ingredient plus package count. It discards the stored product identity and package basis. Current required package counts can therefore be compared against packages of an earlier different size. The order-confirmation command also infers the order line's product ID from the current mapping, rather than receiving an explicit confirmed product identity. The package-size consequence is a source-traced risk, not an independently executed arithmetic test in this environment.

**Required correction:** preserve the actual or explicitly unknown ordered product, package basis, and confirmed replacement. Count received/expected physical quantities only on a compatible, validated basis; unknown or unsuitable substitutions remain unresolved. Preserve purchasing history and add correction/reconciliation observations rather than rewriting old records. Do not prevent a factual correction merely because an earlier receipt observation used the original package count.

**Regression cases:** unvalidated substitution; unsuitable substitution; smaller/larger same-ingredient substitute; product mapping changes after order confirmation; received-vs-expected representation of the same package; mistaken missing/received observation corrected without history mutation.

### F06 — “Have enough” can silently certify a quantity the reviewer never saw

**Priority:** block shared grocery-review correctness.  
**Evidence:** source probe P07; `src/server/commands/groceries.ts:129–146`; `src/ui/Groceries.tsx:159–165`.

The availability command does not include the reviewed line fingerprint or reviewed demand. The server loads the latest current line and stores its quantity as `reviewed_demand`.

Scenario: Alex sees a 1,000 g chicken requirement and taps **Have enough**. Jon's accepted change raises it to 3,000 g before that command is handled. The server stores 3,000 g as the amount Alex reviewed. P07 executes that handler with a current 3,000 g line and records precisely that insert. Nothing in the submitted payload can preserve or check the original 1,000 g view.

This is the grocery equivalent of the stale-preview boundary: new state is not new authorization, and it is not a new observation of the kitchen.

**Required correction:** bind **Have enough** to the demand/units actually reviewed. Reject a stale assertion for renewed review or preserve its original bounded quantity and show the new shortfall. Explicit measured **Have some** amounts may be independent facts; do not enlarge them or invent a deduction.

**Regression cases:** force both demand-change/availability commit orders; changed unit/product basis; unrelated ingredient changes; unchanged reviewed quantity. Inspect stored availability and resulting requirements.

### F07 — Fast capture is still tied to an adopted week rather than the upcoming pickup lifecycle

**Priority:** required for the already-settled household workflow, not new ideation.  
**Evidence:** source-traced; `src/ui/AlsoNeed.tsx:6–13,35–51`; `src/server/commands/groceries.ts:30–95`; source specification §6.3 and X09.

The UI refuses capture until a week is adopted. The command writes every request to the supplied week's cycle. It checks for the same item in that cycle's order but does not route an item absent from the confirmed order to a next open pickup cycle. Only one confirmed order per week is allowed. General capture uses a text field/datalist; the promised household repeat chips and persisted usual package quantity are not implemented as a general capture path.

These are visible implementation gaps rather than dynamic browser reproductions in this review. They matter during the ordinary interval after this week's pickup is confirmed but before the next menu is chosen.

**Required correction:** permit fast household capture without requiring menu adoption. Preserve explicit current/next purchasing context; report the destination. Check already-ordered items before creating a next-cycle duplicate, retain explicit extras, and remember approved repeat-product/quantity choices. Do not mutate the menu or a confirmed order to make capture work.

**Regression cases:** add before any accepted week; add while next week's dinners remain a draft; add a not-already-ordered item after confirmation; tap an already-ordered staple; choose an explicit extra; receipt/missing resolution; both members contributing the same usual request.

### F08 — Household-wide product/price changes can leave other weeks' projections stale

**Priority:** validate and repair before considering shared purchasing complete.  
**Evidence:** source-traced; `src/server/commands/groceries.ts:179–213`; `src/server/groceries/recompute.ts:62–81`; `src/server/queries/snapshot.ts:177–185`; `src/server/commands/purchasing.ts:33–55`.

Product mappings and product-price observations are household-wide. `AddProduct`, `ChooseProduct`, and `RecordPrice` request recomputation only for the single week in their payload. Another accepted week's persisted projection may therefore retain the earlier product/price inputs. Snapshot coherence checks accepted-plan revision, not the complete set of changed product/price inputs; handoff validates the stored projection.

The source establishes this missing invalidation path. The full two-week stale-send reproduction remains to be run against PostgreSQL; do not count it as already executed here.

**Required correction:** make the scope explicit. Either use explicit per-cycle selected/pinned purchasing inputs while treating household defaults as future defaults, or recompute/invalidate every affected active cycle when a shared input changes. Do not present a stored projection as current merely because dinner choices did not change. Preserve unaffected approvals and immutable order/batch history.

**Regression case:** prepare two accepted weeks sharing a product; approve week A; alter a shared mapping/package/price through week B; return to A and attempt old Send. Verify coherent product, quantities, price/budget, and zero obsolete calls wherever the shared change applies.

## 3. Verification and delivery corrections

### V01 — Mutation checks accept infrastructure errors as successful kills

`tests/mutation/run.sh:15–34` labels any nonzero Vitest exit as `mutation killed`. It does not establish that the expected test assertions executed or failed for the intended behavioral reason.

The independent probe copies the original script and its three source targets to a scratch directory. A local `npx` double exits 127 before running any tests. The unmodified mutation script prints **seven mutations killed** and exits 0. Original copied source is restored; no application tests ran.

This does **not** prove the supplied seven original kills were infrastructure failures: their evidence includes test-failure counts. It proves the harness can certify a kill for the wrong reason and must be hardened before relying on it for future release decisions.

Require executed targeted tests and the intended assertion failures, not startup/compiler/database errors. Preserve structured results and the relevant failure output. Check a clean baseline and restore source on every path. The verification script should fail when database startup/migration fails, and should retain complete command logs rather than only filtered summaries. Preserve historical reported results; append corrections instead of rewriting the record.

### V02 — The documented clone command is not portable

The bundle has `refs/heads/main` but no usable advertised HEAD. With an initial default branch of `master`, the reported `git clone table-89f3ea9.bundle table` command imports the objects but warns `remote HEAD refers to nonexistent ref, unable to checkout` and leaves no checked-out application files.

This verified command restores the supplied commit:

```bash
git clone --branch main table-89f3ea9.bundle table
```

No code is lost. Correct the restore instructions and test the next bundle in a fresh directory.

## 4. Screenshot and usability assessment

The attached screenshot is byte-identical to the bundle's `docs/table/evidence/screens/2-adopted-week.png`. It is an author-generated smoke screenshot, not evidence of a physical-phone run.

The central header obscures meal rows in that image. The actual stylesheet uses a sticky header. This could be a full-page capture/scroll-position artifact or a runtime layout problem; the image and source alone do not settle which. Capture top-of-page and scrolled viewport screenshots and measure actual visibility/hit targets, then run WebKit and real iOS validation when available. Do not declare the layout fixed merely because there is no horizontal overflow.

The screenshot's `$0.00 known + 12 unpriced` label is already corrected in the final bundle. P09 executes `costView` and returns `unknown — 12 unpriced`. Do not spend the next pass repairing that already-changed formatter or use the older screenshot to claim the final formatter still prints zero.

The existing X11 test checks horizontal overflow and limited keyboard interaction. Those are useful checks, not proof that a sticky header never covers a target, focus restoration works, or real phone suspension behaves like the Chromium simulation.

## 5. Work order for Claude

1. Preserve the delivered base and reproduce F01–F06 in the real test harness. Add expected-correctness tests before scoped fixes; preserve T01–T22 and X01–X12.
2. Fix the dependency/constraint and grocery-reconciliation defects. Complete F07 and reproduce/resolve F08. Do not change the settled proposal/accepted-plan/order boundaries.
3. Harden the verification harness and correct bundle restoration. Record the screenshot uncertainty accurately and perform available viewport/WebKit checks.
4. Then complete the already acknowledged B3: replacements prefer applicable received goods, and additional basket cost reflects only genuine additional purchasing needs. Correct order/supply accounting first; do not optimize ranking on incorrect supply.
5. Run the full suite from an identified implementation commit with complete evidence. Mark unavailable environments explicitly. Deliver a restorable bundle and update status/backlog/acceptance records.

Real Kroger authorization, a hosted release, paid services, and a remote repository remain outside this correction pass. None is needed to resolve these simulated-retailer defects. No further product-design decision is required to begin.

## 6. Evidence index

- `evidence/bundle-verification.log`, `git-fsck.log`: bundle/history/object checks and committed delta.
- `evidence/restore-default.log`, `restore-explicit.log`: failed default checkout versus explicit-branch recovery.
- `source-probes.cjs`, `evidence/source-probe-results.json`: P01–P09 with method limitations.
- `evidence/mutation-harness-failure-probe.log`: false kill result with no runner execution.
- `evidence/source-excerpts.md`: exact source paths, line ranges, and file SHA-256 values.
- `evidence/review-environment.json`, `dependency-install-limitation.log`: environment and checks not run.

**Bottom line:** the shared-state foundation is worth keeping. The broad “stages 1–4 complete; only B3 remains” claim is not yet supported by the full product contract. Resolve the demonstrated boundary cases before integrating a real cart.
