# Table — URL → recipe → dinner → groceries → Kroger → pickup cart

Product priority set 2026-10-08: the primary use is **find a recipe online → paste its URL → Table reads
its usable details (and permitted photography) → save → choose it for dinner → consolidated ingredients →
actual Kroger products → a pickup cart**. Typing a recipe or its ingredient lines is the fallback.

This file is the audit (what blocked real online recipes), the prioritized plan, what was built
credential-independently on 2026-10-08, and the steps that genuinely need the owner.

## 1. Audit — what prevented using real online recipes (at `9623de4`)

| # | Blocker | Kind | Evidence in the code at 9623de4 |
|---|---|---|---|
| A1 | **Page reading is off everywhere but tests.** Every URL ends in "paste the ingredients". | owner gate R1 | `recipeFetchMode()` → `off` unless `TABLE_RECIPE_IMPORT_FETCH=on`; the import route returns `fetch_off`. |
| A2 | **The live reader had never run** — not even locally. `nodeTransport` (pinned TLS socket) and `systemResolver` were "not exercised by tests". | reliability | `fetcher.ts` "Production wiring (not exercised by tests)". |
| A3 | **Extraction dropped most of a real recipe page.** Only JSON-LD; instructions, photos, description and site name were not returned; `@id` references (the Yoast `@graph` most WordPress recipe plugins emit) were not resolved, so author/publisher were lost; microdata-only pages were "unsupported"; Open Graph data ignored. | code | `jsonld.ts` `RecipeCandidate`; D88. |
| A4 | **No way to record permission to keep a page's method or photos.** D22/D83/D88 forbid photos and copied methods outright, so even with reading on, an imported recipe had no method and no picture. | policy + code | D22, D83, D88; `recipe_import_drafts.household_instructions` "typed by a member, not copied". |
| A5 | **Review friction on ordinary lines.** Cans, cloves, bunches, thirds, ranges, "to taste", parenthetical sizes, price annotations all went to review with **empty** fields; preparation text stayed in the name ("onion, diced"), so the same ingredient became different grocery items. | code | `ingredient-line.ts`; `slug(name)` keys. |
| A6 | **Two separate steps** (Save link, then open it and press Import). | UX | `SaveLinkForm` "doesn't read the page". |
| A7 | **Coarse failures.** Refused (401/403), gone (404), rate-limited (429), server error (5xx) and "no recipe data on this page" were one or two messages; a passing failure was recorded on the link and a once-unsupported page could never be read again. | code | `FETCH_MESSAGES`, `importFromLink`. |
| A8 | **No attribution or way back to the method** on the recipe and Cook screens (only a site label). | UI | `RecipeDetail`, `CookView`. |
| A9 | **Kroger products could be searched but not used**: `searchKrogerProducts` existed in the adapter with no route, command or UI; `AddProduct` always made a *simulated* product; no Kroger price observations. | code | `adapter.ts`, `groceries.ts`. |
| A10 | **Budget Bytes** was a link lane only, with no search and a two-step save → paste. Reading its pages stays blocked by its permission request (D90). | permission R2 | `Explore.tsx`, D90. |

Real-world note (2026-10-08): a single manual check of `https://www.budgetbytes.com/index/` from this
environment answered **HTTP 403** — large recipe sites may refuse automated reads regardless of Table's
settings. Table now says so in words (A7) and the paste fallback stays one step away.

## 2. Prioritized plan

P1 is the critical path; P3 depends on owner Kroger gates for live use but was finished against the
fake transport; P2 is bounded by Budget Bytes' permission.

| Order | Item | Status 2026-10-08 |
|---|---|---|
| P1.1 | One step: "Add a recipe from a link" saves + reads + opens the review (Recipes screen, Budget Bytes lane) | **built** |
| P1.2 | Extraction: instructions (HowToStep/HowToSection), photos (ImageObject, `@id`), description, author/publisher via `@id`, site name, category/cuisine, Open Graph fallback, microdata fallback | **built** (worker, unit-tested) |
| P1.3 | Content policy: what of a page's own method/photo is KEPT — default nothing; owner switches C1 (household-private copies) and C2 (per-site grants); Budget Bytes never | **built**, both switches **off** |
| P1.4 | Permitted photos: SSRF-checked photo read, type sniffed from bytes, ≤5 MB, stored with hash, page and permission; served only to members; export/restore as base64 | **built** |
| P1.5 | Attribution and method link on recipe and Cook screens; kept method prefilled as editable steps | **built** |
| P1.6 | Human review of uncertain lines: suggestions (count units, package sizes, thirds, quarts/pints, ranges, alternatives, "to taste") shown with what they did, never applied without a member; "Use all suggestions" after review; prep text split off names | **built** |
| P1.7 | Failure classification (refused / gone / rate-limited / server error / no recipe data / no ingredients) with passing problems not recorded on the link and retry allowed | **built** |
| P1.8 | Live reader tested against a local TLS server (certificate/host checks, gzip, size cap, redirects, photo mode) | **built** |
| P1.9 | Turn page reading on in the deployed app | **owner gate R1** |
| P1.10 | Decide what may be kept (C1 or per-site C2) | **owner gate C1/C2** |
| P2.1 | Budget Bytes lane: site search (opens Budget Bytes), index link, add-from-link → paste with a name from the link, saved/imported states | **built** (search URL pattern unverified — site returned 403) |
| P2.2 | Reading Budget Bytes pages, its feed, method or photos | **owner gate R2** (permission from Budget Bytes) |
| P3.1 | Kroger product search at the household's store from the product dialog; bulk "Match products at Kroger" (≤12 lines, member chooses each) | **built** (fake transport) |
| P3.2 | `ChooseKrogerProduct`: server re-reads the product by id; records UPC, package (from Kroger's size text, or the member's stated size — never guessed), store price (promo as promo, store and time), mapping; bound to the product the member saw (B15); withdraws a stale approval | **built** |
| P3.3 | Live product search/choice | **owner gates K1–K5** (app, credentials, scopes, store) |
| P3.4 | Cart writes (pickup cart) | **owner gates K6/K7 + modality** — unchanged, still not ready |
| — | Dinner choice → consolidated ingredients → approvals → transfer | existing, unchanged (accepted-week contract preserved) |

Verified: `184d99f` — `docs/table/evidence/2026-10-08-verify-184d99f/summary.md`: vitest 1095/1095, Playwright 131/131, 83 mutations killed, 0 survived, 0 error.

## 3. What needs the owner (only these)

| Gate | Decision | Why it can't be done without you |
|---|---|---|
| **R1** | Turn on page reading in the deployed app (`TABLE_RECIPE_IMPORT_FETCH=on`) | Table would make requests to third-party websites on your behalf. |
| **C1** | Keep a private household copy of each imported page's method and one photo (`TABLE_RECIPE_CONTENT=household_private`) | Copying authored text and photographs is a content-reuse decision (copyright/terms), even for private use. |
| **C2** | Or: name sites that have permitted reuse (`TABLE_RECIPE_CONTENT_GRANTS=site=instructions+photos`) and record the permission | Needs the site's licence or written permission. |
| **R2** | Ask Budget Bytes for permission (pages, method, photos, feed) | Budget Bytes asks for permission before reuse. |
| **K1–K5** | Kroger developer app, credentials, scopes, store, then `KROGER_ACTIVATE=products` with `TABLE_RETAILER=kroger` | Real Kroger API access. |
| **K6/K7 + modality** | Data-retention decision and cart activation once `modality` is documented | Real cart writes to your Kroger account. |
| **H1/H3** | Hosting choice and approval | Provisioning and possible cost. |
