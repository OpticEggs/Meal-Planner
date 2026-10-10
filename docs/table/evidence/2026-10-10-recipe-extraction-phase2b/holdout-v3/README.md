# Holdout-v3: exposure and provenance record

| Step | When | Evidence |
|---|---|---|
| Exposed-input lists, used by the evaluator for deduplication (9 819 strings) and by the audit (23 321) | after the candidate freeze, before any holdout-v3 line existed (`28ffd2e`) | `build_exposed_inputs.py`, `exposed-lists/` |
| Authoring | private, history-less workspace `/home/user/rx-eval-v3` (never the session scratchpad); written by the evaluation worker, whose workspaces never contained `semantic-v2`; no engine was run | `authoring/` (generator scripts, `PROVENANCE.md` describing the **draft** `c31382a3…`, private git log) |
| Blind label check | R2, blind to every engine and to any candidate output; the blind sample (46) was hashed before any evaluator label was seen | `label-check-r2/` (report, blind sample, the draft it reviewed) |
| Adjudication | coordinator, from the contract text only, before the freeze | `ADJUDICATION-v3.md`; `fixtures/LABEL-CHANGES.md` (last section) |
| Freeze | `4aa0ad2`; `fd4a989f…` / `FREEZE-v3.json` `f9f02e08…` | `fixtures/` |
| Exposure audit (exact, normalized) | after the freeze and before scoring (`f6cc0c6`) | `build_exposure_audit_v3.py`, `EXPOSURE-AUDIT-v3-details.md`, `fixtures/EXPOSURE-AUDIT-v3.json` |
| Single scoring run | `fdbcfd1` | `../evaluation-holdout-v3/` |
| Independent recomputation | R1, blind until its results were hashed | `../recompute-r1/` |

**Exposure findings:**
- **Exact matches:** 3 of the 369 inputs exactly match a string that the implementation workers or the reviewer
  could have seen: `Kitchen twine`, `Equipment`, `½x 1x 2x`. Sensitivity (d) leaves them out.
- **Transcript occurrences:** 7 inputs appear as whole words in the five builder and reviewer transcripts (Phase 2
  and 2B implementation workers, three candidate reviewers), checked before R1 saw the holdout. All 7 are short
  generic lines.
- **Labels after the freeze:** no case-level content of holdout-v3 reached the candidate before scoring; the candidate
  was frozen before the holdout existed. Since the run, holdout-v3 is **exposed** for any future engine.
