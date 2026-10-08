import { describe, expect, it } from "vitest";
import { D, convert, packagesFor } from "@/domain/units";
import { eventDemand, plateNutrition } from "@/domain/recipes/plate";
import { addDays, localDate, nextDinnerDate, weekStartOf } from "@/domain/dates";
import { computeProjection, type ProjectionInput } from "@/domain/groceries/projection";
import { computeOperation, closureStale } from "@/domain/planning/operations";
import { computeCoverage } from "@/domain/planning/coverage";
import { checkPlan, checkRecipe } from "@/domain/planning/constraints";
import { generateProposal, type ProposalContext } from "@/domain/planning/proposal";
import type { Allocation, Ingredient, NutritionFacts, PlanState, RecipeVersion } from "@/domain/types";

const rv = (id: string, title: string, comps: [string, [string, string, string][]][], extra: Partial<RecipeVersion> = {}): RecipeVersion => ({
  id, recipeId: `r-${id}`, versionNo: 1, title, cuisine: null, summary: null, effortMinutes: 30, effortLevel: "easy", leftoverFriendly: false,
  instructions: "", reheatInstructions: "", provenance: "fixture", sourceLabel: null, estimate: true,
  components: comps.map(([k], i) => ({ key: k, name: k, sort: i })),
  ingredients: comps.flatMap(([k, ings]) => ings.map(([ing, q, u]) => ({ componentKey: k, ingredientKey: ing, quantity: q, unit: u, form: "raw" }))),
  ...extra,
});
const BOWL = rv("bowl", "Bowl", [["protein", [["chicken", "6", "oz"]]], ["base", [["rice", "75", "g"]]], ["veg", [["broccoli", "100", "g"], ["oil", "1", "tbsp"]]]], { leftoverFriendly: true });
const alloc = (memberId: string, night: string, p: Record<string, string>, kind: "dinner" | "lunch" = "dinner"): Allocation => ({ cookingEventId: "e1", memberId, kind, night, componentPortions: p });

describe("X06 portion, unit and nutrition arithmetic", () => {
  it("component-only changes affect only that component's ingredients", () => {
    const base = eventDemand(BOWL, [alloc("j", "d1", { protein: "1", base: "1", veg: "1" })]).lines;
    const more = eventDemand(BOWL, [alloc("j", "d1", { protein: "2", base: "1", veg: "1" })]).lines;
    const q = (ls: typeof base, k: string) => ls.find((l) => l.ingredientKey === k)!.quantity.toString();
    expect(q(more, "chicken")).toBe(new D(q(base, "chicken")).mul(2).toString());
    for (const k of ["rice", "broccoli", "oil"]) expect(q(more, k)).toBe(q(base, k));
  });

  it("a leftover batch is counted once: plates on later nights draw from the same cooking", () => {
    const allocs = [alloc("j", "d1", { protein: "1", base: "1", veg: "1" }), alloc("j", "d2", { protein: "1", base: "1", veg: "1" }), alloc("a", "d2", { protein: "1", base: "1", veg: "1" }, "lunch")];
    const lines = eventDemand(BOWL, allocs).lines;
    expect(lines.find((l) => l.ingredientKey === "rice")!.quantity.toString()).toBe("225");
  });

  it("rounds packages up exactly and never with binary floating point", () => {
    expect(packagesFor(new D("24"), new D("24"))).toBe(1);
    expect(packagesFor(new D("24.000000001"), new D("24"))).toBe(2);
    expect(packagesFor(new D("0"), new D("24"))).toBe(0);
    // 0.1 + 0.2 style sums stay exact
    expect(packagesFor(new D("0.1").plus("0.2"), new D("0.3"))).toBe(1);
  });

  it("mass ounces are not fluid ounces; custom units only match themselves", () => {
    expect(convert("1", "oz", "fl_oz")).toBeNull();
    expect(convert("1", "bunch", "g")).toBeNull();
    expect(convert("2", "can", "can")!.toString()).toBe("2");
    expect(convert("1", "lb", "oz")!.toString()).toBe("16");
  });

  it("missing nutrition or conversion stays unknown, never zero", () => {
    const nut = new Map<string, NutritionFacts>([
      ["chicken", { ingredientKey: "chicken", basisQty: "100", basisUnit: "g", calories: "177", proteinG: "24.2", carbsG: "0", fatG: "8.2", source: "t", synthetic: true }],
      ["rice", { ingredientKey: "rice", basisQty: "100", basisUnit: "g", calories: "365", proteinG: "7.1", carbsG: "80", fatG: "0.7", source: "t", synthetic: true }],
    ]);
    const n = plateNutrition(BOWL, { protein: "1", base: "1", veg: "1" }, nut);
    expect(n.calories.value).toBeNull();
    expect(n.calories.missing.sort()).toEqual(["broccoli", "oil"]);
    expect(Number(n.calories.knownPart)).toBeCloseTo(6 * 28.349523125 * 1.77 + 75 * 3.65, 0);
    const proteinOnly = plateNutrition(BOWL, { protein: "1", base: "0", veg: "0" }, nut);
    expect(proteinOnly.proteinG.value).toBe("41.2"); // 170.1 g x 24.2/100
    expect(proteinOnly.synthetic).toBe(true);
  });
});

