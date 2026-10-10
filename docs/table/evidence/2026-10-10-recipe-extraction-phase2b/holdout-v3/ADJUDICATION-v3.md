# Holdout-v3 pre-freeze adjudication (coordinator, 2026-10-10)

**Input:** label checker R2's report `LABEL-CHECK-v3.md` on the draft `work/holdout-v3.jsonl`
(SHA-256 `c31382a33d9a998f40ecfe5f5d91f553bff53e059bacd0bba447c4cd1a48ec93`, private commit `57de3fb`).
R2 was blind to every engine. Its blind sample (46 cases, file SHA-256 `722fc1a4…`) agreed with the evaluator on the core fields
in 45 of 46 cases (97.8 %, Wilson 95 % CI 88.7–99.6 %).

**Basis:** each decision is argued only from CONTRACT-v1 (frozen SHA-256 `d2fe6294…`): §2 and §7, §12 and §12.A, `UNIT_REGISTRY`, and
the frozen dev/holdout/holdout-v2 labels. No engine was run on holdout-v3, and no engine output for it exists. The
coordinator has seen the candidate's behaviour on exposed data only (PHASE-2B-PLAN §5), so every decision rests on the
contract text, quoted below.

**Applied by** the evaluation worker; it is the author of the labels. **Reviewers:** R2 (findings) and the coordinator
(decisions).

## 1. Definite error: corrected

| Case | Old | New | Ground |
|---|---|---|---|
| ing-h3-0091 `6 large cabbage leaves, blanched` | name `cabbage leaves`, 6 `each` | name `cabbage`, 6 `leaf`, note `large; blanched` (unchanged), accept `{}` | §12.4 lists `leaf` among the count units that can follow a food. Such a noun is the unit "when the words before it, bought by that unit, are the product meant". The listed cases show that "bought by" means the product, not the retail unit: garlic by the clove, celery by the rib, lemon by the wedge. The product here is cabbage. The noun stays in the name only "when the words before it alone name a different product or none". The listed examples are products sold as leaves (bay, curry, banana, grape, makrut/kaffir lime, pandan). Cabbage leaves are not sold as a separate product. Status `ready`, severity `high`, contract12 `["12.4","12.10"]` and reliesOnNewReading `true` are unchanged. The rationale is rewritten. |

## 2. Debatable: pre-registered (`debatable: true`, labels unchanged)

| Case | Kept label | Defensible alternative | Why the contract does not settle it |
|---|---|---|---|
| ing-h3-0104 `For garnish: pomegranate arils` | `ready`, `for_garnish` | `unsupported` (heading) | Two §12.8 sentences both apply and are not ranked. "A line with no amount is a heading when it … starts with `For (the)`." Against it: "A role label followed by a food (`Garnish: chopped parsley`, …) is an ingredient with `for_garnish`." |
| ing-h3-0211 `Topping (optional)` | `unsupported` | `needs_review` | §12.8's heading clause requires the line to consist "only of generic component words", and `(optional)` is not one. The line also neither ends with `:` nor starts with `For`. "Uncertain lines go to `needs_review`" then competes with the cook's reading (a heading). |

With 0297 and 0311 (already flagged; the contract itself names both as debatable), holdout-v3 has **4** debatable cases.
Under EVALUATION-PLAN-v3 §6–§7 the acceptance decision uses every case with its label as written. Sensitivity (a) only
reports A1–A5 without these 4.

## 3. Disputed but settled by the contract: kept firm

