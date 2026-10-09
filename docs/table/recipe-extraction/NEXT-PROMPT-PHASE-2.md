# Recommended next prompt — Recipe Extraction Lab, Phase 2 (accurate ingredients)

_Prepared 2026-10-09 by the integration owner after Gate G1. Send only if you authorize Phase 2. It changes
nothing in the Table app._

---

ROLE: Claude — Table integration owner. TASK: Recipe Extraction Lab **Phase 2 only** (accurate ingredients and
confidence discipline) in `packages/recipe-extraction`, on branch `claude/quirky-gauss-depmd8` (Phase 1 at `3ca998a`).

Read first: root `CLAUDE.md`; `packages/recipe-extraction/CONTRACT-v1.md`; `docs/table/recipe-extraction/`
(`SOURCE-AND-CONTRACT-CENSUS.md`, `BENCHMARK-v1.md`, `ADAPTER-IMPACT.md`); DECISIONS D121–D124 (numbered D112–D115, then D118–D121, before the merges with main).

Build a new ingredient engine (new id, e.g. `semantic-v1`) under `src/ingredient/` — do not edit `src/legacy/`:
1. Exact amounts: integers, decimals, fractions, mixed and hyphenated mixed (`1-1/2`), Unicode vulgar and fraction
   slash, number words (`a`, `one`…`twelve`, `half`, `a dozen`); bounded numerators/denominators; zero, `1/0`,
   `1,5`, `1,000` → needs_review; ranges as `RangeQuantity`.
2. A balanced-bracket parser (not a single regex): nested parentheses, sourcing remarks (`homemade (or
   store-bought)`) as notes vs ingredient alternatives (`milk or cream`) as `needs_review` with every option.
3. Units per `UNIT_REGISTRY`: count nouns (incl. after the food: `3 garlic cloves`), package sizes in all four
   forms (never multiplied), compound same-dimension sums (`1 lb 4 oz` → 20 oz), restated equivalents
   (`1 cup (120 g)`), imprecise units, quarts/pints/gallons kept as written; `oz` never becomes `fl_oz`.
4. Names without amounts ever; size words, prep and remarks to `note`; cooked/raw to `form`; optional,
   approximate and "no fixed amount" phrases as flags; headings/instructions/empty → unsupported.
5. Evidence spans; stable reasons; contract validator green on every output; deterministic; hostile-input bounds.
6. Property/metamorphic tests (whitespace/bullet/Unicode normalization never changes meaning; never invent an amount;
   never cross mass/volume); the pesto `it.fails` target becomes a passing test.

Hygiene (mandatory): the engine is written by a worker that **never opens** `fixtures/ingredients/holdout.jsonl`
or holdout page files; development uses dev only. When the engine is frozen, run the existing holdout **once** and
report it. Then a separate worker writes a **second holdout** blind (≥ 189 ready-labelled lines, same contract
rules, own freeze commit) and the frozen engine is scored on it once. No label changes to make the engine pass;
any label change is logged per `fixtures/LABEL-CHANGES.md`.

Gate G2 (report numerators/denominators and Wilson intervals): on holdout ready lines core pass and
name/quantity/unit ≥ 98% (state whether the lower bound supports it); 0 high-severity false certainty;
0 fabricated quantity; 0 cross-dimension; 0 suppressed ambiguity; unnecessary review ≤ 10%; legacy engines and
parity tests unchanged. Change `DEFAULT_ENGINE_ID` only if G2 is met.

Hard stops: no change to Table's `src/`, `tests/`, UI, migrations, drafts, `EXTRACTOR_VERSION`, environment
variables or deployments; no network, live pages, AI providers, Kroger or costs. Phase 3 (adapter) needs a separate
decision. Use up to two isolated workers; commit code first, docs/evidence separately; push to the branch; no merge
to `main`.

Report: commits, changed paths, tests, dev and holdout metrics before/after with denominators, residual false
certainties by case, limitations, and the next gate.
