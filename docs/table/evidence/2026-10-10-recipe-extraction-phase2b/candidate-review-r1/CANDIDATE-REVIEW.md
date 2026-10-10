# R1 candidate review — `semantic-v2` before freeze

Reviewer R1, read-only. Clone `/home/user/rx2b-r1/review2/repo` at `e92bd34`. Nothing was edited, committed or pushed in the
repository. Everything is in `/home/user/rx2b-r1/review2/`:
- `probes-r1.tsv`, `probes-r1-supplement.tsv` — the probes;
- `out/`, `out-supp/` — per-probe results, summaries and details;
- `HIGH-LINES.md` — every high-severity line;
- `fuzz-*.txt`, `worst-case.txt`, `pkg-*.log`;
- `scripts/`.

## Verdict: **fix before freeze**

The repairs work on what they target. Ordinary lines, quantities, restatements, packages, container cups, per-piece
weights, size words and post-food count nouns are now read almost perfectly on new probes:
- 470 of 480 firm ready lines are C1, against 350/480 for `semantic-v1`;
- 115 of 115 plain everyday lines are C1;
- robustness, purity and compatibility are clean.

But each of several §12 families has a closed vocabulary list, and a line just outside that list falls through to a
**confident ready reading**. These are silent ready-but-wrong lines with S1, S4, S5 or S8:
- equipment lines;
- unknown measure words;
- remark amounts with no marker word;
- `fresh X or dried`;
- `A and B` lists of different foods;
- nutrition abbreviations.

Several reproduce with the contract's **own examples or its listed items**:
- `2 tbsp lime juice (1 lime)` (§12.11);
- twine, foil, skewers and liners (§12.8).

Holdout-v3 must cover every §12 item and is written from the same text. These shapes are therefore likely to appear
there, and with them A3 (high false certainty = 0) and A4 (S1 = S4 = S5 = 0) would fail. HIGH findings H1–H5 and H7–H8
should be fixed, by general rules rather than by adding the probe words, before the freeze. H6 needs a contract decision.

## Probe statistics

**Main set:** 903 new lines.
- I wrote 952 lines from CONTRACT §7, §12 (1–15) and the labelling guide. 49 were removed because they exactly match a
  string in an exposed set (normalized comparison). The exposed sets are:
  - fixtures and the regression corpus;
  - the final-head and review probes;
  - every quoted string in the tests, the engine sources and the docs.
- 875 lines have firm labels: 480 ready, 180 needs_review, 215 unsupported. 28 lines are debatable (D) and excluded from
  the counts. 42 lines are status-only (S).
- The 9-column format of the final-head `probes.tsv`.

**Supplement:** 123 lines (111 firm), written after the first run to measure how wide the HIGH families are. They are
deliberately aimed at weaknesses and are not representative.

Each line was parsed twice per engine. Each output was validated and the safety net checked. Lines were classified by my
own checker (plan v2 §4/§5 + reading 1, CONTRACT §9 comparison), which does not import `bench/`.

| Firm labels, main set | `semantic-v2` | `semantic-v1` |
|---|---|---|
| C1 on ready lines | **470/480** | 350/480 |
| C2 high | **46** | 126 |
| C2 medium | 0 | 9 |
| C3 (unnecessary review) | 6 (5 with a wrong pre-fill) | 71 |
| C4 / C6 | 0 / 0 | 0 / 0 |
| C5 / C5b (wrong pre-fill) | 165 / 18 | 146 / 26 |
| C7 / C8 on unsupported lines | 155 / 33 (+27 C2) of 215 | 85 / 88 |
| Lines with an S code | 50 | 114 |
| HIGH lines (C2 high, or any S1/S3/S4/S5/S6) | **50** | 144 |
| Invented / dropped options | 19 / 0 | 16 / 2 |
| CE (error, invalid, nondeterministic) and safety-net use | 0 | 0 |

