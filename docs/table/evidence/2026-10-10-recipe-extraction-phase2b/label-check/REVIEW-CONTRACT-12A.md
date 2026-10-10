# Follow-up review: CONTRACT-v1 §12 (revised), §12.15 and §12.A A1–A4

Date: 2026-10-10. Reviewer: label checker R2.

**Input:** the contract copied, as authorised, to `CONTRACT-v1.current.md` (411 lines). I diffed it against my
earlier copy: only §12 changed. Items 1–14 were rewritten, item 15 is new, and section 12.A (A1–A4) is new. Nothing
else outside this workspace was read. The frozen dev, holdout and holdout-v2 labels were re-searched for every new
construction.

**Arithmetic:** exact rationals, using the base values printed in §12.6: tsp 4.92892159375 ml, tbsp
14.78676478125 ml, cup 236.5882365 ml, fl oz 29.5735295625 ml, oz 28.349523125 g, lb 453.59237 g. "Rounded" means
rounded half up; the rounding mode is not specified, see §1.3.

---

## 0. Verdicts

| Item | Verdict | Consistent with frozen labels? | Main point |
|---|---|---|---|
| §12.6 + A2 | **Free of contradiction once A2 is applied.** All six requested cases and the policy list come out as stated. 3 fixes needed. | yes (max frozen deviation 5.67 %) | Item 6's own text still states the unrestricted allowance. The rounding mode matters at exact halves. Coarse "smaller" units let 12–33 % through. |
| §12.15 | AMBIGUOUS (minor) | yes (h2-0061; dev-0129, dev-0139, dev-0140 use an article) | Plural or vague (`Dashes of bitters`); non-imprecise units (`Clove of garlic`, `Cup of flour`); degree words (`generous`, `heaping`, `scant`) |
| A1 | AMBIGUOUS, **cooking-sense risk** | no contradiction, but it leaves frozen h2-0066, h2-0074 and h2-0075 undetermined | Sloppy agreement (`2 clove garlic`, `1 1/2 stick butter`, `2 can tomatoes`) would become food names |
| A3 | **CONFLICT** with item 11's `from` marker, and AMBIGUOUS | yes | `1 cup chopped onion (from 1 large onion)`: item 11 says second amount, A3 says restatement. Corn kernels, herb leaves and rotisserie chicken are on the line between prepared and extracted. |
| A4 | AMBIGUOUS | yes (h2-0104 is a compound, but not listed) | Open compound list (`peas and carrots`, `pork and beans`); salt-and-pepper variants with an amount; `red and yellow bell peppers` vs h2-0268 |
| Rest of §12 (items 1–14) | OK: my earlier proposals are adopted and the cited case ids check out | yes | Two new small issues: item 13's thousands-group rule vs the package form `2 400 g cans`, and item 5 vs item 3's container list (`cup`) |

---

## 1. §12.6 together with A2: computed cases

The allowance applies only when the restated unit is **smaller** than the first-stated unit (A2).

| Line | First (base) | Restated (base) | \|Δ\|/first | 7 % test | Restated unit smaller? | Exact conversion → rounded | Allowance | Result | Matches §12.6/A2? |
|---|---|---|---|---|---|---|---|---|---|
| `2 lb (1 kg)` | 907.18474 g | 1000 g | 10.231 % | fail | no (kg > lb) | 0.90718 kg → 1 | n/a | **needs_review** | yes (A2, policy list) |
| `1 kg (2 lb)` | 1000 g | 907.18474 g | 9.282 % | fail | yes | 2.20462 lb → 2 | pass | **ready** (restatement) | yes (A2 example) |
| `100 g (4 oz)` | 100 g | 113.39809 g | 13.398 % | fail | no (oz > g) | 3.52740 oz → 4 | n/a | **needs_review** | yes (A2) |
| `500 g (1 lb)` | 500 g | 453.59237 g | 9.282 % | fail | no (lb > g) | 1.10231 lb → 1 | n/a | **needs_review** | yes (A2) |
| `1/2 tsp (2 ml)` | 2.46446 ml | 2 ml | 18.846 % | fail | yes | 2.46446 ml → 2 | pass | **ready** | yes (§12.6, A2 examples) |
| `1 lb (454 g)` | 453.59237 g | 454 g | 0.090 % | **pass** | yes | 453.59 g → 454 | pass | **ready** | yes, but it passes the 7 % test on its own, so it does not illustrate the allowance |

