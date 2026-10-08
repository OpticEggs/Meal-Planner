Instacart worker (branch w-instacart, df823d7) — summary of doc facts (read 2026-10-08):
- Dev base https://connect.dev.instacart.tools ; prod https://connect.instacart.com ; paths /idp/v1/... ; Authorization: Bearer <key>; Content-Type application/json required.
- GET /idp/v1/retailers?postal_code&country_code (US|CA) -> {retailers:[{retailer_key,name,retailer_logo_url}]}; retailer_key = organization, not a store. Errors not listed on page.
- POST /idp/v1/products/products_link: title, line_items required; optional image_url, link_type (shopping_list default|recipe), expires_in (days, max 365), instructions, landing_page_configuration. LineItem: name (req), display_text, product_ids/upcs, line_item_measurements[{quantity,unit}], filters; bare quantity/unit deprecated. Response products_link_url. Errors: 400 codes 9999/1001.
- Expiry: shopping_list no default expiry; recipe default 30 days; docs recommend caching the URL.
- Errors page: {"error":{"message","code"},"meta":{"key"}}; statuses 200,400,401,403,404,408,429,500,503. Rate limit: unspecified per-second; 429 retry later.
- Not stated: products_link_url domain (trusted host set to www.instacart.com only), error bodies for 401/403/429/500, rate number, CA postal format, line limits, expiry field in response.
- Unit map: g,kg,oz,lb,ml,l,tsp,tbsp->"tablespoon",cup,each; fl_oz refused (no plain "fl oz" in units page).
- Policies: whole-request refusal if any line unsupported; 4xx definite fail; 5xx/timeout/network/3xx/non-200 2xx/unparseable 200 -> uncertain, never retried; untrusted link -> failed untrusted_link; key only in Authorization header; evidence URL query redacted; requestHash sha256 canonical JSON.
