# Kroger Public API — documentation findings for B5 (2026-10-08)

Read-only documentation pass. **No request of any kind was made to `api.kroger.com`,
`api-ce.kroger.com` or any Kroger account/login host.** The OpenAPI reference
(`/api-products/api/*-api-public`) was not re-requested: it needs a developer token, so it is not
an unauthenticated documentation file.

Sources (all retrieved 2026-10-08 between 12:26:27Z and 12:27Z; raw files, sha256 and
per-file retrieval time in `docs/RETRIEVAL-LOG.tsv`; decoded text beside each `.json` as `.md`):

| Short name | URL | sha256 (raw file) |
|---|---|---|
| Manifest | https://developer.kroger.com/api/v1/developer/content/manifests.json | c3b36944694a… |
| Quick Start | …/content/781ddf4b-3567-4fed-b427-e83e14ec3968.json (`last-full-review: 8/13/2026`) | 2ae4c148980d… |
| API Basics | …/content/27a55a95-53fb-4d73-ba0b-38fd82894fbc.json | d230deeca95a… |
| Acceptable Use | …/content/b1fb7782-6ada-47c0-98b1-ce429cd1f355.json | c8e929fe0f28… |
| Understanding OAuth2 | …/content/84c461f3-c796-4740-a48f-d538dca9583d.json | 011ccf744322… |
| Service to Service | …/content/b471752e-1008-4a8a-8227-d38156a6ccba.json | 8b8f7e5f54a5… |
| Customer Authentication | …/content/84aa79d1-5244-4622-82f6-b9c6a449354f.json | 01d28b545a13… |
| Auth Code Tutorial | …/content/1ee205c8-11c3-4d0e-a662-95b56ffc4060.json | 426ac81d07ce… |
| Refresh Token Tutorial | …/content/99eafa2c-a1c7-4035-aa55-0780b80418a1.json | 6a9deca95c41… |
| Cart Overview (public) | …/content/f48d66d3-923a-4d10-9c9c-b5369de17163.json | 6e25a6485232… |
| Identity Overview | …/content/6ea23d07-1b7a-4bcb-93f2-d8b3a4c62592.json | 95d1802f75e4… |
| Locations Overview | …/content/c80990a0-c14e-4d94-9121-3cdbc71a1512.json | ec8e9d04ed14… |
| Locations Tutorial | …/content/11c54b54-8aa9-4481-974b-1929de0712b8.json | f2268407c86e… |
| Location Search | …/content/36d4913e-07ab-4372-8cee-b77e034a25e3.json | 053c416f40d0… |
| Products Overview | …/content/f237b17f-8441-47be-95f6-5bdc9d3fdeb7.json | c19bb2d8b58a… |
| Products Tutorial | …/content/66f0fa52-6a5e-4fc2-b6ed-505d6d085c69.json | f86f1f646d30… |
| Product Search | …/content/52bc8fac-5596-4011-a8ed-5ab28d171342.json | ebf8190cd3a3… |
| Common Errors | …/content/9350180f-41da-4b5b-85e8-b15cdfbffe75.json | a2a01f7a8d94… |
| Knowledge check (+answers) | …/content/0a6b02a3-….json, …/df3b7d9a-….json | 3abda8a364df…, 0a403249a713… |
| Partner Carts overview/tutorial | …/content/3276c3fc-….json, …/082116b5-….json | ddc45938e7db…, 301918de5894… |
| Postman collection "Kroger Public APIs" | https://www.postman.com/collections/4833726-924df556-59ab-452d-92a3-ffa8e3dca405 | see log |

Page currency: every page except Quick Start (8/13/2026) and the knowledge check (10-18-22) carries
`last-full-review: 0`. The page contents are base64 in the content files and were decoded locally.

Legend: **CONFIRMS** = same as the 2026-10-07 notes in INTEGRATION-CAPABILITIES.md;
**CHANGES** = differs from / corrects them; **NEW** = not in them; **UNSETTLED** = the public
docs do not settle it (the dependent production capability stays disabled or owner-configured in code).

## OAuth2 — customer authorization (authorization code)

