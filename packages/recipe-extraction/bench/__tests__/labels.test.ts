import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LabelValidationError, checkCorpus, loadIngredientCases, loadPageLabels, parseIngredientJsonl, validatePageLabels } from "../labels";
import { CATEGORIES } from "../types";
import { FIXTURES } from "./helpers";

const base = () => ({
  id: "ing-dev-0001",
  split: "dev",
  categories: ["fraction_third", "nested_parens", "source_choice"],
  input: "1/3 cup pesto (homemade (or store-bought))",
  expect: {
    status: "ready",
    name: "pesto",
    quantity: "1/3",
    unit: "cup",
    packageSize: null as unknown,
    equivalents: [] as unknown[],
    form: null as unknown,
    note: "homemade or store-bought" as unknown,
    alternatives: [] as unknown[],
    optional: false as unknown,
    approximate: false,
    amountUnstated: null as unknown,
  } as Record<string, unknown>,
  accept: {} as Record<string, unknown>,
  severity: "high",
  seasoningClass: null as unknown,
  provenance: { kind: "owner_reported_line", source: "Owner report in the 2026-10-09 handoff" } as Record<string, unknown>,
  rationale: "Nested source-choice parenthetical is a note; 1/3 is exact.",
});
type Case = ReturnType<typeof base> & Record<string, unknown>;

function errorsFor(mutate: (c: Case) => void, split: "dev" | "holdout" = "dev"): string[] {
  const c = base() as Case;
  mutate(c);
  try {
    parseIngredientJsonl(JSON.stringify(c) + "\n", split, "test.jsonl");
  } catch (err) {
    expect(err).toBeInstanceOf(LabelValidationError);
    return (err as LabelValidationError).errors;
  }
  return [];
}

