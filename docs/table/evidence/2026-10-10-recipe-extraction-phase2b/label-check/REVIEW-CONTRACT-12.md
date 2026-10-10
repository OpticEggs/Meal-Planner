# Review of CONTRACT-v1 §12 (Phase 2B interpretations): label checker R2

Date: 2026-10-10. Reviewer: label checker R2 (read-only, independent of every engine).

**What I read:** `CONTRACT-v1.md` (§1–§12), `fixtures/README.md`, `fixtures/ingredients/{dev,holdout,holdout-v2}.jsonl`
(182 + 128 + 359 frozen cases), `regressions/coordinator-labels.tsv` (all 119 lines) and
`regressions/final-head-reviewer-probes.tsv` (748 lines: a formal stratified sample of 60, plus a read-through of the rest).

**What I did not do:** I read no engine source, test, benchmark report or engine output. I ran nothing except
Python one-liners over the files in this workspace, using exact US-customary bases: cup 236.5882365 ml,
tbsp 14.78676478125 ml, tsp 4.92892159375 ml, fl oz 29.5735295625 ml, oz 28.349523125 g, lb 453.59237 g. I cannot
see `UNIT_REGISTRY`, so wherever a verdict depends on which count units exist (`leaf`, `cube`, `sheet`, `inch`,
`sleeve`, `tin`), I say so.

Verdict scale: **OK**, **AMBIGUOUS** (with proposed wording), **CONFLICT** (with evidence).

---

## 0. Summary of verdicts

| § | Topic | Verdict | Tag honest? | Main issue |
|---|---|---|---|---|
| 12.1 | Hyphenated fraction word + unit | OK (minor wording) | yes | Unhyphenated `a quarter cup`, plural `2 half-cups`, `2 quarter-pound patties` not covered |
| 12.2 | Multiplier `x` | **CONFLICT** + AMBIGUOUS | partly restated (h2-0101, h2-0253, README) | `10X sugar` fits both §12.2 (count 10) and §12.9 (name); `N x M-inch` + food vs pan |
| 12.3 | Package size with no count | AMBIGUOUS | yes | Which nouns are containers; `canned` ≠ can; exact note text; tolerance for a restated package |
| 12.4 | Count noun after the food | AMBIGUOUS | yes | "Sold under that name" also fits `cinnamon sticks`, `cardamom pods`, `sugar cubes`; `whole cloves`; depends on the registry |
| 12.5 | Container "cups" | OK | **no**: README and h2-0087 already state it, so it is restated | `3 cups (5.3 oz each)`, `3 5.3-oz cups` |
| 12.6 | 7 % restatement tolerance | AMBIGUOUS (+ cooking sense) | yes | Base and boundary unspecified; Canadian/UK metric conventions fail 7 % |
| 12.7 | Choices | **CONFLICT** | **no**: (a) changes the frozen convention for a shared leading modifier | (a) contradicts dev-0055, hold-0034, h2-0225; the "names a food on its own" test sends `lemon or lime juice` to (a); (d) contradicts sourcing notes |
| 12.8 | Non-ingredient lines | **CONFLICT** + AMBIGUOUS | yes | Literal text makes dev-0182 `Sugar: 1/2 cup` nutrition; heading vs bare food (`Pesto`, `Garnish`, `Dressing`) |
| 12.9 | Numbers that name the food | AMBIGUOUS | yes | Clause also fits `Twelve cherry tomatoes` (h2-0045, ready 12); digits; `#10 can` |
| 12.10 | Size words → note | AMBIGUOUS (minor) | yes | `small curd`, `medium-grain`, `medium salsa`, `petite`, `mini` |
| 12.11 | Second amounts in remarks | AMBIGUOUS (minor) | yes | Restatement vs source (`(1 lime)` vs `(from 1 lime)`); clash with 12.12 on `, plus 2 tbsp for dusting` |
| 12.12 | Same-dimension compounds | OK (minor gaps) | yes | `minus`/`less`; and-lists of different foods |
| 12.13 | Decoration and spacing | AMBIGUOUS (minor) | partly restated (dev-0154, h2-0261, dev-0153) | Numbered markers `1.` `1)` `a)`; `-1 cup`; `1 000 g` |

Regression labels:
- `coordinator-labels.tsv`: 119 lines checked. 2 labels I would write differently (both strict-vs-accepted or
  accept-set only). 2 more labels I agree with but cannot derive from §7/§12 (a rule is missing).
- `final-head-reviewer-probes.tsv`: 0/60 disagreements in the stratified sample (Wilson 95 % CI 0–6.0 %). The
  read-through outside the sample found 16 lines I would label differently; 3 of them affect status or core
  fields against explicit §12/guide text (§3.3 A).

---

## 1. Per-item review

### §12.1 Fraction word hyphenated to a unit: **OK** (minor additions)

- **Consistency:** Extends §7.1 (`half`/`half a` = 1/2). Agrees with hold-0088 `half a cup of milk`, h2-0050
  `half a teaspoon of ground turmeric`, h2-0049 `half an onion` and dev-0131. No frozen case has `a half-cup`, so
  the "(new)" tag is honest.
- **Cooking sense:** Correct.
- **Ambiguity:** Two careful labellers can still differ on:
  - `a quarter cup sugar` / `a third cup oil` (no hyphen). §7.1 lists `half` but not `quarter`/`third`, so a strict
    labeller could write `needs_review`. The probes label these 1/4 and 1/3 cup.
  - `2 half-cups milk`. Does the count multiply (= 1 cup)?
  - `2 quarter-pound beef patties` / `a half-pound burger`. Here the fraction-unit sizes a counted item; it is not
    the amount of beef.
  - `a half-gallon carton milk`. Is this a container?
  - `a half-and-half` / `1 cup half-and-half`. This is a food, not a fraction (unaffected because it is not hyphenated
    to a unit, but worth saying).
  - `a half-dozen eggs` → 6 `each`.
