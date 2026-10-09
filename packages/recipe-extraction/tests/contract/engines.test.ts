/**
 * Contract checks of the two legacy engines over the whole parity corpus: every output validates,
 * outputs are deterministic, and the v1 translation is faithful to the frozen legacy reading (the only
 * intended deviation is `input_truncated`).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { fromDecimalString, eq, rational } from "../../src/rational";
import { DEFAULT_ENGINE_ID, ENGINES, getEngine } from "../../src/ingredient/engines";
import { LEGACY_CONTROLS, legacyNormalized, legacyReasonCode, leadingAmountText } from "../../src/ingredient/legacy";
import { parseIngredientLine } from "../../src/legacy/ingredient-line";
import { validateParsedIngredientV1 } from "../../src/validate";
import { parseIngredientV1, reasonLabel, REASONS } from "../../src/index";
import { ingredientCorpus, NON_STRING_INPUTS } from "../parity/corpus";

const corpus = ingredientCorpus();
const LEGACY = ENGINES["legacy-table-import-2"];
const SUGGEST = ENGINES["legacy-table-import-2+suggestion"];
const show = (s: unknown) => (typeof s === "string" ? JSON.stringify(s.slice(0, 100)) : String(s));

describe("engine registry", () => {
  it("has the two Phase 1 engines plus the Phase 2 candidate, and the faithful one is the default", () => {
    expect(Object.keys(ENGINES)).toEqual(["legacy-table-import-2", "legacy-table-import-2+suggestion", "semantic-v1"]);
    expect(DEFAULT_ENGINE_ID).toBe("legacy-table-import-2");
    expect(getEngine()).toBe(LEGACY);
    expect(getEngine("legacy-table-import-2+suggestion")).toBe(SUGGEST);
    for (const e of Object.values(ENGINES)) expect(e.description.length).toBeGreaterThan(20);
  });

  it("refuses unknown engine ids clearly, including prototype keys", () => {
    for (const id of ["nope", "", "toString", "__proto__", "constructor", "LEGACY-TABLE-IMPORT-2"]) {
      expect(() => getEngine(id)).toThrow(/unknown ingredient engine/);
      expect(() => parseIngredientV1("1 cup flour", { engine: id })).toThrow(/unknown ingredient engine/);
    }
  });

  it("labels every reason code and falls back for unknown codes", () => {
    for (const [code, def] of Object.entries(REASONS)) expect(reasonLabel(code)).toBe(def.label);
    expect(reasonLabel("toString")).toBe(REASONS.unclassified.label);
    expect(reasonLabel("no_such_code")).toBe(REASONS.unclassified.label);
  });
});

describe.each([
  ["legacy-table-import-2", LEGACY],
  ["legacy-table-import-2+suggestion", SUGGEST],
] as const)("%s over the parity corpus", (_id, engine) => {
  it("every output validates (including non-string inputs)", () => {
    const bad: string[] = [];
    for (const line of [...corpus.all, ...(NON_STRING_INPUTS as string[])]) {
      const problems = validateParsedIngredientV1(engine.parse(line));
      if (problems.length) bad.push(`${show(line)}: ${problems.join("; ")}`);
      if (bad.length >= 20) break;
    }
    expect(bad).toEqual([]);
  });

  it("is deterministic: the same line twice gives identical JSON text", () => {
    const bad: string[] = [];
    for (const line of [...corpus.literals, ...corpus.hostile, ...corpus.random.slice(0, 5_000)]) {
      if (JSON.stringify(engine.parse(line)) !== JSON.stringify(engine.parse(line))) bad.push(show(line));
    }
    expect(bad).toEqual([]);
  });
});

describe("legacy-table-import-2 is a faithful translation", () => {
  it("restates legacy's control/bidi character class exactly", () => {
    const src = readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src/legacy/ingredient-line.ts"), "utf8");
    const m = /\(typeof raw === "string" \? raw : ""\)\.replace\(\/(\[[^\]]*\])\/g, " "\)/.exec(src);
    expect(m).not.toBeNull();
    const frozen = new RegExp(m![1], "g");
    const differ: number[] = [];
    for (let c = 0; c <= 0xffff; c++) {
      const ch = String.fromCharCode(c);
      frozen.lastIndex = 0;
      LEGACY_CONTROLS.lastIndex = 0;
      if (frozen.test(ch) !== LEGACY_CONTROLS.test(ch)) differ.push(c);
    }
    expect(differ).toEqual([]);
  });

  it("maps every legacy reason in the corpus to a stable code (never unclassified)", () => {
    const seen = new Map<string, string>();
    for (const line of corpus.all) for (const r of parseIngredientLine(line).reasons) seen.set(r, legacyReasonCode(r));
    expect(seen.size).toBeGreaterThan(20); // includes many "unit not supported: <word>" variants
    expect([...seen.entries()].filter(([, code]) => code === "unclassified")).toEqual([]);
    expect(legacyReasonCode("something new")).toBe("unclassified");
  });

  it("keeps every legacy field: status, name, quantity (exactly), unit, note, form", () => {
    const bad: string[] = [];
    let quantities = 0;
    let decimals = 0;
    for (const line of corpus.all) {
      const l = parseIngredientLine(line);
      const v = LEGACY.parse(line);
      const { truncated } = legacyNormalized(line);
      const emptyLine = l.reasons.length === 1 && l.reasons[0] === "empty line";
      const expectedStatus = emptyLine ? "unsupported" : l.status === "parsed" && !truncated ? "ready" : "needs_review";
      const problems: string[] = [];
      if (v.status !== expectedStatus) problems.push(`status ${v.status} ≠ ${expectedStatus}`);
      if (v.reasons.includes("unclassified")) problems.push("unclassified reason");
      if (v.reasons.includes("input_truncated") !== truncated) problems.push("input_truncated mismatch");
      if (v.reasons.length !== new Set([...l.reasons.map(legacyReasonCode), ...(truncated ? ["input_truncated"] : [])]).size) problems.push("reason count");
      if (v.status !== "unsupported") {
        if (v.name !== (l.name === "" ? null : l.name)) problems.push("name");
        if ((v.quantity === null) !== (l.quantity === null)) problems.push("quantity presence");
        if (v.quantity && l.quantity) {
          quantities++;
          if (v.quantity.kind !== "exact" || !eq(rational(BigInt(v.quantity.numerator), BigInt(v.quantity.denominator)), fromDecimalString(l.quantity)!)) problems.push("quantity value");
          const amount = leadingAmountText(v.normalized.replace(/^[•·*\-–]\s+/, "").replace(/\(\s*\$\s*(?:\d{1,6}(?:\.\d{1,2})?|\.\d{1,2})\s*\*{0,3}\s*\)/g, " ").replace(/\s+/g, " ").trim());
          if (amount === null) problems.push("amount text not found");
          if (amount?.includes(".")) {
            decimals++;
            if (v.quantity.kind === "exact" && /\//.test(v.quantity.display)) problems.push("decimal written as fraction");
          }
        }
        if ((v.unit?.canonical ?? null) !== l.unit) problems.push("unit");
        if (v.unit && v.unit.canonical !== "each" && v.unit.source === "") problems.push("written unit lost");
      } else if (v.name !== null || v.quantity !== null || v.unit !== null) problems.push("unsupported line carries values");
      if (v.note !== l.note) problems.push("note");
      if (v.form !== l.form) problems.push("form");
      if (v.raw !== line) problems.push("raw");
      if (problems.length) bad.push(`${show(line)}: ${problems.join(", ")}`);
      if (bad.length >= 20) break;
    }
    expect(bad).toEqual([]);
    expect(quantities).toBeGreaterThan(5_000);
    expect(decimals).toBeGreaterThan(500);
  });

  it("deviates from legacy only by input_truncated, and only when legacy cut the line", () => {
    const at500 = `2 cups ${"a".repeat(493)}`; // exactly 500 after cleaning
    const at501 = `2 cups ${"a".repeat(494)}`;
    expect(at500.length).toBe(500);
    expect(LEGACY.parse(at500)).toMatchObject({ status: "ready", reasons: [] });
    expect(parseIngredientLine(at501).status).toBe("parsed"); // legacy silently reads the first 500 characters
    expect(LEGACY.parse(at501)).toMatchObject({ status: "needs_review", reasons: ["input_truncated"], normalized: at500 });
    // Leading/trailing whitespace is not "cut": the cleaned line is what counts.
    expect(LEGACY.parse(`${" ".repeat(2_000)}2 cups flour`)).toMatchObject({ status: "ready", reasons: [], normalized: "2 cups flour" });
  });
});

describe("legacy-table-import-2+suggestion", () => {
  it("applies the legacy suggestion exactly as proposed (0.3333 stays 3333/10000)", () => {
    const r = SUGGEST.parse("⅓ cup sugar");
    expect(r).toMatchObject({
      status: "needs_review",
      name: "sugar",
      quantity: { kind: "exact", numerator: "3333", denominator: "10000", display: "0.3333" },
      unit: { canonical: "cup", dimension: "volume", source: "" },
      form: "raw",
      reasons: ["legacy_fraction_not_exact_decimal", "legacy_suggestion_applied"],
    });
    expect(SUGGEST.parse("salt to taste")).toMatchObject({ status: "needs_review", quantity: null, unit: null, reasons: ["legacy_no_fixed_quantity", "quantity_missing", "legacy_suggestion_applied"] });
    expect(SUGGEST.parse("2 cups flour")).toEqual(LEGACY.parse("2 cups flour")); // parsed lines carry no suggestion
  });

  it("agrees with the legacy suggestion over the whole corpus", () => {
    const bad: string[] = [];
    let applied = 0;
    let unrepresentable = 0;
    for (const line of corpus.all) {
      const l = parseIngredientLine(line);
      const v = SUGGEST.parse(line);
      const base = LEGACY.parse(line);
      if (!l.suggestion) {
        if (JSON.stringify(v) !== JSON.stringify(base)) bad.push(`${show(line)}: differs without a suggestion`);
        continue;
      }
      applied++;
      if (v.status !== "needs_review" || v.reasons[v.reasons.length - 1] !== "legacy_suggestion_applied") bad.push(`${show(line)}: status/reason`);
      if (l.suggestion.use) {
        if (v.name !== l.suggestion.name || v.form !== l.suggestion.form) bad.push(`${show(line)}: name/form`);
        if (v.reasons.includes("unclassified")) {
          // Only a proposal the contract cannot carry (denominator above 1 000 000) is unclassified.
          unrepresentable++;
          if (v.quantity !== null || v.unit !== null || fromDecimalString(l.suggestion.quantity)!.d <= BigInt(1_000_000)) bad.push(`${show(line)}: unclassified`);
          continue;
        }
        const q = fromDecimalString(l.suggestion.quantity)!;
        const ok = v.quantity?.kind === "exact" && eq(rational(BigInt(v.quantity.numerator), BigInt(v.quantity.denominator)), q);
        if (!ok) bad.push(`${show(line)}: quantity`);
        if (v.unit?.canonical !== l.suggestion.unit) bad.push(`${show(line)}: unit`);
      } else if (v.quantity !== null || v.unit !== null) bad.push(`${show(line)}: leave-out kept an amount`);
      if (bad.length >= 20) break;
    }
    expect(bad).toEqual([]);
    expect(applied).toBeGreaterThan(2_000);
    expect(unrepresentable).toBeLessThan(10); // rare: products of two six-decimal amounts
  });

  it("a proposal the contract cannot carry keeps neither amount nor unit, and says unclassified", () => {
    const line = "0.000001 (1.5 L) box half-and-half";
    expect(parseIngredientLine(line).suggestion).toEqual({ use: true, quantity: "0.0000015", unit: "l", name: "half-and-half", form: "raw" });
    expect(SUGGEST.parse(line)).toMatchObject({
      status: "needs_review", name: "half-and-half", quantity: null, unit: null,
      reasons: ["legacy_parenthetical_number", "legacy_more_than_one_quantity", "unclassified", "legacy_suggestion_applied"],
    });
  });
});
