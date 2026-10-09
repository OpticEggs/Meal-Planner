# Table — two provider inquiries (DRAFTS, NOT SENT)

Prepared 2026-10-09. **Nothing was sent, no account was registered, no terms were accepted, no Kroger API
endpoint was called and no Budget Bytes recipe or photo page was read.** These are drafts for Jon to review
and send themself if they choose. No permission has been obtained; until a written answer arrives, Table stays
link-only for Budget Bytes and keeps the Kroger cart capability off.

---

## 1. Kroger (developer support)

**Where to send (check first):** the only documented route is the developer-portal contact form,
https://developer.kroger.com/support/contact/ (the Partnership Request page links it as
`?option=partner_request`). Whether the form has a general or Public-API option, and whether you must be signed
in, is **UNCONFIRMED** (the page renders with JavaScript and came back empty). An `apisupport@kroger.com` address
appears only on a third-party mirror — **UNCONFIRMED**, don't rely on it.

**Subject:** Public API questions: cart modality, weight-sold items, and record retention for a private household app

Hello Kroger Developer team,

I plan to register an application for the Kroger Public APIs and have a few questions the public documentation
does not answer. I have not registered yet and have made no API calls.

The app, "Table", is a private dinner-planning tool used by two adults in one household. It has no public sign-up,
it is not commercial, and we do not resell or share any data. One of us starts every action; a person reviews and
approves every item before it is added to our own Kroger cart; checkout and pickup happen on Kroger's own site.
OAuth tokens are stored encrypted on our server and never exported.

1. For PUT /v1/cart/add on the Public tier, which `modality` values are accepted for store pickup, and is the field
   required? (The Partner Carts tutorial shows "PICKUP", but that is a different API.)
2. For `items[].soldBy` (for example UNIT versus WEIGHT — are there other values?), what does cart `quantity` mean
   in each case, and does the regular/promo price apply per item or per pound? Is there a documented way to add a
   variable-weight item to a cart? Are prices always in USD?
3. The Acceptable Use page lists "Tracking, sharing, or storing data derived from items added to a customer's
   cart" and "… from customer searches" as prohibited. May we keep the following, and for how long?
   a) grocery requirements we write ourselves; b) for products we chose: productId/UPC, description, size and the
   regular/promo price seen at a given time and locationId; c) the cart request we sent (UPCs, quantities,
   modality) and when; d) the API's response status and time; e) our own later notes on what we actually
   received. Are there API terms beyond the Acceptable Use page that cover retention or caching?
4. Authorization: a) Is a `state` parameter we send returned on the authorization callback? (The Customer
   Authentication page doesn't list it.) b) Should refresh-token requests use Basic client authentication? (The
   Refresh Token Tutorial shows it; the Customer Authentication refresh example omits it.) c) Do Locations
   requests with client credentials need a scope? (The Postman collection sends an empty one.)

We will not turn on cart additions until we hear from you. Thank you for your help.

Jon

**Sources (read 2026-10-09; developer.kroger.com content files — the 2026-10-08 content IDs now return 404):**
Acceptable Use `content/fd193bf0-098f-4cd9-8bea-1e97a2c9db78.json` ("Tracking, sharing, or storing data derived from
items added to a customer's cart."; "… derived from customer searches or frequently viewed products."; "Temporarily
storing or caching data for displaying items added to a cart" — rest truncated by the reader) · Cart API overview
`content/4808ff85-…json` (no modality values) · Partner Carts tutorial `content/e436a714-…json` (`modality:
"PICKUP"`, Partner tier) · Postman "Kroger Public APIs" collection (`"modality": "<string>"`) · Products overview
`content/11a4d56d-…json` ("price … regular … promo") · Customer Authentication `content/4be8b7bc-…json` (no `state`;
refresh example without Authorization) · Refresh Token Tutorial `content/e2b81338-…json` (Basic auth shown) ·
Understanding OAuth2 `content/2a26424e-…json` ("Kroger assigns the application a set of scopes during the
registration process.") · Partnership Request `content/68997718-…json` (Partner APIs need a contract) · manifest
`content/manifests.json` (no Terms or general Contact page listed).

**Not confirmed:** public `modality` values; whether `soldBy` includes WEIGHT (Table's refusal of WEIGHT and of
unknown values stays either way); price currency; API terms beyond Acceptable Use; the general support route.

---

## 2. Budget Bytes

**Where to send (check first):** `support@budgetbytes.com` is **UNCONFIRMED** — it comes from a search summary of
the FAQ, because https://www.budgetbytes.com/faq/ (and /contact/) answered HTTP 403 to automated reads on 2026-10-08
and 2026-10-09. Open the FAQ or contact page in a normal browser before sending.

**Subject:** Permission request: private two-person household use of individual recipes

Hello Budget Bytes team,

My partner and I (two adults, one household) use a small private meal-planning tool we built for ourselves, called
Table. It is not published and not commercial, it has no ads, and it is not a website or app anyone else can see:
only the two of us can sign in. Today Table only saves links to your recipes and does not read your pages. Before
doing anything more, we would like to ask you.

In each case below, one of us would choose one specific recipe page and start the import ourselves. Whatever is
kept would be shown only to the two of us, with the site name, the author's name, and a link back to the original
page. Would each of these be acceptable?

1. Keeping that recipe's ingredient list, servings, and prep/cook times.
2. Keeping its written instructions.
3. Keeping one photograph from it.
4. If any of these is acceptable, how long may we store or cache it?
5. For a photo, would you prefer that it be loaded from your own site (or a specific image host) when we view it,
   rather than stored by us? If so, which host should we use?

Separately:

6. Do you offer a supported feed, license or integration for discovering recipes — for example a list of titles and
   links? We do not want to copy or mirror your catalog; we only want a supported way to browse and then open
   recipes on your site.

We understand the answer may be no to some or all of these, and we will not do any of them unless you tell us it is
acceptable. If any of it needs a license, we would be glad to hear the terms.

Thank you,
Jon

**Sources:** https://www.budgetbytes.com/faq/ — not readable (HTTP 403, 2026-10-09); policy wording relied on is the
repository's 2026-10-08 note ("permission must be granted to use its recipes or photographs on other websites …
evaluated case by case; commercial uses require a license") and a 2026-10-09 search summary of the same FAQ ·
https://www.copyright.gov/fair-use/ (read 2026-10-09: "Courts evaluate fair use claims on a case-by-case basis") —
the draft makes no fair-use claim. No official Budget Bytes feed or licensing program was found; that is not proof
none exists.
