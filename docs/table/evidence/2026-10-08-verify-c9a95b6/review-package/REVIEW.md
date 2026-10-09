# Table — URL-to-cart delivery recheck

Reviewed delivery: `988c4d146169c95b0e478feaa16744337c87333e`  
Tested implementation in the delivered evidence: `184d99f4c02ec502a1d8b1d20ade18a8b56e19d7`  
Date: 2026-10-08  
Disposition: two targeted source-level counterexamples need correction before activating their affected live capabilities. This is not a rejection of the entire delivery or a new feature assignment.

## 1. The pilot context must be retained

Jon has already created the Render Free web service at `https://meal-planner-eq58.onrender.com`, connected it to Neon, provisioned his household, and reported successfully signing in. This is user-reported deployment context from this conversation, not a fresh host inspection by this reviewer. The current deployed commit, database migration level, account sharing with Alex, backups, and enabled environment switches were not verified in this review.

The next step is an upgrade and validation of that existing pilot, not a new hosting decision or a request to approve the paid Render configuration. Do not recreate the household, reset its credentials, replace its database, enable automated test fixtures, or write to the deployment merely because this package exists. Any live update still needs its own authorization and a recovery plan.

## 2. What was independently checked

- The mounted bundle SHA-256 is `3844c45a4d840e2bb9fde69b2076841a123b5202e6696a0184c99aa0bb8b46e3`, matching its supplied checksum file.
- Explicit `git clone --branch main` restored `988c4d146169c95b0e478feaa16744337c87333e`; `git fsck --full` returned zero.
- The connected GitHub branch read returned that same `main` commit when checked.
- No file outside `docs/` and `CLAUDE.md` differs between the implementation and final delivery.
- Independently hashing the implementation commit's tracked file bytes in the repository verification script's order reproduced `557d92e4986ade91b4af1f6bc6e5f169dfc9c18c956f95ba73cb531713411e15`.
- Saved structured evidence contains 1,095 passing Vitest assertions, 131 expected Playwright results with zero unexpected/flaky/skipped, and 83 KILLED mutation entries with restoration recorded true. These records match the delivered summary.
- Actual delivered TypeScript modules were executed for the narrow probes below. TypeScript was transpiled locally; database access and the draft sink were recording substitutes. Recipe fetching used the actual `safeFetch` and extractor with a completely fake resolver and transport. No recipe page, image, or retailer was contacted.

**Not performed:** full application suite, PostgreSQL execution, browser execution, deployed-site inspection, live provider calls, migration against Jon's actual database, or a complete code/security audit. A staged payload or emitted SQL in these probes is not proof of a committed PostgreSQL row. The records above are not an independent reproduction of Claude's 1,095/131/83 results.

Machine-readable results: `evidence/identity-and-evidence.json`, `evidence/probes.json`.

## 3. RUC-01 — Redirects bypass source policy and inherit the initial site's grant

**Affected capability:** live recipe-page reading; retention of source instructions/photos when configured.

### Source

- `src/server/recipe-import-service.ts:126–131`: Budget Bytes is checked against the original bookmark's domain before calling the fetcher.
- `src/server/integrations/recipe-import/fetcher.ts:133–147`: each redirect is revalidated for URL/network safety, but the source-specific no-read policy is not applied before following it.
- `src/server/recipe-import-service.ts:144–159`: extraction uses the actual final URL, while `contentUse` still receives the original bookmark domain.
- `src/server/recipe-import-service.ts:176–195`: the final fetched URL and content retained under the original grant are handed to the draft writer together.

### Executed counterexamples

All hostnames below were handled by an in-process fake transport; even the Budget Bytes hostname made no internet request.

1. A synthetic `licensed.example.com` URL is granted instructions/photos. Its response redirects to `ungranted.example.com`. The delivered importer requests the target and stages its synthetic instructions with the basis **"permission recorded for licensed.example.com"**. The grant was not established for the source that supplied the content.
2. The same initial URL redirects to `www.budgetbytes.com`. The importer requests that blocked hostname and stages the target recipe under the initial site's grant. The "Budget Bytes never read" rule therefore holds for direct links but not redirecting links.
3. Positive guard: a directly bookmarked Budget Bytes URL is refused with `permission_blocked` and zero transport calls.

### Required repair

Separate network safety, site-read policy, and content-retention policy. All three need their own decisions; a public IP address is not a content grant.

Apply the no-read policy before **every actual request**, including redirected recipe URLs and relevant image URL/redirect requests. Determine content-retention authority using the actual content source and any explicitly documented scope of the grant. Do not transfer a grant merely because the initial URL belonged to another domain. Preserve the original submitted URL and actual fetched URL accurately.

Do not reject legitimate same-source redirects or authorized CDN photographs automatically. Instead, make any allowed source-to-CDN relationship explicit and test it. A recipe page naming an arbitrary external image is not by itself proof that a grant applies to that image. The repair must not weaken HTTPS, DNS pinning, private-address rejection, deadlines, decompression/size limits, or script-free extraction.

### Regression requirements

- Direct blocked source: zero calls to it.
- Allowed initial URL → blocked source: zero calls to the blocked target; no retained target content or draft falsely attributed to the initial grant.
- Granted source → ungranted source: no inherited right to store method/photo; retain facts only where the separate read policy permits, with truthful attribution.
- Same-source redirect and an explicitly allowed cross-domain/CDN case still work.
- Photo redirects honor the corresponding source policy before request, not only after download.
- Both facts-only and configured-grant modes are tested.

