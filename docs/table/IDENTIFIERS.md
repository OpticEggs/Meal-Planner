# Decision and backlog identifiers — who mints which numbers

_2026-10-10. Two workstreams write `docs/table/DECISIONS.md` and `docs/table/BACKLOG.md` on two branches: the Table
app on `main` and the Recipe Extraction Lab on `claude/quirky-gauss-depmd8`. On 2026-10-09 both minted D121–D123
(and B32) for different things. To keep the files mergeable:_

| Range | Minted by | Notes |
|---|---|---|
| D1–D120, B1–B31 | shared history (both branches carry them) | unchanged |
| D121–D129, B32–B39 | **the lab branch** | the lab already uses D121–D125 and B32–B34 |
| D130–D199, B40–B79 | **`main` (Table app)** | main's former D121/D122/D123 are now D130/D131/D132; its former B32 is B40 (each row says so) |
| D200+, B80+ | proposed for the lab's next block | the lab owner decides; main will not mint there |

Before minting, read the other branch's highest number (`git show origin/<branch>:docs/table/DECISIONS.md`).
Nothing on the lab branch was changed to make this so; the lab owner reconciles on its own merge.
