// Runs the reviewer's probe lines (probes.tsv) through semantic-v1 and classifies each per
// EVALUATION-PLAN-v2 §4–§5 against the reviewer's own contract-§7 label. Independent of bench/*.
import { readFileSync, writeFileSync } from "node:fs";
import { ENGINES } from "./repo/packages/recipe-extraction/src/ingredient/engines";
import { UNIT_REGISTRY } from "./repo/packages/recipe-extraction/src/contract";
import { guardedParse } from "./repo/packages/recipe-extraction/src/ingredient/semantic/engine";
import { validateParsedIngredientV1 } from "./repo/packages/recipe-extraction/src/validate";

const DIR = "/tmp/claude-0/-home-user-Meal-Planner/7c930bb6-c34b-51a2-998f-d2325352dd1d/scratchpad/final-review/";
const engineId = process.argv[2] ?? "semantic-v1";
const engine = ENGINES[engineId];

type Q = [bigint, bigint];
const g = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : g(b, a % b));
const red = (n: bigint, d: bigint): Q => { const k = g(n, d); return [n / k, d / k]; };
function parseExact(s: string): Q {
  let m = /^(\d+) (\d+)\/(\d+)$/.exec(s);
  if (m) { const w = BigInt(m[1]), n = BigInt(m[2]), d = BigInt(m[3]); return red(w * d + n, d); }
  m = /^(\d+)\/(\d+)$/.exec(s);
  if (m) return red(BigInt(m[1]), BigInt(m[2]));
  m = /^(\d+)(?:\.(\d+))?$/.exec(s);
  if (m) { const f = m[2] ?? ""; const d = 10n ** BigInt(f.length); return red(BigInt(m[1]) * d + BigInt(f || "0"), d); }
  throw new Error("bad qty " + s);
}
const qeq = (a: Q | null, b: Q) => !!a && a[0] === b[0] && a[1] === b[1];
const engQ = (q: any): Q | null => (q && q.kind === "exact" ? red(BigInt(q.numerator), BigInt(q.denominator)) : null);
const qText = (q: any) => (q === null ? "-" : q.kind === "exact" ? `${q.numerator}/${q.denominator}`.replace(/\/1$/, "") : `${q.min.numerator}/${q.min.denominator}..${q.max.numerator}/${q.max.denominator}`.replace(/\/1(?=\.\.|$)/g, ""));
function sameQty(label: string | null, got: any): boolean {
  if (label === null) return got === null;
  if (!got) return false;
  if (label.includes("..")) { const [a, b] = label.split("..").map(parseExact); return got.kind === "range" && qeq(engQ(got.min), a) && qeq(engQ(got.max), b); }
  return got.kind === "exact" && qeq(engQ(got), parseExact(label));
}
const norm = (s: any): string | null => {
  if (typeof s !== "string") return null;
  const t = s.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim().replace(/^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu, "");
  return t === "" ? null : t;
};
const dim = (u: string | null) => (u ? (UNIT_REGISTRY as any)[u]?.dimension : null);
const nn = (s: string) => (s === "-" ? null : s);

