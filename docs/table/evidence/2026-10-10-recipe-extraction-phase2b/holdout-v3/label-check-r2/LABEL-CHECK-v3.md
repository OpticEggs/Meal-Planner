# Holdout-v3 label check: label checker R2

Date: 2026-10-10.

**Basis:** `CONTRACT-v1.frozen.md` (SHA-256 `d2fe6294…`, §7, §12 including 12.A A1–A6), `fixtures/README.md`, and the
frozen dev/holdout/holdout-v2 labels for conventions.

**Sources read:** only files in `/home/user/rx-labelcheck/`. No engine code, test, benchmark report or engine output was
read. My blind sample `v3/blind-sample-labels.jsonl` (SHA-256 `722fc1a4…`) was written before I saw any evaluator
label, and it has not been edited since.

---

## 1. Blind agreement (46 sample cases)

I compared each field using the CONTRACT §9 normalization:
- name: NFKC, lower case, whitespace collapsed, punctuation trimmed;
- note: the same normalization, compared as a token bag ignoring `() , ; :`;
- quantities: exact rationals;
- packageSize: unit plus exact quantity;
- alternatives: as a set.

Accepted values count in either direction.

| Field | Strict | Including accepted |
|---|---|---|
| status | 45/46 | 45/46 |
| name | 46/46 | 46/46 |
| quantity | 46/46 | 46/46 |
| unit | 45/46 | 45/46 |
| packageSize | 46/46 | 46/46 |
| equivalents | 46/46 | 46/46 |
| form | 46/46 | 46/46 |
| note | 46/46 | 46/46 |
| alternatives | 46/46 | 46/46 |
| optional / approximate / amountUnstated | 46/46 each | 46/46 each |
| **Core pass** (status+name+quantity+unit+packageSize) | **45/46 = 97.8 %** (Wilson 95 % CI 88.7–99.6 %) | 45/46 |
| **Full pass** (every field) | 45/46 | 45/46 |
| `debatable` flag | 46/46 (both: none) | |

**The only disagreement is ing-h3-0180** `1 inch fresh turmeric root, grated`:

| Field | Evaluator | Mine |
|---|---|---|
| status | `ready` | `needs_review` |
| unit | `inch` | null |

All other fields agree. The evaluator's rationale is "'inch' is a registry imprecise unit". I could not derive that from
the contract: §7.3 lists the imprecise units as pinch, dash, splash, handful and drop; §7.13 treats inch sizes as notes
(`9-inch` → note); and §12.14 sends a token that is not a registry unit to `needs_review`. See §2.2 D1.

**Other differences, not disagreements.**
- The only strict-string difference is the note on ing-h3-0052: `stems removed; caps thinly sliced` vs mine
  `stems removed, caps thinly sliced`. The two are equal under §9.
- I added accepted values in four cases where the evaluator has none:
  - ing-h3-0004 and ing-h3-0300: note without the failed restatement;
  - ing-h3-0188: name without the brand;
  - ing-h3-0252: note `recommended`.

  The evaluator independently chose the same placement as I did for the three cases I had flagged as not settled
  (0004, 0300: the failed restatement goes to `note`).

---

## 2. Full review of all 369 labels

The set has 292 ready, 52 needs_review and 25 unsupported cases; 2 are marked debatable and 109 are marked
`reliesOnNewReading`. I read every label against §7, §12, §12.A, the labelling guide and the frozen conventions. For the
following families I recomputed the arithmetic exactly:
- every restatement and package restatement, using the §12.6/A2 base values;
- every compound sum;
- every §12.1 fraction word.

Except for the items listed below, all core fields agree with my reading.

### 2.1 Definite errors (1)

