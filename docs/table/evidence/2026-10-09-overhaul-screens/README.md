# Import overhaul and redesign — before/after screens (2026-10-09)

Captured by `tests/e2e/screens-overhaul.spec.ts` (Chromium, production build, the test household, a separate test
server that records a test grant for the synthetic site `pesto.example.com` only):

- `before/` — the code at `cb7b56e`, `after/` — the verified overhaul `8e6bd6e`.
- Views: `390-light`, `390-dark`, `320-light-200` (320 px wide at 200 % text). Screens: 1 Week, 2 Groceries, 3 Our
  Recipes, 4 a recipe, 5 the import review of the synthetic pesto page (`-p1…` = the dialog scrolled one screen at a
  time), 5b the review after settling the two uncertain lines, 6 the imported recipe (after only — the old review
  could not be completed with this page without deciding each line by hand).
- `compare/` — before and after side by side for the main screens.

The pesto page and its picture are synthetic: `tests/fixtures/import-site/pesto.html` and `pesto-hero.jpg` (a
generated illustration made by `make-pesto-hero.py`, not a photograph and not copied from any site). No real recipe
site, retailer or provider was contacted.