- **Proposed wording:** "A fraction word (`half`, `third`, `quarter`, `three-quarter(s)`, `two-thirds`,
  `one-half`, `one-quarter`) before a unit, hyphenated or not, with or without a leading `a`/`one`/`1`, is the
  amount; the article or `1` does not multiply it. A count of ≥ 2 before a plural fraction-unit multiplies it
  (`2 half-cups` → 1 `cup`). When the fraction-unit sizes a counted item, the count is the quantity and the size is a
  note (`2 quarter-pound patties` → 2 `each`, note `quarter-pound`); before a container it is the packageSize
  (`a half-gallon carton` → 1 `carton`, packageSize 1/2 `gallon`). `half-dozen` = 6 `each`. `half-and-half` is a food."

### §12.2 Multiplier `x` / `×`: **CONFLICT** with §12.9, and **AMBIGUOUS**

- **Consistency:** Agrees with h2-0101 `2 x 400 g cans chopped tomatoes` (2 `can`, packageSize 400 g), h2-0253
  `eggs x 3` (3 `each`) and h2-0299 `Equipment: 9x13-inch baking dish` (unsupported). The README already says
  "`2 x 400 g cans` is package-size form 1". So the tag should be *(restated + new)*: only `1x cup`, `2x cans` and
  `1 x can` are new.
- **CONFLICT:** `10X sugar` (listed in §12.9 as a name) is literally "a count before `x` and a food". `1/2 cup 10X
  sugar` is safe because the line has another amount. A bare `10X sugar`, `10X powdered sugar` or `4X sugar`
  triggers both items, and §12.2 would fabricate a quantity of 10. The same happens with `6X sugar`.
- **Ambiguity:**
  - `9 x 13-inch pan` and `2 x 13-inch pizza bases` have the same surface form `N x M-inch`, and N carries no unit in
    either. "Between two lengths" does not separate them.
  - `4 x 4-inch squares puff pastry`: is this a size or 4 squares?
  - A widget line `1x 2x 3x` (recipe-scaling buttons) would be read as three multipliers.
  - `eggs (x3)` / `x3 eggs`: unspecified.
- **Proposed wording (add):** "(i) `NX`/`Nx` directly followed by `sugar` or `powdered sugar` is a sugar grade
  (§12.9), never a multiplier; §12.9 takes precedence. (ii) `N x M-<length>` / `NxM` followed by a singular noun is
  a size (`9 x 13-inch pan`, `9x13 sheet cake`); followed by a plural food it is a count, and the length is a note
  (`2 x 13-inch pizza bases` → 2 `each`, note `13-inch`). (iii) A line that is only scaling controls (`1x 2x 3x`) is
  page furniture (§12.8). (iv) `xN` and `(xN)` after the food are the same as `x N`."

### §12.3 Package size with no count: **AMBIGUOUS**

- **Consistency:** No frozen line has a bare size before a container. The closest cases carry an article: h2-0058
  `a 15-oz can of tomato sauce` (1 `can`, 15 oz), h2-0059 `a 14-ounce block extra-firm tofu` (1 `block`, 14 oz),
  dev-0091 `1 15-oz can`. These are consistent with the rule. Tag honest.
- **Tension (minor):** "Puts the restated size in `note`" conflicts with the README sentence "a note never holds an
  amount". That sentence was written about amount-after-the-food lines; §2 says only "never *the* amount".
  Recommend changing the README to "never holds the line's amount".
- **Ambiguity:**
  1. *Which nouns are containers?* The text gives can, package and the plural "cans". Frozen labels already treat
     `block` as one (h2-0059), and the probes treat `loaf` as one (`1 (1 lb) loaf French bread`). Undecided:
     `6 oz salmon fillet`, `3 lb whole chicken`, `4 oz piece Parmesan`, `2 lb head cabbage`, `8 oz ball fresh
     mozzarella`, `8 oz wedge brie`, `4 oz log goat cheese`, `1 lb loaf bread`.
  2. *Product-form adjective vs container:* `28 oz canned tomatoes` / `400 g tinned tomatoes` / `16 oz jarred
     salsa` must stay 28 oz etc. A hurried labeller may invent a can.
  3. *Exact note text:* the scorer compares a token bag and ignores `() , ; :`, but not `/` or glued units. For
     `400g/14oz can`, is the note `14oz` or `14 oz`? These score as different tokens.
  4. *Restated package outside tolerance:* `400 g (16 oz) can` (13.4 % off) or `400 g (15 oz) can` (6.3 %). Is it
     still a restatement (→ note) or a second size (→ `needs_review`)? §12.6 speaks only of the line's amount.
  5. *Restatement after the container:* `400 g can (14 oz) tomatoes`. The coordinator labels it as a package
     restatement, but §12.3 lists only the positions before the container.
