# Recipe Extraction Lab — Phase 2C plan: bounded repair, conditional fresh evaluation

_2026-10-10, coordinator. Brief: `CLAUDE-PHASE-2C-PROMPT.txt` (owner-authorized, lab-only). Package only: no app change,
no Phase 3, no default change, no deployment, no live provider, external AI or spending. The PR stays a draft._

## 1. Pinned starting state

| | |
|---|---|
| Lab branch | `claude/quirky-gauss-depmd8` at `1d312a84af781b20cdcf1203aa9e4de0a97f0d5e` (equal to origin; full, non-shallow clone) |
| Phase 2B tested commit | `90292c118a895d714131fba3e9916f8883973f53` |
| `main` | `1261cd8f8bc82e9d93eca3472116b13deef10c4a` (unchanged since the Phase 2B merge). The app boundary is measured against the `main` commit pinned at each verification |
| Historical result | Phase 2B: `semantic-v2` on holdout-v3, **G2 FAIL** (`BENCHMARK-v3.md`) |
| Identifiers | `IDENTIFIERS.md`: the lab mints D121–D129 and B32–B39; the next lab decision is D127 |

**Preserved unchanged:**
- engines: `semantic-v1` (`src/ingredient/semantic/`), `semantic-v2` (`src/ingredient/semantic-v2/`) and the legacy engines;
- frozen labels: dev, holdout-v1, holdout-v2 and holdout-v3;
- the freeze records and the exposure audit;
- every scored report and its evidence;
- the Phase 2B regression corpus (`exposed-regressions-2b.jsonl`) and its required harness for `semantic-v2`.

**The new candidate is `semantic-v3`** (`src/ingredient/semantic-v3/`): registered and not the default. It starts as a byte copy of `semantic-v2`.

**Exposure.** Everything published so far is exposed development material:
- every fixture set, holdout-v3 included;
- the regression corpora;
- every review probe;
- the R1 rounds and ad-hoc lines;
- the counterexamples in BENCHMARK-v3 and DISPOSITIONS.

A pass on any of it is a regression result, never generalisation evidence.

## 2. Required finding ledger (written before any code)

Every row is a required regression or a required structural repair. "Firm" means its label is not debatable. Sources:
- H3: the single holdout-v3 run;
- R4: R1's final pre-freeze review of `semantic-v2` (`review5/CANDIDATE-REVIEW-4.md`, `RESULTS-new.md`);
- D: `PHASE-2B-DISPOSITIONS.md`.

### A. Remark amounts of a different food

| Id | Finding | Source | Required behaviour |
|---|---|---|---|
| FL-A1 | `1 tbsp tamarind paste, dissolved in 3 tbsp hot water` read ready (C2 high, S4) | H3 0113 | `needs_review`. Name `tamarind paste`, 1 `tbsp`. The remark is kept in the note with its amount. The water is never merged into the tamarind |
| FL-A2 | generalisation: a preparation remark that brings in a separately measured food (dissolved in / mixed with / soaked in / diluted with / whisked into / plus N of another food) | brief §3A | `needs_review`. Same-food equivalents, package sizes, dimensions (`cut into 1-inch cubes`), same-ingredient compounds (`plus 2 tbsp for dusting`), times and temperatures keep their current readings. No quantity is multiplied, merged or dropped |

### B. Coordinated foods and choices

| Id | Finding | Source | Required behaviour |
|---|---|---|---|
| FL-B1 | `1 cup fresh peas and fava beans` read ready as one name (C2 high, S4) | H3 0140 | `needs_review` with the shared amount kept, name null, no invented proportion. Both identities kept as text (note) |
| FL-B2 | coordinated foods whose names have several words (`sun-dried tomatoes and kalamata olives`) | H3 0221, 0156, 0311 | as FL-B1. Fixed compounds and shared modifiers settled in §12.A A4 stay one food (`salt and vinegar potato chips`, `red and yellow bell peppers`) |
| FL-B3 | `1 head lettuce, romaine or green leaf` invented option `romaine leaf` (C5b) | H3 0120 | options neither fabricated nor truncated (`romaine lettuce`, `green leaf lettuce` per §12.7(f)) |
| FL-B4 | `1 lb cremini or shiitake mushrooms` shared head not distributed (C5b) | R4 | per §12.7(b): `[cremini mushrooms, shiitake mushrooms]` |

### C. Recognised food, unknown measures, equipment (R1 round-4 known risks — required even where holdout-v3 sampled no failure)

