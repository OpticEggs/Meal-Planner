# Table — Integration capabilities

Status legend: **documented** (official text read) · **implemented** (code exists) ·
**fixture-tested** (passes against recorded, official-example or synthetic fixtures through an
injected transport) · **provider-read** (a real read-only response from the provider was captured) ·
**live-verified** (exercised against the real provider in this household's configuration with
authorization) · **blocked**.

**Nothing in this file is live-verified.** No Kroger account, app registration, token, product lookup,
location lookup, cart write, order or pickup reservation was made, and no request of any kind was sent
to a Kroger API host. The only provider responses captured are three read-only FoodData Central demo
requests (below).

## Retailer adapters in this build

| Adapter | Mode | What it does | Status |
|---|---|---|---|
| Recording fake ("Simulated retailer") | `TABLE_RETAILER=simulated` (default) | Records exact request bodies, call counts and dispatch IDs; behaviors ack, reject, accept-then-timeout, delay-until-barrier. Every transfer screen says **Simulated retailer — nothing is sent to a store**. | implemented, fixture-tested |
| Kroger | `TABLE_RETAILER=kroger` + `KROGER_ACTIVATE` | `src/server/integrations/kroger/`: customer authorization (authorization code + PKCE S256, single-use hashed `state` bound to household, member and redirect URI, 10-minute expiry), tokens sealed with AES-256-GCM (`TABLE_TOKEN_KEY`, household-bound), coordinated single-use refresh, product/location mapping (unknown stays unknown), cart payload from the frozen batch with batch-level outcomes. Every Kroger call goes through a transport that refuses to touch the network unless that capability is activated. | **connect / products / cart: documented, implemented, fixture-tested; not live-verified. Cart is not ready even when activated** (`modality` undocumented). Live **blocked**: no app registration, credentials, store or authorization. |

### Staged activation (all OFF in this build and in the deployment templates)

`KROGER_ACTIVATE` is a comma list of `connect`, `products`, `cart` (absent = none):

| Capability | Requires | What turning it on allows | Gate |
|---|---|---|---|
| `connect` | client id/secret, redirect URI, `TABLE_TOKEN_KEY`, `KROGER_CUSTOMER_SCOPES` | a member connects the household's Kroger account (token exchange, refresh) | owner directive for B5(b) |
| `products` | client credentials, `KROGER_PRODUCT_SCOPES` (and `KROGER_LOCATION_SCOPES` for store search) | read-only product and store lookups; ingredient → product matching in Groceries (search, bulk match, `ChooseKrogerProduct` re-reads the product and records UPC, package, store price, mapping — D100; only products sold by the unit, D105; fixture-tested, browser-tested on a test server with the scripted fake, D106) | owner directive for B5(b) |
| `cart` | `connect`, a connection, a store, **and a documented `modality`** | one `PUT /v1/cart/add` per approved batch | separate written approval naming account, products and quantities (B6) |

Production refuses `KROGER_ACTIVATE` unless `TABLE_RETAILER=kroger` (and `/api/health` reports
`KROGER_ACTIVATE_without_kroger_retailer`). Test-only routing to the in-process fake
(`TABLE_KROGER_FAKE_TRANSPORT`) is refused outside `TABLE_ENV=test`. A household without a valid
connection or store is refused **before** anything is frozen. Outcomes: 204 → acknowledged, batch-level
only (never per line, never an order, never a pickup reservation); documented 400/403/404/409 →
failed; 401 → failed and the connection needs authorization again (the write is not retried);
5xx, timeout, network error or an undocumented response → uncertain, never replayed. Disconnect discards
Table's tokens only (Kroger documents no revocation endpoint).

### Kroger Public API — documentation re-read 2026-10-08

Source method as before: developer.kroger.com content files (`/api/v1/developer/content/<pageId>.json`,
base64 bodies decoded locally) and Kroger's public Postman collection. The formal OpenAPI reference
needs a developer token and was not requested. Full table with URLs, retrieval times (12:26–12:27Z) and
hashes: `evidence/2026-10-08-verify-c19bd5a/kroger-docs/kroger-docs-findings.md`.