const rows = readFileSync(DIR + "probes.tsv", "utf8").split("\n").filter((l) => l.trim() && !l.startsWith("#"));
const out: any[] = [];
let invalid = 0, net = 0, nondet = 0;
for (const row of rows) {
  const [inputRaw, status, nameF, qtyF, unitF, pkgF, altF, flags, group] = row.split("\t");
  if (group === undefined) throw new Error("bad row: " + row);
  const input = inputRaw.replace(/\\u([0-9a-fA-F]{4})/g, (_m, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\t/g, "\t");
  const names = nn(nameF)?.split("|") ?? [null];
  const label = { status, name: names[0], qty: nn(qtyF), unit: nn(unitF), pkg: nn(pkgF) ? { q: pkgF.split(" ")[0], u: pkgF.split(" ")[1] } : null };
  const altSets: string[][] = nn(altF) ? altF.split("||").map((s) => s.split(";")) : [];
  const labelAlts = altSets[0] ?? [];
  const r: any = engine.parse(input);
  if (validateParsedIngredientV1(r).length) invalid++;
  if (engineId === "semantic-v1" && guardedParse(input).net !== "none") net++;
  if (JSON.stringify(engine.parse(input)) !== JSON.stringify(r)) nondet++;
  const nameAcc = names.map(norm).includes(norm(r.name));
  const qty = sameQty(label.qty, r.quantity);
  const unit = (r.unit?.canonical ?? null) === label.unit;
  const pkg = label.pkg === null ? r.packageSize === null : !!r.packageSize && r.packageSize.unit.canonical === label.pkg.u && qeq(engQ(r.packageSize.quantity), parseExact(label.pkg.q));
  const core = nameAcc && qty && unit && pkg;
  const L = label.status, E = r.status;
  let cls: string;
  if (E === "ready") cls = L === "ready" && core ? "C1" : "C2";
  else if (L === "ready") cls = E === "needs_review" ? "C3" : "C4";
  else if (L === "needs_review") cls = E === "needs_review" ? "C5" : "C6";
  else cls = E === "unsupported" ? "C7" : "C8";
  const S: string[] = [];
  if (label.qty === null && r.quantity !== null) S.push("S1");
  if (E === "ready" && label.qty !== null && !qty) S.push("S2");
  if ((label.unit && r.unit && dim(label.unit) !== r.unit.dimension) || (label.pkg && r.packageSize && dim(label.pkg.u) !== r.packageSize.unit.dimension)) S.push("S3");
  if (L === "needs_review" && E === "ready") S.push("S4");
  if (labelAlts.length >= 2 && r.alternatives.length === 0 && r.name !== null && altSets.flat().map(norm).includes(norm(r.name))) S.push("S5");
  if (label.pkg && !r.packageSize && r.unit && (r.unit.dimension === "mass" || r.unit.dimension === "volume")) S.push("S6");
  if (E === "ready" && L === "ready" && !nameAcc && r.name && label.name) {
    const want = new Set(norm(label.name)!.split(" ")); const got = new Set(norm(r.name)!.split(" "));
    if (got.size < want.size && [...got].every((w) => want.has(w))) S.push("S7");
  }
  if (L === "unsupported" && E === "ready") S.push("S8");
  let sev: string | null = null;
  if (cls === "C2") sev = S.some((s) => s !== "S1") || !unit || !pkg ? "high" : !nameAcc && qty ? "medium" : "high";
  let partial: string | null = null;
  const alts = (r.alternatives ?? []).map(norm).sort();
  const altAcc = altSets.length ? altSets.some((xs) => { const s = [...new Set(xs.map(norm))].sort(); return s.length === alts.length && s.every((x, i) => x === alts[i]); }) : alts.length === 0;
  if (cls === "C3" || cls === "C5") {
    const contra = (r.name !== null && !nameAcc) || (r.quantity !== null && !qty) || (r.unit !== null && !unit) || (r.packageSize !== null && !pkg) || (alts.length > 0 && !altAcc);
    partial = contra ? "b" : r.name === null && r.quantity === null && r.unit === null && alts.length === 0 ? "c" : r.name !== null || (label.name === null && alts.length > 0) ? "a" : "x";
  }
  const got = `${E} | ${r.name ?? "-"} | ${qText(r.quantity)} | ${r.unit?.canonical ?? "-"} | ${r.packageSize ? qText(r.packageSize.quantity) + " " + r.packageSize.unit.canonical : "-"} | alts[${(r.alternatives ?? []).join("; ")}] | eq[${(r.equivalents ?? []).map((e: any) => qText(e.quantity) + " " + e.unit.canonical).join("; ")}] | form ${r.form ?? "-"} | note ${r.note ?? "-"} | ${r.reasons.join(",")}`;
  out.push({ input, flags, group, label: `${L} | ${nameF} | ${qtyF} | ${unitF} | ${pkgF} | ${altF}`, got, cls, partial, sev, S, altOk: altAcc, fields: { name: nameAcc, qty, unit, pkg } });
}
const cnt = (f: (x: any) => boolean) => out.filter(f).length;
const firm = out.filter((x) => !x.flags.includes("D"));
const summary = {
  engine: engineId, probes: out.length, debatable: cnt((x) => x.flags.includes("D")), invalid, safetyNetUsed: net, nondeterministic: nondet,
  byLabel: { ready: cnt((x) => x.label.startsWith("ready")), needs_review: cnt((x) => x.label.startsWith("needs_review")), unsupported: cnt((x) => x.label.startsWith("unsupported")) },
  classes: Object.fromEntries(["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"].map((c) => [c, cnt((x) => x.cls === c)])),
  classesFirm: Object.fromEntries(["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"].map((c) => [c, firm.filter((x) => x.cls === c).length])),
  C2sev: { high: cnt((x) => x.sev === "high"), medium: cnt((x) => x.sev === "medium") },
  C2sevFirm: { high: firm.filter((x) => x.sev === "high").length, medium: firm.filter((x) => x.sev === "medium").length },
  partials: Object.fromEntries(["C3a", "C3b", "C3c", "C3x", "C5a", "C5b", "C5c", "C5x"].map((k) => [k, cnt((x) => x.cls === k.slice(0, 2) && x.partial === k[2])])),
  S: Object.fromEntries(["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"].map((k) => [k, cnt((x) => x.S.includes(k))])),
  SFirm: Object.fromEntries(["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"].map((k) => [k, firm.filter((x) => x.S.includes(k)).length])),
};
writeFileSync(DIR + `probes-out-${engineId}.json`, JSON.stringify({ summary, probes: out }, null, 1));
const lines = out.map((x) => `${x.cls}${x.partial ?? ""}${x.sev ? "-" + x.sev : ""}${x.S.length ? " [" + x.S.join(",") + "]" : ""}${x.flags !== "-" ? " {" + x.flags + "}" : ""}\t${x.input}\n    label: ${x.label}\n    got:   ${x.got}`);
writeFileSync(DIR + `probes-out-${engineId}.txt`, lines.join("\n") + "\n");
console.log(JSON.stringify(summary, null, 1));
