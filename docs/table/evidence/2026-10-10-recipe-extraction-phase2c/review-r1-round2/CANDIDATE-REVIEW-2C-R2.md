# R1 — Phase 2C targeted review, round 2 of 2 (gate round): `semantic-v3` at `3372dfb`

Read-only. Fresh clone `/home/user/rx2b-r1/review7/repo` at `3372dfb`. Nothing edited, committed or pushed. Labels written
from CONTRACT §7/§12/§12.A/§13 before any engine run; four labels were corrected afterwards as my own errors (§7).
Classifier: my own (HIGH = C2 high or any S1/S3/S4/S5/S6); nothing from `bench/`. Every probe parsed twice, validated,
and also run on `semantic-v3` at `b0dea38` (round-1 candidate, from my review6 clone) for regressions.

## Files

`probes-r7-new.tsv` (617 probes: 582 firm, 35 debatable; same columns as `probes-r4-new.tsv`), `probes-r7-excluded.txt`
(32 exact-exposed, 172 near-duplicates), `RESULTS-new.md`, `out-new/probe-results.json`, `fuzz-100k*.txt`, `worst-case.txt`,
`package-tests.txt`, `scripts/` (`fresh7_def.py` labels, `exposed7.py` dedupe, `run7.ts`, `part7.js`, `subfam7.ts`, `adhoc.ts`).
Dedupe as round 1, now also against `probes-r6-new.tsv` and the regenerated 2C corpus (4 220 lines).

## 1. Results by family (firm)

| family | n | C1/R | C5 ok/A | C7/U | **safe abst./U** | HIGH (Wilson 95 %) | burden f / m / other |
|---|---|---|---|---|---|---|---|
| A remarks with another measured food (new verbs, `plus` another food) | 24 | – | 24/24 | – | – | 0 [0–13.8] | – |
| A controls | 13 | 13/13 | – | – | – | 0 | 0 |
| B `and` lists with multi-word complete foods | 18 | – | 14/18 | – | – | **3** = 16.7 % [5.8–39.2] | – |
| B fixed compounds (over-fire test) | 10 | 9/10 | – | – | – | 0 | 0 / 0 / 1 |
| B choices | 7 | – | 7/7 | – | – | 0 | – |
| C measure slot, new nouns | 42 | – | 32/42 | – | – | **7** = 16.7 % [8.3–30.6] | – |
| C over-fire tests: count-of-one compounds, participle agents, adjectives inside names, brand + food | 39 | 26/39 | – | – | – | 0 [0–9.0] | 8 / 2 / 0 |
| C equipment / household (brands, materials, animals) | 56 | – | – | 30/56 | **26/56** | 0 [0–6.4] | – |
| C purpose words that are food | 6 | 6/6 | – | – | – | 0 | 0 |
| C dish names with vessel heads | 4 | 4/4 | – | – | – | 0 | 0 |
| C sloppy singulars / non-food singulars | 3 | 0/1 | – | 2/2 | 0 | 0 | 1 / 0 / 0 |
| D sizes before / undeclared containers | 13 | 1/1 | 6/12 | – | – | **6** = 46.2 % [23.2–70.9] | – |
| D declared spellings | 14 | 14/14 | – | – | – | 0 | 0 |
| **K everyday controls** (counted and measured) | **216** | 213/216 | – | – | – | **0** [0–1.7] | 1 / 0 / 1 |
| **K less-common valid foods** | **119** | 119/119 | – | – | – | **0** [0–3.1] | 0 |
| **all** | **582** | 408/422 | 83/102 | 32/58 | **26/58** | **16** = 2.7 % [1.7–4.4] | 10 / 2 / 2 |

C4/C6 (food rejected) 0; CE 0; safety net 0. Safe abstentions (C8, no amount) are not counted as correct rejections.
**Regressions vs `b0dea38`: 1** — `1 jar sweet chili and garlic sauce` (C1 → review; the new complete-first-conjunct
rule over-fires on a fixed sauce name; safe).

## 2. Every firm HIGH line (16)