**Confirms** the 2026-10-07 notes: authorize/token endpoints with Basic client authentication; access
token 30 min (`expires_in: 1800`) still conflicting with tutorials' 172800; refresh tokens only from the
authorization-code grant, ~6 months, single use (reuse → 400); daily rate limits; certification has no
customer accounts (Cart/Identity must be tested in production); price and fulfillment only with a
`locationId`; cart add body `{items:[{upc,quantity,modality}]}` with 204/400/401/500 and a batch-level 204;
no public cart read, order, checkout or pickup endpoints.

**Changes:** PKCE S256 is now documented, including for confidential clients alongside Basic auth
(implemented exactly so). The locations default-limit conflict is explicit (9999 vs 10 within 10 miles);
Table always sends an explicit limit.

**New:** error bodies `{errors:{timestamp,code,reason}}` and `{error,error_description}`; status codes
200/201/204/400/401/403/404/409/500; `stockLevel` HIGH/LOW/TEMPORARILY_OUT_OF_STOCK; fulfillment filter
codes ais/csp/dth/sth; decimal-dollar prices with `promo: 0` when not on sale; free-text `size`; locationId
8 characters; no token revocation endpoint; credentials are locked to the environment chosen at
registration; conflicting scope names across pages; **acceptable-use rules** (below).

**Unsettled (left disabled or owner-configured, nothing guessed):** `modality` values/requiredness (cart
stays not-ready); scope names for Table's app (`KROGER_*_SCOPES` required, no defaults); whether Kroger
echoes `state` (Table requires it; absent → refused, nothing stored); token lifetime (the returned
`expires_in` is used); Basic auth on refresh (sent, per the refresh tutorial and RFC 6749 §6); 401 body
shape; `soldBy` values; currency (assumed USD, recorded as assumed); rate-limit response and retry policy
(writes are never retried).

### Kroger acceptable use — owner decision before any cart activation

Kroger's Acceptable Use page prohibits, among other things: "tracking, sharing, or storing data derived
from items added to a customer's cart" (only temporary display caching is allowed); storing data derived
from customer searches or systematically building a database from responses; using the profile ID to
store customer data; storing customer location data. Table already stores no search results, no profile
id and only the store the household chose. **Open:** Table's append-only purchasing history keeps the
frozen batch it sends and the acknowledgment evidence permanently, and recording a Kroger price into
`price_observations` would be data derived from a search. Whether either is permitted is an owner/legal
decision (OWNER-INPUTS K6) before `cart` or price recording is activated. Behavior is unchanged in this build.
B10 (2026-10-09) adds one more record of the same kind: a partial batch keeps its omission summary (left-out
lines, reasons, packages). A drafted, **unsent** question to Kroger covering modality, `soldBy`/quantity and
retention is in `PROVIDER-INQUIRIES.md`. The 2026-10-08 documentation content ids returned 404 on 2026-10-09;
the current ids are listed there.

## Nutrition source — USDA FoodData Central (B7)

| Item | Status |
|---|---|
| Search and food detail (`POST /v1/foods/search`, `GET /v1/food/{fdcId}`), server-side key, typed outcomes (ok, no matches, not configured, invalid key, rate limited, timeout, unavailable, malformed) | documented (API guide and OpenAPI spec read 2026-10-08), implemented, fixture-tested |
| Normalization of Foundation, SR Legacy, Survey (FNDDS) and Branded shapes: per-100 g basis, energy 208 → 958 → 957 (kcal only, which number used is recorded), protein 203, fat 204, carbohydrate 205; missing or wrong-unit values stay unknown; a branded serving is never treated as 100 g and ml is never grams; portions only when a member picks one | implemented, fixture-tested |
| Explicit match review: candidate values per basis with a review digest; the member chooses the form (raw, cooked, as sold); confirm re-fetches and refuses changed values or a stale revision; clear goes back to unknown; append-only history (`nutrition_matches`) with provenance (`fdc_api`, `fixture_fetched_demo`, `fixture_official_example`, `fixture_synthetic`, `manual_label`), retrieval time and a key-free source URL | implemented, fixture-tested (unit, real-PostgreSQL integration, two-member browser) |
| Never treated as allergen clearance; never rewrites accepted dinners, recipe versions or targets; values for another form than the recipe uses are unknown | implemented, fixture-tested |
| **Provider reads:** three read-only requests with the documented `DEMO_KEY` on 2026-10-08 — a search (200), a Foundation detail that returned a genuine **429 `OVER_RATE_LIMIT`**, and an SR Legacy detail (200). The demo key's limit header read 10 (shared by this environment's egress address), not the documented 30/hour. **3 of the 5 requests authorized for the whole pass; no further request was made**, the 429 was not retried. Stored byte-for-byte under `tests/fixtures/fdc/fetched-demo/` with hashes. | provider-read (demo access) — **not production validation** |
| The household's own key (`FDC_API_KEY`) | **blocked** on the owner (free signup); a real key is ignored in the test environment |

