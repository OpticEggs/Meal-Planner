import { readSnapshot, type Db } from "../db/pool";
import { fdcStatus, nowInstant } from "../env";
import { nutritionSources } from "./nutrition";
import { retailer, retailerSummary } from "../integrations/retailer";
import type { Actor } from "../commands/framework";
import { addDays, dayName, localDate, nextDinnerDate, nightsOf, weekStartOf } from "@/domain/dates";
import { closureStale } from "@/domain/planning/operations";
import { computeCoverage, mealsChosen } from "@/domain/planning/coverage";
import { checkPlan } from "@/domain/planning/constraints";
import { plateNutrition } from "@/domain/recipes/plate";
import { recipePhoto } from "@/domain/recipes/photo";
import { D } from "@/domain/units";
import type { Destination, RequirementLine } from "@/domain/groceries/projection";
import { partialReview } from "@/domain/groceries/partial-handoff";
import { buildShoppingList } from "@/domain/groceries/shopping-list";
import { instacartPreview } from "../groceries/instacart-list";
import { instacartCapabilities } from "../integrations/instacart/config";
import {
  findWeek,
  loadExclusions,
  loadHousehold,
  loadIngredients,
  loadLeftoverObservations,
  loadMembers,
  loadNutrition,
  loadPlanState,
  loadRecipeVersions,
  loadSettings,
} from "./load";

export class IncoherentSnapshot extends Error {}

async function targets(c: Db, householdId: string) {
  const r = await c.query(
    "SELECT t.* FROM member_targets t JOIN members m ON m.id=t.member_id WHERE m.household_id=$1",
    [householdId],
  );
  return r.rows.map((t) => ({ memberId: t.member_id, scope: t.scope, calories: t.calories, proteinG: t.protein_g, carbsG: t.carbs_g, fatG: t.fat_g, revision: t.revision }));
}

/**
 * One coherent household snapshot, read in a single REPEATABLE READ transaction:
 * the accepted plan, the requirement projection derived from exactly that plan,
 * purchasing history and the caller's drafts, all at one household sequence number.
 */
