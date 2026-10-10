holdout fixtures/ingredients/holdout-v3.jsonl sha256 fd4a989fe48d89f59f7fa38a5434581f7ae4e0996c8230cdea1ed26e60bc0591 (369 cases): N 369, R 292, A 52, U 25

## semantic-v2 — outcome classes (accepted values; Wilson 95 %)

| class | count / denominator |
|---|---|
| C1 (on R) | 286/292 = 97.9 % [95.6–99.1] |
| C1+ (on R) | 281/292 = 96.2 % [93.4–97.9] |
| C1 detail mismatch (low; on R) | 5/292 = 1.7 % [0.7–3.9] |
| C1 strict (on R) | 284/292 = 97.3 % [94.7–98.6] |
| C1+ strict (on R) | 279/292 = 95.5 % [92.5–97.4] |
| C2 on R | 1/292 = 0.3 % [0.1–1.9] |
| C2 on A (S4) | 3/52 = 5.8 % [2.0–15.6] |
| C2 on U (S8) | 0/25 = 0.0 % [0.0–13.3] |
| C2 all (on N) | 4/369 = 1.1 % [0.4–2.8] |
| C2 high (on N) | 4/369 = 1.1 % [0.4–2.8] |
| C2 medium (on N) | 0/369 = 0.0 % [0.0–1.0] |
| C3 (on R) | 5/292 = 1.7 % [0.7–3.9] — a 3, b 2, c 0, x 0 |
| C4 (on R) | 0/292 = 0.0 % [0.0–1.3] |
| C5 (on A) | 49/52 = 94.2 % [84.4–98.0] — a 45, b 1, c 0, x 3 |
| C6 (on A) | 0/52 = 0.0 % [0.0–6.9] |
| C7 (on U) | 22/25 = 88.0 % [70.0–95.8] |
| C8 (on U) | 3/25 = 12.0 % [4.2–30.0] |
| CE (on N) | 0/369 = 0.0 % [0.0–1.0] |

## semantic-v2 — S codes (any status)

- S1: 0
- S2: 0
- S3: 0
- S4: 3 — ing-h3-0075, ing-h3-0113, ing-h3-0140
- S5: 0
- S6: 0
- S7: 1 — ing-h3-0297
- S8: 0
- C2 high: ing-h3-0075, ing-h3-0113, ing-h3-0140, ing-h3-0297; C2 medium: none
- invented options: ing-h3-0120; dropped options: none

## semantic-v2 — field accuracy on R (any engine status)

- nameStrict: 287/292 = 98.3 % [96.1–99.3]
- nameAccepted: 289/292 = 99.0 % [97.0–99.6]
- quantity: 289/292 = 99.0 % [97.0–99.6]
- unit: 288/292 = 98.6 % [96.5–99.5]
- packageSize: 292/292 = 100.0 % [98.7–100.0]

## semantic-v2 — Gate G2 (A1–A5, CE part of A6)

- A1 C1 on R 286/292 = 97.9 % → NOT met (point); Wilson lower 95.6 % → not met with confidence
- A2 name 289/292 (99.0 %), quantity 289/292 (99.0 %), unit 288/292 (98.6 %) → met (with confidence: name false, quantity false, unit false)
- A3 high C2 = 4 → NOT met (ing-h3-0075, ing-h3-0113, ing-h3-0140, ing-h3-0297)
- A4 S1 0, S3 0, S4 3, S5 0, S6 0 → NOT met
- A5 C3+C4 on R 5/292 = 1.7 % → met
- A6 (part) CE = 0 → met

## semantic-v2 — sensitivities (informational)

