# R1 candidate review, round 2 — `semantic-v2` at `a8b76db`

Reviewer R1, read-only. Clone `/home/user/rx2b-r1/review3/repo` at `a8b76db`. The engine at `e92bd34` is read from the
round-1 clone for comparison. Nothing was edited, committed or pushed in the repository. Files alongside this report:
- `probes-r1-round2.tsv` — round-1 probes, relabelled, with seen/held flags;
- `RELABELLED.md`;
- `probes-fresh.tsv` and `probes-fresh-excluded-exposed.txt`;
- `out-r1/`, `out-fresh/` — per-probe JSON and details;
- `RESULTS-round1-probes.md`, `RESULTS-fresh.md`, `HIGH-LINES-2.md`;
- `fuzz-*.txt`, `worst-case.txt`, `pkg-*.log`, `scripts/`.

## Verdict: **not acceptable to freeze yet**

The coordinator's bar is no firm HIGH line on fresh probes and no regressions. Both fail:
- **52 firm HIGH lines on the 543 fresh probes** (C2 high, or S1/S3/S4/S5/S6). The same lines at `e92bd34` gave 115.
- **14 regressions**: lines correct at `e92bd34` that are wrong now. 13 are on fresh probes and 1 is held back. All are
  review-only (C3/C5b), none high-severity.

Most fixes generalize well:
- 125/125 plain lines;
- A2 restatements 25/25;
- A3 remark amounts 38/40;
- `and` lists 15/15;
- §12.15 units with no number 22/23;
- nutrient-word foods 15/15.

The two biggest round-1 families did not generalize: equipment (H1) and unknown measure words (H2). The fix enumerated
my reported words into longer closed lists. Fresh probes with other everyday words still get a confident ready reading:
- equipment 27/58 correct;
- unknown measures 10/26 correct.

## 1. Round-1 probes re-run (relabelled per CONTRACT §12.6 A2 and §12.A A1, A3, A4)

**Relabelling.** 18 probes were relabelled; the list is in `RELABELLED.md`.
- A2 (rounding allowance): `100 g (4 oz)` and `500 g (1 lb)` become needs_review; `1 kg (2 lb)` becomes ready.
- A3 (prepared same food): 7 lines go from needs_review to ready, e.g. `1 cup chopped onion (1 medium onion)`.
- A1 (count word before the food): `6 stick pretzels`, `4 link sausages` and `3 cube rolls` become firm `each`;
  `2 slice cheesecake` becomes 2 slice.
- A4 (modifiers before one head): 2 lines now debatable.
- One A1/§12.4 conflict is marked debatable: `4 leaf lettuce leaves`. A1 read literally gives 4 each "leaf lettuce
  leaves", while §12.4 gives 4 leaf "leaf lettuce".
- No old label was counted against the engine.

| Firm labels, `a8b76db` | n | C1 on ready | C2 high | C3 | C5b | C7 of U | C8 | HIGH now | HIGH at `e92bd34` |
|---|---|---|---|---|---|---|---|---|---|
| (a) the 152 reproductions the author saw (150 firm) | 150 | 19/19 | 0 | 0 | 0 | 70/70 | 0 | **0** | 121 |
| (a′) probes quoted only in the round-1 report | 17 | 4/4 | 0 | 0 | 0 | 10/10 | 0 | 0 | 3 |
| (b) held back, never shown | 825 | 480/480 | 0 | 0 | 1 | 180/187 | 7 | **0** | 0 |

- Every reproduction now passes.
- The held-back lines were already almost all correct at `e92bd34`: every round-1 HIGH line was reported, so none of the
  held-back lines carried one. They therefore test non-regression, not generalization.
- **One held-back regression:** `2 cups vanilla or plain yogurt` gives ["vanilla", "plain yogurt"] (C5b, invented
  option); it was C5a before. The cause: yogurt's sources became `$FRUIT greek coconut soy`, which loses "vanilla".
- The 7 C8 lines are furniture and abbreviated-nutrition lines sent to review; not an acceptance error.

## 2. Fresh probes

**The set.** I wrote 594 lines from CONTRACT §7, §12 (including 12.15) and §12.A.
- 31 were removed because they exactly match an exposed string. Several of those were already in the author's new tests
  (`1 cake tester`, `1 potato ricer`, `1 cherry pitter`, `Knob of butter`, …).
- **563 fresh probes remain: 543 firm, 20 debatable, 48 status-only. 126 of them are plain everyday lines.**
- They are aimed at the repaired families with new vocabulary and new constructions, not the reported shapes.

