# R1 independent recomputation — holdout-v3, `semantic-v2` (Step 1, blind to the scorer's report)

Reviewer R1, read-only. Own clone `/home/user/rx2b-r1/recompute-v3/repo`, checked out at **`f6cc0c6`** (holdout and
exposure audit, no report). Nothing in the repository was edited, committed or pushed. No network, no database.

## Blindness record

- Not opened before this file and `recompute-results.json` were written: `evaluation-holdout-v3/`, any bench output,
  `bench/` code. I ran no `npm run bench`.
- **Disclosure:** when I checked that the three commits exist (`git log --oneline 4aa0ad2^..fdbcfd1`), the terminal showed
  the subject line of `fdbcfd1`, which states the headline verdict ("G2 not met — A1, A3, A4"). I saw no figure,
  case id or per-case class from it. My classifier is my round-0 checker (`/home/user/rx2b-r1/oracle-check.ts`,
  copied unchanged into `scripts/classify.ts` apart from import paths and `export` keywords), written from the plan text
  before any holdout-v3 line existed; its only v3 setting is change log 2(b) (S6 regardless of a stated quantity).

## Verification of the inputs

| item | expected | found |
|---|---|---|
| `fixtures/ingredients/holdout-v3.jsonl` SHA-256 | `fd4a989f…0591` | `fd4a989fe48d89f59f7fa38a5434581f7ae4e0996c8230cdea1ed26e60bc0591` ✓ (369 cases; R 292, A 52, U 25) |
| git tree of `src/ingredient/semantic-v2` at `f6cc0c6` | `dd0c1d49…` | `dd0c1d498a6eb2c311e2655d5f35af3f8c6b9ad6` ✓ (identical to `fc37ce7`, the candidate I reviewed in round 4) |
| `fixtures/EXPOSURE-AUDIT-v3.json` matchedCaseIds | — | ing-h3-0114, ing-h3-0189, ing-h3-0276 |
| debatable / reliesOnNewReading (frozen data) | — | 4 / 126 |

## Method

- Engines run through the package's public API `parseIngredientV1(input, { engine })` (`src/index.ts`), each input
  **twice**; both outputs validated with `validateParsedIngredientV1`; CE = engine error, either output invalid, or
  the two results not deep-equal (plan v3 §4, change log 2(a), 2(c)). No coercion.
- Classes, sub-classes, S codes and severity: plan v2 §3–§5 with change-log reading 1, plan v3 §4–§5 and change log 2
  (S6 fires whether or not the engine states a quantity), CONTRACT-v1 §9 comparison (own BigInt rationals, NFKC name
  normalisation, note token bag, alternatives as sets). Accepted values (`accept.name`, `accept.note`,
  `accept.alternatives`) count; acceptance uses accepted; strict figures reported beside.
- A2 counts a field whatever the engine status (reading 1); a CE line would count as inaccurate (none occurred).
- Imports: `src/index.ts` (engines), `src/contract.ts` (`UNIT_REGISTRY`), `src/validate.ts`. Nothing under `bench/`.
- Scripts: `scripts/classify.ts`, `scripts/recompute.ts`; command `cd repo/packages/recipe-extraction && npx tsx
  ../../../scripts/recompute.ts /home/user/rx2b-r1/recompute-v3`.

## semantic-v2 — outcome classes (Wilson 95 %, z = 1.959964)

| class | accepted | strict |
|---|---|---|
| C1 on R | **286/292 = 97.9 % [95.6–99.1]** | 284/292 = 97.3 % [94.7–98.6] |
| C1+ on R | 281/292 = 96.2 % [93.4–97.9] | 279/292 = 95.5 % [92.5–97.4] |
| C1 detail mismatch (low) on R | 5/292 = 1.7 % [0.7–3.9] (0092, 0145, 0229, 0252, 0277) | |
| C2 on R | 1/292 = 0.3 % [0.1–1.9] (0297) | |
| C2 on A (S4) | 3/52 = 5.8 % [2.0–15.6] (0075, 0113, 0140) | |
| C2 on U (S8) | 0/25 = 0.0 % [0.0–13.3] | |
| C2 high / medium (on N) | **4/369 = 1.1 % [0.4–2.8]** / 0/369 [0.0–1.0] | |
| C3 on R | 5/292 = 1.7 % [0.7–3.9] — C3a 3 (0197, 0248, 0333), C3b 2 (0089, 0222), C3c 0, C3x 0 | |
| C4 on R | 0/292 = 0.0 % [0.0–1.3] | |
| C5 on A | 49/52 = 94.2 % [84.4–98.0] — C5a 45, C5b 1 (0120), C5c 0, C5x 3 (0156, 0221, 0311) | |
| C6 on A | 0/52 = 0.0 % [0.0–6.9] | |
| C7 on U | 22/25 = 88.0 % [70.0–95.8] | |
| C8 on U | 3/25 = 12.0 % [4.2–30.0] (0189, 0211, 0314) | |
| CE on N | 0/369 = 0.0 % [0.0–1.0] (0 engine errors, 0 invalid, 0 nondeterministic) | |

