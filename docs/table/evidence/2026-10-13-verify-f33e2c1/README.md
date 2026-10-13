# Evidence — photo-first catalog and recipe (D151), verified at f33e2c1

One presentation-only pass over the existing services, implementing the owner-approved previews (catalog and opened
recipe, 2026-10-13). Branch `claude/photo-first` from `a04f852`; no command, query, schema or migration change.

- `summary.md` + logs/JSON: `scripts/verify-all.sh` on `f33e2c1` (clean tree, tracked-file hash unchanged during the
  run): **PASS** — typecheck; vitest 1220/1220; Playwright 173/173 (Chromium; three new: PF-1 touch catalog, PF-2 add
  then update the same selection, PF-3 nutrition and cost completeness); mutation self-test PASS; 132 mutations killed,
  0 survived, 0 error. `screens/` holds the screenshots `verify-all.sh` copies from the browser run.
- `screens-compare/`: the approved previews beside the running implementation at the same phone size (390×844):
  `side-catalog.png`, `side-recipe.png` (not selected; already selected), `side-recipe-full.png` (incomplete
  nutrition; no photo with nothing known), `side-large-text.png` (320 px at 200% text). `approved-*.png` are the
  approved previews as rendered.
- The implementation screenshots were taken from a local production build against the disposable **test** database
  (fixture household "test household", synthetic nutrition). Stand-in photos were attached to fixture recipes there
  only, to show photography; they are not in the repository's code, fixtures or any household. Recipe names and
  numbers in the screenshots are fixture or illustrative values. Stand-in photos (Wikimedia Commons, cropped):
  brisket tacos — Steve Rainwater, CC BY-SA 2.0; shakshuka — HaJunkiyada, CC BY-SA 4.0; tomato-cream chicken penne —
  Ginny from USA, CC BY-SA 2.0; three-bean chili — Carstor, CC BY-SA 2.5; vegetable noodle stir-fry — Free for
  Commercial Use (FFCU), CC BY-SA 2.0. In the implementation screenshots they appear on fixture recipes with other
  names; "Photo by Jon" is how the app credits a photo a member added.
- Development runs (not kept): full browser suite on 9ab2787 166/173 (7 failed: tile text clipped at large text, the
  hidden sync status measured as clipped, a duplicated test id, tests addressing moved controls) — all fixed in
  f33e2c1; affected specs re-run 40/40 and 53/53 before the full run above.
- Not covered: Safari/WebKit, physical phones. No website, provider, Render or Neon request; no household data read or
  written; nothing deployed; `main` not moved. Browser JSON secret redacted (`e2e-only-secret[REDACTED]`).
