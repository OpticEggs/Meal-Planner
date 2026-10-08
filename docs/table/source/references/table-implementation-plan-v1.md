# Table — Implementation Plan

Status: planning document. No implementation or retailer operation is represented as completed.

## 1. Basis and scope

The behavioral authority is the household contract and acceptance scenarios settled in this conversation. The uploaded `index.html` is a visual reference, not evidence that those behaviors exist. In that file, replacing a dinner directly changes `state.days` (lines 446–450), and cart results are simulated (lines 606–613). Subsequent prose describes intended behavior; it does not establish additional delivered code.

Proposed implementation structure: a mobile-friendly web application, one authenticated server application, one relational database, and a household update channel. Keep plan calculations and retailer communication in separate modules within that application. This does not require separate services or an autonomous AI agent.

First release: one shared household for Jon and Alex; a structured recipe collection; separate editable nutrition targets and preferences; a complete weekly proposal; deliberate adoption and changes; coverage and leftover planning; favorites and Sounds good; settled Also need capture; consolidated groceries; product review; a verified cart handoff; and explicit order/receipt observations.

Do not copy demo budgets, allergies, nutrition targets, brand preferences, or store choices into real household settings as confirmed facts. Recipe photos, quantities, nutrition records, and product mappings must be provided or explicitly verified rather than inferred from the prototype.

## 2. Fixed product contract

1. Table proposes one complete week. Alternatives remain behind Change.
2. A proposal is separate from the shared accepted plan. Browsing, previewing, saving interest, and changing preferences do not adopt or edit the week.
3. Use this week adopts exactly the reviewed proposal. It does not place an order, record cooking, or record consumption.
4. Either household member may decide. Neither may unknowingly overwrite the other's newer decision.
5. Locked nights remain protected inside proposed revisions. An open night permits a proposal, not an automatic applied change.
6. Only the accepted plan supplies active dinner grocery requirements. Independent household requests are another source of requirements and retain their own reasons.
7. Meals chosen, groceries ready, cart handoff, order confirmation, and receipt are separate statuses. Unknown prices or products do not prove readiness or compliance.
8. A fact about the plan can change without replacing its selected dinner. A leftover shortfall changes coverage status; recovery remains a deliberate action.
9. Independent night edits may both apply. A stale same-target edit or a stale whole-week adoption requires review of the current week.
10. A newer accepted decision becomes visible while a preview is open or on return to the application; checking only at Apply is insufficient.
11. Accepted meal changes update current requirements, not historical cart payloads, confirmed order contents, purchased packages, or received goods.
12. After adoption, home emphasizes the next dinner and outstanding work rather than asking for another week to accept.

## 3. State model

Use separate records for choices, calculations, purchasing actions, and observations. Do not represent the household with a single mutable week object and a pair of order booleans.

| Record | Required responsibility |
|---|---|
| Household / membership | Two authenticated members, authorization, actor attribution, household timezone and explicitly selected store. |
| Profile / preference | Per-person targets, hard exclusions, Make again / Occasionally / Not for me, household notes, and Sounds good. Missing information remains missing. |
| Recipe version | Structured ingredients and units, method, reheat/serve instructions, yield, estimated effort, nutrition data and its source, and household modifications. Accepted meal assignments pin a recipe version. |
| Accepted week | Stable household plan identity, current revision, intended dinner coverage, and accepted choices. |
| Night / cooking event / coverage allocation | Per-night revision and lock; cooking event; per-person component portions; planned lunches; explicit links from leftover meals to their originating cooking event. |
| Proposal / preview | Reviewed proposed content, its base revision, scoped intended operation, target and dependency revisions, and consequence preview. It never acts as the current plan. |
| Grocery requirements | Quantified needs derived from the accepted week plus independent household requests, with source reasons retained. A projection identifies the source versions used to calculate it. |
| Household request / availability observation | Usual-amount or explicit-extra requests, authors, cycle-scoped Have enough / Have some / Need to buy, and confirmed quantities where available. These are not a perpetual pantry. |
| Product mapping / purchase approval | Remembered suitable product separate from approval of a specific product, quantity, unit, and purchase context. Changing quantity need not erase the remembered brand. |
| Handoff batch / line attempt | Exact approved outbound payload, operation identity, source review revision, and per-line outcome: not sent, in flight, acknowledged, failed, or uncertain. |
| Order snapshot / receipt observation | Explicitly confirmed order contents and confirmation source; separately recorded received, substituted, or missing items. A meal edit cannot change this history. |
| Action receipt / household update | Actor, operation, relevant versions, outcome, and accepted change summary. Used for client retry deduplication and household refresh. |