| # | Fact | Source | Verdict |
|---|---|---|---|
| A1 | `GET https://api.kroger.com/v1/connect/oauth2/authorize` with required `scope`, `response_type=code`, `client_id`, `redirect_uri`, `code_challenge`, `code_challenge_method=S256`. | Customer Authentication, step 1 | CONFIRMS (PKCE S256) |
| A2 | PKCE is documented: "generate a `code_verifier` for each authorization request, derive a `code_challenge` using the `S256` method, and send the original `code_verifier` in the token request" (RFC 7636). Recommended for browser/native apps; **"If your application is a confidential client, continue to authenticate it with the authorization header … PKCE adds the `code_verifier` requirement to the token exchange."** | Customer Authentication | NEW detail: PKCE applies to confidential clients too, alongside Basic auth. Implemented exactly: S256 challenge in authorize, `code_verifier` in exchange, Basic auth kept. |
| A3 | Token exchange: `POST https://api.kroger.com/v1/connect/oauth2/token`, `Content-Type: application/x-www-form-urlencoded`, `Authorization: Basic base64(client_id:client_secret)`, body `grant_type=authorization_code&code=…&redirect_uri=…&code_verifier=…`. | Customer Authentication step 4; Auth Code Tutorial (without verifier) | CONFIRMS + NEW (`code_verifier` in body; Basic header required) |
| A4 | The older Auth Code Tutorial shows the flow WITHOUT PKCE and with scopes `product.personalized cart.basic:rw profile.full`. | Auth Code Tutorial | NEW (conflicts with Postman scope names — see S1) |
| A5 | `state` is **not mentioned anywhere** in the public docs (authorize parameters, callback example `…/callback?code=…`). | Customer Authentication, Auth Code Tutorial | UNSETTLED/NEW. Table sends `state` (RFC 6749 §4.1.1 RECOMMENDED) and **requires** it back; if Kroger does not echo it, connect fails closed (refused, nothing stored). Must be confirmed live. |
| A6 | Denial: "an error is returned appended to the registered redirect URL", example `http://YourRedirectURL.com/error=access_denied&error_description=The+resource+owner+denied+the+request` (no `?` in the example). | Common Errors → Access Denied | NEW. Table reads `error=access_denied` from the callback query; the malformed example is noted, real shape unverified. |
| A7 | redirect_uri must match a registered URL, else 400 `{"error":"INVALID_REQUEST","error_description":"The redirect_uri did not match …"}`. | Common Errors | NEW |
| A8 | Access token response: `{"expires_in":1800,"access_token":"…","token_type":"bearer","refresh_token":"…"}`. | Customer Authentication step 5 | CONFIRMS |
| A9 | Access-token lifetime conflict persists: "Access tokens expire every thirty minutes" and `expires_in: 1800` (OAuth2 guide, Customer Auth, Service-to-Service) vs `expires_in: 172800` (Auth Code and Refresh tutorials). | as named | CONFIRMS conflict → UNSETTLED. Not needed: Table stores the `expires_in` each response actually returns; a missing/invalid `expires_in` is stored as unknown and treated as expired (refresh before use). |
| A10 | Refresh tokens: only from the auth-code grant; "expire every six months and become invalid once they are used"; reuse returns "400 Missing/Invalid Refresh Token"; a refresh returns a NEW access AND refresh token. | OAuth2 guide; Refresh Tutorial; Customer Auth | CONFIRMS + NEW (400 on reuse; new pair returned) |
| A11 | Basic auth on refresh: Refresh Token Tutorial shows `Authorization: Basic …` on `grant_type=refresh_token`; the Customer Authentication page's refresh example omits the header. | as named | CONFIRMS conflict. Implemented WITH Basic auth (shown in the dedicated refresh tutorial, and RFC 6749 §6 requires a confidential client to authenticate). Remains to be live-verified. |
| A12 | 401 body for an expired/invalid access token: `{"error_description":"The access token is invalid or has expired","error":"invalid_token"}`. | Refresh Tutorial; Common Errors; API Basics | NEW |
| A13 | No token revocation endpoint is documented. | (absence across all pages) | NEW/UNSETTLED. Disconnect discards Table's encrypted tokens only; it cannot revoke at Kroger. |

## Client credentials, scopes, environments

