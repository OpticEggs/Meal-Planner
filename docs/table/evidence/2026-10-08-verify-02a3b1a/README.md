# Evidence — cook-record idempotency (verify-all on 02a3b1a)

- Input: `delivery-review-fb4d771.md` (the owner-supplied independent delivery review; gate 2 is the defect fixed here).
- `summary.md` and the logs/JSON beside it: `scripts/verify-all.sh` on the clean commit `02a3b1a`
  (typecheck PASS · vitest 293/293 · build PASS · Playwright 117/117 · mutation self-test PASS ·
  62 mutations killed, 0 survived, 0 error). The test-only auth secret is redacted.
- `red/`: red-before-green on `fb4d771` (see ACCEPTANCE "Cook-record idempotency"). The file prefixed
  `INVALID-` is kept for transparency and is **not** red evidence (old code against a 008 database).
- `upgrade-008/`: upgrade of a populated 007 database holding duplicate cook records.

Chromium only. Safari/WebKit, VoiceOver and physical phones: NOT RUN (B8, device check D23).
