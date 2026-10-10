# Recipe extraction contract v1 (`recipe-extraction/v1`)

Status: **ratified 2026-10-09** by the integration owner for Phase 1 of the Recipe Extraction Lab.
Types: `src/contract.ts` (authoritative for shapes); exact arithmetic: `src/rational.ts`.
Baseline: Table `main` at `cb7b56eaa01832b75b2bdbf74031f9f45c75ec13`.

## 1. What the extractor is — and is not

The package **describes** what a recipe page or an ingredient line states. It is pure: input text in,
plain JSON data out; no network, database, environment variables, secrets, clock, randomness, logging or
Table server state. It does **not** decide:

- what the household buys (ordinary salt/black pepper are excluded later, by Table's adapter, narrowly);
- what may be fetched, kept, shown or hotlinked from a publisher (Table's `safeFetch`, read policy and
  `content-policy.ts` stay authoritative, decided for the site that actually answered);
- how a quantity is stored (Table stores decimal strings; only the future adapter may round, and it must
  say so);
- anything about plans, groceries, products, carts or orders.

Instruction text and image links in a result are **transient candidates**: their presence authorizes
nothing (`retention: "not_decided"`). The package never fetches an image or a page.

## 2. Ingredient line — `ParsedIngredientV1`

| Field | Meaning |
|---|---|
| `raw` | The input exactly as given (non-string → `""`). |
| `normalized` | What the engine read: controls/bidi overrides → spaces, whitespace collapsed, trimmed, capped at 500 chars (`input_truncated` beyond). |
| `status` | `ready` · `needs_review` · `unsupported` (§2.1). |
| `name` | The food as shopped for, or null (unsupported line; a choice of ingredients). Never contains the amount, unit or package size. |
| `quantity` | `ExactQuantity` (reduced positive rational strings + `display`) or `RangeQuantity`, or null. Never a rounded stand-in: 1/3 is `{"numerator":"1","denominator":"3"}`, not 0.3333. |
| `unit` | `{ canonical, dimension, source }` from `UNIT_REGISTRY`, or null. `oz` (mass) ≠ `fl_oz` (volume); bare count → `each` with `source: ""`. |
| `packageSize` | A container's stated contents (`2 (15 oz) cans` → 15 oz, mass/volume only). Never multiplied into `quantity`. |
| `equivalents` | The same amount restated in another unit (`1 cup (120 g) flour`). Informational; no arithmetic. |
| `form` | `cooked` / `raw` when the line says so (cooked, uncooked, raw), else null. |
| `note` | Preparation, size words, sourcing remarks — `"; "`-joined in source order. Never the amount. |
| `alternatives` | Every option when the line offers a choice of ingredients (`["milk","cream"]`), else `[]`. |
| `optional`, `approximate` | Flags (`(optional)`; `about`, `approximately`, `~`). |
| `amountUnstated` | `to_taste` · `as_needed` · `for_serving` · `for_garnish` · `other` when the line says there is no fixed amount. |
| `reasons` | Stable codes from `REASONS` (unique, detection order). Friendly labels are separate and may change. |
| `evidence.spans` | Optional `[start,end)` offsets into `normalized` per field; `{}` when the engine reports none. |

### 2.1 Status rules (enforced by the validator)

- **ready** — complete and unambiguous: every stated part assigned, nothing left over. `name` non-null;
  no `review`/`unsupported` reason; `quantity` is exact (never a range); `quantity` non-null ⇒ `unit`
  non-null; `quantity` null ⇒ `amountUnstated` non-null; `alternatives` empty.
- **needs_review** — at least one `review` reason. Fields hold what *was* read; nothing is invented and the
  original line is never stuffed into `name` as a substitute for parsing.
- **unsupported** — at least one `unsupported` reason; `name`, `quantity`, `unit`, `packageSize` null.
- Always: `packageSize.unit` is mass or volume; `alternatives` has ≥2 entries or none; every quantity is
  within bounds (positive, ≤ 10 000 in its unit, reduced denominator ≤ 1 000 000).

### 2.2 Reason classes

`info` codes never block `ready`; `review` codes force `needs_review`; `unsupported` codes mean "not an
ingredient". `legacy_*` codes are emitted only by the frozen legacy engines, so a baseline says exactly why
Table import 2 stopped. Codes are append-only: a code's meaning never changes; a new meaning gets a new code.

## 3. Page — `extractRecipePage(html, { requestedUrl, finalUrl }) → RecipeExtractionV1`

- Input: page text the caller already fetched + the requested and final URLs (final URL resolves relative
  links). Text beyond 8 MiB is not read (`input_too_large`); Table's fetcher caps pages at 2 MiB, so this
  never differs from Table's behaviour on fetched pages.
- Reads JSON-LD `Recipe` (with `@graph`, `@type` arrays, `mainEntity`, one-hop `@id` references), else
  schema.org microdata, plus Open Graph/Twitter title, site name and image as fallbacks — the same
  bounded scanner as Table import 2 (limits unchanged: 20 blocks, 512 KiB/block, depth 64, 10 000 nodes,
  20 recipes, 100 ingredient lines, 60 steps × 1 000 chars, 5 images).
- Each candidate carries `ingredientLines` (as published) and `ingredients` (one reading per line).
- `diagnostics` are stable codes (`DIAGNOSTICS`) with plain-words `detail`; never page HTML.
- `imageCandidates[0]` is `role: "hero"` (the recipe data's own image, else the Open Graph image when the
  recipe names none); later ones `other`.

## 4. Engines and versioning

- `IngredientEngine { id, description, parse(line) }`. Phase 1 engines:
  - `legacy-table-import-2` — the frozen copy of Table's `parseIngredientLine` (cb7b56e) translated into
    v1. Default in Phase 1 because it is the only engine. Faithful, including its defects.
  - `legacy-table-import-2+suggestion` — the same, with the legacy one-click suggestion filled in (status
    stays `needs_review`, reason `legacy_suggestion_applied`). Benchmark-only: measures what the current
    "Use suggestion" button would have produced (e.g. 0.3333 for 1/3).
- Phase 2 adds a semantic engine under a new id; the default changes only with benchmark evidence.
- `extractorVersion` = `@table/recipe-extraction@<package version>`; `engines` names the page and
  ingredient engines. This package does not change Table's `EXTRACTOR_VERSION`; only a proven Phase 3
  adapter would. (Table's own import moved from `table-import-2` to `table-import-3` in `main` `8e6bd6e`,
  independently of this package.)

## 5. Exact arithmetic

`src/rational.ts`: BigInt rationals; decimal text converts exactly (`0.125` → 1/8); `formatMixed`;
`toDecimal(r, places)` is the only rounding and returns `exact: false` when it rounds (adapter use).
Definitional unit sizes (`UNIT_REGISTRY.base`) allow exact same-dimension equivalence checks
(1 lb = 16 oz exactly; 1 quart = 4 cups exactly). There are **no densities**: mass ↔ volume never converts.

## 6. Prohibited

Network or DNS access, `fetch`, sockets, child processes, file writes or reads in `src/` (the CLI in `bin/`
reads local files only and refuses URLs); environment variables; logging page text; timestamps or random
values in results; importing Table modules (`@/…`) from `src/` (tests may, for parity only); runtime
dependencies.

## 7. Label semantics (benchmark ground truth)

Labels describe what a careful cook reading the line would record — written from these rules, never
from any engine's output.

1. **Quantity** — the amount for the whole line, as an exact reduced fraction: integers, decimals
   (`.5`), fractions, mixed numbers (`1 1/2`, `1-1/2`), Unicode vulgar fractions (`1⅓` = 4/3), fraction
   slash (`1⁄2`). Number words: `a`/`an`/`one` = 1 … `twelve` = 12, `half`/`half a` = 1/2, `a dozen` = 12.
   Zero/negative → no quantity (`needs_review`). `1,5` and `1,000` are ambiguous → `needs_review`.
2. **Range** — `2-3`, `2 to 3`, `2–3`, `1 or 2` (amounts) → `"2..3"`, `needs_review`.
3. **Unit** — canonical code; `oz`/`ounce(s)` = `oz` (mass) even for liquids; `fl oz`/`fluid ounce` =
   `fl_oz`. Quarts/pints/gallons stay `quart`/`pint`/`gallon`. Count nouns (`clove`, `can`, `bunch`,
   `slice`, `stick`…) are units (dimension count). Bare count → `each`. `pinch`, `dash`, `splash`,
   `handful`, `drop` are imprecise units — the line is still `ready` when otherwise clean.
4. **Package size** — `2 (15 oz) cans black beans` → quantity 2, unit `can`, packageSize 15 `oz`.
   Also `1 (14.5-ounce) can`, `1 15-oz can`, `2 cans (15 oz each)`. Never multiplied.
5. **Compound amounts** — same dimension (`1 lb 4 oz`, `1 cup plus 2 tbsp`) → summed exactly into the
   smallest stated unit (20 `oz`; 18 `tbsp`), `ready`. A restatement in another unit (`1 cup (120 g)`,
   `1 cup / 240 ml`) → quantity/unit = the first-stated amount, the other in `equivalents`, `ready`.
   A second amount that is not a restatement → `needs_review`.
6. **Name** — the food as shopped for. Keep variety/type/colour/percentage/fat/cut descriptors that change
   the product (`red bell pepper`, `2% milk`, `black beans`, `rolled oats`, `unsalted butter`,
   `extra-virgin olive oil`, `boneless skinless chicken thighs`) and product-form words written before
   the food (`diced tomatoes`, `shredded mozzarella`, `frozen peas`). Remove amount, unit, package size,
   `of` after the unit, size words (→ note), anything after the first top-level comma or inside
   parentheses (→ note), cooked/raw/uncooked (→ `form`), optional/to-taste phrases (→ flags). A leading
   preparation participle (`2 cups chopped onion`) stays in `name`, with `accept.name: ["onion"]` and
   `accept.note: ["chopped"]`. Compounds stay one name (`salt and pepper`, `half-and-half`).
   Case is as written (scored case-insensitively).
7. **Note** — size words, non-amount parenthetical text (nested parentheses flattened:
   `(homemade (or store-bought))` → `homemade or store-bought`), text after the first top-level comma
   (`diced`, `drained and rinsed`, `plus more for dusting`, `divided`), joined by `"; "` in source order.
   Price annotations (`($0.16)`) are dropped, not noted. The words optional/to taste are flags, not note.
8. **Alternatives** — a choice of *ingredients* (`milk or cream`, `butter or margarine`,
   `chicken or vegetable broth` → `["chicken broth","vegetable broth"]`): `name` null, all options in
   order, `needs_review` (no option is privileged). An `or` about sourcing or form inside a remark
   (`homemade or store-bought`, `fresh or frozen` as a parenthetical/after a comma) is a note, not an
   alternative. `or` between amounts is a range.
9. **Optional** — `(optional)`, `optional:`, `, optional` → `optional: true`; otherwise as stated (`ready`
   when clean).
10. **Unstated amount** — `to taste` → `to_taste`; `as needed`/`as desired`/`if needed` → `as_needed`;
    `for serving` → `for_serving`; `for garnish`/`to garnish` → `for_garnish`; `for dusting/greasing/
    frying/drizzling` → `other`. With no amount → `ready` (quantity null). With an amount
    (`1 tsp salt, plus more to taste`) → the amount; the remark is a note; `amountUnstated` null.
    No amount and no such phrase (`fresh parsley`, `salt`) → `needs_review` (`quantity_missing`).
11. **Approximate** — `about`, `approximately`, `roughly`, `~` → `approximate: true`, `ready`.
12. **Unsupported** — empty lines, headings (`For the sauce:`, `TOPPING`), instructions, links.
13. **Percentages and sizes in names** — `1 cup 2% milk` → 1 `cup` `2% milk`, `ready`. `1 (9-inch) pie
    crust` → 1 `each` `pie crust`, note `9-inch`.
14. **Text form** — corpus lines are plain decoded text (pages decode entities first); Unicode is kept
    (`jalapeño`, `crème fraîche`, non-breaking spaces).

## 8. Benchmark label files (`fixtures/`)

Ingredient cases are JSON Lines, one object per line (`fixtures/ingredients/{dev,holdout}.jsonl`):

```json
{"id":"ing-dev-0001","split":"dev","categories":["fraction_third","nested_parens","source_choice"],
 "input":"1/3 cup pesto (homemade (or store-bought))",
 "expect":{"status":"ready","name":"pesto","quantity":"1/3","unit":"cup","packageSize":null,"equivalents":[],
           "form":null,"note":"homemade or store-bought","alternatives":[],"optional":false,"approximate":false,
           "amountUnstated":null},
 "accept":{},"severity":"high","seasoningClass":null,
 "provenance":{"kind":"owner_reported_line","source":"Owner report in the 2026-10-09 handoff"},
 "rationale":"Nested source-choice parenthetical is a note; 1/3 is exact."}
```

- `quantity`: `"n"`, `"n/d"`, `"w n/d"` or a range `"a..b"`, or null. `packageSize`/`equivalents`:
  `{ "quantity": "15", "unit": "oz" }`.
- `accept` (optional): extra acceptable values for genuinely ambiguous labeling (`name`, `note`,
  `alternatives`), counted separately from strict matches.
- `severity`: cost if an engine is falsely certain about this line — `high` (wrong amount/unit/package or
  suppressed ambiguity would mis-buy), `medium`, `low`.
- `seasoningClass` (not scored in Phase 1; for the Phase 3 household exclusion): `ordinary_salt`,
  `ordinary_black_pepper`, `salt_and_pepper`, `lookalike` (bell pepper, pepper sauce, lemon pepper
  seasoning, salted butter, garlic salt…), or null.
- `provenance.kind`: `synthetic_pattern` (written for this corpus from a described pattern),
  `owner_reported_line` (a single line the owner reported), `repo_test_input` (an input already in Table's
  own synthetic tests). No real recipe page content.

**Holdout freeze:** `fixtures/FREEZE.json` records the SHA-256 of every holdout file. Holdout labels are
written before any engine is run on them and are never tuned against; a label change needs an entry in
`fixtures/LABEL-CHANGES.md` with an independent rationale and reviewer, and a new freeze hash.

## 9. Scoring (deterministic)

Per field, strict exact match after normalization — name: NFKC, lowercase, collapsed whitespace, trimmed
punctuation; note: the same, then compared as a sorted token bag ignoring `()` `,` `;` `:`; quantity:
exact rational equality (ranges: both ends); unit/packageSize: canonical code + exact quantity;
alternatives: set of normalized names. Reported with numerators **and** denominators, over all lines and
over unambiguous (`ready`-labelled) lines, with Wilson 95% intervals:

- field match rates; core pass (status+name+quantity+unit); full pass (every field);
- review rate (engine not `ready`), unnecessary review (label `ready`, engine not);
- **false certainty** (engine `ready` but label not `ready`, or a core field wrong) by severity;
- **fabricated quantity** (engine states an amount where the label has none) and **cross-dimension**
  (engine unit dimension ≠ label unit dimension, e.g. `oz` vs `fl_oz`) — both must be zero at Gate G2;
- pages: recipe detection precision/recall, per-field match, ingredient-list exactness;
- rights invariants (every fixture in the manifest, reserved example domains only, `retention` always
  `not_decided`); runtime totals (reported separately; excluded from the deterministic report).

## 10. Clarifications recorded during Phase 1 integration (2026-10-09; no change of meaning)

1. `input_truncated` is added when the **normalized** text (controls → spaces, whitespace collapsed, trimmed)
   is longer than 500 characters — i.e. exactly when something is cut — not when the raw string is merely long.
2. The `legacy-*` engines are faithful to Table import 2, so on `needs_review` lines their `name` can still
   contain the amount (`1/3 cup pesto (homemade )`). §2's "never stuffed into `name`" binds new engines; the
   benchmark scores the legacy behaviour as a name mismatch.
3. `legacy-table-import-2+suggestion`: a legacy proposal that cannot be carried within the bounds (reduced
   denominator above 1 000 000, e.g. 0.000001 × 1.5 L) keeps neither amount nor unit and adds `unclassified`
   (3 of 40 564 parity lines; benchmark-only engine).
4. Validator: any `unsupported`-class reason makes the status `unsupported` (an empty line that is also
   truncated stays `unsupported`).
5. Fixture hosts: only reserved example domains that Table's own link validation accepts
   (`example.com`/`.org`/`.net` and subdomains). The `.example` TLD is reserved but refused by Table, so an
   expected URL there is unreachable; the single frozen holdout exception (a requested URL, not scored) is
   logged in `fixtures/LABEL-CHANGES.md`. `https://schema.org/<Type>` vocabulary identifiers may appear in
   fixture markup (`@context`, `itemtype`).
6. Page labels may carry `accept` alternatives for text fields, counted separately from strict matches, as for
   ingredient labels.

## 11. Phase 2 clarifications (2026-10-09)

1. `equivalents` may restate the amount in a mass, volume **or count** unit
   (`1/2 cup (1 stick) butter` → equivalent 1 `stick`); never an imprecise unit. Only `packageSize` is limited to
   mass/volume (§2.1). The Phase 1 validator had also limited equivalents to mass/volume, which made a dev label
   unreachable; it now follows this text. (Unlike §10, this changed what the validator accepts.)
2. `normalized` (§2) — invisible joiners: an engine may **remove** a soft hyphen (U+00AD), zero-width
   non-joiner/joiner (U+200C/D), word joiner (U+2060) or byte-order mark (U+FEFF) when it sits **between two
   letters** (`jalape\u200dño` → `jalapeño`); anywhere else it becomes a space like other invisible marks, so
   `1\u00ad2 cups` is never read as 12. `semantic-v1` does this; the legacy engines keep Table import 2's
   behaviour. Recorded after the Phase 2 evaluation at the independent reviewer's request (round 3); it changes no
   label, validator rule or score (the validator does not recompute `normalized`).

## 12. Phase 2B interpretations (2026-10-10; prospective — before holdout-v3 exists)

Written by the coordinator before the Phase 2B candidate was frozen and before any holdout-v3 line existed, then
**revised after an independent label review** (label checker R2, blind to every engine; its review and this revision
are in `docs/table/evidence/2026-10-10-recipe-extraction-phase2b/label-check/`). Binding for holdout-v3 labels.
**No historical label changes**: dev, holdout-v1 and holdout-v2 keep their frozen labels, and every item below is
consistent with them. *(restated)* = spells out an existing rule or frozen convention; *(new)* = settles a case §7
leaves open. Unit and container lists refer to `UNIT_REGISTRY` (`src/contract.ts`).

1. *(new)* **Fraction words before a unit** — a fraction word (`half`, `third`, `quarter`, `three-quarter(s)`,
   `two-thirds`, `one-half`, `one-quarter`) before a unit, hyphenated or not, with or without a leading `a`/`one`/
   `1`, is the amount; the article or `1` does not multiply it (`a half-cup milk` → 1/2 `cup`; `a quarter cup
   sugar` → 1/4 `cup`; `1 half-cup butter` → 1/2 `cup`; `a half-cup of milk` → 1/2 `cup`). A count ≥ 2 before a
   plural fraction-unit multiplies it (`2 half-cups milk` → 1 `cup`). When the fraction-unit sizes a counted item,
   the count is the quantity and the size is a note (`2 quarter-pound beef patties` → 2 `each`, note
   `quarter-pound`); before a container it is the packageSize (`a half-gallon carton milk` → 1 `carton`,
   packageSize 1/2 `gallon`). `half-dozen` = 6 `each`; `half-and-half` is a food. The unit never stays in `name`.
2. *(restated + new)* **Multiplier `x` / `×`** — restated: `2 x 400 g cans` (README package form), `eggs x 3`
   (h2-0253). New: a count before `x` and a unit, container or food (`1x cup milk` → 1 `cup`; `2x cans chickpeas` →
   2 `can`; `1 x can chickpeas` → 1 `can`); `xN` / `(xN)` after the food = `x N`. Precedence and exclusions:
   (i) `NX`/`Nx` directly before `sugar`/`powdered sugar` is a sugar grade (item 9), never a multiplier;
   (ii) `N x M-<length>` / `NxM` before a singular noun is a size (`9 x 13-inch pan`); before a plural food it is a
   count with the length as a note (`2 x 13-inch pizza bases` → 2 `each`, note `13-inch`); (iii) a line of only
   scaling controls (`1x 2x 3x`) is page furniture (item 8). `x` never stays in `name`.
3. *(new)* **Package size with no count; restated package sizes** — containers are the registry's packaging count
   units: `bag`, `bottle`, `box`, `can`, `carton`, `container`, `envelope`, `jar`, `package`, `packet`, `tin`, `tube`,
   plus the sold-by-weight units `block`, `loaf`, `ball`. A size directly before a *singular* container
   (`28 oz can tomatoes`, `400 g can chickpeas`, `8-ounce package cream cheese`) is one container: quantity 1, unit =
   the container, packageSize = the size, `ready`. A plural container with no count (`15 oz cans beans`) →
   `needs_review` (`quantity_missing`). A size before any other noun is the line's amount, not a package (`6 oz
   salmon fillet` → 6 `oz`). `canned`, `tinned`, `jarred`, `bottled`, `boxed` are product-form words, not
   containers (`28 oz canned tomatoes` → 28 `oz`). A restatement of the package size in another unit, before or
   after the container (`400 g (14 oz) can`, `400g/14oz can`, `400 g can (14 oz)`, `1 (15 oz / 425 g) can`), keeps
   the first-stated size as packageSize and puts the restated size in `note` as written without its brackets or
   `/` (`14oz`, `14 oz`); it is a restatement only within item 6's tolerance, otherwise `needs_review`.
   **Per-piece weights** of items that are not containers (`4 (6-oz) salmon fillets`, `2 (6 oz) chicken breasts`)
   go to `note`, never packageSize; for a single item the weight restates the amount (`a 3-pound whole chicken` →
   1 `each`, equivalent 3 `lb`).
4. *(restated + new test)* **Count noun after the food** — the registry's count units that can follow a food are
   `bulb`, `bunch`, `clove`, `cube`, `ear`, `fillet`, `head`, `leaf`, `link`, `piece`, `pod`, `rib`, `sheet`, `slice`,
   `sprig`, `stalk`, `stick`, `strip`, `wedge`. With a bare count, such a noun after the food is the unit when the
   words before it, bought by that unit, are the product meant: garlic by the clove (README, dev-0087), celery by
   the rib (h2-0065), cardamom by the pod (h2-0054), anchovy by the fillet (h2-0079), sausage by the link (h2-0071),
   lemon by the wedge, cinnamon by the stick, bacon by the strip, lettuce by the head. *(new)* It stays in `name`
   (unit `each`) when the words before it alone name a different product or none: `fish`/`mozzarella`/`cheese`/
   `bread` sticks, `breadsticks`, `bay`/`curry`/`banana`/`grape`/`makrut lime`/`kaffir lime`/`pandan` leaves,
   `lasagna` sheets, `stock`/`bouillon` cubes. `ice cubes` and `sugar cubes` are debatable (both readings defensible);
   they are not used as firm labels. `cloves` with no food word before it, or after `whole`/`ground`, is the spice
   (`6 whole cloves` → 6 `each`, `whole cloves`). With another unit stated (`1 cup basil leaves`) or no amount
   (`lime wedges, to serve`) the noun stays in `name`. Any other post-food noun (`thighs`, `breasts`, `chops`,
   `steaks`, `noodles`) stays in `name` with `each` (dev-0046, h2-0265, h2-0273).
5. *(restated)* **Container "cups"** (README holdout-v2 readings, h2-0087) — a package size with a count and
   `cup(s)` makes the cup a container: `3 (5.3 oz) cups vanilla Greek yogurt`, `3 cups (5.3 oz each) Greek yogurt`,
   `3 5.3-oz cups yogurt` → 3 `container`, packageSize 5.3 `oz`; with no count, `6 oz cup yogurt` → 1 `container`
   (item 3). A measuring cup never carries a package size (`1 cup (8 oz) sour cream` is a restatement, dev-0112).
6. *(new)* **Restatement test (§7.5)** — compare exactly in the `UNIT_REGISTRY` base values (cup 236.5882365 ml,
   tbsp 14.78676478125 ml, tsp 4.92892159375 ml, fl oz 29.5735295625 ml, US pint/quart/gallon; oz 28.349523125 g, lb
   453.59237 g). A same-dimension amount in brackets, after `/`, or in a remark restates the first-stated amount when
   |restated − first| ≤ 7/100 × first (first-stated amount as the base, boundary inclusive), **or** when the restated
   number equals the exact conversion rounded to a whole number of the restated unit (`1/4 tsp (1 ml)`, `1/2 tsp
   (2 ml)`, `3/4 tsp (4 ml)`, `1 lb (454 g)`). Each restatement in a line is checked separately; one failure makes the
   line `needs_review`. `about` does not widen the tolerance. A restated package size (item 3) is checked the same
   way. Count restatements (`1/2 cup (1 stick)`) and mass↔volume restatements are not checked. **Policy:** the
   rounded metric conventions outside both tests (`8 oz (250 g)`, `1 lb (500 g)`, `2 lb (1 kg)`, `4 oz (100 g)`)
   are second amounts → `needs_review`; the review cost is accepted.
7. *(restated + new criteria)* **Choices (§7.8)** — every option is kept, in order; an option is never dropped,
   merged or invented. All choice lines → `needs_review`, `name` null.
   (a) Options are as written except where (b)–(f) share words: `kale or Swiss chard` → `kale`, `Swiss chard`;
   `ham or smoked turkey`; `tea or apple juice`; `pecans or walnuts`.
   (b) **Shared trailing head** — `M1 or M2 H` → `[M1 H, M2 H]` when M1 alone is not a product of H's kind
   (`lemon or lime juice`, dev-0054; `chicken or vegetable broth`; `beef or chicken stock`, hold-0033; `white or
   yellow miso`, h2-0215; `hamburger or hot dog buns`; `red or white wine`). When M1 alone already names a product of
   that kind (`feta or goat cheese`, `Dijon or whole grain mustard`, `sriracha or hot sauce`, `cumin or chili
   powder`) the strict reading is as written and `[M1 H, M2 H]` is always accepted.
   (c) **Shared leading modifier** — `P A or B`, where P is a product-form, variety or preparation word (ground,
   dried, fresh, frozen, smoked, low-sodium, unsalted, chopped, shredded …) and B is a bare food of A's kind →
   strict `[P A, P B]`, accepted `[P A, B]` (frozen: dev-0055 `ground beef or turkey`, hold-0034 `dried oregano or
   thyme`, h2-0225 `chopped parsley or cilantro`). Not shared when B carries its own modifier (`ground beef or
   smoked turkey`). `fresh or frozen` before the food is a choice (h2-0216, dev-0050).
   (d) **Forward head** — `A-phrase or M` where M is only a modifier → `[A, M + A's head]` (`whole milk or 2%` →
   `whole milk`, `2% milk`).
   (e) **Lists** `A, B, or C`, `A, B or C`, `A or B or C`, `A/B`, `A and/or B` → all options, with (b)–(d) applied
   across the list (`chicken, beef, or vegetable broth` → three broths; `maple syrup, honey, or agave`; `pecans,
   walnuts, or almonds`).
   (f) `X, A or B` → `[A X, B X]` only when A and B are varieties or types of X (`broth, chicken or vegetable`;
   `flour, all-purpose or bread`; `sugar, white or brown`); when A and B are kinds of X (`nuts, pecans or walnuts`) →
   `[A, B]`. Sourcing and form words (fresh, frozen, thawed, canned, jarred, boxed, homemade, store-bought) after a
   comma or in brackets stay a note (§7.8; dev-0047, dev-0049, hold-0028, h2-0231, h2-0234).
   (g) Options with their own amounts (`1 tsp dried thyme or 1 tbsp fresh thyme`, `1 egg or 2 egg whites`) →
   quantity and unit of the first option. Different foods joined by `and` sharing one amount (`1 cup carrots, celery
   and onion`, `1/2 tsp each salt and pepper`) → `needs_review` (no option privileged; `name` null, the foods in
   `alternatives` only when the line offers a choice).
8. *(restated + extended)* **Non-ingredient lines (§7.12)** → `unsupported`:
   **nutrition** — a nutrient, vitamin, mineral or caffeine name followed by an amount in `g`, `mg`, `mcg`/`µg`,
   `kcal`, `kJ`, `Cal`, `IU` or `%`, or `Calories`/`Net carbs`/`Serving size` with an amount; **`Sugar` or `Salt`
   followed by a mass in `g`/`mg`** (UK recipes weigh them as ingredients) is uncertain → `needs_review`; followed by a
   kitchen unit (cup, tbsp, tsp, pinch) they are ingredients (dev-0182 `Sugar: 1/2 cup`); diet points (`WW Points: 4`, `SmartPoints: 7`); ratings and votes
   (`4.8 stars (120 reviews)`, `5 from 3 votes`); times (`Prep 10 mins`, `Bake 25 minutes`); recipe metadata
   (`Course: dinner`, `Cuisine: Italian`, `Serves 4`, `Makes 12 muffins`); page furniture (`Print recipe`, `Jump to
   recipe`, `Advertisement`, `Notes`, `Instructions`, `Method`, scaling controls); non-food items (pan, baking sheet,
   skewers, parchment, foil, twine, liners, piping bag), with or without `You will need:`; method steps (`Step 2`,
   `Step 3: Add the onions`). **Headings**: a line with no amount is a heading when it ends with `:`, starts with
   `For (the)`, or consists only of generic component words (sauce, dressing, glaze, topping(s), filling, frosting,
   icing, crust, dough, batter, marinade, garnish, base, layer(s), assembly, to serve), optionally after a dish word
   (`Cake Layers`, `Pie Crust`, `Pizza Dough`), in any case (`SAUCE`). A specific food with no amount (`Pesto`,
   `Hummus`, `Whipped cream`, `Croutons`) is an ingredient → `needs_review` (`quantity_missing`). A role label
   followed by a food (`Garnish: chopped parsley`, `To serve: lime wedges`) is an ingredient with
   `for_garnish`/`for_serving`. A food whose name contains a nutrition word stays an ingredient (`1 scoop protein
   powder`, `2 tbsp vitamin C powder`, `2 tbsp low-sodium soy sauce`, `1 tsp sodium bicarbonate`, `1 bottle vitamin
   water`). Uncertain lines go to `needs_review`, not `unsupported`.
9. *(restated + new)* **Numbers that name the food** — restated: hyphenated or code-like product numbers stay in
   `name` (`5-spice powder` h2-0040, `00 flour` h2-0041, `93/7 ground turkey` h2-0151, percentages §7.13 h2-0145);
   also `7-Up`, `A1 sauce`, `10X sugar` (precedence over item 2). Bracketed ratios go to `note` (h2-0150
   `ground pork (80/20)`). New: a number (word, or digits with no unit) followed by a *singular or mass* head noun
   that, with the number, names the product by counting its components (`five spice powder`, `5 spice powder`,
   `Chinese 5 spice`, `three cheese blend`, `seven grain bread`, `7 grain cereal`, `three-bean salad`, `four cheese
   pizza`) is part of `name`; with no other amount → `needs_review` (`quantity_missing`), full name kept. A *plural*
   head makes the number a count (`Twelve cherry tomatoes` h2-0045 → 12 `each`; `2 cheese pizzas` → 2 `each`).
   Can-size designations (`#10 can`, `No. 2 can`) go to `note`.
10. *(restated + exceptions)* **Size words** (small, medium, large, extra-large, jumbo, colossal, big, little,
    giant; lg/med/sm) go to `note` when they size the counted or weighed item, also after a weight (`1 lb large raw
    shrimp` → `shrimp`, note `large`, form `raw`; `2 lbs medium potatoes`; `3 small zucchini` → 3 `each`, `ready`).
    They stay in `name` when part of a product term (`small curd`, `large-curd`, `medium-grain`, `long-grain`,
    `large-flake`, `petite diced`, `mini`, `baby`, `jumbo shells`) or when they state a heat or grade (`medium salsa`).
11. *(restated + boundary)* **Remark amounts (§7.5)** — a remark amount restates (→ `equivalents`, item 6) when it
    measures the same food in the same state, optionally with about/approx./each, or is a breakdown summing to the
    amount. It is a second amount (→ `needs_review`, remark in `note`) when it measures a source, another state or
    another food (`from`, `makes`, `yields`, dry/uncooked vs cooked; `(1 lime)` / `(from 1 lime)` for lime juice) or
    a substitution (`use half for table salt`, `(or 1/2 tsp table salt)`). A same-food, same-dimension amount after
    `plus`/`+`, even after a comma, is summed per item 12, with only the purpose words in `note` (`1 cup flour, plus
    2 tablespoons for dusting` → 18 `tbsp`, note `for dusting`).
12. *(restated)* **Same-dimension compounds (§7.5)** — summed exactly into the smallest stated unit: `2 tsp + ½ tsp`
    → 5/2 `tsp`; `1 cup plus 1/3 cup` → 4/3 `cup`; `1 Tbsp + 1 tsp (20 ml)` → 4 `tsp`, equivalent 20 `ml`; `1 lb.
    2 oz. (510 g)` → 18 `oz`, equivalent 510 `g`; `1 cup minus 2 tbsp` / `1 cup less 2 tbsp` → 14 `tbsp`. Different
    foods or dimensions (`2 eggs + 1 yolk`) → `needs_review`.
13. *(restated + new)* **Decoration and spacing** — restated: leading `•`, `*`, `-` and NBSP (dev-0154, hold-0005,
    dev-0020, dev-0153). New: leading `▢`, `☐`, `◦`, `▪`, `–`, `✓`, `✔` and enumerators (`N.`, `N)`, `a)`, `a.`)
    followed by a space are decoration (`10. 1 tsp vanilla` → 1 `tsp`); a hyphen glued to a leading number
    (`-1 cup sugar`) is a negative amount → `needs_review` (§7.1); thin, narrow and tab spaces between amount and unit
    are spaces, but any space between a 1–3-digit group and a 3-digit group (`1 000 g`) is a thousands separator →
    ambiguous, `needs_review` (like `1,000`); names are recorded in NFC (`jalapeños`).
14. *(new)* **Unknown or foreign units** — an amount followed by a token that is neither a registry unit nor part of
    the food (`1 m sausage`) → `needs_review`. A unit qualified as non-US (`UK`, `imperial`, `metric cup`,
    `Australian tablespoon`) whose size differs from the registry's (`1 pint milk (UK)`, `1 UK pint milk`) →
    `needs_review`.
15. *(restated)* **Imprecise unit with no number** — reads as one (`Pinch of salt` → 1 `pinch`, frozen h2-0061;
    `Dash of hot sauce`, `a splash of milk`); a size word before it goes to `note` (`Small pinch of salt` → 1
    `pinch`, note `small`). Added 2026-10-10, before holdout-v3, to document the frozen convention.