export async function householdSnapshot(actor: Actor, weekStartParam?: string | null) {
  return readSnapshot(async (c) => {
    const h = await loadHousehold(c, actor.householdId);
    const instant = nowInstant();
    const today = localDate(instant, h.timezone);
    const nextDinner = nextDinnerDate(instant, h.timezone);
    const currentWeekStart = weekStartOf(today);
    const weekStart = weekStartParam && /^\d{4}-\d{2}-\d{2}$/.test(weekStartParam) ? weekStartOf(weekStartParam) : currentWeekStart;
    const members = await loadMembers(c, actor.householdId);
    const settings = await loadSettings(c, actor.householdId);
    const exclusions = await loadExclusions(c, actor.householdId);
    const ingredients = await loadIngredients(c, actor.householdId);
    const nutrition = await loadNutrition(c, actor.householdId);
    const week = await findWeek(c, actor.householdId, weekStart);
    const base = {
      seq: h.updateSeq,
      household: { id: h.id, name: h.name, timezone: h.timezone, fixture: h.fixture },
      me: { memberId: actor.memberId, displayName: actor.displayName },
      members,
      clock: { instant: instant.toISOString(), today, nextDinner, currentWeekStart, weekStart, prevWeekStart: addDays(weekStart, -7), nextWeekStart: addDays(weekStart, 7) },
      retailer: retailerSummary(),
      settings,
      // Who last saved household inputs (from the change log), so a conflict can name them (B17).
      settingsUpdatedBy: (
        await c.query(
          `SELECT m.display_name FROM change_events ce JOIN members m ON m.id=ce.actor_member_id
           WHERE ce.household_id=$1 AND ce.command='UpdateSettings' ORDER BY ce.seq DESC LIMIT 1`,
          [actor.householdId],
        )
      ).rows[0]?.display_name ?? null,
      targets: await targets(c, actor.householdId),
      exclusions,
      ingredients: [...ingredients.values()],
      // B7: each ingredient's nutrition source and the server's lookup status (never the key).
      nutritionSources: await nutritionSources(c, actor.householdId),
      nutritionLookup: fdcStatus(),
      staples: (
        await c.query(
          `SELECT s.*, i.name, p.name AS product_name, p.retailer, p.package_qty, p.package_unit, m.display_name AS updated_by_name,
             (SELECT json_build_object('kind', x.kind, 'at', x.at, 'by', mm.display_name) FROM (
                SELECT sc.kind, sc.changed_at AS at, sc.changed_by AS by FROM staple_changes sc WHERE sc.household_id=s.household_id AND sc.ingredient_key=s.ingredient_key
                UNION ALL
                SELECT 'product', d.decided_at, d.decided_by FROM staple_product_decisions d WHERE d.household_id=s.household_id AND d.ingredient_key=s.ingredient_key
              ) x JOIN members mm ON mm.id=x.by ORDER BY x.at DESC LIMIT 1) AS last_change
           FROM household_staples s
           JOIN ingredients i ON i.household_id=s.household_id AND i.key=s.ingredient_key LEFT JOIN products p ON p.id=s.product_id
           LEFT JOIN members m ON m.id=s.updated_by
           WHERE s.household_id=$1 ORDER BY lower(COALESCE(s.display_name, i.name))`,
          [actor.householdId],
        )
      ).rows.map((r) => ({
        ingredientKey: r.ingredient_key,
        // The shortcut's label: the household's display name, else the item's name.
        name: r.display_name ?? r.name, displayName: r.display_name, ingredientName: r.name,
        active: r.active, detailsRevision: r.details_revision,
        usual: r.usual_unit ? { quantity: String(r.usual_amount), unit: r.usual_unit } : { quantity: String(r.usual_packages), unit: "package" },
        usualPackages: r.usual_packages, productId: r.product_id, productName: r.product_name,
        productPackage: r.package_qty ? { quantity: String(r.package_qty), unit: r.package_unit } : null,
        // Unknown (no remembered product) and unavailable (not sold by the active retailer) stay explicit.
        productAvailable: r.product_id ? r.retailer === retailerSummary().mode : null,
        productRevision: r.product_revision, updatedBy: r.updated_by_name, updatedAt: r.updated_at.toISOString(),
        lastChange: r.last_change ?? null,
      })),
      // Every product the household has recorded (for staple management), with store availability.
      products: (
        await c.query("SELECT id, name, ingredient_key, package_qty, package_unit, retailer FROM products WHERE household_id=$1 ORDER BY name", [actor.householdId])
      ).rows.map((p) => ({
        id: p.id, name: p.name, ingredientKey: p.ingredient_key, packageQty: p.package_qty, packageUnit: p.package_unit, available: p.retailer === retailerSummary().mode,
      })),
    };

    const proposalsQ = week
      ? await c.query(
          `SELECT p.*, m.display_name FROM proposals p JOIN members m ON m.id=p.created_by WHERE p.week_id=$1 AND p.status='open' ORDER BY p.created_at DESC LIMIT 3`,
          [week.id],
        )
      : { rows: [] as Record<string, any>[] };
    const proposalVersionIds = proposalsQ.rows.flatMap((p) => (p.content.events as { recipeVersionId: string }[]).map((e) => e.recipeVersionId));

    if (!week || week.acceptedChoiceRevision === 0) {
      const rv = await loadRecipeVersions(c, actor.householdId, proposalVersionIds);
      return {
        ...base,
        week: week ? { id: week.id, weekStart, acceptedChoiceRevision: 0, adopted: false, nights: nightsOf(weekStart).map((n) => ({ night: n, dayName: dayName(n) })) } : null,
        proposals: proposalsQ.rows.map((p) => proposalView(p, rv, 0)),
        previews: [],
        deferred: [],
        // The pickup list exists before (and independently of) an adopted menu.
        groceries: week ? await groceriesFor(c, actor.householdId, week.id, 0) : null,
        recipeVersions: Object.fromEntries([...rv].map(([id, r]) => [id, recipeSummary(r)])),
      };
    }

    const state = await loadPlanState(c, week);
    const prev = await c.query(
      `SELECT pv.* FROM previews pv WHERE pv.week_id=$1 AND pv.created_by=$2 AND pv.status='open' ORDER BY pv.created_at DESC`,
      [week.id, actor.memberId],
    );
    const previewVersionIds = prev.rows.map((p) => p.operation.recipeVersionId).filter(Boolean);
    const recipes = await loadRecipeVersions(c, actor.householdId, [...new Set([...state.events.map((e) => e.recipeVersionId), ...proposalVersionIds, ...previewVersionIds])]);
    const observations = await loadLeftoverObservations(c, week.id, h.timezone);
    const coverage = computeCoverage(state, observations);
    const constraints = checkPlan(state, recipes, exclusions, ingredients);
    const asgMeta = await c.query(
      `SELECT a.id, a.updated_at, m.display_name FROM assignments a LEFT JOIN members m ON m.id=a.updated_by WHERE a.week_id=$1`,
      [week.id],
    );
    const meta = new Map(asgMeta.rows.map((r) => [r.id, { updatedAt: r.updated_at.toISOString(), updatedBy: r.display_name }]));
    // Effective "cooked" record per cooking event (corrected and duplicate records do not count).
    const cookedQ = await c.query(
      `SELECT DISTINCT ON (cr.cooking_event_id) cr.cooking_event_id, cr.id, cr.recorded_at, m.display_name
       FROM cook_records_effective cr JOIN members m ON m.id=cr.recorded_by
       WHERE cr.cooking_event_id = ANY($1::uuid[]) ORDER BY cr.cooking_event_id, cr.generation DESC`,
      [state.events.map((e) => e.id)],
    );
    const cookedBy = new Map(cookedQ.rows.map((r) => [r.cooking_event_id as string, { recordId: r.id as string, by: r.display_name as string, at: (r.recorded_at as Date).toISOString() }]));
    const targetRows = base.targets;

    const nights = nightsOf(weekStart).map((night) => {
      const a = state.assignments.find((x) => x.night === night);
      const ev = a?.cookingEventId ? state.events.find((e) => e.id === a.cookingEventId) : undefined;
      const rv = ev ? recipes.get(ev.recipeVersionId) : undefined;
      const plates = ev
        ? state.allocations
            .filter((al) => al.cookingEventId === ev.id && al.night === night)
            .map((al) => {
              const t = targetRows.find((x) => x.memberId === al.memberId && x.scope === "dinner") ?? null;
              return { memberId: al.memberId, kind: al.kind, componentPortions: al.componentPortions, nutrition: rv ? plateNutrition(rv, al.componentPortions, nutrition) : null, dinnerTarget: t };
            })
        : [];
      const batchAllocs = ev ? state.allocations.filter((al) => al.cookingEventId === ev.id) : [];
      const cookAmounts =
        ev && rv && a?.kind === "cook"
          ? rv.ingredients.map((ing) => {
              const portions = batchAllocs.reduce((s, al) => s.plus(al.componentPortions[ing.componentKey] ?? 0), new D(0));
              return { ingredientKey: ing.ingredientKey, name: ingredients.get(ing.ingredientKey)?.name ?? ing.ingredientKey, componentKey: ing.componentKey, quantity: new D(ing.quantity).mul(portions).toDecimalPlaces(2).toString(), unit: ing.unit };
            })
          : [];
      return {
        night,
        dayName: dayName(night),
        assignmentId: a?.id ?? null,
        kind: a?.kind ?? "open",
        locked: a?.locked ?? false,
        revision: a?.revision ?? 0,
        reason: a?.reason ?? null,
        updatedBy: a ? meta.get(a.id)?.updatedBy ?? null : null,
        updatedAt: a ? meta.get(a.id)?.updatedAt ?? null : null,
        event: ev ? { id: ev.id, revision: ev.revision, cookNight: ev.cookNight, recipeVersionId: ev.recipeVersionId, cooked: cookedBy.get(ev.id) ?? null } : null,
        recipe: rv ? recipeSummary(rv) : null,
        batch: ev ? { plates: batchAllocs.map((al) => ({ memberId: al.memberId, kind: al.kind, night: al.night, componentPortions: al.componentPortions })) } : null,
        cookAmounts,
        plates,
        coverage: coverage.find((x) => x.night === night) ?? { night, status: "uncovered", reason: "No dinner chosen" },
        constraint: constraints.find((x) => x.night === night) ?? { night, status: "ok", reasons: [] },
        observations: ev ? observations.filter((o) => o.cookingEventId === ev.id) : [],
      };
    });
    const deferred = state.events
      .filter((e) => e.status === "deferred")
      .map((e) => ({ id: e.id, revision: e.revision, recipe: recipes.get(e.recipeVersionId) ? recipeSummary(recipes.get(e.recipeVersionId)!) : null }));

    // Drafts: stale status is computed here, from the current accepted state, before Apply.
    const previews = [];
    for (const p of prev.rows) {
      const st = closureStale({ assignments: p.base.assignments, events: p.base.events }, state);
      const changed = st.stale
        ? (
            await c.query(
              `SELECT a.night, a.kind, a.updated_at, m.display_name, v.title FROM assignments a LEFT JOIN members m ON m.id=a.updated_by
               LEFT JOIN cooking_events e ON e.id=a.cooking_event_id LEFT JOIN recipe_versions v ON v.id=e.recipe_version_id
               WHERE a.week_id=$1 AND (a.id = ANY($2::uuid[]) OR a.cooking_event_id = ANY($3::uuid[]))
                 AND a.updated_at >= $4 ORDER BY a.night`,
              [week.id, Object.keys(p.base.assignments), Object.keys(p.base.events), p.created_at],
            )
          ).rows.map((x) => ({ night: x.night, dayName: dayName(x.night), by: x.display_name, now: x.kind === "cook" ? x.title : x.kind === "leftover" ? `Leftovers of ${x.title}` : x.kind }))
        : [];
      previews.push({
        id: p.id,
        operation: p.operation,
        contentHash: p.content_hash,
        consequence: p.consequence,
        createdAt: p.created_at.toISOString(),
        targetNights: state.assignments.filter((a) => a.id in p.base.assignments).map((a) => a.night),
        stale: st.stale,
        staleChanges: changed,
        recipe: p.operation.recipeVersionId && recipes.get(p.operation.recipeVersionId) ? recipeSummary(recipes.get(p.operation.recipeVersionId)!) : null,
      });
    }

    const groceries = await groceriesFor(c, actor.householdId, week.id, week.acceptedChoiceRevision);
    if (!groceries) throw new IncoherentSnapshot("accepted week has no grocery projection");
    const summary = groceries.summary;
    const order = groceries.order;
    const chosen = mealsChosen(coverage, constraints.filter((x) => x.status === "violated").map((x) => x.night));

    return {
      ...base,
      week: {
        id: week.id, weekStart, acceptedChoiceRevision: week.acceptedChoiceRevision, adopted: true, adoptedAt: week.adoptedAt,
        adoptedBy: members.find((m) => m.id === week.adoptedBy)?.displayName ?? null, nights, mealsChosen: chosen,
        statusSentence: statusSentence(nights, chosen, summary, order !== null),
      },
      proposals: proposalsQ.rows.map((p) => proposalView(p, recipes, week.acceptedChoiceRevision)),
      previews,
      deferred,
      groceries,
      recipeVersions: Object.fromEntries([...recipes].map(([id, r]) => [id, recipeSummary(r)])),
    };
  });
}


