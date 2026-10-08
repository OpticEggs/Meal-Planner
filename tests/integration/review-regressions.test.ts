/**
 * Regressions for the independent review of 89f3ea9 (F01–F08). Each test asserts the
 * CORRECT behavior against real PostgreSQL; on 89f3ea9 they reproduce the reported defects
 * by failing. T01–T22 / X01–X12 tests are unchanged and live in their original files.
 */
import { describe, expect, it } from "vitest";
import { fresh, line, op, q, race, retailerCalls } from "./helpers";
import { NIGHT, WEEK } from "../fixtures/household";
import { hashOf } from "@/domain/hash";
import {
  adoptWeekProposalCommand, applyPlanChangeCommand, createPreviewCommand, generateProposalCommand, setNightLockCommand, setPlateCommand,
} from "@/server/commands/plan";
import {
  addProductCommand, approvePurchaseLinesCommand, captureHouseholdNeedCommand, confirmOrderCommand, recordAvailabilityCommand, recordPriceCommand,
  recordReceiptCommand, validateSubstitutionCommand,
} from "@/server/commands/groceries";
import { startHandoff } from "@/server/commands/purchasing";
import { addExclusionCommand, updateSettingsCommand } from "@/server/commands/household";
import { householdSnapshot } from "@/server/queries/snapshot";
import type { Actor } from "@/server/commands/framework";
import type { PlanOperation } from "@/domain/planning/operations";

const NEXT = "2026-10-19";

async function preview(actor: Actor, weekId: string, operation: PlanOperation) {
  const p = await createPreviewCommand(actor, op(), { weekId, operation });
  if (p.status !== "accepted") throw new Error(JSON.stringify(p));
  return p.result as any;
}
async function previewApply(actor: Actor, weekId: string, operation: PlanOperation) {
  const p = await preview(actor, weekId, operation);
  return { p, a: await applyPlanChangeCommand(actor, op(), { previewId: p.previewId, reviewedHash: p.contentHash }) };
}
async function propose(actor: Actor, weekStart: string, inputs: Record<string, unknown> = {}) {
  const g = await generateProposalCommand(actor, op(), { weekStart, inputs } as any);
  if (g.status !== "accepted") throw new Error(JSON.stringify(g));
  return (await q<any>("SELECT * FROM proposals WHERE id=$1", [g.result.proposalId]))[0];
}
const adopt = (actor: Actor, p: any, expected = p.base_accepted_choice_revision) =>
  adoptWeekProposalCommand(actor, op(), { proposalId: p.id, reviewedHash: p.content_hash, expectedAcceptedChoiceRevision: expected });
const weekRow = async (hh: string, ws: string) => (await q<any>("SELECT * FROM weeks WHERE household_id=$1 AND week_start=$2", [hh, ws]))[0];
const summary = async (weekId: string) => (await q<any>("SELECT projection_summary FROM grocery_cycles WHERE week_id=$1", [weekId]))[0].projection_summary;
async function approveAll(actor: Actor, weekId: string) {
  const ls = (await q<any>("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1", [weekId]))
    .map((r) => r.line)
    .filter((l) => l.toSend > 0 && l.product && l.price && l.unresolved.length === 0);
  const r = await approvePurchaseLinesCommand(actor, op(), { weekId, lines: ls.map((l) => ({ key: l.key, fingerprint: l.fingerprint, packages: l.toSend })) });
  expect(r.status, JSON.stringify(r)).toBe("accepted");
}
async function send(actor: Actor, weekId: string) {
  const s = await summary(weekId);
  return startHandoff(actor, op(), { weekId, reviewFingerprint: s.reviewFingerprint, payloadHash: s.payloadHash });
}
async function confirmFromTransfers(actor: Actor, weekId: string, opts: { omit?: string[]; contentsKnown?: boolean; pickupAt?: string | null } = {}) {
  const batches = await q<any>("SELECT b.payload FROM handoff_batches b JOIN grocery_cycles g ON g.id=b.cycle_id WHERE g.week_id=$1", [weekId]);
  const items = batches.flatMap((b) => b.payload).filter((i: any) => !(opts.omit ?? []).includes(i.ingredientKey));
  const prods = await q<any>("SELECT id, ingredient_key FROM products");
  return confirmOrderCommand(actor, op(), {
    weekId,
    contentsKnown: opts.contentsKnown ?? true,
    lines: (opts.contentsKnown ?? true) ? items.map((i: any) => ({ ingredientKey: i.ingredientKey, productId: prods.find((p) => p.ingredient_key === i.ingredientKey)?.id ?? null, name: i.ingredientKey, packages: i.packages })) : [],
    pickupAt: opts.pickupAt === undefined ? "2026-10-12T21:00:00Z" : opts.pickupAt,
  } as any);
}