| # | line | `semantic-v3` | family |
|---|---|---|---|
| 1 | `2 tbsp Worcestershire and hot sauce` | ready 2 tbsp "Worcestershire and hot sauce" [S4] | `and` list |
| 2 | `1 tbsp garlic powder and onion powder` | ready 1 tbsp as one name [S4] | `and` list |
| 3 | `1 lb shrimp and bay scallops` | ready 1 lb as one name [S4] | `and` list |
| 4 | `1 cloud meringue` | ready 1 each "cloud meringue" [S1 S4] | food/modifier noun as a measure |
| 5 | `1 Cloud Meringue` | ready 1 each [S1 S4] | idem (Title Case) |
| 6 | `1 tidbit smoked trout` | ready 1 each "tidbit smoked trout" [S1 S4] | idem |
| 7 | `1 Tidbit Smoked Trout` | ready 1 each [S1 S4] | idem |
| 8 | `3 tidbits smoked trout` | ready 3 each "tidbits smoked trout" [S1 S4] | idem (count above one) |
| 9 | `1 glaze honey` | needs_review **with 1 each** pre-filled, name "glaze honey" [S1] | idem (invented count on a review line) |
| 10 | `1 gourd sake` | needs_review **with 1 each**, name "gourd sake" [S1] | idem |
| 11 | `1 kg tote apples` | ready 1 kg "tote apples" [S1 S4] | size before an undeclared container |
| 12 | `2 lb basket peaches` | ready 2 lb "basket peaches" [S1 S4] | idem |
| 13 | `1 L flagon cider` | ready 1 l "flagon cider" [S1 S4] | idem |
| 14 | `250 ml vial vanilla extract` | ready 250 ml "vial vanilla extract" [S1 S4] | idem |
| 15 | `20 oz growler kombucha` | ready 20 oz "growler kombucha" [S1 S4] | idem |
| 16 | `1 lb hamper mixed nuts` | ready 1 lb "hamper mixed nuts" [S1 S4] | idem |

Debatable, not counted: `1 crisp prosciutto` (ready 1 each), `1 cotton candy grape bunch` (1 bunch "cotton candy grape").
Labels: §13.4 (lists), §13.2 (measure slot, name = the food, no amount), §13.2 precedence over §12.3 (a size before an
undeclared container → `needs_review`, no amount).

## 3. Gate classification (PHASE-2C-PLAN §4.6 (c))

- **Firm HIGH among the clean-food controls: 0** (0/216 everyday, 0/119 less common; 0/335 = 0.0 % [0–1.1]).
- **Structural families and their firm HIGH counts:**

| structural family | firm HIGH | ≥ 2? |
|---|---|---|
| size (weight/volume) before an undeclared container or vessel noun | **6** (tote, basket, flagon, vial, growler, hamper) | **yes** |
| food or modifier noun as a measure before a food (count of one, also plural) | **7** (cloud ×2, tidbit ×3, glaze, gourd) — 7/14 of such lines; other new nouns 0/28 | **yes** |
| `and` list of two complete multi-word foods | **3** (Worcestershire and hot sauce, garlic powder and onion powder, shrimp and bay scallops) | **yes** |
| remark bringing in another measured food | 0 | no |
| choices | 0 | no |
| equipment / household / animal-named tools | 0 | no |
| purpose words that are food; dish names with vessel heads | 0 | no |
| count-of-one compounds, participle agents, brand + food (over-fire) | 0 HIGH (10 burden) | no |
| declared spellings | 0 | no |

**Three structural families have ≥ 2 firm HIGH lines → gate condition (c) is not met** on this round's fresh probes.
Clean-control condition: met (0).

## 4. Code reading: structural or enumeration

- **Rule 6** (noun + describing word + food → measure) is structural and generalises: `1 pile fresh herbs`, `1 tower crisp
  lettuce`, `1 garland fresh bay leaves`, `1 plank smoked salmon`, `1 touch fresh nutmeg`, `1 coin fresh ginger` … all correct.
  Over-fire is real but safe: `1 cedar planked salmon fillet` → name "planked salmon fillet", note "1 cedar".
- **Rule 8** (unknown lower-case noun before a recognised food → measure) is structural and generalises (tuft-, tassel-,
  snippet-, bud-, ration-type nouns all correct). It over-fires on unknown **varieties**: `1 sugarloaf pumpkin` → name
  "pumpkin", note "1 sugarloaf" (C3b, the variety moved out of the name). Safe, but a wrong pre-fill.
- **Rule 7** (portion noun before a whole food) depends on `portionWord`, a list: `tidbit` is not in it, so `1 tidbit smoked
  trout` is read as a modifier. `cloud` is a food word (disclosed as open). Any food/modifier noun not in the portion,
  part, shape, vessel or bottle lists still passes after a count (rule 8 excludes `foodModifierWord`); and rule 2 skips a
  plural that is an ingredient word (`3 tidbits smoked trout`).