Strict-only differences: 0077 and 0161 are C1 only through `accept.name`.
Informational: invented option on 0120 (`romaine leaf` for `romaine lettuce`); no dropped option.

## semantic-v2 — S codes (any status)

| code | n | cases |
|---|---|---|
| S1 | 0 | |
| S2 | 0 | |
| S3 | 0 | |
| **S4** | **3** | ing-h3-0075, ing-h3-0113, ing-h3-0140 |
| S5 | 0 | |
| S6 | 0 | |
| S7 | 1 | ing-h3-0297 |
| S8 | 0 | |

High-severity C2: 0075, 0113, 0140 (S4) and 0297 (S7, wrong unit `strip` vs label `each`).

## semantic-v2 — field accuracy on R (any engine status)

| field | |
|---|---|
| name, strict | 287/292 = 98.3 % [96.1–99.3] |
| name, accepted | 289/292 = 99.0 % [97.0–99.6] |
| quantity | 289/292 = 99.0 % [97.0–99.6] |
| unit | 288/292 = 98.6 % [96.5–99.5] |
| packageSize (info) | 292/292 = 100.0 % [98.7–100.0] |

## Gate G2 for semantic-v2

| # | rule | result |
|---|---|---|
| A1 | C1 on R ≥ 98 % (point); with confidence if Wilson lower ≥ 98 % | 286/292 = 97.94 % → **not met**; Wilson lower 95.6 % → not met with confidence |
| A2 | name, quantity, unit on R each ≥ 98 % | 99.0 % / 99.0 % / 98.6 % → **met** (point); none met with confidence (lower bounds 97.0 / 97.0 / 96.5 %) |
| A3 | high C2 = 0 | 4 → **not met** |
| A4 | S1 = S3 = S4 = S5 = S6 = 0 | S4 = 3 → **not met** |
| A5 | C3 + C4 on R ≤ 10 % | 5/292 = 1.7 % → **met** |
| A6 | CE = 0, every output valid and deterministic (my part) | CE 0 for all four engines → met for this part; legacy/snapshot/parity and report determinism not recomputed here |
| A7 | pesto characterization test | `tests/characterization/pesto.test.ts` 7/7 passed at `f6cc0c6` → **met** (`pesto-a7.txt`) |

**My G2 verdict for semantic-v2: FAIL** — A1, A3 and A4 not met; A2 and A5 met (point estimates); A7 met; CE = 0.
A1 is one line short: 287/292 would be 98.29 %.

## Sensitivities (informational, from the frozen data)

| set | N / R / A / U | A1 (point; Wilson lower) | A2 name / qty / unit | A3 high C2 | A4 | A5 |
|---|---|---|---|---|---|---|
| all (acceptance basis) | 369 / 292 / 52 / 25 | 286/292 = 97.9 % ✗ (95.6) | 99.0 / 99.0 / 98.6 ✓ | 4 ✗ | S4 3 ✗ | 1.7 % ✓ |
| (a) without the 4 debatable (0104, 0211, 0297, 0311) | 365 / 290 / 51 / 24 | 285/290 = 98.3 % ✓ (96.0) | 99.3 / 99.0 / 99.0 ✓ | 3 ✗ (0075, 0113, 0140) | S4 3 ✗ | 1.7 % ✓ |
| (c) without the 126 `reliesOnNewReading` | 243 / 211 / 24 / 8 | 209/211 = 99.1 % ✓ (96.6) | 99.5 / 99.5 / 99.5 ✓ | 1 ✗ (0113) | S4 1 ✗ | 0.9 % ✓ |
| (d) without the 3 exposure matches | 366 / 292 / 52 / 22 | 286/292 = 97.9 % ✗ (95.6) | 99.0 / 99.0 / 98.6 ✓ | 4 ✗ | S4 3 ✗ | 1.7 % ✓ |
| (c′) without (c) and 0017, 0290, 0102, 0129, 0277, 0285, 0345 | 236 / 206 / 22 / 8 | 204/206 = 99.0 % ✓ (96.5) | 99.5 / 99.5 / 99.5 ✓ | 1 ✗ (0113) | S4 1 ✗ | 1.0 % ✓ |

