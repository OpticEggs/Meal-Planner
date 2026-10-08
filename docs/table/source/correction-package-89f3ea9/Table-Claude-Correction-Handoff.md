# Table — Claude correction handoff

## Assignment

Continue the implementation of Table. Do not restart ideation or replace the application architecture. This handoff follows independent review of `table-89f3ea9.bundle` and its delivered commit `89f3ea9b5e057c5e57928e7978dda3d23ad4d750`.

Read `Table-Independent-Review-89f3ea9.md` completely. The original Table implementation contract, T01–T22, and X01–X12 remain authoritative. The review finds missed cases; it does not grant authority to weaken those requirements or broaden the product.

## Workspace and authority

Use the existing isolated `/home/user/table` workspace when it is still available. Inspect its current HEAD, working tree, guidance, and active work before doing anything. Never reset, overwrite, or discard newer work to reproduce the old base. If work has advanced, use a separate worktree at the reviewed commit for reproduction and apply only relevant fixes to the current Table branch.

If only the supplied original bundle remains:

```bash
git clone --branch main table-89f3ea9.bundle table
cd table
git rev-parse HEAD
```

The explicit branch is required for portable checkout of this bundle. Confirm the full commit identity rather than trusting the filename.

CFP-Trainer-iOS, the Vault, their checkouts, hooks, index, gates, and release artifacts remain out of scope. Work locally on Table. No real cart additions, checkout, pickup reservation, paid service, public exposure, remote creation/push, or deployment is authorized by this handoff.

## Read the review evidence correctly

The independent source probes use actual TypeScript functions, recording database doubles, and request-only projection inputs. They do not establish a passing PostgreSQL/browser suite. Their assertions intentionally check the observed incorrect behavior. A successful reproduction is not a product pass.

Reproduce the cases as new expected-correctness tests in the real PostgreSQL/Playwright harness. Keep the original acceptance rows and historical evidence. Do not mark a counterexample resolved solely because its source-probe assertion now fails; demonstrate the intended behavior and preserved unaffected behavior.

## Required workstreams

### A. Planning command admission and dependency integrity — F01–F03

- New whole-week adoption must satisfy its own complete-plan admission conditions, including coverage, portions, protected dependencies, current exclusions, and known hard limits. Keep unknown grocery prices distinct from a known constraint violation.
- A locked leftover protects the originating cooking/allocations needed to provide that dinner. Preserving only the locked row is insufficient.
- Reserved lunches are real dependencies. Moving the cook cannot leave an earlier lunch apparently provided or omit its collision from the preview.
- Deferred placement and other newly scheduled/changed meal allocations must enforce the current applicable hard exclusions. Newly recorded facts can flag an already accepted choice without replacing it.
- Preserve the good concurrency behavior: independent Friday/Sunday edits both survive; a same-target or whole-week stale action stops for review; current accepted state becomes visible before Apply.

### B. Purchasing reconciliation and bound observations — F04–F06

- Replace the blanket “an order exists, therefore ignore batches” reconciliation with explicit relationships between confirmed order contents and the transfers they actually cover.
- Later acknowledged/pending/uncertain additions must remain accounted for. Unknown contents must not clear uncertain-transfer holds or make the same demand freshly purchasable without reconciliation.
- Do not fix this by double-subtracting both transferred and ordered views of the same package.
- Carry confirmed or unknown product identity and package basis. Unvalidated substitutions stay unresolved. Received and expected supply remain distinct without double counting. Corrections are explicit observations, not mutation of immutable history.
- Bind **Have enough** to the quantity/unit/revision actually shown to the observer. A concurrent increase must not expand that assertion to the new amount. Explicit measured quantities stay explicit and bounded.
- Preserve exact payload history, independent ingredient reasons, unaffected approvals, and zero retailer calls from stale reviews.

### C. Capture lifecycle and projection scope — F07–F08

- Fast capture must work while the next menu is still unadopted. The next pickup queue must not depend on adopting seven dinners first.
- After a confirmed order, route a newly needed item to the correct open purchasing cycle; identify an already-ordered staple before offering an explicit extra. Do not edit the confirmed order or the meal plan to accomplish this.
- Complete household repeat-product/usual-quantity capture, without a pantry database or UPC questionnaire.
- Reproduce the two-week shared product/price invalidation path. Make cycle-selected inputs explicit or invalidate/recompute all affected active projections. A fresh household sequence number is not proof that a projection uses current purchasing inputs.

### D. Verification and handoff quality — V01–V02, screenshot check

- A mutation kill requires tests to execute and fail for the intended assertion. A runner exit 127, compiler failure, missing database, or other setup error is an error, not a kill. Add a harness-negative test for this distinction.
- Fail verification on startup/migration errors; retain complete logs and structured test results. Preserve mutation restoration checks.
- Correct the bundle clone command. Test the final bundle by cloning it into a fresh directory with an explicit branch and confirm the full HEAD.
- Recheck viewport and scroll behavior around the header shown in the supplied image. It may be a full-page screenshot artifact. Record what was actually observed; do not claim an iPhone test from Chromium or WebKit alone.
- The final `costView` already changes the fully unpriced label to `unknown — 12 unpriced`; do not reopen the old screenshot's formatter issue without a current reproduction.

### E. Existing B3, after accounting correctness

Then finish B3 already recorded in BACKLOG: replacement suggestions prefer applicable received, unallocated goods, and incremental spending measures genuine additional purchases after applicable supply. Do not infer an inventory from old purchases or rank on incorrect order/receipt arithmetic. Preserve dinner ingredient cost versus package spending as separate measures.

## Regression and completion requirements

Add regression IDs without renumbering/replacing T01–T22/X01–X12. Include both relevant commit orders, real persistence/reloads, two authenticated browser contexts where the scenario is interactive, and recorded fake-retailer calls for purchasing cases. Assert exact accepted choices, allocations, physical purchasing requirements, history, and refusal side effects—not only identical screens.

Use separate test databases for integration, end-to-end, and restore checks. Avoid racing mutation runs with source edits or other database suites. No public/live credentials belong in evidence, fixtures, or the bundle.

For this pass, “done” requires:

- Reproduced and resolved disposition for F01–F08, with source references and actual test names/results. Distinguish cases previously found through source tracing from newly executed reproductions.
- V01's false-kill path refused; V02's restoration demonstrated.
- B3 verified after supply-accounting repairs.
- Original contract tests remain intact and green; additional regressions are included in the normal verification command.
- Complete run tied to the exact implementation commit/tree; any post-run documentation commit identified separately. Capture evidence outside the checked-out source while measuring it, or otherwise prove tracked source immutability.
- Available browser/layout checks reported honestly, and physical-device/live-retailer/hosting limits remain explicit.
- A new Git bundle, SHA-256 manifest, restore command, updated implementation status/backlog/acceptance records, and a concise owner report.

Keep durable checkpoints in the Table repository. Proceed through this bounded correction pass without routine milestone-approval requests. A missing live Kroger key, hosting preference, remote destination, or physical phone is not a blocker to the code and fake-retailer regressions above. Record unavailable external validation separately.