The policy list ("outside both tests → `needs_review`") is also consistent:

| Line | Deviation | Allowance check | Result |
|---|---|---|---|
| `8 oz (250 g)` | 10.231 % | 226.80 → 227 ≠ 250 | needs_review |
| `1 lb (500 g)` | 10.231 % | 453.59 → 454 ≠ 500 | needs_review |
| `2 lb (1 kg)` | 10.231 % | allowance not applicable | needs_review |
| `4 oz (100 g)` | 11.815 % | 113.40 → 113 ≠ 100 | needs_review |

Other checks:
- `1/4 tsp (1 ml)` and `3/4 tsp (4 ml)` (8.205 %) → ready via the allowance.
- `1 lb (14 oz)` (12.5 %; 16 ≠ 14) → needs_review, as in the coordinator's regression label.
- `1/3 cup (5 tbsp)` 6.25 % → ready. `14 oz (400 g)` and `400 g (14 oz)` 0.78 % → ready. `4 cups (1 l)` 5.67 % → ready.

All 19 frozen same-dimension restatements are within 5.67 %, so nothing frozen moves. The coordinator's package
restatements (`400 g (14 oz) can`, `28 oz (794 g)`, `400ml (14fl oz)`, `16 oz (1 lb)`) all pass the 7 % test.

**Conclusion:** applied together, §12.6 and A2 contain no contradiction for any of these cases.

**Three things to fix:**
1. **Item 6's own text is still contradictory when read alone.** Its allowance sentence has no "smaller unit"
   condition, so on item 6 alone `2 lb (1 kg)` is ready (0.907 kg rounds to 1), while item 6's own policy list says
   needs_review. Only A2 resolves this. Merge A2 into item 6 so one paragraph is authoritative. Also, A2's phrase
   "This replaces the contradictory policy sentence" is misleading: the policy sentence stays, and A2 narrows the
   allowance. Suggested: "This narrows item 6's rounding allowance; the policy list is unchanged."
2. **Rounding mode.** Between customary units, exact halves occur:
   - `1 1/2 tbsp (5 tsp)`: 4.5 tsp rounds half-up to 5 (ready) or half-even to 4 (needs_review); the reverse holds
     for `(4 tsp)`.
   - `1/2 tbsp (2 tsp)` vs `(1 tsp)`: 1.5 tsp.

   Add "rounded half up".
3. **Coarse smaller units let large errors through.** These would all be read as restatements:
   - `1/2 tbsp (2 tsp)`: 33 %
   - `1/3 quart (1 cup)`: 25 %
   - `1/6 cup (3 tbsp)`: 12.5 %
   - `1/6 lb (3 oz)`: 12.5 %

   A cook would flag these as inconsistent. A2's own rationale ("a whole number of a larger unit hides more than it
   states") applies equally to whole tsp, tbsp, oz or cups. Proposed: "The allowance applies only when the restated
   unit is `ml` or `g` (or `lb` restating `kg`: `1 kg (2 lb)`, `2 kg (4 lb)`); customary-to-customary restatements
   use the 7 % test alone." This keeps every example in item 6 and A2, and the policy list.

Smaller notes:
- Replace the `1 lb (454 g)` example with `1 kg (2 lb)` or `3/4 tsp (4 ml)`.
- `1/8 tsp (0.5 ml)` (the Canadian standard) remains needs_review (18.8 %, and 0.5 is not whole). Accept that
  knowingly, or allow the nearest 0.5 ml.
- For a compound restatement (`500 g (1 lb 2 oz)`), the "restated unit" is undefined. Say "the smallest unit of the
  restatement".

---

## 2. §12.15 Imprecise unit with no number = 1: **AMBIGUOUS** (minor)

