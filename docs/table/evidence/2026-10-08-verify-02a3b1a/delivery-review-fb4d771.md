# Table — Independent delivery and owner-gate review

Reviewed against user-supplied bundle `table-fb4d771.bundle`, `table-fb4d771.bundle.sha256`, `OWNER-INPUTS.md`, `UI-VISUAL-UPDATE-PROPOSAL.md`, and bundled repository documentation/code. Scope: provenance, structured evidence inspection, selected source inspection, and decision review. No full application suite rerun, no deployment, no account connection, no live retailer calls.

## Identity and evidence

- SHA-256 verified: `06a328a208903b27911b5fa47263dbbb65bae40cb35d3b3f24314ab39272c2b6`.
- Bundle clone at `fb4d7717e5ade288a23f52b8f1e0c3e2838f1d04` and Git fsck completed without error.
- Code verified in Claude's recorded run: `c19bd5a64047dab8aa935e48570940b5e831ad62`. Later changes are confined to `docs/` and `CLAUDE.md`.
- Inspected structured evidence: Vitest 284 passed / 0 failed / 0 pending; Playwright 116 expected / 0 unexpected / 0 flaky / 0 skipped; mutation result records 57 classifications `KILLED`, with 57 matching expected classifications.
- The initial full run on 4d0e822 FAILED and remains recorded; background-refresh race corrected before c19bd5a's passing run. This review does not re-execute PostgreSQL, Chromium or mutation tests.

## Delivery assessment

- B5 Kroger: implementation and fixture tests only. All live capabilities OFF; cart blocked by unresolved modality and owner authorization. No Kroger request sent.
- B7 USDA FDC: implementation and fixture tests; three demo-provider reads, one 429; production key/validation outstanding. Unknown nutrient values remain unknown and matches require confirmation.
- B9 Render: deploy template and runbook, local production-mode checks and local restore; no hosted checks. Provisional web service + Postgres estimate ~USD 13.30/month before tax/usage, not a quoted invoice or proof of 512 MB capacity.
- B8: prepared manual device checklist; Safari/WebKit/VoiceOver/physical phone results remain NOT RUN.
- Proposed visual update: reasonable and bounded as an interface change. It keeps the accepted-plan contract, price uncertainty, simulated retailer label, and accessible operations. No redesign was implemented.

## Gate 1: Kroger acceptable-use and cart history (high priority before any live cart activation)

The bundled Kroger documentation research quotes restrictions on persistent storage of data derived from cart additions and product searches. Table's current append-only handoff payload and acknowledgment records, plus any retained search-derived price observations, may implicate these restrictions. Whether first-party user-entered shopping requirements and operation metadata are permissible is not determined by this review. Do not treat an informal owner interpretation as legal clearance. Get clarification from Kroger developer support / relevant terms reviewer, or redesign data provenance/retention to avoid storing provider-derived content, before any live cart addition. Keep recipes and user-entered grocery needs distinguishable from provider-returned responses. Do not enable cart while the required modality and authorized scopes remain unresolved.

## Gate 2: cook-record idempotency (functional defect, not visual polish)

At `src/server/commands/plan.ts`, `recordCookedCommand` inserts into `cook_records` on each separately identified `RecordCooked` command for the same cooking event; at `src/ui/Cook.tsx`, the `Mark cooked` button remains enabled and calls the command again. The command framework deduplicates identical operation IDs, not distinct clicks. Thus separate clicks can append repeated cooking records for one event. This is a source-traced, not independently database-reproduced, defect. Before household use: add domain-level idempotency keyed to the cooking event, preserve attribution, define whether multiple records are ever valid, test two-member concurrent clicks and retries, and make the UI show already-recorded state without adding another record.

## Visual update decision

The proposal is appropriate to approve as *presentation scope only*, with one complete proposed week, deliberate adoption and Change/Apply, locked nights, separate cost measures, unknown prices, genuine recorded preferences, and no compulsory pantry or invented product photography. Keep theme contrast, 320px / 200%-text, modal focus, and status announcements as release gates. Implementation approval is separate from deployment or retailer activation.

## Recommended rollout sequence

1. Fix and test cook-record idempotency; separately clear Kroger data-use/legal issues before live activation.
2. Execute the approved visual update as a bounded UI pass, with before/after screenshots and unchanged contract tests.
3. Provision the private Render *simulated-retailer* service only after explicit owner hosting/spending approval; validate HTTPS, login, migrations, back up/restore and 512 MB memory behavior on host.
4. Run the device checklist on both phones; treat Safari and VoiceOver as NOT RUN until exercised.
5. Install an FDC production key through the host secret manager (never chat), validate one read-only match with separate approval.
6. Kroger: register app, clarify scopes/modality and data retention, verify authorized read-only connection, and obtain explicit account/product/quantity approval before one real cart addition. Checkout/pickup stays Kroger's handoff.

## No actions taken

No source edited, no repository commit/push, no provisioning, no secrets handled, no retail API calls. This is not owner approval of any cost or external action.
