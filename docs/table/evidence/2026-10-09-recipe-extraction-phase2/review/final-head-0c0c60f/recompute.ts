// Independent recomputation of EVALUATION-PLAN-v2 outcome figures from the fixtures and engine output.
// Uses only the engines and the unit registry from the package; does NOT import bench/*.
import { readFileSync } from "node:fs";
import { ENGINES } from "./repo/packages/recipe-extraction/src/ingredient/engines";
import { UNIT_REGISTRY } from "./repo/packages/recipe-extraction/src/contract";
import { guardedParse } from "./repo/packages/recipe-extraction/src/ingredient/semantic/engine";
import { validateParsedIngredientV1 } from "./repo/packages/recipe-extraction/src/validate";

const FIX = "/tmp/claude-0/-home-user-Meal-Planner/7c930bb6-c34b-51a2-998f-d2325352dd1d/scratchpad/final-review/repo/packages/recipe-extraction/fixtures/ingredients/";
const file = process.argv[2] ?? "holdout-v2.jsonl";
const engineId = process.argv[3] ?? "semantic-v1";
const cases = readFileSync(FIX + file, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));

type Q = [bigint, bigint];
const g = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : g(b, a % b));
const red = (n: bigint, d: bigint): Q => { const k = g(n, d); return [n / k, d / k]; };
function parseExact(s: string): Q {
  s = s.trim();
  let m = /^(\d+) (\d+)\/(\d+)$/.exec(s);
  if (m) { const w = BigInt(m[1]), n = BigInt(m[2]), d = BigInt(m[3]); return red(w * d + n, d); }
  m = /^(\d+)\/(\d+)$/.exec(s);
  if (m) return red(BigInt(m[1]), BigInt(m[2]));
  m = /^(\d+)(?:\.(\d+))?$/.exec(s);
  if (m) { const frac = m[2] ?? ""; const d = 10n ** BigInt(frac.length); return red(BigInt(m[1]) * d + BigInt(frac || "0"), d); }
  throw new Error("bad label qty " + s);
}
const qeq = (a: Q, b: Q) => a[0] === b[0] && a[1] === b[1];
const engQ = (q: any): Q | null => (q && q.kind === "exact" ? red(BigInt(q.numerator), BigInt(q.denominator)) : null);
function sameQty(label: string | null, got: any): boolean {
  if (label === null) return got === null;
  if (!got) return false;
  if (label.includes("..")) {
    const [a, b] = label.split("..").map(parseExact);
    return got.kind === "range" && qeq(engQ(got.min)!, a) && qeq(engQ(got.max)!, b);
  }
  return got.kind === "exact" && qeq(engQ(got)!, parseExact(label));
}
const norm = (s: any): string | null => {
  if (typeof s !== "string") return null;
  const t = s.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim().replace(/^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu, "");
  return t === "" ? null : t;
};
const dim = (u: string | null | undefined) => (u ? (UNIT_REGISTRY as any)[u]?.dimension ?? "?" : null);
const samePkg = (label: any, got: any) => (label === null ? got === null : !!got && got.unit?.canonical === label.unit && qeq(engQ(got.quantity) ?? [0n, 1n], parseExact(label.quantity)));

