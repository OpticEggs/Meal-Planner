# Read-only source-delta notice for the Recipe Extraction Lab — 2026-10-09

_From the Table app session. Nothing was pushed to `claude/quirky-gauss-depmd8`, no lab file was changed, and nothing
here adopts the extraction engine or completes its Phase 3. Reconcile in the lab's own checkout, under the lab
owner's control._

**Lab branch as last read:** `8131fe0`, 2026-10-10 (it does not contain `43cd1ce`; it already merged `main` `8c9fd8c` as `54c5629` and applied the earlier
reconciliation as `034f2c3`, recording `bca110e`). The patch kept in
`docs/table/evidence/2026-10-09-verify-bca110e/lab-reconciliation/` is therefore historical — do not apply it again.

**Table source changed on `main` after `8c9fd8c`** (app commits `9f7836f`, `a9fd9de` (tests only), `43cd1ce`):

| File | Change | Effect for the lab |
|---|---|---|
| `src/server/integrations/recipe-import/ingredient-line.ts` | Before the household-seasoning decision, a descriptor that changes which salt or pepper it is (`salt (smoked)`, `pepper (white)`, `salt, smoked`) is folded into the name (`smoked salt`); the decision passes the line's note as descriptors. sha256 `bca110e` `4eba6151…` → `43cd1ce` `bf85fd11849e6037be0cd69088655a48ed5446b9c9b68ed8876526f0334e7ed7` | `tests/parity/provenance.test.ts`'s live-file guard will fail after merging `main` until `liveTableObserved` records this hash. The frozen copies, `baseline-snapshot.json` and holdout labels are unaffected |
| `src/domain/groceries/seasonings.ts` | `isHouseholdSeasoning(name, unit?, descriptors?)`; new `identityDescriptors(name, descriptors?)`; parentheses are no longer stripped | `PHASE-3-DEPENDENCIES.md` §4 "decided on the name and the amount's unit" now reads "on the name, its descriptors and the amount's unit"; a v1 → `ParsedLine` mapping must pass the descriptors (note) as well. The engine still reports `salt (smoked)` as stated; the shopping policy stays Table's |
| `src/ui/ImportReview.tsx` | Focus returns to a row after Use / Leave out / Cancel | none |
| `src/domain/quantity.ts`, `src/domain/units.ts` | unchanged since `bca110e` | §3's statement holds: per-serving storage is a 12-place approximation rounded toward zero, never "exact" (Table D131 — numbered D122 until 2026-10-10) |

Tests added on `main` that are Table's own compatibility inputs (relevant to the lab's holdout hygiene, EVALUATION-PLAN-v2
§9): the seasoning cases in `tests/unit/seasonings.test.ts` and `tests/unit/recipe-import-ingredient-line.test.ts`
("descriptors … (RIO-02, original cases)"), and `tests/integration/rio-corrections.test.ts` RIO-02a–c.
