# Table — Implementation Plan

Version: 2.0 · Prepared October 7, 2026  
Owner: Jon · Household: Jon and Alex · Implementation owner: Claude  
Status: build specification, not implemented software or a passing test report.

## 0. Authority, scope, and reading order

Read `Table-Claude-Handoff.md` for execution boundaries and `Table-Initial-Prompt.txt` for the initial coding assignment. This document specifies the product and its build sequence. `SOURCE-REGISTER.md` distinguishes conversation requirements, supplied files, engineering choices, and external verification.

The controlling product contract is:

> Table proposes a week, one household member keeps it, and it stays kept until either member deliberately changes it. After adoption, Table helps carry out the plan. A preview, a preference, an observation, and a missing price do not choose a different dinner.

The accepted week, previews, current grocery requirements, transfer history, confirmed orders, and receipt observations are separate records. The user controls decisions; the application keeps their consequences matched to the current accepted plan.

This version expands the earlier implementation plan into an executable handoff. It preserves T01–T22 and their required results verbatim in section 9. Engineering defaults and supplemental tests are implementation elaborations, not newly asserted household preferences. The earlier plan is preserved under `references/` for traceability, not as a competing work queue.

The uploaded HTML is a visual reference only. Its replacement handler directly mutates a browser array, and its cart results are preset simulations. The syntax-repaired copy fixes startup only. The prior review is historical evidence, not a fresh verification of an implemented Table application. [B1–B3]

### What this assignment is and is not

Build a private, mobile-friendly application for two adults planning dinners and preparing one grocery trip. It includes recipe discovery and favorites, separate editable calorie/macronutrient targets, weekly proposals, deliberate shared adoption, portions and leftovers, budget comparisons, quick grocery capture, consolidated purchasing requirements, and a verified Kroger cart handoff when that integration is available.

Do not turn it into a permanent pantry inventory, a compulsory food log, a general-purpose household dashboard, a chat-only meal generator, an autonomous purchasing agent, or an orchestration project. Do not infer a native iOS requirement. A native app, broad recipe scraping, barcode capture, automatic receipt import, and automatic pickup booking are not initial-release dependencies.

No application implementation, deployment, repository change, authenticated Kroger test, or live cart operation has been performed in preparing this packet.

## 1. Fixed product behavior

### 1.1 One proposed week

During planning, the first screen presents one complete proposed week. The summary distinguishes cooking events, leftover nights, nights out, effort, variety, novelty, pickup spending, and dinner ingredient cost. Alternatives stay behind **Change**, not beside every night.

Each dinner has a short reason supported by its actual basis: recorded preference, saved interest, calculated quantities/cost/nutrition, a recipe's effort estimate, or a household report. Do not invent that a dinner is filling or that both people like it.

**Fewer sessions** and **Different dinners** produce a revised proposal for open nights only. Effort, repetition, and novelty are separate inputs. Fewer cooking sessions does not mean seven shorter recipes; more variety does not automatically mean new recipes. Explain the actual change made. Locks remain protected inside previews.

**Use this week** adopts the exact displayed proposal. A saved proposal is not the accepted plan. Either member may adopt without requiring the other's vote.

### 1.2 After adoption

Home changes emphasis to the next dinner, what its cooking event covers, and outstanding work. The full week stays accessible. A cooking night exposes **Cook**; a leftover night exposes reheat-and-serve instructions. Merely opening those instructions does not record cooking or eating.

The accepted week does not regenerate on app opening, a preference edit, a library edit, a price refresh, or a new saved idea. A selected dinner can remain in place while its coverage, ingredient availability, or budget evidence becomes unresolved.

### 1.3 Deliberate recovery

**Move** relocates the existing meal event, previews affected destinations and leftovers, and does not buy a second copy of its ingredients. Never place leftovers before the source event or silently displace a locked dinner.

**Replace** previews the new recipe, each person's plate, leftover consequences, and purchasing delta. Apply is a separate action. Cancel makes no accepted-plan change.

**Backup** proposes an approved alternative while preserving the original meal as deferred until a destination is chosen. Do not stack two accepted dinners onto the same night. The preview must explain whether the original remains scheduled elsewhere or becomes deferred; it must not silently discard its recipe or ordered ingredients. This is an implementation representation of the settled preservation rule, not an additional pantry feature.

**Less left than planned** records a fact. The future leftover dinner remains selected but becomes unresolved. A recovery may be offered; it is never automatically applied. Facts are not rejected merely because they expose an incomplete week.

### 1.4 Preferences, interest, and capture

**Our Recipes:** durable recipes, household versions and notes, cooking history if explicitly recorded, and independent per-person preferences: Make again, Occasionally, Not for me. Missing feedback means unknown, not approval. A recipe marked Not for me by a relevant eater is excluded from proposals for that eater but stays in the library. It is not silently deleted or converted into a medical exclusion.

**Sounds good:** shared near-term interest with the contributor and saved date. Saving does not schedule. Interests can be archived or cleared explicitly; do not infer a permanently recurring dinner from one save.

**Also need:** one fast shared capture from Week, Groceries, and recipe-relevant ingredients in Cook. A staple tap means buy the usual amount of the last approved package. Unfamiliar entries can remain text until review. Do not ask for a UPC or force a low/out distinction at capture time.

Repeated usual-amount requests merge while retaining contributors. An explicit extra stays extra. Ingredient reasons from a meal and independent household requests remain separate even when shown in one grocery line.

### 1.5 Configuration is real input

Allow each member to enter optional daily and dinner targets separately: calories and grams of protein, carbohydrate, and fat. A dinner-only plan never establishes full-day compliance. Targets and observed consumption are not the same data.