- **Consistency:**
  - The frozen h2-0061 `Pinch of salt` → 1 `pinch` is the only bare case.
  - With the article: dev-0129, dev-0139, dev-0140, dev-0142, hold-0094, h2-0174, h2-0175, h2-0319 (§7.1, a = 1).
  - Size word to note: h2-0178 `2 small handfuls`, h2-0179 `1 large handful`, h2-0074 `1 small head garlic`.
  - The "(restated)" tag is honest, though it rests on a single frozen line.
- **Cooking sense:** right for a singular pinch, dash, splash, handful or drop.
- **Borderline inputs:**
  1. *Plural with no number:* `Dashes of bitters`, `Pinches of saffron`, `Drops of vanilla`. "Reads as one" would
     invent a count. These should have no quantity (`needs_review`), like h2-0056 `a few sprigs fresh dill` and the
     probe `a few sprigs of rosemary`.
  2. *Vague quantifiers:* `A few drops lemon juice`, `Couple of dashes hot sauce`, `Pinch or two of salt` (range
     1..2).
  3. *Count units with no number:* `Clove of garlic`, `Sprig of thyme`, `Knob of butter`, `Stick of butter`,
     `Can of chickpeas`. Is it 1, or does §12.15 not apply? Two labellers will split.
  4. *Measuring units with no number:* `Cup of flour`, `Tablespoon olive oil`. A missing number here is more likely a
     scraping loss (e.g. an image fraction), so reading it as 1 would fabricate an amount.
  5. *Degree words:* `Generous pinch`, `Good pinch`, `Heaping handful`, `Scant pinch`, `Tiny pinch`. Item 10's
     size-word list has `big` but not generous, good, heaping, scant, level or tiny. Should they go to note, or
     set `approximate`?
  6. *Position:* `Salt (pinch)` / `salt, pinch`: the unit after the food with no article.
- **Proposed wording:** "A *singular* imprecise unit (pinch, dash, splash, handful, drop) or count unit (clove,
  sprig, knob, stick, bunch, head, can …) with no number reads as one, wherever it stands in the line (`Pinch of salt`,
  `salt, pinch`, `Clove of garlic`). A plural one, or one with a vague quantifier (`a few`, `a couple of`, `some`,
  `several`), has no quantity → `needs_review` (`quantity_missing`), the unit kept. A measuring unit (cup, tbsp, tsp,
  oz, lb, g, ml …) with no number → `needs_review` (`quantity_missing`). Size and degree words before the unit (small,
  large, big, tiny, generous, good, heaping/heaped, rounded, level, scant) go to `note`; `approximate` stays false."

---

## 3. A1 Count word before the food: **AMBIGUOUS**, with a cooking-sense risk

- **Consistency:** In every frozen pre-food count with a count above one, the unit is plural (dev-0012, dev-0081,
  dev-0083, dev-0084, dev-0088, hold-0054, hold-0056–0058, hold-0060, h2-0052, h2-0062, h2-0063, h2-0067–0070). Every
  count-of-one line takes the singular. So there is no frozen contradiction.
- **Gaps that leave frozen cases undetermined:**
  - **"right after the number"** excludes size words and brackets that sit in between:
    - h2-0075 `3 large sprigs thyme` → 3 `sprig`
    - h2-0074 `1 small head garlic`
    - h2-0178 `2 small handfuls of arugula`
    - h2-0073 `1 thumb-sized knob fresh ginger`
    - dev-0003 `2 (15 oz) cans black beans`, if containers are in A1's scope
  - **"with a count of one, when an uncounted food follows"** does not cover plural countable foods:
    - h2-0066 `1 bunch scallions` (frozen: 1 `bunch`)
    - dev-0124 / h2-0157 `1 … can black beans` / `cannellini beans`
    - h2-0238 `1 (8 oz) jar sun-dried tomatoes`
    - h2-0315 `1 (8 oz) container … pearls`

    None of these is uncounted, and none is the cut/dish case.
  - **Counts below one** are not covered: `1/2 stick butter`, `3/4 stick butter`, `1/2 head cabbage`, h2-0094
    `1/3 (14 oz) can`.
  - **Containers:** it is unclear whether A1 governs containers at all.
