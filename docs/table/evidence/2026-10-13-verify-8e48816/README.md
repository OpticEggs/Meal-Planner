# Evidence — B46 correction (D153), verified at 8e48816

Owner-authorized bounded correction before merge: "Yes, record this order" pressed while the screen is not current.
Branch `claude/photo-first`, starting from code `634800f` / docs `07bc51c` (refs rechecked: unchanged, nothing newer).
Source delta: `src/ui/GroceryDialogs.tsx` only (+17/−3); test `tests/e2e/b46-refresh-window.spec.ts` (new).

## Full verification on 8e48816 — PASS

`summary.md` + logs/JSON: `scripts/verify-all.sh` on `8e48816` (clean tree, tracked-file hash unchanged during the run):
typecheck PASS; vitest 1220/1220; production build PASS; Playwright 177/177 (0 flaky, 0 skipped; 173 + B46-1..4);
mutation self-test PASS; 132 mutations killed, 0 survived, 0 error. The B46 diagnostics from this run are in
`playwright.log` (`B46_DIAG` lines).

## Deterministic reproduction (pre-fix) — `b46-prefix-634800f/` (failure artifacts, kept apart from passing runs)

The spec holds the `/api/snapshot` response (Playwright route), starts a refresh with a `focus` event, waits until the
screen reports `refreshing`, then taps the button at its position (`page.mouse.click`, which, like a finger, does not
wait for the button to become usable). No sleeps, no repeats. It counts click events that reach the button (capture
listener), ConfirmOrder requests leaving the browser, and `orders` rows.

Run on the unmodified app code (`634800f`'s source, built at `07bc51c`, with only the new spec added):
B46-1 and B46-2 FAIL, B46-3 and B46-4 pass (those protections already existed).

    pressed during refresh: button disabled=true; click events reaching the button 0; ConfirmOrder requests 0; orders 0; note shown false
    pressed offline:         click events reaching the button 0; ConfirmOrder requests 0; orders 0; note shown false

So of the two candidate mechanisms, it is the first: **the button was already disabled before its handler could run**;
the handler never ran (it is not "handler ran but sent nothing"). Folder: the run's log, and per failing test its
screenshot and error context.

## After the fix — `b46-targeted-8e48816/` and the full run

    pressed during refresh: disabled=false, aria-disabled=true; click events 1; requests 0; orders 0; note shown true
    after one retry once current: requests 1; orders 1 (with the typed extra line and pickup time); retailer calls unchanged
    pressed offline: click events 1; requests 0; orders 0; note shown; back online: still 0 requests, 0 orders

B46-3: Jon's screen kept current-but-stale (every refresh replays the pre-confirmation snapshot) while Alex confirms;
Jon's press is sent once and refused by the server (`already_confirmed`); 1 order; Jon's values kept on the edit step.
B46-4: a double press while current sends 1 request, 1 order.

Not changed: writes are still refused while refreshing or offline; nothing is queued or replayed; the server's checks
are untouched. Only this control changed — 44 other write controls still disable silently (backlog B47).

Not covered: Safari/WebKit, physical phones, live Kroger. No website, provider, Render or Neon request; no household
data read or written; nothing deployed; `main` not moved. Browser JSON secret redacted (`e2e-only-secret[REDACTED]`).
