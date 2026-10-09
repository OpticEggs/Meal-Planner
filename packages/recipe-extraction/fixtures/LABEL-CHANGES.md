# Label change log

Every change to a label in `ingredients/*.jsonl` or `pages/labels.json` (and to any `hold-*.html` page)
after its first commit is recorded here, newest last. The initial labels (2026-10-09) are not entries.

## Rules

- A change is argued from `CONTRACT-v1.md` and a careful cook's reading of the line or page — never from
  an engine's output, a benchmark score, or "the engine says otherwise".
- Each entry: date; case or page id; field(s) and old → new value; rationale; author; reviewer.
- **Dev** changes need a rationale and an author; a reviewer is recommended.
- **Holdout** changes additionally need an independent reviewer (not the author, not the engine's author)
  and a re-freeze: new `FREEZE.json` (new hashes and `frozenAt`), with the previous hashes copied into the
  entry. A holdout case that someone has tuned against is moved to dev, not edited in place.
- Contract changes that alter label meaning are versioned in the contract first; relabelling follows.

## Log

_No changes yet._
