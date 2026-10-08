import { computeProjection, type ProjectionInput, type ProjectionResult, type BatchInput } from "@/domain/groceries/projection";
import type { PlanState, RecipeVersion } from "@/domain/types";
import type { Db } from "../db/pool";
import { loadHousehold, loadIngredients, loadPlanState, loadRecipeVersions, loadSettings, weekById } from "../queries/load";
import { localDate } from "@/domain/dates";
import { nowInstant } from "../env";
import { retailer } from "../integrations/retailer";

export async function ensureCycle(c: Db, householdId: string, weekId: string): Promise<string> {
  const r = await c.query(
    `INSERT INTO grocery_cycles(household_id, week_id) VALUES ($1,$2)
     ON CONFLICT (week_id) DO UPDATE SET week_id = EXCLUDED.week_id RETURNING id`,
    [householdId, weekId],
  );
  return r.rows[0].id;
}

export async function batchStatuses(c: Db, cycleId: string): Promise<Map<string, BatchInput["status"]>> {
  const r = await c.query(
    `SELECT DISTINCT ON (s.batch_id) s.batch_id, s.status FROM handoff_status_events s
     JOIN handoff_batches b ON b.id=s.batch_id WHERE b.cycle_id=$1 ORDER BY s.batch_id, s.id DESC`,
    [cycleId],
  );
  return new Map(r.rows.map((x) => [x.batch_id, x.status]));
}

/** Builds the projection input for a week from persisted state. Optionally overrides the
 *  plan state (used by previews to compute the would-be purchasing delta). */