Actual store/location, brand choices, budget scope and limits, exclusions, equipment, portions, and week preferences need explicit saved inputs. Start unset where unknown. The prototype's allergy, targets, $120/$180 budgets, brands, and store text are demonstration content, not confirmed settings. Its six photos were absent from the supplied files. [B1–B3]

## 2. Readiness and screen contract

Use multiple status axes rather than one `ready` flag.

| Axis | Meaning | Not implied |
|---|---|---|
| Accepted choices | Current household-selected assignments and portions | Ordered, cooked, or eaten |
| Meal coverage | Intended dinners and reserved portions are accounted for | Ingredients have arrived |
| Constraint validation | Known hard exclusions/requirements are satisfied, violated, or unknown | Missing data is a pass |
| Grocery review | Units, products, packages, and purchase approval are current | A cart was sent |
| Budget evidence | Estimate for the specified scope is within, over, or unknown | A guaranteed checkout price |
| Transfer | Exact payload has not been sent, is in flight, was acknowledged, failed, or is uncertain | Order confirmation |
| Confirmed order | Contents explicitly confirmed by a member or verified integration | Receipt or unchanged external checkout |
| Receipt | Goods explicitly recorded received, substituted, or missing | Full inventory knowledge or consumption |

**Meals chosen** requires covered intended dinners, explicit portions and planned leftovers, preserved locks, and no known violation of a hard planning requirement. Unresolved pricing/product matching can leave the dinners selected without proving budget or availability.

**Groceries ready** must not appear while required product, unit, quantity, price, or approval information remains unresolved. A deliberately scoped partial handoff, if implemented, must name omitted lines and cannot label the whole trip ready or evade a firm budget. This is optional; complete reviewed handoff is the initial path.

New hard-exclusion information can flag an existing dinner without replacing it. Unknown ingredient compatibility cannot pass a hard-exclusion check for a new adoption or substitute. Do not claim allergen certification from a text match.

A new whole-week adoption cannot pretend an uncovered Thursday is complete. A deliberate scoped recovery may expose a named open night if the user reviews that consequence. Observations may also make an accepted week incomplete. Do not conflate those commands.

Show state-specific sentences such as **Every dinner is covered. Wednesday is unchanged. Grocery review remains.** Avoid generic claims that everything fits.

### Five areas

| Area | Required responsibility |
|---|---|
| Week | Proposal before adoption; next dinner and outstanding work after adoption; scoped change previews; coverage |
| Explore | Search/filter/sort by recipe terms, cuisine, ingredients, effort, nutrition, serving cost, and additional basket cost |
| Our Recipes | Favorites, per-person preferences, household versions, notes, explicit cooking history, manual recipe entry/edit |
| Groceries | Reasons, cycle availability checks, products, packages, approvals, handoff, confirmed contents, receipt exceptions |
| Household | Members, saved inputs, store, budgets, separate target scopes, exclusions, equipment, connection status, export |

Retain the prototype's warm dark palette, restrained accent, serif headings and simple cards where useful. Do not copy fragile handlers, hard-coded dates, numbers, or missing image paths. Use usable fallback artwork or neutral placeholders; do not invent the missing photos. Account for narrow screens, text scaling, accessible focus, labels, contrast, and reduced motion.

## 3. Engineering baseline — defaults, not product requirements

Use a modular monolith: one web application, one server-side command layer, one PostgreSQL database, and one household update mechanism. Avoid microservices, a dedicated message broker, and an LLM dependency for the first release.

| Layer | Default for a new workspace | Boundary |
|---|---|---|
| Application | TypeScript and Next.js, mobile-first web interface | All writes use server commands, regardless of framework conventions |
| Database | PostgreSQL; explicit migrations and parameterized access | Real PostgreSQL in concurrency tests; no in-memory substitute for proof |
| UI state | Separate accepted snapshot and draft/preview state | No write-through cache from browsing to accepted state |
| Validation/calculation | Pure typed domain modules | No retailer or model network call inside a calculation |
| Authentication | Maintained server-side session/auth library selected and pinned at bootstrap | Two distinct users; server-derived identity; never a production name switcher |
| Tests | Unit/integration runner plus Playwright | Independent browser contexts and database/outbound-call assertions |
| Updates | Durable household change records plus active refresh channel | Refresh on foreground/reconnect even when events were missed |
| Retailer | One interface with recording fake and separately configured real adapter | Same purchasing rules for both; no fake success in real mode |
| Local operation | One reproducible app/database setup; environment example without secrets | No account purchase or paid provisioning required to prove the contract |

Next.js's official installation guide documents TypeScript setup; PostgreSQL documents row locks; Playwright documents separate browser contexts. These support the selected tools, not proof that this design has been implemented correctly. [E1–E3]

Reuse a compatible established stack in an actual Table repository rather than rewrite it for these defaults. Record a concise architecture decision explaining any substitution and its test implications. Do not repurpose an unrelated repository. Resolve package/runtime versions from current official documentation during bootstrap, pin the actual installed set, and commit the lockfile. No version numbers in this packet are a compatibility guarantee.

### Suggested module boundaries

```text
src/
  app/                     # routes, pages, authenticated server endpoints
  domain/
    planning/              # proposal, acceptance, scope, locks, coverage
    recipes/               # versions, components, preferences, source metadata
    groceries/             # demand, requests, package math, approval fingerprints
    purchasing/            # handoffs, orders, receipts, uncertain outcomes
  server/
    commands/              # transactional mutations and authorization
    queries/               # coherent household snapshots
    db/                    # repositories and migrations
    sync/                  # committed-change delivery/resume
    integrations/          # fake retailer, Kroger, nutrition-source boundary
  ui/                      # accepted-state views and isolated preview components
tests/
  fixtures/
  unit/
  integration/
  e2e/
docs/table/
```