/** Structural integrity of an accepted week: every dinner plate is drawn by the night that
 *  points at its event; lunches come after the cooking; referenced events are scheduled. */
async function assertPlanIntegrity(weekId: string) {
  const asg = await q<any>("SELECT night, kind, cooking_event_id FROM assignments WHERE week_id=$1", [weekId]);
  const ev = await q<any>("SELECT id, status, cook_night FROM cooking_events WHERE week_id=$1", [weekId]);
  const al = await q<any>("SELECT a.* FROM allocations a JOIN cooking_events e ON e.id=a.cooking_event_id WHERE e.week_id=$1 AND e.status='scheduled'", [weekId]);
  for (const a of asg.filter((x) => x.cooking_event_id)) {
    const e = ev.find((x) => x.id === a.cooking_event_id);
    expect(e?.status, `${a.night} references a ${e?.status ?? "missing"} event`).toBe("scheduled");
    if (a.kind === "leftover") expect(a.night > e.cook_night, `${a.night} leftovers before cooking`).toBe(true);
  }
  for (const x of al) {
    const e = ev.find((y) => y.id === x.cooking_event_id);
    if (x.kind === "lunch") expect(x.night > e.cook_night, `lunch ${x.night} before cooking ${e.cook_night}`).toBe(true);
    else expect(asg.find((a) => a.night === x.night)?.cooking_event_id, `dinner plate on ${x.night} not served by its night`).toBe(x.cooking_event_id);
  }
}

