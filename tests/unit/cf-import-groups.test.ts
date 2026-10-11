/**
 * Catalog-first Q5/Q6 (2026-10-11): the review model, not the parser. Group heading lines start a component and are
 * never ingredients; a line with no amount at all starts as "Needs a quantity" (never an invented amount, never
 * silently omitted); vague amounts and ranges keep today's behaviour (a person decides).
 */
import { describe, expect, it } from "vitest";
import { parseIngredientLine } from "@/server/integrations/recipe-import/ingredient-line";
import { decisionProblem, draftProblems, hasNoAmount, headingName, initialDecision, isHeadingLine, type DraftLine, type ParsedLine } from "@/domain/recipes/import";

const parsed = (raw: string): ParsedLine => {
  const p = parseIngredientLine(raw);
  return { quantity: p.quantity, unit: p.unit, name: p.name, form: p.form, status: p.status, reasons: p.reasons, note: p.note ?? null, range: p.range, alternatives: p.alternatives };
};
const initial = (raw: string) => initialDecision(parsed(raw), raw);

describe("CF-B group headings (Q5)", () => {
  it("CF-B: a line with no amount ending in ':' or reading 'For the …' is a heading", () => {
    for (const raw of ["For the pickled onions:", "Toppings:", "For the brisket", "FOR THE SAUCE:", "- For the slaw:"]) {
      expect(isHeadingLine(raw, parsed(raw)), raw).toBe(true);
      expect(initial(raw), raw).toEqual({ use: false, kind: "heading" });
    }
    for (const raw of ["Sauce: 1 cup cream", "For the chicken: 1 lb chicken", "1 red onion, thinly sliced", "Flour tortillas, for serving", "salt to taste", "Salt:"]) {
      expect(isHeadingLine(raw, parsed(raw)), raw).toBe(false);
    }
  });

  it("CF-B: heading names drop 'For the' and the colon", () => {
    expect(headingName("For the pickled onions:")).toBe("Pickled onions");
    expect(headingName("Toppings:")).toBe("Toppings");
    expect(headingName("FOR THE SAUCE:")).toBe("Sauce");
    expect(headingName("For the brisket")).toBe("Brisket");
  });
});

describe("CF-B Needs a quantity (Q6)", () => {
  it("CF-B: a line with no amount at all starts as Needs a quantity with its name; no amount is invented", () => {
    expect(initial("Flour tortillas, for serving")).toEqual({ use: false, kind: "needs_quantity", name: "Flour tortillas" });
    expect(initial("Crumbled cotija, for serving")).toEqual({ use: false, kind: "needs_quantity", name: "Crumbled cotija" });
    expect(hasNoAmount(parsed("Lime wedges, for serving"))).toBe(true);
  });

  it("CF-B: vague amounts, ranges, choices, seasonings and lines with a digit keep today's behaviour", () => {
    expect(initial("a pinch of cayenne")).toBeNull();
    expect(initial("2-3 limes")).toBeNull();
    expect(initial("salt or pepper")).toBeNull();
    expect(initial("Sauce: 1 cup cream")).toBeNull();
    expect(initial("salt to taste")).toEqual({ use: false });
    expect(initial("1 red onion, thinly sliced")).toEqual({ use: true, name: "red onion", quantity: "1", unit: "each", form: "raw" });
    expect(hasNoAmount(parsed("a pinch of cayenne"))).toBe(false);
    expect(hasNoAmount(parsed("2-3 limes"))).toBe(false);
  });

  it("CF-B: Needs a quantity needs a name, and on its own is not a recipe (at least one used row with an amount)", () => {
    expect(decisionProblem({ use: false, kind: "needs_quantity", name: " " })).toMatch(/name/);
    expect(decisionProblem({ use: false, kind: "needs_quantity", name: "cilantro" })).toBeNull();
    const line = (raw: string): DraftLine => ({ raw, parsed: parsed(raw), decision: initial(raw) });
    const only = draftProblems({ title: "T", servings: 4, lines: [line("Toppings:"), line("Fresh cilantro, for serving")] });
    expect(only).toEqual(["Use at least one ingredient."]);
    expect(draftProblems({ title: "T", servings: 4, lines: [line("Toppings:"), line("Fresh cilantro, for serving"), line("1 lb beef")] })).toEqual([]);
  });
});
