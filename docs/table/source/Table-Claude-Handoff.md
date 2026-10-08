# Table — Claude Implementation Handoff

Version 2.0 · October 7, 2026  
Prepared for a fresh Claude coding session. No prior chat context is required.

## 1. Mission and present state

Implement **Table**, a private shared dinner-planning and grocery-pickup preparation application for Jon and Alex.

The product-design discussion is complete. Do not restart ideation or respond with another high-level proposal. Build the specified behavior, beginning with a persistent, two-user vertical slice and extending to the complete clearly labeled mock-retailer workflow. The full implementation plan remains the authority for product semantics.

Actual supplied assets:

| File | Role | What it does not prove |
|---|---|---|
| `Table-Implementation-Plan.md` | Current build specification, six stages, original 22 acceptance tests and 12 supplemental engineering tests | No implementation/test is represented as delivered |
| `Table-Claude-Handoff.md` | Execution instructions and boundaries | Does not grant live purchase or deployment authority |
| `Table-Initial-Prompt.txt` | Initial task directive for the coding session | Does not launch a session automatically |
| `SOURCE-REGISTER.md` | File/source lineage and external verification limitations | Does not replace actual integration verification |
| `references/index.html` | Original single-file visual prototype | No shared persistence or functional integration |
| `references/table-syntax-repaired.html` | Same prototype with one syntax repair | Does not implement the settled state contract |
| `references/table-prototype-review.md` | Earlier review and reproduced defects | Historical prototype testing, not testing of your new code |
| `references/table-implementation-plan-v1.md` | Earlier plan, preserved for traceability | Not a second active backlog or permission to omit v2 detail |

This packet includes no repository URL, credentials, production store ID, authorized UPCs, complete verified recipe dataset, or deployed application. Do not invent any of those. Do not assume any other agent has started implementation. The prototype's referenced images were not supplied. Use fallbacks and continue.

## 2. Source precedence

Apply the coding session's governing safety and workspace instructions first. For Table's product semantics:

1. Jon's explicit later directions in the coding session.
2. `Table-Implementation-Plan.md`, especially the fixed contract and preserved tests T01–T22.
3. This handoff and `Table-Initial-Prompt.txt` for execution scope and defaults.
4. `references/` as historical/visual evidence only.

The prototype cannot overrule the contract. Its demo allergy, nutritional targets, budgets, brands, store choices, dates, prices, quantities and UPCs are not real household inputs. No setting is authorized merely because it appears in HTML.

Technical defaults and X01–X12 are engineering elaborations supporting the settled behavior. Equivalent implementations are allowed with evidence; weaker behavior is not. Current official API/library documentation governs technical compatibility, not household product choices.

## 3. First assignment and authority

### Authorized within the coding session's Table workspace

Inspect supplied files and relevant repository instructions; select/pin compatible dependencies; create/edit application code, migrations, test fixtures, tests, local setup documentation and a small durable status/backlog set. Run unit, real-database integration, browser and production-build checks available in the environment. Use a recording fake retailer. Consult primary technical documentation when needed.

Implement stages 1–4 without requesting approval after each internal milestone. Keep the original 22 tests intact. Record milestones as code/evidence checkpoints, not as new requests for Jon to coordinate work. Preparing stage 5 interfaces and a capability report is allowed; actual external operations are gated below.

Make sensible reversible engineering choices and document them. Missing real targets, recipes, store IDs or keys must not block the first slice: use explicit test fixtures, unset production inputs, manual recipe entry and the fake adapter. A UI placeholder must remain a placeholder, not a false success claim.

### Not authorized by this packet

Do not place an order, reserve a pickup, add anything to a real cart, modify an existing real cart, create paid accounts/resources, purchase services, publish the app publicly, change the user's real nutrition settings, or infer external write permission from available credentials. Do not access unrelated email, calendars, repositories or personal files to fill household inputs.

Do not change any unrelated active project, checkout, hooks, secrets, release artifacts, or source files. No blanket Git reset, force push, or bypassing repository gates. Do not create a remote, push, or deploy unless that destination/action is authorized in the coding session. Local commits in the intended workspace are appropriate when existing policies permit them; report exactly what was saved and where.

