# Final-head review: Recipe Extraction Lab Phase 2, `0c0c60f`

Reviewer: an independent, read-only subagent. Date: 2026-10-09.
Head: `0c0c60f` on branch `claude/quirky-gauss-depmd8`. PR base: `main` at `8c9fd8c`, which is also the merge-base.

I worked in my own clone (`final-review/repo`, with `node_modules` symlinked in) and did not touch `/home/user/Meal-Planner`. Probe scripts, inputs and outputs are in this folder.

## What I read and ran

**Read**
- Package:
  - `CONTRACT-v1.md` and `README.md`;
  - `src/{index,contract,validate}.ts`, `src/ingredient/engines.ts` and the semantic engine (`engine.ts`, `lexicon.ts`, `amount.ts` around the `x` branch, `classify.ts`, `alternatives.ts`);
  - `src/legacy/PROVENANCE.json`;
  - `bench/{outcomes,compare,stats,cli,invariants,freeze}.ts` and `bench/__tests__/holdout2.test.ts`;
  - `tests/parity/{provenance.test.ts,live-state.ts}`, `tests/characterization/pesto.test.ts` and `tests/semantic/dev-safety.test.ts`.
- Lab docs: `EVALUATION-PLAN-v2.md`, `BENCHMARK-v2.md`, `BENCHMARK-v1.md` §2, `PHASE-2-PLAN.md` §1.
- Table docs: the changed parts of `DECISIONS.md`, `BACKLOG.md`, `IMPLEMENTATION-STATUS.md`, `ACCEPTANCE.md` and `CLAUDE.md`.
- Evidence: `evaluation-56eafe4/*`, `review/REVIEW-ROUNDS.md`, `ROUND-3-REPORT.md`, `isolation-audit/audit-output.txt`, and the prepared provenance patch in `evidence/2026-10-09-verify-bca110e/lab-reconciliation/`.
- Fixtures: all three ingredient sets, including `holdout-v2.jsonl`, and `FREEZE-v2.json`.

