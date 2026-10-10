| Spec | Mutation | File | Expected | Result | As expected | Intended killers failed | Tests failed / run | Why |
|---|---|---|---|---|---|---|---|---|
| tools/mutation/specs/selftest.json | self-noop | bench/outcomes.ts | SURVIVED | **SURVIVED** | yes | 0 | 0/89 | all 89 tests passed |
| tools/mutation/specs/selftest.json | self-syntax-error | bench/outcomes.ts | ERROR | **ERROR** | yes | 0 | 0/0 | test file failed to compile or load: oracles-v3.test.ts: Transform failed with 1 error:; scorer-v3.test.ts: Transform failed with 1 error: |
| tools/mutation/specs/selftest.json | self-missing-anchor | bench/outcomes.ts | ERROR | **ERROR** | yes | 0 | 0/0 | replacement not applied: anchor not found |
| tools/mutation/specs/selftest.json | self-ambiguous-anchor | bench/outcomes.ts | ERROR | **ERROR** | yes | 0 | 0/0 | replacement not applied: anchor occurs 21 times (give "occurrence") |
| tools/mutation/specs/selftest.json | self-missing-file | bench/no-such-file.ts | ERROR | **ERROR** | yes | 0 | 0/0 | replacement not applied: file bench/no-such-file.ts does not exist |
| tools/mutation/specs/selftest.json | self-no-tests-ran | bench/outcomes.ts | ERROR | **ERROR** | yes | 0 | 0/0 | the unmutated baseline is not usable: no tests ran |
| tools/mutation/specs/selftest.json | self-unknown-killer | bench/outcomes.ts | ERROR | **ERROR** | yes | 0 | 8/89 | killedBy test(s) not in this run: no such describe > no such test |
| tools/mutation/specs/selftest.json | self-killed-unexpected | bench/outcomes.ts | KILLED-UNEXPECTED | **KILLED-UNEXPECTED** | yes | 0 | 8/89 | only other tests failed (8) |
| tools/mutation/specs/selftest.json | self-wrong-reason | bench/outcomes.ts | KILLED-UNEXPECTED | **KILLED-UNEXPECTED** | yes | 0 | 8/89 | intended test(s) failed, but not by an assertion matching the intended reason: outcomes v3 hand-calculated oracles > O52 CE invalid output, SF-6: AssertionError: severe: expected [ 'S1' ] to deeply equal [] |
| tools/mutation/specs/selftest.json | self-killed | bench/outcomes.ts | KILLED | **KILLED** | yes | 1 | 8/89 | 1 of 1 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/scorer.json | SCORE-01-revert-tag-heuristic | bench/outcomes.ts | KILLED | **KILLED** | yes | 4 | 5/145 | 4 of 4 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/scorer.json | SCORE-02-revert-s-codes-on-ce | bench/outcomes.ts | KILLED | **KILLED** | yes | 5 | 11/145 | 5 of 5 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/scorer.json | SCORE-02-revert-status-string-validity | bench/outcomes.ts | KILLED | **KILLED** | yes | 5 | 13/145 | 5 of 5 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/scorer.json | SCORE-02-revert-no-nondeterminism-check | bench/outcomes.ts | KILLED | **KILLED** | yes | 3 | 7/145 | 3 of 3 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/scorer.json | SCORE-02-revert-a6-outside-scorer | bench/outcomes.ts | KILLED | **KILLED** | yes | 3 | 6/145 | 3 of 3 intended test(s) failed by assertion for the intended reason |
| tools/mutation/specs/scorer.json | SCORE-02-revert-ce-field-accuracy | bench/outcomes.ts | KILLED | **KILLED** | yes | 1 | 1/145 | 1 of 1 intended test(s) failed by assertion for the intended reason |

16 mutation(s): KILLED 7, KILLED-UNEXPECTED 2, SURVIVED 1, ERROR 6; as expected 16/16.