Do not claim background continuation, worker creation, CI execution, browser testing, or Claude/other-agent contact unless the tool operation actually exists and succeeds. This task does not require multiple workers or a new orchestration framework.

## 4. Bootstrap without a requirements interview

Start by locating the supplied packet and determining the actual workspace. Read its instructions and check branch, remote, working-tree status and existing application before editing.

When a real Table repository is already provided, use a scoped branch and preserve unrelated changes. If the attached code is only the prototype and the environment permits local file creation, create an isolated `table` workspace outside unrelated repositories. Do not nest it in the CFP app/vault or any other ongoing project. If no safe coding filesystem is available, report that exact environment limitation; do not pretend a web prototype is a persisted build.

Archive the packet under `docs/table/source/` or an equivalent clearly identified location without modifying its reference copies. Confirm its manifest when supplied. An optional missing visual reference is not a blocker when the current plan/handoff are available. If the controlling plan itself is missing, identify the missing artifact rather than reconstructing unseen tests from memory.

For a new project, default to TypeScript/Next.js, PostgreSQL, a maintained server-side authentication library, pure domain modules, a unit/integration runner, and Playwright. Pin actual compatible versions after checking current official instructions. Choose a simple SQL access/migration approach and record it; do not hold up coding to ask Jon to pick an ORM, CSS library, or test runner. Reuse an existing compatible Table stack when that preserves the contract more efficiently.

Create distinct test users and sessions. Local/test convenience must not become production impersonation. Use real PostgreSQL for concurrency evidence, not a browser array or SQLite approximation. Provide a reproducible local setup without paid services.

## 5. Non-negotiable product and implementation boundaries

**Proposal versus accepted plan.** Only a deliberate accepted-plan command changes the household menu. Browsing, previews, interests, preferences, new observations and unknown prices do not. A displayed preview is not an active grocery input.

**Whole-week versus scoped edits.** Whole adoption binds to the reviewed accepted-week revision. A night edit binds to that target and its real dependencies. Independent Friday and Sunday changes both survive. Same-target or stale whole-week changes require renewed review. An old seven-day snapshot is never the general save mechanism.

**Visibility before Apply.** When a newer accepted decision is known, show it in the accepted-week context and mark the old preview stale immediately. Refetch on foreground/reconnect; an Apply-time-only check fails the contract.

**Facts versus choices.** Less left than planned can make Thursday unresolved while retaining its selected dinner. A hard exclusion or missing information can invalidate readiness, not automatically choose a replacement.

**Current requirements versus purchase history.** Accepted changes recompute current ingredient/package needs and approval validity. They do not rewrite what was sent, confirmed ordered, or received. An independent household request remains after its overlapping recipe is removed.

**Review versus send.** A stale grocery review makes zero new retailer calls. Product suitability and exact purchase approval are separate. Preserve unchanged approvals; changed quantities need current review. The same reviewed demand cannot be sent twice through different client operation IDs.

**External uncertainty.** An immutable authorized payload and local deduplication do not prove exactly-once external writes. Unknown outcomes are not automatically replayed. Use only the response granularity the real API actually supports.

**Honest data.** Calories/macros derive from explicit ingredient/component data. Unknown is not zero. Dinner targets are not whole-day targets. Recipe usage cost is not package spending; neither can be invented from a demo total. No real settings come from fixture values.

## 6. First working slice and progression

Build this sequence before polishing all five areas:

1. Two authenticated test sessions load one persisted accepted week and a coherent current grocery projection.
2. One user opens/cancels a Friday preview while the other reviews groceries; active state is unchanged.
3. Independent Friday/Sunday accepted replacements both survive in both request orders.
4. Same-target and stale full-week writes are rejected without losing drafts; stale status appears while open and on return, before Apply.
5. Reload/server restart preserves the accepted state. Locked meals, recipe versions, and leftover dependencies are respected.
6. Extend the same path through quantity recalculation, preserved product approvals, stale-review rejection, and unchanged confirmed-order history using the recording fake adapter.

Checkpoint evidence for this slice, then continue the next ready item through stages 3–4 without routine confirmation. Implement the actual household journey: proposal, deliberate adoption/change, next dinner, Cook/reheat, independent portions, meal coverage, favorites/notes, Sounds good, Also need, manual recipes, Explore/filter/sort, honest budgets and grocery review.

