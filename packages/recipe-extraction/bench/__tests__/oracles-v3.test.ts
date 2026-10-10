/**
 * The production outcome scorer (outcomes v3) agrees with every hand-calculated oracle in
 * oracles-v3.json. The oracle file is self-describing (its `readme`); this test only expands its
 * documented shorthands into a label and an engine, runs the engine through the scorer's own reading
 * path (`observe`: two parses, errors caught) and compares each expected value. It also checks that the
 * file is well formed: 40–80 oracles, every label a valid CONTRACT-v1 §8 label, every non-CE output valid
 * and every "invalid" output invalid under the contract validator, and the required coverage.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { UNIT_REGISTRY, type IngredientEngine } from "../../src/contract";
import { toExactQuantity } from "../../src/rational";
import { validateParsedIngredientV1 } from "../../src/validate";
import { validateIngredientCase } from "../labels";
import { classifyObservation, observe, OUTCOME_CLASSES, SEVERE_CODES, type LineOutcome } from "../outcomes";
import { parseLabelExact, parseLabelQuantity, type IngredientCase, type IngredientExpect } from "../types";

type Json = Record<string, unknown>;
interface Oracle {
  id: string;
  covers: string[];
  label: { input: string; categories: string[]; expect: Partial<IngredientExpect> & { status: IngredientExpect["status"] }; accept?: IngredientCase["accept"] };
  engine: { output?: Json } | { throws?: string } | { parses?: ({ output: Json } | { throws: string })[] };
  expected: {
    outcome: string;
    partial: string | null;
    c1plus: boolean;
    detailMismatch: boolean;
    falseCertainty: string | null;
    severe: string[];
    strict?: { outcome: string; c1plus: boolean };
    ce?: { engineError: boolean; invalid: boolean; nondeterministic: boolean };
    bareNoAmount?: boolean;
    inventedOption?: boolean;
    droppedOption?: boolean;
  };
  calc: string;
}

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "oracles-v3.json");
const doc = JSON.parse(readFileSync(FILE, "utf8")) as { schema: string; readme: string[]; oracles: Oracle[] };

// --- The documented expansions (oracles-v3.json `readme`) --------------------------------------------

const EXPECT_DEFAULTS: Omit<IngredientExpect, "status"> = {
  name: null, quantity: null, unit: null, packageSize: null, equivalents: [], form: null, note: null, alternatives: [], optional: false, approximate: false, amountUnstated: null,
};

function toCase(o: Oracle, i: number): IngredientCase {
  return {
    id: `ing-dev-${String(9000 + i).padStart(4, "0")}`,
    split: "dev",
    categories: o.label.categories as IngredientCase["categories"],
    input: o.label.input,
    expect: { ...EXPECT_DEFAULTS, ...o.label.expect },
    accept: o.label.accept ?? {},
    severity: "high",
    seasoningClass: null,
    provenance: { kind: "synthetic_pattern", source: `oracles-v3.json ${o.id}` },
    rationale: o.calc,
  };
}

function exactOf(text: string) {
  const r = parseLabelExact(text);
  if (!r) throw new Error(`bad oracle quantity ${text}`);
  return { ...toExactQuantity(r)!, display: text };
}
function quantityOf(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const q = parseLabelQuantity(v);
  if (!q) throw new Error(`bad oracle quantity ${v}`);
  if (q.kind === "exact") return exactOf(v);
  const [a, b] = v.split("..");
  return { kind: "range", min: exactOf(a), max: exactOf(b), display: `${a}–${b}` };
}
function unitOf(v: unknown): unknown {
  if (typeof v !== "string") return v;
  if (!(v in UNIT_REGISTRY)) throw new Error(`bad oracle unit ${v}`);
  return { canonical: v, dimension: UNIT_REGISTRY[v as keyof typeof UNIT_REGISTRY].dimension, source: v };
}
function amountOf(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const i = v.lastIndexOf(" ");
  return { quantity: quantityOf(v.slice(0, i)), unit: unitOf(v.slice(i + 1)) };
}
const DEFAULT_REASONS: Record<string, string[]> = { ready: [], needs_review: ["unclassified"], unsupported: ["not_an_ingredient"] };

function toOutput(o: Oracle, out: Json): Json {
  const status = out.status;
  const full: Json = {
    raw: o.label.input,
    normalized: o.label.input,
    status,
    name: null,
    quantity: null,
    unit: null,
    packageSize: null,
    equivalents: [],
    form: null,
    note: null,
    alternatives: [],
    optional: false,
    approximate: false,
    amountUnstated: null,
    reasons: DEFAULT_REASONS[String(status)] ?? [],
    evidence: { spans: {} },
    ...out,
  };
  full.quantity = quantityOf(full.quantity);
  full.unit = unitOf(full.unit);
  full.packageSize = amountOf(full.packageSize);
  if (Array.isArray(full.equivalents)) full.equivalents = full.equivalents.map(amountOf);
  return full;
}

function toEngine(o: Oracle): IngredientEngine {
  const e = o.engine as { output?: Json; throws?: string; parses?: ({ output?: Json; throws?: string })[] };
  const parses = e.parses ?? [e, e];
  if (parses.length !== 2) throw new Error(`${o.id}: parses must have two entries`);
  let call = 0;
  return {
    id: `oracle:${o.id}`,
    description: o.calc,
    parse() {
      const p = parses[call++ % 2];
      if (p.throws !== undefined) throw new Error(p.throws);
      return toOutput(o, p.output!) as never;
    },
  };
}

/** Outputs an oracle's engine returns (for the validity cross-checks). */
const outputsOf = (o: Oracle): Json[] => {
  const e = o.engine as { output?: Json; parses?: { output?: Json }[] };
  return (e.parses ?? [e]).filter((p) => p.output !== undefined).map((p) => toOutput(o, p.output!));
};