Adapt directory names to the chosen framework; preserve these responsibilities. Do not create unused abstraction layers merely to reproduce the tree.

## 4. Persistent records and revision model

Records may be combined where transactions and meaning remain clear. A single mutable household JSON blob plus `sent` and `orderPlaced` booleans is not sufficient.

| Record | Minimum responsibilities |
|---|---|
| Household / membership | Authorized members, actor attribution, timezone, selected store, update sequence |
| Profile / constraints | Per-person targets/scopes, preferences, exclusions, household configuration; versioned inputs |
| Recipe / recipe version | Immutable structured ingredients, quantities, components, units, yield, instructions, reheat/serve, source/estimate metadata; household edits create versions |
| Week | Stable household/week identity, accepted choice revision, intended coverage |
| Assignment / cooking event | Stable IDs and per-target revisions; date, kind, recipe version, lock, component portions |
| Coverage allocation | Source cooking event, recipient/date, planned amount, reserved lunch portions, coverage status |
| Proposal / preview | Exact reviewed content or operation, content hash, base week revision, target/dependency revisions, consequence view |
| Interest / preference / note | Member identity and persistence independent of accepted plan |
| Household request | Ingredient/product intent, usual versus explicit extra, quantity if known, contributors, cycle, active/resolved state |
| Availability observation | Have enough/some/need; reviewed quantity and demand fingerprint; cycle/date/actor; no invented deduction |
| Requirement projection | Current accepted-source versions, ingredient needs, source reasons, quantity basis and uncertainty |
| Mapping / product snapshot | Ingredient suitability, store/product identifiers, package size, price basis/timestamp, fulfillment evidence |
| Purchase approval / review | Specific line fingerprint and quantity approval; current review snapshot/payload identity |
| Handoff batch / attempt | Frozen outbound payload, authorization source, attempt identity/status, returned evidence, uncertainty |
| Confirmed order / line | Explicit contents and confirmation source/time; incomplete contents labeled as such |
| Receipt / supply allocation | Received/missing/substituted observations; expected versus received supply; allocations that prevent double counting |
| Command receipt / change event | Unique operation ID and request hash, actor/household, accepted outcome, revisions, committed change summary |

### Required revision distinctions

`acceptedChoiceRevision` changes when accepted choices, dates, portions, locks, or allocations deliberately change. Assignment revisions identify the targets actually changed. Observations and purchasing events have their own versions and may change readiness without changing selected dinners.

A preview pins its recipe version and proposed component portions. A later library edit cannot mutate an accepted dinner or the reviewed preview. A whole-week adoption binds to the accepted-choice revision reviewed. Scoped changes bind to target and actual dependency revisions, not a blanket comparison of the entire week revision.

The grocery review fingerprint includes relevant accepted demand, household requests, availability observations, product/store/package choices, purchase quantities, applicable supply, and price evidence. A mapping can remain suitable while a specific purchase approval becomes stale.

Coherent snapshot reads must return a matched accepted plan, requirements, and their versions. An event arriving first must not cause the UI to combine a new Friday with old requirements and label them current. Use an appropriate transaction/snapshot read or version verification and retry.

Use decimal/precise quantity representations and explicit units; money should use currency plus exact minor units or decimal values. Unknown is a distinct value, not zero. Store event timestamps separately from household-local meal dates. The household's configured timezone—not the browser clock—determines the next dinner.

## 5. Server commands and simultaneous use

### 5.1 Command boundary

All mutations are authenticated server commands. A client sends intention, review identity, and expected versions. It does not supply authoritative actor identity, arbitrary household ownership, a whole-week save object for a night edit, or a client-calculated write set.

Representative commands:

- `AdoptWeekProposal(proposalId, reviewedHash, expectedAcceptedChoiceRevision)`
- `ApplyPlanChange(previewId, reviewedHash)` with replace/move/backup semantics
- `SetNightLock(assignmentId, expectedAssignmentRevision, desiredLock)`
- `RecordLeftoverShortfall(cookingEventId, observation)`
- `SaveInterest`, `SetRecipePreference`, `SaveHouseholdRecipeVersion`
- `CaptureHouseholdNeed`, `RecordAvailability`, `ApprovePurchaseLines`
- `StartHandoff(reviewId, payloadHash)`
- `ConfirmOrder(contentsOrExplicitUnknown, pickupObservation)`
- `RecordReceipt(orderLineId, received/missing/substituted)`

Every command carries a unique operation ID. Return a durable action receipt containing the accepted result or the precise reason no write occurred. Preserve drafts on conflict. A success response alone is not evidence of an external order.

### 5.2 Short transactions; scope-aware conflict handling

Engineering default: serialize relevant mutations with a short database lock on the household coordination row, then acquire any additional records in a consistent order. This covers plan writes, requests, availability, order/receipt changes, approvals, and handoff authorization affecting the same basket. An existing Table implementation may instead use equivalent week/review coordination if cross-source races are demonstrably covered.

The lock orders commits; it does not make every unrelated edit stale. Per-target/dependency validation determines conflict. PostgreSQL's `FOR UPDATE` can lock the selected row through transaction completion; it is not a substitute for the application checks. [E2]

Inside one command transaction:

1. Derive actor and household from the authenticated session; verify membership.
2. Acquire the coordination lock; read the current state after acquiring it.
3. Resolve the command ID. The same ID and request hash returns its recorded outcome. The same ID with a different payload is rejected. Scope IDs to the household and authorized actor.
4. Load the server-stored reviewed proposal/preview. Derive targets and dependency closure on the server.
5. Validate the correct revisions, pinned contents, locks, relevant hard requirements, and timing. Recheck current facts that can invalidate feasibility.
6. Apply only the intended scoped change to current state, or reject without partial accepted writes.
7. Recalculate affected coverage and active requirements, preserving independent reasons and known purchasing history.
8. Preserve unchanged approvals and invalidate changed purchase fingerprints.
9. Commit choices, projections, command receipt, and household change event together.
10. Deliver updates after commit. No database transaction stays open awaiting a browser, a model, or a retailer response.

A retry of an aborted database transaction revalidates versions; it cannot blindly replay a formerly valid decision. Local idempotency does not establish external exactly-once delivery.

### 5.3 Three mandatory concurrency cases

**Visible stale preview:** Jon leaves Friday's preview open. Alex accepts a Friday replacement. Jon's accepted-week context becomes Alex's Friday. His draft remains visible separately and is marked stale before he presses Apply. On foreground/reconnect, re-fetch and mark stale before enabling acceptance. The warning cannot exist only in the command response.

**Different nights:** Jon replaces Sunday while Alex replaces independent Friday. Both apply as scoped changes to the current week, regardless of commit order. Neither restores the remaining six nights. A shared ingredient alone is not a plan conflict; combined demand is recalculated.

**Same target or whole proposal:** After a newer Friday decision, an old Friday preview requires renewed review and makes no accepted write. A full proposal based on an older accepted-choice revision also stops. Either member may decide; neither unknowingly erases a newer decision.

Real dependencies include a moved destination, lock, source cooking event, leftover allocation, and a hard requirement violated by the combined result. Independent-night acceptance does not permit silent constraint relaxation. An unrelated change may alter the displayed aggregate grocery estimate without changing the authorized meal content; show the updated estimate and revalidate actual hard limits. Never modify the requested recipe/plate merely to force it through.

### 5.4 Update delivery and offline behavior

Deliver committed household changes while active; refetch authoritative snapshots on app opening, foreground, reconnect, and a detected event gap. Event IDs/revisions allow duplicate and out-of-order updates to be ignored. A notification is an invalidation signal, not a second authority for writes.

A modest foreground polling fallback is acceptable if the primary channel fails; record its chosen interval and test it. Do not describe device background behavior as continuously live. Offline browsing may display last-synced data explicitly. Disable accepted-plan writes and real handoffs while currency cannot be established; retain drafts for review after reconnection rather than silently replaying them.

Do not count two tabs sharing one login and one in-memory store as two-user proof. Use two sessions, a persistent database, delayed requests, missed updates, and restarts.

## 6. Quantities, nutrition, coverage, and budget calculations

### 6.1 Structured recipes and plates

Every recipe used for planning needs structured ingredient identities, amount/unit/basis, component membership, yield, and instructions. Component portion changes recalculate only the affected components. Increasing chicken must not multiply rice, oil, or vegetables unless their portions were also changed.

Compute cooking-event demand once from all allocated plates: tonight's two portions, planned leftover dinners, and reserved lunches. A leftover assignment draws from that batch; it does not create a second recipe purchase. Detect total allocations exceeding the batch and allocations occurring before the cooking event.

Source nutrition from mapped food records or explicitly entered label data with provenance. USDA FoodData Central offers food search/details and requires an API key; secure it on the server. Missing nutrient fields remain unknown. Its data access does not solve recipe mapping or raw/cooked yield interpretation. [E4]

For automated tests, synthetic nutrient/product values are acceptable only with unmistakable fixture labeling. Production profiles and recipes must not silently inherit those values. Never invent nutrition totals with a language model. Record estimates as estimates. Daily targets are not inferred from dinner or from the user's prior personal profile.

### 6.2 Ingredient consolidation

Normalize equivalent identities and compatible units. Preserve form (raw/cooked), variety where material, and unit basis. An ounce of mass is not a fluid ounce. A bunch/can/clamshell is not a known mass unless an explicit mapping provides it. Unknown conversion remains a review item.

For a known fixed-size package with compatible units:

```text
meal demand = sum of ingredient quantities allocated to accepted cooking events
net meal demand = max(0, meal demand - applicable, confirmed, allocated supply)
package count = ceiling(approved purchasing demand / usable quantity per package)
```

This simple ceiling rule is a unit-test case, not an assertion that weighted products have fixed contents. Variable-weight items require a stated quantity convention and an estimate/uncertainty that survives into review. Avoid binary floating-point rounding that understates required packages.

Availability is scoped to the reviewed cycle and amount. **Have enough** covers what was reviewed, not unlimited future demand. **Have some** without quantity supplies no numeric subtraction. A later increase can reopen that line without clearing unrelated approvals.

### 6.3 Usual replenishment versus additional quantity

Treat usual replenishment as a minimum purchase request, not automatically extra to all recipe demand. Two taps of the same usual amount create one request with two contributors. Recipe demand and a usual request can share a package; explicit additional packages remain additive.

Example fixture: recipe uses 8 oz; usual replenishment requests one 32 oz tub; no other demand or supply. One tub can satisfy the default request. An explicit request for one additional breakfast tub yields two tubs. A recipe using most of the tub must show the amount left and an obvious **Keep an extra** option; do not claim one package necessarily covers the household's intended reserve.

Keep all source reasons. Removing the recipe removes its demand, not the replenishment request. Received supply resolves requests only for the quantities/reasons actually covered. Missing goods do not resolve them.

Before handoff, new captures join the upcoming cycle. Between handoff and confirmed checkout, additions say **Not sent yet**. After order confirmation, check whether an item is already expected in that order before defaulting to a next-cycle request. Offer **Add another**, not a silent duplicate. Explicit extras retain their own quantity.