async function groceriesFor(c: Db, householdId: string, weekId: string, acceptedRevision: number) {
    const cyc = await c.query("SELECT * FROM grocery_cycles WHERE week_id=$1", [weekId]);
    const cycle = cyc.rows[0];
    if (!cycle || (acceptedRevision === 0 && cycle.projection_revision === 0)) return null; // nothing captured yet
    const hhRev = (await c.query("SELECT purchasing_revision FROM households WHERE id=$1", [householdId])).rows[0].purchasing_revision;
    // The stored projection must belong to exactly this accepted revision AND these purchasing inputs.
    if (cycle.projection_accepted_revision !== acceptedRevision || Number(cycle.projection_inputs_revision) !== Number(hhRev)) {
      throw new IncoherentSnapshot(
        `projection (accepted ${cycle.projection_accepted_revision}, inputs ${cycle.projection_inputs_revision}) does not match week ${acceptedRevision} / inputs ${hhRev}`,
      );
    }
    const lines: RequirementLine[] = (await c.query("SELECT line FROM requirement_lines WHERE cycle_id=$1 ORDER BY ingredient_key", [cycle.id])).rows.map((r) => r.line);
    const batches = (
      await c.query(
        `SELECT b.id, b.adapter, b.payload, b.payload_hash, b.authorized_at, b.scope, b.omissions, m.display_name,
           (SELECT json_agg(json_build_object('status', s.status, 'at', s.at, 'evidence', s.evidence) ORDER BY s.id) FROM handoff_status_events s WHERE s.batch_id=b.id) AS history
         FROM handoff_batches b JOIN members m ON m.id=b.authorized_by WHERE b.cycle_id=$1 ORDER BY b.authorized_at`,
        [cycle.id],
      )
    ).rows.map((b) => ({
      id: b.id, adapter: b.adapter, payload: b.payload, payloadHash: b.payload_hash, authorizedAt: b.authorized_at.toISOString(), authorizedBy: b.display_name,
      history: b.history, status: b.history.at(-1).status, scope: b.scope ?? "full", omitted: b.omissions?.omitted ?? [],
    }));
    const orderQ = await c.query(
      `SELECT o.*, m.display_name FROM orders o JOIN members m ON m.id=o.confirmed_by WHERE o.cycle_id=$1 ORDER BY o.confirmed_at DESC LIMIT 1`,
      [cycle.id],
    );
    let order: any = null;
    if (orderQ.rowCount) {
      const o = orderQ.rows[0];
      const ol = await c.query(
        `SELECT ol.*, COALESCE((SELECT json_agg(json_build_object('id', r.id, 'state', r.state, 'packages', r.packages, 'substituteText', r.substitute_text,
             'correctsId', r.corrects_id, 'correctedBy', (SELECT x.id FROM receipt_observations x WHERE x.corrects_id=r.id),
             'validation', (SELECT json_build_object('id', v.id, 'suitable', v.suitable, 'quantity', v.quantity, 'unit', v.unit) FROM substitution_validations v
               WHERE v.receipt_id=r.id ORDER BY v.observed_at DESC, v.id DESC LIMIT 1)) ORDER BY r.observed_at)
           FROM receipt_observations r WHERE r.order_line_id=ol.id), '[]') AS receipts FROM order_lines ol WHERE ol.order_id=$1 ORDER BY ol.name`,
        [o.id],
      );
      order = {
        id: o.id, confirmedBy: o.display_name, confirmedAt: o.confirmed_at.toISOString(), contentsKnown: o.contents_known,
        pickupAt: o.pickup_at?.toISOString() ?? null, note: o.note,
        lines: ol.rows.map((l) => ({ id: l.id, ingredientKey: l.ingredient_key, productId: l.product_id, packageQty: l.package_qty, packageUnit: l.package_unit, name: l.name, packages: l.packages, receipts: l.receipts })),
      };
    }
    const productsQ = await c.query("SELECT id, product_ref, name, ingredient_key, package_qty, package_unit, retailer, fixture FROM products WHERE household_id=$1 ORDER BY name", [householdId]);
    // Where to shop (phase 4–5): the list for any way of shopping, and what an Instacart list would contain.
    const destination: Destination = cycle.destination ?? "retailer_cart";
    const shoppingList = buildShoppingList(lines, destination);
    const setBy = cycle.destination_set_by ? (await c.query("SELECT display_name FROM members WHERE id=$1", [cycle.destination_set_by])).rows[0]?.display_name : null;
    const links = (
      await c.query(
        `SELECT l.id, l.status, l.link_url, l.expires_at, l.requested_at, l.finished_at, l.destination_revision, l.list_fingerprint, l.outcome,
                jsonb_array_length(l.payload->'lines') AS line_count, m.display_name
         FROM instacart_list_links l JOIN members m ON m.id=l.requested_by WHERE l.cycle_id=$1 ORDER BY l.requested_at DESC LIMIT 5`,
        [cycle.id],
      )
    ).rows.map((l) => ({
      id: l.id, status: l.status, url: l.status === "link_prepared" ? l.link_url : null, expiresAt: l.expires_at?.toISOString() ?? null,
      requestedAt: l.requested_at.toISOString(), by: l.display_name, lineCount: l.line_count, current: l.destination_revision === cycle.destination_revision,
      listFingerprint: l.list_fingerprint, outcome: l.outcome,
    }));
    const where = {
      destination, revision: cycle.destination_revision, storeLabel: cycle.destination_store_label, setBy, setAt: cycle.destination_set_at?.toISOString() ?? null,
      instacart: { capabilities: instacartCapabilities().map((x) => ({ capability: x.capability, status: x.status, reason: x.reason })), preview: destination === "instacart_list" ? instacartPreview(shoppingList, cycle.destination_revision) : null, links },
    };
    return {
      cycleId: cycle.id, projectionRevision: cycle.projection_revision, projectionAcceptedRevision: cycle.projection_accepted_revision,
      summary: cycle.projection_summary, lines, batches, order, where, shoppingList,
      // B10: what could be sent on its own now, and what would be left out (server-computed; the client never hashes).
      partial: partialReview({ lines, reviewFingerprint: cycle.projection_summary.reviewFingerprint, budget: cycle.projection_summary.budget }, destination, retailer().mode),
      products: productsQ.rows.map((p) => ({ id: p.id, ref: p.product_ref, name: p.name, ingredientKey: p.ingredient_key, packageQty: p.package_qty, packageUnit: p.package_unit, retailer: p.retailer, fixture: p.fixture })),
    };
}

