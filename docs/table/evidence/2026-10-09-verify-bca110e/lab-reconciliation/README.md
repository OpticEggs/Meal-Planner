# Recipe Extraction Lab — provenance reconciliation with main `bca110e` (not pushed)

Apply on the lab branch after merging `main` (`git merge bca110e`, then `git am 0001-*.patch`). It changes only
`src/legacy/PROVENANCE.json` (`liveTableObserved` → `bca110e`, hash `4eba6151cb03342207f5797a1af6cd88fe89d68ea4f6107a9942ff94133f0e28`;
the `8e6bd6e` hash kept in the note) and appends §4 to `docs/table/recipe-extraction/PHASE-3-DEPENDENCIES.md`.

Measured 2026-10-09 on a local rebuild over the lab head `46a6547` (holdout-v2 frozen):
- `46a6547`: 1006 passed, 1 expected fail, 11 skipped.
- `46a6547` + merge of `bca110e`: 1 failed — `tests/parity/provenance.test.ts` (the live `ingredient-line.ts` guard).
- + this commit: 1006 passed, 1 expected fail, 11 skipped; `tsc` clean.

Not pushed because the lab branch moved from `dee4ed0` to `46a6547` while it was prepared; that workstream is not
overwritten. This does not complete or replace the extraction engine; Phase 3 remains unauthorized.

The §4 text inside the patch quotes the count measured on the earlier lab head `dee4ed0` (920 passed); on `46a6547` the
same check reads 1006 passed. Whoever applies it should update that one figure.
