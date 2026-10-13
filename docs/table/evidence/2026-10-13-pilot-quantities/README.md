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

## 3. The smallest record needed

`read-only-trace.sql` — for the owner to run (it is a `READ ONLY` transaction ending in `ROLLBACK`). It returns only
the rows that feed these three lines on the open meal list: recipe title, provenance (`imported` / `manual`), version,
**selected servings**, ingredient, **saved per-serving amount and unit**, **serving basis** (`exact_amount` /
`exact_servings`, or legacy), and for an imported row **the original line** (`From: …`, stored on the row). It also
returns any member answer for a "Needs a quantity" item with those names. Tested on the disposable database (it
returns the two rows of the reproduction above). No other household data is needed.

The new checklist's **Details** shows each recipe's share of a line ("QD written recipe: 128.0 oz (3629 g)"), so the
household can also see which recipe contributes the amount without running anything.

With those rows each line is traced arithmetically, end to end, and the cause stated per line. Correcting a recipe is
then a reviewed new version; changing the editor (A or B) is a separate decision, not made here.
