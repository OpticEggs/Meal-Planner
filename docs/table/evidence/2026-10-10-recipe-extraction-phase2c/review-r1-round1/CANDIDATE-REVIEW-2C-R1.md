# R1 — Phase 2C targeted review, round 1: `semantic-v3` at `b0dea38`

Read-only development review, not an acceptance sample. Fresh clone `/home/user/rx2b-r1/review6/repo` at `b0dea38`
(node_modules symlinked). Nothing in the repository edited, committed or pushed; no network beyond the local clone.
Classifier: my own (plan v2/v3 classes, S codes; HIGH = C2 high or any S1/S3/S4/S5/S6); nothing from `bench/`.
Labels written from CONTRACT §7/§12/§12.A/§13 **before any engine run** on the lines; three labels were corrected
afterwards as my errors (listed in §6), never to match an engine.

## Files

| file | what |
|---|---|
| `probes-r6-new.tsv` | 596 probes (581 firm, 15 debatable), same columns as `probes-r4-new.tsv` |
| `probes-r6-excluded.txt` | 163 exact-exposed + 231 near-duplicates removed |
| `RESULTS-new.md`, `out-new/probe-results.json` | per-group tables and every line; `semantic-v3` and `semantic-v2` readings |
| `fuzz-100k*.txt`, `worst-case.txt`, `package-tests.txt` | robustness |
| `scripts/` | `fresh6_def.py` (labels), `exposed6.py` (dedupe), `foodwords.ts`, `run6.ts`, `part6.js`, `subfam.ts`, `adhoc.ts`, `fuzz.ts`, `worst.ts` |

**Dedupe.** Exact NFKC/lower-case match against every package `*.jsonl` (fixtures incl. holdout-v3, both regression
corpora, `tests/semantic-v3/data`), test text data, every evidence TSV/TXT/JSON input, every quoted string in package
src/tests/tools and all docs/evidence markdown and scripts, and all my earlier probe and exclusion files. Near-duplicates
removed too: same tokens with numbers ignored, or exactly one differing token where both the probe's and the exposed
token are food words (food-word oracle = the frozen `semantic-v2` lexicon, not the candidate).

## 1. Results by family (firm labels)

| family | n | C1/R | C5 ok/A | C7/U | **safe abst./U** | HIGH | burden (f / m / other) | notes |
|---|---|---|---|---|---|---|---|---|
| A remarks with another measured food | 25 | – | 25/25 | – | – | **0** [0–13.3] | – | all `needs_review`, first amount kept |
| A controls (same food, plus, package, dimension, time, temperature, no-amount remark) | 16 | 16/16 | – | – | – | 0 | 0 | |
| B `and`/`&` lists | 23 | – | 21/23 | – | – | **2** = 8.7 % [2.4–26.8] | – | |
| B fixed compounds / shared modifiers | 10 | 10/10 | – | – | – | 0 | 0 | |
| B choices (shared head before/after comma) | 14 | – | 14/14 | – | – | 0 [0–21.5] | – | +1 debatable HIGH |
| C measure slot, new nouns (incl. Title Case) | 54 | – | 15/54 (+34 C5b, see below) | – | – | **5** = 9.3 % [4.0–19.9] | – | |
| C equipment / household (brands, materials, animals) | 49 | – | – | 17/49 | **32/49** | 0 [0–7.3] | – | |
| C purpose words that are food | 11 | 11/11 | – | – | – | 0 | 0 | no C4 |
| C dish names with a vessel/unit head | 10 | 7/10 | – | – | – | 0 | 3 / 0 / 0 | |
| C sloppy singulars, borrowed plurals, non-food singulars | 13 | 2/2 | – | 8/11 | **3/11** | 0 | 0 | no non-food ready |
| D undeclared containers (sizes, new nouns) | 9 | – | 8/9 | – | – | **1** | – | |
| D declared spellings | 18 | 18/18 | – | – | – | 0 | 0 | |
| D known non-aliases (tub, bar, rasher…) | 1 | – | 1/1 | – | – | 0 | – | reported apart (listed words) |
| **K everyday controls** | **205** | 203/205 | – | – | – | **0** [0–1.8] | 0 / 0 / 2 | |
| **K less-common valid foods** | **123** | 123/123 | – | – | – | **0** [0–3.0] | 0 / 0 / 0 | |
| **all** | **581** | 391/396 | 83/125 | 25/60 | **35/60** | **8** = 1.4 % [0.7–2.7] | 3 / 0 / 2 | C4/C6 0, CE 0 |

