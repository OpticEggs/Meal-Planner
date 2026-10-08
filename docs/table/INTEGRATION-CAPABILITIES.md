# Table — Integration capabilities

Status legend: **documented** (official text read) · **implemented** (code exists) ·
**fixture-tested** (passes against the recording fake / recorded fixtures) ·
**live-verified** (exercised against the real provider with authorization) · **blocked**.

Nothing in this file is live-verified. No Kroger account, app registration,
token, product lookup, cart write, order or pickup reservation was made.

## Retailer adapters in this build

| Adapter | Mode value | What it does | Status |
|---|---|---|---|
| Recording fake ("Simulated retailer") | `TABLE_RETAILER=simulated` | Records exact request bodies, call counts and dispatch IDs in `fake_retailer_calls`; behaviors: ack, reject, accept-then-timeout, delay-until-barrier, batch-only. Every screen that shows a transfer labels it **Simulated retailer — nothing was sent to a store**. | implemented, fixture-tested (see ACCEPTANCE.md) |
| Kroger | `TABLE_RETAILER=kroger` | Fails closed: reports "not configured / not verified" and refuses handoff. No network code is enabled. | documented only; live **blocked** (no credentials, no authorization) |

## Kroger Public API — documentation read on 2026-10-07

Source method: developer.kroger.com renders its pages client-side; the prose was read from the
site's unauthenticated content files `https://developer.kroger.com/api/v1/developer/content/<pageId>.json`
and from Kroger's official Postman collection
`https://www.postman.com/collections/4833726-924df556-59ab-452d-92a3-ffa8e3dca405`.
The formal OpenAPI reference (`/api-products/api/*-api-public`) loads from endpoints that
returned 401 without a developer token, so **no machine-readable schema was read**.

| Operation | Documented facts (official text) | Status in Table |
|---|---|---|
| OAuth2 client credentials | `POST https://api.kroger.com/v1/connect/oauth2/token`, Basic auth (client_id:secret), form body `grant_type=client_credentials&scope=...` | documented; not implemented |
| OAuth2 customer authorization | `GET https://api.kroger.com/v1/connect/oauth2/authorize` with `scope`, `response_type=code`, `client_id`, `redirect_uri`, PKCE `S256`; token exchange `grant_type=authorization_code`. Access token documented as 30 min (`expires_in: 1800`) — older tutorials show 172800 (conflict, unverified). Refresh tokens: auth-code grant only, ~6 months, single use. | documented; not implemented |
| Scopes | Postman: `product.compact` (client credentials), `cart.basic:write` and `profile.compact` (auth code). Apps get only scopes assigned at registration. | documented; scopes for Table's app unknown (no registration) |
| Product search | `GET /v1/products` (`filter.term`, `filter.locationId`, `filter.brand`, `filter.productId`, `filter.fulfillment`, `filter.start`, `filter.limit`); `GET /v1/products/{id}` (productId or UPC). Price and fulfillment only returned with `filter.locationId`. Item fields include `size`, `soldBy`, `price.regular`/`price.promo`, `nationalPrice`, fulfillment booleans, `inventory.stockLevel`. Inventory "only confirmed once the user proceeds to Kroger Checkout." | documented; not implemented |
| Locations | `GET /v1/locations` with `filter.zipCode.near`, `filter.latLong.near`, `filter.radiusInMiles`, `filter.limit`, `filter.chain`; official pages disagree on default limit. | documented; not implemented |
| Add to cart | `PUT /v1/cart/add`, body `{"items":[{"upc":"...","quantity":1,"modality":"..."}]}`; responses 204/400/401/500. **Batch-level 204 with no per-line result** — Table must not invent per-line success. `modality` values/requiredness not stated publicly. | documented; adapter not implemented; live **blocked** |
| Cart read / remove / delete | Not documented for the public tier (exists only in the separate Partner Carts API). | unverified — Table never claims cart removal |
| Orders, checkout, pickup slots | Not documented for the public tier. | unverified — checkout and pickup stay a user handoff at kroger.com |
| Identity | `GET /v1/identity/profile`, scope `profile.compact`, returns `data.id`. | documented; not implemented |
| Rate limits | Per endpoint per day: Products 10,000; Cart 5,000; Identity 5,000; Locations 1,600 each. Missing scope → 403. | documented |
| Certification env | `https://api-ce.kroger.com/v1/`; Cart and Identity have no customer accounts there and must be tested in production. | documented — implies any cart test is a real-account write needing explicit approval |

### Not verified (open)
- Formal schema/required fields/enums/error bodies (OpenAPI reference not readable without a token).
- `modality` values; Locations scope; token lifetime conflict; whether refresh needs Basic auth.
- Page currency: most pages carry `last-full-review: 0`; Quick Start dated 2026-08-13.
- Absence of undocumented cart read/order endpoints cannot be proven from documentation.

### What enabling Stage 5 requires (owner actions)
1. A Kroger developer app registration and its client ID/secret (server-side env only).
2. The intended store `locationId` and the household's Kroger account authorization via the customer PKCE flow.
3. Explicit written approval naming the account, the exact product(s) and quantity for one live add-to-cart test.
Checkout and pickup remain at kroger.com regardless.
