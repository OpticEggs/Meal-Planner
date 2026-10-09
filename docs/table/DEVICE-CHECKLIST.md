# Table — Device validation checklist (B8)

Prepared 2026-10-08 (updated for B5/B7 the same day). **Nothing in this file has been executed.** Every result starts as **NOT RUN**;
a check that cannot be performed is **BLOCKED** with the reason. Never pre-fill PASS.

Run it on the deployed candidate (B9) with the **simulated retailer** — nothing is sent to a store.
Two people, two devices, signed in as two different members, at the same time where a check says so.

## Evidence categories — never substitute one for another

| Category | What it is | Where its results live |
|---|---|---|
| A. Chromium automation | Playwright, Chromium, root font size injected for 150%/200% | `docs/table/evidence/*-verify-*/` (already recorded) |
| B. WebKit automation | Playwright's WebKit engine | **BLOCKED** in the build environment (not installed; downloads not permitted) |
| C. Real device, manual | A person using Safari / Chrome on a phone, with its own system text size | this checklist |
| D. Screen reader, manual | VoiceOver (iPhone) or TalkBack (Android) operated by a person | this checklist |

A category-A pass is not evidence for C or D.

## Run record (fill one per device)

| Field | Value |
|---|---|
| Device model | |
| OS and version | |
| Browser and version | |
| Text size setting | (Settings → Display & Brightness → Text Size, and Accessibility → Larger Text, if used) |
| Screen reader | none / VoiceOver / TalkBack |
| Application commit | (shown by `git rev-parse HEAD` of the deployed release) |
| Deployed URL | (the service's https origin; do not record passwords) |
| Date / time and tester | |

## Checks

Result values: PASS · FAIL (describe what happened) · BLOCKED (why) · NOT RUN.
"Automated reference" names the existing test that checks the same behavior in Chromium.

| # | Check | Expected result | Automated reference | Result | Observed |
|---|---|---|---|---|---|
| D01 | Sign in as each member on its own device | Each lands on Week, sees the household's name and their own name; no sign-up link exists; a wrong password shows an error and signs nothing in | X01, first-slice | NOT RUN | |
| D02 | Plan and adopt: one member proposes, the other adopts the shown week | One accepted week on both devices; no order, cooking or eating record created | T02 | NOT RUN | |
| D03 | Simultaneous changes: both change different nights at the same time | Both changes survive; each device shows the other's change without reloading | T10, T08 | NOT RUN | |
| D04 | Same night at the same time | The second Apply is refused with the current choice shown; nothing silently overwritten | T11 | NOT RUN | |
| D05 | Background and resume: open a preview, switch apps / lock the phone for 2+ minutes while the other member changes that night, return | The newer decision is shown, the draft is marked out of date, Apply is disabled until reviewed; focus stays in the open sheet | T09, B14 background test | NOT RUN | |
| D06 | Reload / close the tab and reopen | Accepted week, previews and stale status persist | "Reload preserves accepted state" | NOT RUN | |
| D07 | Grocery review while the other member changes a dinner | The reviewer sees the change as a delta; unaffected approvals stay; a stale Send makes no transfer | T13, B14 grocery review | NOT RUN | |
| D08 | Capture before order confirmation: Also need from Week, Groceries and Cook | Requests merge with both names; an explicit extra stays extra | T18, R-F07-UI | NOT RUN | |
| D09 | Simulated send, then confirm the order with different contents, then change Friday | The order shows what was confirmed; the change appears as "not sent yet"; nothing is reversed; every transfer screen says **Simulated retailer** | T14/T20 | NOT RUN | |
| D10 | Capture after order confirmation, then record receipts (received / missing / substituted) | Later requests are separate from the confirmed order; receipt exceptions are recorded, append-only | T14/T20, B15 receipts | NOT RUN | |
| D11 | Modal sheets with a hardware keyboard (iPad or Bluetooth keyboard), if available | Focus moves into the sheet, Tab stays inside, Escape closes without applying, focus returns to the control that opened it | B14 keyboard only, B15 dialogs | NOT RUN | |
| D12 | Safari text size at the largest standard setting, then with Accessibility → Larger Text on | All screens readable; nothing cut off; no sideways scrolling; buttons not hidden under the header or bottom bar | B18 sweep (category A only) | NOT RUN | |
| D13 | Safari page zoom (aA → 150%, 200%) | Same as D12 | B18 sweep (category A only) | NOT RUN | |
| D14 | VoiceOver: navigate Week, open Change on a night, choose Replace, Apply | Each control is announced with a distinct name ("Change Friday …"); the sheet is announced as a dialog; the page behind is not reachable; Apply/Cancel results are announced once | B14 names and states, announcements | NOT RUN | |
| D15 | VoiceOver: Groceries — approve a line, open the product dialog, confirm an order | Line states ("Need", "unavailable", "unresolved") are spoken; errors are read with their field; the two-step order confirmation is clear | B15 tests | NOT RUN | |
| D16 | VoiceOver: recipe editor conflict (the other member saves the same recipe while it is open) | The incoming changes and both versions of a conflicting field are read in full; Save is announced as unavailable until decided | RB17 tests | NOT RUN | |
| D17 | VoiceOver: Household — targets, exclusions (remove asks first), usual items | Errors are read with their fields; "Keep it" is the default in the removal confirmation | B16, B17 household | NOT RUN | |
| D18 | Rotate the phone during an open sheet | The sheet stays usable and focus stays inside | — | NOT RUN | |
| D19 | Poor connection: airplane mode for 30 s with the app open, then back online | The app shows it is offline/refreshing, then catches up without a reload; nothing typed is lost | B14 store refresh | NOT RUN | |
| D20 | Android Chrome (if a device is available): D01–D03, D12, D14 with TalkBack | As above | — | NOT RUN | |
| D21 | Household → an ingredient → **Find nutrition…** with no FDC key installed | The status line and the dialog say lookup is not configured; nothing pretends to search. With a key installed (after OWNER-INPUTS N1): search, open a candidate, choose the form, "Use these values"; unknown values read as "unknown"; VoiceOver reads the values with their units | b7-nutrition e2e (category A) | NOT RUN | BLOCKED for the keyed part until N1 |
| D22 | Household → Connections → Kroger card at the largest text size and with VoiceOver | Each capability is read with its evidence ("not live-verified"); "Connect Kroger account" is announced as unavailable; the store id error is read with its field | b5-kroger e2e (category A) | NOT RUN | |
| D23 | Cook page on both phones: one member taps **Mark cooked**; the other has the same dinner open | The other phone shows "Cooked · recorded by …" without a reload; a second tap anywhere adds nothing and says who recorded it. **Correct this: it wasn't cooked** opens a dialog whose first focus is "Keep the record"; VoiceOver reads the title and both choices; "It wasn't cooked" announces the correction and **Mark cooked** returns | cook-records e2e (category A) | NOT RUN | |
| D24 | Our Recipes → Saved links on both phones: paste a recipe link copied from Safari, add a note | It appears once on the other phone, attributed; "Open source" opens the page; a pasted link with tracking parameters doesn't duplicate it | ms-sources e2e (category A) | NOT RUN | |
| D25 | Import review with VoiceOver at the largest text size: paste three lines (one with "to taste") | Each line's radio group ("Use" / "Leave out of groceries") is read with the original line; "Create recipe" stays unavailable until every line is decided and servings entered; focus stays in the dialog | ms-sources e2e (category A) | NOT RUN | |
| D26 | Groceries → Where to shop: switch to "Another store", then Copy grocery list | Both phones show the new choice; Send disappears; the copied text pastes into Notes with the "list only" line; nothing is ordered | ms-groceries e2e (category A) | NOT RUN | |
| D27 | Our Recipes → **Add a recipe from a link**: paste a link copied from Safari (after R1) | The review opens with the site and author; unsure lines show a suggestion; nothing is a recipe until **Create recipe**; the recipe shows "From … · Open the original" | u2c-url-to-recipe e2e U2C-E1/E2 | NOT RUN | |
| D28 | Explore → Source → Budget Bytes: type a word and **Search on Budget Bytes** | Budget Bytes' own search opens in a new tab with that word (URL pattern not verified from this environment) | u2c-url-to-recipe e2e U2C-E3 | NOT RUN | |
| D29 | Groceries with the Kroger store (after K1–K5): **Match products at Kroger…** with VoiceOver | Each item lists products with size, price and pickup; choosing one is announced; nothing is added to a cart | e2e kroger-matching KM-E1..E5; integration u2c-kroger-mapping, ruc02 | NOT RUN | |

## WebKit automation

| Check | Result | Reason |
|---|---|---|
| Full Playwright suite under a WebKit project | BLOCKED | WebKit is not installed in the build environment and browser downloads are not permitted there. Run it where WebKit is available; the header-overlap test is already written to run under a WebKit project. |

## After a run

Record each FAIL as a backlog item with the device, steps and what was seen. A FAIL found here is
fixed and re-checked on the device; it is not closed by a Chromium re-run.
