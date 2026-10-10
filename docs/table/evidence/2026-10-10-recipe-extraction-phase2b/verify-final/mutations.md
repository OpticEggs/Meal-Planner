| Spec | Mutation | File | Expected | Result | As expected | Intended killers failed | Tests failed / run | Why |
|---|---|---|---|---|---|---|---|---|
| tools/mutation/specs/selftest.json | self-noop | bench/outcomes.ts | SURVIVED | **SURVIVED** | yes | 0 | 0/106 | all 106 tests passed |
| tools/mutation/specs/selftest.json | self-syntax-error | bench/outcomes.ts | ERROR | **ERROR** | yes | 0 | 0/0 | test file failed to compile or load: oracles-v3.test.ts: Transform failed with 1 error:; scorer-v3.test.ts: Transform failed with 1 error: |
| tools/mutation/specs/selftest.json | self-missing-anchor | bench/outcomes.ts | ERROR | **ERROR** | yes | 0 | 0/0 | replacement not applied: anchor not found |
| tools/mutation/specs/selftest.json | self-ambiguous-anchor | bench/outcomes.ts | ERROR | **ERROR** | yes | 0 | 0/0 | replacement not applied: anchor occurs 24 times (give "occurrence") |
| tools/mutation/specs/selftest.json | self-missing-file | bench/no-such-file.ts | ERROR | **ERROR** | yes | 0 | 0/0 | replacement not applied: file bench/no-such-file.ts does not exist |
| tools/mutation/specs/selftest.json | self-no-tests-ran | bench/outcomes.ts | ERROR | **ERROR** | yes | 0 | 0/0 | the unmutated baseline is not usable: no tests ran |
| tools/mutation/specs/selftest.json | self-unknown-killer | bench/outcomes.ts | ERROR | **ERROR** | yes | 0 | 8/106 | killedBy test(s) not in this run: no such describe > no such test |
| tools/mutation/specs/selftest.json | self-killed-unexpected | bench/outcomes.ts | KILLED-UNEXPECTED | **KILLED-UNEXPECTED** | yes | 0 | 8/106 | only other tests failed (8) |
| tools/mutation/specs/selftest.json | self-wrong-reason | bench/outcomes.ts | KILLED-UNEXPECTED | **KILLED-UNEXPECTED** | yes | 0 | 8/106 | intended test(s) failed, but not by an assertion matching the intended reason: outcomes v3 hand-calculated oracles > O52 CE invalid output, SF-6: AssertionError: severe: expected [ 'S1' ] to deeply equal [] |
| tools/mutation/specs/selftest.json | self-killed | bench/outcomes.ts | KILLED | **KILLED** | yes | 1 | 8/106 | 1 of 1 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/scorer.json | SCORE-01-revert-tag-heuristic | bench/outcomes.ts | KILLED | **KILLED** | yes | 4 | 5/167 | 4 of 4 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/scorer.json | SCORE-02-revert-s-codes-on-ce | bench/outcomes.ts | KILLED | **KILLED** | yes | 5 | 11/167 | 5 of 5 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/scorer.json | SCORE-02-revert-status-string-validity | bench/outcomes.ts | KILLED | **KILLED** | yes | 5 | 18/167 | 5 of 5 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/scorer.json | SCORE-02-revert-no-nondeterminism-check | bench/outcomes.ts | KILLED | **KILLED** | yes | 3 | 13/167 | 3 of 3 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/scorer.json | SCORE-02-revert-a6-outside-scorer | bench/outcomes.ts | KILLED | **KILLED** | yes | 3 | 6/167 | 3 of 3 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/scorer.json | SCORE-02-revert-ce-field-accuracy | bench/outcomes.ts | KILLED | **KILLED** | yes | 1 | 1/167 | 1 of 1 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/scorer.json | SENS-c-uses-debatable-flag | bench/outcomes.ts | KILLED | **KILLED** | yes | 2 | 3/185 | 2 of 2 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/scorer.json | SENS-d-ignores-audit-ids | bench/outcomes.ts | KILLED | **KILLED** | yes | 2 | 2/185 | 2 of 2 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/scorer.json | CL2a-revert-first-parse-only | bench/outcomes.ts | KILLED | **KILLED** | yes | 2 | 3/167 | 2 of 2 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/scorer.json | CL2b-revert-s6-needs-quantity | bench/outcomes.ts | KILLED | **KILLED** | yes | 1 | 2/167 | 1 of 1 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/scorer.json | CL2c-revert-throws-compare-equal | bench/outcomes.ts | KILLED | **KILLED** | yes | 1 | 3/167 | 1 of 1 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-name-guard-off | src/ingredient/semantic-v2/name.ts | KILLED | **KILLED** | yes | 1 | 8/1194 | 1 of 2 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-multiplier-off | src/ingredient/semantic-v2/amount.ts | KILLED | **KILLED** | yes | 4 | 5/1194 | 4 of 4 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-tolerance-widened | src/ingredient/semantic-v2/amount.ts | KILLED | **KILLED** | yes | 2 | 7/1194 | 2 of 2 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-rounding-allowance-off | src/ingredient/semantic-v2/amount.ts | KILLED | **KILLED** | yes | 2 | 2/1194 | 2 of 2 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-invent-options | src/ingredient/semantic-v2/alternatives.ts | KILLED | **KILLED** | yes | 2 | 83/1194 | 2 of 3 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-count-noun-off | src/ingredient/semantic-v2/name.ts | KILLED | **KILLED** | yes | 3 | 20/1194 | 3 of 3 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-identity-list-off | src/ingredient/semantic-v2/name.ts | KILLED | **KILLED** | yes | 3 | 11/1194 | 3 of 3 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-container-cup-off | src/ingredient/semantic-v2/amount.ts | KILLED | **KILLED** | yes | 2 | 2/1194 | 2 of 2 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-package-units-widened | src/ingredient/semantic-v2/amount.ts | KILLED | **KILLED** | yes | 2 | 2/1194 | 2 of 2 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-nutrition-off | src/ingredient/semantic-v2/classify.ts | KILLED | **KILLED** | yes | 4 | 25/1194 | 4 of 4 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-remark-second-amount-off | src/ingredient/semantic-v2/remarks.ts | KILLED | **KILLED** | yes | 1 | 3/1194 | 1 of 3 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-foreign-unit-off | src/ingredient/semantic-v2/amount.ts | KILLED | **KILLED** | yes | 2 | 2/1194 | 2 of 2 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-fraction-unit-off | src/ingredient/semantic-v2/quantity.ts | KILLED | **KILLED** | yes | 3 | 11/1194 | 3 of 3 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-heading-off | src/ingredient/semantic-v2/classify.ts | KILLED | **KILLED** | yes | 3 | 4/1194 | 3 of 3 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-and-list-off | src/ingredient/semantic-v2/alternatives.ts | KILLED | **KILLED** | yes | 3 | 13/1194 | 3 of 3 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-count-word-name-off | src/ingredient/semantic-v2/amount.ts | KILLED | **KILLED** | yes | 3 | 10/1194 | 3 of 3 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-can-designation-off | src/ingredient/semantic-v2/amount.ts | KILLED | **KILLED** | yes | 2 | 6/1194 | 2 of 2 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-unknown-measure-off | src/ingredient/semantic-v2/amount.ts | KILLED | **KILLED** | yes | 4 | 15/1194 | 4 of 4 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-remark-source-off | src/ingredient/semantic-v2/remarks.ts | KILLED | **KILLED** | yes | 2 | 3/1194 | 2 of 2 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-equipment-off | src/ingredient/semantic-v2/classify.ts | KILLED | **KILLED** | yes | 2 | 14/1194 | 2 of 4 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-nutrition-panel-off | src/ingredient/semantic-v2/classify.ts | KILLED | **KILLED** | yes | 2 | 4/1194 | 2 of 2 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-food-head-off | src/ingredient/semantic-v2/foods.ts | KILLED | **KILLED** | yes | 1 | 86/1386 | 1 of 2 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-measure-gerund-off | src/ingredient/semantic-v2/foods.ts | KILLED | **KILLED** | yes | 1 | 7/1386 | 1 of 3 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/parser.json | P-homograph-off | src/ingredient/semantic-v2/foods.ts | KILLED | **KILLED** | yes | 1 | 1/1114 | 1 of 2 intended test(s) failed by assertion for the intended reason |

45 mutation(s): KILLED 36, KILLED-UNEXPECTED 2, SURVIVED 1, ERROR 6; as expected 45/45.