### 6.4 Expected versus received supply

An order confirmation is expected supply; a receipt observation is received supply. Convert/link those states without double counting the same package. A manual **Order placed** observation without line contents may establish that an order exists but cannot establish that every transferred item was included.

Known pickup timing constrains when expected goods can support dinners. Missing pickup time is unresolved availability, not proof of timely supply. After groceries are received, replacement proposals should prefer applicable known goods, not invented stock. Do not infer a full pantry from a purchase history.

### 6.5 Three honest cost views

**Dinner ingredient cost** measures the estimated value used by planned meals. **Pickup spending** measures packages expected in this purchase. **Additional basket cost** measures the difference caused by a specified proposed change against a labeled baseline.

Do not compute unrelated household spending as pickup spending minus ingredient cost. A $5 bag with $1 used this week may supply future dinners. Prior purchases can feed this week without affecting this checkout. Keep unknown prices out of numeric subtotals presented as complete totals.

Price evidence includes store, currency, regular/promotional/member qualification when known, unit/package basis, and freshness. Show known subtotal and unresolved count when incomplete. Rank known cost values meaningfully and put unknowns in a labeled group, not as zero-cost options.

A firm budget is evaluated against its saved scope and current evidence. Unknown pricing cannot prove compliance. Product prices or availability can change readiness without editing selected dinners. Do not promise an exact final checkout total; Kroger's pickup guidance describes possible final-charge changes and timeslot selection during checkout. [E6]

### 6.6 Initial proposal engine

Implement a deterministic feasible-candidate generator over the structured local recipe collection. Apply hard eligibility checks before preference selection. Respect locks and coverage; use per-person preferences, current interests, recent repetition, desired cooking sessions, and novelty limits. Quantitative results come from the same modules used by groceries and the meal view.

A simple explainable search/selection algorithm is sufficient for this household; no machine-learning training, vector database, or universal optimizer is required. Internal heuristics are engineering choices. Expose the meaningful tradeoffs rather than presenting an opaque universal best score.

When no complete feasible proposal exists, return a draft with named unresolved needs. Do not auto-relax an exclusion or claim a partial result is complete. Optional future model assistance can interpret plain language and explain validated options; it never writes the accepted week or purchasing records directly.

## 7. Grocery approval, handoff, orders, and receipts

### 7.1 Open review after an accepted change

Previewing a replacement causes no active grocery change. Applying it does. An open grocery view must show the updated requirements, reasons, and purchasing consequences without a reload requirement.

Example: **Jon replaced Friday. Chicken increased. Salmon is no longer required for dinner.** Preserve any independent salmon request and any ordered/received salmon. Keep remembered product suitability and approvals for unchanged fingerprints. Changed quantities require current purchase approval.

### 7.2 Authorize and freeze a payload

`StartHandoff` validates the review revision and exact payload under the same coordination boundary as demand/supply/request mutations. A stale review results in zero new adapter calls. The server persists an authorized immutable batch, consumes the authorization once, and records which unfulfilled purchase quantities the batch covers.

A second click with a new client operation ID must not send the same approved demand again merely because it bypasses the original ID. Deduplicate/reserve at the purchase-review and demand-coverage level as well as the command level. A changed requirement creates a new explicit delta, not permission to resend the whole basket.

Use a clear external dispatch boundary. Before a queued batch has been marked dispatch-started, revalidate it under the coordination lock; cancel for renewed review if superseded. Once dispatch-started is committed, preserve its exact payload and handle later meal changes as separate deltas. Network I/O occurs outside the transaction. There is an unavoidable gap between committing dispatch intent and an external response; do not promise atomicity between the database and Kroger.

If a process crashes after dispatch-started or a response is ambiguous, mark the affected outcome uncertain. Do not automatically replay it. Exact-once retailer writes are not inferred from a local operation ID or an HTTP verb.

### 7.3 Outcomes must match evidence

Record not sent, authorized, dispatch-started/in-flight, acknowledged, definitely failed, canceled-before-dispatch, or uncertain with attempt evidence. An acknowledged cart request is not verified order placement.

Do not fabricate per-line results when the real API only supports a batch-level result. Propagate ambiguity to the whole affected batch/lines and record only the granularity actually supported. The fake adapter must test success, explicit failure, and acceptance-followed-by-timeout; it must not teach the UI capabilities the real API lacks.

Before checkout, a meal change may leave previously sent goods in the retailer cart. Identify the difference; do not claim to remove them automatically unless that capability is separately verified and authorized.

After confirmation, a meal change never edits confirmed order contents. New chicken is **Not sent yet** and needs a new deliberate purchasing decision. An already ordered salmon package remains ordered; a received one remains received. Authorized factual corrections or independently verified external changes can add new observations, never masquerade as a meal edit.

### 7.4 Kroger capability gate

Kroger's public Postman workspace exposes an add-to-cart request, but that does not establish Jon's account access, required credentials, product matching, response semantics, or current checkout automation. Direct developer pages returned only an application shell during this packet's check. Their full current schemas and authorization details remain an implementation verification task. [E5, E7]

Keep real sending disabled until Claude has recorded evidence for the configured integration: official schema/version/date, supported authorization and scopes, intended store/account, product identifiers and package quantities, returned price/fulfillment fields, exact add semantics, response/error behavior, permitted rate/retry behavior, and checkout destination.

Use secure server-side credentials and the supported customer authorization flow. Never collect a Kroger password in Table, copy browser cookies, automate around access controls, or assume the prototype's UPCs are valid. Do not log tokens.