**`semantic-v2` by family** (firm labels; C1 counted over ready lines; C3/C4 are unnecessary review/rejection):

| Family | n | C1 | C2 high | C3 | C5b | C8 | HIGH |
|---|---|---|---|---|---|---|---|
| A | 223 | 157/164 | 11 | 6 | 0 | 0 | 11 |
| B | 128 | 17/17 | 5 | 0 | 18 | 0 | 5 |
| C | 151 | 146/149 | 3 | 0 | 0 | 0 | 3 |
| D | 256 | 35/35 | 27 | 0 | 0 | 33 | 31 |
| plain | 117 | 115/115 | 0 | 0 | 0 | 0 | 0 |

Full per-group tables for both engines are in `out/summary.md` and `out-supp/summary.md`.

Groups that are clean (firm labels):
- fractions, ranges and everyday units (plain 115/115);
- restatements: 36 of 36 ready and 15 of 15 review exactly at the 7 % boundary and the rounding allowance;
- package sizes 34/34 (+2 correct reviews);
- container cups 12/12;
- per-piece weights 17/17;
- post-food count nouns 35/35;
- size words 27/27;
- multipliers 23/23 (+3 unsupported correct);
- fraction words 39/41;
- metadata 20/20, diet points 4/4, headings 21/21.

**Regressions against `semantic-v1`:** 15 firm lines got worse.
- 13 are shared-head choices (M1).
- 2 are garbled or headless options (M2, M3).

## Findings

Reproduction format: input → actual `semantic-v2` reading, then what CONTRACT expects. Every listed line is in
`HIGH-LINES.md` with its label.

### HIGH

**H1 — Family D, §12.8 — equipment with a count is read as ready food (S1 + S8).**
- Scope: 25 of 38 firm equipment probes (plus `1 package wooden skewers` among the food-like probes), plus 35 of 40 in
  the supplement.
- Items that §12.8 itself lists:
  - `1 roll kitchen twine` → ready, name "roll kitchen twine", 1 each;
  - `2 sheets aluminum foil` → ready, 2 sheet "aluminum foil";
  - `24 mini cupcake liners` → ready;
  - `1 package wooden skewers` → ready, 1 package;
  - `1 bag wooden skewers` → ready;
  - `1 piping bag fitted with a star tip` → ready;
  - `1 roll aluminum foil` → ready.
- Other examples:
  - `1 rolling pin`, `1 (9-inch) pie plate`, `1 large Dutch oven`, `2 mason jars`, `1 kitchen scale`, `1 wok`;
  - `1 cast iron skillet` — the hyphenated form is recognised, the spaced form is not;
  - `1 12-cup Bundt pan` → equivalent 12 cup;
  - `1 4-quart slow cooker`, `1 2-quart baking dish`;
  - `6 popsicle sticks` → 6 stick "popsicle";
  - `1 box toothpicks` → 1 box;
  - `2 tea towels`, `1 egg slicer`, `1 stockpot`, `1 large saucepan`, `1 immersion blender`, `1 vegetable peeler`,
    `2 oven mitts`.
- Expected: `unsupported` — §12.8 non-food items (pan, baking sheet, skewers, parchment, foil, twine, liners, piping
  bag), "with or without `You will need:`".
- Code:
  - `classify.ts` `equipmentPhrase` needs the last word in `EQUIPMENT_HEADS`, and a modifier from an allow-list unless the
    head is in `PLAIN_EQUIPMENT`;
  - a container or count unit after the number ("roll", "box", "package", "sheets", "sticks") takes priority;
  - with `numericLead`, anything else is food.