- **Proposed wording (add):** "Containers are can, tin, jar, bottle, carton, box, bag, package/pack/pkg, packet,
  envelope, container/tub, tube, block, bar[, loaf] (the registry's packaging count units). A size before any other
  noun (`6 oz salmon fillet`, `3 lb whole chicken`, `4 oz piece Parmesan`) is the line's amount, and the noun stays in
  `name`. `canned`/`tinned`/`jarred`/`bottled`/`boxed` are product-form words, not containers. A restated package
  size, before or after the container, goes to `note` as written, without its parentheses or `/` (`400g/14oz can` →
  note `14oz`). It is a restatement only within the §12.6 tolerance; otherwise the line is `needs_review`."

### §12.4 Count noun after the food: **AMBIGUOUS** (the exception list is not an operational test)

- **Consistency:** Frozen labels agree:
  - Unit read from the post-food noun: dev-0087 / h2-0064 / h2-0156 (`garlic cloves` → `clove`), h2-0065 (`celery
    ribs` → `rib`), h2-0054 (`cardamom pods` → `pod`), h2-0072 (`star anise pods` → `pod`), h2-0079 (`anchovy
    fillets` → `fillet`), h2-0071 (`sausage links` → `link`).
  - Noun kept when there is no amount: hold-0050 `ice cubes`, hold-0052 `basil leaves, torn`, h2-0190 `lime wedges,
    to serve`.
  - Noun kept when another unit is stated: h2-0170, h2-0267 (`… basil leaves`), h2-0033 (`1 ¾ lb skinless salmon
    fillet`).
  - Tag honest.
- **Ambiguity:**
  1. *The test.* "The thing being sold under that name" is equally true of `cinnamon sticks`, which §12.4 itself
     reads as unit `stick` (a jar labelled "Cinnamon Sticks"). It is also true of `cardamom pods` (frozen as unit
     `pod`), `sugar cubes`, `bouillon cubes`, `stock cubes`, `lasagna sheets`, `gelatin sheets`, `nori sheets`,
     `pickle spears`, `apple rings` and `pandan leaves`. Two careful labellers will split on every one of these.
  2. *Registry dependence.* Whether `leaf`, `cube`, `sheet`, `spear` and `ring` are count units decides
     `8 basil leaves`, `10 mint leaves`, `2 sugar cubes` and `6 lasagna sheets`. The item names no unit list.
  3. *`cloves` as the spice:* `6 whole cloves` literally becomes 6 `clove` of "whole", and a bare `10 cloves` is
     ambiguous. (hold-0007 `ground cloves` already shows the spice sense.)
  4. *Pre- vs post-food consistency:* the probes label `2 cubes of sugar` as 2 `cube` sugar. `2 sugar cubes` is
     undecided, and `ice cubes` is listed as identity even though ice by the cube is still ice.
  5. *Post-food nouns that are not units* (`chicken thighs`, `breasts`, `drumsticks`, `pork chops`, `salmon
     steaks`): frozen labels keep them in `name` (dev-0046, h2-0265, h2-0273). Fine, but say so.
- **Proposed wording:** "A count noun written after the food is the unit when the words before it, bought by that
  unit, are the product meant: garlic by the clove, celery by the rib, lemon by the wedge, cinnamon by the stick,
  cardamom by the pod, anchovy by the fillet, bacon by the strip. It stays in `name` (unit `each`) when the words
  before it alone name a different product or none: `fish`/`mozzarella`/`bread` sticks, `bay`/`curry`/`banana`/
  `grape`/`makrut lime`/`kaffir lime`/`pandan` leaves, `lasagna` sheets, `stock`/`bouillon` cubes. For `ice cubes`
  and `sugar cubes`, accept both readings. `cloves` with no food word before it, or after `whole`/`ground`, is the
  spice (`6 whole cloves` → 6 `each` `whole cloves`). This applies only to the registry's count units [list them];
  any other post-food noun (`thighs`, `breasts`, `chops`, `steaks`, `noodles`) stays in `name` with `each`."

### §12.5 Container "cups": **OK**; tag should be *(restated)*

- **Consistency:** The README's holdout-v2 readings already state "a container written with a unit word
  (`3 (5.3 oz) cups … yogurt`) is a `container`". h2-0087 is exactly that line (3 `container`, 53/10 oz). dev-0112
  `1 cup (8 oz) sour cream` (a measuring cup with an equivalent) is consistent with "between a count and cups". The
  "(new)" tag is inaccurate.
- **Minor ambiguity:**
  - `3 cups (5.3 oz each) Greek yogurt`: "each" marks containers, as in §7.4's `2 cans (15 oz each)`.
  - `3 5.3-oz cups yogurt`: unparenthesized, like `1 15-oz can`.
  - `6 oz cup yogurt`: no count, so §12.3 applies, but is a cup a container there?
  - Proposed: "…also `N cups (S each)` and `N S-unit cups`; with no count, `S cup <food>` is one container (§12.3)."

### §12.6 Restatement tolerance 7 %: **AMBIGUOUS**, with a cooking-sense concern

- **Consistency:** All 19 frozen same-dimension restatements are within 5.67 %, so no frozen label is contradicted:
  - dev-0108 1.44 %
  - dev-0109 / dev-0110 0.8 %
  - dev-0111 5.36 %
  - hold-0075 1.44 %
  - hold-0078 5.36 %
  - h2-0114, h2-0116, h2-0117, h2-0119 ≤ 0.8 %
  - h2-0131 / h2-0135 1.44 %
  - h2-0138 0.2 %
  - h2-0139 1.4 %
  - h2-0140 5.67 % and 4.17 %
  - h2-0141 0 %
  - h2-0142 4.9 %

  §12.6's own examples: `1/3 cup (5 tbsp)` is 6.25 % (6.67 % measured against 5 tbsp), `17 fl oz` vs 2 cups is
  6.25 %, `1 cup (250 ml)` is 5.67 %. Tag honest.
- **Ambiguity:**
  1. *Base.* "Within 7 % of it" (the first-stated amount) vs. of the restated amount vs. of the larger one. These
     give different labels: `1 lb (423 g)` is 6.74 % of the first amount (ready) but 7.23 % of the restated amount
     (`needs_review`); `1/3 cup (5 tbsp)` is 6.25 % vs 6.67 %.
  2. *Boundary:* inclusive or exclusive. `1 cup (220 ml)` = 7.01 %.
  3. *Which cup/tbsp/pint.* With the US customary cup, `1 cup (255 ml)` is 7.78 % (`needs_review`); with the 240 ml
     legal cup it is 6.25 % (ready); with the metric cup, 2 %. Labellers must use one base, presumably
     `UNIT_REGISTRY.base`. Say so and print the values.
  4. *`about` inside the restatement.* Does `1 lb (about 500 g)` get a wider tolerance? (The README says `about`
     qualifies only the equivalent.)
  5. *Several restatements* (`2 cups (500 ml / 17 fl oz)`): must each pass?
  6. *Package restatements* (§12.3) and *count restatements* (`1 cup (1 stick) butter`, which is wrong because a
     stick is 1/2 cup): checked or not?
- **Cooking sense:** 7 % turns the standard published metric conventions into "second amounts":

  | Line | Deviation |
  |---|---|
  | `1/4 tsp (1 ml)` | 18.9 % |
  | `1/2 tsp (2 ml)` | 18.9 % |
  | `3/4 tsp (4 ml)` | 8.2 % |
  | `8 oz (250 g)` | 10.2 % |
  | `1 lb (500 g)` | 10.2 % |
  | `2 lb (1 kg)` | 10.2 % |
  | `4 oz (125 g)` | 10.2 % |
  | `1 oz (25 g)` | 11.8 % |
  | `4 oz (100 g)` | 11.8 % |
  | `500 g (1 lb)` | 9.3 % |

  A careful cook reads every one of these as a restatement. `needs_review` is not false certainty, so this is safe,
  but it will inflate unnecessary review on Canadian/UK/Australian pages. Real non-US units (`1 tbsp (20 ml)` =
  35 %, `1 pint (570 ml)` = 20 %) are correctly caught.
- **Proposed wording:** "Compare exactly, in the `UNIT_REGISTRY` base units (cup 236.5882365 ml, tbsp 14.78676478125
  ml, tsp 4.92892159375 ml, fl oz 29.5735295625 ml, US pint/quart/gallon; oz 28.349523125 g, lb 453.59237 g). A
  restatement holds when |restated − first| ≤ 7/100 × first (first-stated amount as the base, boundary inclusive),
  **or** when the restated number equals the exact conversion rounded to a whole number of the restated unit
  (`1/4 tsp (1 ml)`, `1/2 tsp (2 ml)`, `3/4 tsp (4 ml)`). Each restatement in the line is checked separately; one
  failure makes the line `needs_review`. `about` does not widen the tolerance. A restated package size (§12.3) is
  checked the same way. Count restatements (`stick`, `each`, `envelope`) and mass↔volume restatements are not
  checked." Then decide explicitly, as policy, whether `1 lb (500 g)` / `8 oz (250 g)` / `2 lb (1 kg)` count as
  restatements. I would accept the review cost and keep them `needs_review`, but write it down.