### Separate status axes

Keep the selected recipe and its coverage/readiness separate. A Thursday leftover dinner may still reference Wednesday's cooking event while its coverage status becomes `needs decision`.

Keep planned portions separate from consumption. Adopting a dinner does not create an eaten-food record.

Keep expected supply separate from received supply. A confirmed future order can inform planning only as expected supply with known timing; it is not evidence that groceries arrived.

## 4. Command and concurrency design

All accepted-plan writes go through server commands. Do not let a browser replace a saved week wholesale as its general save mechanism.

### Command types

- Adopt a whole-week proposal.
- Apply a scoped replacement, move, or backup arrangement.
- Explicitly change a lock or coverage allocation.
- Record a fact such as less left than planned.
- Approve grocery lines and submit a current handoff batch.
- Record confirmed order contents or receipt observations.

Commands include a unique operation identifier and the versions necessary for their scope. Authentication determines the actor and household; client-supplied identities are not authority.

### A. Whole-week adoption

Bind adoption to the accepted-week revision on which the displayed proposal was reviewed. If the accepted week changed, adoption stops without any write. Preserve the proposal as an idea, show the current week, and generate a fresh consequence preview for review.

Do not silently apply an old complete proposal over a newer household decision.

### B. Night-level edits

Send the intended operation and changed targets, not a replacement seven-day snapshot. Check the target night versions and actual affected dependencies. Examples include a moved cooking event, its leftover allocations, the destination night, and any affected lock.

Derive the dependency set on the server rather than trusting an incomplete client declaration.

Acquire a database lock on the current accepted-week record for validation and commit. Read current state after acquiring that lock, and keep version checks and writes inside the same transaction. Night-level versions—not a blanket week-version rejection—decide whether a scoped edit is stale. This lets independent edits commit in sequence without losing either decision.

Inside that transaction:

1. Check the command identity for a prior accepted result.
2. Read the current accepted state.
3. Check target and dependency versions.
4. Apply only the requested scoped operation to that current state.
5. Validate locks, coverage, explicit hard requirements, and relevant timing.
6. Recalculate affected grocery requirements from the resulting current week.
7. Preserve unaffected approvals; mark changed purchase quantities/context for review.
8. Commit the accepted change, revised requirements, action receipt, and household update together.

If Friday changed while Sunday was being previewed, a truly independent Sunday change can still apply. Both survive because neither operation restores the rest of the week from an old snapshot.

Shared grocery ingredients alone are not grounds to reject independent night edits. Recalculate their combined quantities after applying both changes. If two edits share a real dependency or their combination breaks an existing hard requirement, expose that actual conflict; do not silently relax the requirement or overwrite a protected decision.

Coverage validation is command-specific. A new complete-week adoption must meet the agreed Meals chosen conditions. An explicitly reviewed change can expose a named unresolved night without inventing a replacement or claiming the week is complete. Recording a real shortfall must not be rejected merely because it makes coverage incomplete. Known hard exclusions and protected locks remain enforced.

### C. Fact updates

Less left than planned records an observation and recalculates the affected coverage status. It does not issue a replacement command. The selected dinner remains until a member deliberately changes it.

### D. Retry behavior

A repeated command with the same operation identifier returns its recorded result, not a second application. This protects adoption, meal changes, and local handoff initiation from duplicate clicks and client retries.

This is not a claim that a retailer supports exactly-once external writes. Retailer uncertainty is handled separately.

## 5. Visibility and resume behavior

Subscribe to committed household changes. While either person is connected, update the accepted week and current grocery state when a relevant change arrives. Also refetch authoritative state on opening, returning to the app, or reconnecting; an event stream alone is not sufficient recovery.

If Friday changed while a Friday preview was open:

- Show Alex's accepted Friday immediately after synchronization.
- Preserve Jon's unsent replacement as a separate draft.
- Mark that draft as based on an older Friday; explain who changed the accepted dinner.
- Withdraw its authorization to apply. A fresh review is required before it becomes actionable again.

The warning is visible in the preview and accepted-week context, not only as an error after pressing Apply.