**H2 — Family A, §12.14 — unknown measure words become part of a ready name (S4).**
- Scope: 7 of 7 firm probes outside the list, plus 16 of 24 in the supplement.
- Examples:
  - `1 gill single cream` → ready, name "gill single cream", 1 each;
  - `2 drams vanilla essence`, `1 tumbler orange juice`, `2 ladles chicken stock`, `1 teacup caster sugar`;
  - `1 dessert spoon cocoa powder`, `1 thumb fresh ginger`, `1 coffee cup plain flour`, `2 soup spoons sugar`;
  - `1 bowl cooked rice`, `1 hunk Parmesan`, `1 chunk fresh ginger`, `1 slab tofu`, `1 crate oranges`, `1 pottle cream`.
- Expected: `needs_review` — "an amount followed by a token that is neither a registry unit nor part of the food". These
  readings also put the measure inside `name` (§2).
- Words in `UNKNOWN_MEASURES` (dsp, rasher, sachet, punnet, drizzle, glass, shot…) are handled.
- Code: `lexicon.ts` `UNKNOWN_MEASURES` is a closed list. `nameLeftoverGuard` only checks registry mass/volume words and a
  lone letter.

**H3 — Family A, §12.11 — a remark amount that measures the source or another state, with no marker word, gives ready (S4).**
- Scope: 3 firm probes, plus 6 in the supplement, plus the contract example.
- The contract example `2 tbsp lime juice (1 lime)` → ready, note "1 lime". `(from 1 lime)` is handled.
- Other examples:
  - `3 tablespoons lemon juice (about 1 lemon)`;
  - `2 tbsp lime juice (juice of 1 lime)`;
  - `3 tbsp orange juice (1 orange)`;
  - `1 cup grated carrot (2 medium carrots)`;
  - `1 large onion (about 2 cups chopped)`;
  - `1 cup chopped onion (1 medium onion)`;
  - `2 cups diced tomatoes (about 3 tomatoes)`;
  - `1 cup mashed banana (2 ripe bananas)`;
  - `1 cup shredded zucchini (about 1 medium)`.
- Expected: `needs_review` — §12.11: "a second amount … when it measures a source, another state … (`(1 lime)` /
  `(from 1 lime)` for lime juice)".
- Code: `remarks.ts` `remarkSecondAmount` fires only on the words in `REMARK_SOURCE_WORDS`/`REMARK_STATE_WORDS`
  (from/makes/yields/use/dry/cooked…).

**H4 — Family B, §12.7 (d) — `fresh X or dried` / `or frozen` / `dried X or fresh` gives ready, with "or dried" as a note (S4 + S5).**
- Scope: 1 firm probe, plus 6 in the supplement.
- Examples:
  - `2 tbsp fresh oregano or dried` → ready "fresh oregano";
  - `2 tsp fresh rosemary or dried`, `1/4 cup fresh basil or dried`, `1 tbsp fresh sage or dried`;
  - `2 cups fresh cherries or frozen`, `1 lb fresh green beans or frozen`, `1 tbsp dried dill or fresh`;
  - `1 tbsp fresh thyme or dried`. The engine's own `shareOptions` doc names this case as handled ("fresh thyme or dried"
    → dried thyme).
- Expected: `needs_review`, `[fresh oregano, dried oregano]` — §12.7 (d), forward head. §7.8's note rule covers only a
  parenthetical or a remark after a comma.
- Non-remark modifiers work: `1 cup whole milk or skim` gives a choice.

**H5 — Family B, §12.7 (g) — `A and B` (different foods, one amount, no comma) gives a ready compound name (S4).**
- Scope: 4 firm probes, plus 9 in the supplement.
- Examples:
  - `2 cups strawberries and blueberries` → ready "strawberries and blueberries";
  - `2 cups chopped celery and carrots`, `1/4 cup chopped parsley and mint`;
  - `1 cup onion and bell pepper, diced`, `2 cups celery and onion`;
  - `1 lb shrimp and scallops`, `2 tbsp butter and oil`, `1 cup diced onion and celery`.
- Expected: `needs_review` — "Different foods joined by `and` sharing one amount → needs_review".
- Only the comma form is caught (`1 cup carrots, celery and onion` → review). Real compounds are kept correctly
  (`salt and pepper`, `macaroni and cheese`, `oil and vinegar dressing`).
