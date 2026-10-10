# Candidate review R1, round 4: `semantic-v2` at `fc37ce7` (final pre-freeze review)

Reviewer R1, read-only. Fresh clone `/home/user/rx2b-r1/review5/repo` at `fc37ce7` (node_modules symlinked).
Nothing in the project was edited, committed or pushed; no network, no database; only package-level commands.
Classifier: my own (plan v2 classes C1–C8/CE, S1–S8; HIGH = C2 high or any S1/S3/S4/S5/S6); nothing from `bench/`.
Every probe was parsed twice (determinism) and through `guardedParse`; each reading is compared with `ea674ec`.

**No freeze verdict** (the freeze is decided, PHASE-2B-PLAN §6.4). This report records residual risk.

Safe abstentions (C8: `needs_review` with no amount, unit, package or options on an `unsupported` label) are always
reported separately from correct rejections (C7) and correct readings (C1/C5), and are never counted as exact.

## Files alongside

| File | What |
|---|---|
| `probes-r4-new.tsv` | 587 brand-new probes (576 firm, 11 debatable), written before any engine run on them |
| `probes-r4-excluded-exposed.txt` | 98 candidates dropped as exposed (repo data, tests, corpora, evidence, my earlier probes) |
| `probes-r4-near-duplicates.txt` | 21 more dropped: same words as one of my earlier probes, only the number differs |
| `probes-prior-round4.tsv` | all 2 124 earlier probes (rounds 1, 1-supplement, 2, 3) with set and seen/held flag |
| `RESULTS-new.md`, `RESULTS-prior.md` | partitions, per-group tables, every HIGH, regression, fix, burden, C3, C5b, C8 and safe-abstention line |
| `family-table-new.md`, `prior-by-set.md` | the tables below |
| `out-new/`, `out-prior/` | raw readings (`probe-results.json`) for `fc37ce7` and `ea674ec` |
| `fuzz-100k.txt`, `fuzz-100k-seed7.txt`, `worst-case.txt` | robustness |
| `scripts/` | `fresh4_def.py`, `exposed4.py`, `prior4.py`, `run4.ts`, `part4.js`, `fuzz.ts`, `worst.ts`, `adhoc.ts`, `adhoc2.ts`, `lexcheck.ts`, `units.ts` |

Exposure dedupe (exact normalised string): every `*.jsonl` in the package (fixtures, regression corpus,
`tests/semantic-v2/data/*.jsonl`), test `.txt` data, every evidence TSV/TXT and evidence JSON `input`, every quoted
string in package src/tests/tools, contract and plan docs and all evidence `.md`/`.py` (including my round-3 report
and results), and all my earlier probes. "Seen" for earlier probes = seen in an earlier round, or the exact string is
anywhere in the repository at `fc37ce7`.

## 1. Earlier probes, all rounds (firm labels; 56 debatable excluded)

| partition | n | exact | C1/R | C5 ok/A | C7/U | **safe abstention/U** | other C8 | HIGH | regressions vs ea674ec |
|---|---|---|---|---|---|---|---|---|---|
| **(a) seen** | 443 | 338 | 110/110 | 119/119 | 109/214 | **104/214** | 0 | **1** | 0 |
| **(b) held back** | 1 625 | 1 623 | 973/974 | 315/316 | 335/335 | **0/335** | 0 | **1** | **2** |

By set (seen / held): r1-main 118 / 761, r1-supp 89 / 24, r2-fresh 126 / 417, r3-fresh 110 / 423 — every held-back
set is exact except r3-fresh held (421/423); details in `prior-by-set.md`. No C4/C6, no C5b, no CE, no safety-net use.

- HIGH at `ea674ec` on these probes: 33 → now 2. Fixed vs `ea674ec`: 58 (all round-3 HIGH lines I reported, the
  by-design abstentions on `5-minute rice`, `funnel cakes`, `hand pies`, `crusty rolls`, `pig's trotters`,
  `prosciutto di Parma`, `very ripe plantains`, `passion fruit` etc.).
- **(a) seen, 1 HIGH, a deterioration:** `1 salt pig` — safe abstention at `ea674ec`, now ready 1 each "salt pig"
  (S1 S8). Cause: `pig`/`pigs` added as foods in round 3 (for `pig's trotters`).
- **(b) held back, 2 regressions:**
  - `1 saucepan water` — C5 (review) at `ea674ec`, now **ready 1 each "saucepan water" (S4, HIGH)**. Cause: the new
    `toolModifier` accepts any tool head before a food head, including in the measure slot after a count.
  - `4 chocolate cups` — C1 at `ea674ec`, now a recognised-food abstention (`cup` left the portion heads). Safe.