An unrelated accepted Friday edit does not automatically invalidate a valid Sunday-only proposal. The application still shows the updated accepted week; scoped validity depends on the actual targets and dependencies.

During loss of connectivity, distinguish last-synced information from confirmed current information. Do not present a local edit as accepted before the server confirms it. Reconnection must not silently replay a stale whole-week snapshot.

## 6. Deterministic planning and grocery calculations

Build these calculations independently of recommendation wording.

### Portions and coverage

Calculate ingredient demand from the selected recipe version, the components assigned to each person's plate, planned dinner repetitions, and reserved lunch portions. Do not use a single whole-meal multiplier while labeling it as chicken-only adjustment.

A leftover meal consumes an allocation from a cooking event; it does not generate a second full recipe purchase. Moving that event reevaluates all dependent coverage and prevents leftovers from being scheduled before their source meal exists.

Known pickup timing constrains planned use of the ingredients expected from that pickup. Missing timing is uncertainty, not evidence that the dinner is covered.

### Ingredients, requests, and availability

Normalize equivalent ingredient identities and compatible units. Do not merge similar words, raw/cooked forms, or products that are not substitutes.

Retain each reason for a requirement. Removing a meal removes its reason, not another person's independent household request.

Deduplicate repeated usual-amount requests while retaining contributors. Preserve an explicit extra quantity. Combining recipe and replenishment needs can yield one grocery line with multiple packages; it must not automatically mean one package.

Have enough is scoped to this cycle and the amount reviewed. A later accepted change that materially increases demand can require a fresh check. Have some without a quantity does not justify a numerical deduction.

### Costs and nutrition

Calculate nutrition from structured ingredient data and component quantities. Display absent data as unknown. Record source and raw/cooked basis instead of inventing values.

Keep estimated pickup spending separate from dinner ingredient cost. Package surplus is not automatically unrelated household spending. Prior purchases can supply dinner ingredients without increasing this checkout estimate.

Calculate a meal's incremental basket cost against the current accepted plan or explicitly labeled preview. An unresolved price must not be turned into zero or treated as proof that a firm budget is satisfied.

### Proposal generation

Generate one complete candidate from eligible recipes, recorded preferences, Sounds good, intended coverage, effort settings, repetition, and novelty settings. Preserve locks.

Separate hard feasibility checks from preference selection. Explain the selected tradeoffs instead of presenting one opaque best-meal score. Attach an evidence type to claims: recorded preference, calculated nutrition/cost, source estimate, or household report.

Fewer sessions and Different dinners produce previews only. A request for variety must not automatically increase novelty. A request for fewer sessions must not merely replace seven dinners with seven quick recipes.

Use a deterministic proposal generator first. Optional language-model assistance may interpret a request or draft an explanation, but cannot authorize a plan write or replace the quantitative calculations.

## 7. Grocery review, confirmed orders, and handoff

### Current review

Every displayed purchase review is bound to a current requirements revision and its approved payload. Approvals distinguish product suitability from exact purchasing quantity.

If an accepted dinner changes during review, show the delta and its reason. Preserve approvals for unchanged lines and remembered suitable products. Changed quantities need current purchase approval rather than inheriting an obsolete send decision.

The server checks review currency under the same relevant week/review locking boundary before authorizing and recording an outbound batch. Send from an obsolete review causes zero new retailer calls. Network operations occur after that transaction, using the exact recorded payload; they do not hold the planning transaction open.

### Before an external order is confirmed

An accepted change can alter remaining shopping needs. It cannot retroactively change the contents of a batch already sent to a retailer. Mark additions not sent; identify removals or differences requiring cart review. Do not claim an automatic deletion capability that has not been verified.

If a valid transfer has already begun when a plan change is accepted, retain the original transfer record and show the new difference separately. Do not rewrite an in-flight payload or replay the whole basket.

### After an order is confirmed

Use explicitly confirmed contents, not an assumed copy of the earlier transfer, as the order record. A user can change quantities or products during external checkout.

On a Friday replacement:

- Change the accepted Friday and current ingredient demand.
- Preserve the recorded order and any purchased/received packages.
- Retain any independent request for the removed recipe's ingredient.
- Calculate the additional requirement after accounting for applicable recorded supply.
- Mark the new chicken as not sent, not as an edit to the confirmed order.
- Show the same delta in Alex's open review.

