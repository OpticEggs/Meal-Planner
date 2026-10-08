# Instacart fixtures — doc-shaped synthetic fixtures, NOT recorded from a live call

Table has no Instacart account, API key or access. No request has ever been sent to Instacart.
Every file here is a minimal, hand-written body shaped after Instacart's public Developer Platform
documentation (read 2026-10-08). Keys, names and URLs are placeholders.

| File | HTTP status used in tests | Shape source |
|---|---|---|
| `retailers-ok.json` | 200 | GET /idp/v1/retailers response (`retailers[]` with `retailer_key`, `name`, `retailer_logo_url`) — https://docs.instacart.com/developer_platform_api/api/retailers/get_nearby_retailers/. The second entry reuses the docs' scheme-less example logo value, which Table maps to `null`. |
| `products-link-ok.json` | 200 | POST /idp/v1/products/products_link response (`products_link_url`) — https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page/. Host `www.instacart.com` from the recipe tutorial's example; the path is invented. |
| `products-link-untrusted.json` | 200 | Same shape with the create page's `example.com` placeholder host (must be refused). |
| `error-400-validation.json` | 400 | Multiple-errors format (code 9999, `errors[]`) with one documented validation message — https://docs.instacart.com/developer_platform_api/errors |
| `error-401.json`, `error-403.json`, `error-429.json`, `error-500.json` | 401 / 403 / 429 / 500 | Single-error format from the errors page. The docs give no example body for these statuses; the messages are synthetic. |

`index.ts` loads them as recording-fake steps by scenario name.