describe("ingredient label files", () => {
  it("the real dev and holdout files load and meet the corpus minimums", () => {
    const cases = loadIngredientCases(FIXTURES);
    const dev = cases.filter((c) => c.split === "dev");
    const hold = cases.filter((c) => c.split === "holdout");
    expect(dev.length).toBeGreaterThanOrEqual(130);
    expect(hold.length).toBeGreaterThanOrEqual(90);
    for (const cat of CATEGORIES) {
      expect(dev.filter((c) => c.categories.includes(cat)).length, `dev ${cat}`).toBeGreaterThanOrEqual(3);
      expect(hold.filter((c) => c.categories.includes(cat)).length, `holdout ${cat}`).toBeGreaterThanOrEqual(2);
    }
    const devInputs = new Set(dev.map((c) => c.input));
    expect(hold.filter((c) => devInputs.has(c.input))).toEqual([]);
  });

  it("dev holds the owner's pesto line exactly as the CONTRACT §8 example, and the plan examples", () => {
    const first = readFileSync(path.join(FIXTURES, "ingredients/dev.jsonl"), "utf8").split("\n")[0];
    expect(JSON.parse(first)).toEqual(base());
    const inputs = new Set(loadIngredientCases(FIXTURES, ["dev"]).map((c) => c.input));
    for (const line of ["1⅓ cups rolled oats", "2 (15 oz) cans black beans, drained", "1 cup 2% milk", "1 cup milk or cream", "salt and pepper to taste", "salt and pepper, to taste", "1 red bell pepper, diced", "2 oz cheese", "2 fl oz broth", "1 cup flour (packed)", "3 cloves garlic"])
      expect(inputs.has(line), line).toBe(true);
  });

  it("the holdout has at least three pesto-family lines that are not the pesto line", () => {
    const hold = loadIngredientCases(FIXTURES, ["holdout"]);
    const family = hold.filter((c) => c.categories.includes("nested_parens") && c.categories.includes("source_choice") && c.categories.includes("fraction_third"));
    expect(family.length).toBeGreaterThanOrEqual(3);
    expect(family.some((c) => c.input === base().input)).toBe(false);
  });

  it("accepts the valid base case", () => {
    expect(errorsFor(() => {})).toEqual([]);
  });

  const rules: [string, (c: Case) => void, RegExp, ("dev" | "holdout")?][] = [
    ["missing expect field", (c) => delete c.expect.form, /missing field 'form'/],
    ["unknown expect field", (c) => (c.expect.extra = 1), /unknown field 'extra'/],
    ["unknown case field", (c) => (c.surprise = true), /unknown field 'surprise'/],
    ["missing rationale field", (c) => delete (c as Record<string, unknown>).rationale, /missing field 'rationale'/],
    ["id pattern", (c) => (c.id = "dev-1"), /id must match ing-dev-NNNN/],
    ["id prefix for the file's split", (c) => (c.split = "holdout"), /id must match ing-hold-NNNN/, "holdout"],
    ["split matches the file", (c) => (c.split = "holdout"), /does not match the file/],
    ["unknown category", (c) => (c.categories = ["fractions"]), /unknown category 'fractions'/],
    ["duplicate category", (c) => (c.categories = ["range", "range"]), /duplicate category/],
    ["empty categories", (c) => (c.categories = []), /non-empty array/],
    ["input type", (c) => ((c as Record<string, unknown>).input = 3), /input must be a string/],
    ["status enum", (c) => (c.expect.status = "ok"), /status: must be one of/],
    ["quantity syntax", (c) => (c.expect.quantity = "a third"), /quantity: 'a third'/],
    ["quantity zero", (c) => (c.expect.quantity = "0"), /quantity: '0'/],
    ["quantity zero denominator", (c) => (c.expect.quantity = "1/0"), /quantity: '1\/0'/],
    ["range order", (c) => ((c.expect.status = "needs_review"), (c.expect.quantity = "3..2")), /quantity: '3..2'/],
    ["range equal ends", (c) => ((c.expect.status = "needs_review"), (c.expect.quantity = "2..2")), /quantity: '2..2'/],
    ["unit in UNIT_REGISTRY", (c) => (c.expect.unit = "cups"), /'cups' is not a UNIT_REGISTRY code/],
    ["package size is mass or volume", (c) => (c.expect.packageSize = { quantity: "1", unit: "can" }), /package size must be mass or volume/],
    ["package size quantity", (c) => (c.expect.packageSize = { quantity: "1..2", unit: "oz" }), /packageSize.quantity/],
    ["package size shape", (c) => (c.expect.packageSize = "15 oz"), /must be \{ quantity, unit \}/],
    ["equivalent unit", (c) => (c.expect.equivalents = [{ quantity: "120", unit: "grams" }]), /equivalents\[0\]\.unit/],
    ["form enum", (c) => (c.expect.form = "baked"), /form: must be/],
    ["note non-empty", (c) => (c.expect.note = ""), /note: must be a non-empty string or null/],
    ["alternatives ≥ 2", (c) => ((c.expect.status = "needs_review"), (c.expect.name = null), (c.expect.alternatives = ["milk"])), /at least 2 entries or none/],
    ["alternatives unique", (c) => ((c.expect.status = "needs_review"), (c.expect.name = null), (c.expect.alternatives = ["milk", "Milk"])), /duplicate option/],
    ["optional boolean", (c) => (c.expect.optional = "no"), /optional: must be a boolean/],
    ["amountUnstated enum", (c) => ((c.expect.quantity = null), (c.expect.unit = null), (c.expect.amountUnstated = "plenty")), /amountUnstated: must be one of/],
    ["ready needs a name", (c) => (c.expect.name = null), /ready label needs a name/],
    ["ready has no range", (c) => (c.expect.quantity = "1..2"), /cannot have a range quantity/],
    ["ready quantity needs a unit", (c) => (c.expect.unit = null), /with a quantity needs a unit/],
    ["ready without quantity needs amountUnstated", (c) => ((c.expect.quantity = null), (c.expect.unit = null)), /without a quantity needs amountUnstated/],
    ["ready has no alternatives", (c) => (c.expect.alternatives = ["a", "b"]), /cannot offer alternatives/],
    ["unsupported has null name/quantity/unit/package", (c) => (c.expect.status = "unsupported"), /unsupported label must have name null/],
    ["a choice of ingredients has name null", (c) => ((c.expect.status = "needs_review"), (c.expect.alternatives = ["a", "b"])), /has name null \(§7\.8\)/],
    ["amountUnstated only without an amount", (c) => (c.expect.amountUnstated = "to_taste"), /amountUnstated must be null when the line states an amount/],
    ["accept keys", (c) => (c.accept = { unit: ["cup"] }), /unknown field 'unit'/],
    ["accept.name shape", (c) => (c.accept = { name: "pesto" }), /accept\.name: must be a non-empty array/],
    ["accept.alternatives shape", (c) => (c.accept = { alternatives: [["only-one"]] }), /accept\.alternatives/],
    ["severity enum", (c) => (c.severity = "critical"), /severity must be one of/],
    ["seasoningClass enum", (c) => (c.seasoningClass = "salt"), /seasoningClass must be one of/],
    ["provenance kind", (c) => (c.provenance = { kind: "scraped", source: "x" }), /provenance\.kind/],
    ["provenance source", (c) => (c.provenance = { kind: "synthetic_pattern", source: " " }), /provenance\.source/],
    ["provenance present", (c) => delete (c as Record<string, unknown>).provenance, /missing field 'provenance'|provenance must be/],
    ["rationale non-empty", (c) => (c.rationale = ""), /rationale must be a non-empty string/],
  ];

  it.each(rules)("rejects: %s", (_name, mutate, pattern, split) => {
    const errors = errorsFor(mutate, split);
    expect(errors.length, "expected at least one error").toBeGreaterThan(0);
    expect(errors.join("\n")).toMatch(pattern);
    expect(errors.every((e) => e.startsWith("ing-") || e.startsWith("test.jsonl") || e.startsWith("dev-1"))).toBe(true);
  });

  it("rejects file-level problems: invalid JSON, blank lines, missing final newline, duplicate ids and inputs", () => {
    const line = JSON.stringify(base());
    const errs = (text: string) => {
      try {
        parseIngredientJsonl(text, "dev", "t.jsonl");
        return "";
      } catch (e) {
        return (e as LabelValidationError).errors.join("\n");
      }
    };
    expect(errs("{not json}\n")).toMatch(/invalid JSON/);
    expect(errs(`${line}\n\n`)).toMatch(/blank line/);
    expect(errs(line)).toMatch(/must end with a newline/);
    expect(errs(`${line}\n${line}\n`)).toMatch(/ing-dev-0001: duplicate id/);
    const other = { ...base(), id: "ing-dev-0002" };
    expect(errs(`${line}\n${JSON.stringify(other)}\n`)).toMatch(/ing-dev-0002: input is identical to ing-dev-0001/);
  });

  it("rejects the same input in dev and holdout", () => {
    const dev = parseIngredientJsonl(JSON.stringify(base()) + "\n", "dev", "d");
    const hold = parseIngredientJsonl(JSON.stringify({ ...base(), id: "ing-hold-0001", split: "holdout" }) + "\n", "holdout", "h");
    expect(() => checkCorpus([...dev, ...hold])).toThrow(/ing-hold-0001: input is identical to ing-dev-0001/);
  });
});