Burden = a valid (ready-labelled) line sent to review: (f) unrecognised food or modifier, (m) unknown measure,
(other) any other reason. Clean controls include measured (cup/gram/ounce) lines throughout; all measured clean lines
are C1. Regressions against `semantic-v2` on the same probes: 1 (`1 lb cod fillets, cut into 4 portions`, burden).
Safe abstentions (C8 with no amount) are never counted as correct rejections.

**C5b on measure lines (34, not HIGH).** For new measure nouns outside the measure-slot classes the line is caught by
the general recognised-food gate, not by `measure-slot.ts`: `needs_review`, no amount, but the measure noun stays in the
name (`name="tureen chicken soup"`, note null). §13.2's label is name = the food with the number and noun in note; the
pre-fill therefore differs from the label (C5b). Safe, but the §13.2 reading is reached only for listed words.

## 2. Every firm HIGH line (8)

| # | line | label | `semantic-v3` | family |
|---|---|---|---|---|
| 1 | `1 knot fresh ginger` | needs_review, name fresh ginger, no amount (§13.2) | ready 1 each "knot fresh ginger" [S1 S4] | measure noun that is a food/modifier word |
| 2 | `1 fan sliced avocado` | idem, sliced avocado | ready 1 each "fan sliced avocado" [S1 S4] | idem |
| 3 | `1 wafer white chocolate` | idem, white chocolate | ready 1 each "wafer white chocolate" [S1 S4] | idem |
| 4 | `1 kiss whipped cream` | idem, whipped cream | ready 1 each "kiss whipped cream" [S1 S4] | idem |
| 5 | `1 bite cheesecake` | idem, cheesecake | ready 1 each "bite cheesecake" [S1 S4] | idem |
| 6 | `2 tbsp lime juice and fish sauce` | needs_review list, 2 tbsp, name null (§13.4) | ready 2 tbsp "lime juice and fish sauce" [S4] | `and` list read as shared-modifier compound |
| 7 | `1/3 cup maple syrup and Dijon mustard` | idem, 1/3 cup | ready 1/3 cup "maple syrup and Dijon mustard" [S4] | idem |
| 8 | `750 ml carafe white wine` | needs_review, white wine, no amount (§13.2 precedence) | ready 750 ml "carafe white wine" [S1 S4] | undeclared container after a mass/volume size |

Debatable (not counted): `1 can tomatoes, crushed or diced` (ready "tomatoes", note "crushed or diced": §12.7(f) vs the
form-words-stay-a-note sentence), `1 cup-and-a-bit flour` (ready 1 each), `1 bag dog treats` (ready 1 bag).

**Sub-family split of the measure slot:** a new measure noun that is a food or modifier word, after a count of one:
**5/6 HIGH = 83.3 % [43.6–97.0]**; every other new measure noun (any count): **0/48** [0–7.4]. Count above one with a
plural measure noun is always safe (number-agreement rule).

## 3. Gate classification (PHASE-2C-PLAN §4.6), this round

- **Firm HIGH among the clean-food controls: 0** (0/205 everyday, 0/123 less common; 0/328 = 0.0 % [0–1.2]).
- **Structural families with ≥ 2 firm HIGH lines: 2**
  1. *Measure noun that is itself a food or modifier word, count of one* (5 lines: knot, fan, wafer, kiss, bite) —
     the measure-slot rules account only for listed classes (`PART_NOUNS`, `SHAPE_FOOD_NOUNS`, vessels, bottle sizes);
     any other food/modifier noun is accepted as a modifier and the count is invented. This is the worker's own
     disclosed open path ("food nouns as measures outside the part/shape classes"), and it is systematic.
  2. *`and` list whose second food is a multi-word name ending in a generic head* (2 lines: "lime juice and fish
     sauce", "maple syrup and Dijon mustard"): read as "A and B" modifiers before one head (the A4 shared-modifier
     exception). All 21 other lists, including singular first foods, mass nouns (`tamari and mirin`) and `&`, are correct.
- Single-line family: undeclared container after a mass/volume size (`750 ml carafe white wine`), from the known
  "mass/volume lines are not gated" path; the listed container words (tray, pouch, sack, jug, clamshell, pot) are right.