The initial real path is prepared groceries → explicit approved cart transfer → open Kroger → user chooses pickup and confirms checkout. Automatic pickup reservation/order submission, full cart reading/deletion, native shopping-list sync, order-history import, and receipt retrieval are **unverified**, not claimed impossible and not promised features. Further capability requires separate proof and authorization.

Missing credentials block live integration, not the mock workflow. Documentation/code preparation may continue. No real addition, purchase, pickup reservation, account creation, or paid service provisioning is authorized by this planning packet alone.

## 8. Security, persistence, and operational requirements

Authenticate both members separately and check household membership on every read, mutation, event stream, export, and draft access. Membership is server-derived. Prevent cross-household ID substitution even though the intended initial household has only two people.

Select a maintained authentication/session solution, pin it, and configure secure cookies, appropriate CSRF/origin protections, session expiration, and secret handling according to its official guidance. Do not invent cryptography or ship a dev identity header as production authentication. Test helpers must be restricted to test/local mode and absent or rejected in production.

Keep retailer/nutrition keys on the server and out of client bundles, exported household data, test traces, screenshots, and Git. Use an environment example with placeholders and validation. Fail closed for real retailer mode when configuration is incomplete; never silently substitute fake success.

Treat imported recipe text and URLs as untrusted data. Render safely without executing markup. Manual entry is sufficient initially; URL importing is optional. Any later server-side fetching needs destination restrictions, response limits, and review before a recipe becomes a valid planning input.

Use explicit migrations, fixture seeding only in named disposable environments, and no production reset commands in normal startup. Provide household export for recipes/versions/preferences/plans and readable grocery data, excluding credentials. Supply backup/restore instructions and test a database restore in an isolated environment before household deployment.

Offline copies are last-synced views, not a second source of truth. A service worker/PWA install experience is optional; do not cache authenticated data across users or replay sensitive writes on reconnect without validation.

Application logs should expose command IDs, non-secret revision information, conflict reasons, and integration outcomes sufficient to diagnose behavior. Do not create a new analytics dashboard, surveillance feature, or external telemetry requirement for this household app.

## 9. Acceptance tests and evidence

### 9.1 Preserved product acceptance tests — T01–T22

The following table is copied verbatim from the earlier implementation plan. IDs and required outcomes are not renumbered or weakened. Passing a generic synchronization test is not a substitute. These are specifications; no test in this packet has been executed against a new application. [B2]

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

T08/T09, T10–T12, and T14 are mandatory release gates for the final three contract cases. Run both commit orders for concurrent operations. A night command based on an old overall week must still apply when its actual target/dependencies are unchanged; otherwise T10 has been defeated by a blanket conflict rule.

### 9.2 Supplemental engineering tests — X01–X12

These are derived implementation safeguards, not replacements for the settled tests. They make the state contract durable and measurable.

| ID | Required check | Pass condition |
|---|---|---|
| X01 | Authorization and household isolation | Another household's IDs and an unauthenticated session cannot read/write plans, drafts, purchases, events, or exports; no side effects. |
| X02 | Persistent state and event recovery | App/database process restart, missed events, duplicate events, and delayed older responses cannot erase or roll back the accepted state; both users re-fetch coherent snapshots. |
| X03 | Command identity and purchase deduplication | Same command ID plus same payload returns the original result; same ID/different payload rejects. Concurrent sends with different IDs for the same consumed review/demand produce one authorized transfer, not two. |
| X04 | Send/change race at dispatch boundary | Superseded queued work is canceled before dispatch-started. Once dispatch-started, exact payload/history remain immutable and later demand becomes a separate delta. Neither race order silently resends the basket. |
| X05 | Realistic adapter granularity and crash recovery | Batch-only responses do not become invented per-line successes. Acceptance plus lost response, or crash after dispatch intent, becomes uncertain and is not automatically retried. |
| X06 | Portion/unit/nutrition arithmetic | Component-only changes affect the selected components, leftover batches are counted once, units round packages correctly, and missing conversion/nutrition values remain unknown. |
| X07 | Cost scope and unknowns | Recipe usage cost, pickup package spending, and incremental basket cost stay distinct. Unknown prices are not zero. New constraints/facts can change validation without changing dinner selection. |
| X08 | Locked choices, coverage, dates, and policy changes | Timing across pickup, cooking, leftovers, local midnight and daylight-saving transitions uses household dates correctly; locks and exclusions remain enforced. A new exclusion flags current dinner rather than replacing it. |
| X09 | Capture-to-receipt lifecycle and supply | A staple already in the confirmed order is identified before a next-cycle duplicate is created; explicit extra remains extra. Ordered/received views of the same package are not double-counted. |
| X10 | Functional discovery and persistence | Multi-character search keeps focus; advertised sorts use actual values; preferences/notes/favorites/Sounds good persist; opening a recipe opens the selected recipe; editing one does not mutate pinned meals. |
| X11 | Mobile, accessibility, and genuine two-user operation | Controls work on narrow/mobile layouts and with keyboard/text scaling; stale state is visible without color alone; two sessions use distinct authenticated identities. Do not claim device Safari testing from WebKit automation alone. |
| X12 | Export/restore, secrets, and environment separation | Export omits secrets and round-trips supported household data; isolated restore works; test helpers are blocked in production; incomplete real configuration never reports mock success as live. |

### 9.3 Deterministic fixture

Create a named disposable test household with two separately authenticated test members, a Wednesday cook/Thursday leftover dependency, independent Friday and Sunday assignments, a protected-night variant, overlapping chicken demand, an independent salmon replenishment request, known and unresolved products/prices, and a separately confirmed order whose contents differ from a cart-transfer fixture.