### §12.7 Choices: **CONFLICT** (with three frozen strict labels and with the item's own examples)

- **Support:**
  - (a): dev-0005, dev-0051, dev-0053, hold-0031, hold-0032, h2-0214, h2-0217, h2-0218, h2-0221, h2-0222, h2-0224.
  - (b) as intended: dev-0050, dev-0052, dev-0054, hold-0033, h2-0215, h2-0216, h2-0321.
  - (c): h2-0219.
  - (d)-like: h2-0229 `curry paste (red or green)`.
- **CONFLICT 1, shared leading modifier.** Read literally, (a) ("A names a food on its own → as written") applies to
  `ground beef or turkey`, `dried oregano or thyme` and `chopped parsley or cilantro`. The frozen **strict** labels
  distribute the modifier: dev-0055 `['ground beef','ground turkey']`, hold-0034 `['dried oregano','dried thyme']`,
  h2-0225 `['chopped parsley','chopped cilantro']`. The as-written reading is only *accepted*. §12 claims these frozen
  labels "already follow most of these readings", and the "(restated)" tag hides this reversal.
  **Cooking sense:** the literal (a) loses material qualifiers.
  - `ground beef or turkey` → `turkey` (a whole bird).
  - `dried oregano or thyme` → `thyme`. The guide itself says fresh and dried herbs are different products, and
    they differ about 3:1 in amount.
  - `low-sodium chicken or vegetable broth` → `vegetable broth` without low-sodium.
- **CONFLICT 2, the (a)/(b) criterion.** "A names a food on its own" is literally true of `lemon` (dev-0054 →
  `lemon juice`), `beef` (hold-0033 → `beef stock`), `chicken` (dev-0052, h2-0321 → `chicken broth`) and of
  `hamburger`/`hot dog` in the item's own (b) example `hamburger or hot dog buns`. A literal labeller writes
  `[lemon, lime juice]`, which is a merged or invented option. The coordinator's own lines show the test is not
  operational: strict `[feta; goat cheese]` (as written) but strict `[Dijon mustard; whole grain mustard]`
  (distributed). Feta and Dijon each already name a product of the same kind.
- **CONFLICT 3, (d) vs sourcing/form remarks.** "`X, A or B` where A and B qualify X → expanded" literally expands
  `corn kernels, fresh or frozen` (dev-0047), `cherries, fresh or frozen` (hold-0028), `blackberries, fresh or
  thawed frozen` (h2-0231), `corn, canned or frozen` (h2-0234), `salsa, homemade or store-bought` (dev-0049) and
  hold-0030. All of these are frozen as **notes**, per §7.8. (d) needs §7.8's exception written into it.
- **Gaps:**
  - Forward head sharing: `whole milk or 2%`, `fresh thyme (or 1 tsp dried)`.
  - (b) combined with (c): `chicken, beef, or vegetable broth`. Literal (c) gives `[chicken, beef, vegetable broth]`,
    a cooking-sense error.
  - (d) with hyponyms: `nuts, pecans or walnuts` would expand to "pecans nuts"; `greens, such as kale or chard`.
  - `A/B`, `and/or` (probes: `1 cup milk/cream` → alts).
  - Options with their own amounts: `1 tsp dried thyme or 1 tbsp fresh thyme`, `1 egg or 2 egg whites`. Which
    quantity?
  - And-lists of different foods sharing one amount (`1 cup carrots, celery and onion`) currently fall to §7.7
    (name `carrots`, note `celery and onion`, ready). That is false certainty; they should be `needs_review`.