function recipeSummary(r: import("@/domain/types").RecipeVersion) {
  return {
    id: r.id, recipeId: r.recipeId, versionNo: r.versionNo, title: r.title, cuisine: r.cuisine, summary: r.summary, effortMinutes: r.effortMinutes,
    effortLevel: r.effortLevel, leftoverFriendly: r.leftoverFriendly, instructions: r.instructions, reheatInstructions: r.reheatInstructions,
    provenance: r.provenance, estimate: r.estimate, sourceLabel: r.sourceLabel, components: r.components,
    sourceUrl: r.sourceUrl ?? null, sourceAuthor: r.sourceAuthor ?? null, sourceSiteName: r.sourceSiteName ?? null, imageId: r.imageId ?? null,
    // The recipe's own photo (member) first, else the version's kept source photo, else none.
    memberPhotoId: r.memberPhotoId ?? null, photoRevision: r.photoRevision ?? 0, photo: recipePhoto(r),
  };
}

function proposalView(p: Record<string, any>, recipes: Map<string, import("@/domain/types").RecipeVersion>, currentRevision: number) {
  return {
    id: p.id, contentHash: p.content_hash, content: p.content, explanation: p.explanation, createdBy: p.display_name, createdAt: p.created_at.toISOString(),
    baseAcceptedChoiceRevision: p.base_accepted_choice_revision, stale: p.base_accepted_choice_revision !== currentRevision,
    titles: Object.fromEntries((p.content.nights as { recipeVersionId: string | null }[]).filter((n) => n.recipeVersionId).map((n) => [n.recipeVersionId, recipes.get(n.recipeVersionId!)?.title ?? "?"])),
  };
}

function statusSentence(nights: { coverage: { status: string }; constraint: { status: string }; dayName: string }[], chosen: boolean, summary: any, ordered: boolean): string {
  const parts: string[] = [];
  const uncovered = nights.filter((n) => n.coverage.status === "uncovered").map((n) => n.dayName);
  const unresolved = nights.filter((n) => n.coverage.status === "unresolved").map((n) => n.dayName);
  const violated = nights.filter((n) => n.constraint.status === "violated").map((n) => n.dayName);
  if (chosen) parts.push("Every dinner is covered.");
  if (uncovered.length) parts.push(`${uncovered.join(", ")} ${uncovered.length > 1 ? "have" : "has"} no dinner yet.`);
  if (unresolved.length) parts.push(`${unresolved.join(", ")} ${unresolved.length > 1 ? "are" : "is"} unresolved.`);
  if (violated.length) parts.push(`${violated.join(", ")} conflicts with an exclusion.`);
  if (summary?.ready) parts.push("Groceries are ready to send.");
  else if (ordered) parts.push("Order confirmed; check what is still not sent.");
  else parts.push("Grocery review remains.");
  return parts.join(" ");
}