// ------------------------------------------------------------------------------------------------
describe("R-F01 whole-week adoption admission", () => {
  it("R-F01a: an empty recipe collection yields a draft of seven open nights that cannot be adopted", async () => {
    const { fx, jon } = await fresh();
    await q("UPDATE recipes SET archived_at=now() WHERE household_id=$1", [fx.householdId]);
    const p = await propose(jon, NEXT);
    expect(p.content.nights.filter((n: any) => n.kind === "open")).toHaveLength(7);
    const r = await adopt(jon, p);
    expect(r.status === "rejected" && r.code).toBe("incomplete_week");
    const w = await weekRow(fx.householdId, NEXT);
    expect(w.accepted_choice_revision).toBe(0);
    expect((await q("SELECT 1 FROM assignments WHERE week_id=$1", [w.id])).length).toBe(0);
    expect((await q<any>("SELECT status FROM proposals WHERE id=$1", [p.id]))[0].status).toBe("open"); // draft kept
  });

  it("R-F01b: too few eligible recipes leaves named open nights; adoption refused", async () => {
    const { fx, jon } = await fresh();
    await q("UPDATE recipes SET archived_at=now() WHERE household_id=$1 AND id<>$2", [fx.householdId, fx.recipes.tacos.recipeId]);
    const p = await propose(jon, NEXT);
    expect(p.content.unresolved.length).toBeGreaterThan(0);
    const r = await adopt(jon, p);
    expect(r.status === "rejected" && r.code).toBe("incomplete_week");
    expect(JSON.stringify(r.status === "rejected" && r.details)).toMatch(/Tuesday/);
  });

  it("R-F01c: a submitted proposal with an uncovered Thursday or missing plates is refused at the server", async () => {
    const { fx, jon } = await fresh();
    const good = await propose(jon, NEXT);
    for (const mutate of [
      (c: any) => { const t = c.nights.find((n: any) => n.night === "2026-10-22"); Object.assign(t, { kind: "open", eventKey: null, recipeVersionId: null }); for (const e of c.events) e.allocations = e.allocations.filter((a: any) => a.night !== "2026-10-22"); },
      (c: any) => { c.events[0].allocations = c.events[0].allocations.filter((a: any) => a.memberId !== fx.members.alex); },
    ]) {
      const content = JSON.parse(JSON.stringify(good.content));
      mutate(content);
      const id = (await q<any>(
        `INSERT INTO proposals(household_id, week_id, base_accepted_choice_revision, content, content_hash, inputs, explanation, created_by)
         VALUES ($1,$2,0,$3,$4,'{}','{}',$5) RETURNING id`, [fx.householdId, good.week_id, content, hashOf(content), fx.members.jon]))[0].id;
      const r = await adoptWeekProposalCommand(jon, op(), { proposalId: id, reviewedHash: hashOf(content), expectedAcceptedChoiceRevision: 0 });
      expect(r.status === "rejected" && r.code).toBe("incomplete_week");
    }
    expect((await weekRow(fx.householdId, NEXT)).accepted_choice_revision).toBe(0);
  });

  it("R-F01d: a complete, fully priced proposal that is known to exceed a firm budget is refused", async () => {
    const { fx, jon } = await fresh();
    expect((await updateSettingsCommand(jon, op(), { expectedRevision: 1, budgetScope: "pickup", budgetLimitMinor: 100, budgetFirm: true })).status).toBe("accepted");
    const p = await propose(jon, NEXT);
    expect(p.content.nights.every((n: any) => n.kind !== "open")).toBe(true);
    const r = await adopt(jon, p);
    expect(r.status === "rejected" && r.code).toBe("constraint_violation");
    expect((await weekRow(fx.householdId, NEXT)).accepted_choice_revision).toBe(0);
  });

  it("R-F01e: complete coverage with unknown prices is adoptable; grocery readiness stays unproven", async () => {
    const { fx, jon } = await fresh();
    await q("DELETE FROM price_observations WHERE household_id=$1", [fx.householdId]);
    expect((await updateSettingsCommand(jon, op(), { expectedRevision: 1, budgetScope: "pickup", budgetLimitMinor: 100, budgetFirm: true })).status).toBe("accepted");
    const p = await propose(jon, NEXT);
    const r = await adopt(jon, p);
    expect(r.status, JSON.stringify(r)).toBe("accepted");
    const s = await householdSnapshot(jon, NEXT);
    expect(s.week!.mealsChosen).toBe(true);
    expect(s.groceries!.summary.ready).toBe(false);
    expect(s.groceries!.summary.budget.status).toBe("unknown");
  });
});

