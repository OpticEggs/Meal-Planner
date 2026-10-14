# Kroger go-live — owner-operated sequence (revised 2026-10-14)

Goal (owner, 2026-10-13): pick recipes → Table builds one list of totals → Kroger finds the products that fill each
quantity → the list goes to the Kroger cart.

**Nothing has ever reached Kroger.** Everything below runs on the deployed app (Render) with credentials only the
owner holds. Claude makes no live call, activates nothing, and never asks for a secret; each step needs the owner's
separate authorization. Owner inputs K1–K7 are in `OWNER-INPUTS.md`; this page is their order.

## Four capabilities, verified separately

| # | Capability | What it does | Stores anything? | Needs first |
|---|---|---|---|---|
| C1 | **Search results** | one product search at one store; results shown, nothing chosen | **No** database write. The app token is held in memory; the server log records the redacted request URL and HTTP status (no product data or prices). | K1, K3 (client id/secret, product scopes), K4 store |
| C2 | **Product selection** | choosing a product re-reads it from Kroger by id, then saves the product, its package and its price for the household | **Yes** — product and price data derived from a Kroger search | C1 verified **and K6 resolved** |
| C3 | **Account connection** | the household signs in at Kroger; Table keeps the encrypted tokens | **Yes** — encrypted customer tokens | K2 redirect URI, customer scopes, `TABLE_TOKEN_KEY`; K6 |
| C4 | **Cart addition** | the approved list is added to the Kroger cart | **Yes** — Table's append-only transfer history | C3, K6, the cart `modality` value, K7 |

Each is recorded as verified on its own, from what the app shows; one does not imply another.

## Step 1 — C1: one products-only lookup at a specified store

No customer connection, no product selection, no cart. Only when you authorize it.

1. **K1** — at developer.kroger.com, register an app (production environment). For this step no redirect URI is used.
2. **K3** — Render → Environment, as secrets: `KROGER_CLIENT_ID`, `KROGER_CLIENT_SECRET`, `KROGER_PRODUCT_SCOPES`
   (the scope name Kroger assigned your app for products).
3. **K4** — `KROGER_LOCATION_ID` = the store's 8-character location id. **Unverified:** a kroger.com store page's
   address may end in a 3-digit division and a 5-digit store number whose concatenation is this id; if it cannot be
   read with certainty, finding it is one separate locations lookup, authorized on its own.
4. Set `TABLE_RETAILER=kroger` and `KROGER_ACTIVATE=products` — **products only**. Leave `KROGER_REDIRECT_URI`,
   `KROGER_CUSTOMER_SCOPES` and `TABLE_TOKEN_KEY` unset. Save and deploy the same commit.
   While this is set, the app's store is Kroger: Send is off (it says why) and the simulated store's products no
   longer count for purchasing.
5. Signed in to Table in a browser, open
   `https://<your Table address>/api/kroger/products` → expect `{"available":true}` (this makes no request to Kroger),
   then **one** lookup:
   `https://<your Table address>/api/kroger/products?term=jasmine%20rice` (any one ingredient).
   It returns JSON: `ok`, `locationId`, and `candidates`, each with `description`, `sizeText`, `regularMinor` /
   `promoMinor` (price in cents), `pickup`, and `choosable` with `notChoosable` saying why not.
   This is one application-token request plus one product search. Do not use "Match products at Kroger…" for this step
   (it searches up to 12 items), and do not choose a product (that is C2).
6. Share what the page showed, with no token or secret (a screenshot of the JSON is enough). Claude records C1.
7. Undo, unless you decide otherwise: remove `KROGER_ACTIVATE` **and** `TABLE_RETAILER` in the **same** save (back to
   the simulated store), then deploy. Removing only `TABLE_RETAILER` leaves an activation that production refuses at
   start. The credential variables can stay or go; unused, they do nothing. Nothing was saved, so nothing needs
   cleaning up.

## Before C2 — resolve the retention question (K6)

Kroger's Acceptable Use page prohibits storing data derived from searches and from items added to a customer's cart;
Table would store a chosen product and its price (C2), customer tokens (C3), and an append-only transfer history (C4).
**Resolve K6 before C2**, not only before cart writes: ask Kroger (inquiry draft in `PROVIDER-INQUIRIES.md`, not sent),
accept a reviewed reading, or decide on a redesign of what is kept. Until then, stop at C1.

## C3 — account connection (after K6)

Adds `KROGER_REDIRECT_URI` (exactly the redirect URI registered with Kroger, `https://<your Table address>/api/kroger/callback`),
`KROGER_CUSTOMER_SCOPES` and `TABLE_TOKEN_KEY`, and `connect` in `KROGER_ACTIVATE`.

**`TABLE_TOKEN_KEY` must be exactly 32 random bytes, base64-encoded** (the app refuses anything else). Do not assume
a host-generated value has this shape. A method validated locally, on your own computer:

```bash
KEY="$(openssl rand -base64 32)"
printf %s "$KEY" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const k=Buffer.from(s,"base64");console.log(k.length===32&&k.toString("base64").replace(/=+$/,"")===s.replace(/=+$/,"")?"valid: 32 bytes, base64":"INVALID")})'
printf %s "$KEY"; echo     # copy it once into Render's secret field for TABLE_TOKEN_KEY — nowhere else
unset KEY
```

The check is the same rule the app applies (`parseTokenKey` in `src/server/integrations/kroger/crypto.ts`): it
decodes the value and requires exactly 32 bytes that re-encode to the same text. After deploying, More → Household →
Kroger lists `TABLE_TOKEN_KEY (invalid)` if the stored value is wrong. Changing this key later makes stored tokens
unreadable (the app reports `unreadable_credentials`; the household connects again).

## C4 — cart addition (after C3, K6, modality, K7)

- **`modality` stays unresolved.** Kroger does not document the cart-add `modality` value publicly; the code refuses
  cart transfers until it is known (`DOCUMENTED_CART_MODALITY` in `src/server/integrations/kroger/config.ts` is unset).
  It is not guessed. Kroger's answer → a code change with tests, separately authorized.
- **K7** — one cart addition approved in writing, naming the Kroger account, each product's id or UPC and the quantity.
  Checkout and pickup stay yours at kroger.com.

## Before any live product data: the quantities

A wrong total becomes a wrong product count once Kroger fills it. Run the read-only trace
(`evidence/2026-10-13-pilot-quantities/read-only-trace.sql`, B48) and share its result rows first.
