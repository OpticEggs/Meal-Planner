# Phase 2B candidate freeze — `semantic-v2` (2026-10-10)

Frozen at commit **`f379e06cee9ec89d321a897a5c492811856fba5f`** before any holdout-v3 line exists. The engine source is
identical to `fc37ce7`, the head of the last fix round and the subject of the final pre-freeze review (R1 round 4). From
here on, the engine, its vocabulary, CONTRACT-v1 (§7, §12, §12.A), the labelling guide, the scorer (outcomes v3) and
EVALUATION-PLAN-v3 do not change before the single holdout-v3 scoring run. Their hashes are in
`FREEZE-CANDIDATE.json`; the scoring report must carry the same `pins`.

| Pin | Value |
|---|---|
| `semantic-v2` source digest (bench pins) | `8fef38e0…f7317c` (git tree `dd0c1d49…`) |
| scorer `bench/outcomes.ts` | `7821e853…3a3892` |
| plan `EVALUATION-PLAN-v3.md` | `34c68ed9…a492c1` |
| contract `CONTRACT-v1.md` | `d2fe6294…45bbf8` |
| vocabulary `foods.ts` / `foods-more.ts` | `73a2ac5f…` / `6edb88bf…` |
| required regression corpus | `94526c63…` (1114 firm: 1076 exact, 38 safe abstentions, 0 failures) |
| default engine | `legacy-table-import-2` (unchanged) |

**Known risk at freeze** (R1 round 4, fresh adversarially targeted probes; `candidate-review-r1-round4/`):

| Family | HIGH on fresh probes | Wilson 95 % |
|---|---|---|
| unknown measure words read as a count (S4) | 22/75 | 20.2–40.4 % |
| equipment read as food (S1 + S8) | 9/119 | 4.0–13.8 % |
| overlap foods | 1/82 | — |
| valid foods (counted + measured) | 0/240 | — |

Review burden on valid foods: 11.6 % on R1's deliberately less-common fresh set (unrecognised food or modifier), and
1/974 on its earlier, held-back everyday probes. The author's own held-out plain set: 0.81 % (372 lines).

R1's estimate: unknown measures are the most likely A3/A4 failure on a realistic holdout (35–80 % chance of at least one
S4 among 4–8 such lines); brand cookware and animal-named tools next (10–40 %). A1 is borderline.