| id | Field | Evaluator | Mine | Rule |
|---|---|---|---|---|
| **ing-h3-0091** `6 large cabbage leaves, blanched` | name, unit | name `cabbage leaves`, 6 `each` | name `cabbage`, 6 `leaf`, note `large; blanched` | §12.4. `leaf` is a listed count unit after a food, and the noun is the unit when "the words before it, bought by that unit, are the product meant" (garlic by the clove, lettuce by the head). The exception list (bay, curry, banana, grape, makrut/kaffir lime, pandan leaves) does not include cabbage. The rationale says "'cabbage' alone names a different product", but cabbage is exactly what is bought; the leaves are blanched fresh from it. Unlike grape leaves, these are not a separately sold product. If the evaluator still prefers the identity reading, the case must at least be `debatable`, because an engine following §12.4's text would be scored wrong on unit. |

### 2.2 Defensible alternatives (should become `debatable` or an `accept` entry)

**Core fields the contract does not settle → pre-register as `debatable`:**

| id | Field | Evaluator | Alternative | Why the contract does not settle it |
|---|---|---|---|---|
| **D1 ing-h3-0180** `1 inch fresh turmeric root, grated` | status, unit | ready, 1 `inch` | needs_review, unit null (my blind label) | Correct only if `inch` is a `UNIT_REGISTRY` imprecise unit. The contract never says so: §7.3's imprecise list has no inch, §7.13 treats inches as size notes, and §12.14 covers non-registry tokens. Either add `inch` to §7.3 (and then my label is wrong) or mark the case debatable. If kept ready, also add the accepted name `turmeric root`/`turmeric` with note `fresh; grated`, as frozen h2-0083 does for `fresh turmeric`. |
| **D2 ing-h3-0075** `1 small tub crème fraîche` | status, unit | needs_review, unit null ("tub is not a registry unit") | ready, 1 `container`, note `small` | Whether `tub` is a synonym of `container` (as `pkg` is of `package`, h3-0218) is registry knowledge that the contract does not list. The other reviewer's probe file labels `1 tub sour cream` → `container`. A cook reads a tub as a container. |
| **D3 ing-h3-0193** `3 rashers smoked streaky bacon` | status, unit | needs_review, unit null | ready, 3 `slice` | A rasher is the UK word for a slice of bacon. Whether it is a registry synonym is not in the contract. The evaluator's label follows §12.14 literally, so this alternative is weaker than D1 and D2. Still, a cook would not hesitate here. |
| **D4 ing-h3-0104** `For garnish: pomegranate arils` | status | ready, `for_garnish` | unsupported | Two §12.8 rules collide. "A line with no amount is a heading when it … starts with `For (the)`" makes it a heading; "a role label followed by a food is an ingredient" makes it an ingredient. The evaluator's reading is the cook's, and I agree with it, but the contract text does not rank the rules. Fix: "a heading has nothing after its colon". |
| **D5 ing-h3-0211** `Topping (optional)` | status | unsupported | needs_review | The heading rule needs the line to consist "only of generic component words", and `(optional)` breaks "only". Otherwise "uncertain lines go to `needs_review`". I agree with unsupported as the cook's reading; mark it debatable or widen the wording to "…optionally followed by `(optional)`". Low priority. |

**Accepted-value additions** (strict label kept; the frozen conventions accept the bare food):

| id | Add accepted value | Frozen precedent |
|---|---|---|
| ing-h3-0034 `1 cup mint leaves, packed` | name `mint` | hold-0052, h2-0170 and h2-0267 accept `basil` for `basil leaves` |
| ing-h3-0077 `2 cups packed cilantro leaves (from 2 bunches)` | name `cilantro` | h2-0267 |
| ing-h3-0226 `Cracked black pepper, as needed` | name `black pepper`, note `cracked` | h2-0346 (same food), h2-0328 |
| ing-h3-0281 `a 2-inch knob of fresh ginger` | name `ginger`, note `2-inch; fresh` | h2-0073 `1 thumb-sized knob fresh ginger` |
| ing-h3-0352 `3-4 tbsp ice-cold water` | name `water`, note `ice-cold` | README temperature-word convention (h2-0016, h2-0139, h2-0192); the evaluator itself accepts this for h3-0065 `warm pita bread` |
| ing-h3-0097 `about 2 cups day-old bread cubes` and ing-h3-0360 `3 cups day-old jasmine rice` | bare food with note `day-old` (weaker) | an age/state word like `cold`/`leftover` |
| ing-h3-0014 `2 cups mashed ripe bananas (about 4 bananas)` | name `bananas` with note `mashed; ripe` (weaker) | the coordinator accepted `pears` for `ripe pears` |