**Ran.** Every command is from `packages/recipe-extraction` unless it says otherwise.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npx vitest run --config vitest.config.ts` | exit 0. 46 files passed and 1 skipped. **1917 tests passed, 11 skipped** (1928). |
| `npx vitest run … tests/legacy tests/parity --reporter=json` | exit 0. 499 passed and 10 skipped. **The `tests/legacy` files pass 459 tests.** |
| `npx vitest run … tests/semantic --reporter=json` | exit 0. **893 passed.** |
| `npm run bench -- --split every --pages --out-json …` (run twice) | exit 0 both times. The JSON SHA-256 was `afc55fd5b8f0…1e4a` both times. **This equals `evaluation-56eafe4/benchmark-report.json`.** |
| `npm run bench -- --out-json default.json` | exit 0. It scored 310 lines (dev and holdout-v1), with no holdout2 set and `holdout2Freeze: null`. |
| `npm run lab -- line --engine semantic-v1 "a half-cup milk"` | exit 0 |
| `tsx recompute.ts <set> <engine>` (9 runs) | Recomputes the outcomes independently. It imports engines, `UNIT_REGISTRY` and the validator only, and nothing from `bench/*`. |
| `tsx probe.ts semantic-v1` and `tsx probe.ts legacy-table-import-2` | My 748 probes, classified against my own labels |
| `tsx kcheck.ts`, `sec4.ts`, `cat4.ts`, `postnoun.ts` | K1–K4, the §3 and §4 reproductions, category variants |
| `tsx hostile.ts`, `net.ts`, `scorer-probe.ts` | Hostile inputs plus 100 000 fuzz lines, the safety-net fallback, and a scorer edge case |

**Git checks**
- `git diff 8c9fd8c 0c0c60f -- src migrations scripts deploy tests public package.json package-lock.json tsconfig.json vitest.config.ts playwright.config.ts next.config.* .github .gitignore`
- `git diff 56eafe4 0c0c60f -- packages/recipe-extraction`
- `git diff d466bc2 0c0c60f -- packages/recipe-extraction/src …`
- `git patch-id` on the applied commit `034f2c3` and on the prepared patch.

## Verdict

**There are no blockers. As a record of the Phase 2 lab, the branch is sound.**

- Every number in `BENCHMARK-v2.md` §1–§5 that I checked reproduces exactly from the fixtures and the engine's own output, using my own scorer. The evaluation JSON is byte-reproducible at this head.
- In the package, the legacy engines, the baseline snapshot, `DEFAULT_ENGINE_ID` and the public API are unchanged (the validator widening is the documented exception). The provenance patch is correct and weakens nothing.
- No app code, tests or root configuration differ from `main`.
- The engine never throws, every output is valid, and it is deterministic on hostile input.

**But `semantic-v1` still produces silent ready-but-wrong readings outside the recorded defect list.** My new probes found three new silent shapes and one review-only variant:
- an `x` multiplier without a package size (`1x cup milk` → ready, 1 `each`, name "x cup milk", which is S3);
- nutrient lines outside the fact vocabulary (`Vitamin C: 15 mg` → ready, S8+S1);
- rating text (`4.8 stars (120 reviews)` → ready, S8);
- a three-way comma choice that drops its first option (`pecans, walnuts, or almonds` → alternatives [walnuts, almonds]). This one is at review.

Two of the recorded categories are also wider than the docs say:
- count nouns after the food are kept in the name for about 10 nouns by design, not just for `pod`/`rib`;
- three-way comma choices give S5 in 5 of 5 of my probes.

**Two scorer details disagree with its own plan or its own interpretation:**
- the pre-registered "bare no-amount" sensitivity excludes 23 lines, where the plan says 29;
- a line in class CE still receives S codes.

Neither changes any reported acceptance figure.

## Findings

### BLOCKER

None.

- No number in a report is wrong.
- No guarantee is broken.
- There is no app change.
- No headline output of the scorer is incorrect. The two scorer issues below are latent or informational.

### SHOULD-FIX

**SF-1. New silent class in the engine: an `x` multiplier without a package leaves "x <unit>" in a ready name and counts it as `each`.**

Where: `src/ingredient/semantic/amount.ts:444-452`. The `x` branch only accepts a following mass or volume amount, or a set of dimensions; anything else reaches `break`. Nothing rejects a unit word that ends up inside a ready name. K1 has the same root cause.

| Input | Actual | Expected (§7.3) | Class |
|---|---|---|---|
| `1x cup milk` | ready, 1 `each`, name "x cup milk" | ready, 1 `cup`, "milk" | **C2 high, S3** |
| `1x can chickpeas` | ready, 1 `each`, "x can chickpeas" | 1 `can`, "chickpeas" | C2 high |
| `2x cans chickpeas` | ready, 2 `each`, "x cans chickpeas" | 2 `can`, "chickpeas" | C2 high |
| `1 x can chickpeas` | ready, 1 `each`, "x can chickpeas" | 1 `can`, "chickpeas" | C2 high |
| `3x eggs` (debatable) | ready, 3 `each`, "x eggs" | 3 `each`, "eggs" | C2 medium |

Lines with a package size work: `2x 400g tins tomatoes` and `2 x 15 oz cans beans` are both C1.

Fix: record this as a known defect alongside K1–K4.

**SF-2. K3 (nutrition facts read as ingredients) is wider than recorded.**

Where: `src/ingredient/semantic/lexicon.ts:343-354`. A fact line is refused only when every word of its label is in `NUTRIENT_WORDS`, and that vocabulary has no vitamins, minerals or caffeine. Both `ROUND-3-REPORT.md` ("abbreviated forms are correctly refused") and `BENCHMARK-v2.md:85-87` describe K3 as "spelled-out units".

| Input | Actual | Expected | Class |
|---|---|---|---|
| `Vitamin C: 15 mg` | ready, 15 `mg`, "Vitamin C" | unsupported | C2 high, S8+S1 |
| `Magnesium: 40 mg`, `Zinc 1 mg`, `Caffeine: 95 mg` | ready, same shape | unsupported | C2 high, S8+S1 (each) |
| `4.8 stars (120 reviews)` | ready, 24/5 `each`, "stars" | unsupported | C2 high, S8+S1 |
| `Vitamin D: 2 mcg` | needs_review, 2 `each`, "mcg" | unsupported | C8, S1 |
| `Serving size: 2 cookies` | needs_review, 2 `each`, "cookies" | unsupported | C8, S1 |
| `5 from 3 votes` | needs_review, 5 `each`, "from" | unsupported | C8, S1 |

The abbreviated nutrients that are in the vocabulary are refused correctly: `Protein: 20 g`, `Iron: 2 mg`, `Sugars: 5 g`, `Potassium 400mg`, `Fat 10 g`.

Fix: widen the K3 entry in `BENCHMARK-v2.md` §4, `IMPLEMENTATION-STATUS.md:83` and `BACKLOG.md:45`.

**SF-3. `BENCHMARK-v2.md:74` understates the count-noun category.**

It says "Count noun after the food not recognised for `pod`/`rib`". In fact this is deliberate engine policy (`lexicon.ts:115-122`): only clove, stalk, sprig, slice, fillet, link, ear and bulb are read after a food, and the comment explicitly keeps ribs, strips, wedges, heads, sticks, leaves, pods, cubes, sheets and pieces in the name.

That policy conflicts with CONTRACT-v1 §7.3 as the holdout-v2 labels apply it (0054, 0065, 0072). Every such line is C2 high.

- `4 lemon wedges` → ready, 4 `each`, "lemon wedges". The label convention gives 4 `wedge`, "lemon".
- The same happens for `2 cinnamon sticks`, `2 bacon strips`, `2 lettuce heads` and `3 vanilla bean pods`.
- `postnoun-out.txt` shows 35 shapes; 25 of them stay `each`, including loaves, balls, sheets, cubes, cans, packets, bunches and blocks.

Fix: either name this as a policy conflict covering all of these nouns, or reconcile CONTRACT §7.3 with the engine.

**SF-4. Three-way comma choices: the §4 category generalises, and a second variant drops the first option.**

Where: `src/ingredient/semantic/engine.ts:523-537`.

- S5 shape (as with 0219). All five probes give needs_review with the first item as the name and the rest in the note, which is S5:
  - `2 cups spinach, kale, or chard` → name "spinach", note "kale or chard";
  - `1 tsp thyme, rosemary, or oregano`;
  - `2 tbsp butter, ghee, or oil`;
  - `1 lb chicken, pork, or tofu`;
  - `1 cup milk, cream, or half-and-half`.
- New variant, from the "members" branch at `engine.ts:531`. A plural first item is treated as a category and dropped:
  - `1 cup pecans, walnuts, or almonds` → alternatives [walnuts, almonds];
  - `1/2 cup raisins, cranberries or cherries` → [cranberries, cherries].

  These are needs_review (C5b), but the reviewer is offered a choice list without the first ingredient written. Compare `1 cup pecans or walnuts or almonds`, which is C5a with all three options.

Fix: record the dropped-option variant next to the invented-option shape.

**SF-5. Scorer: pre-registered sensitivity (b) does not implement the plan.**

- `EVALUATION-PLAN-v2.md:120` pre-registers it as "without the bare no-amount lines (29 of 69 needs_review labels; 17 share one construction)".
- `bench/outcomes.ts:419-424` (`BARE_FOOD_TAGS` / `isBareFoodNeedsReview`) selects by category tag and excludes 23.
- 29 is correct for "label quantity, unit and alternatives all null"; I checked this at `c106df2`, `363cf6e` and `46a6547`.
- The six lines it misses are ing-h2-0158 `salt ($0.01)`, 0186 `fresh cilantro (optional)`, 0207 `crusty bread, sliced`, 0208 `Pickled jalapeños (from a jar)`, 0209 `large eggs` and 0350 `jalapeño pepper`.
- The evidence report prints "23 excluded … 46 kept" (`benchmark-report.md:1568/1868/2168`).

This is informational only. No acceptance figure is affected, and `BENCHMARK-v2.md` does not cite it.

Fix: either implement the plan's definition or log the deviation in the plan's change log.

**SF-6. Scorer: a line in class CE still gets S codes, contrary to its own `INTERPRETATION`.**

- `bench/outcomes.ts:33` says that "Such a line gets no C1–C8 class and no S code".
- But `bench/outcomes.ts:120` only skips S codes when the status is `"error"`, not when it is `"invalid"`.
- Reproduction (`scorer-probe.ts`): `classifyLine({label needs_review, quantity null}, {status: "bogus", quantity 1 cup})` → outcome `CE`, severe `["S1"]`.

This has no effect on any reported figure: CE = 0 for every engine and set.

### NIT

- **N-1. "Never touches holdout-v2" is not literally true.**
  - The wording is at `BENCHMARK-v2.md:146` and `README.md:21`; the test name at `bench/__tests__/holdout2.test.ts:300` says "never loads".
  - A default `npm run bench` reads `holdout-v2.jsonl` through `checkInvariants`: a URL scan (`bench/invariants.ts:150`), a per-line provenance JSON parse (`:115`) and the freeze hash (`:159`).
  - It never runs an engine on that file, never reports it, and prints nothing from it unless an integrity check fails.
  - Only the wording needs to change; the plan's guarantee ("scored only with …") holds.
- **N-2. The A6 evidence is weaker than it reads.** `BENCHMARK-v2.md:46` cites "CE = 0" as evidence that every output validates. CE only checks the status string, and the bench never calls `validateParsedIngredientV1`. I confirmed separately that there are 0 invalid outputs for all 3 engines × 669 lines, and that the safety net is never used on holdout-v2.
- **N-3. `CONTRACT-v1.md:84` is stale.** It says "Table's `EXTRACTOR_VERSION` (`table-import-2`) is unchanged until the Phase 3 adapter". `main` already has `table-import-3` (`src/server/commands/imports.ts:21`), as `README.md:6` states.
- **N-4. `README.md:31` is stale.** "parity-tested against the live Table modules" no longer holds for the ingredient line: that live parity is skipped (all 9 tests in `tests/parity/ingredient-line.test.ts`), and the snapshot is the guard.
- **N-5. The DECISIONS lab section is inconsistent.**
  - `DECISIONS.md:211` sits under the heading "Phases 0–2" and contains D125, but says "Bounded to Phase 0 … and Phase 1".
  - The renumbering notes at `DECISIONS.md:210` and `PHASE-2-PLAN.md:16` say "D118–D121". At `9300013` the Phase 2 decision was D122, now D125, so it is left out.
  - The references themselves are otherwise consistent (see Confirmed).
- **N-6. Hostile-input oddities.** All of these outputs are valid; none is a validator issue.
  - `1 cup`, given as literal backslash text, → ready, 31 `cup`, name "\u".
  - `1 cup <b>flour</b>` → ready, name "<b>flour</b>".
  - A lone surrogate is kept in a ready name: `1 cup \udfff flour`.
  - Decomposed `2 jalapeños` → needs_review (`unclassified`), because there is no NFC normalisation.
  - `▢ 1 cup sugar`, the WP Recipe Maker checkbox, → C3c abstention, while `• 2 eggs` is read correctly.
- **N-7. Ready readings on lines whose label is debatable**, recorded for awareness:
  - `1 cup raw sugar` and `1/4 cup raw honey` → ready "sugar"/"honey" with form raw. Contract §7.6 moves "raw" into form even when it names a product.
  - `1 pound cake` → ready, 1 `lb`, "cake".
  - `2 baking sheets` → ready, 2 `each`. This is equipment.
  - `1 recipe pie dough (see below)` → ready, "recipe pie dough".
  - `1 sleeve saltine crackers` → ready, "sleeve saltine crackers".
  - `1 bar dark chocolate` → ready, "bar dark chocolate".
- **N-8. A local git ref is stale.** In `/home/user/Meal-Planner`, `origin/main` points at `cb7b56e`, so `git diff origin/main...0c0c60f` there lists main's own import-overhaul files. Against `8c9fd8c`, the PR base, the diff is clean. This is an environment note.
- **N-9. A minor presentation point in `BENCHMARK-v2.md:79`.** It says "12 (+ 0087 above = 13 C3)", but its sub-class tally (5 C3a, 6 C3b, 2 C3x) already includes 0087.

## Probe statistics (`semantic-v1`, my own labels from CONTRACT §7)

**Probe set**
- 748 probe lines in `probes.tsv` (inputs, labels, `D` = debatable, `K` = known category).
- 641 of them are new: not in any fixture, any review or audit probe file, or any `tests/semantic` string.
- Labels: 535 ready, 114 needs_review, 99 unsupported. 67 are marked debatable, leaving 681 firm.
- Outputs: `probes-out-semantic-v1.{txt,json}`.

**Integrity:** 0 invalid outputs, 0 safety-net uses and 0 nondeterministic readings.

| | All 748 | Firm 681 |
|---|---|---|
| C1 | 483 | 472 |
| **C2** | **40 (35 high, 5 medium)** | **25 (21 high, 4 medium)** |
| C3 (C3a / C3b / C3c / C3x) | 31 (16 / 7 / 2 / 6) | 18 |
| C4 | 0 | 0 |
| C5 (C5a / C5b) | 108 (86 / 22) | 84 |
| C6 | 0 | 0 |
| C7 | 61 | 60 |
| C8 | 25 | 22 |
| S1 | 16 | 13 |
| S2 | 2 | 2 (K1) |
| S3 | 5 | 3 (K1 ×2, `1x cup milk`) |
| S4 | 6 | 0 (all 6 are the debatable "amount inside a remark" shape, as in 0165/0338) |
| S5 | 5 | 5 (three-way comma choices) |
| S6 | 1 | 0 (K2 variant, debatable) |
| S7 | 3 | 0 (raw sugar, raw honey and pound cake, all debatable) |
| S8 | 13 | 10 |

**The 25 firm C2 lines by cause**

| Cause | Count | Lines |
|---|---|---|
| K3 and its extension (SF-2) | 9 | 5 known K3 shapes; Vitamin C, Magnesium, Zinc, Caffeine |
| Count noun kept after the food (SF-3) | 5 | lemon wedges, cinnamon sticks, vanilla bean pods, bacon strips, lettuce heads |
| `x` multiplier (SF-1) | 4 | `1x cup milk`, `1x can chickpeas`, `2x cans chickpeas`, `1 x can chickpeas` |
| Size word after a weight (§4 0164 category) | 4 | small red potatoes, medium potatoes, large shrimp, jumbo sea scallops; all medium |
| K1 | 2 | half-gallon, quarter-teaspoon |
| Rating text (SF-2) | 1 | `4.8 stars (120 reviews)` |

These have no firm failures: ranges (21 of 21 C5, never collapsed), oz vs fl oz (25 of 25 C1), nested brackets (10 of 10), restatements (76 of 77), package shapes (68 of 73 C1; the rest are at review).

**The legacy engine on the same probes**, for context: firm C1 156, C2 56 (40 high, 16 medium), C3 300; S3 11, S4 7, S2 2, S7 1.

**Hostile inputs and fuzzing (`hostile-out.txt`)**
- 83 hostile inputs: non-strings, NUL, bidi characters, lone surrogates, 100 000- and 1 000 000-character lines, 5 000-deep brackets, `1/0`, `1e3`, `-1`, `10001 g`, prototype keys.
- 100 000 fuzz lines.
- Result: 0 throws, 0 invalid outputs, 0 safety-net uses, 0 nondeterministic readings. The slowest line took 14.6 ms.
- The `guardedParse` fallback is valid for throwing and for broken readers on 14 hostile inputs (`net.ts`).

## Confirmed

1. **The candidate code is unchanged since the evaluated commit.** `src/ingredient/semantic/**`, `tests/semantic/**`, `tests/characterization/**`, `bench/**` and `fixtures/**` are byte-identical between `56eafe4` and `0c0c60f`. In the package only `CONTRACT-v1.md` (§11 item 2), `README.md` and `src/legacy/PROVENANCE.json` changed.
2. **The legacy engines and baseline are intact.**
   - The 5 legacy copies hash to their `copySha256` values in PROVENANCE.
   - The live `url.ts`, `jsonld.ts` and `units.ts` still equal their baselines.
   - `tests/parity/baseline-snapshot.json` last changed in `f62dbdf`, before Phase 2.
   - Since `d466bc2`, `src/legacy/` changed only in `PROVENANCE.json` `liveTableObserved`.
3. **The default engine and the public API are unchanged.**
   - `DEFAULT_ENGINE_ID` is still `legacy-table-import-2`.
   - `index.ts` adds only `SEMANTIC_ENGINE_ID`, and `ENGINES` gains only the `semantic-v1` key.
   - `contract.ts` has only a doc-comment change.
   - No export was removed or retyped.
4. **The validator change matches the contract.** Equivalents now accept mass, volume or count, and refuse imprecise units; `packageSize` stays mass or volume (`validate.ts:106-116`, CONTRACT §11.1, §2.1).
5. **The provenance patch is correct and weakens nothing.**
   - The recorded hash `4eba6151…0e28` is the SHA-256 of `src/server/integrations/recipe-import/ingredient-line.ts` at the head, which equals `8c9fd8c`.
   - The patch-id of `034f2c3` equals that of the prepared patch, so it was applied unchanged.
   - The guard still accepts exactly the baseline or one recorded later version. The `8e6bd6e` hash is no longer accepted and survives only in the note.
6. **No app code changed.**
   - `git diff 8c9fd8c 0c0c60f` touches only `CLAUDE.md` (one documentation line), `docs/table/**` and `packages/recipe-extraction/**`.
   - Nothing changed in `src`, `migrations`, `scripts`, `deploy`, `tests`, `package*.json`, `tsconfig.json` or the vitest, playwright and next configs.
   - The root tsconfig and vitest include patterns exclude `packages/`.
   - No app file imports the package.
7. **My independent recomputation matches every `BENCHMARK-v2.md` §1 cell I checked**, for all three engines on dev, holdout-v1 and holdout-v2.
   - semantic-v1:
     - C1 254/271 (93.7 %, 90.2–96.0);
     - C2 6 (5 high, 1 medium);
     - C3+C4 13/271 (C3a 5, C3b 6, C3x 2);
     - C5 67/69, C7 16/19, with C8 = 0286, 0288 and 0297;
     - S3 = 0087, S4 = 0165 and 0338, S5 = 0219, S6 = 0087, so 4 severe lines;
     - field accuracy: name 260, quantity 266, unit 265; the quantity lower bound is 95.8 %;
     - by source: 223/240 and 31/31.
   - Legacy:
     - C1 73/271 (22.0–32.5);
     - C2 21 (11 high, 10 medium);
     - C3+C4 177, of which C3b 153;
     - S3 5;
     - fields 97, 123 and 99.
   - Dev and holdout-v1 cells match for both engines.
   - The sensitivities 254/270 and 250/266 match the evidence.
   - There are no disagreements.
8. **The A1–A5 statuses in the JSON match `BENCHMARK-v2.md` §2:** A1–A4 not met, A5 met. The 459 legacy tests and the CE = 0 figure cited for A6 are confirmed.
9. **The scorer matches the plan apart from SF-5 and SF-6.** Outcome classes, sub-class order, S1–S8, severity, accepted-vs-strict matching, point tests in exact integers, the unrounded Wilson lower bound with z = 1.959963984540054 and A2 "whatever the status" all match plan §4–§6 and change-log reading 1.
10. **Holdout-v2 is opt-in.** The default and `--split all` score dev and holdout-v1 only, and holdout-v2 is scored only with `holdout2` or `every`. The test at `holdout2.test.ts:300` passes.
11. **The documented shapes reproduce.**
    - K1–K4 reproduce exactly as recorded: 6, 14, 11 and 6 lines (`kcheck-out.txt`).
    - The `BENCHMARK-v2.md` §3 rows reproduce for both engines.
    - Every §4 row reproduces case by case (26 holdout-v2 ids, `sec4-out.txt`).
    - The 0164, 0219 and 0165 categories reproduce on new variants (`cat4-out.txt`).
12. **The pesto test is a normal passing test.** There is no `it.fails`, `.todo` or `.skip` in `tests` or `bench`; the 11 skips are live parity (10) plus one CLI case.
13. **The `BENCHMARK-v2.md` §6 figures are correct.**
    - 305 synthetic lines with 253 distinct constructions (at most 2 per construction), and 54 repository inputs.
    - The freeze SHA-256 `793507a4…` matches the file.
    - The isolation audit covered 559 probe lines and found 12 exact matches.
14. **Documentation claims hold.**
    - "Safe" appears in the lab docs only at `BENCHMARK-v1.md:51`, describing its removal.
    - No document claims that users have the fix or that the app uses the package (`BENCHMARK-v2.md:3,68,139`, `IMPLEMENTATION-STATUS.md:83`, D125, `README.md:5,47`).
    - D121–D125 and B32–B34 are used consistently in `DECISIONS.md`, `BACKLOG.md`, `IMPLEMENTATION-STATUS.md`, `NEXT-PROMPT-PHASE-2.md`, `PHASE-2-PLAN.md` and `PHASE-3-DEPENDENCIES.md`. `CLAUDE.md` cites no lab numbers. The counts in D123 (459) and D125 (893) are correct.

**Not verifiable here:** `59756ba` and `556c28b` (the author's copy) are not in this repository, so I could not check that `59756ba` and `56eafe4` are code-identical.

## Files in this folder

- **Probe inputs and labels:** `probes.tsv`.
- **Probe outputs:** `probes-out-semantic-v1.{txt,json}`, `probes-out-legacy-table-import-2.{txt,json}`, `summary-semantic.json`.
- **Recomputation:** `recompute.ts` and `recompute-*.json`.
- **Spot checks:** `kcheck.ts`/`kcheck-out.txt`, `sec4.ts`/`sec4-out.txt`, `cat4.ts`/`cat4-out.txt`, `postnoun.ts`/`postnoun-out.txt`.
- **Hostile input, safety net and scorer edge case:** `hostile.ts`/`hostile-out.txt`, `net.ts`, `scorer-probe.ts`.
- **Benchmark runs:** `every-{1,2}.json`/`.md` and `bench-every-{1,2}.txt` (with holdout-v2), `default.json` and `bench-default.txt` (default split).
- **Test runs:** `typecheck.log`, `vitest.log`, `vitest-legacy.json`, `vitest-semantic.json`.
- **Provenance patch comparison:** `applied.diff`, `prepared.diff`.
