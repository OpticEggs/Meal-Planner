/**
 * Multi-source handoff, pure rules: the shopping list (GR-08) and import drafts (URL-10/11).
 */
import { describe, expect, it } from "vitest";
import { buildShoppingList, shoppingListCsv, shoppingListText } from "@/domain/groceries/shopping-list";
import { draftProblems, initialDecision, perPortion, type DraftLine } from "@/domain/recipes/import";
import type { RequirementLine } from "@/domain/groceries/projection";

const line = (o: Partial<RequirementLine> & { key: string; name: string }): RequirementLine => ({
  ingredientKey: o.key, meal: null, mealUnitConflict: null, requests: [], availability: null, homeSupply: null, netMeal: null, product: null, price: null,
  packagesForMeal: null, packagesUsual: 0, packagesExtra: 0, packagesNeeded: null, estimate: false, leftAfterMeal: null, ordered: 0, received: 0, missing: 0,
  sent: 0, uncertain: 0, toSend: null, unresolved: [], productIssue: null, approval: null, fingerprint: "f", status: "needs_review", usageCostMinor: null,
  pickupCostMinor: null, outstandingCostMinor: null, receivedSurplus: null, ...o,
}) as RequirementLine;

const meal = (quantity: string, unit: string) => ({ quantity, unit, sources: [] });