- Code: `engine.ts` `andJoinsFoods` and `plainFoodItem` look only at comma tails.

**H6 — Family C, §7.3 / §12.4 — a registry count noun right after the number, beginning a product name, is taken as the unit (wrong unit, S7).**
- Examples:
  - `2 strip steaks` → 2 strip "steaks";
  - `2 half-pound strip steaks`;
  - `4 cube steaks` → 4 cube "steaks";
  - `4 rib eye steaks` → 4 rib "eye steaks";
  - `4 strip loin steaks` → 4 strip "loin steaks";
  - `2 sheet cakes` → 2 sheet "cakes";
  - `2 wedge salads` → 2 wedge "salads";
  - debatable (D): `1 head cheese`, `1 sheet cake`, `6 stick pretzels`, `4 link sausages`.
- Expected: 2 each "strip steaks", and so on: the cut or dish name.
- The contract does not settle count nouns *before* the food in so many words, but readings like "eye steaks" or
  "2 sheets of cakes" are plainly wrong. `strayUnitWord`'s comment ("strip steak … may begin a food's name") shows the
  intent; the path through `readAmountPhrase` ignores it.
- Recommendation: a §12 clarification, and review when a count noun + noun forms a known cut or dish.

**H7 — Family D, §12.8 — nutrition labels outside `NUTRIENT_WORDS` give ready (S1 + S8).**
- Examples:
  - `Sat. fat: 3 g` → ready "Sat. fat" 3 g;
  - `Carb 30g`, `Prot 20 g`, `Sat Fat 2g`, `Sugar alcohols 4 g`;
  - debatable (D): `18 g protein`, `12 g fat` (amount first).
- Expected: `unsupported` — a nutrient name followed by an amount in g.

**H8 — Family D — S1 on review lines (C8 + S1; A4 counts S1 on all lines).**
- `Serving size 2 cookies (40 g)` → needs_review, 40 g "Serving size".
- `★★★★★ (212)` → needs_review, 212 each.
- `12 paper baking cups` → needs_review, 12 each.
- `Calories: 412kcal | Carbohydrates: 52g | Protein: 18g` → needs_review, 412 each "Carbohydrates" (a one-line nutrition
  panel).
- Expected: `unsupported` with no amount (§12.8).

### MEDIUM (review-only pre-fills; no acceptance criterion, but visible as C5b and invented options)

**M1 — Family B, §12.7 (b) — regression against `semantic-v1`.** Shared heads outside the 29-head `SHARED_HEADS` list
leave the first option headless. 13 lines went from C5a in v1 to C5b in v2.
- `1 cup almond or cashew butter` → ["almond", "cashew butter"].
- The same pattern in:
  - `1 lb pork or chicken sausage`, `1 lb chicken or turkey sausage`;
  - `1 pint cherry or grape tomatoes`, `1 cup peanut or almond butter`;
  - `1 tsp onion or garlic salt`, `1 lb beef or pork tenderloin`, `1 cup coconut or brown sugar`;
  - `1 cup macadamia or cashew nuts`, `4 slider or dinner rolls`, `1 tbsp yellow or Dijon mustard`;
  - `2 cups apple or pear cider`, `4 oz dark or milk chocolate`.
- `1 cup white or whole wheat flour` → ["white wheat flour", …]: a word that was never written.
- Expected `[almond butter, cashew butter]` etc. — M1 alone is not a product of that kind.
- v1's general rule handled all of these. v2 replaced it with per-head lists (`alternatives.ts` (b1)/(b2)).

**M2 — Family B, §12.7 (e) — list sharing invents strings.**
- `1 cup red, yellow, or orange bell pepper, diced` → ["yellow red", "orange bell pepper red"].
- `1 cup red, green, or yellow bell pepper` → ["green red", "yellow bell pepper red"].
- `2 cups red, yellow or orange peppers` → ["yellow red", "orange peppers red"].
- Expected: three bell peppers. "Never dropped, merged or invented."

