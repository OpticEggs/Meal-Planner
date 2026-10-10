/**
 * Reviewer R1 — independent outcome classifier for EVALUATION-PLAN-v3 (outcomes v3), written from the plan text only:
 *   - EVALUATION-PLAN-v3 §3–§5 (CE definition, SCORE-01/02), which carries v2 §3–§5 forward;
 *   - EVALUATION-PLAN-v2 §3 (denominators, core fields, accepted values), §4 (classes), §5 (S codes, severity),
 *     change-log reading 1 (the INTERPRETATION list it adopts verbatim — quoted from the historical report's
 *     outcomes.interpretation, docs/.../evaluation-56eafe4/benchmark-report.json, NOT from bench/ code);
 *   - CONTRACT-v1 §9 (field comparison), §2.1 (via the validator), §8 (label format).
 * It imports only src/contract.ts (UNIT_REGISTRY) and src/validate.ts. Nothing under bench/ is imported or read.
 *
 * Usage: npx tsx /home/user/rx2b-r1/oracle-check.ts <oracles-v3.json> [--json out.json]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { UNIT_REGISTRY } from "./repo/packages/recipe-extraction/src/contract";
import { validateParsedIngredientV1 } from "./repo/packages/recipe-extraction/src/validate";

/** Reviewer self-test only: R1_MUT=<name> deliberately breaks one rule to see whether some oracle notices. Default: none. */
const MUT = process.env.R1_MUT ?? "";

// ---------------------------------------------------------------- exact rationals (own code, BigInt)
type Rat = { n: bigint; d: bigint };
const abs = (x: bigint) => (x < 0n ? -x : x);
function gcd(a: bigint, b: bigint): bigint { a = abs(a); b = abs(b); while (b) [a, b] = [b, a % b]; return a; }
function rat(n: bigint, d: bigint): Rat { if (d === 0n) throw new Error("zero denominator"); if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; }
const ratEq = (a: Rat, b: Rat) => a.n === b.n && a.d === b.d; // both reduced
function parseRat(s: string): Rat {
  const t = s.trim();
  let m: RegExpMatchArray | null;
  if ((m = t.match(/^(\d+)\s+(\d+)\/(\d+)$/))) return rat(BigInt(m[1]) * BigInt(m[3]) + BigInt(m[2]), BigInt(m[3]));
  if ((m = t.match(/^(\d+)\/(\d+)$/))) return rat(BigInt(m[1]), BigInt(m[2]));
  if ((m = t.match(/^(\d*)\.(\d+)$/))) return rat(BigInt((m[1] || "0") + m[2]), 10n ** BigInt(m[2].length));
  if ((m = t.match(/^(\d+)$/))) return rat(BigInt(m[1]), 1n);
  throw new Error(`cannot read quantity shorthand "${s}"`);
}

// ---------------------------------------------------------------- comparable quantity
type CQ = null | { k: "exact"; v: Rat } | { k: "range"; min: Rat; max: Rat } | { k: "bad" };
function cqFromLabel(s: string | null): CQ {
  if (s === null || s === undefined) return null;
  if (s.includes("..")) { const [a, b] = s.split(".."); return { k: "range", min: parseRat(a), max: parseRat(b) }; }
  return { k: "exact", v: parseRat(s) };
}
function exactObjToRat(o: any): Rat | null {
  if (!o || typeof o !== "object" || typeof o.numerator !== "string" || typeof o.denominator !== "string") return null;
  if (!/^\d+$/.test(o.numerator) || !/^\d+$/.test(o.denominator) || BigInt(o.denominator) === 0n) return null;
  return rat(BigInt(o.numerator), BigInt(o.denominator));
}
function cqFromOutput(q: any): CQ {
  if (q === null || q === undefined) return null;
  if (MUT === "qty-by-display" && q.kind === "exact") { try { return { k: "exact", v: parseRat(String(q.display)) }; } catch { return { k: "bad" }; } }
  if (q.kind === "exact") { const r = exactObjToRat(q); return r ? { k: "exact", v: r } : { k: "bad" }; }
  if (q.kind === "range") { const a = exactObjToRat(q.min), b = exactObjToRat(q.max); return a && b ? { k: "range", min: a, max: b } : { k: "bad" }; }
  return { k: "bad" };
}
function cqEq(a: CQ, b: CQ): boolean {
  if (a === null || b === null) return a === b;
  if (a.k === "bad" || b.k === "bad") return false;
  if (a.k === "exact" && b.k === "exact") return ratEq(a.v, b.v);
  if (a.k === "range" && b.k === "range") return MUT === "range-min-only" ? ratEq(a.min, b.min) : ratEq(a.min, b.min) && ratEq(a.max, b.max); // §9: ranges both ends
  return false;
}

