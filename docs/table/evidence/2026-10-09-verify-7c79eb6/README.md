# Evidence — B10 partial handoff, continuous URL-to-cart journey, migration lock, verified at 7c79eb6

- `summary.md` + logs/JSON: `scripts/verify-all.sh` on `7c79eb6` (clean tree, source hash unchanged): vitest 1129/1129,
  Playwright 139/139 (Chromium), mutation self-test PASS, 93 mutations killed / 0 survived / 0 error.
- `dev/journey/run1-FAIL-callback-redirect.log`: the first journey run — after Kroger's (locally answered) sign-in the
  member landed on the login page; the trace showed the callback redirecting to `http://localhost:3105/household…`
  (the server's bind address). Fixed in `7c79eb6` (same-origin relative Location). `run-final-pass.log`: the passing run.
- `dev/b10-mutations/`, `dev/mig-mutation/`: the targeted mutation runs before the full harness (all KILLED).
- The migration lock and its red-before-green record are in `../2026-10-09-deploy-rehearsal/`.
- No website, Kroger, Instacart or FoodData Central request was made; the pilot was not contacted; nothing was
  deployed or sent. Browser JSON secret redacted.