**M3 — Family B, §12.7 (d), (f) — head lost or category kept.**
- `1 cup flour (all-purpose or whole wheat)` → ["all-purpose", "whole wheat"].
- `2 apples, Granny Smith or Honeycrisp` → ["apples", "Granny Smith", "Honeycrisp"].
- `1 lb Yukon Gold potatoes or red` → [..., "red"].

**M4 — Family A, §12.9 — can-size designations.**
- `1 #10 can diced tomatoes` → needs_review, name null, unit each, note "10 can diced tomatoes".
- `2 No. 303 cans cut green beans` → name "No", unit each.
- `1 (No. 2) can corn` → unit each.
- Expected: ready, 1 can (2 can), designation in the note.

**M5 — Family A — unnecessary review with wrong pre-fills.**
- `2 cups minus 1/4 cup sugar` → name "minus". Expected 7/4 cup (§12.12).
- `2 three cheese pizzas` → name "cheese pizzas", no quantity. Expected 2 each, §12.9.
- `1 tbsp Heinz 57 sauce` → name "Heinz". Expected the number kept in the name, §12.9.
- `a half-inch piece fresh ginger` → no quantity. Expected 1 piece, §12.1 sizing a counted item.

### LOW

**L1 — Contract inconsistency, §12.6.** The engine applies the rounding allowance only when the restated unit is
*smaller* than the first, a condition that is not in §12.6.
- `100 g (4 oz) butter` and `500 g (1 lb) beef mince` → needs_review, although the literal rounding test passes.
- `1 kg (2 lb)` → ready.
- The contract contradicts itself: its policy line says `2 lb (1 kg)` is "outside both tests", yet 2 lb = 0.907 kg
  rounds to 1. The literal rounding test therefore passes (computed exactly in `scripts/restate_check.py`).
- This should be settled in the contract before holdout-v3 labels are written. I labelled these lines D.

**L2 — Family D — non-ingredient lines sent to review (C8; not an acceptance error).** 33 firm lines.
- Furniture outside `PAGE_WORDS`: `Cook Mode`, `Save to Recipe Box`, `Did you make this recipe?`, `Skip to content`,
  `Get the Recipe`, `Hide Images`.
- `Tap or click steps to mark as complete` → becomes a choice.
- Instructions opening with food-like verbs that the verb list leaves out: `Brown…`, `Top with…`, `Roast…`, `Grill…`,
  `Cool…`, `Toast…`, `Store…`, `Sear…`, `Steam…`, `Braise…`, `Crack…`, `Shake…`, `Taste…`, `Enjoy!`.
- `No reviews yet`, `Pressure cook 12 minutes`.

## Robustness, purity, compatibility

All clean. Every check passed.

**Determinism and validity.**
- All 1 026 probes were parsed twice by both engines: 0 errors, 0 invalid outputs, 0 nondeterministic.
- `guardedParse` net = "none" on every probe.

**Fuzz.** 2 × 100 000 seeded generated lines (`scripts/fuzz.ts`, seeds 20261010 and 7):
- the generator mixes numbers, units, foods, remark/heading/nutrition words, brackets, unicode, joiners, bidi controls,
  and long or nested lines;
- 0 throws, 0 safety-net uses, 0 invalid unchecked readings, 0 nondeterminism;
- p50 0.07 ms, p99 0.48 ms, max 15.5 ms.

**Boundedness.** Adversarial lines of 100–100 000 characters (`worst.ts`) took at most 10.8 ms; input is capped at 500
characters.

**Purity.** No `node:`, `Date`, `Math.random`, `console`, `process`, `fetch`, `require` or dynamic import in
`semantic-v2/`. Its imports are only `contract`, `rational`, `units`, `validate` and its own modules.