export async function projectionInput(
  c: Db,
  householdId: string,
  weekId: string,
  override?: { state: PlanState; recipes: Map<string, RecipeVersion> },
): Promise<{ input: ProjectionInput; cycleId: string }> {
  const week = await weekById(c, householdId, weekId);
  if (!week) throw new Error("week not found");
  const cycleId = await ensureCycleRead(c, householdId, weekId);
  const state = override?.state ?? (await loadPlanState(c, week));
  const rvIds = [...new Set(state.events.map((e) => e.recipeVersionId))];
  const recipes = override?.recipes ?? (await loadRecipeVersions(c, householdId, rvIds));
  const ingredients = await loadIngredients(c, householdId);
  const settings = await loadSettings(c, householdId);
  const household = await loadHousehold(c, householdId);

  const reqs = cycleId
    ? await c.query(
        `SELECT r.*, COALESCE(json_agg(json_build_object('memberId', rc.member_id, 'name', m.display_name, 'taps', rc.taps) ORDER BY rc.first_at)
           FILTER (WHERE rc.member_id IS NOT NULL), '[]') AS contributors
         FROM household_requests r LEFT JOIN request_contributors rc ON rc.request_id=r.id LEFT JOIN members m ON m.id=rc.member_id
         WHERE r.cycle_id=$1 AND r.state='active' GROUP BY r.id ORDER BY r.created_at`,
        [cycleId],
      )
    : { rows: [] as Record<string, unknown>[] };
  const avail = cycleId
    ? await c.query(
        `SELECT DISTINCT ON (a.ingredient_key) a.*, m.display_name FROM availability_observations a JOIN members m ON m.id=a.member_id
         WHERE a.cycle_id=$1 ORDER BY a.ingredient_key, a.observed_at DESC, a.id DESC`,
        [cycleId],
      )
    : { rows: [] as Record<string, unknown>[] };
  const prods = await c.query(
    `SELECT pm.ingredient_key, p.*, pr.id AS price_id, pr.amount_minor, pr.currency, pr.price_kind, pr.source AS price_source, pr.observed_at AS price_observed_at
     FROM product_mappings pm JOIN products p ON p.id=pm.product_id
     LEFT JOIN LATERAL (SELECT * FROM price_observations po WHERE po.product_id=p.id ORDER BY po.observed_at DESC, po.id DESC LIMIT 1) pr ON true
     WHERE pm.household_id=$1 AND pm.suitable`,
    [householdId],
  );
  const products: ProjectionInput["products"] = new Map(
    prods.rows.map((p) => [
      p.ingredient_key,
      {
        product: {
          id: p.id, ref: p.product_ref, name: p.name, ingredientKey: p.ingredient_key, packageQty: p.package_qty, packageUnit: p.package_unit,
          variableWeight: p.variable_weight, fixture: p.fixture, retailer: p.retailer,
        },
        price: p.price_id
          ? { id: p.price_id, amountMinor: p.amount_minor, currency: p.currency, kind: p.price_kind, source: p.price_source, observedAt: p.price_observed_at.toISOString() }
          : null,
      },
    ]),
  );

  // Products named by request intents (a staple's remembered package), with whether the active
  // retailer sells them. A product from another retailer is unavailable, never swapped.
  const intentIds = [...new Set((reqs.rows as Record<string, unknown>[]).map((r) => r.product_id as string | null).filter((x): x is string => !!x))];
  const intentProducts: NonNullable<ProjectionInput["intentProducts"]> = new Map();
  if (intentIds.length) {
    const ip = await c.query(
      `SELECT p.*, pr.id AS price_id, pr.amount_minor, pr.currency, pr.price_kind, pr.source AS price_source, pr.observed_at AS price_observed_at
       FROM products p LEFT JOIN LATERAL (SELECT * FROM price_observations po WHERE po.product_id=p.id ORDER BY po.observed_at DESC, po.id DESC LIMIT 1) pr ON true
       WHERE p.household_id=$1 AND p.id = ANY($2::uuid[])`,
      [householdId, intentIds],
    );
    const mode = retailer().mode;
    for (const p of ip.rows) {
      intentProducts.set(p.id, {
        product: {
          id: p.id, ref: p.product_ref, name: p.name, ingredientKey: p.ingredient_key, packageQty: p.package_qty, packageUnit: p.package_unit,
          variableWeight: p.variable_weight, fixture: p.fixture, retailer: p.retailer,
        },
        price: p.price_id
          ? { id: p.price_id, amountMinor: p.amount_minor, currency: p.currency, kind: p.price_kind, source: p.price_source, observedAt: p.price_observed_at.toISOString() }
          : null,
        available: p.retailer === mode,
      });
    }
  }

  let batches: BatchInput[] = [];
  let order: ProjectionInput["order"] = null;
  let approvals: ProjectionInput["approvals"] = [];
  if (cycleId) {
    const statuses = await batchStatuses(c, cycleId);
    const bh = await c.query("SELECT id, authorized_at FROM handoff_batches WHERE cycle_id=$1", [cycleId]);
    const bl = await c.query(
      `SELECT l.*, p.package_qty, p.package_unit FROM handoff_batch_lines l JOIN handoff_batches b ON b.id=l.batch_id
       LEFT JOIN products p ON p.id=l.product_id WHERE b.cycle_id=$1`,
      [cycleId],
    );
    batches = [...statuses.entries()].map(([id, status]) => ({
      id, status,
      authorizedAt: bh.rows.find((b) => b.id === id)?.authorized_at.toISOString(),
      lines: bl.rows.filter((l) => l.batch_id === id).map((l) => ({ ingredientKey: l.ingredient_key, packages: l.packages, packageQty: l.package_qty, packageUnit: l.package_unit })),
    }));
    const o = await c.query("SELECT * FROM orders WHERE cycle_id=$1 ORDER BY confirmed_at DESC, id LIMIT 1", [cycleId]);
    if (o.rowCount) {
      const ol = await c.query("SELECT * FROM order_lines WHERE order_id=$1 ORDER BY name", [o.rows[0].id]);
      const rec = await c.query(
        `SELECT r.*, (SELECT row_to_json(v) FROM (SELECT suitable, quantity, unit FROM substitution_validations sv WHERE sv.receipt_id=r.id
           ORDER BY sv.observed_at DESC, sv.id DESC LIMIT 1) v) AS validation
         FROM receipt_observations r JOIN order_lines l ON l.id=r.order_line_id WHERE l.order_id=$1 ORDER BY r.observed_at`,
        [o.rows[0].id],
      );
      order = {
        id: o.rows[0].id, contentsKnown: o.rows[0].contents_known, pickupAt: o.rows[0].pickup_at?.toISOString() ?? null,
        pickupDate: o.rows[0].pickup_at ? localDate(o.rows[0].pickup_at, household.timezone) : null,
        confirmedAt: o.rows[0].confirmed_at.toISOString(),
        reconcilesBatchIds: o.rows[0].reconciles_batch_ids,
        lines: ol.rows.map((l) => ({ id: l.id, ingredientKey: l.ingredient_key, name: l.name, packages: l.packages, productId: l.product_id, packageQty: l.package_qty, packageUnit: l.package_unit })),
        receipts: rec.rows.map((r) => ({
          id: r.id, orderLineId: r.order_line_id, state: r.state, packages: r.packages, correctsId: r.corrects_id, substituteText: r.substitute_text,
          validation: r.validation ? { suitable: r.validation.suitable, quantity: r.validation.quantity === null ? null : String(r.validation.quantity), unit: r.validation.unit } : null,
        })),
      };
    }
    const ap = await c.query("SELECT * FROM purchase_approvals WHERE cycle_id=$1 AND state='active'", [cycleId]);
    approvals = ap.rows.map((a) => ({ id: a.id, ingredientKey: a.ingredient_key, productId: a.product_id, packages: a.packages, lineFingerprint: a.line_fingerprint }));
  }

  const events = state.events.map((event) => ({
    event, recipe: recipes.get(event.recipeVersionId)!, allocations: state.allocations.filter((a) => a.cookingEventId === event.id),
  }));
  return {
    cycleId: cycleId ?? "",
    input: {
      events,
      ingredients,
      requests: (reqs.rows as Record<string, unknown>[]).map((r) => ({
        id: r.id as string, ingredientKey: r.ingredient_key as string | null, text: r.text as string, kind: r.kind as "usual" | "extra",
        packages: r.packages as number | null, contributors: r.contributors as { memberId: string; name: string; taps: number }[],
        productId: (r.product_id as string | null) ?? null,
      })),
      availability: (avail.rows as Record<string, unknown>[]).map((a) => ({
        id: a.id as string, ingredientKey: a.ingredient_key as string, state: a.state as "enough" | "some" | "need", quantity: a.quantity as string | null,
        unit: a.unit as string | null, reviewedDemand: a.reviewed_demand as string | null, reviewedUnit: a.reviewed_unit as string | null, memberName: a.display_name as string,
      })),
      products,
      intentProducts,
      batches,
      order,
      approvals,
      budget: { scope: settings.budgetScope, limitMinor: settings.budgetLimitMinor, firm: settings.budgetFirm, currency: settings.budgetCurrency },
      today: localDate(nowInstant(), household.timezone),
    },
  };
}

