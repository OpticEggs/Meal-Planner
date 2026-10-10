# Phase 2C review: CONTRACT-v1 §13, the unit-alias manifest and the 2C regression labels (label checker R2)

Date: 2026-10-10. Read-only and blind to every engine.

**What I read:**
- CONTRACT-v1 §13;
- `UNIT-ALIASES-v1.md`, and the data file `src/unit-aliases.ts` (skimmed);
- `coordinator-labels-2c.tsv` (71 lines) and `relabels-13-1.tsv` (7 lines).

I compared these with §7, §12, §12.A and the frozen labels of dev, holdout-v1, holdout-v2 and holdout-v3 (the copies in
my workspace). No engine code or candidate output was read.

## Bottom line

**Must change before a freeze (3 collisions):**
- **C1, quantity on unknown-unit lines.** §13.1 and §13.2 say the label holds "quantity = the number". The 2C TSV
  flag `N` and all 7 relabels say no amount is allowed, and §13.2 tells engines to leave the quantity empty. Under §9
  scoring, every compliant engine then fails the quantity field on these lines. The label convention and the scoring
  must say the same thing.
- **C2, size before a non-container noun.** §12.3 says "a size before any other noun is the line's amount", but
  §13.2 / the relabel turn `8 oz tub whipped topping` into needs_review with no amount. A precedence rule is needed.
- **C3, the noun's place in `note`.** §13.1 says "the noun goes in `note`" and cites holdout-v3 0075 and 0193. In
  both frozen labels the noun is only an accepted note value, not the strict note. The claim that every item is
  consistent with the frozen labels is therefore not quite true; reword the sentence or say "strict or accepted".

**Definite label errors: 1.** `6 fish slices, patted dry`: `slice` is a declared count unit after the food (§12.4),
so the label should be 6 `slice` fish. This repeats holdout-v3 0091.

**Debatable or accepted-value edits: 2–3.**
- `1 lb cremini or shiitake mushrooms`: §12.7(b) requires the as-written option list to be accepted.
- `2 cups cheese, cheddar or monterey jack`: accept `cheddar;monterey jack`.
- `8 oz tub whipped topping`: debatable until C2 is settled.

**Manifest:** sound. All listed words are the code's own words except weak cases (`gs`, `ls`). Three gaps:
- `fl.oz` (glued) is not covered;
- `filet` collides with `filet mignon`;
- `pk` is also the standard abbreviation of peck.

No frozen label relies on a missing alias. The 3 frozen container-"cups" lines rely on §12.5, not on the table.

## (a) §13 item by item

