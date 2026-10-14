# Evidence — import and editing usability release (D157, D158), 2026-10-14

**Branch:** `claude/import-edit`, from `main` `6d52c87`.

**Code commits:**

- `adec092`: whole-recipe entry (D157) and the faster import review (D158).
- `a30f1cf`: the servings field is labelled like the editor's other fields.
- `11fa4b5`: the mutation harness. Its anchors follow D157, and three D157 save-contract mutations are added. No app
  source changed.

**`verify-a30f1cf/`:** `scripts/verify-all.sh` on `a30f1cf` (clean tree; the tracked-file hash did not change during
the run).

| Step | Result |
|---|---|
| Typecheck | PASS |
| vitest | 1234/1234 |
| Build | PASS |
| Playwright | 186/186 (0 flaky) |
| Mutation self-test | PASS |
| Mutations | 130 killed, 0 survived, **2 error** |

The `summary.md` there says "Overall: FAIL" because of those two errors. Both were harness anchors pointing at lines
this change rewrote ("anchor not found": `RB17_02_compared_by_display_name`, `EQR_basis_by_equal_number`). No test
failed and nothing survived.

**`mutation-11fa4b5/`:** the full mutation pass on `11fa4b5`, which differs from `a30f1cf` only in
`tests/mutation/run.mjs`.

- Result: **135 killed, 0 survived, 0 error**. The count includes the two re-anchored mutations and the three new D157
  ones: `D157_legacy_relabelled_exact`, `D157_untouched_rederived` and `D157_servings_ignored`.
- The first version of `D157_servings_ignored` changed the per-serving quantity directly. The database's
  `recipe_ingredients_exact_matches_quantity` check refused that write, so the harness counted it as an error. It now
  passes the wrong servings consistently, and the WR-01 assertion is what fails.

**`cookbook/`:** before and after measurements of import, save, reopen, edit, selected servings and groceries.
Screenshots come from the running app. The scope and what is missing are in `cookbook/README.md`.

**Boundaries:**

- Disposable local databases only.
- No household data read or written. No production, Neon, live provider, credential or deployment action.
- Browser JSON secret redacted (`e2e-only-secret[REDACTED]`).