## 2. New probes (587; 576 firm)

| requested | firm | groups |
|---|---|---|
| ≥ 200 valid everyday and less common foods | 240 | P-counted4 182 (bare count, count units, containers), P-measured4 58 |
| ≥ 80 overlap foods | 82 | O-overlap4 |
| ≥ 80 equipment, new vocabulary and brands | 119 | E-brand4 41, E-foodword4 54, E-household4 19, E-titlecase4 5 |
| ≥ 60 unknown measures | 75 | U-unknown4 |
| other families | 60 | A-mult4 10, A5 2, A6 10, A-remark4 7, B-choice4 11, B-and4 10, D-misc4 10 |

The valid-food set leans deliberately to less common foods (regional produce, game, international breads and
dumplings, brands) and unusual modifiers; it is harder than a mainstream recipe mix.

Per family (firm). Burden = a valid (ready-labelled) line sent to review only because (f) a food or modifier is
unrecognised (abstention, `unclassified` + `quantity_missing`) or (m) a word was taken as an unknown measure
(`unit_unknown`). "Other review" = C3 for another reason.

| family | n | C1 on ready | C5 ok / A | C7 / U | **safe abst. / U** | HIGH (S codes) | burden (f) | burden (m) | other review | C4 |
|---|---|---|---|---|---|---|---|---|---|---|
| P-counted4 | 182 | 147/182 | – | – | – | 0 | 20 | 1 | 14 | 0 |
| P-measured4 | 58 | 58/58 | – | – | – | 0 | 0 | 0 | 0 | 0 |
| O-overlap4 | 82 | 58/82 | – | – | – | 1 (S7, unit) | 21 | 2 | 0 | 0 |
| E-brand4 | 41 | – | – | 24/41 | **13/41** | 4 (S1 S8) | – | – | – | – |
| E-foodword4 | 54 | – | – | 22/54 | **29/54** | 3 (S1 S8) | – | – | – | – |
| E-household4 | 19 | – | – | 9/19 | **8/19** | 2 (S1 S8) | – | – | – | – |
| E-titlecase4 | 5 | – | – | 2/5 | **3/5** | 0 | – | – | – | – |
| U-unknown4 | 75 | – | 53/75 | – | – | 22 (S4) | – | – | – | – |
| A-mult4 | 10 | 10/10 | – | – | – | 0 | 0 | 0 | 0 | 0 |
| A5 / A6 | 2 / 10 | 2/2, 10/10 | – | – | – | 0 | 0 | 0 | 0 | 0 |
| A-remark4 | 7 | 3/3 | 4/4 | – | – | 0 | 0 | 0 | 0 | 0 |
| B-choice4 | 11 | – | 10/11 (1 C5b) | – | – | 0 | – | – | – | – |
| B-and4 | 10 | 5/5 | 5/5 | – | – | 0 | 0 | 0 | 0 | 0 |
| D-misc4 | 10 | – | – | 8/10 | **2/10** | 0 | – | – | – | – |
| **all** | **576** | **293/352** | **72/95** | **65/129** | **55/129** | **32** | **41** | **3** | **14** | **0** |

- HIGH at `ea674ec` on the same probes: 41 → 32 now; 23 lines fixed, 2 regressed (both by-design abstentions:
  `1 hot pot soup base`, `1 packet hot pot seasoning` — `pot` left the name-part words), 1 deteriorated from a safe
  abstention to HIGH (`1 cow creamer`: `cow` added as a food in round 3).
- Burden detail:
  - (f) unrecognised **food**: `1 red kuri squash`, `6 sunburst squash`, `2 bitter melons`, `1 winter melon`,
    `6 eddoes`, `2 boniatos`, `6 caperberries`, `4 sand dabs`, `6 fatayer`, `6 siopao`, `6 spanakopita triangles`,
    `4 eggs en cocotte`, `1 brisket point`, `4 vol-au-vent cases`, `12 tartlet cases`;
  - (f) unrecognised **modifier**: `6 farm-fresh eggs`, `2 supermarket rotisserie chickens`, `3 locally grown
    peaches`, `2 extremely ripe avocados`, `1 bottle barrel-aged stout`, `1 bottle cask-strength bourbon`,
    `6 oven-roasted chicken thighs`, `4 griddle-baked flatbreads`, `6 pan-seared scallops`, `6 muffin-tin quiches`,
    `1 sheet brick pastry`, `4 cowboy steaks`, `6 sous-vide egg bites`, `1 jar fridge pickles`, `1 jar refrigerator
    pickles`, `12 icebox cookies`, `1 icebox cake`, `1 jar pot-set yogurt`, `1 hot pot soup base`, `1 packet hot
    pot seasoning`, `2 platter-size pizzas`, `6 tin-roof brownies`, `1 jar barrel pickles`, `6 cloverleaf rolls`,
    `6 accordion potatoes`, `4 foil-packet dinners` (hyphenated tool words are not covered by `toolModifier`);
  - (m) unknown measure: `1 suckling pig` (`suckling` read as a measure gerund), `6 pan de bono`, `4 shot-glass desserts`.