- **Proposed wording:**
  - (a) Options are as written, except where (b)–(e) share words.
  - (b) **Shared trailing head:** `M1 or M2 H` → `[M1 H, M2 H]` when M1 alone is *not* a product of H's kind
    (`lemon`/`lime` juice, `chicken`/`vegetable` broth, `beef`/`chicken` stock, `white`/`yellow` miso,
    `hamburger`/`hot dog` buns, `fresh`/`frozen` peas, `red`/`white` wine). When M1 alone already names a product of
    that kind (`feta or goat cheese`, `Dijon or whole grain mustard`, `sriracha or hot sauce`, `cumin or chili
    powder`), strict = as written and `[M1 H, M2 H]` is always accepted.
  - (c) **Shared leading modifier:** `P A or B`, where P is a product-form, variety or preparation word (ground,
    dried, fresh, frozen, smoked, low-sodium, unsalted, chopped, shredded…) and B is a bare food of A's kind →
    strict `[P A, P B]`, accepted `[P A, B]`, as in the frozen labels. Not shared when B carries its own modifier
    (`ground beef or smoked turkey`).
  - (d) **Forward head:** `A-phrase or M` where M is only a modifier → `[A, M + A's head]` (`whole milk or 2%`).
  - (e) **Lists** `A, B, or C`, `A or B or C`, `A/B`, `A and/or B` → all options, with (b)–(d) applied across the
    list.
  - (f) `X, A or B` → `[A X, B X]` only when A and B are varieties or types of X (chicken/vegetable broth,
    all-purpose/bread flour, white/brown sugar, creamy/chunky peanut butter, mild/hot salsa). Sourcing and form
    words (fresh, frozen, thawed, canned, jarred, boxed, homemade, store-bought) stay a note (§7.8). When A and B
    are kinds of X (`nuts, pecans or walnuts`) → `[A, B]`.
  - Options with their own amounts → `quantity`/`unit` = [decide: null, or the first option's].
  - All of these → `needs_review`, `name` null. Different foods joined by `and` with one amount → `needs_review`.

### §12.8 Non-ingredient lines: **CONFLICT** (dev-0182) and **AMBIGUOUS**

- **Support:**
  - Headings/instructions: dev-0143–0147, hold-0097–0100, h2-0284–0302.
  - Metadata: h2-0295 `Makes 12 muffins`, h2-0296 `Serves 4`, h2-0297 `Step 2`, h2-0299 `Equipment: …`,
    h2-0294 `Note: …`.
  - Tag honest.
- **CONFLICT:** dev-0182 `Sugar: 1/2 cup` is frozen as an ingredient (ready, label-first form, as are hold-0128
  `Pecans: 1 cup` and h2-0249 `Unsalted butter: 2 tbsp`). §12.8's literal definition, "a nutrient … label with an
  amount", covers it, because sugar is a nutrient. The same goes for `Salt: 1 tsp`, `Fat: 2 tbsp`, `Sugar 10g` and
  `Salt: 1.2 g` (UK labels list salt as a nutrient). The probes label `Sugar 10g` and `Salt: 1.2 g` unsupported (D).
- **Ambiguity, heading vs ingredient with no amount.**
  - The frozen labels show that letter case is not the criterion: `Cake Layers` (h2-0288, unsupported) is Title
    Case, and so are `Lemon zest` (h2-0206) and `Pickled jalapeños (from a jar)` (h2-0208), both `needs_review`.
  - Undecided:
    - `Pesto`, `PESTO`, `Salsa verde`, `Whipped cream`, `Pie Crust`, `Pizza Dough`, `Simple Syrup`, `Croutons`,
      `Frosting`, `Gravy` (all can be bought).
    - `Garnish`, `Dressing`, `Toppings` (generic).
    - `Garnish: chopped parsley`, `To serve: lime wedges`, `Topping: 1 cup whipped cream` (role label + food; compare
      hold-0042 `Optional: 2 tbsp …`, which is an ingredient).
    - Equipment with no `You will need:` lead-in: `2 baking sheets`, `Parchment paper`, `8 wooden skewers`.
- **Proposed wording:**
  - "Nutrition: a nutrient name followed by an amount in g, mg, mcg/µg, kcal, kJ, Cal, IU or %, or `Calories` with a
    bare number. `Sugar`/`Salt`/`Fat`/`Starch` followed by `g` are uncertain → `needs_review`. Followed by a kitchen
    unit (cup, tbsp, tsp, pinch), it is an ingredient (dev-0182)."
  - "Headings: a line with no amount is a heading when it ends with `:`, starts with `For (the)`, or consists only of
    generic component words (sauce, dressing, glaze, topping(s), filling, frosting, icing, crust, dough, batter,
    marinade, garnish, base, layer(s), assembly, to serve), optionally after a dish word (`Cake Layers`, `Pie Crust`,
    `Pizza Dough`), in any case. A specific food with no amount (`Pesto`, `Hummus`, `Whipped cream`, `Croutons`) is an
    ingredient → `needs_review` (`quantity_missing`). [Optional: a line entirely in capitals with no digits is a
    heading.]"
  - "A role label followed by a food (`Garnish: chopped parsley`, `To serve: lime wedges`) is an ingredient, with
    `for_garnish`/`for_serving`."
  - "A non-food item (pan, baking sheet, skewers, parchment, foil, twine, liners, piping bag) is unsupported with or
    without `You will need:`."

### §12.9 Numbers that name the food: **AMBIGUOUS**

- **Consistency:**
  - Restated part: h2-0040 `5-spice powder`, h2-0041 `00 flour`, h2-0151 `93/7 ground turkey`, h2-0145
    `2% reduced-fat milk`, h2-0147 `85% cacao`. Note that h2-0150 `ground pork (80/20)` puts the ratio in **note**,
    because it is parenthesized; §12.9 should say that §7.6/7.7 still apply.
  - New part: "a number word that begins a product name with nothing else marking it as an amount" is literally met
    by h2-0045 `Twelve cherry tomatoes` (frozen ready, 12 `each`) and by h2-0042–0044 (`two eggs`, `three medium
    leeks`, `four cups water`). "Begins a product name" is the whole decision, and it is not defined.
- **Other gaps:**
  - Digits at line start with no other amount: `7 grain cereal`, `5 spice powder`, `80/20 ground beef`, `00 flour`.
    A labeller could write 7 `each` "grain cereal", a fabricated amount.
  - Can-size designations: `1 #10 can tomatoes`, `No. 2 can`.
  - `2 cheese pizzas` vs `Two cheese pizza`.
  - Precedence over §12.2 (`10X sugar`).
- **Proposed wording:** "A number (word or digits ≥ 2) followed by a singular noun that, with the number, forms the
  product name, counting the product's components rather than the product (`five spice powder`, `5 spice powder`,
  `three cheese blend`, `seven grain bread`, `7 grain cereal`, `three-bean salad`, `four cheese pizza`), is part of
  `name`. Test: the head noun of the food phrase is singular or a mass noun. A plural head (`twelve cherry tomatoes`,
  `2 cheese pizzas`) makes the number a count. With no other amount → `needs_review` (`quantity_missing`), full name
  kept. Ratios and percentages in parentheses go to `note` (h2-0150). `#10`/`No. 2` can sizes go to `note`. §12.9
  takes precedence over §12.2."

