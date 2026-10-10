# Label change log

Every change to a label in `ingredients/*.jsonl` or `pages/labels.json` (and to any `hold-*.html` page)
after its first commit is recorded here, newest last. The initial labels (2026-10-09) are not entries.

## Rules

- A change is argued from `CONTRACT-v1.md` and a careful cook's reading of the line or page — never from
  an engine's output, a benchmark score, or "the engine says otherwise".
- Each entry: date; case or page id; field(s) and old → new value; rationale; author; reviewer.
- **Dev** changes need a rationale and an author; a reviewer is recommended.
- **Holdout** changes additionally need an independent reviewer (not the author, not the engine's author)
  and a re-freeze: new `FREEZE.json` (new hashes and `frozenAt`), with the previous hashes copied into the
  entry. A holdout case that someone has tuned against is moved to dev, not edited in place.
- Contract changes that alter label meaning are versioned in the contract first; relabelling follows.
- **Holdout-v2** (`ingredients/holdout-v2.jsonl`): the draft labels are commit `2f95a2d` ("holdout-v2 draft
  labels (pre-check)"). Every change after that commit — including each adjudicated finding of the
  independent label check (EVALUATION-PLAN-v2 §8.1) — is an entry here with the case id, old → new, the
  rationale (never engine output; the checker sees none), the checker's finding and the adjudicator. The
  freeze (`FREEZE-v2.json`) follows the adjudication; later changes need a re-freeze with the previous hash
  copied into the entry, and after a candidate has been scored on holdout-v2 they make its holdout-v2 results
  exposed, not fresh (§8.5).

## Log

### 2026-10-09 — dev page hosts moved off the `.example` TLD (fixture correction, not a meaning change)

- **Pages:** `page-dev-type-array-br`, `page-dev-microdata`, `page-dev-redirect-headings` (dev only) and their
  HTML files `dev-type-array-br.html`, `dev-microdata.html`.
- **Change:** `news.example` → `news.example.com`, `cookbook.example` → `cookbook.example.org`,
  `share.example` → `share.example.net` in every URL (page text, `requestedUrl`, `finalUrl`, `imageUrls`,
  `declaredUrl`). No title, ingredient, servings, time, author or other semantic value changed.
- **Rationale:** Table's link validation (`validateLinkUrl`, D86) refuses the reserved `.example` TLD as a
  non-public name, so on these pages every image and declared URL was unreachable for *any* engine — a
  fixture artefact, introduced by the integration owner's brief (which listed `*.example` as acceptable),
  not a property of the pages. The corrected hosts are still reserved example domains (RFC 2606).
  Found by the first integrated benchmark run; the fix is argued from Table's link rules, not from a score.
  `tests/contract/fixture-urls.test.ts` now requires every final/image/declared URL to pass Table's link
  validation.
- **Not changed (holdout, frozen):** `page-hold-redirect-li-entities` has `requestedUrl` `https://go.example/x/91`.
  Requested URLs are not scored; the extraction reports `url_invalid` for it and `source.requestedUrl: null`.
  Recorded here as a known artefact; the holdout stays as frozen.
- **Author / reviewer:** integration owner (Claude); reviewer: Worker B's labels otherwise unchanged.

### 2026-10-09 — holdout-v2 pre-freeze adjudication

- **Context:** draft labels `2f95a2d` (`ingredients/holdout-v2.jsonl` SHA-256
  `37d64b28f0447acdcaeaaf01b94c39c039b9961799074d344ab502dda36e2c0b`, not frozen). The independent label checker,
  blind to every parser, labelled a sample of 40 cases (ids 0005, 0014, … every 9th) and agreed on every field
  (40/40); it verified all 54 `repo_test_input` citations at `8e6bd6e` (and their absence at `cb7b56e`), the
  arithmetic and the §2.1 consistency, and found no definite error. The coordinator adjudicated the changes below
  before any candidate engine was evaluated; each is argued from CONTRACT-v1, not from engine output (no engine
  output for holdout-v2 exists).
- **ing-h2-0215** `2 tbsp white or yellow miso` — `accept.alternatives`: `[["white","yellow miso"]]` → removed
  (`accept` now `{}`). Rationale: too generous; §7.8's own example expands the shared noun (`chicken or vegetable
  broth` → `chicken broth`, `vegetable broth`), so only the expanded options match.
- **ing-h2-0204** `1 Tbsp. coarsely ground black pepper` — `accept.name`: `["black pepper","ground black pepper"]`
  → `["ground black pepper"]`; `accept.note`: `["coarsely ground","coarsely"]` → `["coarsely"]`; rationale reworded
  to match. **ing-h2-0322** `½ tsp freshly ground black pepper` — `accept.name`: `["black pepper","ground black
  pepper"]` → `["ground black pepper"]`; `accept.note`: `["freshly ground","freshly"]` → `["freshly"]`; rationale
  reworded. **ing-h2-0325** `ground black pepper` — `accept`: `{"name":["black pepper"],"note":["ground"]}` → `{}`.
  Rationale: consistency — `ground` is treated as a product-form word, exactly as for ground allspice, cardamom,
  ginger, turmeric and coriander elsewhere in the set (fixtures README: product forms stay in the name with no
  alternative).
- **ing-h2-0212** `Juice of 2 limes` — `accept.note`: `["juice of","juiced"]` → `[null,"juice of","juiced"]`.
  **ing-h2-0213** `Zest of ½ orange` — `accept.note`: `["zest of","zested"]` → `[null,"zest of","zested"]`.
  Rationale: the accepted merged names (`lime juice`, `orange zest`) leave nothing for the note, so "no note" must
  be accepted too (the label format already allows `null` in `accept.note`).
- **ing-h2-0087** `3 (5.3 oz) cups vanilla Greek yogurt` — label unchanged; rationale extended with "DEBATABLE —
  PRE-REGISTERED": an engine reading `cups` as the volume unit is scored cross-dimension (S3). The case is listed in
  `bench/outcomes.ts` `DEBATABLE_CASES`; the report also gives A1–A5 without it, as information only — the
  acceptance decision stays on all holdout-v2 cases.
- **Kept as labelled** (adjudicated, no change): every other case, including the CONTRACT AMBIGUITY readings
  (0071/0143/0317, 0165/0338, 0219, 0226/0227/0229, 0265, 0304, 0113/0166 and the rest).
- **New hash:** `793507a4b7360fb7a99dad69519fbe337ad97b3c41ad102d0db8b46f6ee6617f` (the file that `FREEZE-v2.json`
  freezes).
- **Author:** evaluation worker. **Reviewers:** independent label checker; coordinator.

### 2026-10-10 — holdout-v3 pre-freeze adjudication

- **Context:** draft labels at the evaluator's private commit `57de3fb` (`ingredients/holdout-v3.jsonl` SHA-256
  `c31382a33d9a998f40ecfe5f5d91f553bff53e059bacd0bba447c4cd1a48ec93`, 369 cases, not frozen). They were written blind
  from CONTRACT-v1 §7 and §12 (incl. §12.A); no engine was run on these inputs. The independent label checker R2, blind
  to every engine, labelled a blind sample of 46 cases and agreed with the evaluator on the core fields in 45 of 46
  (97.8 %, Wilson 95 % CI 88.7–99.6 %); it then reviewed every label. The coordinator adjudicated R2's findings before
  any engine was evaluated on holdout-v3 (`ADJUDICATION-v3.md`). Each decision is argued from CONTRACT-v1 (§2, §7, §12,
  §12.A, `UNIT_REGISTRY`) and the frozen dev/holdout/holdout-v2 labels; no engine output for holdout-v3 exists. The
  evaluation worker applied exactly the decisions below and nothing else (29 cases changed; every other line is
  byte-identical to the draft).
- **ing-h3-0091** `6 large cabbage leaves, blanched`: `name` `cabbage leaves` → `cabbage`; `unit` `each` → `leaf`
  (quantity 6, note `large; blanched`, accept `{}`, status `ready`, severity, contract12 `["12.4","12.10"]` and
  reliesOnNewReading `true` unchanged); rationale rewritten. Rationale: §12.4 lists `leaf` among the count units that can
  follow a food, and such a noun is the unit "when the words before it, bought by that unit, are the product meant"; the
  listed cases (garlic by the clove, celery by the rib, lemon by the wedge) show that "bought by" names the product, not
  the retail unit. The product here is cabbage. The noun stays in the name only "when the words before it alone name a
  different product or none", and the listed exceptions (bay, curry, banana, grape, makrut/kaffir lime, pandan leaves)
  are leaf products sold separately; cabbage leaves are not. R2 found this (definite error).
- **ing-h3-0104** `For garnish: pomegranate arils` — label unchanged (`ready`, `for_garnish`); `debatable` `false` →
  `true`; rationale extended with "DEBATABLE — PRE-REGISTERED: unsupported (a heading)". Two §12.8 sentences both apply
  and are not ranked: a line with no amount that "starts with `For (the)`" is a heading, and "a role label followed by a
  food … is an ingredient with `for_garnish`".
- **ing-h3-0211** `Topping (optional)` — label unchanged (`unsupported`); `debatable` `false` → `true`; rationale
  extended with "DEBATABLE — PRE-REGISTERED: needs_review". §12.8's heading clause requires a line consisting "only of
  generic component words", and `(optional)` is not one; the line neither ends with `:` nor starts with `For`, so
  "uncertain lines go to `needs_review`" competes with the cook's reading (a heading).
  With ing-h3-0297 and ing-h3-0311 (flagged in the draft; the contract names both shapes as debatable) holdout-v3 has
  **4** debatable cases. The acceptance decision uses every case as labelled; sensitivity (a) reports A1–A5 without these 4
  (informational).
- **ing-h3-0180** `1 inch fresh turmeric root, grated` — label unchanged (`ready`, 1 `inch`); `accept` `{}` →
  `{"name":["turmeric root","turmeric"],"note":["fresh; grated"]}`; rationale extended. Kept firm against R2's blind
  `needs_review`: §2 gives the unit "from `UNIT_REGISTRY`" and the §12 preamble says "Unit and container lists refer to
  `UNIT_REGISTRY`"; the registry has `inch` as an imprecise unit, so §12.14 (a token that is "neither a registry unit nor
  part of the food") does not apply, and §7.3 keeps an imprecise-unit line "still `ready` when otherwise clean" (§7.3's
  five names are examples; frozen h2-0073 `1 thumb-sized knob fresh ginger` → 1 `knob`, ready, uses another registry
  imprecise unit §7.3 does not name). §7.13 (`1 (9-inch) pie crust`) covers an inch that sizes a counted item; nothing is
  counted here. R2 had not been given `src/contract.ts`. The accepted values follow frozen h2-0083 (`fresh turmeric`,
  accepted `turmeric`) and h2-0073.
- **Accepted values** (labels unchanged; grounds are frozen precedents):
  - **ing-h3-0034** `1 cup mint leaves, packed` — `accept` `{}` → `{"name":["mint"]}` (h2-0170, h2-0267, hold-0052
    accept `basil` for `basil leaves`).
  - **ing-h3-0077** `2 cups packed cilantro leaves (from 2 bunches)` — `accept.name` `["cilantro leaves"]` →
    `["cilantro leaves","cilantro"]` (same precedent; `accept.note` `["packed"]` kept).
  - **ing-h3-0226** `Cracked black pepper, as needed` — `accept` `{}` → `{"name":["black pepper"],"note":["cracked"]}`
    (h2-0346 `cracked black pepper`).
  - **ing-h3-0281** `a 2-inch knob of fresh ginger` — `accept` `{}` → `{"name":["ginger"],"note":["2-inch; fresh"]}`
    (h2-0073).
  - **ing-h3-0352** `3-4 tbsp ice-cold water` — `accept` `{}` → `{"name":["water"],"note":["ice-cold"]}` (temperature-word
    convention: h2-0016 `cold`; h2-0139 and h2-0192 `warm water` → `water`).
  - **ing-h3-0225** `✓ 1 cup roasted red peppers, patted dry` — `accept`
    `{"name":["red peppers"],"note":["roasted; patted dry"]}` → `{}`; rationale reworded (drops "bare peppers
    accepted"). §7.6 keeps "product-form words written before the food" with no alternative; only a preparation
    participle gets one, and the line's own rationale calls this a jarred product.
- **`reliesOnNewReading`** `false` → `true` on 17 cases (labels and contract12 unchanged; each label rests on text
  marked *(new)* in §12 or §12.A, and each already lists a non-restated §12 item): ing-h3-0001, 0022, 0350 (A1, 12.4);
  0039 (A5, 12.4); 0177, 0258 (A2, 12.6); 0014, 0111, 0146, 0229, 0303 (A3, 12.11); 0167 (A4, 12.7); 0215 (§12.7(b),
  12.7); 0125, 0313 (§12.13); 0207 (§12.9 plural head); 0209 (§12.10 heat/grade exception). R2's list (R2 was blind),
  applied wherever the frozen loader accepts it.
- **Supplementary (c′) list, pre-registered before scoring** (7 cases that cannot carry `reliesOnNewReading: true`
  under the frozen loader, which requires a `contract12` item from "12.1"…"12.14" other than the restated-only 12.5 and
  12.12): ing-h3-0017 (item 12, `less`) and 0290 (item 5) carry only restated-only items; 0102, 0129, 0277, 0285 and
  0345 rest on §12.15, which is not in the vocabulary. Supplementary figure (c′): A1–A5 without the scorer's (c) set
  and without these 7 cases, computed in the independent recomputation from the scored per-case outcomes; supplementary
  and informational, never the acceptance basis.
- **§12.15 supplementary row** (the frozen vocabulary has no `12.15` tag): the 10 lines resting on §12.15 are
  ing-h3-0026, 0063, 0082, 0087, 0102, 0129, 0277, 0285, 0327, 0345.
- **`seasoningClass`** `ordinary_salt` → `lookalike` on ing-h3-0082 `a big pinch of Maldon salt` and ing-h3-0322
  `a sprinkle of flaky salt` (frozen holdout-v2 convention: h2-0176 `flaky salt` and h2-0343 `flaky sea salt` are
  `lookalike`). Their category tags follow (below).
- **Kept as labelled** (disputed, settled by the contract): ing-h3-0180 (above); ing-h3-0075 `1 small tub crème fraîche`
  stays `needs_review` (R2: 1 `container`) — `tub` is not a `UNIT_REGISTRY` unit and §12.3 names the containers without
  it, so §12.14 applies ("an amount followed by a token that is neither a registry unit nor part of the food →
  `needs_review`"); ing-h3-0193 `3 rashers smoked streaky bacon` stays `needs_review` (R2: 3 `slice`, which R2 called the
  weaker alternative) — `rasher` is not a registry unit (§12.14).
- **Not added:** no accept for `day-old` (ing-h3-0097, ing-h3-0360) or `ripe` (ing-h3-0014): no frozen precedent; the
  temperature convention covers temperature words only and §7.6 names no age or ripeness words; the strict labels
  stand. **Not changed:** ing-h3-0013 `2 roasted Hatch green chiles, peeled` — `peeled` marks home roasting, so
  `roasted` is a preparation participle there (§7.6) and its accept stays.
- **Noted, no change:** a failed §12.6 restatement goes to `note` (0004, 0300, 0138, 0171, 0319; evaluator and R2
  agree; `note` is not a core field). Lines R2 found unnatural (0253, 0124, 0118) or mechanical (0113, 0259, 0096, 0171,
  0138) are correctly labelled under the contract and stay; listed as a limitation in the benchmark report. The
  `construction` strings were not edited: their reading tag records the draft metadata, and the `reliesOnNewReading`
  field is authoritative.
- **Category tags aligned with the adjudicated labels** (coordinator, same day, before the freeze was copied into the
  repository): ing-h3-0091 `categories` gains `count_unit` (its unit is now `leaf`); ing-h3-0082 and ing-h3-0322
  `seasoning_ordinary` → `seasoning_lookalike` (their `seasoningClass` is now `lookalike`). Applied on top of the
  intermediate adjudicated file `2c1793447a317f789055a73ac4169d66bb51f54848c527b098975dea7a744caa` (never copied into the
  repository); final file `fd4a989fe48d89f59f7fa38a5434581f7ae4e0996c8230cdea1ed26e60bc0591`.
- **New hash:** `fd4a989fe48d89f59f7fa38a5434581f7ae4e0996c8230cdea1ed26e60bc0591` (the file that `FREEZE-v3.json`,
  `frozenAt` 2026-10-10, freezes). Previous (draft) hash: `c31382a33d9a998f40ecfe5f5d91f553bff53e059bacd0bba447c4cd1a48ec93`.
- **Author:** evaluation worker. **Reviewers:** label checker R2; coordinator.