- **Cooking-sense risk:** recipe text often gets the plural wrong. Read literally, A1 turns these into food names
  with unit `each`:
  - `2 clove garlic` → "clove garlic"
  - `3 slice bacon`, `4 sprig thyme`, `2 stalk celery`, `2 ear corn`
  - `1 1/2 stick butter`: a count above one with the singular, very common for butter
  - `2 can black beans`, `2 package cream cheese`

  In every case a cook reads count + unit. Separately, `8 piece chicken` (one chicken cut into 8 pieces) needs
  `needs_review`.
- **Proposed wording:** "A registry count unit after the number, a size word or a bracketed package size is the unit.
  It is a singular count word that **begins the food's name** (unit `each`) only when it and the following *plural*
  noun form an established cut or dish name (`strip steaks`, `rib eye steaks`, `cube steaks`, `sheet cakes`, `wedge
  salads`, `link sausages`) and the count is above one. Otherwise singular/plural disagreement is ignored (`2 clove
  garlic` → 2 `clove` garlic; `1 1/2 stick butter` → 3/2 `stick`). Containers (item 3) never begin a food's name
  (`2 can tomatoes` → 2 `can`). With a count of one or less, the count word is the unit before any food, uncounted or
  plural (`1 bunch scallions`, h2-0066; `1/2 head cabbage`). The exception is a following *singular* countable food
  that forms a cut or dish name (`1 strip steak`, `1 sheet cake`, `1 head cheese`): debatable, not used as a firm
  label. `8 piece chicken` → `needs_review`."

---

## 4. A3 Prepared vs extracted: **CONFLICT** with item 11, and AMBIGUOUS

- **Consistency with frozen labels:**
  - h2-0071 `4 Italian sausage links (about 1 lb)` → equivalent (same food).
  - h2-0317 `¼ cup grated parmesan (about 1 oz)` → equivalent (prepared, same food).
  - h2-0143 `1 cup (about 4 oz) shredded Gruyère` → equivalent.
  - h2-0165 / h2-0338 (cooked vs dry) → needs_review.
  - h2-0212 `Juice of 2 limes` is not a remark, so it is unaffected.
  - No frozen label contradicts A3.