describe("shopping list (GR-08)", () => {
  const lines = [
    line({ key: "rice", name: "Jasmine rice", meal: meal("375", "g"), netMeal: { quantity: "375", unit: "g" } }),
    line({ key: "milk", name: "Milk", requests: [{ id: "r1", kind: "extra", packages: 2, text: "milk", contributors: [{ memberId: "a", name: "Alex", taps: 1 }] }] }),
    line({ key: "salt", name: "Salt", meal: meal("1", "tsp"), netMeal: { quantity: "0", unit: "tsp" }, availability: { id: "a1", ingredientKey: "salt", state: "enough", quantity: null, unit: null, reviewedDemand: null, reviewedUnit: null, memberName: "Jon" } }),
    line({ key: "beans", name: "Beans", mealUnitConflict: ["1 can", "200 g"] }),
    line({ key: "tofu", name: "Firm tofu", meal: meal("240", "g"), netMeal: { quantity: "240", unit: "g" }, ordered: 1 }),
    line({ key: "=cmd", name: "=HYPERLINK(\"x\")", requests: [{ id: "r2", kind: "extra", packages: 1, text: "x", contributors: [] }] }),
  ];

  it("states every amount exactly, keeps unknowns unknown and says what it is not", () => {
    const list = buildShoppingList(lines, "manual");
    const by = Object.fromEntries(list.items.map((i) => [i.key, i]));
    expect(by.rice).toMatchObject({ state: "to_buy", amount: { quantity: "375", unit: "g" }, storePackages: null, priceMinor: null });
    expect(by.milk).toMatchObject({ state: "to_buy", amount: null, packages: 2, contributors: ["Alex"] });
    expect(by.salt.state).toBe("have_enough");
    expect(by.beans.state).toBe("unknown_amount");
    expect(by.tofu.state).toBe("already_ordered");
    const text = shoppingListText(list, { title: "Groceries", destinationLabel: "Another store", priceLabel: "No prices are known for Another store." });
    expect(text).toMatch(/A shopping list only: copying it doesn't order, send or record anything/);
    expect(text).toMatch(/- Jasmine rice: 375 g/);
    expect(text).toMatch(/- Milk: 2 packages \(requested\) \(asked by Alex\)/);
    expect(text).toMatch(/- Beans: amount unknown/);
    expect(text).toMatch(/Check first:\n- Firm tofu/);
    expect(text).toMatch(/Already have:\n- Salt/);
    expect(text).not.toMatch(/\$0\.00/);
  });

  it("CSV quotes every cell, writes unknown as unknown and neutralizes spreadsheet formulas", () => {
    const csv = shoppingListCsv(buildShoppingList(lines, "manual"));
    const rows = csv.trim().split("\r\n");
    expect(rows[0]).toBe('"item","state","amount","unit","requested_packages","store_packages","price_each","asked_by","notes"');
    expect(rows.find((r) => r.startsWith('"Jasmine rice"'))).toBe('"Jasmine rice","to buy","375","g","","","","",""');
    expect(rows.find((r) => r.startsWith('"Beans"'))).toMatch(/"amount unknown","unknown"/);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });

  it("the store cart shows packages and prices only where known; another destination never carries them", () => {
    const priced = [line({ key: "rice", name: "Rice", netMeal: { quantity: "375", unit: "g" }, product: { id: "p", ref: "u", name: "Rice 2 lb", ingredientKey: "rice", packageQty: "907", packageUnit: "g", variableWeight: false, fixture: true, retailer: "simulated" } as never, price: { id: "pr", amountMinor: 349 } as never, toSend: 1 })];
    expect(buildShoppingList(priced, "retailer_cart").items[0]).toMatchObject({ storePackages: 1, priceMinor: 349 });
    expect(buildShoppingList(priced, "instacart_list").items[0]).toMatchObject({ storePackages: null, priceMinor: null });
    expect(buildShoppingList(priced, "manual").fingerprint).not.toBe(buildShoppingList(priced, "instacart_list").fingerprint);
  });

  it("a line stored before net amounts existed falls back to the full meal amount, never to 'have enough'", () => {
    const old = line({ key: "rice", name: "Rice", meal: meal("375", "g") });
    delete (old as Partial<RequirementLine>).netMeal;
    expect(buildShoppingList([old], "manual").items[0]).toMatchObject({ state: "to_buy", amount: { quantity: "375", unit: "g" } });
  });
});

describe("import drafts (URL-10/11)", () => {
  const parsed = (o: Partial<DraftLine["parsed"]>) => ({ quantity: null, unit: null, name: "x", form: null, status: "requires_review" as const, reasons: [], ...o });
  it("only a cleanly parsed line starts as a proposal; anything else waits for a member", () => {
    expect(initialDecision(parsed({ quantity: "1.5", unit: "cup", name: "rice", status: "parsed" }))).toEqual({ use: true, name: "rice", quantity: "1.5", unit: "cup", form: "raw" });
    expect(initialDecision(parsed({ quantity: "1", unit: null, name: "can tomatoes" }))).toBeNull();
  });

  it("a draft without servings, with an undecided line or with an unknown unit can't be confirmed", () => {
    const lines: DraftLine[] = [
      { raw: "1 cup rice", parsed: parsed({ status: "parsed" }), decision: { use: true, name: "rice", quantity: "1", unit: "cup", form: "raw" } },
      { raw: "1 can tomatoes", parsed: parsed({}), decision: null },
    ];
    expect(draftProblems({ title: "R", servings: null, lines }).join(" ")).toMatch(/servings.*1 ingredient line needs a quick check/s); // wording 2026-10-09 (was "needs a decision")
    const bad: DraftLine[] = [{ raw: "1 can x", parsed: parsed({}), decision: { use: true, name: "x", quantity: "1", unit: "can", form: "raw" } }];
    expect(draftProblems({ title: "R", servings: 2, lines: bad }).join(" ")).toMatch(/needs a unit Table knows/);
    const skipped: DraftLine[] = [{ raw: "salt", parsed: parsed({}), decision: { use: false } }];
    expect(draftProblems({ title: "R", servings: 2, lines: skipped })).toEqual(["Use at least one ingredient."]);
    expect(draftProblems({ title: "R", servings: 2, lines: [lines[0]] })).toEqual([]);
  });

  // Changed 2026-10-09 (exact amounts): a non-terminating per-serving amount keeps 12 decimal places (was 4), and a
  // whole-recipe amount may be an exact fraction; so a tiny amount is no longer "too small to split".
  it("per-serving amounts are exact when they terminate and say when they were rounded", () => {
    expect(perPortion("1.5", 4)).toEqual({ value: "0.375", rounded: false });
    expect(perPortion("1", 3)).toEqual({ value: "0.333333333333", rounded: true });
    expect(perPortion("1/3", 4)).toEqual({ value: "0.083333333333", rounded: true });
    expect(perPortion("1 1/2", 2)).toEqual({ value: "0.75", rounded: false });
    expect(draftProblems({ title: "R", servings: 100, lines: [{ raw: "x", parsed: parsed({}), decision: { use: true, name: "x", quantity: "0.001", unit: "g", form: "raw" } }] })).toEqual([]);
  });
});
