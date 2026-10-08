# Evidence — visual update (verify-all on f22f9d5)

- `summary.md` and the logs/JSON beside it: `scripts/verify-all.sh` on the clean commit `f22f9d5`
  (typecheck PASS · vitest 298/298 · build PASS · Playwright 121/121 · mutation self-test PASS ·
  64 mutations killed, 0 survived, 0 error). The test-only auth secret is redacted.
- `contrast.md`: every theme token pair, light and dark, measured from `src/app/globals.css`.
- `screens-before-02a3b1a/` (the code before this update) and `screens-after-f22f9d5/`: Week, Cook,
  Groceries, Our Recipes, a recipe, Explore and a proposal, at 390 × 844 and 320 × 640, with the
  browser set to prefer light and dark. `*-top.png` is what the phone shows on arrival (full
  resolution); `*-full.jpg` is the whole page at half scale (the fixed header and tab bar appear once,
  where the page was scrolled). Captured by `tests/e2e/ui-screens.spec.ts` (`run.log` in each folder);
  the "before" spec file was copied into a separate checkout of `02a3b1a` for that run only. The
  earlier code has a single dark theme, so its "light" captures are dark.
- `dev/`: the first full Playwright run of the update (31 failed — see ACCEPTANCE "Visual update"),
  the rerun of those 31 after the fixes (all passed), and the contrast mutations run before commit.

Chromium only. Safari/WebKit, VoiceOver and physical phones: NOT RUN (B8).
