#!/usr/bin/env node
// Mutation checks with honest classification (review finding V01).
//
// For every mutation: inject a forbidden behavior, run ONLY its targeted tests with vitest's
// JSON reporter, and classify:
//   KILLED   targeted tests executed, and at least one EXPECTED test failed with an assertion
//   SURVIVED targeted tests executed and all passed
//   ERROR    anything else: runner/compiler/database failure, no tests executed, anchor not
//            found, failures that are not assertions, or an unexpected test failing instead
// A clean (unmutated) baseline of each targeted selection must pass first. Sources are
// restored on every path and verified by SHA-256. Full logs and a results.json are kept.
//
// Usage: node tests/mutation/run.mjs [--out DIR] [--only name[,name]] [--include-controls]
// Exit 0 only if every selected mutation is KILLED (controls are expected to SURVIVE).
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
process.chdir(ROOT);
const args = process.argv.slice(2);
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const OUT = path.resolve(opt("--out") ?? `/tmp/table-mutation-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const ONLY = opt("--only")?.split(",") ?? null;
const CONTROLS = args.includes("--include-controls");
mkdirSync(OUT, { recursive: true });

const PLAN = "tests/integration/plan.contract.test.ts";
const GROC = "tests/integration/groceries.contract.test.ts";
const REV = "tests/integration/review-regressions.test.ts";
const B12 = "tests/integration/b12.staple-products.test.ts";
const B16 = "tests/integration/b16.staple-management.test.ts";
const B17 = "tests/integration/b17.recipes.test.ts";
const REBASE = "tests/unit/recipe-rebase.test.ts";
const B9 = "tests/integration/b9.dispatch-overlap.test.ts";
const B9R = "tests/integration/b9.account-recovery.test.ts";
const COOK = "tests/integration/cook-records.test.ts";
const THEME = "tests/unit/theme-contrast.test.ts";
const B2122 = "tests/integration/b21-b22.test.ts";
const B5C = "tests/integration/b5.kroger-connection.test.ts";
const B5D = "tests/integration/b5.kroger-dispatch.test.ts";
const B7U = "tests/unit/fdc-normalize.test.ts";
const B7I = "tests/integration/b7.nutrition.test.ts";

/** expect: regexes over failing test full names; at least one must fail by assertion. */
const MUTATIONS = [
  { name: "blanket_week_conflict", file: "src/server/commands/plan.ts", suite: PLAN, pattern: "T10", expect: [/T10/],
    edits: [["    const stale = closureStale({ assignments: preview.base.assignments, events: preview.base.events }, state);",
      "    const stale = week.acceptedChoiceRevision !== preview.base.acceptedChoiceRevision ? { stale: true, changed: [] } : closureStale({ assignments: preview.base.assignments, events: preview.base.events }, state);"]] },
  { name: "last_write_wins", file: "src/server/commands/plan.ts", suite: PLAN, pattern: "T08|T11|T22", expect: [/T08|T11|T22/],
    edits: [["    if (stale.stale) {", "    if (false && stale.stale) {"], ["    if (res.contentHash !== preview.content_hash) {", "    if (false) {"]] },
  { name: "stale_adoption", file: "src/server/commands/plan.ts", suite: PLAN, pattern: "T12", expect: [/T12/],
    edits: [["if (week.acceptedChoiceRevision !== p.expectedAcceptedChoiceRevision || week.acceptedChoiceRevision !== proposal.base_accepted_choice_revision) {", "if (false) {"]] },
  { name: "stale_send", file: "src/server/commands/purchasing.ts", suite: GROC, pattern: "T13|T14", expect: [/T13|T14/],
    edits: [["    if (summary.reviewFingerprint !== p.reviewFingerprint || summary.payloadHash !== p.payloadHash) {", "    if (false) {"],
      ["    if (hashOf(payload) !== p.payloadHash) throw", "    if (false) throw"]] },
  { name: "approvals_not_consumed", file: "src/server/commands/purchasing.ts", suite: GROC, pattern: "X03", expect: [/X03/],
    edits: [["      await c.query(\"UPDATE purchase_approvals SET state='consumed'", "      if (false) await c.query(\"UPDATE purchase_approvals SET state='consumed'"]] },
  { name: "uncertain_as_unsent", file: "src/domain/groceries/projection.ts", suite: GROC, pattern: "T16", expect: [/T16/],
    edits: [["      if (b.status === \"uncertain\") uncertain += n;\n      else sent += n;", "      if (b.status === \"uncertain\") continue;\n      else sent += n;"]] },
  { name: "dispatch_superseded", file: "src/server/commands/purchasing.ts", suite: GROC, pattern: "T17", expect: [/superseded queued work/],
    edits: [["    if (superseded.length) {", "    if (false) {"]] },
  // Corrections from the review of 89f3ea9: each reintroduces the reported defect.
  { name: "F01_admission_skipped", file: "src/server/commands/plan.ts", suite: REV, pattern: "R-F01", expect: [/R-F01[abc]/],
    edits: [["    if (admission.problems.length) {", "    if (false) {"]] },
  { name: "F02_locked_group_dropped", file: "src/server/commands/plan.ts", suite: REV, pattern: "R-F02", expect: [/R-F02a/],
    edits: [[".filter((a) => a.locked || (a.cookingEventId && lockedEvents.has(a.cookingEventId)))", ".filter((a) => a.locked)"]] },
  { name: "F03_place_skips_exclusions", file: "src/domain/planning/operations.ts", suite: REV, pattern: "R-F03", expect: [/R-F03a/],
    edits: [["      checkNewRecipe(rv); // placing", "      // checkNewRecipe(rv); // placing"]] },
  { name: "F04_order_hides_transfers", file: "src/domain/groceries/projection.ts", suite: REV, pattern: "R-F04", expect: [/R-F04[abc]/],
    edits: [["      if (reconciled.has(b.id)) continue;", "      if (order) continue;"]] },
  { name: "F05_substitute_counts_as_original", file: "src/domain/groceries/projection.ts", suite: REV, pattern: "R-F05", expect: [/R-F05[ab]/],
    edits: [["toP(ol.packages - mis - sub, ol.packageQty, ol.packageUnit)", "toP(ol.packages - mis, ol.packageQty, ol.packageUnit)"]] },
  { name: "F06_enough_uses_current_demand", file: "src/server/commands/groceries.ts", suite: REV, pattern: "R-F06", expect: [/R-F06a/],
    edits: [["[actor.householdId, cycleId, p.ingredientKey, p.state, p.quantity ?? null, p.unit ? normalizeUnit(p.unit) : null, reviewedDemand, reviewedUnit, actor.memberId],",
      "[actor.householdId, cycleId, p.ingredientKey, p.state, p.quantity ?? null, p.unit ? normalizeUnit(p.unit) : null, line.meal?.quantity ?? reviewedDemand, line.meal?.unit ?? reviewedUnit, actor.memberId],"]] },
  { name: "F07_capture_into_confirmed_pickup", file: "src/server/commands/groceries.ts", suite: REV, pattern: "R-F07", expect: [/R-F07b/],
    edits: [["      if (!confirmed.rowCount) break;", "      break;"]] },
  { name: "F08_single_week_recompute", file: "src/server/commands/framework.ts", suite: REV, pattern: "R-F08", expect: [/R-F08/],
    edits: [["      if (outcome.purchasingInputsChanged) {", "      if (false) {"]] },
  { name: "B3_extra_cost_reprices_history", file: "src/server/commands/plan.ts", suite: "tests/integration/b3.received-goods.test.ts", pattern: "B3", expect: [/labels and favors/],
    edits: [["current.outstandingPurchase.complete && next.outstandingPurchase.complete\n      ? { known: true, minor: next.outstandingPurchase.knownMinor - current.outstandingPurchase.knownMinor }",
      "current.pickupSpending.complete && next.pickupSpending.complete\n      ? { known: true, minor: next.pickupSpending.knownMinor - current.pickupSpending.knownMinor }"]] },
  // B12: remembered staple products.
  { name: "B12_stale_staple_overwrites", file: "src/server/commands/groceries.ts", suite: B12, pattern: "B12d", expect: [/B12d/],
    edits: [["    if (s.product_revision !== p.expectedRevision) {", "    if (false) {"], ["WHERE household_id=$1 AND ingredient_key=$2 AND product_revision=$5 RETURNING", "WHERE household_id=$1 AND ingredient_key=$2 AND $5::int IS NOT NULL RETURNING"]] },
  { name: "B12_tap_ignores_remembered_product", file: "src/server/commands/groceries.ts", suite: B12, pattern: "B12", expect: [/B12b|B12c/],
    edits: [["    if (activeStaple) productIntent = activeStaple.product_id;", "    if (false && activeStaple) productIntent = activeStaple.product_id;"]] },
  { name: "B12_decision_swaps_outstanding_purchase", file: "src/server/commands/groceries.ts", suite: B12, pattern: "B12b", expect: [/B12b/],
    edits: [["    const revision = up.rows[0].product_revision;",
      "    const revision = up.rows[0].product_revision;\n    await c.query(\"UPDATE household_requests SET product_id=$2 WHERE household_id=$1 AND ingredient_key=$3 AND state='active' AND product_id IS NOT NULL\", [actor.householdId, pr.rows[0].id, p.ingredientKey]);"],
      ["      change: { weekId: null, summary: { type: \"staple\",", "      purchasingInputsChanged: true,\n      change: { weekId: null, summary: { type: \"staple\","]] },
  { name: "B12_unavailable_product_substituted", file: "src/domain/groceries/projection.ts", suite: B12, pattern: "B12e", expect: [/B12e/],
    edits: [["      } else if (!intent.available) {", "      } else if (false) {"]] },
  { name: "B12_usual_quantity_overwrites_product", file: "src/server/commands/groceries.ts", suite: B12, pattern: "B12f", expect: [/B12f/],
    edits: [["UPDATE household_staples SET usual_packages=$3, usual_amount=NULL", "UPDATE household_staples SET usual_packages=$3, product_id=(SELECT product_id FROM product_mappings m WHERE m.household_id=$1 AND m.ingredient_key=$2), usual_amount=NULL"]] },
  // B16: staple management and the cross-feature scenarios.
  { name: "B16_stale_edit_applied", file: "src/server/commands/staples.ts", suite: B16, pattern: "Scenario A", expect: [/concurrent edits of one staple/],
    edits: [["    if (s.details_revision !== p.expectedRevision) throw staleDetails(s);", "    if (false) throw staleDetails(s);"], ["AND details_revision=$8 RETURNING", "AND $8::int IS NOT NULL RETURNING"]] },
  { name: "B16_stale_removal_applied", file: "src/server/commands/staples.ts", suite: B16, pattern: "Scenario A", expect: [/an edit racing a removal/],
    edits: [["    if (p.expectedRevision !== s.details_revision) throw staleDetails(s);", "    if (false) throw staleDetails(s);"], ["AND details_revision=$5 RETURNING", "AND $5::int IS NOT NULL RETURNING"]] },
  { name: "B16_removed_staple_still_a_shortcut", file: "src/server/commands/groceries.ts", suite: B16, pattern: "B16c", expect: [/B16c/],
    edits: [["const activeStaple = staple?.rowCount && staple.rows[0].active ? staple.rows[0] : null;", "const activeStaple = staple?.rowCount ? staple.rows[0] : null;"]] },
  { name: "B16_removal_drops_grocery_need", file: "src/server/commands/staples.ts", suite: B16, pattern: "Scenario C", expect: [/Scenario C/],
    edits: [["    await logChange(c, actor, p.ingredientKey, p.active ? \"restored\" : \"deactivated\",",
      "    if (!p.active) await c.query(\"UPDATE household_requests SET state='removed' WHERE household_id=$1 AND ingredient_key=$2 AND state='active'\", [actor.householdId, p.ingredientKey]);\n    await logChange(c, actor, p.ingredientKey, p.active ? \"restored\" : \"deactivated\","]] },
  { name: "B16_measured_amount_rounds_down", file: "src/server/commands/staples.ts", suite: B16, pattern: "B16a", expect: [/B16a/],
    edits: [["const packages = packagesFor(inPkgUnit, new D(product.package_qty));", "const packages = Math.max(1, inPkgUnit.div(product.package_qty).floor().toNumber());"]] },
  { name: "B16_repoint_keeps_old_package_count", file: "src/server/commands/groceries.ts", suite: B16, pattern: "re-pointing", expect: [/re-pointing a staple/],
    edits: [["usual_packages=COALESCE($6, usual_packages)", "usual_packages=COALESCE(NULL::int + $6, usual_packages)"]] },
  { name: "B15_product_choice_any_household_week", file: "src/server/commands/groceries.ts", suite: B16, pattern: "another household", expect: [/another household's week/],
    edits: [["  if (!(await weekById(c, householdId, weekId))) throw new Reject(\"not_found\", \"Week not found\");", "  void weekById;"]] },
  { name: "B15_substitution_decision_overwritten", file: "src/server/commands/groceries.ts", suite: B16, pattern: "substitution decision", expect: [/substitution decision made against an older view/],
    edits: [["      if ((v.rows[0]?.id ?? null) !== (p.expectedValidationId ?? null)) {", "      if (false) {"]] },
  // B17: recipe edits name the version they were made from.
  { name: "B17_stale_recipe_version_stacked", file: "src/server/commands/library.ts", suite: B17, pattern: "B17", expect: [/two edits made from the same version/],
    edits: [["        if (current !== p.expectedVersionNo) {", "        if (false) {"]] },
  // B17 correction (independent review of 7220679).
  { name: "RB17_03_version_optional_again", file: "src/server/commands/library.ts", suite: B17, pattern: "RB17-03", expect: [/RB17-03/],
    edits: [["      {\n        // RB17-03:", "      if (p.expectedVersionNo !== undefined) {\n        // RB17-03:"]] },
  { name: "RB17_01_untouched_field_reverted", file: "src/domain/recipes/rebase.ts", suite: REBASE, pattern: "RB17", expect: [/never reverts fields|takes the newer steps/],
    edits: [["      merged = take(merged, current, k); // untouched by the member: the current value stands", "      // (mutated) the draft's stale value is kept"]] },
  { name: "RB17_01_conflict_decided_silently", file: "src/domain/recipes/rebase.ts", suite: REBASE, pattern: "RB17", expect: [/does not decide for the member/],
    edits: [["    } else conflicts.push(k);", "    } else { merged = take(merged, current, k); taken.push(k); }"]] },
  { name: "RB17_02_occurrences_collapsed", file: "src/domain/recipes/rebase.ts", suite: REBASE, pattern: "RB17", expect: [/identical occurrences|first of two/],
    edits: [["xs.reduce((m, x) => m.set(x.key, (m.get(x.key) ?? 0) + 1), new Map<string, number>())", "xs.reduce((m, x) => m.set(x.key, 1), new Map<string, number>())"]] },
  { name: "RB17_01_undecided_field_dropped", file: "src/domain/recipes/rebase.ts", suite: REBASE, pattern: "RB17", expect: [/undecided field survives/],
    edits: [["      const still = s.pending.filter((k) => ", "      const still = s.pending.filter((k) => false && "]] },
  { name: "RB17_01_older_version_rebased", file: "src/domain/recipes/rebase.ts", suite: REBASE, pattern: "RB17", expect: [/not newer than the draft/],
    edits: [["if (s.seen === null || a.version <= s.seen) return s;", "if (s.seen === null || a.version === s.seen) return s;"]] },
  { name: "RB17_02_compared_by_display_name", file: "src/domain/recipes/rebase.ts", suite: REBASE, pattern: "RB17", expect: [/shared-list rename/],
    edits: [["  if (k === \"ingredients\") return JSON.stringify({ c:", "  if (k === \"ingredients\") return display(f, k) || JSON.stringify({ c:"]] },
  { name: "RB17_01_compared_unlike_stored", file: "src/domain/recipes/rebase.ts", suite: REBASE, pattern: "RB17", expect: [/store identically|comes back to the stored value/],
    edits: [["r.ingredientKey || slug(r.ingredientName.trim()), decimalKey(r.quantity), normalizeUnit(r.unit)", "r.ingredientKey ?? r.ingredientName, r.quantity, r.unit"]] },
  { name: "B15_stale_product_choice_applied", file: "src/server/commands/groceries.ts", suite: B16, pattern: "Scenario B/E", expect: [/two product choices for the same pickup line/],
    edits: [["  if ((now?.id ?? null) !== (p.expectedProductId ?? null)) {", "  if (false) {"]] },
  // B5: Kroger adapter behind the closed live gate (recording fake transport).
  { name: "B5_replayed_state_accepted", file: "src/server/integrations/kroger/connection.ts", suite: B5C, pattern: "B5 authorization callback", expect: [/replayed state is refused/],
    edits: [["AND redirect_uri=$4 AND consumed_at IS NULL AND expires_at", "AND redirect_uri=$4 AND expires_at"]] },
  { name: "B5_ack_recorded_per_line", file: "src/server/integrations/kroger/cart.ts", suite: B5D, pattern: "204", expect: [/204: one PUT/],
    edits: [["evidence: { ...base, httpStatus: 204, granularity: \"batch\", meaning: ACK_MEANING }", "evidence: { ...base, httpStatus: 204, granularity: \"line\", lines: \"every line added\", meaning: ACK_MEANING }"]] },
  { name: "B5_timeout_recorded_as_failed", file: "src/server/integrations/kroger/adapter.ts", suite: B5D, pattern: "never replayed", expect: [/timeout is uncertain/],
    edits: [["      outcome = { kind: \"uncertain\", evidence: { provider: \"kroger\"", "      outcome = { kind: \"failed\", evidence: { provider: \"kroger\""]] },
  { name: "B5_ready_without_activation", file: "src/server/integrations/kroger/config.ts", suite: B5D, pattern: "readiness", expect: [/stays false with full credentials/],
    edits: [["  if (!active.has(cap)) return no(", "  if (false) return no("]] },
  { name: "B5_token_stored_in_plaintext", file: "src/server/integrations/kroger/connection.ts", suite: B5C, pattern: "B5 authorization callback", expect: [/stores tokens sealed/],
    edits: [["householdId, seal(cfg.key!, t.accessToken, aad(\"access\", householdId)), t.refreshToken ? seal(cfg.key!, t.refreshToken, aad(\"refresh\", householdId)) : null,\n        t.expiresInSeconds,",
      "householdId, t.accessToken, t.refreshToken,\n        t.expiresInSeconds,"]] },
  { name: "B5_refresh_not_coordinated", file: "src/server/integrations/kroger/connection.ts", suite: B5C, pattern: "refresh coordination", expect: [/exactly one refresh|marks needs_reauthorization once and never loops/],
    edits: [["AND token_revision=$3 AND (refresh_lease_until IS NULL OR refresh_lease_until <= clock_timestamp())", "AND token_revision=$3"]] },
  // B7: FoodData Central nutrition. Each reintroduces a defect a real implementation could have.
  { name: "B7_missing_kcal_becomes_zero", file: "src/domain/nutrition/fdc.ts", suite: B7U, pattern: "B7", expect: [/never zero/],
    edits: [["  return { amount: null, unit: null, number: null, status: \"missing\" };", "  return { amount: \"0\", unit: EXPECTED_UNIT[key], number: null, status: \"missing\" };"]] },
  { name: "B7_serving_treated_as_100g", file: "src/domain/nutrition/fdc.ts", suite: B7U, pattern: "B7", expect: [/30 g label serving/],
    edits: [["unit: \"serving\", gramWeight: grams, source: \"brandedServing\"", "unit: \"serving\", gramWeight: \"100\", source: \"brandedServing\""]] },
  { name: "B7_ml_serving_as_grams", file: "src/domain/nutrition/fdc.ts", suite: B7U, pattern: "B7", expect: [/serving in ml/],
    edits: [["const GRAM_UNITS = new Set([\"g\", \"grm\", \"gram\", \"grams\"]);", "const GRAM_UNITS = new Set([\"g\", \"grm\", \"gram\", \"grams\", \"ml\"]);"]] },
  { name: "B7_digest_not_checked", file: "src/server/commands/nutrition.ts", suite: B7I, pattern: "B7 changed since review", expect: [/values that differ from the reviewed ones/],
    edits: [["    if (view.reviewDigest !== p.reviewDigest) {", "    if (false) {"]] },
  { name: "B7_stale_revision_accepted", file: "src/server/commands/nutrition.ts", suite: B7I, pattern: "B7 competing", expect: [/refused stale/],
    edits: [["  if (cur.revision !== expectedRevision) {", "  if (false) {"]] },
  { name: "B7_allergen_flag_set_from_fdc", file: "src/server/commands/nutrition.ts", suite: B7I, pattern: "B7 nutrition never rewrites", expect: [/not allergen clearance/],
    edits: [["    const portion = eff.value.portion;", "    const portion = eff.value.portion;\n    await c.query(\"UPDATE ingredients SET allergen_info_known=true WHERE household_id=$1 AND key=$2\", [actor.householdId, p.ingredientKey]);"]] },
];
MUTATIONS.push(
  { name: "B9_late_outcome_overwrites_uncertain", file: "src/server/commands/purchasing.ts", suite: B9, pattern: "B9", expect: [/never overwrites it|later answer does not change it/],
    edits: [["    if (now !== \"dispatch_started\") {", "    if (false) {"]] },
  { name: "B9_startup_recovers_live_sends", file: "src/server/commands/purchasing.ts", suite: B9, pattern: "B9", expect: [/does not mark that transfer uncertain/],
    edits: [["  return recoverInterruptedDispatches(dispatchRecoveryAfterMs());", "  return recoverInterruptedDispatches(0);"]] },
  { name: "B9_dispatch_unbounded", file: "src/server/commands/purchasing.ts", suite: B9, pattern: "B9", expect: [/never answers becomes uncertain/],
    edits: [["        timer = setTimeout(() => reject(", "        timer = setTimeout(() => void ("]] },
  { name: "B9_no_running_sweep", file: "src/instrumentation.ts", suite: B9, pattern: "B9", expect: [/periodic sweep/],
    edits: [["  setInterval(() => void run(\"recovery-sweep\"), recoverySweepIntervalMs()).unref();", "  // (mutated) no sweep while running"]] },
  { name: "COOK_second_record_added", file: "src/server/commands/plan.ts", suite: COOK, pattern: "cook-record", expect: [/adds nothing|exactly one record/],
    edits: [["    if (existing.rowCount) {\n      const x = existing.rows[0];", "    if (false) {\n      const x = existing.rows[0];"]] },
  { name: "COOK_correction_applied_twice", file: "src/server/commands/plan.ts", suite: COOK, pattern: "cook-record", expect: [/already corrected/],
    edits: [["    if (x.corrected || x.duplicate_of) throw", "    if (x.duplicate_of) throw"]] },
  { name: "COOK_history_counts_corrected", file: "src/server/queries/library.ts", suite: COOK, pattern: "cook-record", expect: [/appended correction/],
    edits: [["\"SELECT v.recipe_id, cr.cooked_on, m.display_name FROM cook_records_effective cr JOIN", "\"SELECT v.recipe_id, cr.cooked_on, m.display_name FROM cook_records cr JOIN"]] },
  { name: "COOK_new_to_you_counts_corrected", file: "src/server/queries/library.ts", suite: COOK, pattern: "cook-record", expect: [/appended correction/],
    edits: [["    \"SELECT DISTINCT v.recipe_id FROM cook_records_effective cr JOIN", "    \"SELECT DISTINCT v.recipe_id FROM cook_records cr JOIN"]] },
  { name: "COOK_snapshot_ignores_record", file: "src/server/queries/snapshot.ts", suite: COOK, pattern: "cook-record", expect: [/already cooked, by whom|appended correction/],
    edits: [["cooked: cookedBy.get(ev.id) ?? null", "cooked: null"]] },
  // B21: the command must re-record as the next link of the chain (the database refuses anything else).
  { name: "B21_rerecord_without_link", file: "src/server/commands/plan.ts", suite: B2122, pattern: "B21", expect: [/correction followed by legitimate re-recording/],
    edits: [["prev ? prev.generation + 1 : 1, prev?.id ?? null]", "prev ? prev.generation + 1 : 1, null]"]] },
  // B22: a dinner no longer on its accepted plan is refused.
  { name: "B22_stale_event_accepted", file: "src/server/commands/plan.ts", suite: B2122, pattern: "B22", expect: [/no longer scheduled|same moment/],
    edits: [["    if (!e.rows[0].on_plan) {", "    if (false) {"]] },
  { name: "B22_status_only", file: "src/server/commands/plan.ts", suite: B2122, pattern: "B22", expect: [/no longer scheduled|same moment/],
    edits: [["(e.status = 'scheduled' AND w.accepted_choice_revision > 0", "(e.status <> 'retired' AND w.accepted_choice_revision > 0"], ["AND EXISTS (SELECT 1 FROM assignments a WHERE a.week_id=e.week_id AND a.cooking_event_id=e.id AND a.kind='cook' AND a.night=e.cook_night)) AS on_plan", ") AS on_plan"]] },
  // Visual update: the contrast check reads the shipped tokens; a too-light or too-dark text token must fail it.
  { name: "UI_light_text_too_faint", file: "src/app/globals.css", suite: THEME, pattern: "theme contrast", expect: [/theme contrast — light/],
    edits: [["--muted: #574e45; --faint: #6b6157;", "--muted: #574e45; --faint: #9a8f84;"]] },
  { name: "UI_dark_text_too_faint", file: "src/app/globals.css", suite: THEME, pattern: "theme contrast", expect: [/theme contrast — dark/],
    edits: [["--muted: #c2b6aa; --faint: #a3978b;", "--muted: #c2b6aa; --faint: #6f655b;"]] },
  { name: "B9_reset_keeps_sessions", file: "src/server/provision.ts", suite: B9R, pattern: "B9", expect: [/ends that member's sessions/],
    edits: [["  await ctx.internalAdapter.deleteUserSessions(userId);", "  // (mutated) sessions kept"]] },
  { name: "B9_reset_any_account", file: "src/server/provision.ts", suite: B9R, pattern: "B9", expect: [/non-member account/],
    edits: [["  if (!userId || !member?.rowCount) throw", "  if (!userId) throw"]] },
);
// A harmless change that MUST be classified SURVIVED (proves the classifier can say so).
const CONTROLS_LIST = [
  { name: "control_noop_comment", control: true, file: "src/server/commands/plan.ts", suite: PLAN, pattern: "T10", expect: [/T10/],
    edits: [["const ISO_DATE = ", "/* mutation-control */ const ISO_DATE = "]] },
];

const selected = [...MUTATIONS, ...(CONTROLS ? CONTROLS_LIST : [])].filter((m) => !ONLY || ONLY.includes(m.name));
const files = [...new Set(selected.map((m) => m.file))];
const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
const backupDir = path.join(OUT, "backup");
mkdirSync(backupDir, { recursive: true });
const original = Object.fromEntries(files.map((f) => [f, sha(f)]));
for (const f of files) copyFileSync(f, path.join(backupDir, f.replace(/\//g, "__")));
const restore = () => {
  for (const f of files) copyFileSync(path.join(backupDir, f.replace(/\//g, "__")), f);
};
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restore(); process.exit(130); });

function runVitest(label, suite, pattern) {
  const json = path.join(OUT, `${label}.json`);
  const r = spawnSync("npx", ["vitest", "run", suite, "-t", pattern, "--reporter=json", `--outputFile=${json}`], { encoding: "utf8", env: process.env, maxBuffer: 64 * 1024 * 1024 });
  writeFileSync(path.join(OUT, `${label}.log`), `$ npx vitest run ${suite} -t "${pattern}"\nexit ${r.status} signal ${r.signal ?? ""}\n--- stdout\n${r.stdout ?? ""}\n--- stderr\n${r.stderr ?? ""}\n${r.error ? `spawn error: ${r.error.message}\n` : ""}`);
  let report = null;
  try {
    report = existsSync(json) ? JSON.parse(readFileSync(json, "utf8")) : null;
  } catch {
    report = null;
  }
  return { exit: r.status, report };
}

function summarize(report) {
  const tests = (report?.testResults ?? []).flatMap((f) => f.assertionResults ?? []);
  const executed = tests.filter((t) => t.status === "passed" || t.status === "failed");
  const failed = executed.filter((t) => t.status === "failed");
  const suiteErrors = (report?.testResults ?? []).filter((f) => f.status === "failed" && (f.assertionResults ?? []).every((t) => t.status !== "failed")).map((f) => f.message);
  const isAssertion = (t) => t.failureMessages.some((m) => /AssertionError|expected .* (to|not to) /.test(m)) && !t.failureMessages.some((m) => /ECONNREFUSED|database .* does not exist|SyntaxError|Cannot find module|Transform failed|ERR_MODULE_NOT_FOUND/.test(m));
  return { executed: executed.length, passed: executed.length - failed.length, failed, suiteErrors, isAssertion };
}

const results = [];
let infraError = false;
try {
  // 1. Clean baseline for every distinct targeted selection.
  const baselines = new Map();
  for (const m of selected) {
    const key = `${m.suite}::${m.pattern}`;
    if (baselines.has(key)) continue;
    const { exit, report } = runVitest(`baseline-${baselines.size}`, m.suite, m.pattern);
    const s = summarize(report);
    const ok = exit === 0 && report && s.executed > 0 && s.failed.length === 0 && s.suiteErrors.length === 0;
    baselines.set(key, { ok, executed: s.executed, exit });
    console.log(`baseline ${ok ? "clean" : "NOT CLEAN"}: ${m.suite} -t "${m.pattern}" (${s.executed} executed, exit ${exit})`);
  }
  // 2. Mutations.
  for (const m of selected) {
    const base = baselines.get(`${m.suite}::${m.pattern}`);
    restore();
    let classification;
    let detail = "";
    if (!base.ok) {
      classification = "ERROR";
      detail = "baseline not clean";
    } else {
      let text = readFileSync(m.file, "utf8");
      const missing = m.edits.find(([a]) => !text.includes(a));
      if (missing) {
        classification = "ERROR";
        detail = `anchor not found: ${missing[0].slice(0, 80)}`;
      } else {
        for (const [a, b] of m.edits) text = text.replace(a, b);
        writeFileSync(m.file, text);
        const { exit, report } = runVitest(`mutation-${m.name}`, m.suite, m.pattern);
        restore();
        const s = summarize(report);
        const expected = s.failed.filter((t) => m.expect.some((re) => re.test(t.fullName)) && s.isAssertion(t));
        const unexpectedInfra = s.failed.filter((t) => !s.isAssertion(t));
        if (!report || s.executed === 0) {
          classification = "ERROR";
          detail = `no tests executed (runner exit ${exit})`;
        } else if (s.suiteErrors.length || unexpectedInfra.length) {
          classification = "ERROR";
          detail = `non-assertion failure: ${(s.suiteErrors[0] ?? unexpectedInfra[0].failureMessages[0] ?? "").split("\n")[0].slice(0, 160)}`;
        } else if (s.failed.length === 0) {
          classification = "SURVIVED";
          detail = `${s.executed} executed, all passed`;
        } else if (expected.length) {
          classification = "KILLED";
          detail = `${s.failed.length}/${s.executed} failed by assertion: ${expected.map((t) => t.title).slice(0, 3).join(" | ")}`;
        } else {
          classification = "ERROR";
          detail = `failed, but not an expected test: ${s.failed.map((t) => t.title).slice(0, 2).join(" | ")}`;
        }
      }
    }
    const want = m.control ? "SURVIVED" : "KILLED";
    results.push({ name: m.name, control: !!m.control, classification, expectedClassification: want, ok: classification === want, detail });
    console.log(`${classification.padEnd(8)} ${m.name}${m.control ? " (control)" : ""} — ${detail}`);
  }
} catch (e) {
  infraError = true;
  results.push({ name: "harness", classification: "ERROR", ok: false, detail: String(e?.stack ?? e) });
  console.log(`ERROR    harness — ${e?.message ?? e}`);
} finally {
  restore();
}
const restored = files.every((f) => sha(f) === original[f]);
if (!restored) console.log("ERROR    sources were not restored byte-for-byte");
const pass = !infraError && restored && results.length === selected.length && results.every((r) => r.ok);
writeFileSync(path.join(OUT, "results.json"), JSON.stringify({ when: new Date().toISOString(), head: safe(() => execFileSync("git", ["rev-parse", "HEAD"]).toString().trim()), restored, pass, results }, null, 2));
console.log(`${pass ? "PASS" : "FAIL"}: ${results.filter((r) => r.classification === "KILLED").length} killed, ${results.filter((r) => r.classification === "SURVIVED").length} survived, ${results.filter((r) => r.classification === "ERROR").length} error — logs in ${OUT}`);
process.exit(pass ? 0 : 1);

function safe(f) {
  try {
    return f();
  } catch {
    return null;
  }
}
