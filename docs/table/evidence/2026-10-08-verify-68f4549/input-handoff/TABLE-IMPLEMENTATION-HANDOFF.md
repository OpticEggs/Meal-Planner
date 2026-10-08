# TABLE — RECIPE SOURCES AND MULTI-GROCER PURCHASING
## Claude implementation handoff — 2026-10-08

**Repository:** `OpticEggs/Meal-Planner` (existing `main`; do not create a replacement repository)  
**Inspected `main` when this document was prepared:** `3632963ac2cd1c1cc6e91a8383f67bb4c59b64e1` (docs-only receipt after B19/B20). **Re-fetch before acting.**  
**Roles:** Claude = implementation and integration owner; this package = product/engineering direction, not code or a grant to use third-party credentials.  
**Delivery objective:** Jon and Alex can save recipe links from diverse sites, review and retain supported recipes, browse Budget Bytes as a source, and select how to purchase the household's already-agreed groceries without losing the existing contract.

## 0. Authority and scope

Read `CLAUDE.md`, `docs/table/source/Table-Implementation-Plan.md`, `docs/table/source/Table-Claude-Handoff.md`, `docs/table/DECISIONS.md`, `docs/table/BACKLOG.md`, `docs/table/ACCEPTANCE.md`, `docs/table/IMPLEMENTATION-STATUS.md`, `docs/table/INTEGRATION-CAPABILITIES.md`, `docs/table/OWNER-INPUTS.md`, `docs/table/DEPLOYMENT.md` and current migrations before editing. Resolve changes after the inspected commit, and incorporate B21/B22 if already implemented. **Do not overwrite parallel work or reset `main`.** The user's recent B21/B22 approval remains in force; this feature assignment does not replace or reopen it.

**Existing architecture to extend, not replace:** Next.js/TypeScript/PostgreSQL, Better Auth, versioned `recipes` and `recipe_versions`, `SaveRecipeVersion`, per-household `interests`/favorites/preferences, `src/server/queries/library.ts`, `src/ui/{Explore,Recipes,RecipeEditor}.tsx`, planning previews and accepted-week commands, `src/domain/groceries/projection`, `src/server/groceries/recompute.ts`, `src/server/commands/purchasing.ts`, `src/server/integrations/retailer.ts`, staged Kroger adapter, append-only orders/transfers and `src/server/export.ts`. Existing unit/integration/e2e/mutation tests are non-negotiable.

**Fixed behavioral contract:**
- Exploring, bookmarking, extracting, importing, liking, saving to Sounds good, selecting retailers, updating prices, and changing preferences do **not** change an accepted week.
- Only adoption or a specifically reviewed and applied plan change changes accepted meal assignments. Recipe versions already assigned to dinners remain pinned.
- One reviewed purchase list drives a transfer. Destination selection changes purchasing inputs/review, **not** meals; old Send and old previews cannot commit stale state.
- Historical handoff batches, confirmed orders, packages and receipts are immutable. A completed/uncertain external write is not replayed by switching stores.
- Unknown quantities, prices, ingredient matches, nutritional values, allergens and retailer capabilities remain unknown—not zero, approved, feasible, or safe by implication.
- No compulsory pantry or automatic inventory. Preserve capture of Also need, individual portions/targets, leftovers, two-member concurrency, backups/export and accessibility.

## 1. User-facing outcome

**A. Save a URL quickly.** On Explore or Our Recipes: paste a URL, choose **Save link**; a shared, attributed bookmark appears immediately, even if the page has no machine-readable recipe. Either member can find it later and open the original. Do not force ingredient resolution when a user only wants to remember a meal. A copied link from a phone works; an OS share-sheet target is optional later, not a prerequisite.

