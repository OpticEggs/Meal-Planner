# Candidate review R1, round 3: `semantic-v2` at `ea674ec` (pre-freeze)

Reviewer R1, read-only. Fresh clone `/home/user/rx2b-r1/review4/repo` at `ea674ec` (node_modules symlinked).
Nothing in the project was edited, committed or pushed; no network, no database; only package-level commands.
Classifier: my own (plan v2 classes C1–C8/CE, S1–S8; HIGH = C2 high or any S1/S3/S4/S5/S6); nothing from `bench/`.
Every probe was parsed twice (determinism) and through `guardedParse` (safety net).

**Verdict: not acceptable to freeze.** The round-3 change is a large step forward (HIGH on my new probes falls
from 125 at `a8b76db` to 33 at `ea674ec`; zero firm HIGH on all 1 535 earlier probes; zero food rejected as
`unsupported`; zero CE; the recognised-food abstention is always safe). But two systematic HIGH families remain on
fresh probes: equipment read as ready food (16/137 equipment probes, 11.7 %) and unknown measure words read into the
name with an invented count (17/69 unknown-measure probes, 24.6 %). The 19 regressions are all by-design
recognised-food abstentions (C1 → safe review, no amount); there are no other regressions.

Owner rule respected throughout: **safe abstentions (C8, needs_review with no amount, unit, package or options) are
reported separately** from correct rejections (C7) and correct readings (C1/C5); they are never counted as exact.

## Files alongside

| File | What |
|---|---|
| `probes-r3-new.tsv` | 535 brand-new probes (533 firm, 2 debatable), 9-column labels + group |
| `probes-r3-excluded-exposed.txt` | 71 candidate lines dropped because they were exposed |
| `probes-prior-round3.tsv` | all 1 589 earlier probes with set (r1-main / r1-supp / r2-fresh) and seen/held flag |
| `RESULTS-new.md`, `RESULTS-prior.md` | partition tables, every HIGH, regression, C3, C5b, C8 and safe-abstention line |
| `family-table-new.md`, `prior-by-set.md` | the per-family and per-set tables below |
| `out-new/`, `out-prior/` | raw per-probe readings (`probe-results.json`) for `ea674ec` and `a8b76db` |
| `fuzz-100k.txt`, `fuzz-100k-seed7.txt`, `worst-case.txt` | robustness runs |
| `scripts/` | `run3.ts`, `part3.js`, `family3.py`, `exposed3.py`, `fresh3_def.py`, `fuzz.ts`, `worst.ts`, `adhoc.ts`, `lexcheck.ts`, `toolfood.ts` |