| Group | n (firm) | Ready lines fully correct (C1) | C2 high | S codes | C3 (C3b) | C5b | C8 | Regressions |
|---|---|---|---|---|---|---|---|---|
| plain | 126 | **125/125** (+1 correct review) | 0 | – | 0 | 0 | – | 0 |
| equipment (unsupported) | 58 | – (C7 27/58) | **31** | S1+S8 ×31 | – | – | 0 | 0 |
| food that looks like equipment | 18 | 12/18 | 0 | – | 6 (1) | – | – | 3 |
| unknown measures (§12.14) | 27 | 1/1 (+10/26 reviews right) | **16** | S4 ×16 | 0 | 0 | – | 0 |
| food that looks like a measure | 16 | 8/14 | 0 | – | 6 (5) | 0 | – | 4 |
| remark amounts (§12.11, A3) | 40 | 19/21 (+19/19 reviews right) | **1** | – | 1 | 0 | – | 1 |
| `and` lists and compounds (A4) | 36 | 16/21 (+15/15 lists right) | 0 | – | 5 | 0 | – | 5 |
| choices with shared heads | 38 | – | 0 | – | – | **15** (15 invented) | – | 0 |
| count words before foods (A1) | 24 | 19/24 | **4** | S3+S7 ×3 | 1 (1) | – | – | 1 |
| units with no number (§12.15) | 23 | 17/17 | 0 | – | 0 | 1 | – | 0 |
| nutrition (unsupported/review) | 35 | – (C7 25/33) | 0 | S1 ×1 | – | – | 8 | 0 |
| foods with nutrient words | 15 | 15/15 | 0 | – | 0 | – | – | 0 |
| can designations (§12.9) | 11 | 8/11 | 0 | – | 3 (3) | – | – | 0 |
| furniture, steps, headings | 38 | – (C7 23/38) | 0 | – | – | – | 15 | 0 |
| restatements (A2) | 25 | **16/16** (+9/9 reviews right) | 0 | – | 0 | 0 | – | 0 |
| other quantities | 14 | 11/11 (+3/3) | 0 | – | 0 | 0 | – | 0 |
| **All firm** | **543** | **267/293** | **51** (+1 S1-only) | S1 32, S8 31, S4 16, S3 3, S7 3 | 22 (10) | 16 | 23 | **13** |

The same fresh probes at `e92bd34` gave 115 HIGH lines, now 52. Every probe was parsed twice: 0 errors, 0 invalid
outputs, 0 nondeterministic results, safety net never used.

### Remaining HIGH lines on fresh probes (firm labels; full rows in `HIGH-LINES-2.md`)

- **H1′ — equipment is read as ready food (S1 + S8), 31 of 58.** Examples:
  - `1 splatter guard`, `1 dough hook`, `1 popover tin`, `1 pizza wheel`, `1 pastry wheel`, `1 cooling grid`;
  - `1 double boiler`, `1 bain-marie`, `1 comal`, `1 molcajete`, `1 chinois`, `1 proofing basket`, `1 banneton`;
  - `1 cake dome`, `1 bag pie weights`, `1 box cling film`, `1 decorating comb`, `1 cake leveler`, `1 turntable`;
  - `6 cocktail umbrellas`, `12 paper straws`, `1 nut milk bag`, `1 muslin cloth`, `1 apron`, `1 popcorn popper`;
  - `1 corkscrew`, `1 dough docker`, `1 fondue set`, `1 3-quart saucier`, `1 oil mister`, `1 bread lame`.

  Rule: §12.8, non-food items → `unsupported`. Each of these heads is missing from `EQUIPMENT_TOOL_HEADS`, the vessel
  purpose lists or `KITCHEN_ACTION_VERBS`.
- **H2′ — unknown measure words end up inside a ready name (S4), 16 of 26.**
  - Probes: `1 swirl heavy cream`, `2 squirts lemon juice`, `1 tot dark rum`, `1 bundle asparagus`, `1 hand bananas`,
    `1 twig rosemary`, `1 nip whisky`, `1 snifter cognac`, `1 flask brandy`, `1 eggcup rice`, `1 cake fresh yeast`,
    `1 shake paprika`, `1 smear Marmite`, `1 knuckle ginger`, `2 clusters grapes`, `1 tub-load ice`.
  - An ad hoc check, not in the counts: `4 skewers chicken` → ready "skewers chicken".

  Rule: §12.14. `UNKNOWN_MEASURES` is still a closed list; these words are not in it.
- **H9 — new: an imprecise registry unit before a food name is taken as the unit (S3 + S7).**
  - `6 drop biscuits` → 6 drop "biscuits";
  - `12 drop cookies` → 12 drop "cookies";
  - `4 sprinkle donuts` → 4 sprinkle "donuts";
  - debatable: `2 pound cakes` → 2 lb "cakes".

  A1 covers count words only. A careful cook never reads "6 drops of biscuits", but the contract should settle it,
  because the label unit (each, count) against the engine's drop (imprecise) is S3.