- **CONFLICT inside §12:** item 11 lists `from` among the markers of a second amount ("measures a source … `from`,
  `makes`, `yields`"). A3 says cutting does not change the food, and a count of whole items in a remark restates a
  prepared amount. For `1 cup chopped onion (from 1 large onion)` and `1 cup grated carrot (from 2 carrots)`, item 11
  gives needs_review and A3 gives ready. A3's "with or without a marker word" is stated only for extracted parts. A
  careful cook reads `(from 1 large onion)` as a restatement.
  **Fix:** item 11: "`from`/`makes`/`yields` mark a second amount only for an extracted part, another state or
  another food; for a cut or mashed amount of the same food, `(from N items)` restates (A3)."
- **Borderline inputs** between prepared and extracted:
  - `1 cup corn kernels (from 2 ears)`: kernels are cut from the cob, but they are also "seeds", and they are sold
    separately.
  - `2 tbsp thyme leaves (from 6 sprigs)` / `1 cup basil leaves (1 bunch)`: picking leaves.
  - `2 cups shredded chicken (from 1 rotisserie chicken)`: shredding, but bones and skin are removed, and the state
    is cooked.
  - `1 cup diced mango (2 mangoes)` vs `1 cup mango pulp (2 mangoes)`.
  - `1 cup mashed avocado (2 avocados)`: pit and skin removed.
  - `1 1/2 cups black beans (one 15-oz can, drained)`: drained vs undrained.
  - `2 cups cubed squash (from a 2-lb squash)`: a whole-item *weight*, not a count; A3 speaks only of counts.
- **Proposed wording (add):** "Prepared = cut, chopped, sliced, diced, grated, shredded, mashed, cubed, peeled, cored
  or pitted pieces of the same food (`diced mango`, `mashed avocado`, `chopped parsley (1 bunch)`). Extracted = juice,
  zest, peel, pulp, purée, seeds, kernels, picked leaves, or meat taken off bones. The source may be a count or a
  weight of whole items. Drained/undrained, cooked, soaked and rehydrated are other states."
- **Note on A3's own example** `2 cups diced tomatoes (about 3 tomatoes)`: the remark shows fresh tomatoes diced,
  while the labelling guide lists `diced tomatoes` as a product form (canned). Accept `tomatoes` + note `diced` for
  such lines.

---

## 5. A4 `and` without a comma: **AMBIGUOUS**

- **Consistency:**
  - Frozen compounds stay one name: dev-0006, dev-0007, h2-0259 `half-and-half`, and h2-0104 `salt and vinegar
    potato chips`. h2-0104 is consistent with A4, but it is missing from the A4 list.
  - Prep "and" after a comma stays in the note (dev-0042, h2-0010, h2-0154 …).
  - "and" between amounts is a compound or range (h2-0126, h2-0277).
  - No frozen contradiction.
- **Borderline inputs:**
  1. *Products named with "and":* `peas and carrots` (a frozen product), `pork and beans`, `bread and butter pickles`,
     `sour cream and onion dip`, `cookies and cream ice cream`, `ginger and garlic paste`, `salt and vinegar chips`.
  2. *Salt-and-pepper variants with an amount:* `1 tsp kosher salt and black pepper`, `1/2 tsp sea salt and freshly
     ground pepper`. Frozen h2-0199, hold-0119, h2-0347 and h2-0348 treat these pairs as one name, but only without an
     amount.
  3. *`and` between variety modifiers:* `3 red and yellow bell peppers` (A4 → list, needs_review) vs frozen h2-0268
     `3 bell peppers (red, yellow, and orange)` → ready, colours in the note. The same meaning gets a different status.
  4. *`each`:* `1/2 tsp each salt and pepper` must stay a list although `salt and pepper` is a listed compound. Say
     that `each` overrides the compound.
  5. *Label content:* name null and alternatives `[]` means the label records no food at all. Consider accepting the
     whole phrase as `name` (as read).
- **Proposed wording (add):** "`A and B H`, where the pair modifies a following head noun (chips, dip, soup, sauce,
  seasoning, dressing, paste, pickles, ice cream), is one name. A bare `A and B` is a list except the fixed compounds:
  `salt and pepper` and its variants (`kosher salt and black pepper`), `half-and-half`, `macaroni and cheese`, `pork
  and beans`, and [debatable, not firm labels] `peas and carrots`. Colour or variety words joined by `and` before one
  head (`red and yellow bell peppers`) describe one purchase: `ready`, words to `note` (as h2-0268). `each` always
  makes a list. List lines: strict `name` null; the phrase as read is accepted."

---

## 6. Rest of §12 as it now stands

My earlier proposals are adopted in items 1–5, 7–10 and 12–14. The cited frozen ids are correct:
- dev-0054, hold-0033, h2-0215
- dev-0055, hold-0034, h2-0225
- h2-0216, dev-0050
- dev-0047, dev-0049, hold-0028, h2-0231, h2-0234
- dev-0182
- h2-0040, h2-0041, h2-0151, h2-0145, h2-0150, h2-0045
- dev-0154, hold-0005, dev-0020, dev-0153
- h2-0087, dev-0112
- dev-0046, h2-0265, h2-0273
- h2-0061

The intro's claim that every item is consistent with the frozen labels holds, as far as I can check. New small
points:

1. **Item 13 vs the package form (§7.4).** "Any space between a 1–3-digit group and a 3-digit group is a thousands
   separator" also catches `2 400 g cans tomatoes` and `1 400g tin chickpeas`. These are the UK equivalent of
   `2 15-oz cans`; under item 13 they become "2400 g" → needs_review. No frozen line has this form.
   Add: "…unless a unit and a container follow (`2 400 g cans` → 2 `can`, packageSize 400 g)."
2. **Item 5 vs item 3.** Item 5 sends `6 oz cup yogurt` to item 3, but item 3's container list does not include
   `cup`. Add "`cup` when item 5 applies".
3. **Regression label.** In my workspace copy of `coordinator-labels.tsv`, `1 tbsp Dijon or whole grain mustard`
   still has strict `Dijon mustard;whole grain mustard`. Item 7(b) now makes the as-written reading strict. Swap it.
4. **Probe file.** `4 kaffir lime leaves` and `1 lb fresh or frozen cranberries` still contradict items 4 and 7(c).
   This is unchanged from my first review.
