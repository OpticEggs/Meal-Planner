# Evidence — audit-only correction AUD-01, verified at 8ae5497

Code: `fe20b12` changes only the read-only legacy audit (`src/server/audit/legacy-quantities.ts`), its integration
test file and two mutations; `8ae5497` changes only the sequencing of one browser test (B10-E1). No app path,
migration, UI, deployment or data change. Starting point `1261cd8`
(code `72cf615`).

- `summary.md` + logs/JSON: `scripts/verify-all.sh` on `8ae5497` (clean tree, source hash unchanged): vitest 1178/1178, Playwright 153/153 (Chromium), mutation self-test PASS, 123 mutations killed / 0 survived / 0 error.
- `failed-run-fe20b12/`: the full verification of `fe20b12` — **FAIL**: vitest 1178/1178, Playwright 152 passed / 1
  failed (B10-E1), 123 mutations killed. Kept as it ran (summary, Playwright log and JSON).
- `dev/b10-e1-*`: the root cause of that failure. Its trace shows a single approval request (rice): the broccoli tap
  came ~100 ms after the rice tap, when that command's refresh had disabled write buttons (by design, while the
  screen re-reads), so it landed on a disabled button. `b10-e1-repeat15-on-fe20b12.log` 4 of 15 failed;
  `b10-e1-repeat15-on-72cf615.log` (a separate build of `72cf615`, same app code) 1 of 15 failed — it predates the
  audit change; `b10-e1-repeat30-fixed.log` 30 of 30 passed after the test waits for the first approval and
  "Up to date" before the second tap.
- `dev/` — development runs on disposable PostgreSQL (`table_test`), labelled:
  - `INVALID-la05-setup-update-refused.log`: the first run of LA-05; its setup tried to UPDATE a recipe row's
    `source_row_id`, which the database refuses (rows are immutable). A test-setup error — **not** a result. The
    test now sets the source row when the row is inserted.
  - `la05-red-on-72cf615.log`: LA-05 against the audit as reviewed (`72cf615`), with the complete audit function: the
    later legacy copy of the changed cucumber (stored 0.5) is reported recoverable to 2 for 3 servings, version 1.
  - `la05-red-all-assertions-on-72cf615.log`: a temporary copy of LA-05 with soft assertions (deleted after the run),
    to show every check at once: 6 of 8 failed — both cucumber copies (2 for 3 instead of 1/2), the bean row whose
    lineage source does not support its amount (recoverable instead of conflicting; its detail check had no conflict
    to read), its later copy, and the final "no 0.5 row recoverable to 2" check (4 such rows). The unchanged onion and
    the original bean import held.
  - `mutations/`: targeted run of the two new mutations and the four existing audit mutations on the working tree
    before the commit — all six KILLED.
- No website, Kroger, Instacart, FoodData Central, Render or Neon request was made; no household data was read or
  written; the lab branch was not written; nothing was deployed. Browser JSON secret redacted
  (`e2e-only-secret[REDACTED]`).