function projectionInput(over: Partial<ProjectionInput> = {}): ProjectionInput {
  const ingredients = new Map<string, Ingredient>([
    ["chicken", { key: "chicken", name: "Chicken", tags: [], allergenInfoKnown: true }],
    ["rice", { key: "rice", name: "Rice", tags: [], allergenInfoKnown: true }],
    ["broccoli", { key: "broccoli", name: "Broccoli", tags: [], allergenInfoKnown: true }],
    ["oil", { key: "oil", name: "Oil", tags: [], allergenInfoKnown: true }],
    ["yogurt", { key: "yogurt", name: "Yogurt", tags: [], allergenInfoKnown: true }],
  ]);
  const prod = (k: string, qty: string, unit: string, price: number | null) => ({
    product: { id: `p-${k}`, ref: `SIM-${k}`, name: k, ingredientKey: k, packageQty: qty, packageUnit: unit, variableWeight: false, fixture: true, retailer: "simulated" },
    price: price === null ? null : { id: `pr-${k}`, amountMinor: price, currency: "USD", kind: "regular", source: "fixture", observedAt: "2026-10-01T00:00:00Z" },
  });
  return {
    events: [{ event: { id: "e1", recipeVersionId: "bowl", status: "scheduled", cookNight: "2026-10-14", revision: 1 }, recipe: BOWL, allocations: [alloc("j", "2026-10-14", { protein: "1", base: "1", veg: "1" })] }],
    ingredients,
    requests: [],
    availability: [],
    products: new Map([["chicken", prod("chicken", "24", "oz", 749)], ["rice", prod("rice", "2", "lb", 400)], ["broccoli", prod("broccoli", "1", "lb", 249)], ["oil", prod("oil", "500", "ml", null)], ["yogurt", prod("yogurt", "32", "oz", 549)]]),
    batches: [],
    order: null,
    approvals: [],
    budget: { scope: null, limitMinor: null, firm: false, currency: "USD" },
    ...over,
  };
}