### (a) without debatable: N 365, R 290, A 51, U 24
- A1 C1 on R 285/290 = 98.3 % → met (point); Wilson lower 96.0 % → not met with confidence
- A2 name 288/290 (99.3 %), quantity 287/290 (99.0 %), unit 287/290 (99.0 %) → met (with confidence: name false, quantity false, unit false)
- A3 high C2 = 3 → NOT met (ing-h3-0075, ing-h3-0113, ing-h3-0140)
- A4 S1 0, S3 0, S4 3, S5 0, S6 0 → NOT met
- A5 C3+C4 on R 5/290 = 1.7 % → met
- A6 (part) CE = 0 → met
- S codes: S4 ing-h3-0075 ing-h3-0113 ing-h3-0140
### (c) without reliesOnNewReading: N 243, R 211, A 24, U 8
- A1 C1 on R 209/211 = 99.1 % → met (point); Wilson lower 96.6 % → not met with confidence
- A2 name 210/211 (99.5 %), quantity 210/211 (99.5 %), unit 210/211 (99.5 %) → met (with confidence: name false, quantity false, unit false)
- A3 high C2 = 1 → NOT met (ing-h3-0113)
- A4 S1 0, S3 0, S4 1, S5 0, S6 0 → NOT met
- A5 C3+C4 on R 2/211 = 0.9 % → met
- A6 (part) CE = 0 → met
- S codes: S4 ing-h3-0113
### (d) without exposure-audit matches: N 366, R 292, A 52, U 22
- A1 C1 on R 286/292 = 97.9 % → NOT met (point); Wilson lower 95.6 % → not met with confidence
- A2 name 289/292 (99.0 %), quantity 289/292 (99.0 %), unit 288/292 (98.6 %) → met (with confidence: name false, quantity false, unit false)
- A3 high C2 = 4 → NOT met (ing-h3-0075, ing-h3-0113, ing-h3-0140, ing-h3-0297)
- A4 S1 0, S3 0, S4 3, S5 0, S6 0 → NOT met
- A5 C3+C4 on R 5/292 = 1.7 % → met
- A6 (part) CE = 0 → met
- S codes: S4 ing-h3-0075 ing-h3-0113 ing-h3-0140; S7 ing-h3-0297
### (c′) without (c) and the 7 pre-registered cases: N 236, R 206, A 22, U 8
- A1 C1 on R 204/206 = 99.0 % → met (point); Wilson lower 96.5 % → not met with confidence
- A2 name 205/206 (99.5 %), quantity 205/206 (99.5 %), unit 205/206 (99.5 %) → met (with confidence: name false, quantity false, unit false)
- A3 high C2 = 1 → NOT met (ing-h3-0113)
- A4 S1 0, S3 0, S4 1, S5 0, S6 0 → NOT met
- A5 C3+C4 on R 2/206 = 1.0 % → met
- A6 (part) CE = 0 → met
- S codes: S4 ing-h3-0113
### §12.15 supplementary row (10 lines)
- ing-h3-0026 `several sprigs fresh oregano` label needs_review → C5a
- ing-h3-0063 `Drop of rose water` label ready → C1
- ing-h3-0082 `a big pinch of Maldon salt` label ready → C1
- ing-h3-0087 `Handful of pea shoots` label ready → C1
- ing-h3-0102 `Small sprig of tarragon` label ready → C1
- ing-h3-0129 `Splashes of heavy cream` label needs_review → C5a
- ing-h3-0277 `Scoop of vanilla gelato, to serve` label ready → C1
- ing-h3-0285 `Head of radicchio, cored` label ready → C1
- ing-h3-0327 `Few dashes of Tabasco` label needs_review → C5a
- ing-h3-0345 `Cup of jasmine rice, rinsed` label needs_review → C5a
- C1 on R 6/6 = 100.0 % [61.0–100.0]; C5 on A 4/4 = 100.0 % [51.0–100.0]; C7 on U 0/0; S codes: none

## Context engines (C1 / C2 / S totals)

| engine | C1 on R | C1+ on R | C2 (high/medium) | C3/C4 on R | C5/C6 on A | C7/C8 on U | CE | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| semantic-v2 | 286/292 | 281/292 | 4 (4/0) | 5/0 | 49/0 | 22/3 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 1 | 0 |
| semantic-v1 | 240/292 | 231/292 | 35 (29/6) | 29/0 | 42/0 | 8/15 | 0 | 5 | 3 | 6 | 10 | 2 | 2 | 5 | 2 |
| legacy-table-import-2 | 113/292 | 113/292 | 42 (31/11) | 147/0 | 43/0 | 1/23 | 0 | 1 | 6 | 10 | 9 | 0 | 3 | 0 | 1 |
| legacy-table-import-2+suggestion | 113/292 | 113/292 | 42 (31/11) | 147/0 | 43/0 | 1/23 | 0 | 1 | 6 | 20 | 9 | 11 | 10 | 0 | 1 |

