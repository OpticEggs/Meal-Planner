<!-- Verbatim final report of the independent reviewer (a read-only subagent), round 3, delivered 2026-10-09T22:52Z,
     before the holdout-v2 evaluation run. Model output, recorded as evidence; leading indentation removed. -->

## Round 3 review of semantic-v1 at 59756ba (range 556c28b..59756ba; HEAD 59756ba, clean tree)

**Verdict: fine to port and score, but expect A3/A4 to fail if the holdout contains any of four known shapes.**
- Technically it is sound: no crashes, every output validates, output is deterministic, the legacy engines are untouched, and nearly all round-1 and round-2 findings now generalise to new lines.
- But four groups of silent or S-coded errors remain. Two of them were introduced or brought back by this commit (K3 nutrition with spelled-out units; K4's number-word names and need-labels).
- The commit also brings back invented alternatives for a common shape (needs_review only).

Record K1–K4 as known defects.

### Known defects that will be scored as severe errors (blocker class)

**K1. Units glued to a fraction word by a hyphen: silently wrong amount and unit (S2 + S3, ready). Present since c3c7595, missed earlier.**
- `a half-cup milk` → ready, 1 `each`, name "half-cup milk". Expected 1/2 cup.
- Same for `a quarter-cup sugar`, `a quarter-pound beef`, `a half-pound ground beef` and `1 half-cup butter`.
- `a half-cup of milk` → `unit_unknown`, which is safe.
- Cause: wordParts (quantity.ts:159-165) splits a hyphenated word only when every part is a number word. So "a" reads as 1 and the unit stays in the name, which the name guard does not catch.

**K2. A package weight with a restatement before the container: the count × size is folded into a weight (S6 + S3, and S1 for the count), at needs_review.**
- Present since c3c7595, where these lines were even `ready`; missed earlier.
- `400g (14oz) can chopped tomatoes` → needs_review, q 400 `g`, note "can".
- The label would have unit `can` with package size 400 g.
- Same for:
  - `400 g (14 oz) can tomatoes`
  - `400g/14oz can chopped tomatoes`
  - `400 g / 14 oz can tomatoes`
  - `14 oz (400 g) can tomatoes`
  - `15 oz (425 g) can black beans`
  - `400ml (14fl oz) can coconut milk`
  - `28 oz (794 g) can whole tomatoes`
  - `8 oz (225 g) package cream cheese`
  - `8-oz (225 g) package cream cheese`
  - `16 oz (1 lb) bag frozen peas`
- Correct: `400ml can coconut milk`, `1 x 400g (14oz) can tomatoes`, and `400 g can (14 oz) tomatoes`, which comes back as no quantity, unit can, package 400 g.
- Cause: the "size then container" rule (amount.ts:518-522) only looks right after the unit. The restatement loop (amount.ts:682+) consumes the bracket and the container word ends up in the note.
- This shape is common on metric/US recipe sites. Under A4 (S3 = 0 and S6 = 0 at any status) it is the defect most likely to show up on the holdout.

**K3. Nutrition facts with spelled-out units are `ready` ingredients (S8). This is a regression against 556c28b.**
- `Protein: 20 grams` → ready, 20 g, name "Protein".
- Same for `Fat: 10 grams`, `Sodium: 300 milligrams`, `Carbohydrates: 30 grams` and `Serving size: 1 cup (240 ml)`.
- `Points: 5` and `Weight Watchers points: 5` → ready (these were already wrong before this round).
- Cause: FACT_UNITS (lexicon.ts:354) lacks grams/milligrams, and factValue (classify.ts:135-147) refuses a value followed by a bracket.
- The abbreviated forms are correctly refused: `Protein 20g`, `Calories: 250 kcal`, `Total Fat 10g`, `Serving size: 1 cup`.

**K4. A number-word product name with no amount gets a count (S1 at any status). This is a regression against 556c28b.**
- `Five spice powder` → needs_review, q 5 `each`, name "spice powder".
- Same for `Seven spice blend` (7), `Three cheese blend` (3) and `Four cheese pizza` (4). At 556c28b these had no quantity and the full name.
- Cause: the B5 re-read now happens only when a comma amount or "to taste" follows (engine.ts:374-381).
- Related: `You will need: 2 baking sheets` and `You'll need: 1 piping bag` → needs_review with q 2 / q 1 (equipment, so the label is unsupported; that is S1). They were unsupported at 556c28b; see engine.ts:389.

### SHOULD-FIX (needs_review lines only; not silent)

**S1. Invented alternatives again, contrary to the module's own claim that "a word is never invented".**
- distributeOptions (alternatives.ts:32-45) shares the last option's head with any one-word option that is not in the 34-word STANDALONE_INGREDIENTS list.
- In my new probes, 24 lines produced invented options:
  - `1 lb ham or smoked turkey` → "ham turkey"
  - `1 lb sausage or ground beef` → "sausage beef"
  - `1 cup tea or apple juice` → "tea juice"
  - `1/2 cup Parmesan or Pecorino Romano` → "Parmesan Romano"
  - `1 lb chicken or firm tofu` → "chicken tofu"
  - `1 shallot or red onion` → "shallot onion"
  - `1 cup peas or green beans` → "peas beans"
  - `2 tbsp tahini or peanut butter` → "tahini butter"
  - `1 cup quinoa or brown rice` → "quinoa rice"
  - `1 cup kale or Swiss chard` → "kale chard"
  - `1 tbsp Dijon or whole grain mustard` → "Dijon grain mustard"
  - `1 lb fish (cod, haddock, or halibut)` → "cod fish" and so on
  - plus 13 more: rum, pasta, bacon, leek, brandy, apples, spinach, raisins, shrimp, oregano, capers, parsley, lettuce
- At 556c28b this shape stayed literal (e.g. ["ham", "smoked turkey"]).
- Three comma choices that were correct at 556c28b now give no alternatives and only a note plus `unclassified`: `1 cup broth, chicken or vegetable`, `1 cup flour, all-purpose or bread`, `1 cup stock, chicken or vegetable`.
- `1 can tuna (in oil or water)` → options ["in oil", "water"].
- STANDALONE_INGREDIENTS is honestly documented as a food list, but correctness depends on whether a food happens to be on it, so the rule is not general.

**S2. The exact within-system check now sends ordinary restatements to review (C3).**
- `1/3 cup (5 tbsp) butter`, `2/3 cup (10 tbsp) sugar`
- `2 cups (500 ml / 17 fl oz) stock` and `1 cup (250 ml) (8.5 fl oz) milk`: the fl oz figure restates the ml figure, but it is checked against the cups. Both were ready at 556c28b.

**S3. Smaller misses.**
- `1 pint milk (UK)` → ready, because the system word after the food is not checked. `1 pint (UK) milk` and `1 UK pint milk` → unclassified, which is correct.
- `1 m sausage` → ready, name "m sausage".

**S4. Normalization.** Removing joiners between letters (normalize.ts:23-26) is sensible: `1­2 cups` is no longer 12. But it changes the contract field `normalized` beyond §2's "controls/bidi → spaces", and it is not recorded in CONTRACT §11.

### NITS
- Raw-line names on review lines: `quarter onion`, `dozen eggs`, `quarter-cup sugar`, `two-cup measure flour`.
- `a thousand island dressing` → q 1000; `one hundred percent juice` → q 100 (both review).
- `1 lb potatoes, about 3 medium` → ready, with a count restatement in the note.

### Fixed and generalising (checked with new probes the author has not seen)
- **N1:** product choices are now alternatives — 20 new remark choices such as salted/unsalted, sifted, caster, heavy/whipping, firm/extra-firm, creamy/crunchy, sharp/mild, low-sodium, ground/stick, pitted, semisweet/milk. Sourcing, form and preparation remarks stay notes, as §7.8 says (fresh/frozen, homemade/jarred, minced/crushed, cooked/uncooked). Cut words are now choices (`ground or cubed`).
- **N2:** 14 forms with a count and a package correct (`2 125 g balls`, `1 500 g pack`, `3 330 ml bottles`, `6 2 oz slices`, tubs, pots, bars, and so on). Ambiguous forms go to review (`1 500 g flour`, `3 000 g`). `2 granola bars` and `1 pot roast` stay food. Bracketed range ends work (`2 (or 3) cups`).
- **N3:** 13 same-system contradictions → review; cross-system roundings stay ready.
- **N4:** bare numbers after a comma → `quantity_unassigned`; sizes after a comma stay notes.
- **N5:** hundreds (`three hundred fifty grams`, `a hundred and fifty grams`); `1/2-dozen`; unknown measures after adjectives.
- **N6:** 17 food lines containing meta words are food again (Protein powder, Low sodium soy sauce, Sodium bicarbonate, For serving: …). Abbreviated nutrition facts are refused.
- **N7:** `quarter cup`, `third cup`, `one quarter teaspoon`.
- **N8:** `12"`, `9x13`, `9 by 13 inch`, feet, yards.
- **SF-c to SF-h:** half and half; pound cake and gram crackers; counts no longer put into names; `1.250 g` / `1.750 kg` ambiguous; `a 3 lb chicken` → 1 each plus review; joiners only between letters.
- **Also fixed:** measure words after the unit go to notes; UK/imperial/metric before the unit → `unclassified`.

### Probe statistics
- **Round-1 807 probes at 59756ba:** 32 changed against 556c28b.
  - 8 ready → needs_review: product-choice remarks (correct) and 2 restatement C3s.
  - 6 needs_review → ready: half and half, quarter cup, the 400 g package lines (correct).
  - 3 unsupported → needs_review; 1 unsupported → ready (For serving: crusty bread, correct).
  - Silent ready-but-wrong among the 807: 0 (round 1 at c3c7595: about 69).
  - Problems that show only on review lines: 1 S1 (`You will need`), 2 C3s, 2 comma choices downgraded.
- **Round-2 454 probes:** 154 changed. Of the round-2 S-coded lines, all are fixed except `Weight Watchers points: 5` (S8) and the K4-type `Seven spice blend` (S1 at review). `Dijon grain mustard` is newly invented.
- **291 new round-3 probes:**
  - Silent ready-but-wrong: 12. S2+S3: 5 (K1). S8: 7 (K3: 4 regressed, 3 pre-existing).
  - S-coded at review status: S6/S3: 11 (K2). S1: 6 (K4, plus 2 odd number words).
  - Review-only: 24 invented alternative sets; 4 C3s.
  - S4: 0. S5: 0. S7: 0.
- **Validity, determinism and fuzzing:** every probe (807 + 454 + 291) parsed twice gave identical JSON, with 0 invalid outputs and 0 safety-net hits. Fuzz over 200,000 lines: 0 throws, 0 invalid, 0 net. Worst crafted 500-char line 14.6 ms; about 0.075 ms per line. Hostile inputs are bounded and valid.

### Compatibility
- The commit touches only `src/ingredient/semantic/**` and its tests.
- Legacy engines, the validator, rational, units, page, bench, fixtures, bin, index and engines are unchanged since c3c7595 (apart from the coordinator's doc comment in contract.ts).
- The default engine is still `legacy-table-import-2`. Purity holds (no node:/Date/Math.random/console/process/`@/` in semantic).
- The CLI `line --engine semantic-v1` and `engines` commands work.

### Tests
- `npm run typecheck`: exit 0.
- `npm test`: 34 files passed, 1 skipped; 1675 tests passed, 10 skipped (live-Table parity, which depends on the environment, and one bench-only CLI case).
- The new round-3 tests pin my reported lines. They do not cover K1–K4 or the invented-option shape.

### What I read
I read only `/home/user/rx-author`: the package source, tests, CONTRACT-v1.md, EVALUATION-PLAN-v2.md and `fixtures/ingredients/dev.jsonl`. I also used my own `review/` folder in the scratchpad.

To compare versions I extracted the c3c7595 and 556c28b `src/` trees into that folder with `git archive`, which only reads git objects. I read no holdout, benchmark or evidence files, made no edits and changed no git state. `/home/user/Meal-Planner/node_modules` was used only for module resolution through the symlink.
