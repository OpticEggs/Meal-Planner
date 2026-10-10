/**
 * The exact quantity type (EQ, 2026-10-10). Purchasing computes with fractions; values are rounded only where
 * they are shown, fingerprinted or priced, and that rounding must give exactly the text decimal.js gave for
 * the same value — so every requirement-line fingerprint (and every approval bound to one) computed from
 * legacy rows is unchanged by the switch.
 */
import { describe, expect, it } from "vitest";
import { Q, convertQ, packagesForQ } from "@/domain/exact";
import { D, convert, packagesFor } from "@/domain/units";
import { eventDemand, perPortionExact } from "@/domain/recipes/plate";
import type { RecipeVersion } from "@/domain/types";

describe("Q", () => {
  it("is exact: 2/3 × 3 = 2, 1/3 + 1/3 + 1/3 = 1, reduced text", () => {
    expect(Q.frac(2, 3).mul(3).toString()).toBe("2");
    expect(Q.frac(1, 3).plus(Q.frac(1, 3)).plus(Q.frac(1, 3)).eq(1)).toBe(true);
    expect(Q.of("0.6667").toString()).toBe("6667/10000");
    expect(Q.of("4/6").toString()).toBe("2/3");
    expect(Q.of("1e-7").toString()).toBe("1/10000000");
    expect(Q.of("-1.5").ceil()).toBe(BigInt(-1));
    expect(Q.of("2.0000000000001").ceil()).toBe(BigInt(3));
    expect(Q.of("2").ceil()).toBe(BigInt(2));
  });

  it("rounds for display exactly as decimal.js toDecimalPlaces did (fingerprint compatibility)", () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed);
    const samples = ["0", "0.0005", "0.0015", "1.0005", "2.0001", "0.6667", "0.666666666666", "123.4565", "0.0000004", "0.000001", "9.9995", "0.125", "14.78676478125"];
    for (let i = 0; i < 4000; i++) samples.push(`${rnd() % 1000}.${String(rnd()).padStart(9, "0").slice(0, 1 + (rnd() % 12))}`);
    for (const s of samples) {
      for (const places of [0, 2, 3, 6]) {
        expect(Q.of(s).toDecimal(places), `${s} @ ${places}`).toBe(new D(s).toDecimalPlaces(places).toString());
        expect(Q.of(s).minus(Q.of(s).mul(2)).toDecimal(places), `-${s} @ ${places}`).toBe(new D(s).neg().toDecimalPlaces(places).toString().replace(/^-0$/, "0"));
      }
    }
    // Non-terminating values: decimal.js at 40 significant digits, then rounded, gives the same text.
    for (const [n, d] of [[2, 3], [8, 3], [1, 7], [22, 7], [1000, 3], [5, 6]] as const) {
      for (const places of [2, 3, 6]) expect(Q.frac(n, d).toDecimal(places)).toBe(new D(n).div(d).toDecimalPlaces(places).toString());
    }
  });

  it("converts units exactly and agrees with decimal.js wherever the decimal result terminates", () => {
    expect(convertQ(Q.of(1), "cup", "ml")!.toString()).toBe(Q.of("236.5882365").toString());
    expect(convertQ(Q.of(16), "tbsp", "cup")!.toString()).toBe("1");
    expect(convertQ(Q.of(1), "lb", "oz")!.toString()).toBe("16");
    expect(convertQ(Q.of(1), "oz", "ml")).toBeNull(); // mass oz never becomes volume
    expect(convertQ(Q.of(3), "bunch", "bunch")!.toString()).toBe("3");
    for (const [qty, f, t] of [["2", "lb", "g"], ["1.5", "cup", "ml"], ["3", "tbsp", "ml"], ["10", "fl_oz", "ml"]] as const) {
      expect(Q.of(convert(qty, f, t)!.toFixed()).eq(convertQ(Q.of(qty), f, t)!)).toBe(true);
    }
  });

  it("counts packages with an exact ceiling — no tolerance either way", () => {
    expect(packagesForQ(Q.frac(2, 3).mul(3), Q.of(1))).toBe(2);
    expect(packagesForQ(Q.of("24.000000001"), Q.of(24))).toBe(2);
    expect(packagesForQ(Q.of("2").plus("0.000000000002"), Q.of(1))).toBe(3);
    expect(packagesForQ(Q.zero, Q.of(1))).toBe(0);
    expect(packagesFor(new D("24.000000001"), new D(24))).toBe(2); // the decimal.js rule it replaces, unchanged
  });
});

describe("demand from rows", () => {
  const recipe = (rows: { q: string; amount?: string; servings?: number; unit?: string }[]): RecipeVersion => ({
    id: "v", recipeId: "r", versionNo: 1, title: "T", cuisine: null, summary: null, effortMinutes: null, effortLevel: null, leftoverFriendly: false,
    instructions: "", reheatInstructions: "", provenance: "manual", sourceLabel: null, estimate: false, components: [{ key: "main", name: "Main", sort: 0 }],
    ingredients: rows.map((r) => ({ componentKey: "main", ingredientKey: "onion", quantity: r.q, unit: r.unit ?? "each", form: "raw", exactAmount: r.amount, exactServings: r.servings })),
  });
  const plates = (n: string) => [{ cookingEventId: "e", memberId: "j", kind: "dinner" as const, night: "2026-10-16", componentPortions: { main: n } }];

  it("an exact row uses its amount ÷ servings; a legacy row its stored decimal", () => {
    expect(perPortionExact({ quantity: "0.666666666666", exactAmount: "2", exactServings: 3 })).toEqual({ value: Q.frac(2, 3), exact: true });
    expect(perPortionExact({ quantity: "0.6667" })).toEqual({ value: Q.of("0.6667"), exact: false });
  });

  it("2 onions for 3 servings, 3 plates → exactly 2; the legacy 4-place row → 2.0001 as stored", () => {
    const exact = eventDemand(recipe([{ q: "0.666666666666", amount: "2", servings: 3 }]), plates("3")).lines[0];
    expect(exact.exact.toString()).toBe("2");
    expect(exact.fromExactRows).toBe(true);
    const legacy = eventDemand(recipe([{ q: "0.6667" }]), plates("3")).lines[0];
    expect(legacy.exact.toString()).toBe("20001/10000");
    expect(legacy.fromExactRows).toBe(false);
  });

  it("half plates stay exact (2/3 × 1.5 = 1)", () => {
    expect(eventDemand(recipe([{ q: "0.666666666666", amount: "2", servings: 3 }]), plates("1.5")).lines[0].exact.toString()).toBe("1");
  });
});