## semantic-v2 — every line not C1/C5/C7 (and every S code)

- ing-h3-0075 `1 small tub crème fraîche` label needs_review → **C2 high** [S4] — {"status":"ready","name":"crème fraîche","quantity":"1","unit":"container","packageSize":null,"note":"small","alternatives":[],"equivalents":[],"form":null,"reasons":["count_unit"]}
- ing-h3-0089 `1 bunch silverbeet, stalks removed` label ready → **C3b** — {"status":"needs_review","name":"bunch silverbeet","quantity":null,"unit":null,"packageSize":null,"note":"stalks removed","alternatives":[],"equivalents":[],"form":null,"reasons":["unclassified","quantity_missing"]}
- ing-h3-0113 `1 tbsp tamarind paste, dissolved in 3 tbsp hot water` label needs_review → **C2 high** [S4] — {"status":"ready","name":"tamarind paste","quantity":"1","unit":"tbsp","packageSize":null,"note":"dissolved in 3 tbsp hot water","alternatives":[],"equivalents":[],"form":null,"reasons":[]}
- ing-h3-0120 `1 head lettuce, romaine or green leaf` label needs_review → **C5b** — {"status":"needs_review","name":null,"quantity":"1","unit":"head","packageSize":null,"note":null,"alternatives":["romaine leaf","green leaf"],"equivalents":[],"form":null,"reasons":["ingredient_alternatives","count_unit"]}
- ing-h3-0140 `1 cup fresh peas and fava beans` label needs_review → **C2 high** [S4] — {"status":"ready","name":"fresh peas and fava beans","quantity":"1","unit":"cup","packageSize":null,"note":null,"alternatives":[],"equivalents":[],"form":null,"reasons":[]}
- ing-h3-0189 `Equipment` label unsupported → **C8** — {"status":"needs_review","name":"Equipment","quantity":null,"unit":null,"packageSize":null,"note":null,"alternatives":[],"equivalents":[],"form":null,"reasons":["quantity_missing"]}
- ing-h3-0197 `2 (1 1/2-inch-thick) bone-in rib-eyes` label ready → **C3a** — {"status":"needs_review","name":"bone-in rib-eyes","quantity":"2","unit":"each","packageSize":null,"note":"1 1/2-inch-thick","alternatives":[],"equivalents":[],"form":null,"reasons":["quantity_unassigned"]}
- ing-h3-0211 `Topping (optional)` label unsupported (debatable) → **C8** — {"status":"needs_review","name":"Topping","quantity":null,"unit":null,"packageSize":null,"note":null,"alternatives":[],"equivalents":[],"form":null,"reasons":["quantity_missing","optional_ingredient"]}
- ing-h3-0222 `1 bag shredded four cheese Mexican blend` label ready → **C3b** — {"status":"needs_review","name":"bag shredded four cheese Mexican blend","quantity":null,"unit":null,"packageSize":null,"note":null,"alternatives":[],"equivalents":[],"form":null,"reasons":["unclassified","quantity_missing"]}
- ing-h3-0248 `Garnish (optional): microgreens` label ready → **C3a** — {"status":"needs_review","name":"microgreens","quantity":null,"unit":null,"packageSize":null,"note":"Garnish optional","alternatives":[],"equivalents":[],"form":null,"reasons":["quantity_missing"]}
- ing-h3-0297 `1 strip steak, about 14 oz` label ready (debatable) → **C2 high** [S7] — {"status":"ready","name":"steak","quantity":"1","unit":"strip","packageSize":null,"note":null,"alternatives":[],"equivalents":["14 oz"],"form":null,"reasons":["equivalent_quantity_stated","count_unit"]}
- ing-h3-0314 `Resting time: overnight` label unsupported → **C8** — {"status":"needs_review","name":"overnight","quantity":null,"unit":null,"packageSize":null,"note":"Resting time","alternatives":[],"equivalents":[],"form":null,"reasons":["quantity_missing"]}
- ing-h3-0333 `1 lamb backstrap (about 500 g), trimmed` label ready → **C3a** — {"status":"needs_review","name":"lamb backstrap","quantity":null,"unit":null,"packageSize":null,"note":"500 g; trimmed","alternatives":[],"equivalents":[],"form":null,"reasons":["unclassified","quantity_missing"]}