Do not stop at a scaffold when unblocked implementation work remains. Do not bypass a failing state-contract test to build more attractive screens. The initial task targets a working mock-retailer application; live Kroger and household release have separate gates, not simulated completion.

## 7. Test and evidence requirements

Copy the preserved T01–T22 table into an acceptance register with links to actual tests. Track X01–X12 separately as engineering safeguards. A line item saying a test exists is not evidence it ran. Use `NOT IMPLEMENTED`, `IMPLEMENTED / NOT RUN`, `PASS`, `FAIL`, or `BLOCKED`.

Shared-use tests need two independently authenticated Playwright contexts, a running server, persistent PostgreSQL, controlled request ordering and a recording fake adapter. Assert database contents/revisions, projected quantities, immutable order records, and outbound-call counts, not only screenshots or matching UI labels.

Mandatory scenarios include active and foreground-resume stale previews, independent edits in both commit orders, same-target conflicts in both orders, stale whole adoption, accepted changes during grocery review, and a changed dinner after confirmed pickup. Test Send with the old review at the server boundary and check that no queued dispatch slips through later.

Record exact commands, code/commit identity, database/runtime versions, results including skip counts, and evidence paths. Use negative controls or mutation checks where appropriate so tests demonstrably detect a forbidden write. Do not weaken assertions to fit an implementation.

Do not claim Safari/device coverage from desktop screenshots or WebKit automation alone. Record unavailable environment-specific checks as blocked. A stage's subset passing does not mean the entire application or live retailer integration is verified.

## 8. Kroger and nutrition integration posture

The plan separates documented API surfaces from authenticated capability evidence. Kroger's public Postman collection exposes add-to-cart; this packet did not establish full schemas/auth scopes, cart synchronization, order import, or automatic pickup booking. Current developer pages could not be fully inspected through the text extraction used during preparation. Recheck official guidance in the coding environment and record actual limitations.

Use a fake adapter by default and make its simulated status visible. Prepare real authorization/product/cart code only from verified official interfaces. Keep account tokens and nutrition-source keys server-side. An unavailable key is a narrowly scoped integration blocker, not a reason to abandon the application.

A live cart-addition test requires explicit approval identifying the account, product and quantity. Checkout and pickup remain a user handoff unless separate current capability and authority are demonstrated. No real order or scheduled pickup is authorized here.

USDA FoodData Central is the proposed nutrition lookup source, not an automatic guarantee of ingredient matching, recipe completeness or clinical suitability. Store provenance, units and raw/cooked basis. Keep fixture nutrition visibly synthetic.

## 9. Durable execution and reporting

Keep the operating record small:

- `CLAUDE.md` — pointer to the spec, core boundaries, setup/test commands.
- `docs/table/IMPLEMENTATION-STATUS.md` — present stage, exact saved code identity, evidence, blockers, next executable item.
- `docs/table/BACKLOG.md` — bounded items with dependencies, allowed scope, associated tests and exit criteria.
- `docs/table/ACCEPTANCE.md` — T/X coverage and evidence.
- `docs/table/DECISIONS.md` and `INTEGRATION-CAPABILITIES.md` — concise choices and actual verified/blocked capabilities.

Before compaction or stopping, save these records and current work. Resume from durable artifacts, not an assumed prior conversation or claimed worker activity. Keep communications milestone- or blocker-based; do not require hourly owner check-ins or ask Jon to carry messages between agents. Report real blockers once and continue independent allowed work.

At the end of the coding session report: delivered behavior and stage; exact branch/commit or workspace state; how to start the app; actual test commands/results/evidence; remaining defects and blocked capabilities; whether anything was pushed/deployed; and the next executable backlog item. Distinguish a working mock workflow, an implemented but unverified adapter, a verified real integration, and an actual deployed release.

## 10. First response expected from Claude

Briefly identify the workspace and immediate build slice, then inspect and code. Do not return only a summary, a requirements questionnaire, a promise to work later, or another implementation plan.

**The user has already done the product design. Your responsibility is to implement it without weakening its state contract.**