| Id | Finding | Source | Required behaviour |
|---|---|---|---|
| FL-C1 | unknown measure nouns read into the name with a count: `cone(s)`, `disc`/`disk`, `stem(s)`, `frond(s)`, `cob`, `thread(s)`, `strand(s)`, `split(s)`, `heel`, `spray(s)`, `blade(s)`, also on Title Case lines (22 HIGH, 29.3 % of fresh measure probes) | R4 | §12.14: a noun in the measure slot that is not a declared unit makes the line `needs_review` with no invented unit or count. This is **structural accounting of the measure slot**, not a longer quoted list |
| FL-C2 | equipment read as food (9 HIGH): brand + vessel/dish homograph (`Le Creuset tagine`, `Pyrex casserole`, `… pâté terrine`), `cow creamer`, `cherry/apple wood chunks`, brand + `pods` (`Tide pods`, `Cascade pods`) | R4 | `unsupported` or a safe abstention (needs_review, no amount); never ready |
| FL-C3 | a tool word in the measure slot: `1 saucepan water`, `1 stockpot water`, `1 wok oil`, `1 colander pasta`, `1 sieve flour` | R4 | never ready with a count of the tool. `needs_review` (§12.14) |
| FL-C4 | a dish name read with a container unit: `4 pots de crème` → 4 `container` "de crème" (S7) | R4 | the name is kept whole (`pots de crème`, 4 `each`) or the line goes to review; never a container |
| FL-C5 | closed-list side effect: `1 salt pig` ready (was safe) | R4 | not ready |
| FL-C6 | the equipment purpose rule makes real food `unsupported` (C4): `300 g fish slices`, `1 lb fish slices`, `6 fish slices, patted dry`, `2 lb pork rib racks`, `1 lamb rib rack`, `1 bag walnut crackers` | R4 | food is never `unsupported` because a word also names a tool's purpose |
| FL-C7 | open structural paths to `ready`: any capitalised word before a food is a brand (`2 Zorble apples`); any `-ed` word is a modifier (`2 glorped apples`); `toolModifier` in the measure slot; any food or modifier word in the measure slot | R4 §5 | each path accounted for structurally. An unrecognised word between the amount and a recognised head → `needs_review` with no amount (owner requirement 2) |
| FL-C8 | review burden on valid foods: unrecognised foods and modifiers (41 of 352 fresh R4 lines), invariant foreign plurals (`4 onigiri`, `20 pelmeni`; 14), hyphenated tool modifiers (`oven-roasted`, `pan-seared`), H3 0089 `1 bunch silverbeet`, 0222 `1 bag shredded four cheese Mexican blend`, 0333 `1 lamb backstrap (about 500 g)` | R4, H3 | reduce without creating a ready path for non-food. Measured and reported separately. Unknown food stays `needs_review` with its text kept, never `unsupported` |
| FL-C9 | safe abstentions | D §4 | 38 in the 2B harness and 3 C8 on holdout-v3: kept visible and reported separately from correct readings and rejections |

### D. Registry and output-contract consistency

| Id | Finding | Source | Required behaviour |
|---|---|---|---|
| FL-D1 | `1 small tub crème fraîche` → ready 1 `container` (C2 high, S4) | H3 0075 | under the current contract `tub` is not a declared unit: `needs_review` (§12.14) |
| FL-D2 | engine-only aliases: `semantic-v2`'s lexicon maps `tub`, `tubs`, `pots` → `container` and `bars` → `block`, which the contract never declares | brief §3D | one declared alias table in the contract layer (`src/unit-aliases.ts`); `semantic-v3` reads units only through it; a **generated**, read-only manifest (`UNIT-ALIASES-v1.md`) with a test that it matches the table. `semantic-v1`/`semantic-v2` keep their historical lists |
| FL-D3 | a canonical container or count is not a known package size | brief §3D | no `packageSize` without a stated size |

### E. Clear-line and detail failures (H3, exposed)

| Id | Finding | Required behaviour |
|---|---|---|
| FL-E1 | 0089, 0222, 0333 valid foods sent to review (see FL-C8) | measured regression |
| FL-E2 | 0197 `2 (1 1/2-inch-thick) bone-in rib-eyes` → review (`quantity_unassigned`) | 2 `each`, note `1 1/2-inch-thick` |
| FL-E3 | 0248 `Garnish (optional): microgreens` → review | ready, `for_garnish`, optional |
| FL-E4 | detail mismatches: 0092 (price annotation → note `bunch`), 0145 (`about` lost), 0229 (`(about 1 cup)` not an equivalent), 0252 (`optional but recommended`), 0277 (`to serve` → note vs `for_serving`) | the label's fields. A lost qualifier or note is a failure even when C1 is unaffected |
| FL-E5 | 0189 `Equipment`, 0314 `Resting time: overnight` → C8 | `unsupported` (§12.8). 0211 `Topping (optional)` is debatable (FL-P2) |

### P. Prospective contract and process