- Other review (amount kept, `unclassified`): a count above one before a foreign food with an invariant plural —
  `4 sudachi`, `6 pączki`, `2 khachapuri`, `6 simit`, `2 lahmacun`, `4 manakish`, `8 kibbeh`, `8 gulab jamun`,
  `4 dorayaki`, `2 taiyaki`, `4 onigiri`, `12 lumpia`, `20 pelmeni`, `12 vareniki` (14/182).
- C5b: `1 lb cremini or shiitake mushrooms` → options `["cremini", "shiitake mushrooms"]` (shared head not distributed).

## 3. Residual risk per family (fresh probes; Wilson 95 %)

| family | HIGH rate | review burden on valid foods |
|---|---|---|
| unknown measures (U-unknown4) | **22/75 = 29.3 % [20.2–40.4]** | – |
| equipment, all | **9/119 = 7.6 % [4.0–13.8]** | – |
| — brand + food-word head | 4/41 = 9.8 % [3.9–22.5] | – |
| — food-word heads | 3/54 = 5.6 % [1.9–15.1] | – |
| — household non-food | 2/19 = 10.5 % [2.9–31.4] | – |
| overlap foods | 1/82 = 1.2 % [0.2–6.6] | 23/82 = 28.0 % [19.5–38.6] (f 21, m 2) |
| valid foods, counted | 0/182 | 35/182 = 19.2 % [14.2–25.6] (f 20 = 11.0 %, m 1 = 0.5 %, invariant plural 14 = 7.7 %) |
| valid foods, measured | 0/58 | 0/58 |
| other families (A, B, D) | 0/60 [0–6.0] | 0/30 |
| all valid ready lines | 1/352 = 0.3 % [0.1–1.6] (`4 pots de crème`) | 58/352 = 16.5 % [13.0–20.7] (f 11.6 %, m 0.9 %, other 4.0 %) |
| earlier held-back probes | 1/1 625 = 0.1 % | 1/974 = 0.1 % |

## 4. Every residual HIGH line

New probes, firm (32; each reproduces on both parses):

| # | line | reading at fc37ce7 | family |
|---|---|---|---|
| 1–3 | `1 cone piloncillo`, `2 cones piloncillo`, `1 cone jaggery` | ready 1/2 each "cone(s) …" | unknown measure that is a food word (`cone`) |
| 4–5 | `2 discs Mexican chocolate`, `1 disk Ibarra chocolate` | ready 2/1 each | `disc`/`disk` |
| 6–7 | `3 stems lemongrass`, `4 stems mint` | ready 3/4 each | `stem` |
| 8–9 | `2 fronds dill`, `1 frond fennel` | ready 2/1 each | `frond` |
| 10 | `1 cob corn` | ready 1 each "cob corn" | `cob` |
| 11–12 | `20 threads saffron`, `2 strands saffron` | ready 20/2 each | `thread`, `strand` |
| 13–14 | `1 split prosecco`, `2 splits cava` | ready 1/2 each | `split` (a modifier) |
| 15 | `1 heel sourdough` | ready 1 each | `heel` |
| 16–17 | `1 spray avocado oil`, `2 sprays cooking oil` | ready 1/2 each | `spray` |
| 18–19 | `1 blade mace`, `2 blades mace` | ready 1/2 each | `blade` (a cut word) |
| 20–22 | `2 Blades Mace`, `1 Cone Piloncillo`, `1 Split Prosecco` | ready | the same words on Title Case lines |
| 23–24 | `1 Le Creuset tagine`, `1 Emile Henry tagine` | ready 1 each | brand + food-word head (`tagine`) |
| 25 | `1 Pyrex casserole` | ready 1 each | brand + `casserole` |
| 26 | `1 Le Creuset pâté terrine` | ready 1 each | brand + `terrine` |
| 27 | `1 cow creamer` | ready 1 each | `cow` (new food word) + `creamer`; safe abstention at ea674ec |
| 28–29 | `1 bag cherry wood chunks`, `1 bag apple wood chunks` | ready 1 bag | `wood` (new modifier) + `chunks`; round-3 fix covered only `chips` |
| 30–31 | `1 box Cascade pods`, `1 bag Tide pods` | ready 1 box / 1 bag | brand + `pods` (a food word) — detergent |
| 32 | `4 pots de crème` | ready 4 **container** "de crème" | `pots` read as a container unit (S7 + wrong unit) |

