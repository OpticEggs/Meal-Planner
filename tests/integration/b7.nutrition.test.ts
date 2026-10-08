/**
 * B7 nutrition matches (real PostgreSQL). FoodData Central is reached only through injected
 * transports over the labeled fixtures; global fetch is stubbed to throw.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fresh, op, protectedState, q, race } from "./helpers";
import { NIGHT } from "../fixtures/household";
import { clearNutritionMatchCommand, confirmNutritionMatchCommand } from "@/server/commands/nutrition";
import { setTargetsCommand } from "@/server/commands/household";
import { candidateView, createFdcClient, fixtureTransport, httpTransport, type FdcClient } from "@/server/integrations/fdc";
import type { FdcTransport } from "@/server/integrations/fdc/transport";
import { householdSnapshot } from "@/server/queries/snapshot";
import { exportHousehold } from "@/server/export";
import type { Actor } from "@/server/commands/framework";

const FX = path.resolve(__dirname, "../fixtures/fdc");
const SECRET = "SECRET-fdc-key-should-never-be-stored";
let networkAttempts = 0;
beforeEach(() => {
  networkAttempts = 0;
  vi.stubGlobal("fetch", () => {
    networkAttempts++;
    throw new Error("network access attempted in an offline test");
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  expect(networkAttempts).toBe(0);
});

const fixtureClient = (): FdcClient => createFdcClient(fixtureTransport(FX), { now: () => new Date("2026-10-12T19:00:00Z") });

/** What the member reviewed: the candidate route's digest for that food. */
async function reviewed(fdcId: number, client = fixtureClient()) {
  const v = await candidateView(fdcId, client);
  if (v.outcome !== "ok") throw new Error(`fixture ${fdcId}: ${v.outcome}`);
  return v;
}

async function confirm(actor: Actor, ingredientKey: string, fdcId: number, form: "raw" | "cooked" | "as_sold", expectedRevision: number, extra: { portionId?: string; client?: FdcClient; digest?: string } = {}) {
  const digest = extra.digest ?? (await reviewed(fdcId, extra.client)).reviewDigest;
  return confirmNutritionMatchCommand(actor, op(), { ingredientKey, fdcId, form, portionId: extra.portionId, reviewDigest: digest, expectedRevision }, { client: extra.client ?? fixtureClient() });
}

const history = (key: string) => q<any>("SELECT * FROM nutrition_matches WHERE ingredient_key=$1 ORDER BY revision", [key]);
const current = async (key: string) => (await q<any>("SELECT * FROM ingredient_nutrition WHERE ingredient_key=$1", [key]))[0];

function wedPlate(s: any, memberId: string) {
  return s.week.nights.find((n: any) => n.night === NIGHT.wed).plates.find((p: any) => p.memberId === memberId);
}