§12.15 supplementary row (0026, 0063, 0082, 0087, 0102, 0129, 0277, 0285, 0327, 0345): ready 6/6 C1 (0277 C1 with
a note detail mismatch), needs_review 4/4 C5a; no S code.

## Context engines (same classifier)

| engine | C1 on R | C1+ on R | C2 (high/medium) | C3 / C4 on R | C5 / C6 on A | C7 / C8 on U | CE | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| semantic-v2 | 286/292 | 281/292 | 4 (4/0) | 5 / 0 | 49 / 0 | 22 / 3 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |
| semantic-v1 | 240/292 | 231/292 | 35 (29/6) | 29 / 0 | 42 / 0 | 8 / 15 | 0 | 5 | 3 | 6 | 10 | 2 | 2 | 5 | 2 |
| legacy-table-import-2 | 113/292 | 113/292 | 42 (31/11) | 147 / 0 | 43 / 0 | 1 / 23 | 0 | 1 | 6 | 10 | 9 | 0 | 3 | 0 | 1 |
| legacy-table-import-2+suggestion | 113/292 | 113/292 | 42 (31/11) | 147 / 0 | 43 / 0 | 1 / 23 | 0 | 1 | 6 | 20 | 9 | 11 | 10 | 0 | 1 |

## Every semantic-v2 line that is not C1 / C5 / C7

| case | input | label | class | engine |
|---|---|---|---|---|
| 0075 | `1 small tub crème fraîche` | needs_review | C2 high [S4] | ready 1 container "crème fraîche", note small |
| 0089 | `1 bunch silverbeet, stalks removed` | ready | C3b | review, name "bunch silverbeet", no amount (recognised-food abstention) |
| 0113 | `1 tbsp tamarind paste, dissolved in 3 tbsp hot water` | needs_review | C2 high [S4] | ready 1 tbsp "tamarind paste", note "dissolved in 3 tbsp hot water" |
| 0120 | `1 head lettuce, romaine or green leaf` | needs_review | C5b (invented option) | options `romaine leaf`, `green leaf` |
| 0140 | `1 cup fresh peas and fava beans` | needs_review | C2 high [S4] | ready 1 cup "fresh peas and fava beans" |
| 0156 | `1 tsp each cumin, coriander and turmeric` | needs_review | C5x | 1 tsp, no name |
| 0189 | `Equipment` | unsupported | C8 (safe abstention) | review, name "Equipment" (exposure match) |
| 0197 | `2 (1 1/2-inch-thick) bone-in rib-eyes` | ready | C3a | review, 2 each "bone-in rib-eyes" |
| 0211 | `Topping (optional)` | unsupported (debatable) | C8 (safe abstention) | review, name "Topping" |
| 0221 | `1/2 cup sun-dried tomatoes and kalamata olives, chopped` | needs_review | C5x | 1/2 cup, no name |
| 0222 | `1 bag shredded four cheese Mexican blend` | ready | C3b | review, name "bag shredded four cheese Mexican blend", no amount |
| 0248 | `Garnish (optional): microgreens` | ready | C3a | review, "microgreens" |
| 0297 | `1 strip steak, about 14 oz` | ready (debatable) | C2 high [S7] | ready 1 **strip** "steak", equivalent 14 oz |
| 0311 | `2 cups black beans and rice` | needs_review (debatable) | C5x | 2 cups, no name |
| 0314 | `Resting time: overnight` | unsupported | C8 (safe abstention: no amount) | review, name "overnight" |
| 0333 | `1 lamb backstrap (about 500 g), trimmed` | ready | C3a | review, "lamb backstrap", no amount |

Per-case classes for every line and every engine: `recompute-results.json` (`engines.<id>.perCase`).