Specify every quantity, unit, recipe version, portion, expected grocery line, and price used in assertions. Use a fixed household clock/timezone and two explicit request-order barriers. Separate fixture variants for hard constraints and unpriced products so one test does not accidentally block another. Include equal and unequal portions plus a reserved lunch. Test-only identities/nutrition/allergies/products must not initialize the real household.

The fake retailer records exact request bodies, call count, dispatch IDs, and result/timeout behavior. It must be able to acknowledge, reject, accept then lose its response, delay response until a meal edit commits, and return a batch-only outcome.

### 9.4 How to prove the outcomes

Use real PostgreSQL transactions and a real running server. Playwright should create two independent authenticated browser contexts; its isolation model supports separate cookies/storage. [E3] Use explicit barriers for concurrency rather than sleep-based hopes about which request wins. Each test verifies visible UI, persisted assignments/revisions/requirements, immutable purchasing records, and adapter calls where relevant.

For T01, T03 and canceled previews, compare the protected accepted rows and active requirements before/after. A preview may persist a draft, but cannot produce an accepted-plan mutation or active grocery event. For T10, assert exact Friday and Sunday versions/recipes and untouched other nights, not just that both clients agree. For T11/T12, assert the rejected command made no accepted write. For T13/T14, invoke Send from the deliberately old review and assert **zero new adapter calls**, including delayed jobs.

At first implementation, make the contract suite fail for genuine missing behavior, not only for missing imports or a broken test setup. Demonstrate at least one negative control, such as deliberately using a stale target in a tested request and observing rejection. Do not edit an expected result, skip a required test, use two tabs of one identity, or replace PostgreSQL with a local array to manufacture green evidence.

Maintain statuses `NOT IMPLEMENTED`, `IMPLEMENTED / NOT RUN`, `PASS`, `FAIL`, and `BLOCKED`. A skeleton or skipped test is not a pass. A green phase subset is not the whole release suite. Evidence records the build/commit or workspace hash, commands, runtime/database versions, pass/fail/skip counts, both concurrency orders, and redacted trace/report locations.

## 10. Six-stage build sequence

The initial Claude assignment is stages 1–4, starting with the first working slice below. Stages 5–6 remain part of the full implementation plan; live external operations and deployment require their own authorization and actual access. Proceed between completed internal milestones without asking for routine approval. Do not bypass a failed gate to accumulate features.

### Stage 1 — Executable contract and fixtures

**Outcome:** A reproducible workspace, decision record, schema/command vocabulary, explicit fixture, recording fake adapter, and running two-user test harness.

**Work:** Inspect only the actual Table workspace and its instructions. Preserve the source packet. Pin the stack and actual dependency versions. Set up local PostgreSQL, migrations, environment validation, independent test sessions, a coherent snapshot endpoint, and contract-test scaffolding. Write the first failing behavioral tests and an acceptance register containing T01–T22 and X01–X12. Implement only the infrastructure necessary for those tests.

**Exit:** App and database start from documented steps, the harness reaches real server paths, fixtures are explicit, and missing behavior is reported truthfully. No polished five-tab mockup is substituted for this milestone.

### Stage 2 — Persistent shared plan and concurrency

**Outcome:** Either member can deliberately adopt/change the shared plan without overwriting independent decisions.

**Work:** Implement persistent recipe versions and assignments, proposals, adoption, scoped replace/move/backup/lock commands, dependency validation, command receipts, facts versus choices, atomic projections sufficient for the fixture, household updates, foreground refresh, and a minimal Week/Groceries view. Include canceled previews, saved interest/preferences, and recipe pinning at the domain/API level.

**Exit tests:** T01–T04, T07–T12, T21–T22; plan-command portions of T15; X01–X02 and command-identity portions of X03. Exercise all relevant commit orders. Scenarios needing later full arithmetic may use explicit fixture data but must still execute real domain rules, not hard-coded expected outcomes.

**First working slice:** Two sessions start from the same accepted week. Jon previews Friday while Alex reviews groceries. A canceled preview has no accepted effect. Independent Sunday and Friday replacements both survive; conflicting Friday edits do not. Stale status is visible without Apply and after foreground return. Both views survive reload/restart. The recording adapter exists but no real retailer is contacted. Deliver evidence before expanding the interface.

### Stage 3 — Quantities and honest grocery state

**Outcome:** Current ingredient/package requirements, reviewed purchasing, and confirmed history stay consistent after accepted changes.

**Work:** Implement component portions and batch allocations; compatible-unit conversion and known-supply allocation; usual/extra requests and source reasons; cycle availability; mappings/packages/price evidence; separate cost measures; per-line fingerprints and review snapshots; idempotent handoff authorization/dispatch; immutable batch/order content; manual confirmation and receipt exceptions. Broaden beyond the first fixture.

**Exit tests:** T05, T13–T20, remaining T15 behavior, and X03–X09 where relevant. All confirmed-order invariance cases run against real persistence and the recording fake. Stale sends make zero adapter calls. Stage 2 tests remain green.

### Stage 4 — Complete the household experience

**Outcome:** A usable end-to-end application against a clearly labeled simulated retailer, not merely a state-model demonstration.

**Work:** One complete proposal, Change alternatives, independent effort/variety/novelty controls, meaningful explanation labels, after-adoption home, next dinner, Cook/reheat-and-serve, coverage choices including reserved lunches, persistent favorites and notes, Sounds good, all three Also need entry points, real search/filter/sort, saved household inputs, manual structured recipe entry/edit, and readable export. Adapt the visual reference without restoring its fake behavior.