describe("X07 cost scopes and unknowns", () => {
  it("keeps dinner ingredient cost, pickup spending and unknown prices distinct", () => {
    const r = computeProjection(projectionInput());
    const rice = r.lines.find((l) => l.key === "rice")!;
    expect(rice.pickupCostMinor).toBe(400); // one $4.00 bag bought ...
    expect(rice.usageCostMinor).toBe(33); // ... about $0.33 of it used by dinner (75 g of 907.18 g)
    expect(r.pickupSpending.complete).toBe(false); // oil unpriced
    expect(r.pickupSpending.unknownCount).toBe(1);
    expect(r.pickupSpending.knownMinor).toBe(749 + 400 + 249);
    expect(r.dinnerIngredientCost.complete).toBe(false);
    expect(r.lines.find((l) => l.key === "oil")!.pickupCostMinor).toBeNull();
  });

  it("a firm budget cannot be proven by unknown prices, and a known excess is 'over'", () => {
    const unknown = computeProjection(projectionInput({ budget: { scope: "pickup", limitMinor: 100000, firm: true, currency: "USD" } }));
    expect(unknown.budget.status).toBe("unknown");
    expect(unknown.readyBlockers).toContain("Firm budget cannot be confirmed while prices are unknown");
    const over = computeProjection(projectionInput({ budget: { scope: "pickup", limitMinor: 1000, firm: true, currency: "USD" } }));
    expect(over.budget.status).toBe("over");
  });

  it("usual replenishment is a minimum, shared with recipe demand; explicit extras add", () => {
    const yogurtRecipe = rv("y", "Y", [["sauce", [["yogurt", "4", "oz"]]]]);
    const base = projectionInput({
      events: [{ event: { id: "e2", recipeVersionId: "y", status: "scheduled", cookNight: "2026-10-14", revision: 1 }, recipe: yogurtRecipe, allocations: [{ cookingEventId: "e2", memberId: "j", kind: "dinner", night: "2026-10-14", componentPortions: { sauce: "2" } }] }],
      requests: [{ id: "q1", ingredientKey: "yogurt", text: "Yogurt", kind: "usual", packages: null, contributors: [{ memberId: "j", name: "J", taps: 2 }] }],
    });
    let y = computeProjection(base).lines.find((l) => l.key === "yogurt")!;
    expect(y.packagesNeeded).toBe(1);
    expect(y.leftAfterMeal).toEqual({ quantity: "680.39", unit: "g" });
    y = computeProjection({ ...base, requests: [...base.requests, { id: "q2", ingredientKey: "yogurt", text: "Yogurt", kind: "extra", packages: 1, contributors: [] }] }).lines.find((l) => l.key === "yogurt")!;
    expect(y.packagesNeeded).toBe(2);
  });
});