| Item | Verdict | Evidence and collisions |
|---|---|---|
| 13.1 Declared unit words | OK as a rule; **collides** (C1, C3) | Consistent with h3-0075 (tub), h3-0193 (rasher), h3-0180 (`inch` is now declared imprecise, which settles my earlier debatable case in the evaluator's favour), h3-0218 (`pkg.`), h3-0281 (knob), h3-0322 (sprinkle), h3-0277 (scoop). "The noun goes in note": frozen 0075 has strict note `small` with `small; tub` only accepted, and 0193 has strict note null with `rashers` accepted (C3). |
| 13.2 Measure slot accounted for | Mostly clear; **collides** with §12.3 (C2) and with its own label line (C1) | (1) The sentence "Label: `needs_review`, name = the food, quantity = the number, unit null" against "Engine: … leaves the quantity empty": the label and a correct engine differ on a field the scorer compares. Either label the quantity null (number kept in note), or have §9 exempt quantity on these lines. (2) §12.3 "A size before any other noun is the line's amount (`6 oz salmon fillet` → 6 `oz`)" against `8 oz tub whipped topping` → no amount. Proposed: "§12.3's size-as-amount applies only when the noun is part of the food's name (fillet, roast); a non-alias container-like noun makes the line §13.2." (3) "An unrecognised food … never `unsupported`" against 13.5's brand examples (`1 Staub cocotte`): a labeller who does not know the brand writes needs_review. Use only unmistakable equipment in holdouts. (4) Consistent with frozen hold-0056 (`3 stalks lemongrass`, declared `stalk`) against the example `3 stems lemongrass`, and with dev-0088 `2 ears corn` against `1 cob corn`. Good. |
| 13.3 Remark amounts of a different food | OK | Matches frozen h3-0113 (needs_review), h2-0165, h2-0338, and the no-amount controls hold-0026 (`soaked in warm water`, ready) and h3-0232. "Steeped in" and "bloomed in" (used in the 2C labels) are not in the verb list, but the general sentence covers them. Add "for example" before the list. |
| 13.4 Coordinated foods | AMBIGUOUS (minor) | Consistent with h3-0140, h3-0221, h3-0156, h3-0167 (one head) and h2-0268 (bracketed varieties). (1) "joined by … commas" collides with §7.7's comma remark and §12.7(f): `2 cups mushrooms, cremini and shiitake` and `1 lb chicken, thighs and drumsticks` could be a list or X plus varieties. State that (f)'s variety expansion applies to `and` as well (→ list of `cremini mushrooms`, `shiitake mushrooms`, as a list) or not. (2) "Each food's text **may** be kept in `note`": "may" lets two labellers write different notes. Say "is kept in note" or "note null". |
| 13.5 Equipment | OK | Consistent with h3-0002, h3-0009, h3-0048, h3-0093, h3-0114, h3-0204, h3-0270, h3-0271. The food-purpose exceptions are good. |
| 13.6 Debatable shapes | OK, see (d) | |
| 13.7 Role labels and headings | OK | Settles h3-0104 → ready, for_garnish, and h3-0211 → unsupported, the readings I had agreed with. Minor: define "role label" (Garnish, To serve, For serving, Optional, Topping?), because `Topping: 1 cup whipped cream` and `Sauce: 1 cup marinara` fall between a role label and a heading with content. Both readings give an ingredient, so only the role (`for_garnish` or not) is open. |
| 13.8 Canonical container ≠ package size | OK | dev-0091, h2-0047, h3-0001, h3-0263. |

## (b) The alias rule and the manifest

**Checked words:**

| Word | Verdict |
|---|---|
| `pack`, `packs` → package | Acceptable: the standard clipping, and the §13.1 text itself lists it. |
| `c` → cup | OK, frozen h2-0002 `c.`. It does not collide with enumerator `c)`, which §12.13 handles. |
| `gs` (g), `ls` (l) | Plural forms of symbols. Not standard, but harmless. Could be dropped. |
| `tb` | Real clipping of tablespoon. |
| `lt` | European abbreviation of litre. OK. |
| `ea` | Standard abbreviation of each. |
| `filet` | A true spelling variant. **Collision:** `2 filet mignon steaks` is covered by A1, but `1 filet mignon` / `4 filet mignon` would read unit `fillet` with name `mignon`. Add a sentence: an alias word that begins a food name (filet mignon, fillet steak) is part of the name. Or list `filet mignon` among the food-name exceptions. |
| `pk` | Also the standard abbreviation of **peck** (US dry measure). Rare today; note it. |

No listed word is a different noun.

**Missing own-word spellings:**
- `fl.oz` / `fl.oz.` written as one token. The two-word rule needs `fl` and `oz` as separate words. Probe lines `3 fl.oz
  milk` and `4 fl.oz. cream` exist.
- Minor: `tbspn`, `cont.` (container), `qrt`, `cupsful`.
- Units absent from the registry altogether (so not alias questions, but frequent): `cl` (centilitre) and `cc`. They
  fall to §12.14.

**"Not aliases":** tub, pot, bar, rasher and punnet are correct under the rule (different nouns). This is consistent
with frozen h3-0075 and h3-0193. It overturns the other reviewer's probe readings (`1 tub sour cream` → container,
`1 bar dark chocolate` → block), which were never frozen. For visibility, consider listing `sachet`, `pouch`, `sleeve`,
`brick`, `slab`, `tray`, `cob` and `stem` as well (the rule covers them anyway).