async function ensureCycleRead(c: Db, householdId: string, weekId: string): Promise<string | null> {
  const r = await c.query("SELECT id FROM grocery_cycles WHERE household_id=$1 AND week_id=$2", [householdId, weekId]);
  return r.rows[0]?.id ?? null;
}

/**
 * Regenerates the stored requirement projection for a week inside the caller's
 * transaction, and invalidates exactly the approvals whose line changed.
 */
export async function recomputeProjection(c: Db, householdId: string, weekId: string): Promise<ProjectionResult> {
  await ensureCycle(c, householdId, weekId);
  const { input, cycleId } = await projectionInput(c, householdId, weekId);
  const result = computeProjection(input);
  const week = await c.query("SELECT accepted_choice_revision FROM weeks WHERE id=$1", [weekId]);
  const cyc = await c.query(
    `UPDATE grocery_cycles SET projection_revision = projection_revision + 1, projection_accepted_revision=$2,
       projection_summary=$3,
       projection_inputs_revision=(SELECT purchasing_revision FROM households WHERE id=household_id)
     WHERE id=$1 RETURNING projection_revision`,
    [
      cycleId,
      week.rows[0].accepted_choice_revision,
      {
        reviewFingerprint: result.reviewFingerprint, payloadHash: result.payloadHash, payload: result.payload, ready: result.ready,
        readyBlockers: result.readyBlockers, dinnerIngredientCost: result.dinnerIngredientCost, pickupSpending: result.pickupSpending,
        outstandingPurchase: result.outstandingPurchase, budget: result.budget,
      },
    ],
  );
  const rev = cyc.rows[0].projection_revision;
  await c.query("DELETE FROM requirement_lines WHERE cycle_id=$1", [cycleId]);
  for (const l of result.lines) {
    await c.query(
      "INSERT INTO requirement_lines(cycle_id, household_id, ingredient_key, projection_revision, line, line_fingerprint) VALUES ($1,$2,$3,$4,$5,$6)",
      [cycleId, householdId, l.key, rev, l, l.fingerprint],
    );
  }
  // Preserve approvals for unchanged lines; mark changed ones stale (kept for history).
  for (const ap of input.approvals) {
    const line = result.lines.find((l) => l.key === ap.ingredientKey);
    const unchanged = line && line.fingerprint === ap.lineFingerprint && (line.toSend === ap.packages || line.toSend === 0);
    if (!unchanged) {
      await c.query("UPDATE purchase_approvals SET state='stale', state_changed_at=now() WHERE id=$1", [ap.id]);
    }
  }
  return result;
}
