# Pilot quantities — diagnosis before any change (2026-10-13)

The owner reported three grocery lines from the live pilot: **Cilantro leaves 736 oz / 20,865 g**, **Eggs 6 g**,
**Brisket flat 128 oz / 3,629 g**. Instruction: diagnose before changing anything; trace original text → saved amount
and serving basis → selected servings → requirement → display; use only records the owner supplies or authorizes; no
Neon access, no household-data change, no guessed corrections.

**Evidence available to this diagnosis:** the three figures as quoted in the owner's message. The live screenshot
the message mentions did not reach this session (only the text did). No household record has been read.

## Disposition

**Cause for the household: not established.** The saved rows behind these three lines have not been seen, and nothing
below is a claim about them. What is established is (1) what the display stage proves, (2) which writers can produce
each shape, with two of them reproduced on disposable data, and (3) the smallest record that settles each line.
No quantity has been changed and no correction is proposed until those rows are read. Any correction to an existing
recipe would be a separate, reviewed new version (recipe versions are immutable).

## 1. The display stage (code fact)

The checklist amount is `qty(requirement, unit)` (`src/ui/format.ts`): a gram total of 100 or more is shown as
`<grams ÷ 28.349523125, 1 place> oz (<rounded grams> g)`. So:

- "736 oz / 20,865 g" is one requirement of about **20,865 g** in grams — the oz figure is a conversion, not a second
  amount. 736.0 oz is 20,865.25 g.
- "128 oz / 3,629 g" is about **3,629 g** — exactly what 8 lb is (3,628.739 g).
- "6 g" is a requirement of **6 in grams** (a gram figure under 100 is shown as is). A requirement is in grams only
  when every contributing row (or member answer) is in a mass unit: an egg counted as "6 large eggs" is `each` and
  would show as "6".

The display arithmetic is therefore not where these numbers come from; the requirement handed to it already is.

## 2. Upstream: requirement = per-serving amount × selected servings, converted to the base unit

