import type { Db } from "../db/pool";
import { Reject, runCommand, type Actor } from "./framework";
import { ensureCycle } from "../groceries/recompute";
import { weekById } from "../queries/load";
import type { RequirementLine } from "@/domain/groceries/projection";
import { KNOWN_UNITS, convert, normalizeUnit } from "@/domain/units";

async function cycleFor(c: Db, householdId: string, weekId: string): Promise<string> {
  const w = await weekById(c, householdId, weekId);
  if (!w) throw new Reject("not_found", "Week not found");
  return ensureCycle(c, householdId, weekId);
}

export async function currentLines(c: Db, cycleId: string): Promise<RequirementLine[]> {
  const r = await c.query("SELECT line FROM requirement_lines WHERE cycle_id=$1 ORDER BY ingredient_key", [cycleId]);
  return r.rows.map((x) => x.line);
}

export interface CapturePayload {
  weekId: string;
  text: string;
  ingredientKey?: string | null;
  kind?: "usual" | "extra";
  packages?: number | null;
  from: "week" | "groceries" | "cook" | "household";
  addAnother?: boolean;
}

/** "Also need": one fast shared capture. A staple tap means the usual amount; repeated
 *  usual taps merge with contributors kept; an explicit extra stays extra. */
export function captureHouseholdNeedCommand(actor: Actor, operationId: string, p: CapturePayload) {
  return runCommand(actor, "CaptureHouseholdNeed", operationId, p, async (c) => {
    const text = String(p.text ?? "").trim().slice(0, 200);
    if (!text) throw new Reject("invalid", "Say what you need");
    if (!["week", "groceries", "cook", "household"].includes(p.from)) throw new Reject("invalid", "Unknown capture point");
    const cycleId = await cycleFor(c, actor.householdId, p.weekId);
    let key = p.ingredientKey ?? null;
    if (key) {
      const ok = await c.query("SELECT 1 FROM ingredients WHERE household_id=$1 AND key=$2", [actor.householdId, key]);
      if (!ok.rowCount) throw new Reject("not_found", "Unknown ingredient");
    } else {
      const m = await c.query("SELECT key FROM ingredients WHERE household_id=$1 AND (lower(name)=lower($2) OR key=lower($2)) LIMIT 1", [actor.householdId, text]);
      key = m.rows[0]?.key ?? null; // unfamiliar entries stay text until review
    }
    let kind = p.kind ?? "usual";
    let packages = p.packages ?? null;
    if (packages !== null && (!Number.isInteger(packages) || packages < 1 || packages > 50)) throw new Reject("invalid", "Packages must be 1-50");

    // After a confirmed order, look for the item in that order before creating a duplicate.
    const order = await c.query(
      `SELECT ol.name, ol.packages FROM orders o JOIN order_lines ol ON ol.order_id=o.id WHERE o.cycle_id=$1 AND ol.ingredient_key=$2`,
      [cycleId, key],
    );
    if (key && order.rowCount && kind === "usual") {
      if (!p.addAnother) {
        throw new Reject("already_in_order", `${order.rows[0].name} is already in your confirmed order (${order.rows[0].packages}). Add another?`, {
          inOrder: order.rows.map((r) => ({ name: r.name, packages: r.packages })),
        });
      }
      kind = "extra";
      packages = packages ?? 1;
    }

    let requestId: string;
    let merged = false;
    if (kind === "usual" && key) {
      const existing = await c.query("SELECT id FROM household_requests WHERE cycle_id=$1 AND ingredient_key=$2 AND kind='usual' AND state='active' LIMIT 1", [cycleId, key]);
      if (existing.rowCount) {
        requestId = existing.rows[0].id;
        merged = true;
      } else {
        const ins = await c.query(
          "INSERT INTO household_requests(household_id, cycle_id, ingredient_key, text, kind, packages, captured_from) VALUES ($1,$2,$3,$4,'usual',$5,$6) RETURNING id",
          [actor.householdId, cycleId, key, text, packages, p.from],
        );
        requestId = ins.rows[0].id;
      }
    } else {
      const ins = await c.query(
        "INSERT INTO household_requests(household_id, cycle_id, ingredient_key, text, kind, packages, captured_from) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
        [actor.householdId, cycleId, key, text, kind, kind === "extra" ? packages ?? 1 : packages, p.from],
      );
      requestId = ins.rows[0].id;
    }
    await c.query(
      `INSERT INTO request_contributors(request_id, member_id) VALUES ($1,$2)
       ON CONFLICT (request_id, member_id) DO UPDATE SET taps = request_contributors.taps + 1`,
      [requestId, actor.memberId],
    );
    return {
      status: "accepted",
      result: { requestId, merged, matchedIngredient: key, kind },
      change: { weekId: p.weekId, summary: { type: "request", text: `${actor.displayName} added ${text}${kind === "extra" ? " (extra)" : ""}` } },
      recomputeWeeks: [p.weekId],
    };
  });
}

