/**
 * B3: suggestions favor applicable received goods, and additional basket cost reflects only
 * genuine extra purchasing — computed on the corrected order/receipt accounting (F04/F05).
 */
import { describe, expect, it } from "vitest";
import { fresh, line, op, q } from "./helpers";
import { applyPlanChangeCommand, createPreviewCommand } from "@/server/commands/plan";
import { approvePurchaseLinesCommand, confirmOrderCommand, recordReceiptCommand } from "@/server/commands/groceries";
import { startHandoff } from "@/server/commands/purchasing";
import { librarySnapshot } from "@/server/queries/library";
import type { Actor } from "@/server/commands/framework";

async function approveSendConfirmReceive(actor: Actor, fx: any) {
  const ls = (await q<any>("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1", [fx.weekId])).map((r) => r.line)
    .filter((l) => l.toSend > 0 && l.product && l.price && l.unresolved.length === 0);
  await approvePurchaseLinesCommand(actor, op(), { weekId: fx.weekId, lines: ls.map((l) => ({ key: l.key, fingerprint: l.fingerprint, packages: l.toSend })) });
  const s = (await q<any>("SELECT projection_summary FROM grocery_cycles WHERE week_id=$1", [fx.weekId]))[0].projection_summary;
  await startHandoff(actor, op(), { weekId: fx.weekId, reviewFingerprint: s.reviewFingerprint, payloadHash: s.payloadHash });
  const payload = (await q<any>("SELECT payload FROM handoff_batches"))[0].payload;
  await confirmOrderCommand(actor, op(), {
    weekId: fx.weekId, contentsKnown: true, pickupAt: "2026-10-12T21:00:00Z",
    lines: payload.map((i: any) => ({ ingredientKey: i.ingredientKey, productId: fx.products[i.ingredientKey], name: i.ingredientKey, packages: i.packages })),
  });
  for (const ol of await q<any>("SELECT id, packages FROM order_lines")) {
    await recordReceiptCommand(actor, op(), { orderLineId: ol.id, state: "received", packages: ol.packages });
  }
}
async function replace(actor: Actor, fx: any, night: "fri" | "sun" | "sat", key: string) {
  const p = await createPreviewCommand(actor, op(), { weekId: fx.weekId, operation: { type: "replace", assignmentId: fx.assignments[night], recipeVersionId: fx.recipes[key].versionId } });
  if (p.status !== "accepted") throw new Error(JSON.stringify(p));
  return { preview: p.result as any, apply: await applyPlanChangeCommand(actor, op(), { previewId: String(p.result.previewId), reviewedHash: String(p.result.contentHash) }) };
}

describe("B3 received goods and genuine additional purchasing", () => {
  it("labels and favors options that use received, unallocated goods; extra cost excludes goods already received", async () => {
    const { fx, jon, alex } = await fresh();
    await approveSendConfirmReceive(alex, fx);
    // Sunday's shawarma (10 oz chicken) becomes chili: 15 oz of received chicken is now unallocated.
    expect((await replace(jon, fx, "sun", "chili")).apply.status).toBe("accepted");
    const chicken = await line(fx.weekId, "chicken_thigh");
    expect(chicken.receivedSurplus).toEqual({ quantity: "15", unit: "oz" }); // 48 oz received - 33 oz still planned
    expect(chicken.toSend).toBe(0);
    const lib = await librarySnapshot(jon);
    const penne = lib.recipes.find((r: any) => r.version.title === "Fixture: Chicken penne")!;
    const tacos = lib.recipes.find((r: any) => r.version.title === "Fixture: Black bean tacos")!;
    expect(penne.usesReceived).toEqual(["Chicken thighs"]);
    expect(tacos.usesReceived).toEqual(["Black beans (canned)", "Cheddar cheese", "Corn tortillas"].filter((n) => tacos.usesReceived.includes(n)));
    // Penne for two: 10 oz chicken (covered by the surplus) + 6 oz pasta (one 16 oz box) + 1 cup sauce
    // (the chili's still-unbought jar has room: 2 cups < 24 fl oz). Only the pasta is new buying.
    expect(penne.additionalBasketCost).toMatchObject({ known: true, minor: 179 });
    // The change sheet preview agrees: replacing Saturday with penne adds only the pasta box ...
    const sat = await replace(jon, fx, "sat", "penne");
    expect(sat.preview.additionalBasketCost).toEqual({ known: true, minor: 179 });
    // ... and does not reach into received history to re-buy chicken.
    expect((await line(fx.weekId, "chicken_thigh")).toSend).toBe(0);
    // Dinner ingredient cost and pickup spending remain separate measures.
    const s = (await q<any>("SELECT projection_summary FROM grocery_cycles WHERE week_id=$1", [fx.weekId]))[0].projection_summary;
    expect(s.dinnerIngredientCost.knownMinor).not.toBe(s.pickupSpending.knownMinor);
    expect(s.outstandingPurchase.knownMinor).toBeLessThan(s.pickupSpending.knownMinor);
  });

  it("with no purchasing history, additional basket cost equals the full extra purchase", async () => {
    const { fx, jon } = await fresh();
    const p = await createPreviewCommand(jon, op(), { weekId: fx.weekId, operation: { type: "replace", assignmentId: fx.assignments.fri, recipeVersionId: fx.recipes.penne.versionId } });
    // chicken 43 -> 53 oz (+1 tray 749), pasta +179, sauce jar +329, cucumber 2 -> 1 (-79); salmon stays (Alex's request).
    expect(p.status === "accepted" && p.result.additionalBasketCost).toEqual({ known: true, minor: 749 + 179 + 329 - 79 });
    const lib = await librarySnapshot(jon);
    expect(lib.recipes.every((r: any) => r.usesReceived.length === 0)).toBe(true); // nothing received: no inferred inventory
  });
});