Received items can resolve requests. Missing items remain unresolved. Subsequent factual corrections or verified order changes get their own observations; meal edits are never authority to rewrite purchase history.

### Retailer capability gate

Verify the actual authorized integration before enabling real sends: account authorization, selected store, product identifiers, price/fulfillment data, cart additions, response semantics, and the checkout destination. Do not assume the prototype's UPCs, endpoint text, or preset success results are valid.

For the first release, pickup selection and order submission remain a retailer checkout handoff unless separately demonstrated capabilities support more. Do not claim automatic pickup scheduling.

Keep authentication secrets server-side. Use clearly labeled mock behavior until verification is complete. A real test addition requires explicit approval of the account, product, and quantity; placing an order is a separate authorization.

Record per-line uncertainty after a timeout. Do not blindly retry an ambiguous external write. Local duplicate suppression does not prove that an external write failed or that it is safe to repeat.

## 8. Acceptance suite

Run shared-use tests with two independent authenticated browser contexts, persistent server state, controlled delays, a deterministic recipe fixture, and a fake retailer adapter that records every outbound call. Assertions must inspect saved records and outbound calls as well as visible text.

Use a fixture with a Wednesday cooking event covering Thursday, independent Friday and Sunday meals, locked-night coverage, an independent salmon request, remembered product matches, an unresolved price/product, and a separately confirmed order snapshot. The fixture's quantities must be explicit; no real household nutritional or allergy settings are implied.

| ID | Scenario | Required result |
|---|---|---|
| T01 | Preview Friday while Alex reviews groceries; then cancel. | Accepted week, portions, and active grocery requirements remain unchanged. No household edit or external call. |
| T02 | Either member adopts the displayed week. | One shared accepted plan; no order, cooking, or consumption record is created. Both contexts render the same accepted revision. |
| T03 | Save Sounds good or change a preference. | Preference/interest persists; accepted assignments, portions, and requirements do not change. |
| T04 | Preview move/replacement affecting leftovers or a locked night. | Consequences show before Apply. Cancellation changes nothing. Protected dinners are not silently moved. |
| T05 | Dinners covered, product/price unresolved. | Meals chosen may be shown. Grocery readiness, availability, and budget compliance are not falsely asserted. |
| T06 | Return after adoption. | Home shows next dinner and actual work. Cooking and leftover nights expose the appropriate instructions. Also need remains reachable. |
| T07 | Record less left than planned. | Dependent coverage becomes unresolved; original selected dinner remains. Recovery is proposed, not applied. |
| T08 | Alex changes Friday while Jon's Friday preview remains open. | Jon sees current accepted Friday and visible stale-preview status without pressing Apply. Draft remains separate and cannot apply as old authorization. |
| T09 | Repeat T08 while Jon's app is backgrounded; return later. | Refresh reveals the newer decision and marks the draft stale on return. No stale week is presented as confirmed current state. |
| T10 | Concurrent independent Friday and Sunday replacements. | Both accepted edits survive. Neither restores other nights. Combined groceries are recalculated correctly. Run both commit orders. |
| T11 | Concurrent replacements of the same target. | One command commits first; the other requires current review and makes no accepted write. Preserve the losing draft. Run both commit orders. |
| T12 | Adopt a whole proposal after any newer accepted-week change. | Adoption stops; it cannot restore an obsolete seven-day snapshot. Current week and refreshed consequences are shown. |
| T13 | Apply an accepted meal change while Alex's grocery review is open. | Alex sees the delta. Unaffected approvals remain. Stale Send produces zero outbound calls. |
| T14 | Apply replacement after order confirmation. | Current plan/requirements change. Confirmed order and purchased packages remain unchanged. Independent requests remain. Newly needed chicken is not sent. Stale Send produces zero outbound calls. |
| T15 | Duplicate click or retry of an accepted command. | Same recorded result; no duplicate adoption, meal edit, or handoff initiation. |
| T16 | External transfer times out after possible acceptance. | Outcome is uncertain; no automatic replay of that ambiguous line or whole basket. |
| T17 | Change a plan after a valid batch has started sending. | Exact started payload and its receipt remain intact; revised needs are separate. No claimed reversal of an external action. |
| T18 | Repeated staple taps, overlapping recipe need, and explicit extra. | Usual request deduplicates with names; source reasons persist; explicit extra quantity survives. |
| T19 | Have some lacks a quantity or reviewed demand increases. | No invented pantry subtraction; quantity uncertainty or renewed review is visible. |
| T20 | Confirm an order, then receive one item and report another missing. | Confirmation did not imply receipt. Received need resolves; missing need remains actionable. |
| T21 | Edit a recipe in the library after adopting it. | Existing accepted assignment retains its selected recipe version unless a deliberate plan change is applied. |
| T22 | Two night edits interact through a leftover source, destination lock, or firm constraint. | Treat the actual dependency as a conflict when necessary; never overwrite a lock or silently relax the requirement. Unrelated-night test T10 must still pass. |

