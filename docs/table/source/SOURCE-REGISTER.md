# Table — Source Register and Verification Boundary

Prepared October 7, 2026. This register supports the implementation packet. It does not assert that an application, provider integration, or deployment has been tested.

## A. Source authority

**A1 — User-settled conversation contract.** The source of product authority is Jon's discussion of Table in this conversation: one proposed week, deliberate shared adoption, stable accepted choices, separate preferences and capture, scoped changes, leftovers/coverage, honest price/readiness states, visible stale previews, independent-night concurrency, protected order history, and stale-review rejection. The current implementation plan incorporates these rules. The packet does not require the recipient to have access to the conversation.

**Engineering elaborations.** The default Next.js/TypeScript/PostgreSQL/Playwright stack, short transaction coordination, proposed record names, dispatch-boundary detail, supplementary tests X01–X12, and durable execution files are implementation choices supplied by this packet. They are not claims that Jon chose a particular framework or that a specific service is already connected. Equivalent implementations may be documented, but may not weaken the accepted behavioral tests.

## B. Supplied files

### B1 — Original prototype

File: `references/index.html`  
SHA-256: `a2a71355bf55426b878f8b8f7a1eb36d8b67ecc8e68daf26c6e9dea0905ef076`

Relevant source lines in the supplied file:

- Lines 224–235: five main screen areas.
- Lines 244–272 and 332–342: client-side state and manually written groceries.
- Lines 346–348: whole-meal multiplier for macros.
- Lines 446–450: replacement directly mutates the selected day.
- Line 512: original startup syntax error.
- Lines 606–613: preset transfer outcomes and a toast-only checkout handoff.
- Lines 620–638: demonstration targets, exclusions, store/brand choices and budgets.

The visual style is reference material. None of the embedded settings is a confirmed household fact or an authorized purchasing choice.

### B2 — Earlier implementation plan

File: `references/table-implementation-plan-v1.md`  
SHA-256: `a60c6e4a95930e94e60748a72590075d921e291e4f02038b51bf5dc6d2a960c4`

Its section 8 contains the original T01–T22 acceptance table. The table is preserved verbatim in the current plan, section 9.1. The prior plan establishes the separate-state model, scope-aware commands, six build stages and the release-gate role of the final concurrency cases. The current packet elaborates execution without treating the earlier file as an implementation.

### B3 — Syntax repair and prior prototype review

File: `references/table-syntax-repaired.html`  
SHA-256: `c4cd026f90f2a7d484137e7672b9d8833553829156e90c898ede897e9e5309fc`

File: `references/table-prototype-review.md`  
SHA-256: `579d9955c036e9c5b70a1264c56ba8f28f8d545c97112e585a571368940d0866`

The repair changes one quotation-mark character. The review reports historical syntax/UI checks and the absence of six referenced recipe photos, shared persistence, and actual integration. Those test claims belong to the prior review; this packet does not report rerunning those browser tests or testing new application code.

## C. Primary technical references checked during packet preparation

These are bounded supporting references, not a complete technical compatibility or security audit. Claude should consult the current official documentation for the versions and providers actually selected.

### E1 — Next.js installation and TypeScript setup

URL: https://nextjs.org/docs/app/getting-started/installation

The official page was readable and documents creating a Next.js application and TypeScript setup. Used only to support the proposed application baseline. Exact installed versions, authentication choice, runtime compatibility and hosting configuration remain implementation decisions to verify and pin.

### E2 — PostgreSQL explicit locking

URL: https://www.postgresql.org/docs/current/explicit-locking.html

The official section on row locks describes `SELECT ... FOR UPDATE` and lock lifetimes. This supports a possible short-transaction coordination mechanism. Per-target validation, coherent reads, idempotency, requirement recalculation and retailer uncertainty are application-design obligations; the database documentation does not prove that Table satisfies them.

### E3 — Playwright isolation and multiple contexts

URL: https://playwright.dev/docs/browser-contexts

The official guide documents independent browser contexts and multiple contexts within one test. Used to specify a genuine two-session household test harness rather than two tabs of one shared identity. It does not substitute for actual mobile-device testing.

### E4 — USDA FoodData Central API guide

URL: https://fdc.nal.usda.gov/api-guide/

The guide documents Food Search and Food Details and API-key requirements. It supports the proposed nutrition-data source. Recipe-to-food matching, quantity basis, incomplete fields and portion calculations remain Table's responsibility. No nutrition data was fetched for a household recipe during this task.

### E5 — Kroger's public Postman workspace: Add to cart

URL: https://www.postman.com/kroger/the-kroger-co-s-public-workspace/request/mwiie4o/add-to-cart

The page was readable and exposes a PUT add-to-cart request under Kroger Public APIs, with a `/cart/add` path relative to its configured base URL. The parsed view did not establish the complete request body, authorization requirements or live response semantics. No customer authorization or cart operation was performed.

### E6 — Kroger pickup instructions

URL: https://www.kroger.com/i/ways-to-shop/pickup

The readable FAQ places timeslot selection inside checkout and describes possible changes to final charges. This supports retaining an explicit retailer checkout handoff and estimated—not guaranteed—spending. It does not prove the existence or absence of a third-party automatic slot-reservation API.

### E7 — Kroger developer reference entry points requiring further inspection

URLs:

- https://developer.kroger.com/reference/api/cart-api-public
- https://developer.kroger.com/documentation/api-products/public/products/product-search
- https://developer.kroger.com/documentation/public/security/customer

Direct opens returned an application shell without usable documentation text in the available reader. These URLs are starting points for Claude's provider verification, not citations establishing complete schema/auth facts. Mark full request/response schemas, current scopes, lookup/fulfillment details, cart-read/delete capability, native shopping-list sync, order/receipt access, and automatic checkout/slot booking as **not verified in this packet**.

## D. What was and was not checked for the deliverables

Package preparation reads the supplied plan/review, preserves reference-file identities, carries forward the acceptance table, and checks file/section/test-ID consistency and archive integrity. It does not run the application's acceptance tests, compile app code, create a production recipe corpus, verify personal targets, authenticate to Kroger, send cart items, reserve a pickup, deploy, or modify a repository.

Any future report must separate documented capability, implemented code, fixture-tested behavior, live-verified capability, and actual production deployment. The packet itself is at the specification stage.