const engine = ENGINES[engineId];
const res: any[] = [];
let netUsed = 0, invalid = 0;
for (const c of cases) {
  const r: any = engine.parse(c.input);
  if (validateParsedIngredientV1(r).length) invalid++;
  if (engineId === "semantic-v1" && guardedParse(c.input).net !== "none") netUsed++;
  const e = c.expect;
  const accNames = [e.name, ...(c.accept?.name ?? [])].map(norm);
  const nameStrict = norm(r.name) === norm(e.name);
  const nameAcc = accNames.includes(norm(r.name));
  const qty = sameQty(e.quantity, r.quantity);
  const unit = (r.unit?.canonical ?? null) === e.unit;
  const pkg = samePkg(e.packageSize, r.packageSize);
  const core = nameAcc && qty && unit && pkg;
  const L = e.status, E = r.status;
  let cls: string;
  if (E === "ready") cls = L === "ready" && core ? "C1" : "C2";
  else if (L === "ready") cls = E === "needs_review" ? "C3" : "C4";
  else if (L === "needs_review") cls = E === "needs_review" ? "C5" : "C6";
  else cls = E === "unsupported" ? "C7" : "C8";
  const S: string[] = [];
  if (e.quantity === null && r.quantity !== null) S.push("S1");
  if (E === "ready" && e.quantity !== null && !qty) S.push("S2");
  if ((e.unit && r.unit && dim(e.unit) !== r.unit.dimension) || (e.packageSize && r.packageSize && dim(e.packageSize.unit) !== r.packageSize.unit.dimension)) S.push("S3");
  if (L === "needs_review" && E === "ready") S.push("S4");
  if (e.alternatives.length >= 2 && r.alternatives.length === 0 && r.name !== null) {
    const opts = [...e.alternatives, ...((c.accept?.alternatives ?? []).flat())].map(norm);
    if (opts.includes(norm(r.name))) S.push("S5");
  }
  if (e.packageSize && !r.packageSize && r.unit && (r.unit.dimension === "mass" || r.unit.dimension === "volume")) S.push("S6");
  if (E === "ready" && L === "ready" && !nameAcc && r.name) {
    const want = new Set(norm(e.name)!.split(" ")); const got = new Set(norm(r.name)!.split(" "));
    if (got.size < want.size && [...got].every((w) => want.has(w))) S.push("S7");
  }
  if (L === "unsupported" && E === "ready") S.push("S8");
  let sev: string | null = null;
  if (cls === "C2") sev = S.some((s) => s !== "S1") || !unit || !pkg ? "high" : !nameAcc && qty ? "medium" : "high";
  let partial: string | null = null;
  if (cls === "C3" || cls === "C5") {
    const alts = (r.alternatives ?? []).map(norm).sort();
    const altAcc = [e.alternatives, ...(c.accept?.alternatives ?? [])].some((xs: string[]) => { const s = [...new Set(xs.map(norm))].sort(); return s.length === alts.length && s.every((x, i) => x === alts[i]); });
    const contra = (r.name !== null && !nameAcc) || (r.quantity !== null && !qty) || (r.unit !== null && !unit) || (r.packageSize !== null && !pkg) || (alts.length > 0 && !altAcc);
    partial = contra ? "b" : r.name === null && r.quantity === null && r.unit === null && alts.length === 0 ? "c" : r.name !== null || (e.name === null && alts.length > 0) ? "a" : "x";
  }
  res.push({ id: c.id, L, E, cls, S, sev, partial, nameAcc, qty, unit, src: c.source?.kind, input: c.input });
}
const R = res.filter((x) => x.L === "ready");
const cnt = (xs: any[], f: (x: any) => boolean) => xs.filter(f).length;
const out = {
  engine: engineId, file, N: res.length, R: R.length, A: cnt(res, (x) => x.L === "needs_review"), U: cnt(res, (x) => x.L === "unsupported"),
  invalidOutputs: invalid, safetyNetUsed: netUsed,
  C1: cnt(R, (x) => x.cls === "C1"), C2: cnt(res, (x) => x.cls === "C2"), C2high: cnt(res, (x) => x.sev === "high"), C2medium: cnt(res, (x) => x.sev === "medium"),
  C3: cnt(R, (x) => x.cls === "C3"), C4: cnt(R, (x) => x.cls === "C4"),
  C3sub: Object.fromEntries(["a", "b", "c", "x"].map((k) => [k, cnt(R, (x) => x.cls === "C3" && x.partial === k)])),
  C5: cnt(res, (x) => x.cls === "C5"), C5sub: Object.fromEntries(["a", "b", "c", "x"].map((k) => [k, cnt(res, (x) => x.cls === "C5" && x.partial === k)])),
  C6: cnt(res, (x) => x.cls === "C6"), C7: cnt(res, (x) => x.cls === "C7"), C8: cnt(res, (x) => x.cls === "C8"),
  S: Object.fromEntries(["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"].map((k) => [k, res.filter((x) => x.S.includes(k)).map((x) => x.id)])),
  linesWithSevere: cnt(res, (x) => x.S.length > 0),
  fieldOnR: { name: cnt(R, (x) => x.nameAcc), qty: cnt(R, (x) => x.qty), unit: cnt(R, (x) => x.unit) },
  bySource: Object.fromEntries(["synthetic_pattern", "repo_test_input"].map((k) => [k, { R: cnt(R, (x) => x.src === k), C1: cnt(R, (x) => x.src === k && x.cls === "C1") }])),
  C2ids: res.filter((x) => x.cls === "C2").map((x) => `${x.id} ${x.sev} [${x.S}] ${x.input}`),
  C3C4ids: res.filter((x) => x.cls === "C3" || x.cls === "C4").map((x) => `${x.id} ${x.cls}${x.partial ?? ""} [${x.S}] ${x.input}`),
  C5b: res.filter((x) => x.cls === "C5" && x.partial === "b").map((x) => `${x.id} ${x.input}`),
  C8: res.filter((x) => x.cls === "C8").map((x) => `${x.id} ${x.input}`),
  C6: res.filter((x) => x.cls === "C6").map((x) => `${x.id} ${x.input}`),
};
console.log(JSON.stringify(out, null, 1));