| Case | Kept label | R2's alternative | Decision |
|---|---|---|---|
| ing-h3-0180 `1 inch fresh turmeric root, grated` | `ready`, 1 `inch`. Accept added: name `turmeric root`, `turmeric`; note `fresh; grated` | `needs_review` (R2's blind label) | **Kept.** §2 gives the unit "from `UNIT_REGISTRY`", and the §12 preamble says "Unit and container lists refer to `UNIT_REGISTRY` (`src/contract.ts`)". The registry has `inch: { dimension: "imprecise" }`, so §12.14 (a token that is "neither a registry unit nor part of the food") does not apply. §7.3: imprecise units leave the line "still `ready` when otherwise clean". §7.3's five names are examples, not the whole list. The frozen label h2-0073 `1 thumb-sized knob fresh ginger` → 1 `knob`, ready, uses another registry imprecise unit that §7.3 does not name. §7.13 (`1 (9-inch) pie crust`) covers an inch that sizes a counted item; this line has no counted item. R2's blind label rested on a premise that is false for the registry: R2 was not given `src/contract.ts`. The accepted values follow the frozen h2-0083 (`fresh turmeric`, accepted `turmeric` with note `1-inch; fresh; peeled`) and h2-0073. |
| ing-h3-0075 `1 small tub crème fraîche` | `needs_review` | 1 `container` | **Kept.** `tub` is not a `UNIT_REGISTRY` unit, and §12.3 lists the containers by name without `tub`. §12.14: "an amount followed by a token that is neither a registry unit nor part of the food → `needs_review`". The contract does not leave this open. |
| ing-h3-0193 `3 rashers smoked streaky bacon` | `needs_review` | 3 `slice` | **Kept**, on the same ground: `rasher` is not a registry unit (§12.14). R2 also called this alternative the weaker one. |

## 4. Accepted values

| Case | Change | Ground (frozen precedent or rule) |
|---|---|---|
| ing-h3-0034 `1 cup mint leaves, packed` | accept.name += `mint` | h2-0170, h2-0267, hold-0052 accept `basil` for `basil leaves` |
| ing-h3-0077 `2 cups packed cilantro leaves (from 2 bunches)` | accept.name += `cilantro` | same precedent |
| ing-h3-0226 `Cracked black pepper, as needed` | accept.name += `black pepper`; accept.note += `cracked` | h2-0346 `cracked black pepper` (same food) |
| ing-h3-0281 `a 2-inch knob of fresh ginger` | accept.name += `ginger`; accept.note += `2-inch; fresh` | h2-0073 `1 thumb-sized knob fresh ginger` |
| ing-h3-0352 `3-4 tbsp ice-cold water` | accept.name += `water`; accept.note += `ice-cold` | temperature-word convention: h2-0016 (`cold`), h2-0139 and h2-0192 (`warm water` → `water`) |
| ing-h3-0180 | see §3 | h2-0083, h2-0073 |
| ing-h3-0225 `✓ 1 cup roasted red peppers, patted dry` | accept → `{}` (removes name `red peppers` and note `roasted; patted dry`) | §7.6 keeps "product-form words written before the food (`diced tomatoes`, … `frozen peas`)" with no alternative. Only a *preparation* participle (`chopped onion`) gets one. The evaluator's own rationale calls this "a jarred product". |
| **Not added:** ing-h3-0097 / ing-h3-0360 (`day-old`), ing-h3-0014 (`ripe`) | none | No frozen precedent: the temperature convention covers temperature words only, and §7.6 does not name age or ripeness words. R2 itself called these weaker. The strict labels stand. |
| **Not changed:** ing-h3-0013 `2 roasted Hatch green chiles, peeled` | none | `peeled` marks home roasting, so `roasted` is a preparation participle there (§7.6). |

## 5. Metadata (not scored; feeds the per-item breakdown and sensitivity (c) only)

1. **`reliesOnNewReading` → `true`** (17 cases). Each label rests on text marked *(new)* in §12 or §12.A, and each
   already carries a non-restated §12 item in `contract12`:
   - 0001, 0022, 0350: A1 (sloppy singular, containers always the unit), item 12.4;
   - 0039: A5 (mass and volume words excluded), item 12.4;
   - 0177, 0258: A2 (rounding allowance), item 12.6;
   - 0014, 0111, 0146, 0229, 0303: A3 (prepared vs extracted), item 12.11;
   - 0167: A4 (modifiers joined by `and`), item 12.7;
   - 0215: 7(b) ("M1 alone names the product"), item 12.7;
   - 0125: item 13's container exception, item 12.13;
   - 0313: item 13's narrow space, item 12.13;
   - 0207: item 9's plural-head test, item 12.9;
   - 0209: item 10's heat/grade exception, item 12.10.

   These are R2's list (R2 was blind), applied as given wherever the frozen scorer's loader accepts it. Plan §7(c)
   defines the exclusion as cases "that exercise a §12 item marked *(new)*".
2. **Cannot be flagged under the frozen scorer, so pre-registered here instead** (7 cases). The frozen loader
   (`bench/labels.ts`) accepts `reliesOnNewReading: true` only together with a §12 item in `CONTRACT12_ITEMS`
   ("12.1"…"12.14") other than the restated-only items 12.5 and 12.12. Neither the scorer nor the plan may change
   before scoring.
   - 0017 `1 cup less 1 tbsp` (item 12, `less`) and 0290 `4 cups (4 oz each)` (item 5) carry only restated-only items.
   - 0102, 0129, 0277, 0285 and 0345 rest on §12.15, which is not in the vocabulary.

   **Supplementary figure (c′), pre-registered now, before scoring:** A1–A5 without the scorer's (c) set and without
   these 7 cases. It is computed in the independent recomputation from the scored per-case outcomes, and reported as
   supplementary and informational, never as the acceptance basis.
3. **§12.15 per-item breakdown (supplementary).** The frozen vocabulary has no `12.15` tag. The 10 lines resting on
   §12.15 (0026, 0063, 0082, 0087, 0102, 0129, 0277, 0285, 0327, 0345) are reported as a supplementary row
   from this list.
4. **`seasoningClass`:** ing-h3-0082 `a big pinch of Maldon salt` and ing-h3-0322 `a sprinkle of flaky salt`
   change from `ordinary_salt` to `lookalike`. This follows the frozen holdout-v2 convention: h2-0176 `flaky salt`
   and h2-0343 `flaky sea salt` are `lookalike`.
5. **`construction`** embeds the expected family, status and rule. This is acceptable because the scorer passes
   only `input` to an engine, and the file is never shown to the implementation worker. It is recorded in the
   provenance.

## 6. Noted, no change

- **R2 (b), §12.6:** a failed restatement goes to `note` (0004, 0300, 0138, 0171, 0319). The evaluator and R2
  agree, and `note` is not a core field. The convention can be written into a future contract revision; the frozen
  contract is not edited.
- **R2 (c), unnatural or mechanical lines:**
  - unnatural: 0253, 0124, 0118;
  - mechanical: 0113, 0259, 0096, 0171, 0138.

  The labels are correct under the contract and stay as they are. They are listed as a limitation in the benchmark
  report.
- **R2's structural recommendation:** publish the registry's unit words and synonyms in the contract. This is a
  follow-up for a future contract revision. It is not done before scoring.