**Frozen coverage:** I scanned every frozen label (dev, holdout-v1, holdout-v2, holdout-v3) whose unit is not `each` or
`fl_oz`. A declared word (or `T`/`t`) is present in every one except h2-0087, h3-0127 and h3-0290, where `cups` → the
`container` code under §12.5. The manifest should cross-reference §12.5 for that case. h3-0218 `1 pkg.` is covered.

## (c) The 71 coordinator labels and 7 relabels

The 18 FL-A2 labels and their controls, the B1 lists and controls, the C2 equipment lines, the C3 vessels, the D1
non-aliases and the D-controls all agree with §13 on status, name, quantity and unit, except for the items below.

**Definite error:**

| Input | Given | Mine | Rule |
|---|---|---|---|
| `6 fish slices, patted dry` | 6 `each`, `fish slices` | 6 `slice`, `fish`, note `patted dry` | §12.4: `slice` is a declared count unit after the food, and fish by the slice is the product. No exception applies (as in my holdout-v3 0091 finding). If "fish slices" is meant as the Cantonese product, it is at most debatable, not firm. |

**Defensible alternatives** (accepted value or debatable):

| Input | Given | Alternative | Rule |
|---|---|---|---|
| `1 lb cremini or shiitake mushrooms` | strict `cremini mushrooms;shiitake mushrooms` | strict `cremini;shiitake mushrooms`, or at least accept it | §12.7(b): when M1 alone names a product of H's kind (cremini/creminis), the strict reading is as written and the distributed reading is accepted. Like `feta or goat cheese`. |
| `2 cups cheese, cheddar or monterey jack` | `cheddar cheese;monterey jack cheese` | accept `cheddar;monterey jack` | §12.7(f) expansion plus the (b) logic. |
| `8 oz tub whipped topping` (relabel) | needs_review, no amount | needs_review with 8 `oz` (the line's amount, §12.3) | Collision C2. Debatable until settled. |

**Convention issue (all `N` lines and all 7 relabels):** status needs_review is right, but "no amount allowed"
contradicts §13.1 and §13.2's label sentence (C1). The relabels' "no amount" is the reading I would prefer for scoring;
then §13.1 and §13.2 must say quantity null with the number in `note`.

**Checked and agreed** (selection):
- `3 tbsp cocoa powder mixed with 3 tbsp boiling water`: no comma; a second amount, not a coordinated list.
- `2 tbsp chia seeds (soaked in 6 tbsp water)`.
- The controls `1 cup all-purpose flour, plus 2 tbsp for dusting` → 18 tbsp, and `dissolved in hot water` (no amount)
  → ready.
- `1 lamb rib rack` and `2 lb pork rib racks`: the noun is the food head.
- `1 skillet cornbread batter`: vessel → needs_review.
- `4 125 g pots yogurt`: needs_review under both §13.2 and §12.13.
- `1 box macaroni and cheese`, `1 can pork and beans`: fixed compounds.
- `3 × 120g pots natural yoghurt` (relabel): needs_review, `pots` is not a container.

## (d) Debatable shapes (§13.6)

- **Completeness:** the list covers every shape the contract itself calls debatable: §12.4 ice and sugar cubes; A1
  count-one cut or dish; A3 off-the-bone and drained canned; A4 product-or-list pairs; A5 `2 pound cakes`. The
  registry-membership cases from holdout-v3 (inch, tub, rasher) are now settled by §13.1. 0104 and 0211 are settled by
  §13.7.
- **Clarity of the rule:** clear, with two additions needed.
  1. *Timing:* checker-found debatable cases must be pre-registered before any candidate is scored on the set.
     Afterwards, a change makes the set exposed (as in EVALUATION-PLAN-v2 §8.5).
  2. *Severe-error criteria:* state whether S-criteria and Gate G2's zero-tolerance counts (fabricated quantity,
     cross-dimension) are computed over all cases, including debatable ones. I recommend all cases: a fabricated
     amount is never debatable.
- **§13.7 on 0104 and 0211:** yes, I agree with both readings, and with leaving holdout-v3's published figures
  untouched.