const classify = (o: Oracle, i: number): LineOutcome => classifyObservation(toCase(o, i), observe(toEngine(o), o.label.input));

// --- The production scorer agrees with every oracle -------------------------------------------------

describe("outcomes v3 hand-calculated oracles", () => {
  doc.oracles.forEach((o, i) => {
    it(`${o.id} ${o.covers.join(", ")}`, () => {
      const x = o.expected;
      const got = classify(o, i);
      const ce = x.ce ?? { engineError: false, invalid: false, nondeterministic: false };
      expect(got.outcome, "outcome").toBe(x.outcome);
      expect(got.validity.engineError !== null, "ce.engineError").toBe(ce.engineError);
      expect(got.validity.problems.length > 0, "ce.invalid").toBe(ce.invalid);
      expect(got.validity.nondeterministic, "ce.nondeterministic").toBe(ce.nondeterministic);
      expect(got.severe, "severe").toEqual(x.severe);
      expect(got.partial, "partial").toBe(x.partial);
      expect(got.fullyCorrect, "c1plus").toBe(x.c1plus);
      expect(got.detailMismatch, "detailMismatch").toBe(x.detailMismatch);
      expect(got.falseCertainty, "falseCertainty").toBe(x.falseCertainty);
      expect(got.strict.outcome, "strict.outcome").toBe(x.strict?.outcome ?? x.outcome);
      expect(got.strict.fullyCorrect, "strict.c1plus").toBe(x.strict?.c1plus ?? x.c1plus);
      expect(got.bareNoAmount, "bareNoAmount").toBe(x.bareNoAmount ?? false);
      expect(got.reviewPrefill.inventedOption, "inventedOption").toBe(x.inventedOption ?? false);
      expect(got.reviewPrefill.droppedOption, "droppedOption").toBe(x.droppedOption ?? false);
    });
  });
});

describe("the oracle file is well formed", () => {
  it("has 40–80 oracles with unique ids, each with a one-line hand calculation", () => {
    expect(doc.schema).toBe("outcome-oracles/v1");
    expect(doc.oracles.length).toBeGreaterThanOrEqual(40);
    expect(doc.oracles.length).toBeLessThanOrEqual(80);
    expect(new Set(doc.oracles.map((o) => o.id)).size).toBe(doc.oracles.length);
    for (const o of doc.oracles) {
      expect(o.calc.trim().length, o.id).toBeGreaterThan(20);
      expect(o.calc, o.id).not.toContain("\n");
      expect(Object.keys(o.engine).length, o.id).toBe(1);
    }
  });

  it("every label is a valid CONTRACT-v1 §8 label", () => {
    doc.oracles.forEach((o, i) => {
      const errors: string[] = [];
      validateIngredientCase({ ...toCase(o, i) }, "dev", o.id, errors);
      expect(errors, o.id).toEqual([]);
    });
  });

  it("every output of a non-CE oracle is contract-valid; every output of an 'invalid' oracle fails the validator", () => {
    for (const o of doc.oracles) {
      const outs = outputsOf(o);
      if (o.expected.ce?.invalid) expect(outs.some((x) => validateParsedIngredientV1(x).length > 0), o.id).toBe(true);
      else for (const x of outs) expect(validateParsedIngredientV1(x), o.id).toEqual([]);
    }
  });

  it("covers every class, sub-class, CE dimension and S code, and the named situations", () => {
    const ex = doc.oracles.map((o) => o.expected);
    for (const c of OUTCOME_CLASSES) expect(ex.some((x) => x.outcome === c), c).toBe(true);
    for (const cls of ["C3", "C5"]) for (const p of ["a", "b", "c", "x"]) expect(ex.some((x) => x.outcome === cls && x.partial === p), `${cls}${p}`).toBe(true);
    expect(ex.some((x) => x.outcome === "C1" && x.c1plus)).toBe(true);
    expect(ex.some((x) => x.outcome === "C1" && x.detailMismatch)).toBe(true);
    for (const f of ["high", "medium"]) expect(ex.some((x) => x.falseCertainty === f), f).toBe(true);
    for (const d of ["engineError", "invalid", "nondeterministic"] as const) expect(ex.some((x) => x.ce?.[d]), d).toBe(true);
    for (const s of SEVERE_CODES) expect(ex.some((x) => x.severe.includes(s)), s).toBe(true);
    expect(ex.filter((x) => x.severe.length >= 2).length).toBeGreaterThanOrEqual(5);
    const covers = new Set(doc.oracles.flatMap((o) => o.covers));
    for (const tag of [
      "oz vs fl_oz", "cup vs container", "unsupported input", "range collapse", "range loss", "alternative loss", "invented option", "dropped option",
      "package representation", "accept.name", "accept.note", "accept.alternatives", "overlap", "bare no-amount", "SCORE-01 tag/label difference", "SF-6", "N-2",
    ])
      expect(covers.has(tag), tag).toBe(true);
    expect(ex.some((x) => x.strict && x.strict.outcome !== x.outcome)).toBe(true);
    expect(ex.some((x) => x.inventedOption) && ex.some((x) => x.droppedOption)).toBe(true);
  });
});
