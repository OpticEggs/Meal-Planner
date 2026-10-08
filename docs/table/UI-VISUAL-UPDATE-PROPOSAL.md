# Table — Visual update proposal (not implemented)

Prepared 2026-10-08, after the integration-preparation delivery. **This is a proposal only.** No
application code, schema, tests or dependencies were changed for it, and nothing here is implemented.
It needs the owner's approval before any implementation starts.

## Inputs and what they are

- **Reference board:** five iPhone screenshots supplied by the owner in this session (an onboarding
  carousel of another meal-planning app: a plan/budget screen, a grocery total screen, a week of
  dinner cards, a recipe detail screen, and a "kitchen" pantry screen). They were viewed in this
  session and used as **visual reference only** — hierarchy, spacing, type weight, card shapes. They
  are another company's product: none of its name, logo, copy, icons or photographs is reused, and the
  screenshots are not stored in the repository.
- **Current interface:** a read-only inventory of every screen, dialog, command and visual token in
  `src/ui/*` and `src/app/globals.css` (same day). Statements below about "today" come from it.
- **The settled contract** (CLAUDE.md boundaries, the plan's T01–T22 / X01–X12, D1–D76). Nothing in
  this proposal changes a rule; where the board shows something the contract excludes, it is listed in
  §4 as excluded, not offered as a choice.

## 1. Overall direction

| Aspect | Today | Proposed | Unchanged |
|---|---|---|---|
| Theme | Dark only (`--bg #12110f`, amber accent) | Add a light theme as the default when the phone is in light mode; keep the dark theme for dark mode. Same token names, new values; every text/background pair measured to WCAG AA (4.5:1 body, 3:1 large text and focus outline) before it ships | Token-based styling; focus outline always visible |
| Page titles | Serif "Table" brand in the header; screen headings 1.35rem serif | Each screen opens with a large bold sans title ("Week", "Groceries", …) at the top of the content, ~2rem, left aligned; the brand stays small in the header | Header still shows who is signed in, the **Simulated retailer** pill and the up-to-date/offline line |
| Section labels | 0.75rem uppercase | Same idea, slightly larger tracking ("NEXT DINNER", "THIS WEEK", "PICKUP ESTIMATE") as the board's eyebrow labels | Text content |
| Spacing | 12px card padding, 10px gaps | More air: 16–20px card padding, 12–16px gaps, 20px radius on primary cards; one primary card per screen sits slightly raised (shadow in light theme) | 16px page gutter, 44px minimum targets, no horizontal scroll at 320px |
| Numbers | Body size | Key figures large and bold (next dinner title, pickup estimate total) | A number is only large when it is complete (see §3.4) |

## 2. Navigation and week movement

### 2.1 Bottom navigation
- **Today:** five text tabs (Week, Explore, Our Recipes, Groceries, Household), active tab amber, a count
  badge on Groceries for lines that need someone.
- **Proposed:** the same five destinations and labels, each with an original line icon above the
  label; the active tab sits in a soft pill. The Groceries count badge stays, now on the icon.
- **Operation/state:** routes only; badge from the existing outstanding-line count.
- **Must stay:** labels as accessible names (tests find them by name), 44px targets, the nav never
  covers content (B18 measured heights), labels wrap rather than truncate at 200% text.
- **Asset needed:** five icons — to be drawn as original inline SVG (no icon from the board or a
  brand). This is an asset to create inside the approved scope; it is not available today.

### 2.2 Week switcher
- **Today:** "‹ Week of Oct 12 ›" arrows; the chosen week lives in client state; there is no one-tap
  way back to the current week even though the server already sends `clock.currentWeekStart`.
- **Proposed:** a horizontally scrolling row of week chips: **This week**, **Next week**, then dated
  chips ("Oct 26–Nov 1"); a small dot marks a week that has an accepted plan; the arrows remain at the
  ends for keyboard and screen-reader users. "This week" always returns to the current week.
- **Operation/state:** `setWeekStart` with `clock.currentWeekStart`, `prevWeekStart`, `nextWeekStart`;
  reads `/api/snapshot?week=` exactly as now.
- **Must stay:** browsing weeks never edits the accepted plan or its grocery requirements; each chip
  is a real button with a name ("Show next week, Oct 19–25"), the selected one `aria-pressed`;
  no lock symbol on weeks (locks are per night in Table).

## 3. Screens

### 3.1 Week — before adoption (one proposed week)
- **Today:** setup selects, "Propose a week", the proposal card with nights and reasons, Fewer
  sessions / Different dinners, "Use this week".
- **Proposed:** the proposal becomes a list of dinner cards (§3.3 style) under the eyebrow "PROPOSED
  WEEK"; the four setup selects collapse into one "Adjust" panel above it; the summary stats
  (Cooking, Leftovers, Out/open, New to you) become a single compact row; "Use this week" is the one
  full-width primary button at the end.
- **Operation/state:** `GenerateProposal`, `AdoptWeekProposal`; proposal reasons from
  `src/domain/planning/proposal.ts` exactly as written.
- **Must stay:** one proposed week; alternatives only behind Change; an incomplete proposal stays a
  labeled draft that cannot be adopted (R-F01); stale-proposal warning visible; reasons are only the
  recorded ones (no invented "you'll love this").

### 3.2 Week — after adoption (home)
- **Today:** status sentence; "Next dinner" card with Cook/Reheat link; three stats; open previews;
  "This week · accepted revision N"; night rows with title, badges, Change and Lock.
- **Proposed:** a **Next dinner** hero card first (day eyebrow, large title, "About 35 min (estimate)"
  or "time unknown", the Cook / Reheat and serve button full width); then **What still needs doing**
  (open previews, outstanding grocery lines, unresolved nights) as a short list of tappable rows; then
  the week's nights as dinner cards (§3.3); the three money stats move into one Groceries summary row
  linking to Groceries (§3.4).
- **Operation/state:** existing snapshot fields (`statusSentence`, next dinner, previews, coverage,
  outstanding count); `SetNightLock` for Lock; Change opens the existing sheet.
- **Must stay:** adoption never implies cooking or eating; Cook/Reheat pages still say opening them
  records nothing; accepted revision still visible (moved to the section label); "last set by"
  attribution kept on each card.

### 3.3 Dinner card (proposal, accepted week, Change-sheet options)
- **Today:** accepted night rows show the title only plus badges; Explore cards show cuisine, minutes,
  kcal and serving cost; no images anywhere (Explore has a 44px letter tile).
- **Proposed card:** left, a **designed placeholder tile** (the recipe's initial on a soft colour
  derived from the cuisine, or a small plate glyph — clearly not a photo); right: day eyebrow
  ("WED 7"), title (wraps, never truncated), one metadata line — time estimate or "time unknown",
  serving cost or "cost unknown", cuisine — then the members' own recorded preferences ("Jon: make
  again · Alex: occasionally" or "no feedback yet"); coverage/constraint/lock badges; one secondary
  button **Change** (the board's "Swap" position).
- **Operation/state:** recipe data already loaded from `/api/library` (`servingCost`, effort minutes,
  cuisine, preferences); Change opens the existing Change sheet → `CreatePreview` → reviewed
  **Apply** (`ApplyPlanChange`). Nothing replaces a dinner from the card itself.
- **Must stay:** "Change" keeps its accessible name pattern ("Change Friday …", B14); a cost is shown
  only when known; preferences are only the two members' recorded ones — never counts, never
  "people liked this"; leftovers keep the "Leftovers:" prefix.
- **Not available:** recipe photographs (none exist; adding user-supplied photos is backlog B11 and
  outside this scope; generated or fetched photos are excluded).

### 3.4 Groceries — cost presentation
- **Today:** four stat tiles (Pickup estimate, Dinner ingredients, Still to buy, Budget) with
  "unknown — N unpriced" / "$x known + N unpriced"; Week and Groceries render the budget differently.
- **Proposed:** one **Pickup estimate** card at the top:
  - complete pricing → the total, large ("$87.25"), with "N packages · simulated store prices";
  - incomplete → never one large total: "$64.10 known **+ 3 items without a price**", with the
    unpriced lines listed under a "Why isn't this a total?" disclosure;
  - a "How this is estimated" disclosure: recorded package prices, not a checkout total; final charges
    can differ at pickup;
  - below it, smaller: Dinner ingredients cost, Still to buy, and the budget in **one shared wording**
    on Week and Groceries ("Within your $100 pickup budget" / "Over by $12" / "Budget can't be judged:
    3 items unpriced").
  Grocery lines keep their order and their explicit Have enough / Have some / Need buttons, restyled
  as a segmented control; product and price on one line with the source ("simulated store").
- **Operation/state:** `pickupSpending`, `dinnerIngredientCost`, `outstandingPurchase`, budget status,
  `costView`; `RecordAvailability`, `ApprovePurchaseLines`, `StartHandoff` unchanged.
- **Must stay:** the separate cost measures; unknown is never zero; a demo/simulated price is labeled
  as such and never presented as a live store price; "Send to Simulated retailer" wording until a
  live retailer is activated; availability answers stay scoped to the quantities and pickup cycle
  reviewed; readiness blockers stay visible above Send.

### 3.5 Recipe detail
- **Today:** title, version line, preference buttons, favorite, Sounds good, Edit, three stats
  (Calories/plate, Protein/plate, Serving cost), synthetic-nutrition note, ingredients, steps, reheat,
  notes, cooking history, versions.
- **Proposed:** a header band with the designed placeholder (no photo), the title large, then a stat
  row under the eyebrow "TO MAKE": time estimate, effort level, number of ingredients, leftover-friendly
  — each "unknown" when not recorded; then serving cost and plate nutrition with their provenance
  labels; the members' preference buttons as a three-option segmented control; Favorite and Sounds
  good as icon+text buttons in the header; ingredients as a clean two-column list (name · amount);
  steps numbered.
- **Operation/state:** `SetRecipePreference`, `SetFavorite`, `SaveInterest`, `AddRecipeNote`, the
  recipe editor; all values from the existing library read.
- **Must stay:** version and provenance line ("test fixture recipe", estimates labeled); synthetic or
  unknown nutrition labeled; Favorite keeps its visible star in its name (T03); editing creates a new
  version and accepted dinners keep theirs (T21, D62).
- **Not available / new capability (excluded here):** ingredient photographs; a "cleanup" rating (no
  data); share/print; an "I cooked it" button on recipe detail — recording cooking outside a scheduled
  cooking night would be a new capability with its own semantics.

### 3.6 Cook / Reheat
- **Proposed:** same content; "Mark cooked" becomes the full-width primary button at the bottom (the
  board's "I cooked it" position) **with its existing meaning only** (`RecordCooked` for this scheduled
  cooking night); amounts as a two-column list; steps numbered.
- **Must stay:** "Opening this page does not record cooking or eating"; leftover nights have no cook
  button.
- **Observation (not proposed work):** today each press of "Mark cooked" adds another cooking record
  (a new operation id per click; the button stays visible). Any change to that is behavior, not
  presentation, and is outside this proposal.

### 3.7 Explore and Our Recipes
- **Proposed:** the same filters and sorts; results as dinner-style cards (§3.3) with the placeholder
  tile; the "Value unknown for this sort" group stays a separate labeled group; Sounds good stays the
  per-card action with its result announced.
- **Must stay:** sorting by real values with unknowns grouped, never ranked as zero; "simulated store"
  label on costs; the tablist on Our Recipes.

### 3.8 Household, sheets and dialogs
- **Proposed:** the same cards in the same order with the new spacing and type; the Kroger card keeps
  every capability's evidence line ("not live-verified"). Sheets keep the bottom-sheet form with the
  new radius and title size.
- **Must stay:** the one modal system (focus trap, inert page, Escape closes without applying, focus
  return), attached field errors, unsaved-work and conflict panels (D57, D60, D62), one live region.

## 4. Seen on the board and excluded by the settled contract (not offered as options)

| Board element | Why it is not proposed |
|---|---|
| "Just build the cheapest week" toggle; budget slider driving planning | No unconstrained cheapest-week mode or new recommendation objective; cost sorting and hard constraints stay as they are. The budget remains a Household setting. |
| "Kitchen": tick what you own, it "stays off" your bill | No compulsory or perpetual pantry; availability answers stay per quantity and pickup cycle. |
| Exact store total with a named store, Instacart/DoorDash hand-offs, "Shop today" | Kroger is the only planned retailer; incomplete pricing stays visibly incomplete; demo prices are labeled simulated. |
| Thumbs-up/down counts on dinners | Preferences are the two members' recorded preferences, not approval counts. |
| Food photography and ingredient photos | No photographs exist; none may be fabricated. Placeholders are designed instead. |
| A week shown as "locked" | Locks are per night in Table. |
| Grocery list grouped by store section (Produce, …) | No store-section data exists; would be a new capability. |

## 5. Proposed implementation scope (only if approved)

- `src/app/globals.css`: token values for a light theme plus the dark theme, spacing/type scale, card
  and button shapes; contrast measured.
- `src/ui/Shell.tsx` (icons + nav pill), `Week.tsx` (week chips, hero card, dinner cards, shared budget
  wording), `Groceries.tsx` (pickup estimate card, segmented availability control), `Recipes.tsx` and the
  recipe detail route, `Cook.tsx`, `Explore.tsx`; a small `DinnerCard`/`PlaceholderTile` component.
- Five original inline SVG icons and the placeholder tile design (assets created in scope).
- Possibly read-only snapshot additions if a dinner card needs a field the client does not already
  have (no new command, no schema change).
- Tests: all existing tests keep their test ids and accessible names; the B18 320px/150%/200% sweep and
  the B14–B17 focus tests must pass unchanged; add a contrast check for both themes and before/after
  screenshots at 390px and 320px as evidence. Chromium only; Safari/VoiceOver remain the B8 device run.
- Not in scope: any item in §4, recipe photos (B11), "I cooked it" outside the Cook page, the "Mark
  cooked" duplicate-record observation.

Approval needed: "Implement the visual update as proposed in UI-VISUAL-UPDATE-PROPOSAL.md §5" (with
any section removed or changed). Until then nothing here is built.