### §12.10 Size words → note: **AMBIGUOUS** (minor)

- **Consistency:** dev-0158–0160, hold-0039, hold-0109–0111, h2-0043, h2-0074, h2-0075, h2-0164, h2-0178,
  h2-0179, h2-0239–0241, h2-0244. Tag honest.
- **Ambiguity:** Read literally, "size words → note" strips:
  - `small curd cottage cheese` (the probes keep it in the name, correctly);
  - `large-curd`, `medium-grain rice`, `large-flake oats`, `jumbo pasta shells`, `petite diced tomatoes`,
    `mini marshmallows` (probe D);
  - `medium salsa`, where "medium" is heat, not size.
- **Proposed wording:** "Size words (small, medium, large, extra-large, jumbo, colossal, big, little, giant and the
  abbreviations lg/med/sm) go to `note` when they size the counted or weighed item. They stay in `name` when part of
  a product term (`small curd`, `large-curd`, `medium-grain`, `long-grain`, `large-flake`, `petite diced`, `mini`,
  `baby`, `jumbo shells`) or when they state a heat or grade (`medium salsa`)."

### §12.11 Second amounts in remarks: **AMBIGUOUS** (minor), plus an interaction with §12.12

- **Consistency:** README, h2-0165 `(from 1/3 cup dry)` and h2-0338 `(1 cup dry makes 3 cooked)` → `needs_review`.
  Tag honest.
- **Ambiguity:**
  - What separates a restatement from a second amount? The probes treat `1 cup chopped onion (1 medium)` and
    `1 lb carrots (about 6 medium)` as restatements (ready, count equivalent), but `2 tbsp lime juice (from 1 lime)`
    as a second amount. Undecided: `2 tbsp lime juice (1 lime)`, `(juice of 1 lime)`, `(use half for table salt)`.
    The probes label the last one ready, although their own `1 tsp salt (or 1/2 tsp table salt)` is
    `needs_review`.
  - **Interaction with §12.12:** `1 cup flour, plus 2 tablespoons for dusting`. By §7.7 the text after the comma is a
    remark that holds a second amount, so §12.11 gives `needs_review`. §12.12 (same food, same dimension, summed)
    gives 18 `tbsp`, ready, which is what the probes label (D).
- **Proposed wording:** "A remark amount restates (→ `equivalents`, §12.6) when it measures the same food in the
  same state, optionally with about/approx./each, or is a breakdown summing to the amount (`(2 tbsp + 1 tbsp)`). It
  is a second amount (→ `needs_review`, remark in `note`) when it measures a source, another state or another food
  (`from`, `makes`, `yields`, `dry`/`uncooked` vs `cooked`; `(1 lime)` for lime juice) or a substitution (`use half
  for table salt`). A same-food, same-dimension amount after `plus`/`+`, even after a comma, is [decide one: summed
  per §12.12 with only the purpose words in `note` / a remark → `needs_review`]." I would choose *summed*: the cook
  buys the total.

### §12.12 Same-dimension compounds: **OK** (minor gaps)

- **Consistency:** dev-0102–0106, hold-0071–0074, h2-0120–0130 (including h2-0127 → 3 `pint`, h2-0121 → 1250 g).
  §12.12's own examples check out: 1 lb 2 oz = 510.29 g, so the equivalent 510 g is within 0.06 %. Tag honest.
- **Gaps:** `1 cup minus 2 tbsp` / `1 cup less 1 tbsp` (subtract → 14 `tbsp`?). The and-list of different foods
  covered under §12.7.

### §12.13 Decoration and spacing: **AMBIGUOUS** (minor); tag partly restated

- **Consistency:**
  - Already in frozen labels: dev-0154 / h2-0261 `•`, hold-0005 / h2-0262 `*`, dev-0020 `-`, h2-0302 `•` alone →
    unsupported, NBSP dev-0153 / h2-0020 / h2-0098 (§7.14), fullwidth digit h2-0019. So: *(restated + new)*.
  - `▢`, `☐`, thin/tab spaces and combining accents are new.
- **Ambiguity:**
  - Enumerators `1. 2 cups flour`, `1) 1/2 cup milk`, `10. 1 tsp vanilla`, `a) 1 cup rice`, and `✓ 1 egg`. The probes
    read these as decoration (I agree), but §12.13 does not cover them, and `10. 1 tsp` could be read as two amounts.
  - Glued `-1 cup sugar`: decoration or negative (→ `needs_review` per §7.1)?
  - A thin space or NNBSP thousands separator `1 000 g` / `1 000 g`: "thin spaces are spaces" makes it look like
    two numbers; it should be ambiguous like `1,000`.