**Accepted value to remove:** ing-h3-0225 `✓ 1 cup roasted red peppers, patted dry` accepts name `red peppers` with
note `roasted`. The evaluator's own rationale calls roasted red peppers "a jarred product (kept whole)", and accepting
`red peppers` lets an engine that implies fresh bell peppers count as accepted. I would remove it. The same argument
applies, more weakly, to ing-h3-0013 (`Hatch green chiles`).

### 2.3 Metadata

**(a) `debatable`.**
- The two flagged cases, ing-h3-0297 (`1 strip steak`, A1) and ing-h3-0311 (`black beans and rice`, A4), are exactly
  the cases the contract itself calls debatable. Correct.
- Add D1–D4 (and D5 if wanted), plus ing-h3-0091 if it is not corrected. That gives 6–8 of 369 (≈ 2 %).

**(a) `reliesOnNewReading`.** These labels depend on text added after the frozen fixtures (12.A or new item clauses),
but are flagged false:

| Source of the new reading | Cases |
|---|---|
| A1 sloppy plural / containers always the unit | 0001 `2 jar`, 0022 `2 head garlic`, 0350 `3 stalk celery` |
| A5 mass words excluded | 0039 `3 pound chuck roast` |
| A2 allowance | 0258 `1/8 tsp (1 mL)`, 0177 `2 kg (4 lb)` |
| A3 prepared vs extracted | 0014 (mashed), 0111 (diced, ribs), 0146 (crushed → sheets), 0229 (chopped, about 1 cup), 0303 (pitted). The only convention A3 cites is the probe `1 cup chopped onion (1 medium)`, which is not frozen. |
| A4 modifiers joined by `and` | 0167 `yellow and red cherry tomatoes` |
| 7(b) "M1 alone names the product" criterion | 0215 `Scotch bonnet or habanero chile` |
| Item 13 container exception | 0125 `3 410 g tins` |
| Item 13 narrow space | 0313 |
| Item 5 `N cups (S each)` | 0290 |
| Item 9 plural-head test | 0207 `3 cheese quesadillas` |
| Item 10 heat-grade exception | 0209 `mild curry paste` |
| Item 12 `less` | 0017 |
| §12.15 new parts | 0102 `Small sprig of`, 0285 `Head of`, 0277 `Scoop of` (count unit with no number); 0129 `Splashes of` (plural); 0345 `Cup of` (measuring unit) |

That is 25 under-flagged cases. None of the 109 flagged-true cases is wrongly flagged.

**(a) `contract12`.**
- The tag `12.15` is never used, though ten lines rest on it: 0026, 0063, 0082 (size word before the unit), 0087,
  0102, 0129, 0277, 0285, 0327, 0345.
- `12.14` is used three times (0064, 0075, 0193). Under my reading it also applies to 0180.

**(a) `family`.**
- Eight `plain` cases carry a §12 tag: 0036, 0105, 0182, 0200, 0209, 0305, 0317, 0336. This is harmless, but "plain"
  then does not mean "no §12 reading".
- Otherwise families match the A (amounts/units), B (choices/remarks), C (count/containers) and D (non-ingredient)
  pattern of the coordinator's regression file.

**(a) `seasoningClass`** (not scored; matters for the Phase 3 exclusion). ing-h3-0082 `Maldon salt` and ing-h3-0322
`flaky salt` are `ordinary_salt`. The frozen holdout-v2 classes `flaky salt` (h2-0176) and `flaky sea salt`
(h2-0343) as `lookalike`. Align one way or the other.

**(a) `construction`.** All 369 construction strings embed the expected family, status and rule (e.g. `… | C ready
12.4`). The file must never be shown to the implementation worker, even partially (the category list leaks less but
also hints, e.g. `seasoning_ordinary`).

