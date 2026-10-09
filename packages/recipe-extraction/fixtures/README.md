# Recipe extraction benchmark fixtures

Ground truth for the `@table/recipe-extraction` benchmark (`bench/`). Everything here is **synthetic**:
written for this repository, invented recipes, names, authors and sites, reserved example hosts only, no
images, nothing copied from a real page. Rights: redistributable with the repository (`MANIFEST.json`).

| Path | What |
|---|---|
| `ingredients/dev.jsonl` | Ingredient-line cases for development (182). Engines may be tuned against these. |
| `ingredients/holdout.jsonl` | Ingredient-line cases held out (128). **Frozen** — never tuned against. |
| `ingredients/holdout-v2.jsonl` | Holdout-v2 (EVALUATION-PLAN-v2 §9), split `holdout2`, ids `ing-h2-NNNN` (359: 271 ready, 69 needs_review, 19 unsupported). The **fresh** set for the Phase 2 acceptance decision; written blind, never shown to the implementation worker. Label-checked (blind sample 40/40) and adjudicated 2026-10-09 (`LABEL-CHANGES.md`), then frozen in `FREEZE-v2.json`. |
| `pages/*.html` | Synthetic recipe pages: `dev-*` (10) and `hold-*` (5, frozen). |
| `pages/labels.json` | What each page states (CONTRACT-v1 §3), one entry per page. |
| `FREEZE.json` | SHA-256 of every holdout file (and of the holdout page labels), case counts, the freeze rule. |
| `FREEZE-v2.json` | (Created at the holdout-v2 freeze.) SHA-256 of `ingredients/holdout-v2.jsonl`, case counts by status and source kind, `frozenAt`, the rule. Verified on every benchmark run once it exists. |
| `MANIFEST.json` | Every file here: kind, split, provenance, rights, author, reviewer. |
| `LABEL-CHANGES.md` | The log every label change must be recorded in. |

## Why

The benchmark measures what an engine gets right **and** how it fails: false certainty (a `ready` reading
that is wrong or hides an ambiguity), fabricated amounts, and `oz`/`fl_oz` cross-dimension errors must all
be zero at Gate G2 (CONTRACT-v1 §9). That only means something if the labels say what a careful cook would
record — independent of any engine — and if the holdout was never seen while an engine was being tuned.

## Label rules

Authoritative: `../CONTRACT-v1.md` §7 (ingredient labels), §3 (pages), §8 (file format), §9 (scoring).
Strict format checks: `bench/labels.ts` (run by `npm test`). Where §7 does not settle a case, the case's
`rationale` says so ("CONTRACT AMBIGUITY") and the reading below is used consistently:

- **Product-form vs preparation words before the food.** Product forms stay in `name` with no alternative
  (`diced tomatoes`, `shredded mozzarella`, `frozen peas`, `ground cumin`, `crushed tomatoes`, `smoked
  paprika`, `rolled oats`, `dried penne`, `powdered sugar`). Preparation participles stay in `name` too
  (§7.6) but carry `accept.name` without them and `accept.note` with them (`chopped`, `sliced`, `grated`,
  `toasted`, `freshly ground`). `fresh` before an herb is treated the same way (`fresh thyme`, accept
  `thyme` + note `fresh`): fresh and dried herbs are different products.
- **Unreadable amount** (zero, `1,5`, `1,000`): `needs_review`, `quantity: null`; the unit and food are
  still recorded as read.
- **Count noun after the food** (`3 garlic cloves`): unit `clove`, name `garlic` — same as `3 cloves garlic`.
- **Amount after the food** (`flour, 2 cups`, `Sugar: 1/2 cup`, `Parmesan cheese (1/2 cup), grated`):
  the amount is the quantity (a note never holds an amount) and the line is `ready`.