// ---------------------------------------------------------------- units
const dimOf = (code: string | null): string | null => (code && (UNIT_REGISTRY as any)[code] ? (UNIT_REGISTRY as any)[code].dimension : null);
type CAmount = null | { q: CQ; unit: string | null };

// ---------------------------------------------------------------- §9 normalization
function normName(s: unknown): string | null {
  if (s === null || s === undefined) return null;
  if (typeof s !== "string") return `\u0000bad:${JSON.stringify(s)}`;
  const t = s.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
  return MUT === "name-no-punct-trim" ? t : t.replace(/^[\s\p{P}]+/u, "").replace(/[\s\p{P}]+$/u, "");
}
function noteBag(s: unknown): string {
  const n = normName(s);
  if (n === null) return "";
  return n.replace(/[(),;:]/g, " ").split(/\s+/).filter(Boolean).sort().join(" ");
}
const words = (s: string | null) => new Set((s ?? "").split(" ").filter(Boolean));
function altSet(list: unknown): string { if (!Array.isArray(list)) return "\u0000bad"; return [...new Set(list.map((x) => normName(x) ?? ""))].sort().join("\u0001"); }

// ---------------------------------------------------------------- label and output, in comparable form
interface CLine {
  status: string; name: string | null; quantity: CQ; unit: string | null; packageSize: CAmount; equivalents: string;
  form: unknown; note: string; alternatives: string[]; optional: unknown; approximate: unknown; amountUnstated: unknown;
}
const LABEL_DEFAULTS = { name: null, quantity: null, unit: null, packageSize: null, equivalents: [], form: null, note: null, alternatives: [], optional: false, approximate: false, amountUnstated: null };
const amountKey = (a: CAmount) => (a === null ? "null" : `${a.unit}|${a.q && a.q.k === "exact" ? `${a.q.v.n}/${a.q.v.d}` : JSON.stringify(a.q)}`);
function labelLine(expect: any): CLine {
  const e = { ...LABEL_DEFAULTS, ...expect };
  const amt = (p: any): CAmount => (p ? { q: cqFromLabel(p.quantity), unit: p.unit } : null);
  return {
    status: e.status, name: e.name, quantity: cqFromLabel(e.quantity), unit: e.unit, packageSize: amt(e.packageSize),
    equivalents: (e.equivalents as any[]).map((x) => amountKey(amt(x))).sort().join(","),
    form: e.form, note: e.note, alternatives: e.alternatives ?? [], optional: e.optional, approximate: e.approximate, amountUnstated: e.amountUnstated,
  };
}
function outputLine(o: any): CLine {
  const amt = (p: any): CAmount => (p ? { q: cqFromOutput(p.quantity), unit: p.unit?.canonical ?? null } : null);
  return {
    status: o.status, name: o.name, quantity: cqFromOutput(o.quantity), unit: o.unit ? (MUT === "unit-by-source" ? o.unit.source : o.unit.canonical) : null, packageSize: amt(o.packageSize),
    equivalents: (Array.isArray(o.equivalents) ? o.equivalents : []).map((x: any) => amountKey(amt(x))).sort().join(","),
    form: o.form, note: o.note, alternatives: Array.isArray(o.alternatives) ? o.alternatives : [], optional: o.optional, approximate: o.approximate, amountUnstated: o.amountUnstated,
  };
}