- **H10 — the package size is lost when the bracket also holds a remark word.** `1 can tomatoes (14.5 oz, undrained)`
  → ready, 1 can, no package size. `1 can tomatoes (14.5 oz)` and `1 can (14.5 oz) tomatoes, undrained` are both
  correct. Rule: §7.4 — a container's contents are the packageSize.
- **H8′ — S1 on a review line.** `Vit. C 12 mg` → needs_review, 12 mg "Vit. C" (should be unsupported).

### Regressions: right at `e92bd34`, wrong now (all review-only)

| Cause in the fix round | Fresh lines |
|---|---|
| New unknown-measure words (`leg`, `rack`, `finger`, `stone`, `slab`, `roll(s)`, `pot`) catch cut and dish names | `6 finger sandwiches`, `3 stone crab claws`, `2 slab pies`, `1 chicken pot pie` (→ name "pie", no quantity), `2 rolls, split` (→ C3c); also C3 though not regressions: `1 leg of lamb (about 5 lb)`, `1 rack of lamb, frenched`, `2 racks of lamb` (→ name "lamb", no quantity) |
| `bowl` as an "unsure" vessel catches bowls made of food | `4 bread bowls`, `4 tortilla bowls`; same shape, not regressions: `12 wonton cups`, `6 lettuce cups`, `8 phyllo cups` |
| The A4 `and` rule is broader than A4 ("modifiers joined by `and` before one head are one food") | `2 tbsp lemon and lime juice`, `1 jar black bean and corn salsa`, `1 pack bacon and cheese pierogies`, `1 bag apple and cinnamon oatmeal`, `1 jar garlic and herb cream cheese` → review with no name |
| `otherFoodIn` treats a remark word as another food | `1 lb large shrimp (21-25 count)` → review |
| Shared-head sources for yogurt lost "vanilla" (held back) | `2 cups vanilla or plain yogurt` → ["vanilla", "plain yogurt"] |

Ad hoc checks, not counted: `2 lbs short plate` (a beef cut) and `4 Italian grinders` (sandwiches) are now
**rejected as unsupported** (C4), because `plate` and the agent noun of `grind` are equipment heads.

### Other review-only issues on fresh probes (MEDIUM/LOW)

- **Shared-head choices outside the per-head source lists, 15 of 38** (C5b, invented option):
  - `1 tbsp date or maple syrup` → ["date", "maple syrup"];
  - `1 cup chocolate or butterscotch chips`, `2 cups acorn or butternut squash`, `1 tbsp clover or wildflower honey`;
  - `2 chamomile or mint tea bags`, `1 lb Black Forest or honey ham`, `8 slices turkey or pork bacon`;
  - `1/2 cup rice or plum wine`, `1 cup goat or sheep milk yogurt`, `2 cups pear or apple sauce`;
  - `2 tbsp mango or peach chutney`, `1 lb spinach or egg fettuccine`, `2 cups vanilla or chocolate pudding`;
  - `1 tsp lavender or rose water`, `1 lb Mexican or Spanish chorizo`.
- **Can designations** with a fraction or a size word go to review with unit each:
  - `1 #2½ can pumpkin purée`;
  - `2 No. 2 1/2 cans apricots` → name "No";
  - `1 large (#2) can crushed pineapple`.
- **`Scant cup sugar`** → name "Scant cup sugar". The status is right (§12.15), but the unit sits in the name.
- **23 non-ingredient lines sent to review (C8):**
  - nutrition: `Energy 1046 kJ / 250 kcal`, `Kilocalories 210`, `Calories from fat 90`, `% Daily Value`,
    `Includes 10g Added Sugars`, `Carbs (net) 4 g`, `Omega-3 fatty acids 1.1 g`;
  - furniture: `Print Friendly Version`, `Share on Pinterest`, `Read More`, `Keep Screen Awake`, …;
  - steps: `Stuff each pepper…`, `Top each bowl…`, `Cool slightly, then slice.`

## 3. Code reading (`e92bd34..a8b76db`)

**The fix is mostly longer word lists.** The generalized rules work: A3 extracted parts, the A4 list rule, §12.15, A2
rounding, `formChoice`. The enumerations do not:
- `UNKNOWN_MEASURES` now contains every measure word from my round-1 report (gill, dram, teacup, tumbler, ladle, saucer,
  pottle, hunk, chunk, slab, thumb, bucket, crate, carafe, stone, wineglass, plus "rack" and "leg").
- `EQUIPMENT_TOOL_HEADS` and the vessel purpose lists contain all my reported heads (stone, steel, mat, mitt, scale,
  slicer, masher, press, spinner, torch, mallet, needle, timer, pin, iron, maker, "popsicle lollipop", "mason canning").
