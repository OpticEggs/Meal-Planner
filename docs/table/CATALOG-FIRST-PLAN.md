# Table — Catalog-first meal selection: plan for owner approval

_Prepared 2026-10-11 on `main` = `99c837b` (verified app code `8ae5497`). **This is a plan only.** No UI or
schema has changed for it. Implementation starts only after the owner approves the interaction and
design, with any of the decisions in §6 changed. Screen mock-ups are published alongside this plan (see the
delivery message); they are drawings, not screenshots of the app._

## 1. What changes for the household

Today: import → Our Recipes → **Week** (choose a night, adopt a plan) → Groceries. Owner walkthrough
(2026-10-10/11): photo and method missing; an outside click lost import-review work; no "Add to week" on a
recipe; choosing a day before groceries is unwanted; the consolidated list was hard to follow.

Proposed: **Recipes** (photo gallery) → **+** adds a meal to the shared **Selected Meals** list with a
servings count → **Groceries** shows one combined checklist for that list. No date is ever asked for.

Primary navigation becomes **Recipes · Selected (count) · Groceries · More**. More holds the dinner
calendar (today's Week, unchanged), Household, Saved links and the Budget Bytes lane. Explore's search and
filters move into Recipes. Signing in lands on Recipes.

## 2. Contract and invariant map

### Reused unchanged
| System | Where | Why it carries over |
|---|---|---|
| Command framework: household row lock, idempotent operation ids, receipts, change events, 409 conflicts | `src/server/commands/framework.ts` | Every selection change is a command like any other. |
| Live refresh between members (SSE invalidation, snapshot in one REPEATABLE READ read, currency gating) | `src/app/api/events`, `src/ui/store.tsx` | The second member sees changes the same way they see grocery and plan changes now. |
| Exact demand arithmetic: per-portion exact rationals, `eventDemand`, `convertQ`, `packagesForQ` (BigInt ceiling) | `src/domain/recipes/plate.ts`, `src/domain/exact.ts`, `src/domain/quantity.ts` | A selected meal becomes one more demand source and goes through the same functions. |
| Grocery projection: unit combination before rounding, seasonings, Have enough / Have some / Need, package rounding, covered/sent from orders and transfers, unresolved lines, fingerprints | `src/domain/groceries/projection.ts`, `src/server/groceries/recompute.ts` | Unchanged apart from accepting a second, undated demand source (§3.3). |
| Purchasing protections: approvals bound to line fingerprints, stale review makes zero retailer calls, append-only immutable batches/orders/receipts, partial transfer, bounded dispatch | `src/server/commands/{groceries,purchasing}.ts`, migrations 002/013 | Untouched. Every payload still names the list's `weekId`. |
| Kroger product choice (server re-read, sold-by basis, package from size text), fake transport | `kroger-mapping-service.ts`, `ChooseKrogerProduct` | Untouched; offline only. |
| Import: page-reading policy, Budget Bytes refusal, content permission (`contentUse`), paste fallback, exact amounts, review problems (servings required) | `recipe-import-service.ts`, `content-policy.ts`, `imports.ts`, `domain/recipes/import.ts` | Untouched except the bounded additions in §4. |
| Photos: member photo (migration 014), permitted source photo (012), labels from `recipePhoto` | `recipe-photo-service.ts`, `domain/recipes/photo.ts`, `Tile.tsx` | Gallery tiles use the same choice and labels. |
| One modal system (focus trap, inert page, Escape, return focus) and the D57 discard guard | `src/ui/a11y.tsx`, `RecipeEditor.tsx` | The guard moves into the modal system so import review gets it (§5). |
| Dinner calendar, cooking events, accepted weeks, cook records | `plan.ts`, `Week.tsx`, `Cook.tsx` | Kept as they are under More. Nothing is migrated, rewritten or hidden from the database. |

### Invariants this work must keep (tests named in §7)
1. A selected meal never creates, moves or edits a cooking event, assignment, allocation or accepted week.
   No dinner date is invented, and the calendar's `accepted_choice_revision` is not touched.
2. A selected meal is bound to one immutable recipe version. It changes version only by an explicit member
   command.
3. Every add, servings change or removal is a server command bound to what the member saw (an expected
   revision). A concurrent change by the other member is rejected with the current state, never merged
   silently.
4. A recipe appears at most once in a list. Adding it again changes its servings deliberately and never
   counts it twice (§6 Q2).
5. Grocery demand = Σ (per-serving exact amount × servings) over active selected meals, plus any calendar
   dinners already in the same shopping cycle. Compatible units are combined before package rounding.
   Different foods, forms and dimensions stay separate lines.
6. Unknown is never zero: unpriced lines, unconvertible units and missing nutrition stay visibly unknown.
7. Purchasing history (batches, status events, orders, order lines, receipts) is append-only. A list that
   has been ordered is closed history, never rewritten.
8. A change to a selection that alters a line's quantity makes its approval stale. A stale review makes zero
   retailer calls (existing D-rules, now exercised from selections).
9. Backdrop, Escape and Close never discard edited import-review or recipe-editor work without a
   confirmation.
10. Publisher photo, method and nutrition are kept only under a recorded permission (D95/D102). Budget Bytes
    is never read.

## 3. Architecture decision: day-free selection

### 3.1 What the code imposes
- `grocery_cycles.week_id` is `NOT NULL UNIQUE`. Requirement lines, approvals, availability, batches, orders
  and receipts all hang off `cycle_id`, and every purchasing command takes `weekId`.
- The projection drops any cooking event without a `cook_night` (`projection.ts:225`). Allocations need a
  `night`, and admission/coverage treat an undated event as unresolved. Reusing cooking events would
  therefore mean inventing dates or loosening calendar rules.
- Purchases and transfers reduce need only within their own cycle (no cross-cycle carry-over).

### 3.2 Options
| | A. A meal list rides one existing shopping cycle (recommended) | B. Week-less shopping cycles |
|---|---|---|
| Schema | New `meal_lists` (one per cycle; at most one open per household) and `selected_meals`. No existing table altered. | `grocery_cycles.week_id` nullable plus `list_id`, and every query, check and command that finds a cycle by week changes. |
| Purchasing code | Unchanged; commands get the list's `weekId`. | Every purchasing command, the snapshot coherence check and recompute change their keys. |
| Previous release on the migrated DB | Ignores the new tables. | A cycle with no week breaks its joins. |
| Visible dates | None. The cycle's week is an internal container the UI never shows on this path. | None. |
| Cost | Small, additive | Large; touches the purchasing core |

**Recommendation: A.** The week behind a list is bookkeeping only. No dinner date is created, no cooking
event exists for a selected meal, and the calendar is unaffected.

### 3.3 The model (migration 017, additive only)
- `meal_lists(id, household_id, cycle_id UNIQUE → grocery_cycles, status open|closed, revision, opened_by/at,
  closed_by/at)`, with a partial unique index allowing **one open list per household**.
- `selected_meals(id, household_id, list_id, recipe_id, recipe_version_id → recipe_versions, servings integer
  1–48, status active|removed, revision, added_by, updated_by, created_at, updated_at)`, with a partial unique
  index allowing **one active row per (list, recipe)**. A removed row is kept, not deleted.
- **Which cycle a list uses:** when the first meal is added and no list is open, the list opens on the cycle
  of the current week. If that cycle already has a confirmed order, or another list, it uses the next week
  that has neither. This is the same "first pickup without a confirmed order" rule that `CaptureHouseholdNeed`
  already uses. A list never moves on its own: it stays open across week boundaries until a member presses
  **Start a new list**. Closing keeps it, with its purchases, as history.
- **Commands** (new, in the registry): `AddSelectedMeal {recipeId, versionId, servings, expectedListRevision}`;
  `SetSelectedMealServings {selectedMealId, expectedRevision, servings}`;
  `RemoveSelectedMeal {selectedMealId, expectedRevision}`;
  `UseNewerRecipeVersion {selectedMealId, expectedRevision, versionId}`;
  `StartNewMealList {listId, expectedRevision}`. Each bumps `meal_lists.revision`, emits a change event
  ("Alex added Brisket Tacos, 4 servings") and recomputes that cycle in the same transaction.
- **Projection:** `ProjectionInput` gains `selections[]`. Each is turned into demand by the existing
  `eventDemand(recipe, [one plate with every component × servings])`. `MealSource` gains
  `kind: "dinner" | "selected"` and a nullable night. The pickup-timing check skips undated sources (a
  selected meal is needed by pickup by definition). Fingerprints are unchanged in shape.
- **Default servings** on +: the recipe's reviewed servings when its exact rows agree, otherwise 2.
- **Snapshot:** the open list with its meals, versions, servings, who added them, and any calendar dinners in
  the same cycle (shown read-only as "From the dinner calendar").
- **Rollback note:** an earlier release ignores the new tables. Its next grocery recompute would leave
  selected meals out of the list, which makes affected approvals stale (the safe direction). The upgrade
  rehearsal will run the previous release's suite on a database with open selections, to prove nothing
  crashes on undated sources still stored in requirement lines.

## 4. The three acceptance recipes (offline fixtures only)
Fixtures are synthetic pages shaped like each recipe's public structure. They are served by the existing
fixture manifest under the real host names, which never resolve to the network. They contain no publisher
method text and no photographs. No request goes to the three sites.

| Case | Expected experience | Existing behaviour reused | Bounded addition |
|---|---|---|---|
| **A. Budget Bytes, One Pot Chicken and Rice** | The + Add-from-link sheet saves the link and says plainly that Budget Bytes asks for permission before reuse, so Table doesn't read it. The paste box opens focused with the name taken from the link. After review (4 servings) it is a recipe with a source link, "Method on Budget Bytes ↗", and no photo, with **Add your own photo** offered. | D90 refusal before any fetch, paste path, exact amounts | Clearer refusal copy in the new sheet. Test proves zero requests to budgetbytes.com. |
| **B. Pioneer Woman, Brisket Tacos** | Review shows the groups (brisket, pickled onion, toppings) as headings, keeps red and yellow onion distinct, and asks for each unquantified topping or tortilla line: give an amount, or **Keep without an amount (not bought)**. No amount is invented. A long cook time (e.g. 8 h) is kept. | Onion keys stay distinct (`red_onion`, `yellow_onion`), times up to 24 h, review blocks undecided lines | Heading lines ("For the pickled onions:") are recognised as group headings, not ingredients, and saved as recipe components. No-amount lines are kept on the recipe as "not bought" and listed on the Selected Meals card, so the member can add them to Groceries with an amount they choose. (Q5, Q6) |
| **C. Key to My Lime, Garlic Chicken Pasta** | Review shows every yield the page states ("4 servings · 6 servings"). Servings stay empty and required until a member chooses. Shared garlic and oil lines combine in groceries. Nutrition is never taken from the page, so no publisher per-serving figure is mixed with Table's servings. Detail shows calories only from confirmed ingredient data, "per serving (1 of 4, as reviewed)", else "unknown". | Servings required at confirm (`draftProblems`), publisher nutrition never imported (D88/D94), plate nutrition with unknown parts | Keep all stated yield values for display, not just the first one. |

Out of scope, per the assignment: no new parser engine, no wider site reading, no AI extraction, no
publisher nutrition import, no change to R1/C1/C2 settings.

## 5. Import-review progress loss (owner-reproduced)
**Cause:** `ModalSheet` closes on any backdrop click (`a11y.tsx:168`). Import review passes its parent's
`onClose` straight through, so the parent unmounts the review and unsaved edits are lost. The D57 guard
exists only inside `RecipeEditor`.

**Fix:**
- Add an opt-in `guard` to `ModalSheet`. A sheet that reports itself as edited routes the backdrop, Escape
  and Close through one confirmation: **Keep editing** (focused) · **Save for later** (import only) ·
  **Discard changes**. Untouched sheets still close as B14-b expects.
- Import review reports edits: the title, servings, minutes, method, any line decision differing from the
  saved draft, an unapplied row edit, or text in the paste box.
- "Discard import" also asks first.
- Tests: desktop mouse click on the backdrop, mobile touch tap (touch context), Escape and Close; for each,
  keep editing, discard, and an untouched close. Also the recipe editor's backdrop and Close paths.
  Title, ingredient, quantity and yield import is unchanged.

## 6. Decisions for the owner (each has a recommendation)
| # | Question | Recommendation |
|---|---|---|
| Q1 | How day-free selection is stored | **A** (§3.2) |
| Q2 | + on a recipe already in the list | Opens its servings stepper ("Already selected · 4 servings") instead of adding a second copy. No separate occurrences. |
| Q3 | Theme | **Dark always** (black ground, photography forward). The light theme is retired, not offered. |
| Q4 | Navigation | Recipes · Selected · Groceries · More. Signing in lands on Recipes. The calendar, Household, Saved links and Budget Bytes live under More. |
| Q5 | Group headings in imported ingredient lists | Recognise them and save them as recipe components. |
| Q6 | Lines with no amount (toppings, tortillas) | "Keep without an amount (not bought)", shown on the recipe and as a reminder on the selected meal. |
| Q7 | Calendar dinners already in the list's shopping cycle | Shown read-only in Selected Meals under "From the dinner calendar", so the totals are explained. |
| Q8 | Desktop layout | The 560 px column cap is lifted for Recipes (gallery of 3 to 5 columns). Other screens keep a readable column. |

## 7. Screens (see the mock-ups)
- **Recipes (phone):** search field; chips for All, Favorites, Quick (≤ 30 min) and From links; a
  two-column gallery of large square photo tiles. Each tile has the title below, one line of time and serving
  cost (or "time unknown"), a photo-kind mark (Our photo / Source photo / No photo yet), and a round **+**
  button. Tap the photo to open detail; scroll position and filters are restored on return. A floating
  "3 selected · Review groceries" bar sits above the nav.
- **Recipes (desktop):** the same gallery in 4 to 5 columns. Hover reveals time, serving cost and calories
  per serving. Everything essential is also visible on tap.
- **Recipe detail:** a full-bleed hero with its photo-kind credit, title, source line ("From Key to My Lime ·
  Open the original ↗"), and a stat row: Time · Servings · Calories/serving · Protein · Cost/serving, each
  "unknown" when it is. Then **Add to Selected Meals** with servings, the ingredients by group, and the method
  or "Method on {site} ↗". Favorite, feedback, notes, Edit (new version) and versions follow below.
- **Selected Meals:** one card per meal with a thumbnail, title, servings stepper (− 4 +), "Remove", "Version
  3 of this recipe · use version 4" when newer, and "Not bought: tortillas, cilantro (no amount in recipe)".
  Then an optional read-only calendar group and a primary **Review groceries (14 items)** button.
  Concurrency conflicts show the current value in words.
- **Groceries:** a checklist grouped as To buy · Have it · Needs a decision. Each line shows what to buy
  ("Milk — 5 cups → 1 × half gallon"), which meals it is for (tap to expand), and a three-way
  Have enough / Have some / Need. The pickup estimate card and readiness stay at the top. Advanced purchasing
  (products, approvals, transfer, order, receipts) sits behind each line's "Product & purchase" and a "Send
  to store" section at the end, all using the existing dialogs.
- **Add a recipe (sheet):** paste a link → reading result in words → review. Budget Bytes and refused pages
  go straight to paste. "Type it in" is the smaller secondary path.

## 8. Implementation plan after approval (workers ≤ 10, one integrator)
| Worker | Scope | Depends on |
|---|---|---|
| W1 | Migration 017, five commands, snapshot/library fields, integration tests (concurrency, version pinning, re-add, list lifecycle, calendar untouched) | — |
| W2 | Projection: selected demand source, undated timing, Groceries line source display; boundary tests (milk 3 + 2 cups → 1 × 8-cup package; Have enough 5 → 0; shared garlic/oil; seasonings; fractions; stale approval zero calls; mixed calendar + selected) | W1 |
| W3 | Modal guard in `a11y.tsx`, import-review dirtiness, discard confirmation; e2e mouse + touch | — |
| W4 | Import bounded additions: heading lines → components, keep-without-amount, all yield values; fixtures A/B/C; integration + e2e | — |
| W5 | Dark theme tokens, contrast test, nav and routes (Recipes landing, More), wider desktop container | — |
| W6 | Recipes gallery: tiles, photo-kind marks, search/filters (Explore merged), +, scroll/filter restore | W1, W5 |
| W7 | Recipe detail redesign and the Add-with-servings control | W1, W5 |
| W8 | Selected Meals screen and the floating selection bar | W1, W5 |
| W9 | Groceries checklist presentation over the existing dialogs | W2, W5 |
| W10 | Two-member browser flows, the B18 text-scaling sweep for new screens, the upgrade rehearsal with open selections, mutations | all |

**Verification:** each commit through `scripts/verify-all.sh` on a clean tree (real PostgreSQL; vitest,
Playwright, mutations), plus an upgrade rehearsal from `8ae5497` with populated selections and the previous
release's suite. Existing tests that pin "Our Recipes" or Explore names are updated deliberately and listed
in ACCEPTANCE; no assertion about quantities, purchasing or the calendar is weakened.

**Not done:** deployment, Neon or household data, live sites, Kroger/Instacart calls, settings or permission
switches, the Extraction Lab, parser engines, automatic menus, pantry inventory, nutrition research, other
retailers, generic polish.

## 9. Known limitations (stated now)
- One shopping list per internal week container. A second confirmed order in the same week remains B13.
- Purchases from a closed list do not reduce a new list. What is at home is recorded with Have enough / Have
  some on the new list, as today across weeks.
- JSON-LD pages usually flatten ingredient groups. Group headings appear only where the page's data or a
  member's paste includes them.
- Safari/iPhone/VoiceOver checks remain the B8 device run; automated checks are Chromium (desktop, and mobile
  viewport with touch).