// ---------------------------------------------------------------- shorthand → complete ParsedIngredientV1 (oracle readme rules)
function mkExact(s: string) { const r = parseRat(s); return { kind: "exact", numerator: r.n.toString(), denominator: r.d.toString(), display: s }; }
function mkQty(s: string) { if (s.includes("..")) { const [a, b] = s.split(".."); return { kind: "range", min: mkExact(a), max: mkExact(b), display: `${a}-${b}` }; } return mkExact(s); }
function mkUnit(code: string) { return { canonical: code, dimension: dimOf(code), source: code }; }
function mkAmount(s: string) { const parts = s.trim().split(/\s+/); const u = parts.pop()!; return { quantity: mkExact(parts.join(" ")), unit: mkUnit(u) }; }
function defaultReasons(status: unknown) { return status === "ready" ? [] : status === "needs_review" ? ["unclassified"] : status === "unsupported" ? ["not_an_ingredient"] : []; }
export function buildOutput(spec: any, input: string): any {
  const out: any = {
    raw: input, normalized: input, status: spec.status, name: null, quantity: null, unit: null, packageSize: null, equivalents: [], form: null,
    note: null, alternatives: [], optional: false, approximate: false, amountUnstated: null, reasons: defaultReasons(spec.status), evidence: { spans: {} },
  };
  for (const [k, v] of Object.entries(spec)) {
    if (k === "quantity" && typeof v === "string") out.quantity = mkQty(v);
    else if (k === "unit" && typeof v === "string") out.unit = mkUnit(v);
    else if (k === "packageSize" && typeof v === "string") out.packageSize = mkAmount(v);
    else if (k === "equivalents" && Array.isArray(v)) out.equivalents = v.map((e) => (typeof e === "string" ? mkAmount(e) : e));
    else out[k] = v;
  }
  return out;
}

// ---------------------------------------------------------------- the classifier
export interface Label { input: string; categories?: string[]; expect: any; accept?: Record<string, unknown[]> }
export type Parse = { output: any } | { throws: string };
export interface Result {
  outcome: string; partial: string | null; c1plus: boolean; detailMismatch: boolean; falseCertainty: string | null; severe: string[];
  strict: { outcome: string; c1plus: boolean }; ce: { engineError: boolean; invalid: boolean; nondeterministic: boolean };
  bareNoAmount: boolean; inventedOption: boolean; droppedOption: boolean; problems?: string[];
}
const FIELDS = ["status", "name", "quantity", "unit", "packageSize", "equivalents", "form", "note", "alternatives", "optional", "approximate", "amountUnstated"] as const;
const CORE = ["status", "name", "quantity", "unit", "packageSize"] as const;
type Field = (typeof FIELDS)[number];

function eqField(f: Field, labelVal: any, eng: CLine): boolean {
  switch (f) {
    case "name": return normName(labelVal) === normName(eng.name);
    case "note": return noteBag(labelVal) === eng.note && true;
    case "quantity": return cqEq(labelVal, eng.quantity);
    case "unit": return (labelVal ?? null) === (eng.unit ?? null);
    case "packageSize": return amountKey(labelVal) === amountKey(eng.packageSize);
    case "alternatives": return altSet(labelVal) === altSet(eng.alternatives);
    default: return JSON.stringify(labelVal ?? null) === JSON.stringify((eng as any)[f] ?? null);
  }
}
/** Field match, optionally counting the label's accepted values (v2 §3: "a value listed in a case's accept counts"). */
function matcher(L: CLine, accept: Record<string, unknown[]>, useAccept: boolean) {
  return (f: Field, E: CLine): boolean => {
    const eng = { ...E, note: noteBag(E.note) } as CLine;
    if (eqField(f, (L as any)[f], eng)) return true;
    if (!useAccept) return false;
    for (const v of accept[f] ?? []) {
      const lv = f === "quantity" ? cqFromLabel(v as any) : f === "packageSize" ? (v ? { q: cqFromLabel((v as any).quantity), unit: (v as any).unit } : null) : v;
      if (eqField(f, lv, eng)) return true;
    }
    return false;
  };
}

