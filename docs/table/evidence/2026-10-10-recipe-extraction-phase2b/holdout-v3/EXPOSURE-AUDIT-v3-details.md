# Holdout-v3 exposure audit — details (2026-10-10)

Holdout-v3 cases: 369. Exposed strings: 57972 (23321 from build_exposed_inputs.py).

## Exact matches (primary; sensitivity (d)): 3

| case | input | first source |
|---|---|---|
| ing-h3-0114 | `Kitchen twine` | author scratch |
| ing-h3-0189 | `Equipment` | docs docs/table/evidence/2026-10-10-recipe-extraction-phase2b/candidate-review-r1-round2/CANDIDATE-REVIEW-2.md |
| ing-h3-0276 | `½x 1x 2x` | author scratch |

## Whole-word containment in implementation and reviewer transcripts (supplementary): 7

Agents: `a82c80dc6be685db2` Phase 2B implementation worker (semantic-v2); `a2582ca2e4729c25d` Phase 2 implementation worker (semantic-v1, the base of semantic-v2); `ab8145f44653ce309` reviewer R1 (oracle check, candidate reviews rounds 1-4), before it saw holdout-v3; `ab16000f941f8231e` Phase 2 reviewer of semantic-v1; `aa537718fb2c48c2f` Phase 2 final-head reviewer.

| case | input | input length | agents |
|---|---|---|---|
| ing-h3-0020 | `Grated Parmesan` | 15 | a82c80dc6be685db2, a2582ca2e4729c25d, ab8145f44653ce309, ab16000f941f8231e, aa537718fb2c48c2f |
| ing-h3-0044 | `Romesco` | 7 | a82c80dc6be685db2, ab8145f44653ce309 |
| ing-h3-0079 | `2 cups cubed butternut squash` | 29 | a82c80dc6be685db2, a2582ca2e4729c25d, ab8145f44653ce309 |
| ing-h3-0114 | `Kitchen twine` | 13 | a82c80dc6be685db2, ab8145f44653ce309 |
| ing-h3-0170 | ` ​ ` | 3 | a82c80dc6be685db2, a2582ca2e4729c25d, ab8145f44653ce309, ab16000f941f8231e, aa537718fb2c48c2f |
| ing-h3-0189 | `Equipment` | 9 | a82c80dc6be685db2, a2582ca2e4729c25d, ab8145f44653ce309, ab16000f941f8231e, aa537718fb2c48c2f |
| ing-h3-0276 | `½x 1x 2x` | 8 | a82c80dc6be685db2, ab8145f44653ce309 |