Use a small complete sample collection with explicit provenance/estimate labels. Do not turn incomplete prototype recipes into verified nutrition or product mappings. Real household setup remains an explicit input flow, not seeded assumptions. Missing photographs are not blockers; use clear fallbacks. Recipe URL import and AI-assisted exploration are optional follow-ons, not requirements for this stage.

**Exit:** T01–T22 pass with the fake retailer; X01–X10 pass; mobile/accessibility and environment/export checks in X11–X12 are run to the extent available and remaining device/deployment validation is disclosed. The whole mock workflow works across two sessions without manually rebuilding groceries. Mark the retailer visibly simulated. Provide runnable setup and evidence, not a claimed production launch.

### Stage 5 — Verified Kroger integration

**Outcome:** Real account/store product selection and approved cart handoff, without changing product-state semantics.

**Work:** Read current primary API guidance, record a capability matrix, wire secure customer authorization and product lookup, resolve price/unit/fulfillment semantics, implement exact payload/response mapping, and retain uncertainty/duplicate rules. Verify a checkout destination. Use permitted recorded fixtures for provider contract tests. Never manufacture unsupported cart/order features.

**Exit:** Current schemas/auth choices documented; explicit approval identifies the account, actual product(s), quantity, and permitted real write; a real approved addition has redacted request/response evidence; checkout remains separate. A missing credential or absent permission marks this stage BLOCKED, not simulated PASS. Writing an adapter without a live test is implementation progress, not verified integration.

### Stage 6 — Household release validation

**Outcome:** A tested private deployment candidate and an honest release record.

**Work:** Run all settled and supplemental cases against the identified candidate, with two independent sessions and both concurrency orders; production build/type/lint checks; migrations; backup/restore; secrets and access-control tests; mobile text/keyboard checks; selected browser automation and physical-device checks where access exists. Verify service restart and update-channel recovery in the actual hosting configuration. Prepare private deployment instructions without provisioning paid services or publishing publicly by assumption.

**Exit:** T01–T22 and X01–X12 pass or any unavailable environment-specific verification is explicitly listed as a release blocker. Production auth and real retailer capabilities are actually verified before claiming a real household release. No demo identity bypass or fixture assumptions ship as real household configuration. Deployment is a separate authorized action, not implied by local green tests.

### Sequencing rule

Stages describe outcomes, not permission to defer all tests until the end. Keep the accepted-plan/concurrency gates running throughout. Build a thin legitimate implementation of a dependency when needed; do not make tests artificially pass with demo constants. Reduce scope before relaxing the contract.

## 11. Claude deliverables and durable execution

Within the Table repository, Claude should maintain only a small operating set in addition to code:

- `CLAUDE.md`: short project entrypoint, source precedence, commands and non-negotiable write boundaries; preserve existing guidance and link rather than duplicate the full plan.
- `docs/table/IMPLEMENTATION-STATUS.md`: stage, accepted design decisions, exact workspace/branch/commit, evidence, remaining blockers, and next executable task.
- `docs/table/BACKLOG.md`: bounded executable items with outcome, allowed files/areas, dependencies, test IDs, and done criteria.
- `docs/table/ACCEPTANCE.md`: T01–T22 and X01–X12 mapped to actual test locations and current evidence; no unsupported PASS labels.
- `docs/table/DECISIONS.md`: concise engineering choices/deviations; do not reopen settled UX.
- `docs/table/INTEGRATION-CAPABILITIES.md`: documented, implemented, fixture-tested, live-verified, or blocked for each retailer operation.

These are working checkpoints, not a new coordination framework. One integration owner remains accountable. Use only actually available coding tools; do not claim to create workers, run CI, deploy, or contact another agent when that did not happen.

Commit coherent tested work only inside the authorized Table workspace, observing existing hooks and policies. Never alter unrelated projects, reset someone else's checkout, bypass gates, or overwrite user changes to obtain a clean status. Push/create a remote or pull request only if the destination and permission are established in that coding session; otherwise leave a local commit or patch and report the exact state.

Before context compaction, session termination, or a genuine blocker, save current status, evidence, and the next task. A future session must be able to resume from repository files without Jon reconstructing this conversation or acting as a courier between workers. A checkpoint is not a claim that execution will continue after the session stops.

### Required completion report

Report the actual result in this order:

1. Delivered behavior and the stage reached; distinguish working fake integration from verified live integration.
2. Exact branch/commit or workspace identity, changed-file scope, and whether changes are local, pushed, or deployed.
3. Reproducible setup/test commands and actual results, including failures, skips, both concurrency orders, and evidence locations.
4. T01–T22/X01–X12 coverage, unresolved defects and integration/device blockers.
5. Next ready backlog item and only genuinely necessary owner actions; do not ask for routine permission to continue internal coding.

A plan, screenshot, stubbed toast, named test, and source-code implementation are distinct from executed passing behavior. The final evidence must make that distinction visible.

## 12. Completion standard and non-goals

The complete product is ready for household use when Jon and Alex can choose one week, retain independent deliberate changes, see their respective plates and planned leftovers, review a coherent purchasing list, complete a verified Kroger handoff, and distinguish what is selected, ordered, received, and still unresolved. The app must remain useful when the week changes without silently changing their decisions.

The first coding assignment intentionally proves the full mock-retailer journey first. It does not claim that pickup scheduling, checkout submission, clinical nutrition suitability, exact final prices, recipe safety, or a complete inventory can be inferred from that proof.

Do not add autonomous replanning, implicit order edits, a compulsory pantry, mandatory dual approval, opaque nutrition guesses, a recommendation score that hides constraint violations, or a product launch disguised as a development test.

**Keep the week stable. Keep the facts current. Require a deliberate decision to change the former or to make a new purchase.**