describe("X08 dates, DST, locks, exclusions", () => {
  it("uses household-local dates across local midnight and daylight-saving transitions", () => {
    const tz = "America/New_York";
    expect(localDate(new Date("2026-11-02T03:30:00Z"), tz)).toBe("2026-11-01"); // still Sunday evening locally
    expect(localDate(new Date("2026-11-02T05:30:00Z"), tz)).toBe("2026-11-02");
    // DST ends 2026-11-01 at 2:00 local: 01:30 occurs twice; both are Nov 1.
    expect(localDate(new Date("2026-11-01T05:30:00Z"), tz)).toBe("2026-11-01");
    expect(localDate(new Date("2026-11-01T06:30:00Z"), tz)).toBe("2026-11-01");
    expect(nextDinnerDate(new Date("2026-11-02T01:30:00Z"), tz)).toBe("2026-11-01"); // 20:30 local -> tonight
    expect(nextDinnerDate(new Date("2026-11-02T02:30:00Z"), tz)).toBe("2026-11-02"); // 21:30 local -> tomorrow
    expect(nextDinnerDate(new Date("2026-03-08T07:30:00Z"), tz)).toBe("2026-03-08"); // spring-forward night
    expect(weekStartOf("2026-11-01")).toBe("2026-10-26");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02"); // civil-date arithmetic, no 23/25-hour drift
  });

  const ings = new Map<string, Ingredient>([
    ["chicken", { key: "chicken", name: "Chicken", tags: ["poultry"], allergenInfoKnown: true }],
    ["rice", { key: "rice", name: "Rice", tags: [], allergenInfoKnown: true }],
    ["broccoli", { key: "broccoli", name: "Broccoli", tags: [], allergenInfoKnown: true }],
    ["oil", { key: "oil", name: "Oil", tags: [], allergenInfoKnown: true }],
    ["pesto", { key: "pesto", name: "Pesto", tags: [], allergenInfoKnown: false }],
  ]);
  const PESTO = rv("pesto", "Pesto", [["main", [["pesto", "2", "tbsp"]]]]);
  const state: PlanState = {
    weekId: "w", weekStart: "2026-10-12", acceptedChoiceRevision: 1,
    assignments: [
      { id: "a-wed", night: "2026-10-14", kind: "cook", cookingEventId: "e1", locked: false, revision: 1, reason: null },
      { id: "a-thu", night: "2026-10-15", kind: "leftover", cookingEventId: "e1", locked: true, revision: 1, reason: null },
      { id: "a-fri", night: "2026-10-16", kind: "open", cookingEventId: null, locked: false, revision: 1, reason: null },
    ],
    events: [{ id: "e1", recipeVersionId: "bowl", status: "scheduled", cookNight: "2026-10-14", revision: 1 }],
    allocations: [alloc("j", "2026-10-14", { protein: "1", base: "1", veg: "1" }), alloc("j", "2026-10-15", { protein: "1", base: "1", veg: "1" })],
  };
  const ctx = { members: [{ id: "j", displayName: "J" }], recipes: new Map([["bowl", BOWL], ["pesto", PESTO]]), exclusions: [], ingredients: ings };

  it("a new exclusion flags the current dinner without replacing it", () => {
    const flags = checkPlan(state, ctx.recipes, [{ id: "x", memberId: null, term: "poultry" }], ings);
    expect(flags.find((f) => f.night === "2026-10-14")!.status).toBe("violated");
    expect(state.assignments[0].cookingEventId).toBe("e1");
  });

  it("unknown ingredient information cannot pass a hard-exclusion check for a new choice", () => {
    expect(checkRecipe(PESTO, ["j"], [{ id: "x", memberId: null, term: "tree_nut" }], ings).status).toBe("unknown");
    expect(checkRecipe(PESTO, ["j"], [], ings).status).toBe("ok");
    const res = computeOperation(state, { type: "replace", assignmentId: "a-fri", recipeVersionId: "pesto" }, { ...ctx, exclusions: [{ id: "x", memberId: null, term: "tree_nut" }] });
    expect(res.blockers.map((b) => b.code)).toContain("constraint_unknown");
  });

  it("locks are never overwritten; leftovers never precede their cooking", () => {
    const r1 = computeOperation(state, { type: "replace", assignmentId: "a-wed", recipeVersionId: "pesto" }, ctx);
    expect(r1.blockers.map((b) => b.code)).toContain("locked_dependent");
    const r2 = computeOperation(state, { type: "move", assignmentId: "a-wed", toNight: "2026-10-16" }, ctx);
    expect(r2.blockers.map((b) => b.code)).toContain("locked_dependent"); // Thursday would precede Friday's cooking
    const unlocked = { ...state, assignments: state.assignments.map((a) => ({ ...a, locked: false })) };
    const r3 = computeOperation(unlocked, { type: "move", assignmentId: "a-wed", toNight: "2026-10-16" }, ctx);
    expect(r3.blockers).toEqual([]);
    expect(r3.state.assignments.find((a) => a.id === "a-thu")!.kind).toBe("open");
    expect(r3.consequences.join(" ")).toMatch(/Thursday becomes an open night/);
    expect(computeCoverage(r3.state, []).every((c) => c.status !== "covered" || c.night !== "2026-10-15")).toBe(true);
  });

  it("closure staleness is per target: an unrelated night's revision does not stale a preview", () => {
    const r = computeOperation(state, { type: "replace", assignmentId: "a-fri", recipeVersionId: "bowl" }, ctx);
    const later = { ...state, assignments: state.assignments.map((a) => (a.id === "a-wed" ? { ...a, revision: 5 } : a)) };
    expect(closureStale(r.closure, later).stale).toBe(false);
    const fri = { ...state, assignments: state.assignments.map((a) => (a.id === "a-fri" ? { ...a, revision: 2 } : a)) };
    expect(closureStale(r.closure, fri).stale).toBe(true);
  });
});