`eventDemand` (`src/domain/recipes/plate.ts`) multiplies each saved row's per-serving amount (`exact_amount ÷
exact_servings`, or the legacy `quantity`) by the selected servings and converts to g / ml / each; rows of the same
ingredient across selected meals are added. Each stage below is a place a large or mislabeled number can enter:

| Stage | Where it could enter | Checked how |
|---|---|---|
| Original line → parsed amount/unit (import) | the parser | **Probed, not implicated for ordinary phrasings** (`parser-probe.txt`): "6 large eggs" → 6 each; "1 cup cilantro leaves" → 1 cup (volume, would show as fl oz, not oz/g); "4 lb brisket flat" → 4 lb; "1 (4-5 pound) brisket flat" → 1 each. These are representative phrasings, **not** the household's lines. |
| Review step (import) | a member's correction of amount or unit | not reproducible without the draft |
| **Recipe editor (written or edited recipe)** | **(A) new rows start with unit `g`**; **(B) amounts are per portion** | **Reproduced** — below |
| "Needs a quantity" answer | a member's stated amount (unit defaults to `each`) | possible; the query returns it |
| Selected servings | the servings chosen on Selected | the query returns them |
| Several recipes using the ingredient | the sum | the checklist's Details now lists each recipe's share |

### Reproduction on disposable data (`trace.json`, screenshots A1–A3, B1)

A recipe written in the editor ("QD written recipe"), typing the amounts as a recipe states them:

| Typed | Saved row | Recipe page | Selected | Requirement | Shown |
|---|---|---|---|---|---|
| eggs `6`, unit left as it starts | `6 g`, exact 6/1 serving | "Makes 1" · 6 g | 2 servings | 12 g | **12 g** (6 g at 1 serving) |
| brisket flat `4` `lb` | `4 lb`, exact 4/1 serving | "Makes 1" · 4 lb | 2 servings | 3,628.739 g | **128.0 oz (3629 g)** |

- **(A) Default unit.** A new ingredient row's unit field starts as `g` (`src/ui/RecipeEditor.tsx`, the empty row and
  `addRow`). An amount typed without changing it is saved in grams — "6" eggs becomes 6 g.
- **(B) Per-portion amounts.** A new or changed amount is saved as the amount for **one portion** (`basisOf` in
  `src/server/commands/library.ts`: "the decimal the member typed for ONE portion", exact n/1). The editor says so
  once, in its opening line ("Structured entry: amounts are per ONE portion of their component…"); the amount fields
  themselves are not labeled. A whole-recipe amount typed there is multiplied by the servings selected. Opening an
  imported recipe that makes 4 shows its amounts per portion — rice "0.25" cup in the editor beside "1 cup" on the
  recipe page (B1) — so changing "0.25" back to the recipe's "1" would make it 1 cup per portion, 4 cups for 4.

These reproduce **the shapes** "6 g" and "128.0 oz (3629 g)". They do not show that the household's rows were made
this way: 8 lb of brisket may be a genuine requirement (for example a 4 lb recipe that makes 6, selected for 12), and
"6 g" may be a stated answer in grams. **Cilantro (≈ 20,865 g) is not explained by any evidence so far.**

## 3. The smallest record needed — the read-only trace (revised 2026-10-14: one household, one list)

`read-only-trace.sql`, run by the owner in the Neon SQL editor. Both steps are `READ ONLY` transactions ending in
`ROLLBACK`. Tested on the disposable database (its result reproduces the screen: brisket 3628.739 g ↔ "128.0 oz
(3629 g)", eggs 12 g ↔ "12 g").

- **Step A** lists each household with an open selected-meals list: `household_id`, `household` (name), `fixture`
  (true only for test households), `list_id`, `list_opened`, `selected_meals` (count). Pick your household's row; its
  two ids go into Step B. Nothing from Step A needs to be shared.
- **Step B** returns, for that household and list only, one row per recipe row (or member answer) that feeds the
  cilantro, egg or brisket lines:

| Column | Meaning |
|---|---|
| `recipe`, `provenance`, `version_no`, `version_saved` | the selected recipe version; `imported` (from a link) or `manual` (written or edited in Table), or `stated amount` for a member's answer |
| `selected_servings` | servings chosen on Selected now |
| `ingredient`, `unit` | the ingredient and the saved unit (`g`, `oz`, `lb`, `cup`, `each`, …) |
| `saved_per_serving` | the stored per-serving amount (for an answer: the amount given) |
| `quantity_basis`, `exact_amount`, `exact_servings` | `exact`: whole-recipe amount ÷ servings it was written for; `legacy`: the stored decimal only; for an answer: which servings it was given for |
| `requirement_now` | per-serving × selected servings, in `unit` (an answer counts only when given for the servings selected now; else empty) |
| `grams_if_mass` | `requirement_now` in grams when the unit is a mass (g, kg, oz, lb) — per ingredient, these add up to the grams on the screen |
| `original_line` | for an imported row, the recipe line as it was read (`From: …`); empty for a written or edited row; for an answer, the recipe's line without an amount |

Share only Step B's rows.

## 4. How the rows will be classified (no recipe is changed by this)

Each of the three lines gets one of these, stated per row:

- **Established — editor default unit (A):** `provenance = manual` (or an edited version), `unit = g` on a count
  ingredient (eggs), `exact_servings = 1`, empty `original_line`.
- **Established — per-portion amount (B):** a written/edited row with `exact_servings = 1` whose `saved_per_serving`
  matches a whole-recipe amount, multiplied by `selected_servings > 1`. "Matches a whole-recipe amount" needs the
  recipe's own amount (from its website or your knowledge); without it this stays **consistent with B, not established**.
- **Established — imported as read:** `provenance = imported` and `original_line` says the same amount and unit; the
  requirement is then simply that line × servings ÷ yield, and any surprise is in the source or the servings chosen.
- **Established — import mis-read or review correction:** `provenance = imported` and `exact_amount` / `unit` differ
  from what `original_line` says.
- **Established — imported, then edited (B):** `provenance = manual`, `version_no > 1`, an `original_line` from the
  import kept on the row, and `exact_servings = 1` with a changed amount: the edit's number was saved per portion.
- **Established — stated answer:** a `stated amount` row in grams or a large amount.
- **Several recipes:** more than one row for the ingredient; the total is their sum (`grams_if_mass`).
- **Not established:** anything the rows don't decide; then the next smallest record is named, not guessed.

A correction to an existing recipe is a separately reviewed new version, made by a member in the editor; it is
proposed per row with the evidence, never applied from here.
