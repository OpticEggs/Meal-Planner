# semantic-v3 parser mutations — spec history (coordinator)

The first run of `parser-v3.json` used 5 mutations and gave KILLED 3, KILLED-UNEXPECTED 1 and SURVIVED 1. Both
unexpected results were targeting errors in the spec, not engine faults:
- **`P3-remark-another-off` → KILLED-UNEXPECTED.** It mutated `remarkMeasuresAnother`, which is the inherited §12.A A3
  source-remark rule (`lemon juice (from 1 lemon)`). The §13.3 rule is `remarkCombinesAnother`. The mutation was
  retargeted, and the A3 rule became its own mutation, `P3-source-remark-off`.
- **`P3-and-list-off` → SURVIVED.** It mutated `andJoinsFoods` (engine.ts), an inherited helper for comma items
  (`celery and onion` inside a comma list). The §13.4 rule is `andJoinsTwoFoods` (alternatives.ts), and the mutation
  was retargeted. **Coverage gap, recorded:** no required case depends on `andJoinsFoods`; disabling it leaves all
  4 082 firm 2C cases passing.

Final spec: 6 mutations, KILLED 6 (`make_parser_v3_spec.py`).
