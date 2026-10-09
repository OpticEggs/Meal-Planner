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
- **Holdout-v2** (`ingredients/holdout-v2.jsonl`): the draft labels are commit `2f95a2d` ("holdout-v2 draft
  labels (pre-check)"). Every change after that commit — including each adjudicated finding of the
  independent label check (EVALUATION-PLAN-v2 §8.1) — is an entry here with the case id, old → new, the
  rationale (never engine output; the checker sees none), the checker's finding and the adjudicator. The
  freeze (`FREEZE-v2.json`) follows the adjudication; later changes need a re-freeze with the previous hash
  copied into the entry, and after a candidate has been scored on holdout-v2 they make its holdout-v2 results
  exposed, not fresh (§8.5).

## Log

### 2026-10-09 — dev page hosts moved off the `.example` TLD (fixture correction, not a meaning change)

- **Pages:** `page-dev-type-array-br`, `page-dev-microdata`, `page-dev-redirect-headings` (dev only) and their
  HTML files `dev-type-array-br.html`, `dev-microdata.html`.
- **Change:** `news.example` → `news.example.com`, `cookbook.example` → `cookbook.example.org`,
  `share.example` → `share.example.net` in every URL (page text, `requestedUrl`, `finalUrl`, `imageUrls`,
  `declaredUrl`). No title, ingredient, servings, time, author or other semantic value changed.
- **Rationale:** Table's link validation (`validateLinkUrl`, D86) refuses the reserved `.example` TLD as a
  non-public name, so on these pages every image and declared URL was unreachable for *any* engine — a
  fixture artefact, introduced by the integration owner's brief (which listed `*.example` as acceptable),
  not a property of the pages. The corrected hosts are still reserved example domains (RFC 2606).
  Found by the first integrated benchmark run; the fix is argued from Table's link rules, not from a score.
  `tests/contract/fixture-urls.test.ts` now requires every final/image/declared URL to pass Table's link
  validation.
- **Not changed (holdout, frozen):** `page-hold-redirect-li-entities` has `requestedUrl` `https://go.example/x/91`.
  Requested URLs are not scored; the extraction reports `url_invalid` for it and `source.requestedUrl: null`.
  Recorded here as a known artefact; the holdout stays as frozen.
- **Author / reviewer:** integration owner (Claude); reviewer: Worker B's labels otherwise unchanged.