function classify(L: CLine, E: CLine, accept: Record<string, unknown[]>, useAccept: boolean) {
  const m = matcher(L, accept, useAccept);
  const ok = (f: Field) => m(f, E);
  const ls = L.status, es = E.status;
  let outcome: string;
  if (es === "ready") outcome = ls === "ready" && CORE.every(ok) ? "C1" : "C2";
  else if (ls === "ready") outcome = es === "needs_review" ? "C3" : "C4";
  else if (ls === "needs_review") outcome = es === "needs_review" ? "C5" : "C6";
  else outcome = es === "unsupported" ? "C7" : "C8";
  const c1plus = outcome === "C1" && FIELDS.filter((f) => MUT !== "c1plus-ignores-equivalents" || f !== "equivalents").every(ok);

  // reading 1: sub-classes for C3/C5 in the order b, c, a, x.
  let partial: string | null = null;
  if (outcome === "C3" || outcome === "C5") {
    const contra = (E.name !== null && !ok("name")) || (E.quantity !== null && !ok("quantity")) || (E.unit !== null && !ok("unit")) ||
      (E.packageSize !== null && !ok("packageSize")) || (MUT !== "alts-not-contradiction" && E.alternatives.length > 0 && !ok("alternatives"));
    const choiceLabel = L.alternatives.length >= 2;
    if (MUT === "a-before-b" && E.name !== null) partial = "a";
    else if (contra) partial = "b";
    else if (E.name === null && E.quantity === null && E.unit === null && E.alternatives.length === 0 && (MUT !== "c-needs-pkg-null" || E.packageSize === null)) partial = "c";
    else if (E.name !== null || (MUT !== "a-needs-name" && choiceLabel && E.alternatives.length > 0)) partial = "a"; // options present and not contradicting = matched
    else partial = "x";
  }
  return { outcome, c1plus, partial, ok };
}

function severeCodes(L: CLine, E: CLine, accept: Record<string, unknown[]>, ok: (f: Field) => boolean, s6NeedsQuantity: boolean): string[] {
  const S: string[] = [];
  // S1 fabricated amount: label quantity null, engine quantity non-null (any status).
  if (L.quantity === null && E.quantity !== null && (MUT !== "s1-ready-only" || E.status === "ready")) S.push("S1");
  // S2 wrong amount on a ready reading: engine ready, label quantity non-null, engine quantity differs (incl. range collapse).
  if ((E.status === "ready" || MUT === "s2-any-status") && L.quantity !== null && !ok("quantity") && (MUT !== "s2-needs-engine-qty" || E.quantity !== null)) S.push("S2");
  // S3 cross-dimension: engine unit (or packageSize unit) dimension ≠ label's, both present.
  const lpd = L.packageSize ? dimOf(L.packageSize.unit) : null, epd = E.packageSize ? dimOf(E.packageSize.unit) : null;
  if ((L.unit && E.unit && dimOf(L.unit) !== dimOf(E.unit)) || (MUT !== "s3-unit-only" && lpd && epd && lpd !== epd)) S.push("S3");
  // S4 suppressed ambiguity: label needs_review, engine ready.
  if (L.status === "needs_review" && E.status === "ready") S.push("S4");
  // S5 silent alternative choice: label (or an accepted list) has ≥2 alternatives, engine has none and its name equals one of them.
  const lists = [L.alternatives, ...(MUT === "s5-no-accept" ? [] : ((accept.alternatives ?? []) as unknown[] as string[][]))].filter((l) => Array.isArray(l) && l.length >= 2);
  if (E.alternatives.length === 0 && E.name !== null && lists.some((l) => l.some((a) => normName(a) === normName(E.name)))) S.push("S5");
  // S6 package representation changed: label has a packageSize, engine has none and states the amount in a mass/volume unit.
  const eud = dimOf(E.unit);
  if (L.packageSize && !E.packageSize && (eud === "mass" || eud === "volume") && (!s6NeedsQuantity || E.quantity !== null)) S.push("S6");
  // S7 dropped material qualifier: engine ready on a ready label, name not matched (accepted), engine words ⊊ label words.
  if (L.status === "ready" && (E.status === "ready" || MUT === "s7-any-status") && (MUT === "s7-strict-name" ? normName(L.name) !== normName(E.name) : !ok("name")) && E.name !== null && L.name !== null) {
    const ew = words(normName(E.name)), lw = words(normName(L.name));
    if (ew.size < lw.size && [...ew].every((w) => lw.has(w))) S.push("S7");
  }
  // S8 ready on a non-ingredient.
  if (L.status === "unsupported" && (E.status === "ready" || MUT === "s8-any-status")) S.push("S8");
  return S;
}