- **`fresh or frozen` before the food** (`2 cups fresh or frozen peas`): a choice of products →
  `alternatives`, `needs_review` (§7.8's note rule covers only remarks).
- **Restatement in a count unit** (`1/2 cup (1 stick) butter`): an `equivalents` entry.
- `accept` holds extra acceptable values for `name` (strings), `note` (strings or null) and
  `alternatives` (option lists). They are scored as "accepted", separately from strict matches.
- `severity` (cost if an engine is falsely certain): `ready` lines with an amount are `high`, `ready` lines
  with no fixed amount are `low`; `needs_review` lines are judged per case (an unreadable or ranged amount of
  a main ingredient is `high`; a choice of ingredients or a missing amount is usually `medium`; seasoning
  is `low`); headings and instructions are `medium`, empty lines `low`. The scorer uses the case severity
  only for suppressed ambiguity; wrong amounts on a `ready` reading are always high (`bench/score.ts`).
- `seasoningClass` (not scored in Phase 1): `ordinary_salt` (salt, kosher salt, fine sea salt),
  `ordinary_black_pepper` (black pepper, ground/freshly ground black pepper), `salt_and_pepper`,
  `lookalike` (bell peppers, pepper flakes and sauces, cayenne, white pepper, peppercorns, flavoured salts,
  salted/unsalted butter, salted peanuts).

Page conventions (`pages/labels.json`): `ingredientLines` are the published lines after entity decoding,
markup removal and whitespace collapse (a decoded `&nbsp;` is labelled as a plain space; the scorer
canonicalizes whitespace in these lines); a `recipeIngredient` string with `<br>`/`<li>` is labelled as
separate lines; headings stay in the list. `servings` only for one unambiguous integer 1–100 (`12 muffins`
→ 12, `4 to 6 servings` → null). For `recipeYield: ["4", "4 servings"]` the label is `4 servings` with
`4` and `4, 4 servings` accepted. Site name: the recipe's publisher, else a WebSite/Organization in the same
block, else `og:site_name`. Images in recipe order, resolved against `finalUrl`; `og:image` only when the
recipe names none. `declaredUrl` is the recipe's `url` property (null when it has none).
`instructionCount` counts steps (HowToSection names are not steps). `expectedDiagnostics` lists codes that
must appear; others may too.

## Hygiene

- Labels are written by reading the line or page against the contract — **never** from an engine's or a
  parser's output. Phase 1 labels were written without running any ingredient or page parser on them.
- Provenance per case: `synthetic_pattern` (written here), `owner_reported_line` (the owner's pesto line),
  `repo_test_input` (an input string borrowed from Table's own synthetic test page
  `tests/fixtures/recipe-pages/wordpress-graph.html`; only the input, not any expected output).
- Hosts: only `example.com`, `example.org`, `example.net` and `*.example` (and subdomains). The only other
  URLs are the schema.org vocabulary identifiers that structured data needs (`https://schema.org`,
  `https://schema.org/Recipe` as `@context`/`itemtype`); they are identifiers, not links to content.
  `bench/invariants.ts` enforces this, the manifest, the 1 MiB file cap and the freeze.

## Holdout-v2 (`ingredients/holdout-v2.jsonl`)

The fresh set for the Phase 2 acceptance decision (`docs/table/recipe-extraction/EVALUATION-PLAN-v2.md`
§6, §8–§9). Written by the evaluation worker on 2026-10-09 from CONTRACT-v1 §7 and the conventions above,
**blind**: no ingredient parser (legacy, candidate or Table's) was run on these inputs and no parser's output
for them was looked up. It is never shown to the implementation worker.

- Every case carries two extra fields: `source` (`{"kind":"synthetic_pattern","author":…}` or
  `{"kind":"repo_test_input","file":…,"line":…,"commit":"8e6bd6e"}`, same kind as `provenance`) and
  `construction` (a short template signature such as `"INT (size) container food, prep"`).
- Synthetic lines: no construction is used more than twice (swapping the food word is the same
  construction). Repository inputs: input strings that Table's import overhaul (`8e6bd6e`) added to its own
  tests, taken only where the exact string is not in those files at `cb7b56e`, not in `dev.jsonl` /
  `holdout.jsonl` and not in `tests/parity/table-test-literals.ts`; Table's expected values in those tests
  were ignored (they apply household policy the contract leaves to the adapter).
- Readings used where §7 does not settle a case (each such case says "CONTRACT AMBIGUITY" in its rationale):
  a temperature word before the food (`cold`, `warm`) is kept in the name like a leading participle, with the
  bare food + note accepted; `about` inside a restatement (`(about 1 oz)`) qualifies only the equivalent, so
  `approximate` stays false; an amount inside a remark that is not a restatement (`(from 1/3 cup dry)`) is a
  second amount → `needs_review`; a parenthetical naming another ingredient (`(or crushed tomatoes)`) or a
  product variety (`(red or green)`) is a choice of ingredients; `Juice of 2 limes` / `Zest of ½ orange` →
  the fruit counted, the part used in the note (juice/zest names accepted); a container written with a unit
  word (`3 (5.3 oz) cups … yogurt`) is a `container`; `2 x 400 g cans` is package-size form 1.
- Scoring is **opt-in**: `npx tsx bench/cli.ts --split holdout2`, or `--split every` (dev + holdout-v1 +
  holdout-v2). The default `--split all` is dev + holdout-v1 exactly as in Phase 1, so a plain `npm run bench`
  never scores holdout-v2. Besides the CONTRACT §9 figures, every report has an "Outcomes (EVALUATION-PLAN-v2)"
  section (`bench/outcomes.ts`): one class per line (C1–C8), the severe errors S1–S8, per set / category /
  source kind, and on holdout-v2 the Gate G2 criteria A1–A5 over **all** holdout-v2 cases. Pre-registered
  sensitivity figures follow, labelled "informational, not the acceptance basis": A1–A5 without the debatable
  cases in `DEBATABLE_CASES` (`ing-h2-0087`), and the needs_review figures without bare foods with no amount.
  Until `FREEZE-v2.json` exists the report says holdout-v2 is **not frozen**.
- Freeze (after the label check and adjudication, EVALUATION-PLAN-v2 §8.1): print the record with
  `npx tsx bench/cli.ts --print-freeze-v2 <YYYY-MM-DD>`, save it as `FREEZE-v2.json`, add that file to
  `MANIFEST.json` (kind `freeze_record`), and commit it on its own. From then on every run verifies it.

## Changing labels

1. Never change a label because an engine disagrees. Argue from the contract text and a careful cook's
   reading; if the contract is unclear, raise a contract question instead.
2. Add an entry to `LABEL-CHANGES.md` (date, case id, old → new, rationale, author, reviewer).
3. **Holdout:** a change also needs an independent reviewer and a new freeze: print the new record with
   `npx tsx bench/cli.ts --print-freeze <YYYY-MM-DD>`, replace `FREEZE.json`, and copy the old hashes into
   the log entry. A holdout case that has been tuned against cannot be "un-seen": move it to dev instead.
   **Holdout-v2** the same, with `--print-freeze-v2` and `FREEZE-v2.json`; a change after a candidate has been
   scored on holdout-v2 makes that candidate's holdout-v2 results exposed, not fresh (EVALUATION-PLAN-v2 §8.5).
4. New files must be added to `MANIFEST.json`. Run `npm test` (label validation, invariants, freeze).