**B. Import when possible.** On a saved link, **Import ingredients** attempts a bounded safe retrieval and structured-data parse (when the source's rules permit it), displays original ingredient lines alongside proposed structured quantities, servings, source, and uncertainty, then creates an immutable recipe version **only after deliberate human confirmation**. A URL with inaccessible/unsupported/ambiguous contents remains a bookmark with **Open source / Enter manually**. It must not enter weekly proposals as a fully quantified dinner prematurely. Full protected website prose/images are not automatically mirrored into Table.

**C. Budget Bytes lane.** Explore has a visible **Budget Bytes** source filter and **Browse Budget Bytes** link to `https://www.budgetbytes.com/index/`. Saved Budget Bytes links appear in this filter, with source attribution and original links. A user-picked page can follow the normal import path if permitted. Do **not** seed an invented or scraped complete Budget Bytes catalog; do not redistribute its photos/complete instructions without appropriate permission/license. An expanded licensed catalog is a distinct owner-approved future gate.

**D. Choose the shopping destination.** In Groceries show **Where to shop** with three accurate paths:
1. **Kroger direct** — available only after the already defined real credentials, account, store and cart-readiness gates; preserve existing fail-closed adapter.
2. **Instacart shopping-list handoff** — in a future verified configuration, prepare a hosted shopping-list link from the reviewed quantities; a member opens the link and chooses a participating retailer, products and checkout on Instacart. Never label this as direct cart update, checkout, pickup booking, or confirmed order.
3. **Other store / Copy grocery list** — always works: human-readable checklist grouped sensibly, accurate quantities and known/unknown prices, copy/download for external purchase. Copying does not mean items were ordered/sent/received.

**Nearby** means an **explicitly provided postal code**, with provider data only when the integration is enabled. Instacart's retailer endpoint returns retailer **brands/keys**, not evidence of a particular physical branch, local pickup slot, stock or price. If provider data are not available, show manually named stores, or no availability assertion. Do not claim that every grocer is integrated.

**E. After a destination switch:** keep dinners and independent requests, recompute store-specific product choices/package counts/price observability, invalidate affected approvals and outstanding reviews, update both members, show why prices are incomplete. Do not retroactively change sent batches or confirmed orders. A confirmed pickup is frozen; adding grocery needs afterward routes to the appropriate later pickup under existing rules, not a silent second order.

## 2. Data model and migration strategy

Prefer additive, reversible migrations. Inspect existing schema before finalizing names. Model these concepts separately; do not equate URL bookmarks with quantified recipes or retailer brands with store locations.

**Recipe bookmark / source:** `recipe_bookmarks` or equivalent: household_id; submitted_by; original_url; canonical_url (validated, redirect-aware if fetched); normalized source domain; source label; optional user-entered title/notes; created_at; last_checked_at; status (saved, metadata_found, import_draft, imported, unavailable, unsupported, permission_blocked); revision; optional linked recipe_id. Unique household + safely normalized URL; duplicates return the existing bookmark and preserve original contributor / optionally add a save event. Store only permitted limited metadata, not cached page HTML or photographs. A source/provenance table can relate multiple versions to one source URL.

**Import draft:** a separate, household-scoped persistent staging record with source revision, extractor version, original ingredient strings, proposed normalized amounts, explicit ambiguity/error annotations, reviewed_by/reviewed_at, and status. Keep original lines for audit where permitted; do not treat it as a RecipeVersion, and do not make it planable. Avoid retaining large copyrighted instruction bodies. Explicitly record the extraction method (`json_ld`, `microdata` if supported, `manual`, `user_pasted`) and source policy disposition. Human review converts a valid draft through existing versioning semantics.

**Shopping destination:** immutable `provider` identity separate from `retailer_key` (brand) and **store location** (if known). Add per-household preferred destination and per-pickup-cycle explicitly selected destination + revision, availability/evidence enum, and membership attribution. Treat `manual`, `kroger_direct`, and `instacart_list` as different fulfillment methods, not simple aliases of `RetailerAdapter.addToCart`.

**Retailer-specific mappings:** existing `product_mappings` is keyed at household ingredient scope; extending retailers requires an explicit provider/store context for products, packaging, and prices. Preserve existing Kroger/demo records with a proven migration and compatibility layer. Never reuse a Kroger UPC as a verified product match at an unrelated store. Do not null existing household history or change exact prior product ids in batches/orders.

**Provider-generated links:** if implementing Instacart adapter, store only permitted minimal link metadata (source payload hash/revision, provider, created_at, expiry if returned, link and request status) according to provider terms. Links may reveal grocery preferences: never log raw URL/query parameters or API keys. A generated link is not an order and does not prove any line is in a retailer cart.

**Export/restore:** update `src/server/export.ts` and migration/restore tests for any new household tables; exclude credentials/provider secrets and avoid exporting third-party restricted response bodies. Test old-schema household upgrade, round-trip export and unique/version constraints.

## 3. Bounded URL-import security and data accuracy

Treat all user-supplied links and remote HTML/JSON-LD as hostile input. Bookmarking a URL should not itself cause a server fetch. A dedicated **Import/Preview** action controls any retrieval.

**Fetcher specification:** allowlisted protocols (`https` for import; ordinary `http(s)` may be saved as an unvisited bookmark), reject localhost/loopback, RFC1918/link-local/private/reserved IPv4 and IPv6 including v4-mapped, numeric/encoded host tricks, credentials in URL, local/cloud metadata hosts and nonpublic ports. Revalidate at each redirect; cap redirects, DNS resolutions, bytes, elapsed time and concurrency. Avoid DNS rebinding (pin/connect to validated public addresses or use a similarly defensible outbound network control); block compressed expansion bombs. Never forward cookies, sessions, auth headers, internal secrets or user tokens to an external URL. Only parse `text/html`/supported JSON safely, with strict size and depth limits. No execution of scripts, arbitrary iframe, remote image hotlink, fetching child resources, browser rendering or login/paywall circumvention. Sanitized text only. Rate-limit and audit per member/household without storing sensitive page contents.

**Parser specification:** parse JSON-LD `@graph`, nested arrays, `@type` arrays, `Recipe`, `recipeIngredient`, `recipeYield`, prep/cook/total time and optionally structured step references. Preserve decimal/fraction/unit precision; use existing units code. Recognize unsupported measures ('one can', 'one bunch', 'to taste') as **requires review**, not invented mass. Preserve raw/cooked basis, component groups, non-quantified ingredient text and unsupported cases. No AI-generated quantities, calories or allergens; FDC matching remains a separate explicitly confirmed step. Never use third-party claimed nutrition to certify user targets without known basis and provenance.

**Rights:** `Recipe` markup is a discoverability convention, **not permission to republish**. A private URL bookmark/source attribution is distinct from mirroring full site content. For Budget Bytes, default to bookmarks, source links, limited permitted metadata and user-entered/personalized recipe data; no whole-site ingestion or remote photography. For any source that prohibits fetching or copying, keep link-only. If permission/law/terms are unclear for copyrighted expressive instructions, flag it and keep source instructions on the originating website. Do not copy an entire authored method as a substitute for permission. Any broader Budget Bytes catalog requires rights clarification/permission and explicit approval.

**Concurrency:** bookmark/import operations are household scoped, idempotent via `runCommand`, revision-bound. Simultaneous saves deduplicate without overwriting notes. Simultaneous edits to the import draft or linked recipe use current version checking and the RB17 field-by-field conflict/rebase behavior. One member's import cannot alter the other's accepted or in-review meal/grocery plan. Deleting/archiving a link does not remove an already saved recipe or accepted dinner; restore where appropriate.

## 4. Provider-neutral purchasing contract

Represent shopping outcomes as discriminated capabilities, not a generic boolean:

- `manual_export`: generates a human-readable/CSV list locally; no network call, not a transfer receipt, cannot mark ordered.
- `direct_cart_add`: Kroger's validated `StartHandoff` with immutable batch/dispatch, line acknowledgement granularity only as reported, known store and mapped package products, uncertain never retried.
- `hosted_list_link`: create an Instacart list from the **frozen current reviewed purchasing requirements** (names and supported units) only with granted API access; success yields a URL (`list_link_prepared`, not `cart_sent`), not product-level matched quantities or placed order. Opening it is a user action; user's selection and checkout happen on Instacart.

A change of destination is a **purchasing-input mutation**: version the cycle and recompute projection, invalidate affected approvals, require review and ensure old Send performs **zero** provider calls. An asynchronous list generation must operate on a frozen validated payload. If the accepted week, quantities or destination change before dispatch, cancel before external I/O. If a write may already have occurred, retain exact historical status, mark uncertainty, don't auto-reissue. Provider link dedup should be keyed by exact reviewed payload and scoped destination under explicit provider permission, without claiming exactly-once remote execution.

For confirmed orders, keep historical snapshots unchanged even if the store setting changes. If a user switches destinations after a confirmed order, show the known order and any residual needs separately; do not infer an order cancellation, edit or second pickup. The present single-pickup model remains unless separately expanded under B13.

**Provider capability descriptions must be factual:** `not_configured`, `configured_fixture_only`, `provider_read_verified`, `customer_authorized`, `cart_write_approved`, `handoff_link_generated` are distinct states. Do not show a retailer as locally pickup-capable unless observed/verified in that locality. Prices from a different store or historical Budget Bytes prices are not current local prices. Compare stores only on comparable, fully known values; otherwise visibly explain missing inputs.

## 5. Instacart discovery and handoff — bounded provider integration

Official Developer Platform docs describe:
- `GET /idp/v1/retailers?postal_code=...&country_code=US`: returns nearby **retailer organizations/keys**, not pickup slots or exact store branch locations.
- `POST /idp/v1/products/products_link`: creates a **hosted shopping-list page URL**; user chooses a store and shops/checks out there. `line_item_measurements` is preferred; bare line item `quantity`/`unit` is deprecated. Do not use product/UPC identifiers from another retailer unless valid for Instacart.
- Development and production endpoints and API-key access have their own provider approval requirements. Do not assume Table already has a key or entitlement, or that Instacart Connect (retailer-partner fulfillment API) is the same product.

Implement transport-injected client and realistic **offline fixture contract tests only** in this phase. Stage real enablement behind new config gates and server-side key storage. By default every Instacart capability remains disabled; missing account/API access is a truthful, non-blocking status. Never send a request to Instacart during routine tests or until separate owner authorization. Document list URLs' expiry and handling, idempotency/dedup, 4xx/5xx/timeout uncertainty, no product-level acknowledgement claim, and possible provider data-retention restrictions. End-to-end pickup reservations and order placement are excluded.

## 6. Budget Bytes discovery lane

Ship what is valuable and source-compliant **now**:
- `Explore` → Budget Bytes filter for household-saved source bookmarks and imported/confirmed household versions only.
- `Browse Budget Bytes` opens the official Recipe Index, source link retained; saving any selected URL returns to Table's shared Saved links area.
- Show a source chip, submitter attribution, recipe metadata only if user-supplied/permitted, and an explicit Import/Review action. A saved link is not automatically a complete structured dinner.
- A future licensed API/feed/catalog, site-wide indexed search, bulk fetch, server-side mirrored instructions or images is an **unimplemented rights and owner approval gate**. Do not call it complete or quietly implement crawling.
- Cost numbers posted by Budget Bytes are historical estimates, not comparable to Table's current selected store price. Keep separate labels.

## 7. Execution phases and mandatory exit gates

**Phase 0 — baseline and conflict resolution.** Fetch latest `main`; inspect active B21/B22 branches/work and current migration head; read CLAUDE instructions. Run pre-change baseline against isolated databases. Record current state; no resets, pushes or force pushes. If B21/B22 are underway, avoid same files until integrated, use an isolated worktree if necessary. Do not restate those decisions as unresolved.

**Phase 1 — bookmarks (complete vertical slice).** Migration, command(s), query, shared Saved links UI, source/domain filter and export. Household A/B save the same URL, see one record, track attribution, open original; no recipe or plan write. Validate unsafe/duplicate URL. Ship before a network fetcher.

**Phase 2 — reviewed structured recipe import.** Safe injected fetch transport and parser; offline HTML/JSON-LD fixtures for a normal recipe, @graph, multiple recipes, fractions, ingredient ambiguity, blocked/unsupported pages, untrusted URL attacks; explicit member import draft review; create versioned recipe, pin source, retain existing manual editor, FDC matching independent. An incomplete draft remains bookmark-only and out of planning. Do not fetch actual Budget Bytes pages or store their prose by default.

**Phase 3 — Budget Bytes source navigation.** Source filter in Explore and Our Recipes/Saved links, official-site navigation, link save/import state, duplication prevention; no scraped catalog. Save Budget Bytes URL and access it on both accounts. Add no stock imagery.

**Phase 4 — destination-neutral grocery review.** Per-cycle destination preference and revision, manual export, independent destination product/price mapping, truthful capability labels. Preserve already accepted plan, historical orders and independent requests. Switching destinations invalidates stale Send and affected purchase approvals; both members see current review. Do not enable provider network calls.

**Phase 5 — Instacart fixture adapter.** Transport injection and tests for `nearby retailers` + `shopping_list` link payload; user-entered ZIP, return retailer brand results only, explicit difference between generated link and cart/order. Cache only according to data policies. Provider integration OFF by default. Retain Kroger fail-closed capability and its existing tests.

**Phase 6 — regression, evidence, delivery.** Add tests from `TABLE-ACCEPTANCE-MATRIX.md`, verify source-red tests where practical, run typecheck, full real-PostgreSQL suite, production build, two authenticated browsers, both race orders, mutation harness (runner failures cannot count as catches), source hash checks, populated DB migration and export/restore. Keep Chromium-only evidence distinct from Safari/phone BLOCKED. Verify no network calls in offline tests. Commit scoped work and push only under the authorization in the initial prompt; docs/evidence later in a docs-only commit; restorable bundle + SHA-256.

After each phase, preserve a durable checkpoint and update `docs/table/IMPLEMENTATION-STATUS.md`; continue autonomously on independent, authorized work. Do not leave a working but unverified prototype in place of the agreed acceptance contract.

## 8. Explicit non-goals / owner gates

Not authorized by this brief: provider credentials in chat or source; new account registration; hosting/provisioning/spending; production deployment; real cart additions; checkout, order placement or pickup reservations; uncontrolled crawling; bulk Budget Bytes data collection; reproducing third-party photos/prose without permission; use of Instacart Connect fulfillment APIs; automatic re-planning; new pantry inventory; automatic cheapest-week algorithm; addition of retail providers beyond the named bounded methods; exposing a household grocery list through public pages.

Provider writes/reads are separate gates. Public read-only recipe import in a deployed household is a product capability that must be enabled only after the fetcher and source-policy review are complete; routine integration tests are fully offline. A specific production smoke test of a third-party URL or provider endpoint requires separate approval if that provider has not been validated. Kroger cart activation remains blocked by existing policy and credential issues. Instacart live API activation requires developer access and separate explicit approval.

## 9. Delivery report format

Report (a) baseline and final full hashes; (b) migration(s) and export impact; (c) each phase's implemented vs blocked scope; (d) acceptance case results and location; (e) tests, full logs, valid failures, hashes and `git bundle` identity; (f) honest capability table, including non-live/provider gates; (g) unresolved rights or terms questions and specific owner inputs; (h) no real orders, purchases, or network calls unless actually authorized and proven; (i) one clearly scoped next task, not an open-ended polish backlog.

### References and source limits (reverify before implementation)
- Existing Table repo files listed in §0 (snapshot inspected 2026-10-08 at `3632963`).
- Instacart developer platform: `https://docs.instacart.com/developer_platform_api/` and `/api/products/create_shopping_list_page/`, `/api/retailers/get_nearby_retailers/` (not the separate retailer-partner Instacart Connect API).
- Budget Bytes index: `https://www.budgetbytes.com/index/` and reuse FAQ `https://www.budgetbytes.com/faq/`.
- Recipe structured data: `https://developers.google.com/search/docs/appearance/structured-data/recipe` (data shape, **not a content license**).
