/** Shared helpers for the semantic-v2 tests. */
import { expect } from "vitest";
import type { ParsedIngredientV1, QuantityV1 } from "../../src/contract";
import { guardedParse, semanticV2Engine } from "../../src/ingredient/semantic-v2/engine";
import { validateParsedIngredientV1 } from "../../src/validate";

/** Parse with semantic-v2 and assert the reading validates and the engine's safety net was not used. */
export function read(line: string): ParsedIngredientV1 {
  const r = semanticV2Engine.parse(line);
  expect(validateParsedIngredientV1(r), line).toEqual([]);
  const g = guardedParse(line);
  expect(g.net, `${line}: the safety net was needed`).toBe("none");
  expect(g.out).toEqual(r);
  return r;
}

/** A quantity as label text: "1/3", "1 1/2", "2..3", or null. */
export function qText(q: QuantityV1 | null): string | null {
  if (q === null) return null;
  const one = (n: string, d: string) => {
    const N = BigInt(n);
    const D = BigInt(d);
    if (D === BigInt(1)) return N.toString();
    const w = N / D;
    return w === BigInt(0) ? `${N}/${D}` : `${w} ${N % D}/${D}`;
  };
  return q.kind === "exact" ? one(q.numerator, q.denominator) : `${one(q.min.numerator, q.min.denominator)}..${one(q.max.numerator, q.max.denominator)}`;
}

/** The core of a reading as compact plain data, for table tests. */
export function core(r: ParsedIngredientV1) {
  return {
    status: r.status,
    name: r.name,
    quantity: qText(r.quantity),
    unit: r.unit?.canonical ?? null,
  };
}

export const amountText = (a: { quantity: { numerator: string; denominator: string }; unit: { canonical: string } } | null) =>
  a === null ? null : `${qText({ kind: "exact", ...a.quantity, display: "" })} ${a.unit.canonical}`;