export function removeRequestCommand(actor: Actor, operationId: string, p: { requestId: string }) {
  return runCommand(actor, "RemoveRequest", operationId, p, async (c) => {
    const r = await c.query(
      `UPDATE household_requests SET state='removed', resolved_at=now() WHERE id=$1 AND household_id=$2 AND state='active'
       RETURNING (SELECT week_id FROM grocery_cycles g WHERE g.id=cycle_id) AS week_id, text`,
      [p.requestId, actor.householdId],
    );
    if (!r.rowCount) throw new Reject("not_found", "Request not found");
    return {
      status: "accepted", result: {},
      change: { weekId: r.rows[0].week_id, summary: { type: "request", text: `${actor.displayName} removed ${r.rows[0].text}` } },
      recomputeWeeks: [r.rows[0].week_id],
    };
  });
}

export function mapRequestCommand(actor: Actor, operationId: string, p: { requestId: string; ingredientKey: string }) {
  return runCommand(actor, "MapRequest", operationId, p, async (c) => {
    const ok = await c.query("SELECT 1 FROM ingredients WHERE household_id=$1 AND key=$2", [actor.householdId, p.ingredientKey]);
    if (!ok.rowCount) throw new Reject("not_found", "Unknown ingredient");
    const r = await c.query(
      `UPDATE household_requests SET ingredient_key=$3 WHERE id=$1 AND household_id=$2 AND state='active' AND ingredient_key IS NULL
       RETURNING (SELECT week_id FROM grocery_cycles g WHERE g.id=cycle_id) AS week_id`,
      [p.requestId, actor.householdId, p.ingredientKey],
    );
    if (!r.rowCount) throw new Reject("not_found", "Unmatched request not found");
    return { status: "accepted", result: {}, change: { weekId: r.rows[0].week_id, summary: { type: "request", text: `${actor.displayName} matched a request` } }, recomputeWeeks: [r.rows[0].week_id] };
  });
}