describe("page label file", () => {
  const real = () => JSON.parse(readFileSync(path.join(FIXTURES, "pages/labels.json"), "utf8")) as Record<string, unknown>[];

  it("the real labels load (≥ 10 pages, ≥ 3 holdout) and every file exists", () => {
    const pages = loadPageLabels(FIXTURES);
    expect(pages.length).toBeGreaterThanOrEqual(10);
    expect(pages.filter((p) => p.split === "holdout").length).toBeGreaterThanOrEqual(3);
  });

  const pageRules: [string, (p: Record<string, any>) => void, RegExp][] = [
    ["id pattern", (p) => (p.id = "plain"), /id must match page-dev-/],
    ["file pattern", (p) => (p.file = "../x.html"), /file must be dev-<slug>\.html/],
    ["absolute requested URL", (p) => (p.requestedUrl = "/recipes/x"), /requestedUrl must be an absolute/],
    ["candidate count", (p) => (p.expectedCandidateCount = 3), /expectedCandidateCount must equal/],
    ["isRecipe consistent", (p) => (p.isRecipe = false), /isRecipe must be true exactly when/],
    ["servings range", (p) => (p.candidates[0].servings = 0), /servings: must be an integer 1–100/],
    ["minutes", (p) => (p.candidates[0].prepMinutes = 1.5), /prepMinutes: must be a whole number/],
    ["image URLs absolute", (p) => (p.candidates[0].imageUrls = ["/img/x.jpg"]), /imageUrls: must be an array of absolute/],
    ["structure enum", (p) => (p.candidates[0].structure = "rdfa"), /structure: must be json_ld or microdata/],
    ["candidate fields", (p) => delete p.candidates[0].title, /missing field 'title'/],
    ["accept keys", (p) => (p.candidates[0].accept = { servings: ["4"] }), /unknown field 'servings'/],
    ["diagnostic codes", (p) => (p.expectedDiagnostics = ["no_recipe"]), /expectedDiagnostics must be DIAGNOSTICS codes/],
    ["provenance", (p) => (p.provenance = { kind: "found_online", source: "x" }), /provenance\.kind/],
  ];

  it.each(pageRules)("rejects: %s", (_name, mutate, pattern) => {
    const pages = real();
    mutate(pages[0]);
    expect(() => validatePageLabels(pages)).toThrow(pattern);
  });

  it("rejects duplicate page ids", () => {
    const pages = real();
    pages[1].id = pages[0].id;
    expect(() => validatePageLabels(pages)).toThrow(/duplicate id/);
  });
});