export function check(label: Label, parses: [Parse, Parse], opts: { s6NeedsQuantity?: boolean } = {}): Result {
  const accept = label.accept ?? {};
  const L = labelLine(label.expect);
  const bareNoAmount = L.status === "needs_review" && (MUT === "bare-ignore-qty" || L.quantity === null) && (MUT === "bare-ignore-unit" || L.unit === null) && (MUT === "bare-ignore-alts" || L.alternatives.length === 0); // SCORE-01
  const built = parses.map((p) => ("output" in p ? { output: buildOutput(p.output, label.input) } : { throws: `Error: ${p.throws}` }));
  const engineError = built.some((p) => "throws" in p);
  const scored = (p: any) => ("output" in p ? JSON.stringify(outputLine(p.output), (_k, v) => (typeof v === "bigint" ? v.toString() : v)) : JSON.stringify(p));
  const nondeterministic = MUT === "nondet-scored-fields-only" ? scored(built[0]) !== scored(built[1]) : JSON.stringify(built[0]) !== JSON.stringify(built[1]);
  const toValidate = MUT === "validate-first-parse-only" ? built.slice(0, 1) : built;
  const problems = MUT === "ce-status-string-only"
    ? toValidate.flatMap((p: any) => ("output" in p && !["ready", "needs_review", "unsupported"].includes(p.output.status) ? ["status outside the contract"] : []))
    : toValidate.flatMap((p: any) => ("output" in p ? validateParsedIngredientV1(p.output) : []));
  const invalid = problems.length > 0;
  const base = { bareNoAmount, ce: { engineError, invalid, nondeterministic }, problems };
  if ((engineError && MUT !== "s-codes-on-ce") || ((invalid || nondeterministic) && MUT !== "s-codes-on-ce")) {
    return { outcome: "CE", partial: null, c1plus: false, detailMismatch: false, falseCertainty: null, severe: [], strict: { outcome: "CE", c1plus: false }, inventedOption: false, droppedOption: false, ...base };
  }
  if (MUT === "s-codes-on-ce" && (engineError || invalid || nondeterministic)) {
    const first = built.find((p: any) => "output" in p) as any;
    const S = first ? severeCodes(L, outputLine(first.output), accept, classify(L, outputLine(first.output), accept, true).ok, true) : [];
    return { outcome: "CE", partial: null, c1plus: false, detailMismatch: false, falseCertainty: null, severe: S, strict: { outcome: "CE", c1plus: false }, inventedOption: false, droppedOption: false, ...base };
  }
  const E = outputLine((built[0] as any).output);
  const acc0 = classify(L, E, accept, true);
  const acc = MUT === "subclass-strict" ? { ...acc0, partial: classify(L, E, accept, false).partial } : acc0;
  const strict = classify(L, E, accept, false);
  const severe = severeCodes(L, E, accept, acc.ok, opts.s6NeedsQuantity ?? true);
  let falseCertainty: string | null = null;
  if (acc.outcome === "C2") {
    const s2to8 = severe.some((s) => s !== "S1");
    if (MUT === "pkg-not-high") falseCertainty = s2to8 || !acc.ok("unit") ? "high" : "medium";
    else if (s2to8 || !acc.ok("unit") || !acc.ok("packageSize")) falseCertainty = "high";
    else if (!acc.ok("name") && acc.ok("quantity")) falseCertainty = "medium"; // only the name is wrong (not S7)
    else falseCertainty = "high"; // reading 1: the remaining case (S1, unit null on both sides) is high
  }
  // Informational review pre-fills (plan v3 §7; CONTRACT §12.7 "never dropped, merged or invented").
  let inventedOption = false, droppedOption = false;
  if (MUT === "dropped-includes-empty" && E.alternatives.length === 0 && L.alternatives.length >= 2) droppedOption = true;
  if (E.alternatives.length > 0 && !acc.ok("alternatives")) {
    const lists = [L.alternatives, ...((accept.alternatives ?? []) as unknown[] as string[][])];
    const pool = new Set(lists.flat().map((a) => normName(a)));
    const eng = new Set(E.alternatives.map((a) => normName(a)));
    inventedOption = [...eng].some((a) => !pool.has(a));
    droppedOption = !inventedOption && lists.some((l) => { const ls = new Set(l.map((a) => normName(a))); return eng.size < ls.size && [...eng].every((a) => ls.has(a)); });
  }
  return {
    outcome: acc.outcome, partial: acc.partial, c1plus: acc.c1plus, detailMismatch: acc.outcome === "C1" && !acc.c1plus, falseCertainty, severe,
    strict: { outcome: strict.outcome, c1plus: strict.c1plus }, inventedOption, droppedOption, ...base,
  };
}

