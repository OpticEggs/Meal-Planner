/**
 * Phase 2B exposed regression corpus: loader and core-field comparison (coordinator-owned).
 *
 * The corpus (`exposed-regressions-2b.jsonl`) collects every published failure of `semantic-v1` — holdout-v1/v2
 * cases, round-3 known defects K1–K4, round-3 should-fix shapes, the final-head review's counterexamples — and
 * the final-head reviewer's 748 labelled probes. All of it is EXPOSED development material, never fresh evidence.
 *
 * Comparison follows CONTRACT-v1 §9 for the core fields plus alternatives: status; name (NFKC, lowercase,
 * collapsed spaces, edge punctuation trimmed; or an accepted name); quantity (exact rational, ranges both ends);
 * unit (canonical code); packageSize ("<amount> <unit>", exact); alternatives (set of normalized names, or an
 * accepted set). A field labelled "*" is not checked (review pre-fills the contract leaves open).
 * Independent of `bench/` on purpose. Pure apart from reading the corpus file.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ParsedIngredientV1 } from "../../src/contract";

export interface RegressionExpect {
  status: string;
  name: string | null | "*";
  acceptNames: string[];
  quantity: string | null | "*";
  unit: string | null | "*";
  packageSize: string | null | "*";
  alternatives: string[] | "*";
  acceptAlternatives: string[][];
}
export interface RegressionCase {
  id: string;
  input: string;
  origin: { kind: string; ref: string; group?: string; severityOnSemanticV1?: string[] };
  family: "A" | "B" | "C" | "D" | "-";
  firm: boolean;
  expect: RegressionExpect;
  alsoIn: unknown[];
}

export const CORPUS_FILE = path.join(import.meta.dirname, "exposed-regressions-2b.jsonl");

export function loadRegressions(file = CORPUS_FILE): RegressionCase[] {
  return readFileSync(file, "utf8").split("\n").filter((l) => l.trim() !== "").map((l) => JSON.parse(l) as RegressionCase);
}

const EDGE = /^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu;
export function norm(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const t = s.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim().replace(EDGE, "");
  return t === "" ? null : t;
}

type Rat = { n: bigint; d: bigint };
const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));
function rat(n: bigint, d: bigint): Rat {
  const g = gcd(n, d) || 1n;
  return { n: n / g, d: d / g };
}
/** "3", "1/2", "1 1/2", "14.5" → reduced rational. */
export function parseAmount(s: string): Rat | null {
  const t = s.trim();
  let m = /^(\d+) (\d+)\/(\d+)$/.exec(t);
  if (m) return rat(BigInt(m[1]) * BigInt(m[3]) + BigInt(m[2]), BigInt(m[3]));
  m = /^(\d+)\/(\d+)$/.exec(t);
  if (m) return rat(BigInt(m[1]), BigInt(m[2]));
  m = /^(\d*)\.(\d+)$/.exec(t);
  if (m) return rat(BigInt((m[1] || "0") + m[2]), 10n ** BigInt(m[2].length));
  m = /^(\d+)$/.exec(t);
  if (m) return rat(BigInt(m[1]), 1n);
  return null;
}
function exactOf(q: unknown): Rat | null {
  if (!q || typeof q !== "object" || (q as { kind?: unknown }).kind !== "exact") return null;
  const { numerator, denominator } = q as { numerator: string; denominator: string };
  return rat(BigInt(numerator), BigInt(denominator));
}
const sameRat = (a: Rat | null, b: Rat | null) => a !== null && b !== null && a.n === b.n && a.d === b.d;

function sameQuantity(label: string | null, got: unknown): boolean {
  if (label === null) return got === null || got === undefined;
  const range = /^(.+)\.\.(.+)$/.exec(label);
  if (range) {
    if (!got || (got as { kind?: unknown }).kind !== "range") return false;
    const g = got as { min: unknown; max: unknown };
    return sameRat(exactOf(g.min), parseAmount(range[1])) && sameRat(exactOf(g.max), parseAmount(range[2]));
  }
  return sameRat(exactOf(got), parseAmount(label));
}
const unitCode = (u: unknown): string | null => (u && typeof u === "object" ? ((u as { canonical?: string }).canonical ?? null) : null);
function samePackage(label: string | null, got: unknown): boolean {
  if (label === null) return got === null || got === undefined;
  const m = /^(\S+(?: \d+\/\d+)?) (\S+)$/.exec(label);
  if (!m || !got || typeof got !== "object") return false;
  const g = got as { quantity: unknown; unit: unknown };
  return unitCode(g.unit) === m[2] && sameRat(exactOf(g.quantity), parseAmount(m[1]));
}
const altSet = (xs: unknown): string => JSON.stringify([...new Set((Array.isArray(xs) ? xs : []).map(norm).filter((x) => x !== null))].sort());

/**
 * A safe abstention on a non-ingredient line: the label is `unsupported`, the engine says `needs_review` and offers no
 * amount, unit, package or options. Under G2 this is class C8 ("unsupported reviewed"), not an acceptance error, and
 * it carries no S code (EVALUATION-PLAN-v3 §4–§6); the required harness accepts it, as the acceptance rules do.
 */
export function safeAbstention(c: RegressionCase, got: ParsedIngredientV1): boolean {
  return c.expect.status === "unsupported" && got.status === "needs_review" && (got.quantity ?? null) === null && (got.unit ?? null) === null
    && (got.packageSize ?? null) === null && (!Array.isArray(got.alternatives) || got.alternatives.length === 0);
}

/** Field-by-field mismatches of one reading against one regression label ([] = match or safe abstention). */
export function mismatches(c: RegressionCase, got: ParsedIngredientV1): string[] {
  const e = c.expect;
  const out: string[] = [];
  if (safeAbstention(c, got)) return out;
  const show = (v: unknown) => JSON.stringify(v);
  if (got.status !== e.status) out.push(`status: want ${e.status}, got ${got.status}`);
  if (e.name !== "*") {
    const want = [e.name, ...e.acceptNames].map(norm);
    if (!want.includes(norm(got.name))) out.push(`name: want ${show(e.name)}${e.acceptNames.length ? ` (or ${e.acceptNames.join(" | ")})` : ""}, got ${show(got.name)}`);
  }
  if (e.quantity !== "*" && !sameQuantity(e.quantity, got.quantity)) out.push(`quantity: want ${show(e.quantity)}, got ${show(got.quantity && (got.quantity as { display?: string }).display)}`);
  if (e.unit !== "*" && (e.unit ?? null) !== unitCode(got.unit)) out.push(`unit: want ${show(e.unit)}, got ${show(unitCode(got.unit))}`);
  if (e.packageSize !== "*" && !samePackage(e.packageSize, got.packageSize)) out.push(`packageSize: want ${show(e.packageSize)}, got ${show(got.packageSize)}`);
  if (e.alternatives !== "*") {
    const gotSet = altSet(got.alternatives);
    const ok = [e.alternatives, ...e.acceptAlternatives].some((s) => altSet(s) === gotSet);
    if (!ok) out.push(`alternatives: want ${show(e.alternatives)}, got ${show(got.alternatives)}`);
  }
  return out;
}
