# Table — Multi-source acceptance matrix

**Status at handoff:** NOT IMPLEMENTED / NOT RUN. These are new requirements, not claims of passing tests. Use two independently authenticated household contexts, real PostgreSQL, fixture-only external transports, deterministic clock, and a recording fake retailer. Assert database records, immutable history, external-call counts, focus behavior and visible state. Preserve T01–T22, X01–X12, B14–B20, and relevant B21/B22 regressions unchanged. Where independent tests need concurrency, force both commit orders.

| ID | Scenario | Mandatory outcome |
|---|---|---|
| URL-01 | Jon pastes a valid recipe URL and saves without importing. | One household bookmark appears to both members; no accepted-week, recipe-version, interest, grocery or provider write is made. |
| URL-02 | Both members simultaneously save syntactically different tracking-parameter variants of the same canonical URL. | Safe dedup returns one bookmark with source URL, contributor attribution and no lost notes; repeat operation IDs return same receipt. |
| URL-03 | Jon saves a URL from an unsupported site, login-only site or social-media post. | Bookmark stays usable and source opens; label says import unavailable, not “ingredients ready.” |
| URL-04 | User pastes `file:`, `javascript:`, a data URL, URL credentials or malformed host. | Rejected; no network attempt, server-side file access, provider call or database mutation. |
| URL-05 | Import preview fetches a URL resolving to localhost, private network, cloud metadata, IPv6/IPv4 mapped private address, numeric/encoded host or an unsafe redirect. | Refused before any unsafe connection. Validate redirect/dns-rebinding handling, port restrictions and bounded fetch. |
| URL-06 | Remote page has enormous response, redirect loop, decompression bomb, slow stream, malformed HTML or hostile nested JSON-LD. | Bounded timeout/bytes/depth/concurrency, clear unsupported status, no crash, resource exhaustion or silent accepted recipe. |
| URL-07 | Remote HTML contains scripts, prompt-injection text, event handlers, malicious URLs or executable attributes. | Treated as inert data; no script execution, unauthorized network fetch, markup injection or instruction execution. |
| URL-08 | Valid Schema.org Recipe JSON-LD (including @graph and @type arrays). | Deterministic ingredient/yield/effort fields extracted with provenance; stable UI preview. Source structured data never implies reproduction rights. |
| URL-09 | Page contains unrelated JSON-LD, multiple Recipe nodes or nutrition for a different serving basis. | Require selection or refuse ambiguity; do not assign another recipe's ingredients or infer nutrition. |
| URL-10 | Fractional measurements, mixed units, “1 can,” “a bunch,” “to taste,” raw/cooked forms and ingredient sections. | Parse supported units without precision loss; unsupported quantities explicitly require human review and cannot silently enter groceries. |
| URL-11 | Imported recipe missing yield, ingredient normalization or required hard-exclusion review. | Not eligible for complete-week proposal, nutrient-fit claim, or grocery-ready state. Bookmark persists. |
| URL-12 | Member confirms an import into new structured recipe. | One immutable version plus source link/provenance; ingredients confirmed, others unknown; no accepted plan or active dinner demand changes. |
| URL-13 | Member edits imported recipe while it is scheduled on an accepted week. | Existing dinner remains pinned to old recipe version. New version only affects future explicit selections. |
| URL-14 | Both members edit the same import draft or mapped recipe concurrently. | Revision conflict or field-by-field RB17 rebase prevents blind overwrite; both edit orders covered. |
| URL-15 | Archive the source bookmark after a recipe was imported and scheduled. | Imported recipe and its pinned accepted dinner remain unchanged; source provenance preserved; bookmark restorable. |
| URL-16 | Export and restore with links, source provenance and pending import drafts. | Same household records restored; no credentials or prohibited cached HTML; migration upgrades populated old database. |
| BB-01 | Explore → Budget Bytes filter on a new household. | Show official Browse Budget Bytes link; no invented comprehensive catalog or misrepresented local Budget Bytes images. |
| BB-02 | Jon bookmarks an actual Budget Bytes URL, Alex opens Explore's Budget Bytes source filter. | Appears once with source attribution, original URL and current import state; both members can open it. |
| BB-03 | Budget Bytes page is nonpermissive/inaccessible or fails parsing. | Link-only state persists; no mirrored image, authored instructions, claimed completed import or automatic crawling. |
| BB-04 | User imports a selected permitted recipe ingredient list and records household instructions. | Household-owned recipe can enter proposals only after explicit review; original site linked; posted Budget Bytes cost is never labeled current grocer price. |
| GR-01 | Open Groceries with no store selected or no provider credentials. | Manual copyable grocery list works; provider options labeled not verified/unavailable; zero retailer requests. |
| GR-02 | Jon explicitly chooses a destination, Alex has grocery review open. | Both see revised destination; accepted dinners/portion allocations unchanged; old review stale and old Send makes zero provider calls. |
| GR-03 | Switching between Kroger/demo and manual/Instacart. | Provider-specific product mappings and prices are not misapplied; unknown pricing remains unknown, approvals revalidated, exact earlier history unchanged. |
| GR-04 | Store switch while an outstanding draft plan preview is open. | Preview remains an unapplied plan idea; no accepted-week write, grocery transfer or loss of independent requests. |
| GR-05 | Store switch after a confirmed order with an additional grocery need. | Confirmed order/package history unchanged; residual need visible as unsent or next cycle according to current rules; no silent second pickup. |
| GR-06 | Product listed for one store has no equivalent package at another. | Unresolved match/quantity; no reuse of unrelated UPC or imaginary availability. |
| GR-07 | One grocery item unpriced at chosen destination. | No precise complete total, no statement that firm budget is met, no sort implying unknown = zero. |
| GR-08 | Select “Copy grocery list” with complete/incomplete prices. | Text/CSV faithfully represents ingredient counts, unknowns, contributors and units; copying creates no order/send receipt. |
| GR-09 | Jon changes destination while Alex is approving affected grocery quantities. | Alex receives visible difference; affected approvals are stale, unaffected approvals survive, focus and typed input preserved where possible. |
| GR-10 | Jon and Alex change selected destination simultaneously. | Revision-bound commands prevent losing a newer selection; both arrival orders exercised. |
| GR-11 | Switching retailer during in-flight acknowledged/failed/uncertain batch. | Started batch immutable, no network replay, outstanding needs accurately separated; late response cannot overwrite uncertain. |
| GR-12 | “Near me” query by postal code with no Instacart entitlement. | No invented nearby results. Saved manual destinations remain choices, but lack false fulfillment capabilities. |
| IC-01 | Recorded-fixture Instacart nearby-retailer response. | Brands/keys appear with “location/pickup unverified”; no specific branch or pickup slot invented. |
| IC-02 | Instacart fixture list-link request from current frozen reviewed quantities. | Correct supported `line_item_measurements`, ingredient identities and quantities; returns link status, **not cart sent or order placed**. |
| IC-03 | Stale review or changed destination before list-link dispatch. | Zero provider calls; user must review new list and destination. |
| IC-04 | Duplicate submit, timeout or 5xx after possible provider list creation. | Recorded outcome/idempotency or uncertainty; no blind repeat of an ambiguous request. |
| IC-05 | Link expiry, untrusted return URL or provider 401/403. | Honest unavailable state with no secrets in logs; link not silently trusted or presented as completed checkout. |
| IC-06 | Instacart not configured in non-test environment. | Hard fail closed; no live HTTP calls, no misleading success message. |
| E2E-01 | Jon saves Budget Bytes link → reviews supported recipe → Alex saves to Sounds good → next-week proposal considers it → one member adopts → chooses different destination. | Original current week stays untouched; only adopted plan changes next-week dinner demand; chosen destination changes product review, not recipes; no external send. |
| E2E-02 | Repeat E2E-01 with import incomplete and one unpriced ingredient. | Ineligible recipe stays out of complete proposal; no green nutrition/budget indicator. |
| E2E-03 | 320/390px; light/dark; 150/200% text; keyboard and screen-reader semantics on Save link, Import review, Source filter, Where to shop. | Modal trap/restore and focus work; no hidden or truncated essential info; no horizontal overflow; VoiceOver/Safari remain BLOCKED unless run. |
| SEC-01 | Household A accesses household B's bookmark, import draft, selected destination or list link by identifier. | Server rejects access, no information leakage and no mutation. |
| SEC-02 | External provider endpoints and keys in test and production-default environments. | Fixture tests make zero network calls; secrets remain server-side, out of exports/logs and backups. |
| SEC-03 | Unrecognized provider mode, malformed product response or unsupported quantities. | Fail closed; no fabricated price, item availability, list-link or provider acknowledgement. |

## Demonstration requirements

1. Test each command and data state using real PostgreSQL for one household with two authenticated members.
2. For URL-05/06/07, use a controlled local/injected fake network transport and prove no outbound private-IP request occurred; no public URL calls in routine tests.
3. For GR-02/09/10/11 and E2E-01, assert accepted-plan revision, exact ingredient requirements, approvals, historical order rows and retailer call counts; mere screen agreement is insufficient.
4. For IC-02, assert **link generated** semantics are not conflated with Kroger **cart batch acknowledged**, and neither is an order.
5. Cover both light/dark themes and scaling. Mark physical-phone, Safari and VoiceOver NOT RUN until actually executed.
6. Preserve all existing source tests unchanged unless a documented, justified test correction is essential. No removal, weakening or reclassification of prior acceptance failures.