// ---------------------------------------------------------------- run over the oracle file
function toParses(engine: any): [Parse, Parse] {
  if ("output" in engine) return [{ output: structuredClone(engine.output) }, { output: structuredClone(engine.output) }];
  if ("throws" in engine) return [{ throws: engine.throws }, { throws: engine.throws }];
  return [engine.parses[0], engine.parses[1]];
}
function expectedFull(x: any) {
  return {
    outcome: x.outcome, partial: x.partial, c1plus: x.c1plus, detailMismatch: x.detailMismatch, falseCertainty: x.falseCertainty, severe: x.severe,
    strict: x.strict ?? { outcome: x.outcome, c1plus: x.c1plus }, ce: x.ce ?? { engineError: false, invalid: false, nondeterministic: false },
    bareNoAmount: x.bareNoAmount ?? false, inventedOption: x.inventedOption ?? false, droppedOption: x.droppedOption ?? false,
  };
}

const isMain = process.argv[1] && process.argv[1].endsWith("oracle-check.ts");
if (isMain) {
  const file = process.argv[2];
  const data = JSON.parse(readFileSync(file, "utf8"));
  const rows: any[] = [];
  let agree = 0;
  for (const o of data.oracles) {
    const parses = toParses(o.engine);
    const got = check(o.label, parses);
    const gotS6Loose = check(o.label, parses, { s6NeedsQuantity: false });
    const { problems, ...g } = got as any;
    const exp = expectedFull(o.expected);
    const diffs = Object.keys(exp).filter((k) => JSON.stringify((exp as any)[k]) !== JSON.stringify((g as any)[k]));
    if (JSON.stringify(gotS6Loose.severe) !== JSON.stringify(got.severe)) diffs.push("S6-variant-sensitive");
    if (diffs.length === 0) agree++;
    rows.push({ id: o.id, covers: o.covers, diffs, expected: exp, got: g, problems });
    const line = `${o.id.padEnd(4)} ${diffs.length ? "DIFF " + diffs.join(",") : "ok  "}  ${g.outcome}${g.partial ?? ""}${g.c1plus ? "+" : ""}${g.detailMismatch ? " detail" : ""}${g.falseCertainty ? " " + g.falseCertainty : ""} [${g.severe.join(" ")}]` +
      ` strict=${g.strict.outcome}${g.strict.c1plus ? "+" : ""} ce=${+g.ce.engineError}${+g.ce.invalid}${+g.ce.nondeterministic} bare=${+g.bareNoAmount} inv=${+g.inventedOption} drop=${+g.droppedOption}` +
      (problems.length ? `  validator: ${problems.slice(0, 2).join(" | ")}` : "");
    console.log(line);
    if (diffs.length) console.log("     expected:", JSON.stringify(exp), "\n     got:     ", JSON.stringify(g));
  }
  console.log(`\n${agree}/${data.oracles.length} oracles agree on every recorded field`);
  const out = process.argv.indexOf("--json");
  if (out > 0) writeFileSync(process.argv[out + 1], JSON.stringify(rows, null, 1) + "\n");
}