Earlier probes (2): `1 salt pig` (seen; `pig` now a food word) and `1 saucepan water` (held; tool word in the
measure slot). Debatable, not counted: `6 flakes Maldon salt`, `2 nests fresh tagliatelle`, `2 tbsp oil and vinegar`,
and the 15 long-standing debatable lines from rounds 1–2 (`2 pound cakes`, `1 sheet cake`, `6 sugar cubes`, …).

Ad hoc confirmations (not in the rates): tool words in the measure slot — `1 stockpot water`, `1 saucepan milk`,
`1 wok oil`, `1 colander pasta`, `1 sieve flour` all ready 1 each at fc37ce7 and all abstained at ea674ec.

## 5. Code reading

- **What round 3 changed:** structural rules — `measureGerund` (any "-ing" noun outside the lexicons is a measure
  after a count), `titleCaseLine`, a capitalised plural opening the name is not a brand, `oneBeforePluralFood`
  ("1 braid onions"), the multiplier measure check, origin joiners ("di Parma"), number-hyphen modifiers
  ("5-minute"), `toolModifier`, and the `equipmentNamesFood` purpose rule. These generalise: every fresh
  gerund (`scraping`, `grating`, `spattering`) and Title Case line with a listed measure (`1 Pump Vanilla Syrup`)
  is now right. The rest is enumeration.
- **Fitted entries.** Of 486 net-added single words in foods.ts / foods-more.ts / lexicon.ts, about 45 are words of
  my published round-3 lines (e.g. barista, boiler, bouquet, casserole, crumpet, crusty, dousing, dusting, ferns,
  funnel, glad, griddle, gulp, hand, helping, hickory, isolate, kamado, kettle, mesquite, mug, nice, parma, pig,
  really, reynolds, sips, slathering, slightly, smattering, sprinkling, square, super, toaster, very); 14 of 207 new
  multiword entries are my strings (mug cake, pan bagnat, hand pie, jell-o shot, plate rib, funnel cake, wood ear,
  bouquet garni, griddle cakes, toaster waffles, …); the vessel purpose lists gained exactly my tools (crumpet ring,
  bacon/rib rack, tea ball, fish slice, lobster/crab cracker, hickory/mesquite chip); `HOMOGRAPH_HEADS` is my
  round-3 head list. Fresh analogues outside these lists keep failing (cone, disc, stem, frond, blade; tagine,
  terrine, casserole; wood chunks; pods).
- **Fixes that create new errors** (a closed-list fix shifts the error to a neighbour):
  - `pig`, `cow` added as foods → `1 salt pig`, `1 cow creamer` now ready (were safe);
  - `toolModifier` → a tool word directly after a count is accepted (`1 saucepan water`, ad hoc `1 wok oil`);
  - purpose words that are also foods (`fish` for slice, `rib` for rack, `nut`/`walnut`/`pecan` for cracker,
    `mesquite` for chip) make **food unsupported** (C4), ad hoc: `300 g fish slices`, `1 lb fish slices`,
    `6 fish slices, patted dry`, `2 lb pork rib racks`, `1 lamb rib rack`, `1 bag walnut crackers` — all ready at
    ea674ec, all `unsupported` now, measured lines included. No firm C4 on my counted probes (the one C4,
    `6 beef kebab skewers`, is debatable), so this is a code-reading finding, not a rate.
- **Paths from an unrecognised head or word to `ready` or an amount (fc37ce7):** (1) mass/volume lines are not gated,
  by design (`1 cup zorbleberries`); (2) any capitalised word before a food head is a brand, except on Title Case
  lines, a capitalised plural first word, or a closed homograph head with a count of one (`2 Zorble apples` ready);
  (3) any `\p{L}{3,}ed` word is a modifier (`2 glorped apples` ready); (4) `toolModifier` (any tool head or "-er"
  agent noun of a kitchen verb before a food head; also in the measure slot); (5) any food or modifier word in the
  measure slot is accepted unless listed in `UNKNOWN_MEASURES` (the 22 U HIGH lines); (6) with alternatives one
  recognised option keeps the amount (needs_review — acceptable); (7) the abstention itself never keeps an amount.
