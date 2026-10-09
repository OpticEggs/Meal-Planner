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
  ingredient engines. Table's `EXTRACTOR_VERSION` (`table-import-2`) is unchanged until the Phase 3
  adapter is proven.

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