- **Invented count on review lines:** `1 glaze honey`, `1 gourd sake` and ad hoc `1 olive oil` go to `needs_review` but keep
  quantity 1 `each` (S1) — the count-of-one liquid / unrecognised-first-noun path pre-fills an amount (owner requirement 2).
- **Sized containers** (`sizedContainerWord`): `NOT_ALIASES`, `PACKAGING_NOUNS`, `SERVING_VESSELS` — lists. Listed nouns
  are right (beaker, tumbler, crate, carton → package size), unlisted ones are read into the name with the weight/volume as
  the amount (tote, basket, flagon, vial, growler, hamper). Weight/volume lines are otherwise not gated (`1 cup
  zorbleberries` ready), so this path stays open by construction.
- **`and` lists:** the "complete first conjunct" check is a lexicon test (`lime juice`, `fish sauce` now right); when the
  first conjunct is not known as a complete product (`Worcestershire`, `garlic powder`, `shrimp`) the A4 shared-modifier
  exception still fires. It also over-fires on a fixed sauce name (`sweet chili and garlic sauce`, regression, safe).
- **Disclosed open paths, confirmed ad hoc:** `1 bag Zorble apples` ready; `1 cup zorbleberries` ready; `1 lemon juice` ready
  1 each; `1 cloud cotton candy` ready 1 each; `1 olive oil` → review with 1 each. Closed since round 1: `1 goose quill`
  (safe), all eight round-1 HIGH lines (`1 knot fresh ginger`, `lime juice and fish sauce`, `750 ml carafe white wine` …).
- **Fitted entries:** the worker's disclosure matches what I see — carafe, glass, flute, goblet, stein, tankard, thermos,
  buttercream, buddha bowl, jacket, overnight came from my round-1 lines; the new families failing here are their
  unlisted neighbours.

## 5. Robustness and compatibility

- Purity: no `node:`, `Date`, `Math.random`, `console`, `process`, `require`, dynamic import, `fetch`, `globalThis` in
  `semantic-v3/*.ts` or `unit-aliases.ts`.
- Fuzz 2 × 100 000 (seeds 20261010, 7): threw 0, safety net 0, invalid 0, nondeterministic 0; p99 0.61 / 0.66 ms, max
  18.4 / 17.1 ms; worst case 19.3 ms (`"(or " × 500`). Probe runs: 0 CE, 0 net, 0 nondeterminism.
- Package: typecheck clean; vitest 101 files passed (1 skipped), 12 143 tests passed, 11 skipped.
- Compatibility: no diff `1d312a8..3372dfb` for v1, `semantic-v2`, legacy, `bench/`, `fixtures/`, `contract.ts`,
  `rational.ts`, `units.ts`, `validate.ts`; `unit-aliases.ts` and CONTRACT unchanged since `b0dea38`;
  `DEFAULT_ENGINE_ID = LEGACY_ENGINE_ID`; no app file changed. `b0dea38..3372dfb` touches only `semantic-v3`, its tests, the
  2C corpus and docs.

## 6. Burden detail

- Everyday: `1 bag tri-color coleslaw mix` (abstention; `tri-color`), `1 butternut squash, about 2 lb` (`quantity_unassigned`).
- Over-fire family (10/39 = 25.6 % [14.6–41.1], all safe): unrecognised modifiers/foods — `tea smoked duck breast`,
  `garlic studded leg of lamb`, `pasture raised chicken`, `ox heart tomato`, `snake gourd`, `ash gourd`, `ivy gourd`,
  `spider steak`; read as a measure — `cedar planked salmon fillet`, `sugarloaf pumpkin`.
- `8 tostone` (sloppy singular of an unrecognised food) → abstention.

## 7. My label corrections (contract-grounded, before reporting)

- `1 ginger glazed salmon fillet`, `1 beer battered cod fillet`: §12.4 (fish by the fillet) → 1 `fillet`, name without
  "fillet". `1 bacon wrapped beef filet` → debatable (cut name vs §12.4).
- `2 cups chopped cooked chicken`: `cooked` → form (§7.6); accepted name `chopped chicken` added.
- `1 pack coffee pods, reusable` and `1 lb ground beef and pork sausage` → debatable (food product name vs equipment;
  list vs "beef-and-pork sausage").