- **Nothing makes ordinary food `unsupported` through the recognised-food gate**; the new C4 path is the
  equipment purpose rule above.
- **Author's data:** `plain-food-lines.jsonl` / `overlap-food-lines.jsonl` now carry full expectations, and
  `2 squares unsweetened chocolate` is §12.14 review. The corpus (1 114 firm, 0 failures) cannot see the new errors:
  none of `1 salt pig`, `1 saucepan water`, `1 cow creamer`, the fish-slice/rib-rack lines is in it.

## 6. Purity, determinism, fuzz, compatibility

- Purity: no `node:`, `Date`, `Math.random`, `console`, `process`, `require`, dynamic import, `fetch`, `globalThis`
  in `src/ingredient/semantic-v2/*.ts`.
- Fuzz 2 × 100 000 (seeds 20261010, 7): threw 0, safety net 0, invalid unchecked 0, nondeterministic 0; p50 0.10 ms,
  p99 0.52 ms, max 9.2 / 13.9 ms. Worst case 13.2 ms (`"(or " × 500`). Probe runs: 0 CE, 0 net, 0 nondeterminism on
  2 711 lines.
- Package: typecheck clean; `npx vitest run --config vitest.config.ts` 77 files passed (1 skipped), 5 099 tests
  passed, 11 skipped.
- Compatibility: `ea674ec..fc37ce7` touches only `semantic-v2` src, its tests and data, the regression corpus, the
  mutation spec and docs. No diff for v1 (`src/ingredient/semantic`), legacy, `contract.ts`, `rational.ts`,
  `units.ts`, `validate.ts`, `src/page`, `engines.ts`, `index.ts` or `bench/` (scorer unchanged since before the
  candidate rounds). `DEFAULT_ENGINE_ID = LEGACY_ENGINE_ID`. No app file differs from `8c9fd8c`.

## 7. Estimate for a realistic holdout-v3 (~360 lines, ≥ 200 R, ≥ 40 A, ≥ 15 U)

- **A3 / A4 (one line is enough to fail):**
  1. **Unknown measures (§12.14, S4)** — the most likely cause. 29 % of my fresh measure lines are HIGH; my sample
     over-weights food-word measures, so for a neutral §12.14 line I estimate 10–20 %. With 4–8 such lines,
     P(at least one S4) ≈ 35–80 %. Words to expect in real recipes: stems/fronds of herbs, cobs, blades of mace,
     threads of saffron, cones of piloncillo, discs of Mexican chocolate, a spray of oil.
  2. **Equipment read as food (S1 + S8)** — 7.6 % of my homograph-heavy equipment lines; ordinary tool-head
     equipment is rejected, so about 2–5 % per realistic equipment line; with 5–10 such lines, P ≈ 10–40 %.
     Brand cookware with a dish-name head (tagine, casserole, terrine) and animal-named tools are the exposure.
  3. Smaller: a tool word in the measure slot (`1 saucepan water`), a dish name read with a container unit
     (`4 pots de crème`, S7 + unit, counts for A3). Ordinary valid foods: 0 HIGH in 240 fresh and 1 in 1 625 held.
- **A1 (C1 on R ≥ 98 %, about 4–5 misses allowed in ~220 R lines):**
  1. counted lines whose food or modifier is not in the lexicon (11 % of my uncommon counted lines, 0.1 % of my
     mainstream held-back lines; I expect 1–4 % of R on a realistic mix);
  2. a count above one before an invariant foreign plural (`4 onigiri`, `20 pelmeni`, `8 gulab jamun`): every such
     line costs one C1;
  3. overlap-family foods with hyphenated tool modifiers or appliance words (`oven-roasted`, `pan-seared`,
     `icebox`, `fridge pickles`, `vol-au-vent cases`): 28 % review on my overlap set — the holdout covers this
     repair family explicitly;
  4. the new C4 path (`300 g fish slices`, `2 lb pork rib racks`, `1 bag walnut crackers`): rare, but each line is
     a C4 (A1 and A5).
  A1 is, in my estimate, at real risk (borderline) if the holdout samples international or less common counted
  foods in realistic proportion; A5 (C3 + C4 ≤ 10 %) is likely met on a realistic mix (16.5 % on my skewed set).

## Process note

While listing unit codes I accidentally ran a command that created an empty file `/tmp/claude-0/x.ts` (a stray
redirect); it was empty, I removed it at once, and nothing else was written outside `/home/user/rx2b-r1/review5`.
