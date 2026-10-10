/**
 * Unit helpers over UNIT_REGISTRY and the public API surface of the package.
 */
import { describe, expect, it } from "vitest";
import * as api from "../../src/index";
import { UNIT_REGISTRY } from "../../src/contract";
import { dimensionOf, isUnitCode, tryUnitV1, UNIT_CODES, unitV1 } from "../../src/units";

describe("unit helpers", () => {
  it("look up canonical codes only (own keys)", () => {
    expect(isUnitCode("fl_oz")).toBe(true);
    for (const bad of ["cups", "toString", "__proto__", "constructor", "", 1, null]) expect(isUnitCode(bad)).toBe(false);
    expect(dimensionOf("oz")).toBe("mass");
    expect(dimensionOf("fl_oz")).toBe("volume");
    expect(dimensionOf("clove")).toBe("count");
    expect(dimensionOf("pinch")).toBe("imprecise");
    expect(dimensionOf("hasOwnProperty")).toBeNull();
    expect(UNIT_CODES).toEqual(Object.keys(UNIT_REGISTRY));
  });

  it("build contract units", () => {
    expect(unitV1("tbsp", "Tbsp")).toEqual({ canonical: "tbsp", dimension: "volume", source: "Tbsp" });
    expect(unitV1("each")).toEqual({ canonical: "each", dimension: "count", source: "" });
    expect(tryUnitV1("cups")).toBeNull();
    expect(() => unitV1("cups" as "cup")).toThrow(/unknown unit code/);
  });
});

describe("public API", () => {
  it("exports the contract, rational helpers (also by name), engines, page extraction and validators", () => {
    for (const name of [
      "SCHEMA_VERSION", "PACKAGE_NAME", "PACKAGE_VERSION", "LIMITS", "UNIT_REGISTRY", "REASONS", "DIAGNOSTICS", "rationalMath", "rational", "add", "mul", "div", "cmp",
      "eq", "gcd", "fromDecimalString", "parseRationalText", "isTerminating", "formatMixed", "formatDecimal", "toDecimal", "withinBounds", "toExactQuantity",
      "fromExactQuantity", "parseIngredientV1", "extractRecipePage", "ENGINES", "DEFAULT_ENGINE_ID", "getEngine", "validateParsedIngredientV1",
      "validateRecipeExtractionV1", "reasonLabel", "unitV1", "dimensionOf",
    ]) {
      expect(api, name).toHaveProperty(name);
    }
    expect(api.rationalMath.toExactQuantity).toBe(api.toExactQuantity);
  });

  it("parseIngredientV1 uses the default engine unless told otherwise", () => {
    expect(api.parseIngredientV1("1/2 cup sugar")).toEqual(api.ENGINES[api.DEFAULT_ENGINE_ID].parse("1/2 cup sugar"));
    expect(api.parseIngredientV1("⅓ cup sugar", { engine: "legacy-table-import-2+suggestion" }).reasons).toContain("legacy_suggestion_applied");
    expect(api.parseIngredientV1("1/2 cup sugar")).toMatchObject({
      status: "ready", name: "sugar", quantity: { kind: "exact", numerator: "1", denominator: "2", display: "1/2" }, unit: { canonical: "cup", source: "cup" },
    });
    expect(api.parseIngredientV1("0.5 cup sugar").quantity).toEqual({ kind: "exact", numerator: "1", denominator: "2", display: "0.5" });
    expect(api.parseIngredientV1("2 T butter").unit).toEqual({ canonical: "tbsp", dimension: "volume", source: "T" });
    expect(api.parseIngredientV1("8 fl. oz. cream").unit).toEqual({ canonical: "fl_oz", dimension: "volume", source: "fl. oz." });
    expect(api.parseIngredientV1("4 ea. tortillas").unit).toEqual({ canonical: "each", dimension: "count", source: "ea." });
    expect(api.parseIngredientV1("2 eggs").unit).toEqual({ canonical: "each", dimension: "count", source: "" });
    expect(api.parseIngredientV1("200g flour").unit).toEqual({ canonical: "g", dimension: "mass", source: "g" });
    expect(api.parseIngredientV1(null as unknown as string)).toMatchObject({ raw: "", normalized: "", status: "unsupported", reasons: ["empty_line"] });
  });
});