FDC data are CC0 public domain; the suggested citation is "U.S. Department of Agriculture, Agricultural
Research Service. FoodData Central".

## Recipe sources (multi-source handoff, phases 1–3)

| Capability | Status |
|---|---|
| Shared saved links: validation, normalization/de-duplication, attribution, notes, archive/restore, export/restore | implemented, tested (unit, real-PostgreSQL integration, two-member browser) |
| Page reading for import (`safeFetch`: SSRF checks, pinned connection, redirects re-validated, size/time/decompression limits) | implemented; the production transport and resolver are **tested against a local TLS server** (certificate/host verification, gzip, caps, refused redirects, photo mode — unit LT-01..04); real page reading is **OFF** (`TABLE_RECIPE_IMPORT_FETCH` unset, owner gate R1). Large sites may refuse automated reads (budgetbytes.com answered 403 to one check on 2026-10-08) — Table reports that in words and offers paste |
| Source policy through redirects (RUC-01) | the read policy (Budget Bytes: never) is asked before every request — the first address, each redirect hop and each photo request; what may be kept is decided for the page actually read; photos only from that site or owner-listed photo hosts (D102–D104) |
| What of a page's own content is kept | `TABLE_RECIPE_CONTENT` (`off` default, `household_private` = owner gate C1) and `TABLE_RECIPE_CONTENT_GRANTS` (per-site, C2); Budget Bytes never. Kept photos: sniffed bytes ≤5 MB in `recipe_images`, member-only route, export/restore (D95, D96) |
| Extraction of instructions, photos, description, author, site name (JSON-LD with `@id` resolution, microdata and Open Graph fallbacks); suggestions for uncertain ingredient lines, applied only by a member (D94, D97) | implemented, tested with synthetic real-world-shaped pages |
| JSON-LD Recipe extraction, conservative ingredient-line parsing, reviewed drafts, confirmation into an imported recipe version with source provenance | implemented, tested with **synthetic** pages only (no real site's content) |
| Paste-the-ingredients import (any link, including link-only sites) | implemented, tested |
| Budget Bytes | **link-only**: official index link, saved links and household-confirmed recipes. Pages are never read; no photos, methods or posted prices are copied. Any broader use needs Budget Bytes' permission (their FAQ: reuse on other sites is evaluated case by case; commercial use needs a license) |
| Schema.org `Recipe` markup | treated as a data format, **not** permission to reproduce content |

## Shopping destinations and Instacart (phases 4–5)

| Capability | Status |
|---|---|
| Where to shop per pickup (store cart / Instacart list / another store), revision-bound; destination-scoped products and prices; stale-review protection | implemented, tested |
| Copy/download the grocery list (text, CSV) | implemented, tested; records nothing |
| Instacart Developer Platform — nearby retailers (`GET /idp/v1/retailers`) | documented (docs read 2026-10-08), implemented, **fixture-tested with doc-shaped synthetic responses**; **not provider-read, not live-verified**; OFF (`INSTACART_ACTIVATE` unset). Returns retailer brands/keys only — not store locations, pickup slots, stock or prices |
| Instacart — shopping-list link (`POST /idp/v1/products/products_link`, `line_item_measurements`) | documented, implemented, fixture-tested; **not provider-read, not live-verified**; OFF. A link is not a cart write, not an order, and says nothing about the store, products or prices the member will choose. The link host is trusted only for `www.instacart.com` (the docs do not state the domain) |
| Instacart Connect (retailer-partner fulfillment APIs) | **not used** — not available to Table |
| Kroger direct | unchanged: fail-closed adapter, all capabilities off (see above) |

Capability states shown in the app are factual: `not_configured`, `configured_fixture_only` (test fake),
`configured_not_verified`. None is ever shown as verified.