**If this were round 2, gate (c) would not hold** (two structural families with ≥ 2 firm HIGH).

## 4. Code reading

- **Structural vs enumerated.** `measure-slot.ts` rule 2 (number agreement: count > 1, plural noun, singular food head)
  is genuinely structural and holds on every fresh plural probe. Rules 1, 3, 4, 5 are lists: `NOT_ALIASES`, `PART_NOUNS`
  (contains all my round-4 words — stem, frond, cob, cone, disc, thread, strand, spray, heel, blade, split — plus their
  siblings and my round-4 `pump`, `dropper`, `lobe`, `nest`), `BOTTLE_SIZE_WORDS` (my `split`, `magnum`, `jeroboam`,
  `tallboy`, `crowler`), utensil lists. With a count of one, a measure noun outside these lists is safe only if the general
  gate does not recognise it; if it is a food or modifier word the line is ready with an invented count (§2).
- **Open paths to a wrong `ready` (all confirmed ad hoc):**
  1. capitalised unknown word after a declared unit is a brand: `1 bag Zorble apples`, `1 box Glorp crackers` → ready
     (without a unit, `2 Zorble apples` now abstains — that path is closed);
  2. mass/volume lines are not gated: `1 cup zorbleberries` ready; `750 ml carafe white wine` (HIGH above);
  3. food/modifier nouns as measures outside the classes (§2, 5 HIGH); `1 cake yeast` ready (also a product name);
  4. `1 olive oil` → ready 1 each;
  5. `2 tomato` ready by design — on my probes it opened no non-food path: `2 whisk`, `3 ramekin`, `2 spatula`,
     `4 napkin`, `3 sieve`, `2 ladle`, `4 skewer`, `2 tea towel` … all C7 or safe;
  6. `1 goose quill` → ready (animal + tool word).
- **Closed (checked):** `-ed` words of unknown verbs (`2 glorped apples` abstains); tool words in the measure slot
  (`1 saucepan water`, `1 stockpot water` → review, note kept); purpose words making food unsupported (no C4 on 11 fresh
  lines; `300 g fish slices` ready); brand + homograph heads (`1 Le Creuset tagine`, `1 bag Tide pods`, `1 salt pig` safe).
- **Vocabulary growth vs burden.** Less-common valid foods 123/123 C1 and everyday 203/205: the FL-C8 vocabulary work
  removed almost all valid-food burden on fresh lines, and no fresh non-food line became ready through it (equipment
  0/49 HIGH, non-food singulars 0/11).

## 5. Robustness and compatibility

- Purity: no `node:`, `Date`, `Math.random`, `console`, `process`, `require`, dynamic import, `fetch`, `globalThis` in
  `src/ingredient/semantic-v3/*.ts` or `src/unit-aliases.ts`.
- Fuzz 2 × 100 000 (seeds 20261010, 7): threw 0, safety net 0, invalid 0, nondeterministic 0; p99 0.63 / 0.59 ms, max
  15.3 / 15.6 ms; worst case 13.0 ms (`"(or " × 500`). Probe runs: 0 CE, 0 net, 0 nondeterminism.
- Package: typecheck clean; `npx vitest run --config vitest.config.ts` 101 files passed (1 skipped), 11 542 tests passed,
  11 skipped (the `holdout3.test.ts` failures I reported at `fdbcfd1` are gone).
- Compatibility: no diff `1d312a8..b0dea38` for `src/ingredient/semantic` (v1), `semantic-v2`, legacy, `bench/`,
  `fixtures/`, `contract.ts`, `rational.ts`, `units.ts`, `validate.ts`; `DEFAULT_ENGINE_ID = LEGACY_ENGINE_ID`; no app
  file changed. Changed: `semantic-v3/**`, `unit-aliases.ts`, `engines.ts`/`index.ts` (registration), CONTRACT §13,
  tests, the 2C corpus and `regression-match.ts` (coordinator-owned harness).

## 6. My label corrections (before reporting; my errors, contract-grounded)

- `1 cup raw cashews, soaked overnight`: `raw` goes to `form` (§7.6) → name `cashews` (was `raw cashews`).
- `8 oz block sharp white cheddar, grated`: §12.3 lists `block` as a sold-by-weight container → 1 `block`, packageSize
  8 oz (I had 8 oz).
- `1 can tomatoes, crushed or diced`: marked debatable (§12.7(f) choice vs the form-word note sentence).
