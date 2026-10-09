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

### 2026-10-09 — holdout-v2 pre-freeze adjudication

- **Context:** draft labels `2f95a2d` (`ingredients/holdout-v2.jsonl` SHA-256
  `37d64b28f0447acdcaeaaf01b94c39c039b9961799074d344ab502dda36e2c0b`, not frozen). The independent label checker,
  blind to every parser, labelled a sample of 40 cases (ids 0005, 0014, … every 9th) and agreed on every field
  (40/40); it verified all 54 `repo_test_input` citations at `8e6bd6e` (and their absence at `cb7b56e`), the
  arithmetic and the §2.1 consistency, and found no definite error. The coordinator adjudicated the changes below
  before any candidate engine was evaluated; each is argued from CONTRACT-v1, not from engine output (no engine
  output for holdout-v2 exists).
- **ing-h2-0215** `2 tbsp white or yellow miso` — `accept.alternatives`: `[["white","yellow miso"]]` → removed
  (`accept` now `{}`). Rationale: too generous; §7.8's own example expands the shared noun (`chicken or vegetable
  broth` → `chicken broth`, `vegetable broth`), so only the expanded options match.
- **ing-h2-0204** `1 Tbsp. coarsely ground black pepper` — `accept.name`: `["black pepper","ground black pepper"]`
  → `["ground black pepper"]`; `accept.note`: `["coarsely ground","coarsely"]` → `["coarsely"]`; rationale reworded
  to match. **ing-h2-0322** `½ tsp freshly ground black pepper` — `accept.name`: `["black pepper","ground black
  pepper"]` → `["ground black pepper"]`; `accept.note`: `["freshly ground","freshly"]` → `["freshly"]`; rationale
  reworded. **ing-h2-0325** `ground black pepper` — `accept`: `{"name":["black pepper"],"note":["ground"]}` → `{}`.
  Rationale: consistency — `ground` is treated as a product-form word, exactly as for ground allspice, cardamom,
  ginger, turmeric and coriander elsewhere in the set (fixtures README: product forms stay in the name with no
  alternative).
- **ing-h2-0212** `Juice of 2 limes` — `accept.note`: `["juice of","juiced"]` → `[null,"juice of","juiced"]`.
  **ing-h2-0213** `Zest of ½ orange` — `accept.note`: `["zest of","zested"]` → `[null,"zest of","zested"]`.
  Rationale: the accepted merged names (`lime juice`, `orange zest`) leave nothing for the note, so "no note" must
  be accepted too (the label format already allows `null` in `accept.note`).
- **ing-h2-0087** `3 (5.3 oz) cups vanilla Greek yogurt` — label unchanged; rationale extended with "DEBATABLE —
  PRE-REGISTERED": an engine reading `cups` as the volume unit is scored cross-dimension (S3). The case is listed in
  `bench/outcomes.ts` `DEBATABLE_CASES`; the report also gives A1–A5 without it, as information only — the
  acceptance decision stays on all holdout-v2 cases.
- **Kept as labelled** (adjudicated, no change): every other case, including the CONTRACT AMBIGUITY readings
  (0071/0143/0317, 0165/0338, 0219, 0226/0227/0229, 0265, 0304, 0113/0166 and the rest).
- **New hash:** `793507a4b7360fb7a99dad69519fbe337ad97b3c41ad102d0db8b46f6ee6617f` (the file that `FREEZE-v2.json`
  freezes).
- **Author:** evaluation worker. **Reviewers:** independent label checker; coordinator.