describe("Proposal engine (deterministic, explainable)", () => {
  const recipes = [
    rv("a", "Alpha", [["m", [["chicken", "6", "oz"]]]], { leftoverFriendly: true }),
    rv("b", "Bravo", [["m", [["rice", "75", "g"]]]], { leftoverFriendly: true }),
    rv("c", "Charlie", [["m", [["broccoli", "100", "g"]]]]),
    rv("d", "Delta", [["m", [["oil", "1", "tbsp"]]]], { effortLevel: "involved" }),
    rv("e", "Echo", [["m", [["pesto", "1", "tbsp"]]]]),
  ];
  const ingredients = new Map<string, Ingredient>(["chicken", "rice", "broccoli", "oil"].map((k) => [k, { key: k, name: k, tags: k === "chicken" ? ["poultry"] : [], allergenInfoKnown: true }]));
  ingredients.set("pesto", { key: "pesto", name: "pesto", tags: [], allergenInfoKnown: false });
  const ctx: ProposalContext = {
    weekStart: "2026-10-19", members: [{ id: "j", displayName: "Jon" }, { id: "x", displayName: "Alex" }], recipes,
    preferences: new Map([["r-c", new Map([["x", "not_for_me" as const]])]]), interests: new Set(["r-b"]), recentRecipeIds: new Set(), cookedRecipeIds: new Set(["r-a", "r-b"]),
    exclusions: [{ id: "ex", memberId: null, term: "nut" }], ingredients, kept: [],
  };
  it("is deterministic and applies hard eligibility before preference", () => {
    const p1 = generateProposal(ctx, { cookingSessions: 2, variety: null, maxNewRecipes: null, maxEffort: "medium", avoidRecipeIds: [] });
    const p2 = generateProposal(ctx, { cookingSessions: 2, variety: null, maxNewRecipes: null, maxEffort: "medium", avoidRecipeIds: [] });
    expect(p1.contentHash).toBe(p2.contentHash);
    const used = new Set(p1.content.nights.map((n) => n.recipeVersionId).filter(Boolean));
    expect(used.has("c")).toBe(false); // Alex: Not for me
    expect(used.has("d")).toBe(false); // above effort cap
    expect(used.has("e")).toBe(false); // unknown ingredient info with exclusions present
    expect(p1.excluded.map((x) => x.title).sort()).toEqual(["Charlie", "Delta", "Echo"]);
    expect(p1.content.nights.find((n) => n.recipeVersionId === "b")!.reasons).toContain("Saved to Sounds good");
    // Seven nights; with two leftover-friendly cooks, unfilled nights are named, never faked.
    expect(p1.content.nights).toHaveLength(7);
    expect(p1.content.unresolved.length).toBeGreaterThan(0);
    expect(p1.content.nights.filter((n) => n.kind === "open").length).toBeGreaterThan(0);
  });
  it("keeps locked nights unchanged", () => {
    const kept = [{ night: "2026-10-21", kind: "cook" as const, recipeVersionId: "a", eventId: "ev-a", cookNight: "2026-10-21", allocations: [] }];
    const p = generateProposal({ ...ctx, kept }, { cookingSessions: 3, variety: null, maxNewRecipes: null, maxEffort: null, avoidRecipeIds: [] });
    const wed = p.content.nights.find((n) => n.night === "2026-10-21")!;
    expect(wed).toMatchObject({ kept: true, locked: true, recipeVersionId: "a" });
    expect(p.content.nights.filter((n) => n.recipeVersionId === "a" && !n.kept && n.kind === "cook")).toHaveLength(0);
  });
});