## 4. RUC-02 — A manual amount converts non-unit purchasing into a fixed package and price

**Affected capability:** live Kroger product selection and derived package/cost estimates. This does not establish a real cart write; cart activation remains off.

### Source

- `src/server/integrations/kroger/products.ts:111–117` deliberately leaves `package` null for a product not recognized as sold by unit; `soldBy` and price are retained separately.
- `src/server/kroger-mapping-service.ts:89–96` passes that distinction to the command.
- `src/server/commands/groceries.ts:374–388` accepts a manually entered quantity when `package` is null without resolving the sale/price basis.
- `src/server/commands/groceries.ts:395–414` always writes `variable_weight=false`, then records the raw provider amount as this product's price observation.
- `src/domain/groceries/projection.ts:477` derives its estimate indicator from `variableWeight`.

### Executed counterexample

The actual command handler received a synthetic candidate:

- `soldBy: "WEIGHT"`, `sizeText: "per lb"`, `package: null`;
- provider numeric price: 499 minor units;
- member-entered amount: 2 lb;
- explicitly reviewed current product: none (`expectedProductId: null`).

It accepted the choice, emitted an INSERT for a 2-lb product with `variable_weight=false`, emitted a 499-minor-unit price observation, and reported `priced: true`.

A typed amount does not establish that the provider price is for that amount. With a hypothetical $4.99-per-pound quote and a 2-lb purchase, treating $4.99 as the total fixed-package price would understate it; this arithmetic example is **not** a statement about a measured real Kroger response. The defect is unwarranted certainty about package and price basis, even when the external meaning is undocumented.

Positive guard: the same path still accepts an ordinary fixed-unit synthetic product. Any repair must preserve that behavior.

### Required repair

Distinguish a parseable fixed package, a fixed package needing its physical amount clarified, a variable-weight product, and an undocumented/ambiguous sold-by or price basis. Preserve provenance for both the provider basis and the member's observation.

The bounded safe repair may refuse unsupported variable/unknown-basis choices with a useful explanation rather than implement a full weight-based checkout system in this pass. It must not mark them as fixed, fully priced packages. If the implementation supports an estimated purchase weight, quantities, pricing basis, estimate labels, and provider cart semantics must all remain explicit. Keep uncertainty until supported; do not guess undocumented retailer behavior.

Tests must cover fixed-unit products, missing or unfamiliar sold-by values, variable-weight candidates, manual size entry, promotions, no price, and the downstream grocery estimate. No ambiguous result should satisfy a hard budget as though complete pricing were established. Do not rewrite prior orders or price history during the repair.

## 5. The Kroger UI evidence gap is genuine, but not an owner credential gate

`docs/table/ACCEPTANCE.md:461–465` records integration tests for mapping and **typecheck/build only** for the matching UI. Claude also disclosed this accurately in the delivery.

An in-process fake living outside the current Playwright process is a test-architecture constraint, not evidence that browser coverage requires live Kroger credentials. Add a narrowly scoped, production-refused test configuration or a test server wired to the existing fake. Do not put unrestricted fake-control endpoints into production.

Before a live product-match pilot, exercise search, select, unreadable/variable package behavior, concurrent changed product/store/destination, stale selection, focus/keyboard behavior, 320px enlarged text, and zero cart calls. Do not add another general visual-polish pass.

## 6. Application switches are not evidence of publisher permission

The supplied owner sheet distinguishes reading (`TABLE_RECIPE_IMPORT_FETCH`) from keeping method/photo (`TABLE_RECIPE_CONTENT` or per-site grants). That is useful. However, `household_private` is an owner-selected application mode, not a licence received from the publisher. Store that distinction honestly in provenance; do not label owner preference as documented publisher permission.

The U.S. Copyright Office explains that noncommercial use is relevant to fair use but does not make every such use automatically fair. Budget Bytes' FAQ requests permission for recipe/photo reuse on other websites and evaluates requests individually. This review does not decide the legal status of a particular private household import, nor does it assert that every factual recipe field always requires a publisher licence.

Current primary sources consulted for this distinction:
- https://copyright.gov/fair-use/
- https://www.budgetbytes.com/faq/

## 7. Next delivery, tightly bounded

1. Repair and regression-test RUC-01 and RUC-02; add the missing credential-independent Kroger UI checks.
2. Update the deployment records using the existing Render + Neon pilot facts, without representing its exact deployed commit as verified unless read from the host.
3. Run the established complete verification on one clean implementation commit. Keep source-level probe evidence separate from real PostgreSQL and browser reproductions. Preserve failed runs and do not weaken original acceptance conditions.
4. Prepare one existing-service upgrade instruction: preserve database and auth configuration, back up, apply migration 012 (and any subsequent additive repair migration), deploy an exact verified commit, and check health and existing sign-in. Do not deploy or enable providers during this review.
5. After separate authorization, run a single real URL-to-recipe smoke test with a source whose content handling is established. Source refusal remains a real result, not a reason to bypass protections. Full household use should not require another hosting selection.

## 8. Run the probes

Requires Node and a local TypeScript installation. No application dependency installation, database, or internet is required for these probes.

```bash
NODE_PATH="$(npm root -g)" node probes/recheck.cjs /path/to/Meal-Planner
```

Alternatively set `TYPESCRIPT_PATH` to your locally installed `typescript` module. The reviewed source is loaded read-only. Current assertions characterize the defects; they must not be copied into acceptance tests as desired behavior. Write expected-correctness regressions in the application harness before repairing.

No repository source, remote, deployment, secrets, household database, recipe site, or retailer was changed by this recheck.