Exposure dedupe (exact normalised string, NFC + lower case + collapsed spaces) against: fixtures, the regression
corpus (`exposed-regressions-2b.jsonl`, `r1-round2-findings.tsv`), every evidence TSV, the review probe files, all
my earlier probes, `tests/semantic-v2/data/*.txt` (plain 2 217 + overlap 287 lines) and every quoted string in the
package tests, src and docs. 71 candidates were dropped (38 of them were in the author's plain-food data).

## 1. Earlier probes (round 1, round-1 supplement, round-2 fresh)

"Seen" = in my published round-1 or round-2 material (seen flag, `r1-round2-findings.tsv`, or quoted in the round-2
evidence documents). "Held" = never shown to the author. Firm labels only (54 debatable lines excluded).

| partition | n | R/A/U | exact | C1/R | C5 ok/A | C7/U | **safe abstention/U** | other C8 | HIGH | regressions |
|---|---|---|---|---|---|---|---|---|---|---|
| (a) seen | 272 | 51/97/124 | 241 | 51/51 | 97/97 | 93/124 | **31/124** | 0 | 0 | 0 |
| (b) held | 1 263 | 745/246/272 | 1 241 | 737/745 | 246/246 | 258/272 | **14/272** | 0 | 0 | 8 |

By set:

| set | partition | n | exact | C1/R | C5 ok/A | C7/U | safe abst./U | other C8 | C3 (recognised-food abst.) | HIGH | regressions |
|---|---|---|---|---|---|---|---|---|---|---|---|
| r1-main | seen | 88 | 88 | 13/13 | 34/34 | 41/41 | 0/41 | 0 | 0 (0) | 0 | 0 |
| r1-main | held | 791 | 785 | 468/470 | 147/147 | 170/174 | 4/174 | 0 | 2 (2) | 0 | 2 |
| r1-supp | seen | 83 | 83 | 12/12 | 32/32 | 39/39 | 0/39 | 0 | 0 (0) | 0 | 0 |
| r1-supp | held | 30 | 27 | 8/8 | 9/9 | 10/13 | 3/13 | 0 | 0 (0) | 0 | 0 |
| r2-fresh | seen | 101 | 70 | 26/26 | 31/31 | 13/44 | 31/44 | 0 | 0 (0) | 0 | 0 |
| r2-fresh | held | 442 | 429 | 261/267 | 90/90 | 78/85 | 7/85 | 0 | 6 (6) | 0 | 6 |

- Every unsupported label is either rejected (C7) or safely abstained; no other C8; no C4/C6; no C5b; no CE.
- Seen lines: 52 HIGH at `a8b76db` → 0 now; 71 lines fixed. Held lines: 0 HIGH before and after; 4 fixed, 8 regressed.
- **The 8 held-back regressions are all recognised-food abstentions on valid foods** (by design, safe, no amount):
  `1 box 5-minute rice`, `1 pack 2-minute noodles` (modifier `N-minute`), `2 funnel cakes`, `4 hand pies`,
  `1 package toaster pastries`, `4 crusty rolls`, `4 slice-and-bake cookies` (modifier unrecognised),
  `1 scoop whey protein isolate` (head `isolate`).
- 16 debatable HIGH lines (not counted, unchanged since round 2) are listed in `RESULTS-prior.md`; among them
  `1 sprinkling sugar` (SD in round 2) still reads ready — the fresh U-unknown probes below make that family firm.

## 2. New probes (535; 533 firm)

| requested family | probes | groups |
|---|---|---|
| ≥150 plain everyday lines, varied and less common foods | 169 | P-counted 105, P-measured 64 |
| ≥80 legitimate foods overlapping equipment/measure vocabulary | 90 | O-overlap |
| ≥80 equipment lines, new vocabulary, brand appliances | 137 | E-brand 46, E-foodword 33, E-new 50, E-titlecase 8 |
| ≥60 unknown measure words before known foods | 69 | U-unknown |
| other families | 68 | A5 7, A6 10, A-misc3 4, A-remark3 6, B-and3 12, B-choice3 13, D-misc3 16 |

Per family (firm). "Unnecessary review" = C3 not caused by the recognised-food gate. "Review burden" = a valid
ingredient sent to review **only because a food or modifier is unrecognised** (abstention with `unclassified` +
`quantity_missing`), reported separately.

| family | n | R/A/U | C1 on ready | C5 ok/A | C7/U | **safe abst./U** | other C8 | HIGH (S codes) | HIGH at a8b76db | unnecessary review | **review burden** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P-counted | 105 | 105/0/0 | 97/105 | – | – | – | 0 | 0 | 0 | 3 | **5/105 (4.8 %)** |
| P-measured | 64 | 64/0/0 | 64/64 | – | – | – | 0 | 0 | 0 | 0 | **0/64** |
| O-overlap | 90 | 90/0/0 | 82/90 | – | – | – | 0 | 0 | 3 | 0 | **8/90 (8.9 %)** |
| E-brand | 46 | 0/0/46 | – | – | 25/46 | **15/46** | 0 | 6 (S1 S8) | 20 | – | – |
| E-foodword | 33 | 0/0/33 | – | – | 11/33 | **13/33** | 0 | 9 (S1 S8) | 22 | – | – |
| E-new | 50 | 0/0/50 | – | – | 24/50 | **24/50** | 1 | 1 (S1 S8) | 25 | – | – |
| E-titlecase | 8 | 0/0/8 | – | – | 8/8 | 0/8 | 0 | 0 | 0 | – | – |
| U-unknown | 69 | 0/69/0 | – | 52/69 | – | – | 0 | 17 (S4) | 44 | 0 | 0/69 |
| A5-imprecise | 7 | 7/0/0 | 6/7 | – | – | – | 0 | 0 | 1 | 0 | 1/7 |
| A6-package | 10 | 10/0/0 | 10/10 | – | – | – | 0 | 0 | 10 | 0 | 0/10 |
| A-misc3 | 4 | 4/0/0 | 4/4 | – | – | – | 0 | 0 | 0 | 0 | 0/4 |
| A-remark3 | 6 | 3/3/0 | 1/3 | 3/3 | – | – | 0 | 0 | 0 | 2 | 0/6 |
| B-and3 | 12 | 5/7/0 | 5/5 | 7/7 | – | – | 0 | 0 | 0 | 0 | 0/12 |
| B-choice3 | 13 | 0/13/0 | – | 11/13 (2 C5b) | – | – | 0 | 0 | 0 | 0 | 0/13 |
| D-misc3 | 16 | 0/0/16 | – | – | 13/16 | **3/16** | 0 | 0 | 0 | – | – |
| **all** | **533** | 288/92/153 | **269/288** | **73/92** | **81/153** | **55/153** | **1** | **33** | **125** | **5** | **14/380 (3.7 %)** |

- C4/C6 (food rejected): 0. CE / safety net / nondeterminism: 0. Lines fixed vs `a8b76db`: 51.
- Plain everyday burden: 5/169 (3.0 %); counted plain 5/105; measured plain 0/64 (mass/volume lines are not gated).
- **Burden split (new probes, 14):** head unrecognised 5 — `12 fiddlehead ferns` (`ferns`), `4 slices prosciutto
  di Parma` (head taken as `Parma`), `4 Jell-O shots` (`shots` is an unknown measure), `2 beef plate ribs` (`ribs`
  read as a unit, name `beef plate`), `2 pan bagnat`; modifier unrecognised 9 — `2 pig's trotters` (`pig's`),
  `1 carton barista oat milk`, `2 very ripe plantains`, `4 griddle cakes`, `2 mug cakes`, `1 can straw mushrooms`,
  `6 toaster waffles`, `6 boiler onions`, `6 pinch-pleated dumplings`. Five of the nine modifiers are equipment
  words (the guard working as designed); intensifiers are a cheap gap: ad hoc `2 very ripe bananas`,
  `3 really ripe avocados`, `3 slightly green bananas`, `1 super ripe mango`, `2 good-quality baguettes` all abstain.
- **Unnecessary review not caused by the gate (5):** `3 passion fruit`, `2 dragon fruit`, `2 star fruit`
  (`unclassified`, amount kept — count before an invariant plural), `1/2 cup chopped dates (8 Medjool)`,
  `3 cups cubed watermelon (1/4 melon)` (`quantity_unassigned`).
- C5b (needs_review, invented option): `1 cup Thai or Genovese basil` → `["Thai","Genovese basil"]`;
  `2 cups butter or iceberg lettuce` → `["butter","iceberg lettuce"]`. Other C8: `4 pint jars` → needs_review,
  unit jar, package 4 pint (not a safe abstention).
- 11 of the 14 burden lines are regressions against `a8b76db` (`2 pig's trotters`, `1 carton barista oat milk`,
  `4 slices prosciutto di Parma`, `12 fiddlehead ferns`, `2 very ripe plantains`, `4 griddle cakes`,
  `4 Jell-O shots`, `1 can straw mushrooms`, `6 toaster waffles`, `6 boiler onions`, `6 pinch-pleated dumplings`).
  **All 19 regressions in this round (8 held + 11 new) are by-design recognised-food abstentions; there are no
  other regressions.**

## 3. Every residual HIGH line (new probes, firm; all reproduce on both parses)

Equipment read as a ready food (S1 S8; family rate **16/137 = 11.7 %** of equipment probes):

| # | line | reading | cause |
|---|---|---|---|
| 1 | `1 Sunbeam mixer` | ready 1 each "Sunbeam mixer" | `mixer` is a food word; capitalised brand passes |
| 2 | `1 Kenwood Chef mixer` | ready 1 each | same |
| 3 | `1 Bosch mixer` | ready 1 each | same |
| 4 | `1 Hamilton Beach mixer` | ready 1 each | same (ad hoc: `1 KitchenAid mixer`, `1 Breville mixer`, `1 Cuisinart mixer` also ready — the author's own report still holds) |
| 5 | `1 Big Green Egg` | ready 1 each "Green Egg", note "Big" | capitalised words + food head `egg` |
| 6 | `1 Kamado Joe` | ready 1 each "Kamado Joe" | capitalised + `joe` (coffee) is a food word |
| 7 | `1 crumpet ring` | ready 1 each | PORTION head `ring` after a food |
| 8 | `1 bacon rack` | ready 1 each | PORTION head `rack` after a food |
| 9 | `1 fish slice` | ready 1 slice "fish" | count unit after the food on a count of one (arguable: also "a slice of fish") |
| 10 | `1 tea ball` | ready 1 each | PORTION head `ball` |
| 11 | `1 egg cup` | ready 1 each | PORTION head `cup` |
| 12 | `1 lobster cracker` | ready 1 each | head `cracker` is a food word |
| 13 | `2 crab crackers` | ready 2 each | same (arguable: crab-flavoured crackers exist) |
| 14 | `1 bag hickory wood chips` | ready 1 bag | `wood` is in the food lexicon, `chips` a food |
| 15 | `1 bag mesquite chips` | ready 1 bag | `chips` a food (arguable: mesquite-flavoured crisps) |
| 16 | `1 banana hanger` | ready 1 each | `hanger` (steak) is a food word |

Ad hoc, same family (not counted): `1 Glad wrap` → ready 1 each; `1 box Reynolds Wrap` → ready 1 box
(`wrap` is the only other vessel head that is a food word).

Unknown measure read into the name with a count of one/two (S4; family rate **17/69 = 24.6 %**):

| # | line | reading | cause |
|---|---|---|---|
| 17 | `1 helping mashed potatoes` | ready 1 each "helping mashed potatoes" | open `-ing` modifier rule (`/^\p{L}{3,}(ed\|ing)$/`) |
| 18 | `1 dusting cocoa powder` | ready 1 each | same |
| 19 | `1 sprinkling brown sugar` | ready 1 each | same |
| 20 | `1 smattering chopped chives` | ready 1 each | same |
| 21 | `1 scattering sesame seeds` | ready 1 each | same |
| 22 | `1 slathering softened butter` | ready 1 each | same |
| 23 | `1 drizzling warm honey` | ready 1 each | same |
| 24 | `1 dousing hot sauce` | ready 1 each | same |
| 25 | `1 square baking chocolate` | ready 1 each | `square` is a food word (arguable only because the author's data calls `2 squares unsweetened chocolate` valid — see §4) |
| 26 | `1 bouquet flat-leaf parsley` | ready 1 each | `bouquet` is a food word (for "bouquet garni") |
| 27 | `1 spritz lime juice` | ready 1 each | `spritz` is a food word |
| 28 | `2 Sips Dark Rum` | ready 2 each "Sips Dark Rum" | Title Case measure passes as a brand (lower case `2 sips dark rum` abstains) |
| 29 | `1 Gulp Lemonade` | ready 1 each | same (lower case abstains) |
| 30 | `1 pot chili` | ready 1 each "pot chili" | `pot` is a name-part word (`1 pot of chili` correctly abstains) |
| 31 | `1 casserole dish baked ziti` | ready 1 each | `casserole` food + `dish` name part |
| 32 | `1 large pot salted water` | ready 1 each "pot salted water" | `pot` name part |
| 33 | `1 kettle boiling water` | ready 1 each | `kettle` name part |

Without the four arguable lines (9, 13, 15, 25) the counts are 13/137 and 16/69 — both families stay systematic.
Related ad hoc path: `tots of rum x 2` → ready 2 each "tots of rum" (a trailing multiplier skips the measure check;
`tots` is a food word); `1 tot dark rum` correctly abstains.

## 4. Code reading: the lexicon approach

- **Size and breadth.** `foods.ts` 655 lines (6 188 words, 4 196 unique: fruits 111, vegetables 190, mushrooms 30,
  herbs 46, spices 93, condiments 201, meats 250, seafood 168, dairy 142, baked 278, dishes 328, sweets 182, drinks
  198, nuts/grains 226, pantry 143, name parts 155, more foods 1 394, modifiers 519); `foods-more.ts` 435 lines
  (4 369 words, 4 229 unique); ~6 700 distinct word forms across both. Genuinely broad: regional and international
  produce and pantry (calamansi, rambutan, chayote, huitlacoche, epazote, yuzu, gochujang, za'atar), brands (Ritz,
  Oreo, Nutella). Measured plain lines read 64/64; counted plain lines 97/105.
- **Fitted entries.** `COMPOUND_FOODS` (115 entries) contains 12 strings from my published round-2 findings: tea bag,
  bread bowl, tortilla bowl, wonton cup, phyllo cup, lettuce cup, cup noodle, pot pie, sheet cake, short plate,
  italian grinder, stick pretzel (the comment quotes "1 lb short plate", "4 Italian grinders"). They are real food
  names, but analogues do not generalise: fresh `2 beef plate ribs`, `2 pan bagnat`, `2 mug cakes`, `4 griddle
  cakes` go to review. This is safe (burden, not HIGH). I found no lexicon entries that exist only to pass held-back
  probes; the honest generalisation measure is the fresh set (HIGH 125 → 33, burden 3.7 %).
- **Nothing makes ordinary food `unsupported`.** The gate (`engine.ts` ~776) abstains to `needs_review` only;
  `equipmentPhrase` now yields to `equipmentNamesFood` (a recognised food noun). C4/C6 = 0 on all 2 068 firm probes.
  Of the 94 equipment tool heads none is a food word; of the vessel heads only `mixer` and `wrap` are.
- **Paths where an unrecognised or non-food head still gets `ready` or an amount:**
  1. mass/volume lines are not gated, by design (`1 cup zorbleberries` → ready) — acceptable per §6;
  2. any capitalised word before the head passes as a brand unless it is a unit or `UNKNOWN_MEASURES` word
     (`Sips`, `Gulp`, `Pot`, `Sunbeam`, `Kamado`, ad hoc `2 Zorble apples` → ready);
  3. any word matching `^\p{L}{3,}(ed|ing)$` passes as a modifier, including measure nouns in first position
     (`helping`, `dusting`, …; ad hoc `2 glorped apples`, `1 zorbling apple` → ready);
  4. `PORTION_HEADS` (ring, rack, ball, cup, stick, boat, peel, tip, straw …) after any food word make a recognised
     head on a count line, though several are also equipment heads;
  5. homograph food words act as heads or measures: mixer, wrap, joe, hanger, wood, egg, cracker(s), chips,
     square, bouquet, spritz; and name-part words pot, kettle, dish as first word;
  6. with alternatives, one recognised option keeps the amount (`2 zorbleberries or apples` → needs_review, q 2) —
     review, acceptable;
  7. a trailing multiplier (`tots of rum x 2`).
- **Author's data conflicts with the contract.** `tests/semantic-v2/data/plain-food-lines.txt` lists
  `2 squares unsweetened chocolate` and `4 squares semisweet chocolate` as valid foods; the engine reads them as
  2 / 4 *each* "squares … chocolate". Under CONTRACT §12.14 a token that is neither a registry unit nor part of the
  food sends the line to review. `recognised-food.test.ts` asserts only "not unsupported" plus an abstention share
  (≤ 0.005 plain, ≤ 0.03 overlap), so it cannot detect a measure word read as food or an invented count; it also
  rewards readiness over review. (Other measure-like lines there behave correctly: `1 wheel of brie`,
  `1 sleeve Ritz crackers`, `1 shot espresso`, `1 pot of chili` abstain; `1 knob ginger` reads 1 knob.)

## 5. Purity, boundedness, determinism, fuzz, compatibility

- Purity: no `node:`, `Date`, `Math.random`, `console`, `process`, `require`, dynamic import, `fetch` or
  `globalThis` in `src/ingredient/semantic-v2/*.ts`. The lexicon sets are built once at module load from constants.
- Boundedness: `foodNameReading` is linear in words (compound look-back ≤ 3); no new loops over input length.
- Fuzz 2 × 100 000 lines (seeds 20261010 and 7): threw 0, safety net used 0, invalid unchecked 0,
  nondeterministic 0; p50 0.10 ms, p99 0.55 ms, max 13.6 / 12.4 ms. Worst case: 14.35 ms (`"(" × 100`).
- Probe runs: 0 nondeterministic, 0 CE, 0 safety-net uses on 2 124 lines.
- Package: `npm run typecheck` clean; `npx vitest run --config vitest.config.ts` 76 files passed (1 skipped),
  4 903 tests passed, 11 skipped.
- Compatibility: `git diff a8b76db ea674ec` is empty for `src/ingredient/semantic` (v1), `legacy.ts`, `src/legacy`,
  `contract.ts`, `rational.ts`, `units.ts`, `validate.ts`, `src/page`, `engines.ts`, `index.ts` and `bench/`
  (scorer unchanged). `DEFAULT_ENGINE_ID = LEGACY_ENGINE_ID`. No app file (src, tests, migrations, scripts, deploy,
  package*.json) differs from `8c9fd8c`. The fix commits touch only `semantic-v2` src/tests, the regression harness
  (`regression-match.ts`: accepts a safe abstention on unsupported labels only — same definition as mine), the
  mutation spec, CONTRACT §12.A and docs.

## 6. Verdict and what must change

**Not acceptable to freeze.** Required (each verifiable on the HIGH lines above and on new held-back probes):

1. **Measure position.** The word directly after a count (no unit), when further name words follow, must not be
   accepted through the open `-ed/-ing` rule, a capitalised-brand reading on a Title Case line, a name-part
   vessel word (pot, kettle, dish, casserole dish) or a homograph food noun that is also a measure (square,
   bouquet, spritz) — unless a known compound food follows (`pot roast`, `pot stickers`, `bouquet garni`). Such
   lines abstain like their lower-case forms. Clears lines 17–33 (17/69).
2. **Equipment homographs.** `mixer` is food only with a drink word before it or a food container unit (the
   `containerOfFood` rule already exists); `wrap` after a capitalised brand goes to review; `egg`/`joe`/`hanger`/
   `cracker(s)`/`chips`/`wood` must not make a ready head for a count of one when the other words are only
   capitals or a tool-purpose word (Big Green Egg, Kamado Joe, banana hanger, lobster/crab cracker, wood chips).
   Remove `wood` as a free-standing food word (keep the compound "wood ear").
3. **Portion heads that are also equipment heads** (ring, rack, ball, cup, stick, boat, peel, tip, straw) count as
   recognised only through a compound food entry; otherwise the count line goes to review. A singular count unit
   written after the food on a count of one (`1 fish slice`) goes to review. Clears lines 7–13.
4. **Trailing multiplier** applies the same measure check (`tots of rum x 2`).
5. **Author's data**: settle `2 squares unsweetened chocolate` against §12.14 and give the plain/overlap data expected
   fields (or a separate assertion that a measure word is never read into the name with a count).

Recommended, not blocking (burden and MEDIUM): accept a closed class of intensifiers before a recognised modifier
(very, really, slightly, super, nice, good-quality); possessive animal names (`pig's`, `cow's`); `N-minute`
products; invariant plurals with a count (`3 passion fruit`); shared-head choices (`Thai or Genovese basil`);
`4 pint jars` as a safe abstention.

Once items 1–4 hold on a fresh probe set with zero firm HIGH and only by-design abstention regressions, I would
expect to recommend "acceptable to freeze".
