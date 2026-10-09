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

## Round 3 — candidate `59756ba` (author fix round on top of `556c28b`; ported to the repository as `56eafe4`)

Full report: `ROUND-3-REPORT.md` (verbatim; delivered 22:52Z, before the holdout-v2 run). Probes: `probes/m*.txt`
(291 new lines), `probes/cmp.py`.

Verdict: **fine to port and score, with four known defect groups expected to fail A3/A4 if the holdout contains
them.** N1–N8 and SF-c–SF-h fixed and generalising on new probes. Among the round-1 807 probes: 0 silent ready-but-wrong
lines (round 1: ≈ 69). On 291 new probes: 12 silent ready-but-wrong, 17 S-coded at review status, 24 invented
alternative sets (review only), 4 C3. Every probe (807 + 454 + 291) parsed twice gave identical, valid JSON; 200 000
fuzz lines: 0 throws, 0 invalid. Only `src/ingredient/semantic/**` and its tests changed; legacy engines, validator,
bench and fixtures untouched; default engine unchanged.

Known defects (recorded, **not fixed** — the stopping rule ended author rounds here; none was passed to the author):

| | Shape | Error | Since |
|---|---|---|---|
| K1 | unit hyphenated to a fraction word: `a half-cup milk` → 1 `each`, name "half-cup milk" | S2 + S3, ready | `c3c7595` |
| K2 | package weight with a restatement before the container: `400g (14oz) can chopped tomatoes` → 400 g, "can" in the note | S6 + S3 (+ S1), review | `c3c7595` |
| K3 | nutrition facts with spelled-out units: `Protein: 20 grams` → ready 20 g | S8, ready | regression vs `556c28b` |
| K4 | number-word product names without an amount: `Five spice powder` → 5 `each`, "spice powder"; `You will need: 2 baking sheets` → q 2 | S1, review | regression vs `556c28b` |

Should-fix (review lines only): invented alternatives from a one-word option sharing the last option's head (`1 lb ham
or smoked turkey` → "ham turkey"; 24 probes) and three comma choices downgraded; exact within-system restatement check
sends `1/3 cup (5 tbsp) butter` to review; `1 pint milk (UK)` ready; `1 m sausage` ready; normalization now removes
joiners/soft hyphens between letters, beyond CONTRACT §2's wording (recorded in CONTRACT §11 item 2 by the coordinator).
