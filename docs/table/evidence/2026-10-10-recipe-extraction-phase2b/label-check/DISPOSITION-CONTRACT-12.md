# Disposition of label checker R2's review of CONTRACT §12 (coordinator, 2026-10-10)

R2 (read-only, blind to every engine; workspace held only the contract, the labelling guide, the frozen exposed
labels and the regression labels) reviewed the first draft of §12 (`1cb91af`). Verdicts: 3 CONFLICT (12.2, 12.7, 12.8),
7 AMBIGUOUS, 3 OK. §12 was rewritten **before** the candidate was frozen and before any holdout-v3 line existed.

| Item | R2 | Disposition |
|---|---|---|
| 12.1 | OK, add unhyphenated / plural / sizing forms | adopted as proposed |
| 12.2 | CONFLICT with 12.9 (`10X sugar`), size forms | adopted: sugar grade precedence, `N x M-inch` rule, scaling controls; tag → restated + new |
| 12.3 | AMBIGUOUS: containers, `canned`, note text, tolerance, position | adopted: container list from `UNIT_REGISTRY` (+ block/loaf/ball), product-form words, note text as written, item-6 tolerance, before or after the container; per-piece weights → note (R2 §3.3 B) |
| 12.4 | AMBIGUOUS: identity test, registry, `whole cloves` | adopted: "the words before it, bought by that unit, are the product meant", enumerated count units, identity list, `ice cubes`/`sugar cubes` debatable (no firm labels), spice cloves |
| 12.5 | OK, tag → restated | adopted, with `(S each)` and unbracketed forms |
| 12.6 | AMBIGUOUS: base, boundary, cup, metric conventions | adopted: registry base values, first-stated base, inclusive 7 %, whole-unit rounding allowance, each restatement checked; **policy**: `8 oz (250 g)`, `1 lb (500 g)` → `needs_review` (review cost accepted, as R2 recommended) |
| 12.7 | CONFLICT with dev-0055/hold-0034/h2-0225 and with sourcing notes | rewritten as R2's (a)–(f) plus (g) options with own amounts and `and`-lists; frozen conventions preserved |
| 12.8 | CONFLICT with dev-0182; heading boundary | adopted: unit-based nutrition test, generic heading-word list, role labels; narrowed by the coordinator: only `Sugar`/`Salt` + g are uncertain (UK weighing), `Fat`/`Starch` + g stay nutrition |
| 12.9 | AMBIGUOUS: `Twelve cherry tomatoes`, digits, `#10 can` | adopted: singular/mass-head test, plural head = count, can sizes → note, bracketed ratios → note |
| 12.10 | AMBIGUOUS (minor): product terms | adopted: product-term and grade exceptions |
| 12.11 | AMBIGUOUS (minor): restatement vs source; clash with 12.12 | adopted: source/state/substitution → second amount; `, plus N for dusting` summed (R2's recommendation) |
| 12.12 | OK; `minus`/`less` | adopted |
| 12.13 | AMBIGUOUS (minor): enumerators, `-1`, `1 000 g` | adopted: enumerators decoration; glued `-1` negative → needs_review; spaced thousands → ambiguous |
| (new) 12.14 | R2 §3.1 #3–#4: missing rules | added: unknown unit tokens and non-US units → needs_review |

Regression labels: R2's two coordinator-label findings were applied (Dijon strict as written; cumin accepted set),
`feta or goat cheese` made firm; 16 probe-label corrections applied through `regressions/probe-label-overrides.tsv`
(the reviewer's probe file stays unchanged evidence). The labelling guide sentence "a note never holds an amount"
now reads "the line's amount". R2 found 0/60 disagreements in its stratified probe sample (Wilson 95 % CI 0–6 %).

## Second review: §12.15 and §12.A A1–A4 (R2, after the candidate review)

R2 verified §12.6 with A2 exactly (no contradiction: `2 lb (1 kg)`, `100 g (4 oz)`, `500 g (1 lb)` → needs_review;
`1 kg (2 lb)`, `1/2 tsp (2 ml)` ready; no frozen label moves, largest frozen deviation 5.67 %) and raised: item 6 must
carry A2 itself; rounding mode; coarse units slipping through the allowance; §12.15 plural/count/measuring units with
no number; A1 sloppy plurals (`2 clove garlic`), counts ≤ 1, containers, size words (h2-0066/0074/0075); A3 vs `from`
and borderline sources; A4 open compound list, modifier compounds (h2-0104, h2-0268); item 13 vs `2 400 g cans`;
item 3 vs `cup`. **All adopted** (the coordinator chose to restrict the allowance to `ml`/`g`, plus `lb` restating
`kg`, half up; borderline sources and product-or-list pairs are debatable, not firm labels). R2's "still open" probe
corrections (Dijon, kaffir lime leaves, fresh or frozen cranberries) were already applied in `probe-label-overrides.tsv`;
R2 could not see that file.