| # | Fact | Source | Verdict |
|---|---|---|---|
| S1 | Scope names differ by source: Postman `product.compact` (client credentials), `cart.basic:write`, `profile.compact` (auth code with PKCE); Auth Code Tutorial `product.personalized cart.basic:rw profile.full`; OAuth2 guide example `product.full.read`. "Kroger assigns the application a set of scopes during the registration process"; unregistered scopes are not usable. | Postman; Auth Code Tutorial; OAuth2 guide | CONFIRMS "scopes for Table's app unknown"; NEW conflicting names → UNSETTLED. Scopes are owner-supplied env (`KROGER_CUSTOMER_SCOPES`, `KROGER_PRODUCT_SCOPES`), no defaults. |
| S2 | Locations requests in Postman use client credentials with `"scope": ""`. | Postman | CONFIRMS "Locations scope unknown" → UNSETTLED; locations lookup needs explicit `KROGER_LOCATION_SCOPES`. |
| S3 | Product Search recommends Service-to-Service (client credentials) tokens for the Products API; customer tokens optional. | Product Search → Authentication | NEW |
| S4 | Client credentials: Basic auth, `grant_type=client_credentials&scope=…`, no refresh token. Quick Start shows the grant without `scope`. | Service to Service; Quick Start | CONFIRMS |
| S5 | Production `https://api.kroger.com/v1/`, certification `https://api-ce.kroger.com/v1/`; credentials are locked to the environment chosen at registration; Identity and Cart must be tested in production (no customer accounts in certification). | API Basics | CONFIRMS + NEW (credentials locked per environment) |
| S6 | Missing scope → 403 `{"errors":{"timestamp":…,"code":"Forbidden","reason":"missing required scopes"}}`. | Common Errors | CONFIRMS |

## Error bodies, status codes, rate limits

| # | Fact | Source | Verdict |
|---|---|---|---|
| E1 | Two error shapes: Auth error `{error, error_description}`; API error `{"errors":{"timestamp","code","reason"}}` (e.g. `PRODUCT-2011-400`, `"Field 'locationId' must have a length of 8 characters"`). | API Basics | NEW |
| E2 | Status codes listed for Partner and Public APIs: 200, 201, 204, 400, 401, 403, 404, 409, 500. | API Basics | NEW |
| E3 | Postman shows the 401 body nested as `{"errors":{"error_description","error"}}` — differs from E1's flat auth error. | Postman | NEW/UNSETTLED (Table parses both shapes for evidence only; status code decides). |
| E4 | Rate limits per endpoint per day, reset 24 h after the first call: Products 10,000; Cart 5,000; Identity 5,000; Locations 1,600 per endpoint (3 endpoints). No 429 or rate-limit response is documented. | Overviews; API Basics | CONFIRMS; NEW (reset rule; no documented 429 → an undocumented status is `uncertain` for a cart write). |
| E5 | Retry behavior for cart writes: not documented. | (absence) | UNSETTLED → Table never retries a cart write automatically. |

## Products and locations

| # | Fact | Source | Verdict |
|---|---|---|---|
| P1 | `GET /v1/products` filters `filter.term`, `filter.locationId`, `filter.productId` (comma list; other params ignored), `filter.brand` (pipe list, case-sensitive), `filter.fulfillment` (`ais`,`csp`,`dth`,`sth`), `filter.start`, `filter.limit`; default 10 per page; fuzzy term search order can change per request. `GET /v1/products/{id}` by productId or UPC. | Postman; Products Overview | CONFIRMS + NEW (fulfillment filter codes, default page size) |
| P2 | Price, fulfillment, aisle and inventory are returned only with `filter.locationId`. `price` = {regular, promo}; `nationalPrice` likewise; seasonal items have a price only when available; some items have no national price. | Products Overview | CONFIRMS |
| P3 | Example prices are decimal dollars (`"regular": 1.49, "promo": 0`); `promo: 0` appears on items not on sale ("the promo price if the item is on sale"). Currency is not stated. | Products Tutorial; Product Search | NEW. Table: price → integer cents only when a finite positive number with ≤ 2 decimals; `promo` ≤ 0 or absent = no promotion known (never a zero price); currency recorded as an assumption (USD). |
| P4 | Fulfillment booleans: `instore` (sold at that location, NOT in stock), `shiptohome`, `delivery`, `curbside`. Examples sometimes show only `curbside`/`delivery`. | Products Overview; Product Search | CONFIRMS; absent flag = unknown. |
| P5 | `inventory.stockLevel` ∈ `HIGH`, `LOW`, `TEMPORARILY_OUT_OF_STOCK`; "omitted when unavailable"; "Inventory is only confirmed once the user proceeds to Kroger Checkout". | Products Overview; Product Search | CONFIRMS + NEW (enum) |
| P6 | `items[].size` is a free-text string ("1/2 Gallon", "1 gal", "each"); "Not all sizes correspond to a unit of measurement". `soldBy` example value `"Unit"` only; no enum documented. | Product Search; Products Tutorial | NEW; soldBy enum UNSETTLED. Size parsed into a package quantity only when unambiguous. |
| P7 | `productPageURI` requires a chain `domain` from `/v1/chains`. | Products Overview | NEW (not used) |
| P8 | Locations default result count conflicts: Overview "default limit of 9999 results"; Location Search "default results are limited to 10 locations within a 10-mile radius"; Postman defaults `filter.limit=10`, `filter.radiusInMiles=10`. One of `filter.zipCode.near`, `filter.latLong.near`, `filter.lat.near`+`filter.lon.near` is required. | Locations Overview; Location Search; Postman | CONFIRMS conflict; Table always sends an explicit `filter.limit`. |
| P9 | locationId: the API error example says it "must have a length of 8 characters"; examples are 8 digits (`01400441`). | API Basics; Products Tutorial | NEW. Table accepts an 8-character alphanumeric location id. |