- **Proposed wording:** "Leading bullets (`•` `◦` `▪` `-` `–` `*` `▢` `☐` `✓` `✔`) and enumerators (`N.`, `N)`, `a)`,
  `a.`), each followed by a space, are decoration. A hyphen glued to a number is [decoration / negative → decide]. A
  space of any kind between a 1–3-digit group and a 3-digit group (`1 000 g`) is a thousands separator → ambiguous
  (`needs_review`), like `1,000`. Names are recorded in NFC."

---

## 2. Cooking-sense findings (where an item makes a careful cook's reading worse)

1. **§12.7(a), literal:** drops material qualifiers (`ground`, `dried`, `low-sodium`) from the second option, and
   via the "names a food on its own" test, produces `lemon` (fruit) instead of `lemon juice`. It also merges
   options, e.g. `[chicken, beef, vegetable broth]` from a comma list with a shared head.
2. **§12.2 vs §12.9:** a bare `10X sugar` gets a fabricated count of 10.
3. **§12.10, literal:** strips product terms (`small curd`, `medium-grain`, `medium salsa`, `petite`).
4. **§12.6:** classes the standard metric restatements (`1/2 tsp (2 ml)`, `8 oz (250 g)`, `1 lb (500 g)`) as
   conflicting second amounts. This is safe (review, not false certainty) but not how a cook reads them.
5. **§12.8, literal:** turns the frozen ingredient `Sugar: 1/2 cup` into nutrition (an ingredient would be lost).
6. **§12.7(d), literal:** turns sourcing remarks (`, fresh or frozen`) into choices of products.

No item invents a product choice beyond these, and §12.3, §12.4, §12.5 and §12.12 improve on §7.

---

## 3. Regression-label disagreements

### 3.1 `coordinator-labels.tsv` (119 lines, all checked)

48 ready, 48 needs_review, 23 unsupported. 115 agree with §7/§12 as I read them.

| # | Input | Given | Mine | Rule |
|---|---|---|---|---|
| 1 | `1 tbsp Dijon or whole grain mustard` | strict `Dijon mustard;whole grain mustard`, accepted `Dijon;whole grain mustard` (D) | strict `Dijon;whole grain mustard`, accepted `Dijon mustard;whole grain mustard` | §12.7(a) literal ("Dijon" names a mustard on its own). Also needed for symmetry with your own `feta or goat cheese` (strict as written). Accepted set unchanged, so this is scoring-neutral. |
| 2 | `1 tsp cumin or chili powder` | `cumin;chili powder`, no accepted set | same strict; **add** accepted `cumin powder;chili powder` | §12.7(b) is genuinely two-way here: "cumin powder" is an established name, and `cumin` alone could be seeds. |
| 3 | `1 pint milk (UK)` | needs_review | needs_review: **agree**, but §7/§12 do not derive it (a literal labeller writes ready, 1 `pint`, note `UK`) | Missing rule: "a unit qualified as non-US (`UK`, `imperial`, `metric cup`, `Australian tablespoon`) whose size differs from the registry's → `needs_review`". |
| 4 | `1 m sausage` | needs_review | needs_review: **agree**, but no rule covers an unknown unit token or a length unit | Missing rule: "an amount followed by a token that is not a registry unit and not part of the food → `needs_review`". |

Checked and agreed, including all D lines:
- §12.1 family (`1 half-cup butter`).
- §12.2 family (`3x eggs`, `2x 400g tins`).
- §12.3 family, including `400 g can (14 oz) tomatoes`. Agreed by analogy with §7.4, but §12.3 does not list the
  "after the container" position.
- K3/FH-SF2 nutrition and food controls.
- K4 number-word products.
- All R3-S1 / FH-SF4 choices except #1–#2.
- R3-S2 restatements: verified 6.25 %, 6.25 %, 5.67 %/6.25 %, 5.67 %/6.25 %, and the 12.5 %/25 % controls.
- FH-SF3 count nouns, identity controls and their own controls.

### 3.2 `final-head-reviewer-probes.tsv`: stratified spot-check of 60 lines

Method: one line per `group` (the median line of each of the 57 groups), plus the first line of the three largest
groups (`misc`, `package`, `qualifier`). Line numbers are file lines:

> 11, 28, 47, 63, 74, 89, 90, 123, 156, 175, 184, 198, 215, 219, 226, 233, 238, 243, 262, 284, 300, 315, 344,
> 372, 390, 391, 394, 405, 412, 417, 426, 433, 447, 459, 470, 475, 498, 518, 537, 554, 557, 568, 590, 605, 610,
> 626, 642, 653, 664, 673, 683, 691, 697, 704, 720, 735, 741, 743, 744, 747.

| Measure | Result |
|---|---|
| Lines checked | 60 (all 57 groups covered) |
| Status agrees | 60/60 |
| name / qty / unit / pkg / alts agree | 60/60 each |
| **Disagreements** | **0/60** (Wilson 95 % CI 0.0–6.0 %) |
| D-flagged lines in sample | 3 (475, 610, 747): all agree |
| Labels resting on a reading not written in §7/§12 | 3: line 704 `10. 1 tsp vanilla` (numbered marker → §12.13 gap); line 475 `1 tbsp fresh thyme (or 1 tsp dried)` (quantity when options carry their own amounts → §12.7 gap); line 390 `1/2 dozen eggs` = 6 (§7.1 lists only `a dozen`) |
| Agrees only because the probe is sensible where §12 is literal | line 518 `1 cup small curd cottage cheese` (a literal §12.10 strips `small`) |

### 3.3 Additional disagreements found reading the rest of the probe file (outside the sample)

These came from a read-through, not a rigorous per-field audit of all 748 lines.