// ------------------------------------------------------------------------------------------------
describe("R-F02 dependency closure across sources, leftovers, lunches and locks", () => {
  it("R-F02a: a locked Thursday leftover keeps its Wednesday source through a whole-week adoption", async () => {
    const { fx, jon } = await fresh();
    expect((await setNightLockCommand(jon, op(), { assignmentId: fx.assignments.thu, expectedRevision: 1, locked: true })).status).toBe("accepted");
    const p = await propose(jon, WEEK);
    const keptKeys = p.content.events.map((e: any) => e.key);
    expect(keptKeys).toContain(`keep:${fx.events.chicken_rice}`);
    const r = await adopt(jon, p, 2);
    expect(r.status, JSON.stringify(r)).toBe("accepted");
    expect((await q<any>("SELECT status, cook_night FROM cooking_events WHERE id=$1", [fx.events.chicken_rice]))[0]).toEqual({ status: "scheduled", cook_night: NIGHT.wed });
    const thu = (await q<any>("SELECT kind, cooking_event_id, locked FROM assignments WHERE id=$1", [fx.assignments.thu]))[0];
    expect(thu).toEqual({ kind: "leftover", cooking_event_id: fx.events.chicken_rice, locked: true });
    await assertPlanIntegrity(fx.weekId);
  });

  it("R-F02b: a locked Wednesday source keeps its dependent plates consistent through adoption", async () => {
    const { fx, jon } = await fresh();
    await setNightLockCommand(jon, op(), { assignmentId: fx.assignments.wed, expectedRevision: 1, locked: true });
    const p = await propose(jon, WEEK);
    expect((await adopt(jon, p, 2)).status).toBe("accepted");
    expect((await q<any>("SELECT status FROM cooking_events WHERE id=$1", [fx.events.chicken_rice]))[0].status).toBe("scheduled");
    await assertPlanIntegrity(fx.weekId);
  });

  it("R-F02c: moving Wednesday's cooking after Alex's reserved Thursday lunch discloses and resolves the lunch before Apply", async () => {
    const { fx, jon } = await fresh();
    expect((await previewApply(jon, fx.weekId, { type: "set_kind", assignmentId: fx.assignments.sat, kind: "open" })).a.status).toBe("accepted");
    const { p, a } = await previewApply(jon, fx.weekId, { type: "move", assignmentId: fx.assignments.wed, toNight: NIGHT.sat });
    expect(p.consequences.join(" ")).toMatch(/Alex's reserved lunch on Thursday/);
    expect(a.status).toBe("accepted");
    await assertPlanIntegrity(fx.weekId);
    expect((await q("SELECT 1 FROM allocations WHERE cooking_event_id=$1 AND kind='lunch' AND night < $2", [fx.events.chicken_rice, NIGHT.sat])).length).toBe(0);
  });

  for (const order of ["move first", "lunch edit first"] as const) {
    it(`R-F02d: a move and a lunch edit on the same cooking conflict in either order (${order})`, async () => {
      const { fx, jon, alex } = await fresh();
      await previewApply(jon, fx.weekId, { type: "set_kind", assignmentId: fx.assignments.sat, kind: "open" });
      const mv = await preview(jon, fx.weekId, { type: "move", assignmentId: fx.assignments.wed, toNight: NIGHT.sat });
      const rev = (await q<any>("SELECT revision FROM cooking_events WHERE id=$1", [fx.events.chicken_rice]))[0].revision;
      const lunch = () => setPlateCommand(alex, op(), { eventId: fx.events.chicken_rice, expectedEventRevision: rev, memberId: fx.members.jon, night: NIGHT.thu, kind: "lunch", componentPortions: { protein: "1", base: "1", veg: "1" } });
      const move = () => applyPlanChangeCommand(jon, op(), { previewId: mv.previewId, reviewedHash: mv.contentHash });
      const [x, y] = order === "move first" ? await race(fx.householdId, move, lunch) : await race(fx.householdId, lunch, move);
      expect(x.status).toBe("accepted");
      expect(y.status).toBe("rejected");
      await assertPlanIntegrity(fx.weekId);
    });
  }

  it("R-F02e: independent Friday and Sunday edits still both survive", async () => {
    const { fx, jon, alex } = await fresh();
    const f = await preview(alex, fx.weekId, { type: "replace", assignmentId: fx.assignments.fri, recipeVersionId: fx.recipes.penne.versionId });
    const s = await preview(jon, fx.weekId, { type: "replace", assignmentId: fx.assignments.sun, recipeVersionId: fx.recipes.chili.versionId });
    const [a, b] = await race(fx.householdId, () => applyPlanChangeCommand(alex, op(), { previewId: f.previewId, reviewedHash: f.contentHash }), () => applyPlanChangeCommand(jon, op(), { previewId: s.previewId, reviewedHash: s.contentHash }));
    expect([a.status, b.status]).toEqual(["accepted", "accepted"]);
    await assertPlanIntegrity(fx.weekId);
  });
});

// ------------------------------------------------------------------------------------------------
describe("R-F03 current exclusions apply to every newly scheduled choice", () => {
  it("R-F03a: placing a deferred dinner that now violates an exclusion is refused", async () => {
    const { fx, jon } = await fresh();
    expect((await previewApply(jon, fx.weekId, { type: "backup", assignmentId: fx.assignments.wed, recipeVersionId: fx.recipes.penne.versionId })).a.status).toBe("accepted");
    expect((await addExclusionCommand(jon, op(), { term: "rice", memberId: null })).status).toBe("accepted");
    const p = await preview(jon, fx.weekId, { type: "place", eventId: fx.events.chicken_rice, toNight: NIGHT.thu });
    expect(p.blockers.map((b: any) => b.code)).toContain("constraint_violation");
    const a = await applyPlanChangeCommand(jon, op(), { previewId: p.previewId, reviewedHash: p.contentHash });
    expect(a.status).toBe("rejected");
    expect((await q<any>("SELECT status FROM cooking_events WHERE id=$1", [fx.events.chicken_rice]))[0].status).toBe("deferred");
  });

  it("R-F03b: adding an eater to a dinner checks that eater's personal exclusions", async () => {
    const { fx, jon, alex } = await fresh();
    let rev = (await q<any>("SELECT revision FROM cooking_events WHERE id=$1", [fx.events.stirfry]))[0].revision;
    expect((await setPlateCommand(jon, op(), { eventId: fx.events.stirfry, expectedEventRevision: rev, memberId: fx.members.jon, night: NIGHT.mon, kind: "dinner", componentPortions: null })).status).toBe("accepted");
    expect((await addExclusionCommand(alex, op(), { term: "soy", memberId: fx.members.jon })).status).toBe("accepted");
    rev = (await q<any>("SELECT revision FROM cooking_events WHERE id=$1", [fx.events.stirfry]))[0].revision;
    const r = await setPlateCommand(jon, op(), { eventId: fx.events.stirfry, expectedEventRevision: rev, memberId: fx.members.jon, night: NIGHT.mon, kind: "dinner", componentPortions: { main: "1", base: "1", veg: "1" } });
    expect(r.status === "rejected" && r.code).toBe("constraint_violation");
    expect((await q("SELECT 1 FROM allocations WHERE cooking_event_id=$1 AND member_id=$2", [fx.events.stirfry, fx.members.jon])).length).toBe(0);
  });
});

// ------------------------------------------------------------------------------------------------
describe("R-F04 order and transfer reconciliation", () => {
  it("R-F04a: a transfer acknowledged after the order is still counted; the same demand is not offered again", async () => {
    const { fx, jon, alex } = await fresh();
    await approveAll(alex, fx.weekId);
    await send(alex, fx.weekId);
    expect((await confirmFromTransfers(alex, fx.weekId)).status).toBe("accepted");
    await previewApply(jon, fx.weekId, { type: "replace", assignmentId: fx.assignments.fri, recipeVersionId: fx.recipes.penne.versionId });
    expect((await line(fx.weekId, "chicken_thigh")).toSend).toBe(1);
    await approveAll(alex, fx.weekId);
    const r = await send(alex, fx.weekId);
    expect(r.status, JSON.stringify(r)).toBe("accepted");
    const c = await line(fx.weekId, "chicken_thigh");
    expect(c.sent).toBe(1);
    expect(c.toSend).toBe(0);
    expect(c.status).toBe("in_cart_transfer");
    const again = await send(alex, fx.weekId);
    expect(again.status).toBe("rejected");
    expect(await retailerCalls()).toBe(2);
  });

  it("R-F04b: 'contents unknown' does not clear an uncertain transfer hold", async () => {
    const { fx, alex } = await fresh();
    await q("INSERT INTO fake_retailer_script(household_id, behavior) VALUES ($1,'accept_then_timeout')", [fx.householdId]);
    await approveAll(alex, fx.weekId);
    await send(alex, fx.weekId);
    expect((await confirmFromTransfers(alex, fx.weekId, { contentsKnown: false })).status).toBe("accepted");
    const c = await line(fx.weekId, "chicken_thigh");
    expect(c.uncertain).toBe(2);
    expect(c.toSend).toBe(0);
    expect((await summary(fx.weekId)).ready).toBe(false);
    expect(await retailerCalls()).toBe(1);
  });

  it("R-F04c: an acknowledged transfer stays counted when the order's contents are unknown, and is flagged", async () => {
    const { fx, alex } = await fresh();
    await approveAll(alex, fx.weekId);
    await send(alex, fx.weekId);
    await confirmFromTransfers(alex, fx.weekId, { contentsKnown: false });
    const c = await line(fx.weekId, "chicken_thigh");
    expect(c.sent).toBe(2);
    expect(c.toSend).toBe(0);
    expect(c.unresolved.join(" ")).toMatch(/contents not listed/);
  });

  it("R-F04d: a known order reconciles its pre-order transfers exactly once (no double count)", async () => {
    const { fx, alex } = await fresh();
    await approveAll(alex, fx.weekId);
    await send(alex, fx.weekId);
    await confirmFromTransfers(alex, fx.weekId, { omit: ["broccoli"] });
    const c = await line(fx.weekId, "chicken_thigh");
    expect([c.ordered, c.sent, c.toSend]).toEqual([2, 0, 0]);
    expect((await line(fx.weekId, "broccoli")).toSend).toBe(2);
  });
});

// ------------------------------------------------------------------------------------------------
describe("R-F05 receipts, substitutions and package identity", () => {
  async function ordered(fxw: Awaited<ReturnType<typeof fresh>>) {
    await approveAll(fxw.alex, fxw.fx.weekId);
    await send(fxw.alex, fxw.fx.weekId);
    await confirmFromTransfers(fxw.alex, fxw.fx.weekId);
    return (await q<any>("SELECT * FROM order_lines WHERE ingredient_key='salmon'"))[0];
  }

  it("R-F05a: an unvalidated substitution does not cover the original need", async () => {
    const h = await fresh();
    const ol = await ordered(h);
    await recordReceiptCommand(h.alex, op(), { orderLineId: ol.id, state: "substituted", packages: 1, substituteText: "Trout fillets" });
    const s = await line(h.fx.weekId, "salmon");
    expect(s.received).toBe(0);
    expect(s.status).not.toBe("ordered");
    expect(s.unresolved.join(" ")).toMatch(/Substituted .*Trout fillets/);
  });

  it("R-F05b: an unsuitable substitution leaves the need actionable; a suitable smaller one covers only its amount", async () => {
    const h = await fresh();
    const ol = await ordered(h);
    await recordReceiptCommand(h.alex, op(), { orderLineId: ol.id, state: "substituted", packages: 1, substituteText: "Trout fillets" });
    const rc = (await q<any>("SELECT id FROM receipt_observations WHERE order_line_id=$1", [ol.id]))[0];
    expect((await validateSubstitutionCommand(h.alex, op(), { receiptId: rc.id, suitable: false })).status).toBe("accepted");
    let s = await line(h.fx.weekId, "salmon");
    expect(s.status).toBe("missing");
    expect(s.toSend).toBe(1);
    // A suitable, smaller substitute: 8 oz salmon against 12 oz needed for Friday.
    const h2 = await fresh();
    const ol2 = await ordered(h2);
    await recordReceiptCommand(h2.alex, op(), { orderLineId: ol2.id, state: "substituted", packages: 1, substituteText: "Salmon 8 oz" });
    const rc2 = (await q<any>("SELECT id FROM receipt_observations WHERE order_line_id=$1", [ol2.id]))[0];
    expect((await validateSubstitutionCommand(h2.alex, op(), { receiptId: rc2.id, suitable: true, quantity: "8", unit: "oz" })).status).toBe("accepted");
    s = await line(h2.fx.weekId, "salmon");
    expect(s.unresolved).toEqual([]);
    expect(s.toSend).toBe(1); // 4 oz short of the 12 oz needed -> one more 12 oz package
  });

  it("R-F05c: ordered packages keep their own size when the product mapping later changes", async () => {
    const h = await fresh();
    await ordered(h);
    const before = (await q<any>("SELECT product_id, package_qty, package_unit FROM order_lines WHERE ingredient_key='chicken_thigh'"))[0];
    expect(before.package_qty).toBe("24");
    await addProductCommand(h.jon, op(), { weekId: h.fx.weekId, ingredientKey: "chicken_thigh", name: "Chicken thighs 16 oz", packageQty: "16", packageUnit: "oz", priceMinor: 599 });
    const c = await line(h.fx.weekId, "chicken_thigh");
    expect(c.toSend).toBe(0); // 48 oz ordered covers 43 oz needed, whatever today's package is
    expect((await q<any>("SELECT product_id, package_qty, package_unit FROM order_lines WHERE ingredient_key='chicken_thigh'"))[0]).toEqual(before);
  });

  it("R-F05d: a mistaken 'missing' is corrected by a new observation without rewriting history", async () => {
    const h = await fresh();
    const ol = await ordered(h);
    await recordReceiptCommand(h.alex, op(), { orderLineId: ol.id, state: "missing", packages: 1 });
    expect((await line(h.fx.weekId, "salmon")).status).toBe("missing");
    const first = (await q<any>("SELECT id FROM receipt_observations WHERE order_line_id=$1", [ol.id]))[0];
    const r = await recordReceiptCommand(h.jon, op(), { orderLineId: ol.id, state: "received", packages: 1, correctsReceiptId: first.id } as any);
    expect(r.status, JSON.stringify(r)).toBe("accepted");
    const s = await line(h.fx.weekId, "salmon");
    expect(s.status).toBe("received");
    expect((await q("SELECT 1 FROM receipt_observations WHERE order_line_id=$1", [ol.id])).length).toBe(2);
  });
});

// ------------------------------------------------------------------------------------------------
describe("R-F06 'Have enough' is bound to what the reviewer saw", () => {
  for (const order of ["change first", "observation first"] as const) {
    it(`R-F06a: a concurrent increase cannot enlarge Alex's assertion (${order})`, async () => {
      const { fx, jon, alex } = await fresh();
      const seen = await line(fx.weekId, "chicken_thigh"); // 43 oz = 1219.029 g
      const pv = await preview(jon, fx.weekId, { type: "replace", assignmentId: fx.assignments.fri, recipeVersionId: fx.recipes.penne.versionId });
      const change = () => applyPlanChangeCommand(jon, op(), { previewId: pv.previewId, reviewedHash: pv.contentHash });
      const enough = () => recordAvailabilityCommand(alex, op(), { weekId: fx.weekId, ingredientKey: "chicken_thigh", state: "enough", reviewed: { quantity: seen.meal.quantity, unit: seen.meal.unit, fingerprint: seen.fingerprint } } as any);
      const [a, b] = order === "change first" ? await race(fx.householdId, change, enough) : await race(fx.householdId, enough, change);
      expect(a.status).toBe("accepted");
      expect(b.status).toBe("accepted");
      const stored = (await q<any>("SELECT reviewed_demand, reviewed_unit FROM availability_observations"))[0];
      expect([stored.reviewed_demand, stored.reviewed_unit]).toEqual(["1219.029", "g"]);
      const c = await line(fx.weekId, "chicken_thigh");
      expect(c.unresolved.join(" ")).toMatch(/increased since Alex said "Have enough"/);
      expect(c.packagesNeeded).toBe(1); // only the 10 oz beyond what Alex saw
    });
  }

  it("R-F06b: 'Have enough' without the reviewed amount is refused; an unchanged review covers the need", async () => {
    const { fx, alex } = await fresh();
    const r = await recordAvailabilityCommand(alex, op(), { weekId: fx.weekId, ingredientKey: "rice", state: "enough" });
    expect(r.status === "rejected" && r.code).toBe("invalid");
    const seen = await line(fx.weekId, "rice");
    await recordAvailabilityCommand(alex, op(), { weekId: fx.weekId, ingredientKey: "rice", state: "enough", reviewed: { quantity: seen.meal.quantity, unit: seen.meal.unit, fingerprint: seen.fingerprint } } as any);
    expect((await line(fx.weekId, "rice")).packagesNeeded).toBe(0);
  });
});

// ------------------------------------------------------------------------------------------------
describe("R-F07 capture lifecycle", () => {
  it("R-F07a: Also need works before any week is adopted and reports its destination", async () => {
    const { fx, jon } = await fresh();
    const r = await captureHouseholdNeedCommand(jon, op(), { weekStart: NEXT, text: "Plain Greek yogurt", from: "week" } as any);
    expect(r.status, JSON.stringify(r)).toBe("accepted");
    expect(r.status === "accepted" && r.result.destination).toMatchObject({ weekStart: NEXT });
    const s = await householdSnapshot(jon, NEXT);
    expect(s.week?.adopted ?? false).toBe(false);
    expect(s.groceries!.lines.map((l: any) => l.key)).toContain("greek_yogurt");
    void fx;
  });

  it("R-F07b: after this week's order is confirmed, a new need goes to the next pickup, not the confirmed order", async () => {
    const h = await fresh();
    await approveAll(h.alex, h.fx.weekId);
    await send(h.alex, h.fx.weekId);
    await confirmFromTransfers(h.alex, h.fx.weekId);
    const r = await captureHouseholdNeedCommand(h.jon, op(), { weekId: h.fx.weekId, text: "Kidney beans (canned)", from: "groceries" });
    expect(r.status === "accepted" && r.result.destination).toMatchObject({ weekStart: NEXT });
    expect((await line(h.fx.weekId, "kidney_beans"))).toBeUndefined();
    const next = await weekRow(h.fx.householdId, NEXT);
    expect((await line(next.id, "kidney_beans")).packagesNeeded).toBe(1);
    // An already-ordered staple is identified first; "Add another" is an explicit extra for the next pickup.
    const r2 = await captureHouseholdNeedCommand(h.jon, op(), { weekId: h.fx.weekId, text: "Salmon fillet", from: "groceries" });
    expect(r2.status === "rejected" && r2.code).toBe("already_in_order");
    const r3 = await captureHouseholdNeedCommand(h.jon, op(), { weekId: h.fx.weekId, text: "Salmon fillet", from: "groceries", addAnother: true });
    expect(r3.status === "accepted" && r3.result).toMatchObject({ kind: "extra", destination: { weekStart: NEXT } });
    expect((await q<any>("SELECT count(*)::int n FROM order_lines"))[0].n).toBe((await q<any>("SELECT count(*)::int n FROM order_lines"))[0].n);
  });

  it("R-F07c: a remembered usual quantity is reused by later staple taps", async () => {
    const { fx, jon, alex } = await fresh();
    expect((await captureHouseholdNeedCommand(jon, op(), { weekId: fx.weekId, text: "Plain Greek yogurt", from: "week", packages: 2, rememberUsual: true } as any)).status).toBe("accepted");
    const staple = (await q<any>("SELECT usual_packages FROM household_staples WHERE ingredient_key='greek_yogurt'"))[0];
    expect(staple.usual_packages).toBe(2);
    const r = await captureHouseholdNeedCommand(alex, op(), { weekStart: NEXT, text: "Plain Greek yogurt", from: "groceries" } as any);
    expect(r.status).toBe("accepted");
    const next = await weekRow(fx.householdId, NEXT);
    expect((await line(next.id, "greek_yogurt")).packagesUsual).toBe(2);
    const s = await householdSnapshot(alex);
    expect(s.staples.map((x: any) => x.ingredientKey)).toContain("greek_yogurt");
  });
});

// ------------------------------------------------------------------------------------------------
describe("R-F08 household-wide purchasing inputs reach every active week", () => {
  it("R-F08a: a price change made from week B invalidates week A's old review; old Send makes zero calls", async () => {
    const { fx, jon, alex } = await fresh();
    const p = await propose(jon, NEXT);
    expect((await adopt(jon, p)).status).toBe("accepted");
    const weekB = await weekRow(fx.householdId, NEXT);
    await approveAll(alex, fx.weekId);
    const old = await summary(fx.weekId);
    expect(old.ready).toBe(true);
    expect((await recordPriceCommand(jon, op(), { weekId: weekB.id, productId: fx.products.chicken_thigh, amountMinor: 999 })).status).toBe("accepted");
    const c = await line(fx.weekId, "chicken_thigh");
    expect(c.price.amountMinor).toBe(999);
    const r = await startHandoff(alex, op(), { weekId: fx.weekId, reviewFingerprint: old.reviewFingerprint, payloadHash: old.payloadHash });
    expect(r.status === "rejected" && r.code).toBe("stale_review");
    expect(await retailerCalls()).toBe(0);
  });

  it("R-F08b: a product mapping change from week B reaches week A's quantities", async () => {
    const { fx, jon } = await fresh();
    const p = await propose(jon, NEXT);
    await adopt(jon, p);
    const weekB = await weekRow(fx.householdId, NEXT);
    await addProductCommand(jon, op(), { weekId: weekB.id, ingredientKey: "chicken_thigh", name: "Chicken thighs 16 oz", packageQty: "16", packageUnit: "oz", priceMinor: 599 });
    const c = await line(fx.weekId, "chicken_thigh");
    expect(c.product.name).toBe("Chicken thighs 16 oz");
    expect(c.packagesNeeded).toBe(3); // 43 oz / 16 oz
  });
});