| Id | Finding | Required action |
|---|---|---|
| FL-P1 | the registry's unit words and aliases are not published (R2's structural recommendation; 3 of 5 holdout-v3 disputes) | CONTRACT §13.1 alias rule and the generated manifest, both reviewed by the label checker before any freeze |
| FL-P2 | contract-named debatable shapes (`1 strip steak`, `ice cubes`, `peas and carrots`, …) were counted in the v3 acceptance table (R1's tension note on 0297) | CONTRACT §13.6 and EVALUATION-PLAN-v4: such shapes are not written as firm holdout cases. A case the checker finds debatable is pre-registered, left out of the firm set, and the all-case figure is reported beside it |
| FL-P3 | the mutation summary "45/45 as expected" read as 45 killed | report parser and scorer mutations (KILLED / SURVIVED / ERROR) separately from harness self-test controls |
| FL-P4 | a later rerun with changed provenance pins was called "byte-identical" in places | historical report bytes are preserved; later reruns are "numerically equivalent, pins differ" only where verified |

## 3. Roles (at most two write workers plus read-only reviewers)

| Role | Workspace | Owns | Must not |
|---|---|---|---|
| Coordinator (this session) | main checkout | plan, CONTRACT §13, `src/unit-aliases.ts` + manifest generator, regression corpus 2C and its harness, evidence, docs, PR | write holdout-v4 labels |
| Worker A: implementation | worktree `/home/user/rx2c-impl` (branch `lab2c-impl`), private scratch `/home/user/rx2c-impl-scratch` | `src/ingredient/semantic-v3/**`, `tests/semantic-v3/**`, its registry entry and export | change v1/v2/legacy, `bench/`, fixtures, the contract, the default, the corpus or its harness |
| Reviewer R1 (read-only) | own clone | two targeted review rounds (novel constructions in the named families plus clean-food controls); later, if reached, the independent recomputation | edit anything |
| Label checker R2 (read-only) | private copies | review of CONTRACT §13, the alias manifest and the 2C corpus relabels; later, if reached, the blind holdout-v4 check | see `semantic-v3` code or any candidate output |
| Evaluator (only if reached) | new history-less private workspace `/home/user/rx-eval-v4` | holdout-v4 | see or run any candidate |

## 4. Sequence and stopping rules

1. Ledger (this file), CONTRACT §13, the alias table and manifest, and the 2C regression corpus (every firm row of §2 plus all R4 firm probes and the holdout-v3 firm cases, exposed). Committed before any engine code.
2. R2 reviews §13, the manifest and every 2C relabel. The coordinator adjudicates from the contract text, and logs each decision.
3. Worker A builds `semantic-v3`. All 2C firm regressions must pass; holdout-v3 is reported as exposed only.
4. **Review/repair round 1:** R1 probes the named structural families with novel constructions and vocabulary, plus clean-food controls. A repairs.
5. **Review/repair round 2:** same as round 1. A repairs. No third round is started.
6. **Gate to evaluation** (decided now, not from any score). Holdout-v4 is written only if all of the following hold:
   - (a) every firm 2C regression passes;
   - (b) every firm HIGH line from R1 rounds 1–2 is fixed and in the harness;
   - (c) R1's round-2 review found **no systemic blocker**, meaning:
     - no firm HIGH line among its clean-food controls;
     - no structural family with ≥ 2 firm HIGH lines on its fresh round-2 probes (a family whose reported lines can only be fixed one by one is not closed);
   - (d) the mutation run and the full package suite pass on the final candidate.

   Otherwise the phase **stops before evaluation**, with a precise unresolved-finding report. In that case there is no freeze for evaluation and no holdout-v4.
7. **Only if (6) holds:**
   - freeze the candidate (source, vocabulary, alias table, contract, scorer, EVALUATION-PLAN-v4) by commit and digest;
   - the evaluator writes holdout-v4 in a private workspace;
   - R2 checks it blind, and the coordinator adjudicates from the contract and freezes it;
   - run the exposure audit, one scoring run, and R1's independent recomputation;
   - report G2 PASS or FAIL and stop.

## 5. Reporting rules (from the brief)

- **C1 vs C1+.** C1 is core-field correctness; C1+ is all fields. Neither alone is "fully correct".
- **Gates.** Each gate prints its exact numerator and denominator and is decided by integer comparison.
- **Separate counts.** False-ready lines, every S code, invalid outputs, runtime errors and nondeterminism are each reported on their own.
- **Two more separate counts:**
  - valid-food review burden;
  - non-food safe abstentions, kept apart from correct rejections.
- **Mutations.** Parser and scorer mutations are reported apart from harness self-test controls.
- **Thresholds.** A1–A7 are unchanged.

## 6. Outcome (2026-10-10)

Steps 1–5 ran as planned:
- the ledger, CONTRACT §13, the alias table and the 2C corpus came first; R2's review was adjudicated in `cc285b2`;
- `semantic-v3` build 1 is `b0dea38`;
- R1 round 1 found 0 clean-control HIGH and 2 systemic families (8 HIGH);
- repair 1 is `3372dfb`;
- R1 round 2 found 0/335 clean-control HIGH, but **3 systemic families** (16 HIGH).

**Gate (§4.6 c) is not met. The phase stops before evaluation:**
- no candidate freeze, no holdout-v4 and no acceptance run;
- the optional round-2 repair is not made, because it could not change a gate already decided by the review, and no third review is authorised.

Dispositions: `PHASE-2C-DISPOSITIONS.md`. Verified at `44251ec`.
