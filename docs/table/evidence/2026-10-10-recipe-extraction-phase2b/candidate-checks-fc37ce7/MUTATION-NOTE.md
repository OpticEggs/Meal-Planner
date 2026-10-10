# Mutation run at fc37ce7 — the one unexpected result

44/45 as expected. `P-measure-gerund-off` SURVIVED because the spec selected only the regression harness: at line level
the recognised-food backstop (`recognisedFoodHead` — `describingWord` no longer accepts open `-ing` words) already sends
`1 helping mashed potatoes`, `1 dusting cocoa powder` etc. to review with no amount, so the two safeguards overlap
(defence in depth). The safeguard's own behaviour is pinned by its direct test (`recognised-food.test.ts` › R1 round 3,
item 1 › measureGerund …), which the spec did not select. Spec corrected (test file added, direct test as killer); the
single mutation re-run is KILLED by that test (`mutation-measure-gerund-rerun.txt`). The full suite is re-run on the
frozen head.