T08/T09, T10–T12, and T14 are mandatory release gates for the user's final three contract cases. They cannot be replaced by a generic check that two clients eventually show the same data.

## 9. Build sequence and exit gates

### Stage 1 — Executable contract and fixtures

Create the explicit test fixture, state definitions, command interfaces, fake retailer adapter, and two-browser harness. Encode the acceptance tests before building a polished interface. Mark failures as missing behavior; do not relabel them as successful sync.

Exit: tests demonstrably exercise the intended failure modes, with exact expected accepted records, requirements, and outbound calls.

### Stage 2 — Persistent shared plan and concurrency

Implement household authentication, versioned records, scoped commands, transactional reconciliation, operation deduplication, update delivery, and resume refresh. Use a minimal Week/Groceries interface and a small structured recipe fixture.

Exit: T01–T04, T07–T12, T15, T21, and T22 pass on two independent clients; restart/reload preserves accepted state. No retailer connection is needed to prove this.

### Stage 3 — Calculations and honest grocery state

Implement component portions, cooking-event coverage, leftover observations, ingredient normalization, request reasons, cycle availability checks, package quantities, costs, and approval invalidation. Add immutable order/transfer fixtures and stale-review checks.

Exit: T05 and T13–T20 pass with a recording fake retailer. Confirmed purchase records remain unchanged under every meal-edit test.

### Stage 4 — Complete the weekly experience

Implement one-week proposals, meaningful change previews, per-person preferences, favorites, Sounds good, Fewer sessions, Different dinners, after-adoption home, Cook, and reheat/serve. Add Explore search and filters/sorts for cooking effort, cuisine, ingredients, estimated nutrition, serving cost, and additional basket cost, keeping those cost measures distinct. Connect the settled Also need capture in Week, Cook, and Groceries. Preserve the visual direction of the HTML where useful without reusing its coupled mutable state.

Exit: T06 passes; the full mock-retailer weekly journey works without manually rebuilding the grocery list; existing concurrency and purchasing gates remain green.

### Stage 5 — Verified retailer integration

Verify supported capabilities with the real authorized account and store, then replace the fake adapter without changing planning semantics. Carry forward the same review versions, payload records, and uncertain-result handling. Retain an explicit checkout handoff and explicit confirmation/receipt semantics.

Exit: an approved real cart-addition test has traceable evidence; unsupported actions remain unavailable rather than simulated; no order has been placed by a mere plan adoption or cart return.

### Stage 6 — Household release validation

Run all acceptance cases against the release candidate. Exercise both event orders in concurrent tests; foreground/background transitions; missed notifications; reload; offline return; duplicate commands; and changed requirements during handoff. Validate saved household settings and accessibility of the mobile controls.

Exit: all mandatory cases pass with evidence tied to the tested build. Any unverified retailer capability is disclosed. Persistent recipes and plans can be exported. No real targets or exclusions come from unconfirmed demo content.

## 10. Deliverables and non-goals

Implementation deliverables:

- Versioned schema and explicit migrations.
- Typed command interfaces and validators.
- Deterministic planning and purchasing calculations.
- Recorded fake retailer adapter and verified production adapter, kept distinct.
- Two-user end-to-end acceptance suite and test evidence tied to a build.
- Mobile-friendly application, account setup, and household data export.
- Setup/deployment notes and an explicit list of verified retailer capabilities.

Not part of this implementation: a permanent pantry inventory, automatic consumption logging, automatic pickup booking without capability proof, automatic replacement of accepted dinners, silent hard-constraint relaxation, a huge scraped recipe catalog, or autonomous purchasing.

The first deliverable is not five polished tabs. It is a small end-to-end slice proving that Jon and Alex can deliberately change the same accepted week without overwriting each other or misrepresenting what has been ordered. The rest of Table is built on that behavior.