**Severity** follows the guide: high for ready-with-amount and for unreadable or ranged amounts of main foods, medium for
choices and non-ingredients, low for seasonings and lines with no fixed amount.

### 2.4 Answers to (b) and (c)

**(b) Core fields the contract does not settle.**

| Cases | Unsettled point | Recommendation |
|---|---|---|
| My three blind cases: 0004, 0300, 0180 | 0004/0300: where a failed restatement goes, `note` vs `equivalents` (non-core) | The evaluator and I independently chose `note`, as do 0138, 0171 and 0319: consistent. Not debatable (non-core), but write the convention into §12.6 ("a failed restatement is a second amount; it goes to `note` as written"). |
| 0180 | core: status/unit, registry membership of `inch` | Pre-register as debatable (D1). |
| 0075, 0193 | registry membership/synonyms (`tub`, `rasher`) | Pre-register as debatable (D2, D3). |
| 0104 | rule collision in §12.8 | Pre-register as debatable (D4). |
| 0211 | wording ("only") | Debatable (D5), optional. |
| 0091 | not unsettled, in my view (§12.4 decides it) | Debatable at most, if the evaluator disagrees. |

The structural fix is to publish in the contract the registry's unit words, including synonyms (`tub`, `rasher`,
`inch`, `sprinkle`, `scoop`, `knob`, `pkg`, `pack`). Three of the five open cases exist only because the contract
delegates unit membership to `src/contract.ts`, which a contract-only labeller cannot see.

**(c) Lines a careful cook would not write, and labels resting on knowledge outside the contract.**
- **Unnatural constructions:**
  - 0253 `2 quarter-cups chicken stock`: nobody writes this, they write ½ cup. It tests §12.1 mechanically.
  - 0124 `12 drop dumplings`: drop dumplings are made from the batter, not bought; a plausible line only on a menu or
    in a frozen-food list.
  - 0118 `1x pinch saffron`: rare, though it occurs where scaling controls leak into the text.

  None of these is wrong, but they over-weight the new rules relative to real pages.
- **Labels resting on implementation knowledge, not the contract:** 0180 (`inch` is a registry imprecise unit), 0075
  (`tub` is not a registry unit) and 0193 (`rasher` likewise). The rationales cite "the registry", which the contract
  does not enumerate.
  - 0281 `knob` and 0322 `sprinkle` are fine: frozen h2-0073 and A5's example show them.
  - No rationale mentions any engine, parser or tokenization: no sign of engine-derived labels.
- **Contract-mechanical outcomes a cook would read otherwise** (labels correct per contract; listed as cooking-sense
  costs):
  - 0113 `dissolved in 3 tbsp hot water` → needs_review, because "another food" catches preparation water.
    Suggestion: exempt water and ice from the remark-amount rule.
  - 0259 `-2 cups loosely packed arugula` → needs_review. A cook sees a bullet without a space; item 13 deliberately
    calls it negative, which is safe.
  - 0096 `0.33 cup molasses` → exactly 33/100. A cook reads ⅓; §8 has no accepted quantity values.
  - 0171 `1 (500 g / 1 lb) bag` → needs_review (A2 policy).
  - 0138 `1 tbsp (4 tsp)` → needs_review. This one is correct: it is an Australian tablespoon.

---

## 3. Bottom line

The holdout-v3 labels are of high quality. Blind core agreement is 45/46 (97.8 %), and the one miss is a
registry-membership question rather than a reading error. In the full review:
- **1 definite error**: ing-h3-0091, which should be unit `leaf`, name `cabbage`.
- **5 core cases to pre-register as debatable**: 0180, 0075, 0193, 0104, and optionally 0211.
- **9 accepted-value edits**: 5 additions (0034, 0077, 0226, 0281, 0352), 3 weaker additions (0097, 0360, 0014) and
  1 removal (0225), plus accepted values for 0180 if it stays ready.
- **Metadata**: 25 under-flagged `reliesOnNewReading`, `12.15` never tagged, 2 `seasoningClass` values contradicting
  the frozen convention, and the `construction` field leaking labels.

None of these changes the status of more than one case, apart from the debatable flags.