## Cart

| # | Fact | Source | Verdict |
|---|---|---|---|
| C1 | `PUT /v1/cart/add` (Postman: `{{kroger-baseUrl}}/cart/add`), `Content-Type: application/json`, body `{"items":[{"quantity":1,"upc":"0001111040101","modality":"<string>"}]}`; customer token (auth code with PKCE, scope `cart.basic:write`). | Postman; Cart Overview | CONFIRMS |
| C2 | Responses: 204 (no per-line body), 400 `{"errors":<object>}`, 401, 500 `{"errors":{reason,code,timestamp}}`. | Postman | CONFIRMS — batch-level 204 only. |
| C3 | `modality` values and requiredness for the PUBLIC cart add are still not stated. The **Partner** Carts tutorial (a different API: `/v1/carts/{id}/items`) uses `"modality": "PICKUP"` with 2018 sample data. | Postman; Partner Carts Tutorial | CONFIRMS unsettled; NEW partner-only hint. **UNSETTLED** → the cart capability reports not-ready even when activated; no value is guessed. |
| C4 | Cart API (public): only "Add to cart". No read/remove/order/checkout/pickup endpoints in the public tier. | Cart Overview | CONFIRMS |

## Acceptable use (NEW — not in the 2026-10-07 notes; needs an owner decision)

| # | Rule | Consequence for Table |
|---|---|---|
| U1 | Cart: prohibited "Tracking, sharing, or storing data derived from items added to a customer's cart"; only "temporarily storing or caching data for displaying items added to a cart … terminated when a user closes the application". Only add items the customer explicitly requests. | Table's append-only history stores the frozen batch payload (its own approved list) and the 204 evidence permanently. Whether this counts as "data derived from items added to a cart" is an **owner/legal question**; flagged, behavior unchanged in B5. Explicit per-line approval already satisfies "explicitly requesting". |
| U2 | Products: prohibited comparing products/prices among other retailers; storing data derived from customer searches; systematically gathering response data to create a database; manipulating name/description/price. | B5 returns lookup candidates only and stores nothing from searches; descriptions are passed through verbatim. Recording a Kroger price into `price_observations` would need an owner decision. |
| U3 | Identity: prohibited "Using the profile ID to map or store data associated with a customer". | Table does not call Identity and stores no profile id. |
| U4 | Locations: prohibited tracking/storing data about the location of a customer. | Table stores only the store `locationId` the household chose, not the customer's location. |

## Unsettled list (what stays disabled or owner-configured in code)

1. `modality` (value set, requiredness) → cart capability `ready: false` in every non-test environment.
2. Scope names for Table's registered app → `KROGER_CUSTOMER_SCOPES` / `KROGER_PRODUCT_SCOPES` / `KROGER_LOCATION_SCOPES` required, no defaults.
3. Whether Kroger echoes `state` → required by Table; absent → refused.
4. Access-token lifetime (1800 vs 172800) → use the returned `expires_in`.
5. Basic auth on refresh → sent (refresh tutorial + RFC 6749 §6); live verification pending.
6. Error body shape for 401 (flat vs nested) → evidence only.
7. `soldBy` enum; price currency; whether `promo: 0` always means "no promotion".
8. Rate-limit response and retry policy → no automatic retry of writes.
9. Formal schema/required fields (OpenAPI reference needs a developer token; not requested).
