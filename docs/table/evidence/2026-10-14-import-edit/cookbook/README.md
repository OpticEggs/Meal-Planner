# Cookbook checks — import and editing, before and after (2026-10-14)

The owner asked for end-to-end checks with five representative family recipes: import, save, reopen, edit, choose
servings, and read the combined groceries. The checks compare `main` at `6d52c87` (before) with `claude/import-edit`
(after: D157 whole-recipe entry, D158 faster import review). Both runs used the same script steps and the same disposable
test database (`table_e2e`). They ran at a 390 × 844 phone viewport. Screens were captured from the running app.

## Inputs — and what is missing

| # | Recipe | Source used | Status |
|---|---|---|---|
| 1 | Pioneer Woman Brisket Tacos | offline **synthetic stand-in** page at the recipe's address (test fixture; the real page was not read) | owner-named |
| 2 | Key to My Lime Garlic Chicken Pasta | offline **synthetic stand-in** (yield "4 · 6") | owner-named |
| 3 | Budget Bytes One Pot Chicken and Rice | paste fallback, with lines written for the existing test (Budget Bytes pages are never read) | owner-named |
| 4 | The owner's two example lines: "Juice of 1/2 lemon", "5 to 6 Campari tomatoes" | pasted, exactly as supplied | supplied |
| 5 | — | — | **missing** |

**Missing input:** two more family recipes, and the real text of all five. For each recipe this means the link or the
pasted ingredient lines, plus the yield the household uses. No household recipe data was invented. The owner's two
lines are scenario 4 (paste) and scenario 5b (written by hand).

## Interactions and decisions

An interaction is one tap, one field fill or one selection. A decision is something the member has to work out or
choose. The uncounted demonstration in the after run is listed separately.

| Scenario | Before: interactions | After: interactions | Before: decisions | After: decisions |
|---|---|---|---|---|
| 1 Brisket Tacos, import from link | 4 | 4 | — (yield 8 prefilled) | — |
| 2 Garlic Chicken Pasta, import from link (page says 4 · 6) | 4 | 4 | yield 4 or 6 | yield 4 or 6 (a real conflict, kept visible) |
| 3 One Pot Chicken and Rice, paste | 6 | 6 | yield (a paste gives none) | yield |
| 4 Owner's two lines, paste | **13** | **8** | yield · "Juice of 1/2 lemon" (amount, unit and name typed) · 5–6 (typed) | yield · 5 or 6 (**one tap**) |
| 5a Edit Brisket Tacos: broth to 2 cups for the recipe | 4 | 4 | **per-serving arithmetic** (2 ÷ 8 = 0.25; the editor showed 0.125 cup) | — (the editor shows "makes 8" and "1" cup; 2 is typed) |
| 5b Write the owner's two lines by hand (makes 4) | 11 | 12 | **per-serving arithmetic** (½ ÷ 4, 5 ÷ 4); no place to say it makes 4; unit started as "g" | — (makes 4 typed; ½ and 5 typed as written; unit starts empty) |
| 6 Select Brisket ×4 and Pasta ×4, read groceries | 5 | 7 | — | — |
| **Total** | **47** | **45** | **7** (2 of them arithmetic) | **4** (no arithmetic) |

**Groceries (scenario 6), identical in both runs:** beef brisket 24.0 oz (680 g), beef broth 8.0 fl oz, garlic 8.5,
olive oil 1.5 fl oz.

**Why scenario 6 takes two more taps:** before, the broth edit in 5a left the recipe's rows with different servings
(8 and 1). The recipe page then read "Original yield not recorded", and the servings stepper started at 2. After, the
recipe keeps its yield ("Makes 8"), so the stepper starts at 8, and the script taps down to 4. The default is now the
recipe's real yield.

**Scenario 4, the main Save:**

- **Before:** with a typed row edit not yet applied, Save recipe was disabled. The screen said "2 ingredient lines need
  a quick check: give an amount, or leave it out. | Use at least one ingredient."
- **After, a demonstration that is not counted:** Save recipe pressed with the range not yet chosen. The screen says
  "Line 2 (Campari tomatoes): choose how much — the recipe says 5 to 6." Focus is on the "5" choice.
- **Typed changes:** a complete typed row change is saved by Save recipe or Save review for later, with no separate
  "Use".

**Scenario 5b, reopened:** the recipe page says "Makes 4". The editor reopens with "makes 4", "1/2" lemon and "5"
Campari tomatoes. Stored: lemon 1/2 for 4 (0.125 a serving), tomatoes 5 for 4 (1.25 a serving).

## Remaining manual decisions (after)

- **Yield when the source gives none, or gives two:** pastes; pages that state 4 · 6.
- **A range:** one tap on either end. Nothing is picked for the member.
- **Lines with no amount:** "Needs a quantity" (asked when shopping) or Leave out, as before.
- **Older (legacy) recipes:**
  - Their yield was never recorded.
  - A title or steps edit saves them unchanged.
  - Changing an amount asks for the servings first. The older amounts are then shown for that yield, marked
    "about (older amount)" where rounding applies.

## Files

- `before/`, `after/`: `results.json` (counts, decisions, notes) and screenshots.
  - `1-brisket-review`, `2-pasta-review`, `4-lines-review`, `6-groceries`: both runs.
  - `4-lines-save-held` / `4-lines-save-named`: the main Save, before and after.
  - `5a-editor-before` / `5a-editor-after`: the edit screen.
  - `5b-new-recipe`, `5b-reopened`: writing by hand, and reopening (after only).
- `cookbook-before.spec.ts`, `cookbook-after.spec.ts`: the measurement scripts. They were run from `tests/e2e/` and
  removed afterwards; they are not part of the suite.
