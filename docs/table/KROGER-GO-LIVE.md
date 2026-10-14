# Kroger go-live — what the owner does, in order (2026-10-14)

Goal (owner, 2026-10-13): pick recipes → Table builds one list of totals → **Kroger finds the products that fill each
quantity** → the list goes to the Kroger cart. Saves the weekly grocery entry.

What is built and verified against a simulated Kroger: product search at a store, choosing a product once per
ingredient (remembered), package counts from the totals, "Match products at Kroger…" on the checklist, the cart
transfer with stale-list refusal and append-only history. **Nothing has ever reached Kroger.** Live calls run on the
deployed app (Render), with credentials only the owner holds; this session cannot make them and never asks for
secrets. The detailed owner inputs are K1–K7 in `OWNER-INPUTS.md`; this page is the sequence.

## Stage 1 — Kroger finds the products (no cart)

Result: the checklist's "Match products at Kroger…" searches your store; you pick each ingredient's product once;
Table counts the packages; the copyable list (Buy it → Store, estimate and list) is what you add in the Kroger app.
Send stays off, saying why.

1. **K1–K2** — at developer.kroger.com, register an app in the **production** environment with redirect URI
   `https://<your Table address>/api/kroger/callback` (exact).
2. **K3** — in Render → Environment, set as secrets: `KROGER_CLIENT_ID`, `KROGER_CLIENT_SECRET`, and the scope names
   Kroger assigned your app: `KROGER_PRODUCT_SCOPES`, `KROGER_LOCATION_SCOPES`, `KROGER_CUSTOMER_SCOPES`. Set
   `KROGER_REDIRECT_URI` to the same address as step 1. For `TABLE_TOKEN_KEY` use Render's **Generate** option on
   the environment page (a random 256-bit value, base64 — not verified here), so it is never typed or pasted
   anywhere. The app needs exactly 32 bytes, base64; if Household → Kroger then lists "TABLE_TOKEN_KEY (invalid)",
   the generated value has another shape and needs replacing.
3. **K4** — `KROGER_LOCATION_ID` = your store's 8-character location id (or set it in the app after connecting).
4. **K5** — set `TABLE_RETAILER=kroger` and `KROGER_ACTIVATE=connect,products` (no `cart`). Deploy. In the app:
   More → Household → Kroger → **Connect Kroger account** (Kroger's own sign-in page), then Groceries →
   **Match products at Kroger…**.
   Products recorded for the simulated store do not count at Kroger: each ingredient is matched once.
5. Tell Claude it is on. To record it as verified, share only what the app shows (the connection says "Connected",
   a match shows Kroger products and prices) — never a token or secret.

Undo: remove `KROGER_ACTIVATE` (or set `TABLE_RETAILER` back) and redeploy; matched products stay recorded.

## Stage 2 — the list goes into the Kroger cart (one bounded test first)

Blocked today, by design, on three things:

- **K6 (owner decision, possibly legal)** — Kroger's Acceptable Use page prohibits "storing data derived from items
  added to a customer's cart"; Table keeps an append-only record of every transfer. Decide: ask Kroger (inquiry draft
  in `PROVIDER-INQUIRIES.md`, not sent), accept the reading after review, or redesign what is kept.
- **The cart `modality` value** — Kroger does not document it publicly; the code refuses cart transfers until it is
  known (`DOCUMENTED_CART_MODALITY` in `src/server/integrations/kroger/config.ts`). Kroger's answer → a one-line code
  change with tests, by Claude.
- **K7 (owner, in writing)** — one cart addition naming the Kroger account, each product's Kroger product id or UPC,
  and the quantity. Then `KROGER_ACTIVATE=connect,products,cart` for that test only; redacted evidence recorded.
  Checkout and pickup stay yours at kroger.com.

After that test passes, Send puts the approved list into the cart each week.

## Before Stage 2: the quantities

A wrong total becomes a wrong purchase once Kroger fills it. Run the read-only query in
`evidence/2026-10-13-pilot-quantities/read-only-trace.sql` (B48) and share its rows, so the three suspicious lines
(cilantro, eggs, brisket) are traced before any real cart write.