**Frozen code unchanged.** `src/ingredient/semantic/` (v1), `src/ingredient/legacy.ts`, `src/legacy/`, `contract.ts`,
`rational.ts`, `units.ts`, `validate.ts` and `src/page/` have no changes from `8131fe0` to `e92bd34`.

**Default engine.** `DEFAULT_ENGINE_ID = LEGACY_ENGINE_ID` is unchanged; `semantic-v2` is only registered by id.

**No app file changed against `origin/main` (`8c9fd8c`).** Nothing under `src/`, `tests/`, `migrations/`, `scripts/`,
`deploy/` or `package*.json` changed. Outside the package only docs differ.

**Candidate commits stay in their lane.** The 9 Worker A commits (`d22ecf4` … `dfeafa0`) touch no `bench/`,
`tools/mutation/`, `fixtures/`, CONTRACT, regression corpus, v1 or legacy file. Scorer v3 changes come only from
Worker B's commits.

**Package checks.** Typecheck exit 0. Tests: 4 179 passed, 11 skipped (the pre-existing skips), 0 failed.

## Code-reading notes

- **The main risk is the default when a word is unknown.**
  - The family A–D repairs are closed lists: `EQUIPMENT_HEADS`/`PLAIN_EQUIPMENT`/modifier allow-list,
    `UNKNOWN_MEASURES`, `NUTRIENT_WORDS`, `PAGE_WORDS`, `INSTRUCTION_VERBS`, `SHARED_HEADS` (29 heads),
    `CATEGORY_NOUNS`, `PRODUCT_IDENTITY_NOUNS`, `REMARK_SOURCE_WORDS`.
  - When a line falls outside a list, the engine reads it as **ready food**, not review. H1, H2, H3, H5 and H7 all come
    from this.
  - Suggested general repairs, not word additions:
    - (H2) a word between a count and the food that is neither a registry unit nor plausibly the start of the food
      name → `unit_unknown`;
    - (H3) a bare count of a whole food in brackets after a juice/zest/chopped/grated/mashed/diced name is a source;
    - (H4) `or` + only remark words with no bracket or comma → rule (d);
    - (H5) two plain foods joined by `and` after an amount → review, unless a known compound;
    - (H1) accept spaced and hyphenated modifier forms and a wider equipment head class;
    - (H1) a container or count unit followed by a non-food item should not short-cut to food.
- **No exact corpus strings appear in regexes.**
  - The comments cite exposed case ids as provenance.
  - Some list entries look fitted to exposed lines: `strip: york city`, `INVARIANT_PLURALS … anise`, `hot_dog`,
    `great_northern`, `yukon_gold`, and "dutch", "oven" as equipment modifiers while "oven" is not a head.
  - The failures sit at the edges of these lists.
- **Brittle special cases.**
  - `wok` is listed as an equipment head but needs a modifier.
  - `cast-iron` is recognised but `cast iron` is not.
  - `slider` is a modifier for buns but not for rolls.
  - The rounding rule carries an unwritten unit-size condition (L1).
- **No wholesale review.**
  - Plain lines 115/115 are ready and correct.
  - Unnecessary review is 6 of 480 firm ready lines.
  - No line was rejected as unsupported when it was food (C4/C6 = 0 firm).
- **Safety net.** `guardedParse` turns a throw or an invalid reading into needs_review, so a future defect would appear
  as review rather than CE. It was never used here.

## Limits

- The labels are mine: same model family as the author, so not fully independent.
- Debatable lines (D) are excluded from the counts. Status-only lines (S) judge only the status.
- The HIGH findings rest mostly on explicit contract text: §12.8's listed items, §12.11's `(1 lime)`, §12.14, and §12.7
  (d) and (g). H6 and L1 need contract decisions.
- My probes are not holdout material. The author sees only these findings, and the probe strings in them are now exposed.