describe("B7 persistence and history", () => {
  it("a confirmed match writes history + the current row with provenance; a portion and a clear append; history is immutable", async () => {
    const { fx, jon, alex } = await fresh();
    // Seeded fixture rows stay labeled synthetic.
    expect((await current("chicken_thigh")).provenance_kind).toBe("fixture_synthetic");
    const before = wedPlate(await householdSnapshot(jon), fx.members.jon).nutrition.calories.value;
    expect(before).toBe("877.7");

    const r1 = await confirm(jon, "chicken_thigh", 171077, "raw", 0);
    expect(r1.status).toBe("accepted");
    const [h1] = await history("chicken_thigh");
    expect(h1).toMatchObject({
      revision: 1, action: "matched", supersedes_id: null, fdc_id: 171077, data_type: "SR Legacy", description: "Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw",
      publication_date: "4/1/2019", basis_qty: "100", basis_unit: "g", form: "raw", energy_kcal: "120", energy_unit: "kcal", energy_nutrient: "208",
      protein_g: "22.5", protein_unit: "g", protein_nutrient: "203", fat_g: "2.62", carbs_g: "0", chosen_portion: null,
      provenance_kind: "fixture_fetched_demo", source_url_template: "https://api.nal.usda.gov/fdc/v1/food/{fdcId}", decided_by: fx.members.jon,
    });
    expect(h1.replaced_source).toMatch(/^fixture_synthetic: FIXTURE — synthetic/);
    expect(new Date(h1.retrieved_at).toISOString()).toBe("2026-10-12T19:00:00.000Z");
    expect(h1.nutrient_status).toEqual({ energy: "ok", protein: "ok", fat: "ok", carbs: "ok" });
    const c1 = await current("chicken_thigh");
    expect(c1).toMatchObject({ match_id: h1.id, provenance_kind: "fixture_fetched_demo", synthetic: true, basis_qty: "100", basis_unit: "g", form: "raw", calories: "120", fdc_id: 171077, data_type: "SR Legacy" });
    expect(c1.source).toMatch(/^FIXTURE — fetched demo record \(DEMO_KEY\), not live data: USDA FoodData Central — SR Legacy #171077/);

    // The other member sees the new source in the snapshot; plates are recalculated.
    const s = await householdSnapshot(alex);
    const src = s.nutritionSources.find((x: any) => x.ingredientKey === "chicken_thigh")!;
    expect(src).toMatchObject({ revision: 1, current: { provenanceKind: "fixture_fetched_demo", fdcId: 171077, dataType: "SR Legacy", form: "raw" }, last: { action: "matched", by: "Jon" } });
    expect(s.nutritionLookup).toBe("not_configured");
    const after = wedPlate(s, fx.members.jon).nutrition;
    expect(after.calories.value).not.toBe(before);
    expect(after.calories.value).not.toBeNull();
    expect(after.synthetic).toBe(true); // fixture-transported values are labeled, never passed off as data

    // A portion chosen explicitly: history keeps per-100 g values; the current row uses the portion basis.
    const r2 = await confirm(alex, "chicken_thigh", 171077, "raw", 1, { portionId: "p87919" });
    expect(r2.status).toBe("accepted");
    const hs = await history("chicken_thigh");
    expect(hs).toHaveLength(2);
    expect(hs[1]).toMatchObject({ revision: 2, supersedes_id: h1.id, energy_kcal: "120", decided_by: fx.members.alex, replaced_source: null });
    expect(hs[1].chosen_portion).toEqual({ id: "p87919", label: "4 oz = 113 g", amount: "4", unit: "oz", gramWeight: "113" });
    expect(await current("chicken_thigh")).toMatchObject({ basis_qty: "4", basis_unit: "oz", calories: "135.6", protein_g: "25.425", match_id: hs[1].id });

    // Clear: back to unknown, recorded.
    const r3 = await clearNutritionMatchCommand(jon, op(), { ingredientKey: "chicken_thigh", expectedRevision: 2 });
    expect(r3.status).toBe("accepted");
    expect(await current("chicken_thigh")).toBeUndefined();
    const h3 = (await history("chicken_thigh"))[2];
    expect(h3).toMatchObject({ revision: 3, action: "cleared", supersedes_id: hs[1].id, fdc_id: null });
    const cleared = wedPlate(await householdSnapshot(jon), fx.members.jon).nutrition.calories;
    expect(cleared.value).toBeNull();
    expect(cleared.missing).toContain("chicken_thigh");
    expect((await clearNutritionMatchCommand(jon, op(), { ingredientKey: "chicken_thigh", expectedRevision: 3 })).status === "rejected").toBe(true);

    await expect(q("UPDATE nutrition_matches SET energy_kcal=0 WHERE id=$1", [h1.id])).rejects.toThrow(/immutable/);
    await expect(q("DELETE FROM nutrition_matches WHERE id=$1", [h1.id])).rejects.toThrow(/immutable/);
    expect((await history("chicken_thigh")).map((h) => h.energy_kcal)).toEqual(["120", "120", null]);
  });

  it("values describing another form than the recipe uses become not applicable (unknown)", async () => {
    const { fx, jon } = await fresh();
    expect((await confirm(jon, "chicken_thigh", 171077, "cooked", 0)).status).toBe("accepted");
    const n = wedPlate(await householdSnapshot(jon), fx.members.jon).nutrition;
    expect(n.calories.value).toBeNull();
    expect(n.calories.formMismatch).toEqual(["chicken_thigh"]);
  });

  it("refusals write nothing: invalid input, unknown portion, an unusable basis, and every lookup failure", async () => {
    const { jon } = await fresh();
    const digest = (await reviewed(171077)).reviewDigest;
    const base = { ingredientKey: "chicken_thigh", fdcId: 171077, reviewDigest: digest, expectedRevision: 0 };
    const codes: string[] = [];
    const run = async (p: any, client: FdcClient = fixtureClient()) => codes.push(((await confirmNutritionMatchCommand(jon, op(), p, { client })) as any).code);
    await run({ ...base, form: undefined });
    await run({ ...base, form: "fried" });
    await run({ ...base, form: "raw", expectedRevision: undefined });
    await run({ ...base, form: "raw", portionId: "p999" });
    await run({ ...base, fdcId: 9000003, form: "as_sold", reviewDigest: (await reviewed(9000003)).reviewDigest });
    await run({ ...base, fdcId: 2646170, form: "raw" }); // genuine 429
    await run({ ...base, form: "raw" }, createFdcClient(null));
    await run({ ...base, fdcId: 9000099, form: "raw" });
    await run({ ...base, fdcId: 9000098, form: "raw" });
    await run({ ...base, fdcId: 424242, form: "raw" });
    const slow: FdcTransport = { provenance: "fdc_api", send: () => new Promise(() => {}) };
    await run({ ...base, form: "raw" }, createFdcClient(slow, { timeoutMs: 50 }));
    expect(codes).toEqual(["invalid", "invalid", "invalid", "portion_unknown", "basis_unknown", "rate_limited", "not_configured", "invalid_key", "malformed", "no_matches", "timeout"]);
    expect(await history("chicken_thigh")).toHaveLength(0);
    expect((await current("chicken_thigh")).provenance_kind).toBe("fixture_synthetic");
  });

  it("a replayed operation is answered from its receipt without contacting FoodData Central", async () => {
    const { jon } = await fresh();
    const t = fixtureTransport(FX);
    const send = vi.spyOn(t, "send");
    const client = createFdcClient(t);
    const digest = (await reviewed(171077, client)).reviewDigest;
    send.mockClear();
    const id = op();
    const p = { ingredientKey: "rice", fdcId: 171077, form: "raw" as const, reviewDigest: digest, expectedRevision: 0 };
    const a = await confirmNutritionMatchCommand(jon, id, p, { client });
    const b = await confirmNutritionMatchCommand(jon, id, p, { client });
    expect(a.status).toBe("accepted");
    expect(b).toMatchObject({ status: "accepted", replayed: true });
    expect(send).toHaveBeenCalledTimes(1);
    expect(await history("rice")).toHaveLength(1);
  });
});

describe("B7 household authorization", () => {
  it("another household's ingredient is not_found, nothing is fetched, written or revealed", async () => {
    const { fx, other } = await fresh();
    await q("INSERT INTO ingredients(household_id, key, name) VALUES ($1,'secret_spice','Secret spice')", [fx.householdId]);
    const t = fixtureTransport(FX);
    const send = vi.spyOn(t, "send");
    const client = createFdcClient(t);
    const digest = (await reviewed(171077)).reviewDigest;
    const a = await confirmNutritionMatchCommand(other, op(), { ingredientKey: "secret_spice", fdcId: 171077, form: "raw", reviewDigest: digest, expectedRevision: 0 }, { client });
    const b = await confirmNutritionMatchCommand(other, op(), { ingredientKey: "no_such_thing", fdcId: 171077, form: "raw", reviewDigest: digest, expectedRevision: 0 }, { client });
    expect(a).toMatchObject({ status: "rejected", code: "not_found" });
    expect(b).toMatchObject({ status: "rejected", code: "not_found" });
    expect((a as any).message).toBe((b as any).message);
    expect((a as any).details).toBeUndefined();
    expect(send).not.toHaveBeenCalled();
    const c = await clearNutritionMatchCommand(other, op(), { ingredientKey: "chicken_thigh", expectedRevision: 0 });
    expect(c).toMatchObject({ status: "rejected", code: "not_found" });
    expect(await q("SELECT 1 FROM nutrition_matches")).toHaveLength(0);
    expect((await current("chicken_thigh")).provenance_kind).toBe("fixture_synthetic");
    const os = await householdSnapshot(other);
    expect(os.nutritionSources).toEqual([]);
  });
});

describe("B7 competing match changes (two members, both commit orders)", () => {
  for (const order of ["jon-first", "alex-first"] as const) {
    it(`two matches made from the same revision: the first wins, the second is refused stale with nothing written (${order})`, async () => {
      const { jon, alex } = await fresh();
      const dj = (await reviewed(171077)).reviewDigest;
      const da = (await reviewed(9000001)).reviewDigest;
      const J = () => confirmNutritionMatchCommand(jon, op(), { ingredientKey: "chicken_thigh", fdcId: 171077, form: "raw", reviewDigest: dj, expectedRevision: 0 }, { client: fixtureClient() });
      const A = () => confirmNutritionMatchCommand(alex, op(), { ingredientKey: "chicken_thigh", fdcId: 9000001, form: "cooked", reviewDigest: da, expectedRevision: 0 }, { client: fixtureClient() });
      const [first, second] = order === "jon-first" ? await race(jon.householdId, J, A) : await race(jon.householdId, A, J);
      expect(first.status).toBe("accepted");
      expect(second).toMatchObject({ status: "rejected", code: "stale" });
      expect((second as any).message).toMatch(order === "jon-first" ? /^Jon changed the nutrition for Chicken thighs/ : /^Alex changed the nutrition for Chicken thighs/);
      const hs = await history("chicken_thigh");
      expect(hs).toHaveLength(1);
      expect(hs[0].fdc_id).toBe(order === "jon-first" ? 171077 : 9000001);
      expect((await current("chicken_thigh")).fdc_id).toBe(hs[0].fdc_id);
    });

    it(`a clear racing a match from the same revision: one wins, the other is refused stale (${order})`, async () => {
      const { jon, alex } = await fresh();
      expect((await confirm(jon, "rice", 9000006, "raw", 0)).status).toBe("accepted");
      const d = (await reviewed(171077)).reviewDigest;
      const M = () => confirmNutritionMatchCommand(jon, op(), { ingredientKey: "rice", fdcId: 171077, form: "raw", reviewDigest: d, expectedRevision: 1 }, { client: fixtureClient() });
      const C = () => clearNutritionMatchCommand(alex, op(), { ingredientKey: "rice", expectedRevision: 1 });
      const [first, second] = order === "jon-first" ? await race(jon.householdId, M, C) : await race(jon.householdId, C, M);
      expect(first.status).toBe("accepted");
      expect(second).toMatchObject({ status: "rejected", code: "stale" });
      const hs = await history("rice");
      expect(hs.map((h) => h.action)).toEqual(order === "jon-first" ? ["matched", "matched"] : ["matched", "cleared"]);
      if (order === "jon-first") expect((await current("rice")).fdc_id).toBe(171077);
      else expect(await current("rice")).toBeUndefined();
    });
  }
});

describe("B7 changed since review", () => {
  it("values that differ from the reviewed ones are refused with nothing written; the new values can then be reviewed and used", async () => {
    const { jon } = await fresh();
    const digest = (await reviewed(171077)).reviewDigest;
    const r3 = JSON.parse(readFileSync(path.join(FX, "fetched-demo/r3-food-171077.json"), "utf8"));
    const revised = structuredClone(r3);
    revised.foodNutrients.find((n: any) => n.nutrient?.number === "203").amount = 23.1;
    const changed: FdcTransport = { provenance: "fixture_synthetic", send: async () => ({ status: 200, headers: {}, text: JSON.stringify(revised) }) };
    const client = createFdcClient(changed, { now: () => new Date("2026-10-12T19:05:00Z") });
    const r = await confirmNutritionMatchCommand(jon, op(), { ingredientKey: "chicken_thigh", fdcId: 171077, form: "raw", reviewDigest: digest, expectedRevision: 0 }, { client });
    expect(r).toMatchObject({ status: "rejected", code: "changed_since_review" });
    const d = (r as any).details;
    expect(d.candidate.nutrients.protein.amount).toBe("23.1");
    expect(d.reviewDigest).not.toBe(digest);
    expect(await history("chicken_thigh")).toHaveLength(0);
    expect((await current("chicken_thigh")).provenance_kind).toBe("fixture_synthetic");
    const ok = await confirmNutritionMatchCommand(jon, op(), { ingredientKey: "chicken_thigh", fdcId: 171077, form: "raw", reviewDigest: d.reviewDigest, expectedRevision: 0 }, { client });
    expect(ok.status).toBe("accepted");
    expect((await current("chicken_thigh")).protein_g).toBe("23.1");
  });
});

describe("B7 nutrition never rewrites plans, recipes, targets or allergen information", () => {
  it("accepted dinners, recipe versions and member targets are byte-identical; only calculated nutrition changes", async () => {
    const { fx, jon, alex } = await fresh();
    await setTargetsCommand(jon, op(), { scope: "dinner", calories: "900", proteinG: "60", carbsG: null, fatG: null });
    const rows = async () => ({
      plan: await protectedState(fx.weekId),
      recipes: await q("SELECT * FROM recipe_versions ORDER BY id"),
      recipeIngredients: await q("SELECT * FROM recipe_ingredients ORDER BY id"),
      recipeComponents: await q("SELECT * FROM recipe_components ORDER BY recipe_version_id, key"),
      targets: await q("SELECT * FROM member_targets ORDER BY member_id, scope"),
      weeks: await q("SELECT * FROM weeks ORDER BY id"),
      events: await q("SELECT * FROM cooking_events ORDER BY id"),
      allocations: await q("SELECT * FROM allocations ORDER BY cooking_event_id, member_id, kind, night"),
      purchasing: await q("SELECT purchasing_revision FROM households ORDER BY id"),
    });
    const before = await rows();
    const calBefore = wedPlate(await householdSnapshot(jon), fx.members.jon).nutrition.calories.value;
    expect((await confirm(alex, "chicken_thigh", 171077, "raw", 0)).status).toBe("accepted");
    expect((await confirm(jon, "rice", 9000006, "raw", 0)).status).toBe("accepted");
    expect((await clearNutritionMatchCommand(alex, op(), { ingredientKey: "broccoli", expectedRevision: 0 })).status).toBe("accepted");
    expect(await rows()).toEqual(before);
    expect(wedPlate(await householdSnapshot(jon), fx.members.jon).nutrition.calories.value).not.toBe(calBefore);
  });

  it("nutrition data is not allergen clearance: allergen flags, tags and exclusions are untouched", async () => {
    const { jon } = await fresh();
    await q("INSERT INTO exclusions(household_id, member_id, term) SELECT household_id, NULL, 'tree_nut' FROM ingredients WHERE key='pesto' LIMIT 1");
    const snap = async () => ({
      ingredients: await q<any>("SELECT key, name, tags, allergen_info_known, fixture FROM ingredients ORDER BY household_id, key"),
      exclusions: await q("SELECT * FROM exclusions ORDER BY id"),
    });
    const before = await snap();
    expect(before.ingredients.find((i: any) => i.key === "pesto")!.allergen_info_known).toBe(false);
    // A branded label lists its ingredients; none of that becomes allergen information.
    expect((await confirm(jon, "pesto", 534358, "as_sold", 0, { portionId: "serving" })).status).toBe("accepted");
    expect((await confirm(jon, "pesto", 9000004, "as_sold", 1)).status).toBe("accepted");
    expect(await snap()).toEqual(before);
    const s = await householdSnapshot(jon);
    expect(s.ingredients.find((i: any) => i.key === "pesto")!.allergenInfoKnown).toBe(false);
  });
});

describe("B7 export", () => {
  it("includes the match history and current rows, and never a key", async () => {
    const { fx, jon } = await fresh();
    const fake = (async (url: string) =>
      new Response(readFileSync(path.join(FX, url.includes("/food/") ? "fetched-demo/r3-food-171077.json" : "synthetic/search-none.json")), { status: 200 })) as unknown as typeof fetch;
    const live = createFdcClient(httpTransport(SECRET, fake), { now: () => new Date("2026-10-12T19:00:00Z") });
    const r = await confirm(jon, "chicken_thigh", 171077, "raw", 0, { client: live });
    expect(r.status).toBe("accepted");
    expect((await current("chicken_thigh")).provenance_kind).toBe("fdc_api");
    expect((await current("chicken_thigh")).synthetic).toBe(false);
    const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await c.connect();
    const data = await exportHousehold(c, fx.householdId);
    await c.end();
    expect(data.tables.nutrition_matches).toHaveLength(1);
    expect(data.tables.nutrition_matches[0]).toMatchObject({ fdc_id: 171077, provenance_kind: "fdc_api", source_url_template: "https://api.nal.usda.gov/fdc/v1/food/{fdcId}" });
    expect(data.tables.ingredient_nutrition.find((n: any) => n.ingredient_key === "chicken_thigh")).toMatchObject({ provenance_kind: "fdc_api" });
    const text = JSON.stringify(data);
    expect(text).not.toContain(SECRET);
    expect(text).not.toMatch(/api_key/);
    expect(JSON.stringify(await householdSnapshot(jon))).not.toContain(SECRET);
    expect(JSON.stringify(await q("SELECT * FROM command_receipts"))).not.toContain(SECRET);
  });
});
