# Provider and content-source notes — research handoff

Research date: 2026-10-08. Reverify official documents before coding or live activation. These are **documented possibilities**, not access already granted to Table.

## Instacart Developer Platform (not Instacart Connect)

Official: https://docs.instacart.com/developer_platform_api/

- `GET /idp/v1/retailers?postal_code=...&country_code=US`: https://docs.instacart.com/developer_platform_api/api/retailers/get_nearby_retailers/ . Result contains retailer keys, names and perhaps logo URLs. It is **retailer-brand discovery**, not a guarantee of a specific store address, pickup slot, inventory or order availability.
- `POST /idp/v1/products/products_link`: https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page/ . Returns `products_link_url`. Hosted page permits customer to select a store, match items, add to cart and proceed to checkout. Current docs recommend `line_item_measurements` and note bare quantity/unit are deprecated. A link is not a placed order or confirmed cart line.
- Overview/auth: https://docs.instacart.com/developer_platform_api/api/overview/ . Development and production endpoints differ; obtaining API access may require registration/contact. The separate Instacart Connect pickup/order fulfillment APIs are meant for retailer partners and **must not** be treated as Table's available APIs.
- Production access, terms, caching/link expiry, provider data retention, rate limits, and customer-specific availability need verification. Use injection-driven fixture tests and keep live capability OFF until owner approval.

## Budget Bytes

Official index: https://www.budgetbytes.com/index/ . Good for on-site recipe discovery, search, categories, and ingredient browsing. The Table source filter can show **links that this household saved**, without harvesting the whole index.

Reuse FAQ: https://www.budgetbytes.com/faq/ . Budget Bytes says permission must be granted to use its recipes or photographs on other websites and that reuse is evaluated case by case; commercial uses require a license. Do not imply a reusable full-catalog license or scrape all recipes and imagery.

Budget Bytes also explains recipe cost figures reflect ingredient prices paid when a post was published; treat these as historical source information, never a current quoted grocer price.

Personal bookmarking, user-authored notes, and independently entered ingredient quantities are separate from mirroring publisher photography and expressive instructions. Whether automated extraction/storage of complete authored directions is permissible requires source-specific policy/rights review; do not assume it.

## Recipe structured data

Google Recipe structured data guide: https://developers.google.com/search/docs/appearance/structured-data/recipe . Common fields include `Recipe`, `recipeIngredient`, `recipeYield`, recipe time fields and `recipeInstructions`, often encoded in JSON-LD; markup is not guaranteed and might be malformed/incomplete. A standard format is not a content license.

## Current Table constraints

- Kroger adapter: `src/server/integrations/kroger/` gated OFF; unresolved Kroger terms and `modality`. No real Kroger calls.
- Existing product mappings: household/ingredient scoped; multi-destination mapping requires careful migration. Existing retailer add-to-cart adapter assumes batch dispatch; do not fake an Instacart shopping-list link as its cart acknowledgement.
- User and provider secrets: never paste into chat or commit. `docs/table/INTEGRATION-CAPABILITIES.md` contains the baseline proof boundaries, and `OWNER-INPUTS.md` lists existing activation gates.

## Operational permissions

Only read-only documentation research and offline recorded fixtures are inherent in this handoff. New **production** URL fetcher execution, live Instacart endpoint requests, Kroger requests, account linking, checkout and purchases remain separately gated. Exact household grocers, store branches, availability and prices are not assumed.
