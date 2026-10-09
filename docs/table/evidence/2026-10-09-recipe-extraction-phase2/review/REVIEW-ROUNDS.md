# Independent code review of `semantic-v1` — record

Reviewer: a fresh read-only worker confined to the implementation worker's isolated copy (`/home/user/rx-author`,
no holdouts there); findings come from the contract, dev examples, code reading and the reviewer's own probe lines
(`probes/p*.txt` round 1, `probes/n*.txt` round 2; `probe.ts`/`probe2.mts`/`fuzz.ts`/`hostile2.ts` its harness).
No holdout or benchmark output was used by the reviewer or passed to the author.

## Round 1 — candidate `c3c7595` (9 author commits + coordinator registry/validator commit)

Verdict: **not acceptable**. 807 probes + 200 000 fuzz lines: 0 invalid outputs, 0 exceptions, deterministic, fast,
pure, compatible. But ≈ 69 lines were `ready` with a wrong amount/unit/name or a non-ingredient read as one
(≈ S1 6, S2 19, S3 25, S4 10, S7 3, S8 14). Blocker groups B1–B11: superscript mixed numbers glued to the whole
(`1¹⁄₂ cups`), bare count + amount read as a package without a container (`3 4 cups`), a word/bracket between amount
and unit leaving the unit in the name (`2 (heaping) cups flour`), fractions after the unit (`a cup and a half`),
number words inside food names (`Five spice powder`), inch sizes as amounts (`9-inch pie crust`), contradictory
same-dimension restatements accepted (`1 lb (12 oz)`), nutrition/meta lines read as ingredients (`Calories: 250`),
`1'000 g`, trailing distributive `each`, raw line as name on review lines. Should-fix SF1–SF7: untested safety net,
count equivalents dropped (contract §11), dangling `or`, invented alternatives, all-caps foods rejected, a size word
stripped with containers, `11/2`/`1.000` read with confidence.

## Round 2 — candidate `556c28b` (author fix round)

Verdict: **not acceptable yet**. All 69 round-1 ready-but-wrong lines now correct or sent to review; most fixes
generalise on new probes. Regressions/new findings on 454 new probes: N1 a generic "-ed word = preparation" rule
made product choices silently ready (`1 cup sugar (granulated or powdered)`); N2 a thousands rule broke metric package
counts (`2 400g cans chickpeas`, S3); N3 a 12.5 % tolerance accepted contradictory restatements inside one unit system
(`1 lb (14 oz)`); N4 bare numbers after a comma silently noted (`2 eggs, 3`); N5 `a hundred grams flour`,
`1/2-dozen eggs`, `2 heaping spoonfuls sugar`; N6 meta-label rules rejected real ingredients (`Protein powder: 1 scoop`,
`For serving: lemon wedges`); N7 `quarter cup sugar` name = whole line; N8 `12" pizza crust` → 12. Should-fix: invented
or stripped alternatives, a ~100-word food-kind list (`MODIFIER_WORDS`) contradicting the lexicon's "names no food"
claim, `half and half`, `pound cake`, counts inside names, `1.250 g`, `a 3 lb chicken`, joiners merging digits.
Probe deltas: S1 2, S2 ≈ 7, S3 ≈ 12, S4 ≈ 34, S5 0, S6 0, S7 0, S8 0; ≈ 20 real ingredients rejected.

## Round 3 — see the final report (fix round on top of `556c28b`, then re-review)