export function recordAvailabilityCommand(
  actor: Actor,
  operationId: string,
  p: {
    weekId: string;
    ingredientKey: string;
    state: "enough" | "some" | "need";
    quantity?: string | null;
    unit?: string | null;
    /** What the observer was shown: the demand they are vouching for. Required for "enough". */
    reviewed?: { quantity: string; unit: string; fingerprint?: string } | null;
  },
) {
  return runCommand(actor, "RecordAvailability", operationId, p, async (c) => {
    if (!["enough", "some", "need"].includes(p.state)) throw new Reject("invalid", "Unknown availability");
    if (p.quantity != null && !/^\d+(\.\d+)?$/.test(String(p.quantity))) throw new Reject("invalid", "Quantity must be a number");
    const cycleId = await cycleFor(c, actor.householdId, p.weekId);
    const line = (await currentLines(c, cycleId)).find((l) => l.key === p.ingredientKey);
    if (!line) throw new Reject("not_found", "That item is not on this week's list");
    let reviewedDemand: string | null = null;
    let reviewedUnit: string | null = null;
    if (p.reviewed) {
      if (!/^\d+(\.\d+)?$/.test(String(p.reviewed.quantity)) || !p.reviewed.unit) throw new Reject("invalid", "Reviewed amount must be a number with a unit");
      reviewedDemand = String(p.reviewed.quantity);
      reviewedUnit = normalizeUnit(p.reviewed.unit);
      if (line.meal && convert(reviewedDemand, reviewedUnit, line.meal.unit) === null) {
        throw new Reject("stale_review", `${line.name} is now measured in ${line.meal.unit}; review it again.`);
      }
    } else if (p.state === "enough") {
      // "Have enough" vouches for a specific amount. Never substitute the server's current
      // demand for what the observer actually saw.
      throw new Reject("invalid", "Have enough needs the amount you reviewed");
    }
    await c.query(
      `INSERT INTO availability_observations(household_id, cycle_id, ingredient_key, state, quantity, unit, reviewed_demand, reviewed_unit, member_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [actor.householdId, cycleId, p.ingredientKey, p.state, p.quantity ?? null, p.unit ? normalizeUnit(p.unit) : null, reviewedDemand, reviewedUnit, actor.memberId],
    );
    const label = { enough: "Have enough", some: "Have some", need: "Need" }[p.state];
    const changedSince = !!(p.reviewed?.fingerprint && p.reviewed.fingerprint !== line.fingerprint);
    return {
      status: "accepted", result: { boundTo: reviewedDemand ? { quantity: reviewedDemand, unit: reviewedUnit } : null, changedSinceReview: changedSince },
      change: { weekId: p.weekId, summary: { type: "availability", text: `${actor.displayName}: ${line.name} — ${label}` } },
      recomputeWeeks: [p.weekId],
    };
  });
}

export function addProductCommand(
  actor: Actor,
  operationId: string,
  p: { weekId: string; ingredientKey: string; name: string; packageQty: string | null; packageUnit: string | null; variableWeight?: boolean; priceMinor?: number | null },
) {
  return runCommand(actor, "AddProduct", operationId, p, async (c) => {
    const ok = await c.query("SELECT 1 FROM ingredients WHERE household_id=$1 AND key=$2", [actor.householdId, p.ingredientKey]);
    if (!ok.rowCount) throw new Reject("not_found", "Unknown ingredient");
    const name = String(p.name ?? "").trim().slice(0, 120);
    if (!name) throw new Reject("invalid", "Product name required");
    if (p.packageQty != null && !/^\d+(\.\d+)?$/.test(String(p.packageQty))) throw new Reject("invalid", "Package size must be a number");
    const unit = p.packageUnit ? normalizeUnit(p.packageUnit) : null;
    if (p.priceMinor != null && (!Number.isInteger(p.priceMinor) || p.priceMinor < 0)) throw new Reject("invalid", "Price must be whole cents");
    const ins = await c.query(
      `INSERT INTO products(household_id, retailer, product_ref, name, ingredient_key, package_qty, package_unit, variable_weight)
       VALUES ($1,'simulated',$2,$3,$4,$5,$6,$7) RETURNING id`,
      [actor.householdId, `manual:${operationId}`, name, p.ingredientKey, p.packageQty ?? null, unit, !!p.variableWeight],
    );
    const productId = ins.rows[0].id;
    if (p.priceMinor != null) {
      await c.query("INSERT INTO price_observations(household_id, product_id, amount_minor, source, store_label) VALUES ($1,$2,$3,'manual',NULL)", [
        actor.householdId, productId, p.priceMinor,
      ]);
    }
    await c.query(
      `INSERT INTO product_mappings(household_id, ingredient_key, product_id, decided_by) VALUES ($1,$2,$3,$4)
       ON CONFLICT (household_id, ingredient_key) DO UPDATE SET product_id=EXCLUDED.product_id, decided_by=EXCLUDED.decided_by, decided_at=now(), suitable=true`,
      [actor.householdId, p.ingredientKey, productId, actor.memberId],
    );
    return {
      status: "accepted", result: { productId, unitKnown: unit ? KNOWN_UNITS.includes(unit) : null },
      change: { weekId: p.weekId, summary: { type: "product", text: `${actor.displayName} chose ${name}` } },
      recomputeWeeks: [p.weekId],
    };
  });
}

export function chooseProductCommand(actor: Actor, operationId: string, p: { weekId: string; ingredientKey: string; productId: string }) {
  return runCommand(actor, "ChooseProduct", operationId, p, async (c) => {
    const pr = await c.query("SELECT name FROM products WHERE id=$1 AND household_id=$2 AND ingredient_key=$3", [p.productId, actor.householdId, p.ingredientKey]);
    if (!pr.rowCount) throw new Reject("not_found", "Product not found for that ingredient");
    await c.query(
      `INSERT INTO product_mappings(household_id, ingredient_key, product_id, decided_by) VALUES ($1,$2,$3,$4)
       ON CONFLICT (household_id, ingredient_key) DO UPDATE SET product_id=EXCLUDED.product_id, decided_by=EXCLUDED.decided_by, decided_at=now(), suitable=true`,
      [actor.householdId, p.ingredientKey, p.productId, actor.memberId],
    );
    return { status: "accepted", result: {}, change: { weekId: p.weekId, summary: { type: "product", text: `${actor.displayName} chose ${pr.rows[0].name}` } }, recomputeWeeks: [p.weekId] };
  });
}

export function recordPriceCommand(actor: Actor, operationId: string, p: { weekId: string; productId: string; amountMinor: number }) {
  return runCommand(actor, "RecordPrice", operationId, p, async (c) => {
    if (!Number.isInteger(p.amountMinor) || p.amountMinor < 0) throw new Reject("invalid", "Price must be whole cents");
    const pr = await c.query("SELECT name FROM products WHERE id=$1 AND household_id=$2", [p.productId, actor.householdId]);
    if (!pr.rowCount) throw new Reject("not_found", "Product not found");
    await c.query("INSERT INTO price_observations(household_id, product_id, amount_minor, source) VALUES ($1,$2,$3,'manual')", [actor.householdId, p.productId, p.amountMinor]);
    return { status: "accepted", result: {}, change: { weekId: p.weekId, summary: { type: "price", text: `${actor.displayName} entered a price for ${pr.rows[0].name}` } }, recomputeWeeks: [p.weekId] };
  });
}

/** Approves exact purchase quantities for specific line fingerprints. Any mismatch with the
 *  current projection rejects the whole approval: the reviewer saw something else. */
export function approvePurchaseLinesCommand(actor: Actor, operationId: string, p: { weekId: string; lines: { key: string; fingerprint: string; packages: number }[] }) {
  return runCommand(actor, "ApprovePurchaseLines", operationId, p, async (c) => {
    if (!Array.isArray(p.lines) || p.lines.length === 0) throw new Reject("invalid", "Nothing to approve");
    const cycleId = await cycleFor(c, actor.householdId, p.weekId);
    const lines = await currentLines(c, cycleId);
    const stale: string[] = [];
    for (const a of p.lines) {
      const l = lines.find((x) => x.key === a.key);
      if (!l || l.fingerprint !== a.fingerprint || l.toSend !== a.packages || !l.product) stale.push(l?.name ?? a.key);
    }
    if (stale.length) throw new Reject("stale_review", `These lines changed since you reviewed them: ${stale.join(", ")}. Nothing was approved.`, { stale });
    for (const a of p.lines) {
      const l = lines.find((x) => x.key === a.key)!;
      if (a.packages === 0) continue;
      await c.query("UPDATE purchase_approvals SET state='revoked', state_changed_at=now() WHERE cycle_id=$1 AND ingredient_key=$2 AND state='active'", [cycleId, a.key]);
      await c.query(
        "INSERT INTO purchase_approvals(household_id, cycle_id, ingredient_key, product_id, packages, line_fingerprint, approved_by) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [actor.householdId, cycleId, a.key, l.product!.id, a.packages, a.fingerprint, actor.memberId],
      );
    }
    return {
      status: "accepted", result: { approved: p.lines.length },
      change: { weekId: p.weekId, summary: { type: "approval", text: `${actor.displayName} approved ${p.lines.length} item(s)` } },
      recomputeWeeks: [p.weekId],
    };
  });
}

export function confirmOrderCommand(
  actor: Actor,
  operationId: string,
  p: {
    weekId: string;
    contentsKnown: boolean;
    lines?: { ingredientKey: string | null; productId?: string | null; name: string; packages: number }[];
    pickupAt?: string | null;
    note?: string;
  },
) {
  return runCommand(actor, "ConfirmOrder", operationId, p, async (c) => {
    const cycleId = await cycleFor(c, actor.householdId, p.weekId);
    const existing = await c.query("SELECT 1 FROM orders WHERE cycle_id=$1", [cycleId]);
    if (existing.rowCount) throw new Reject("already_confirmed", "An order is already confirmed for this pickup. Record corrections as receipt observations.");
    const lines = p.contentsKnown ? p.lines ?? [] : [];
    if (p.contentsKnown && lines.length === 0) throw new Reject("invalid", "List the confirmed contents, or confirm with contents unknown");
    for (const l of lines) if (!Number.isInteger(l.packages) || l.packages < 1 || !String(l.name ?? "").trim()) throw new Reject("invalid", "Each line needs a name and whole packages");
    const pickup = p.pickupAt ? new Date(p.pickupAt) : null;
    if (pickup && Number.isNaN(pickup.getTime())) throw new Reject("invalid", "Pickup time is not a valid time");
    // Listed contents reconcile every transfer made so far for this pickup; with contents
    // unknown, nothing is reconciled and those transfers stay accounted (and flagged).
    const reconciles = p.contentsKnown
      ? (await c.query("SELECT id FROM handoff_batches WHERE cycle_id=$1 ORDER BY authorized_at", [cycleId])).rows.map((r) => r.id)
      : [];
    const o = await c.query(
      `INSERT INTO orders(household_id, cycle_id, confirmed_by, source, contents_known, pickup_at, note, reconciles_batch_ids, confirmed_at)
       VALUES ($1,$2,$3,'member',$4,$5,$6,$7, clock_timestamp()) RETURNING id`,
      [actor.householdId, cycleId, actor.memberId, p.contentsKnown, pickup, p.note ?? null, reconciles],
    );
    for (const l of lines) {
      // The confirmed product identity is what the member states (usually from the transfer);
      // it is never inferred from today's mapping. Unknown product = unknown package basis.
      let prod: { id: string; package_qty: string | null; package_unit: string | null } | null = null;
      if (l.productId) {
        const r = await c.query("SELECT id, package_qty, package_unit, ingredient_key FROM products WHERE id=$1 AND household_id=$2", [l.productId, actor.householdId]);
        if (!r.rowCount) throw new Reject("not_found", `Unknown product for ${l.name}`);
        if (l.ingredientKey && r.rows[0].ingredient_key !== l.ingredientKey) throw new Reject("invalid", `${l.name}: product is for a different ingredient`);
        prod = r.rows[0];
      }
      await c.query(
        "INSERT INTO order_lines(order_id, household_id, ingredient_key, product_id, name, packages, package_qty, package_unit) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
        [o.rows[0].id, actor.householdId, l.ingredientKey, prod?.id ?? null, l.name.trim(), l.packages, prod?.package_qty ?? null, prod?.package_unit ?? null],
      );
    }
    return {
      status: "accepted", result: { orderId: o.rows[0].id, reconciledTransfers: reconciles.length },
      change: { weekId: p.weekId, summary: { type: "order", text: `${actor.displayName} confirmed the order${p.contentsKnown ? "" : " (contents not listed)"}` } },
      recomputeWeeks: [p.weekId],
    };
  });
}

export function recordReceiptCommand(
  actor: Actor,
  operationId: string,
  p: { orderLineId: string; state: "received" | "missing" | "substituted"; packages: number; substituteText?: string; correctsReceiptId?: string | null },
) {
  return runCommand(actor, "RecordReceipt", operationId, p, async (c) => {
    if (!["received", "missing", "substituted"].includes(p.state)) throw new Reject("invalid", "Unknown receipt state");
    if (p.state === "substituted" && !String(p.substituteText ?? "").trim()) throw new Reject("invalid", "Say what arrived instead");
    const l = await c.query(
      `SELECT ol.*, g.week_id FROM order_lines ol JOIN orders o ON o.id=ol.order_id JOIN grocery_cycles g ON g.id=o.cycle_id WHERE ol.id=$1 AND ol.household_id=$2`,
      [p.orderLineId, actor.householdId],
    );
    if (!l.rowCount) throw new Reject("not_found", "Order line not found");
    if (p.correctsReceiptId) {
      const prev = await c.query("SELECT 1 FROM receipt_observations WHERE id=$1 AND order_line_id=$2", [p.correctsReceiptId, p.orderLineId]);
      if (!prev.rowCount) throw new Reject("not_found", "The observation being corrected is not on this order line");
      const done = await c.query("SELECT 1 FROM receipt_observations WHERE corrects_id=$1", [p.correctsReceiptId]);
      if (done.rowCount) throw new Reject("stale_target", "That observation was already corrected. Review the current receipt.");
    }
    // Effective observations exclude any that a later observation corrects (history is kept).
    const prior = await c.query(
      `SELECT COALESCE(sum(packages),0)::int AS n FROM receipt_observations r WHERE order_line_id=$1
         AND NOT EXISTS (SELECT 1 FROM receipt_observations x WHERE x.corrects_id=r.id) AND r.id IS DISTINCT FROM $2`,
      [p.orderLineId, p.correctsReceiptId ?? null],
    );
    if (!Number.isInteger(p.packages) || p.packages < 1 || prior.rows[0].n + p.packages > l.rows[0].packages) {
      throw new Reject("invalid", "More packages than the order line holds");
    }
    const ins = await c.query(
      "INSERT INTO receipt_observations(household_id, order_line_id, state, packages, substitute_text, member_id, corrects_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
      [actor.householdId, p.orderLineId, p.state, p.packages, p.substituteText ?? null, actor.memberId, p.correctsReceiptId ?? null],
    );
    return {
      status: "accepted", result: { receiptId: ins.rows[0].id },
      change: { weekId: l.rows[0].week_id, summary: { type: "receipt", text: `${actor.displayName}: ${l.rows[0].name} ${p.state}${p.correctsReceiptId ? " (correction)" : ""}` } },
      recomputeWeeks: [l.rows[0].week_id],
    };
  });
}

/** Judges a substitution: unsuitable leaves the original need actionable; suitable covers only
 *  the stated physical amount. Recorded as a new immutable observation. */
export function validateSubstitutionCommand(
  actor: Actor,
  operationId: string,
  p: { receiptId: string; suitable: boolean; quantity?: string | null; unit?: string | null },
) {
  return runCommand(actor, "ValidateSubstitution", operationId, p, async (c) => {
    const r = await c.query(
      `SELECT r.state, ol.name, g.week_id FROM receipt_observations r JOIN order_lines ol ON ol.id=r.order_line_id JOIN orders o ON o.id=ol.order_id
       JOIN grocery_cycles g ON g.id=o.cycle_id WHERE r.id=$1 AND r.household_id=$2`,
      [p.receiptId, actor.householdId],
    );
    if (!r.rowCount) throw new Reject("not_found", "Receipt observation not found");
    if (r.rows[0].state !== "substituted") throw new Reject("invalid", "Only a substitution can be validated");
    if (p.suitable) {
      if (!/^\d+(\.\d+)?$/.test(String(p.quantity ?? "")) || Number(p.quantity) <= 0 || !p.unit) throw new Reject("invalid", "Say how much of the substitute arrived (amount and unit)");
    }
    await c.query("INSERT INTO substitution_validations(household_id, receipt_id, suitable, quantity, unit, member_id) VALUES ($1,$2,$3,$4,$5,$6)", [
      actor.householdId, p.receiptId, !!p.suitable, p.suitable ? p.quantity : null, p.suitable ? normalizeUnit(String(p.unit)) : null, actor.memberId,
    ]);
    return {
      status: "accepted", result: {},
      change: { weekId: r.rows[0].week_id, summary: { type: "receipt", text: `${actor.displayName}: substitute for ${r.rows[0].name} ${p.suitable ? "works" : "does not work"}` } },
      recomputeWeeks: [r.rows[0].week_id],
    };
  });
}