- `NUTRIENT_WORDS` gains "sat carb prot chol sod alcohols".
- `PAGE_WORDS` gains "mode box content get hide show images … did you yet no".
- `FOOD_NAME_VERBS` is exactly my L2 list, plus 7 more.

The lists were also widened by class (MEAT/NUT/FRUIT/VEG/GRAIN sources, agent nouns of `KITCHEN_ACTION_VERBS`), which
explains part of the generalization. But the measured outcome is clear:

| Family | Reported (seen) lines | Fresh lines |
|---|---|---|
| Equipment | 100 % correct | 47 % (27/58) |
| Unknown measures | 100 % | 38 % (10/26) |
| Shared heads | 100 % | 61 % (23/38) |

**Unknown → review rules now catch ordinary food** (the regressions above):
- `rack`/`leg` added as measures in `1ecec01`;
- `finger`, `stone`, `slab`, `roll`, `pot` in `UNKNOWN_MEASURES`;
- `BARE_EQUIPMENT_HEADS` "bowl";
- the "and" rule `andJoinsTwoFoods`, against A4's modifier compounds;
- `otherFoodIn` in remarks ("count");
- the equipment heads `plate` and `grinder`.

**Architecture.** Equipment and unknown measures are open-vocabulary. Without a food lexicon the engine cannot tell
`1 tot dark rum` from `1 chicken breast` or `1 comal` from `1 croissant`, so these families will keep leaking until:
- the contract accepts a review default for these shapes, at the cost of more C3; or
- the lexicons are made far larger, by class rather than by reported word.

This is a decision for the coordinator before the freeze. Holdout-v3 will contain §12.8 and §12.14 lines in its own
vocabulary.

**Robustness.**
- Fuzz, 2 × 100 000 seeded lines: 0 throws, 0 safety-net uses, 0 invalid readings, 0 nondeterminism; p99 0.49 ms,
  max 13.7 ms.
- Adversarial lines up to 100 000 characters: worst 13.2 ms (input capped at 500).
- All 1 589 probes (1 026 round-1 + 563 fresh), 2 parses × 2 engine versions: deterministic, valid, safety net unused.

**Purity.** No `node:`, `Date`, `Math.random`, `console`, `process`, `fetch` or dynamic import in `semantic-v2/`.

**Compatibility.**
- `semantic-v1`, `src/legacy`, `legacy.ts`, `contract.ts`, `rational.ts`, `units.ts`, `validate.ts`, `src/page`,
  `engines.ts` and `index.ts` are unchanged since `e92bd34`.
- `DEFAULT_ENGINE_ID = LEGACY_ENGINE_ID`.
- No app file changed against `8c9fd8c`.
- **`bench/` (the scorer) is untouched** between `e92bd34` and `a8b76db`.
- The 5 fix commits touch only `src/ingredient/semantic-v2/` and `tests/semantic-v2/`.

**Package checks.** Typecheck 0; tests 4 652 passed, 11 skipped (the pre-existing skips), 0 failed.

## 4. What must be fixed before freeze

1. **H1′ equipment** and **H2′ unknown measures.** These are open-vocabulary families. Either:
   - (a) decide in the contract or plan that such lines default to review, and implement a structural rule; or
   - (b) extend the lexicons by class, not by word, and re-measure on fresh vocabulary.

   Without one of these, A3 and A4 (S1, S4) remain at risk on holdout-v3.
2. **H9:** imprecise unit before a food name (`6 drop biscuits`). This needs a contract decision (extend A1 to imprecise
   units) and an engine rule.
3. **H10:** keep the package size when the bracket after the food also holds a remark (`(14.5 oz, undrained)`).
4. **H8′:** `Vit. C 12 mg` should be unsupported with no amount.
5. **The 14 regressions:**
   - narrow the unknown-measure and `bowl`/`cup` vessel rules so that cut and dish names stay food (`leg of lamb`,
     `rack of lamb`, `finger sandwiches`, `stone crab claws`, `slab pies`, `chicken pot pie`, `bread bowls`, `rolls`);
   - apply A4's modifier-compound reading before the `and`-list rule;
   - let `otherFoodIn` ignore count designations ("21-25 count");
   - restore "vanilla" as a yogurt source.
6. **Optional (review-only):** shared-head sources by class for more heads (syrup, chips, squash, honey, tea, ham, bacon,
   wine, pudding, chutney…). Also the can-designation variants and `Scant cup sugar`.

Label caveats: all labels are mine (same model family as the author). Debatable lines are excluded from the counts, and
status-only lines judge status only. The equipment and unknown-measure HIGH lines rest on §12.8 ("non-food items") and
§12.14 directly. H9 rests on a careful-cook reading that the contract does not yet settle.