**A. Against explicit §12 or guide text (status or core fields):**

| Input (line) | Given | Mine | Rule |
|---|---|---|---|
| `4 kaffir lime leaves` (159) | ready, `kaffir lime`, 4 `leaf` (DK) | ready, `kaffir lime leaves`, 4 `each` | §12.4 names `makrut`/`kaffir lime leaves` as identity |
| `1 lb fresh or frozen cranberries` (377) | ready, `cranberries` (D) | needs_review, alts `fresh cranberries;frozen cranberries`, name null | README "`fresh or frozen` before the food → alternatives"; frozen h2-0216 is the same construction; dev-0050 |
| `Sugar 10g` (508); `Salt: 1.2 g` (598) | unsupported (D) | needs_review (name `Sugar`/`Salt`, 10 g / 6/5 g) | §12.8 "uncertain → needs_review"; label-first ingredient dev-0182. See the §12.8 CONFLICT. |
| `2 tsp kosher salt (such as Diamond Crystal; use half for table salt)` (368) | ready | needs_review, note kept | §12.11 (substitution amount "half" in a remark); your own line 469 `1 tsp salt (or 1/2 tsp table salt)` is needs_review |
| `1 cup flour, plus 2 tablespoons for dusting` (392) | ready, 18 `tbsp` (D) | under the current text: needs_review, 1 `cup`, note `plus 2 tablespoons for dusting` | §7.7 + §12.11 vs §12.12. Resolve as proposed in §12.11; if "summed" is adopted, the given label stands. |

**B. packageSize on items that are not containers** (§2 "a container's stated contents", §7.4). This is a rule gap;
all three lines are D-flagged.

| Input (line) | Given | Mine |
|---|---|---|
| `4 (6-oz) salmon fillets` (113) | pkg 6 oz | pkg null, note `6-oz` (as `1 (9-inch) pie crust`) |
| `2 (6 oz) boneless skinless chicken breasts` (384) | pkg 6 oz | pkg null, note `6 oz` |
| `a 3-pound whole chicken` (561) | pkg 3 lb | pkg null, equivalent 3 lb (count 1, so the weight restates the amount, as in h2-0071) |

Recommend a §12 item that decides per-piece weights for fillet/breast/steak/whole bird vs loaf/block/ball.

**C. Strict vs accepted, against the frozen convention** (scoring-neutral, because the other reading is accepted):

| Input (line) | Given strict | Frozen convention strict | Frozen evidence |
|---|---|---|---|
| `1 tbsp chopped parsley or cilantro` (100) | `chopped parsley;cilantro` | `chopped parsley;chopped cilantro` | h2-0225, same construction |
| `Fresh basil or parsley, for garnish` (88) | `fresh basil;parsley` | `fresh basil;fresh parsley` | dev-0055, hold-0034, h2-0225 |
| `1 cup shredded cheddar or Monterey Jack` (94) | `shredded cheddar;Monterey Jack` | `shredded cheddar;shredded Monterey Jack` | dev-0055, hold-0034, h2-0225 |

Note that line 80 `1 lb ground turkey or chicken` distributes the modifier strictly, so the probe file is internally
inconsistent. Which side is "right" depends on how §12.7 is fixed: my proposal keeps the frozen convention.

| Input (line) | Given strict | Mine strict | Evidence |
|---|---|---|---|
| `Juice of 1 lemon` (562) | `lemon juice` | `lemon`, note `juice` | frozen h2-0212 strict `limes` + note `juice` (`lime juice` accepted) |

**D. Accepted-set edits** (low impact):
- `2 bay leaves` (149) and `a couple of bay leaves` (43): drop the accepted name `bay`, because §12.4 says the noun
  stays in `name`.
- `1 cup feta or goat cheese` (483): add the accepted set `feta cheese;goat cheese` (your coordinator file has it).

**Not counted:**
- Line 358 `1 inch ginger, grated` → unit `inch`: reachable only if `inch` is a registry unit, which I cannot see.
  Otherwise I would write needs_review.
- Lines 93, 567, 679 and 475 (sampled) (options carrying their own amounts): quantity is a rule gap.

**Totals for the probe file:** 0/60 in the sample. Outside the sample, 16 lines would be labelled differently:
- 3 against explicit §12/guide text in status or core fields (`kaffir lime leaves`, `fresh or frozen cranberries`,
  `use half for table salt`);
- 3 resolving a §12.8 / §12.11–12 ambiguity (`Sugar 10g`, `Salt: 1.2 g`, `flour, plus 2 tablespoons`);
- 3 packageSize rule-gap lines (B);
- 7 strict-vs-accepted or accepted-set edits (the 4 lines in C and the 3 lines in D), all scoring-neutral.

---

## 4. Recommendations before holdout-v3 is written

1. **Fix §12.7 first.** It is the only item that both contradicts frozen strict labels and degrades the cook's
   reading. Adopt (b)–(f) as proposed, re-tag it "(new criterion; supersedes nothing frozen)", and make the
   coordinator's `feta`/`Dijon` lines symmetric.
2. **§12.8:** add the nutrition-unit test, so that `Sugar: 1/2 cup` stays an ingredient, and add the closed list of
   generic heading words.
3. **§12.2 / §12.9:** add precedence for `NX sugar`, and the singular-head test for number-led product names.
4. **§12.6:** print the base unit values, fix the base (first-stated) and the inclusive boundary, decide the rounding
   allowance, and decide the `1 lb (500 g)` policy.
5. **§12.4 and §12.3:** enumerate the count units and the containers (from `UNIT_REGISTRY`) and state the
   identity test.
6. **Re-tag** §12.2, §12.5 and §12.13 as (partly) restated, and update the README sentence "a note never holds an
   amount".
7. **Probe file:** correct `4 kaffir lime leaves` and `1 lb fresh or frozen cranberries` before reuse; both
   contradict explicit text.
