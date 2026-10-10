/**
 * R1 independent recomputation of the holdout-v3 evaluation (EVALUATION-PLAN-v3, v2 §3–§5 carried forward,
 * CONTRACT-v1 §9). Engines are run through the package's public API (`parseIngredientV1`), each input parsed twice;
 * every output is validated with `validateParsedIngredientV1` (inside classify.ts). Nothing under bench/ is imported.
 *
 * Usage (from repo/packages/recipe-extraction): npx tsx ../../../scripts/recompute.ts <out-dir>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseIngredientV1 } from "../repo/packages/recipe-extraction/src/index";
import { check, labelLine, outputLine, matcher, type Parse } from "./classify";

const ROOT = "/home/user/rx2b-r1/recompute-v3";
const PK = `${ROOT}/repo/packages/recipe-extraction`;
const outDir = process.argv[2] ?? ROOT;
const HOLDOUT = `${PK}/fixtures/ingredients/holdout-v3.jsonl`;
const bytes = readFileSync(HOLDOUT);
const holdoutSha = createHash("sha256").update(bytes).digest("hex");
const cases = bytes.toString("utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
const audit = JSON.parse(readFileSync(`${PK}/fixtures/EXPOSURE-AUDIT-v3.json`, "utf8"));
const exposed = new Set<string>(audit.matchedCaseIds);
const id3 = (n: string) => `ing-h3-${n}`;
const CPRIME_EXTRA = new Set(["0017", "0290", "0102", "0129", "0277", "0285", "0345"].map(id3));
const S1215 = ["0026", "0063", "0082", "0087", "0102", "0129", "0277", "0285", "0327", "0345"].map(id3);
const ENGINES = ["semantic-v2", "semantic-v1", "legacy-table-import-2", "legacy-table-import-2+suggestion"];

// ---------------------------------------------------------------- Wilson 95 %
const Z = 1.959964;
function wilson(k: number, n: number): [number, number] {
  if (n === 0) return [NaN, NaN];
  const p = k / n, d = 1 + (Z * Z) / n, c = p + (Z * Z) / (2 * n), h = Z * Math.sqrt((p * (1 - p)) / n + (Z * Z) / (4 * n * n));
  return [(c - h) / d, (c + h) / d];
}
const pct = (x: number) => (100 * x).toFixed(1);
const fmt = (k: number, n: number) => { const [lo, hi] = wilson(k, n); return n === 0 ? `${k}/0` : `${k}/${n} = ${pct(k / n)} % [${pct(Math.max(0, lo))}–${pct(Math.min(1, hi))}]`; };

// ---------------------------------------------------------------- run and classify
function runEngine(engine: string) {
  return cases.map((c) => {
    const parses: Parse[] = [];
    for (let i = 0; i < 2; i++) {
      try { parses.push({ output: parseIngredientV1(c.input, { engine }) }); } catch (e) { parses.push({ throws: String((e as Error)?.message ?? e) }); }
    }
    const res: any = check({ input: c.input, expect: c.expect, accept: c.accept }, parses as [Parse, Parse], { s6NeedsQuantity: false });
    // field accuracy on any status (reading 1: A2 counts a field whatever the engine status); a CE line is never accurate
    const fields: any = { nameStrict: false, nameAccepted: false, quantity: false, unit: false, packageSize: false };
    const first = parses[0] as any;
    if (res.outcome !== "CE" && "output" in first) {
      const L = labelLine(c.expect), E = outputLine(first.output);
      const acc = matcher(L, c.accept ?? {}, true), str = matcher(L, c.accept ?? {}, false);
      fields.nameStrict = str("name", E); fields.nameAccepted = acc("name", E); fields.quantity = acc("quantity", E); fields.unit = acc("unit", E); fields.packageSize = acc("packageSize", E);
    }
    const o = "output" in first ? first.output : null;
    return {
      id: c.id, input: c.input, label: c.expect.status, outcome: res.outcome, partial: res.partial, c1plus: res.c1plus, detailMismatch: res.detailMismatch,
      falseCertainty: res.falseCertainty, severe: res.severe, strict: res.strict, ce: res.ce, bareNoAmount: res.bareNoAmount,
      inventedOption: res.inventedOption, droppedOption: res.droppedOption, fields, problems: res.problems,
      debatable: !!c.debatable, reliesOnNewReading: !!c.reliesOnNewReading, exposed: exposed.has(c.id), family: c.family, contract12: c.contract12,
      output: o === null ? { throws: (first as any).throws } : {
        status: o.status, name: o.name, quantity: o.quantity?.display ?? (o.quantity ? JSON.stringify(o.quantity) : null), unit: o.unit?.canonical ?? null,
        packageSize: o.packageSize ? `${o.packageSize.quantity.display} ${o.packageSize.unit.canonical}` : null, note: o.note, alternatives: o.alternatives,
        equivalents: (o.equivalents ?? []).map((x: any) => `${x.quantity.display} ${x.unit.canonical}`), form: o.form, reasons: o.reasons,
      },
    };
  });
}

// ---------------------------------------------------------------- aggregates
function aggregate(rows: any[]) {
  const R = rows.filter((r) => r.label === "ready"), A = rows.filter((r) => r.label === "needs_review"), U = rows.filter((r) => r.label === "unsupported");
  const cnt = (rs: any[], f: (r: any) => boolean) => rs.filter(f).length;
  const cls = (rs: any[], c: string) => cnt(rs, (r) => r.outcome === c);
  const S: Record<string, string[]> = {};
  for (const s of ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]) S[s] = rows.filter((r) => r.severe.includes(s)).map((r) => r.id);
  const c2high = rows.filter((r) => r.outcome === "C2" && r.falseCertainty === "high").map((r) => r.id);
  const c2med = rows.filter((r) => r.outcome === "C2" && r.falseCertainty === "medium").map((r) => r.id);
  const sub = (rs: any[], c: string) => Object.fromEntries(["a", "b", "c", "x"].map((p) => [p, cnt(rs, (r) => r.outcome === c && r.partial === p)]));
  const field = (f: string) => cnt(R, (r) => r.fields[f]);
  const c1 = cls(R, "C1"), nR = R.length;
  const a1lo = wilson(c1, nR)[0];
  const a2 = { name: field("nameAccepted"), quantity: field("quantity"), unit: field("unit") };
  const ce = cls(rows, "CE");
  const G2 = {
    A1: { value: `${c1}/${nR}`, point: c1 / nR, met: c1 / nR >= 0.98, metWithConfidence: a1lo >= 0.98, wilsonLower: a1lo },
    A2: Object.fromEntries(Object.entries(a2).map(([k, v]) => [k, { value: `${v}/${nR}`, point: v / nR, met: v / nR >= 0.98, metWithConfidence: wilson(v, nR)[0] >= 0.98 }])),
    A3: { highC2: c2high.length, met: c2high.length === 0, ids: c2high },
    A4: { S1: S.S1.length, S3: S.S3.length, S4: S.S4.length, S5: S.S5.length, S6: S.S6.length, met: ["S1", "S3", "S4", "S5", "S6"].every((s) => S[s].length === 0) },
    A5: { value: `${cls(R, "C3") + cls(R, "C4")}/${nR}`, point: (cls(R, "C3") + cls(R, "C4")) / nR, met: (cls(R, "C3") + cls(R, "C4")) / nR <= 0.1 },
    A6ce: { CE: ce, met: ce === 0 },
  };
  (G2 as any).A2.met = Object.values((G2 as any).A2).every((x: any) => x.met);
  return {
    N: rows.length, R: nR, A: A.length, U: U.length,
    classes: {
      C1: c1, "C1+": cnt(R, (r) => r.outcome === "C1" && r.c1plus), detailMismatch: cnt(R, (r) => r.outcome === "C1" && r.detailMismatch),
      C2_onR: cls(R, "C2"), C2_onA: cls(A, "C2"), C2_onU: cls(U, "C2"), C2: cls(rows, "C2"), C2high: c2high.length, C2medium: c2med.length,
      C3: cls(R, "C3"), C3sub: sub(R, "C3"), C4: cls(R, "C4"), C5: cls(A, "C5"), C5sub: sub(A, "C5"), C6: cls(A, "C6"), C7: cls(U, "C7"), C8: cls(U, "C8"), CE: ce,
      CE_R: cls(R, "CE"), CE_A: cls(A, "CE"), CE_U: cls(U, "CE"),
    },
    strictC1: cnt(R, (r) => r.strict.outcome === "C1"), strictC1plus: cnt(R, (r) => r.strict.outcome === "C1" && r.strict.c1plus),
    fieldsOnR: { nameStrict: field("nameStrict"), nameAccepted: field("nameAccepted"), quantity: field("quantity"), unit: field("unit"), packageSize: field("packageSize") },
    S, c2high, c2med, invented: rows.filter((r) => r.inventedOption).map((r) => r.id), dropped: rows.filter((r) => r.droppedOption).map((r) => r.id),
    G2,
  };
}

const results: any = { holdout: { file: "fixtures/ingredients/holdout-v3.jsonl", sha256: holdoutSha, cases: cases.length }, engines: {} };
for (const e of ENGINES) {
  const rows = runEngine(e);
  const all = aggregate(rows);
  const sens: any = {};
  if (e === "semantic-v2") {
    const cset = new Set(rows.filter((r) => r.reliesOnNewReading).map((r) => r.id));
    sens.a_withoutDebatable = aggregate(rows.filter((r) => !r.debatable));
    sens.c_withoutNewReading = aggregate(rows.filter((r) => !r.reliesOnNewReading));
    sens.d_withoutExposureMatches = aggregate(rows.filter((r) => !r.exposed));
    sens.cprime_withoutCandCprimeList = aggregate(rows.filter((r) => !cset.has(r.id) && !CPRIME_EXTRA.has(r.id)));
    sens.row_12_15 = { ids: S1215, aggregate: aggregate(rows.filter((r) => S1215.includes(r.id))), lines: rows.filter((r) => S1215.includes(r.id)).map((r) => ({ id: r.id, input: r.input, label: r.label, outcome: r.outcome + (r.partial ?? ""), severe: r.severe })) };
    sens.removed = { a: rows.filter((r) => r.debatable).map((r) => r.id), c: rows.filter((r) => r.reliesOnNewReading).length, d: rows.filter((r) => r.exposed).map((r) => r.id), cprimeExtra: [...CPRIME_EXTRA] };
  }
  results.engines[e] = { aggregate: all, sensitivities: sens, perCase: rows };
}
const json = JSON.stringify(results, null, 1) + "\n";
writeFileSync(`${outDir}/recompute-results.json`, json);

// ---------------------------------------------------------------- markdown
const md: string[] = [];
const v2 = results.engines["semantic-v2"];
const g = v2.aggregate;
const L = (s: string) => md.push(s);
L(`holdout ${results.holdout.file} sha256 ${holdoutSha} (${cases.length} cases): N ${g.N}, R ${g.R}, A ${g.A}, U ${g.U}\n`);
L(`## semantic-v2 — outcome classes (accepted values; Wilson 95 %)\n`);
L(`| class | count / denominator |`); L(`|---|---|`);
const c = g.classes;
L(`| C1 (on R) | ${fmt(c.C1, g.R)} |`); L(`| C1+ (on R) | ${fmt(c["C1+"], g.R)} |`); L(`| C1 detail mismatch (low; on R) | ${fmt(c.detailMismatch, g.R)} |`);
L(`| C1 strict (on R) | ${fmt(g.strictC1, g.R)} |`); L(`| C1+ strict (on R) | ${fmt(g.strictC1plus, g.R)} |`);
L(`| C2 on R | ${fmt(c.C2_onR, g.R)} |`); L(`| C2 on A (S4) | ${fmt(c.C2_onA, g.A)} |`); L(`| C2 on U (S8) | ${fmt(c.C2_onU, g.U)} |`);
L(`| C2 all (on N) | ${fmt(c.C2, g.N)} |`); L(`| C2 high (on N) | ${fmt(c.C2high, g.N)} |`); L(`| C2 medium (on N) | ${fmt(c.C2medium, g.N)} |`);
L(`| C3 (on R) | ${fmt(c.C3, g.R)} — a ${c.C3sub.a}, b ${c.C3sub.b}, c ${c.C3sub.c}, x ${c.C3sub.x} |`);
L(`| C4 (on R) | ${fmt(c.C4, g.R)} |`);
L(`| C5 (on A) | ${fmt(c.C5, g.A)} — a ${c.C5sub.a}, b ${c.C5sub.b}, c ${c.C5sub.c}, x ${c.C5sub.x} |`);
L(`| C6 (on A) | ${fmt(c.C6, g.A)} |`); L(`| C7 (on U) | ${fmt(c.C7, g.U)} |`); L(`| C8 (on U) | ${fmt(c.C8, g.U)} |`); L(`| CE (on N) | ${fmt(c.CE, g.N)} |`);
L(`\n## semantic-v2 — S codes (any status)\n`);
for (const [s, ids] of Object.entries(g.S) as [string, string[]][]) L(`- ${s}: ${ids.length}${ids.length ? " — " + ids.join(", ") : ""}`);
L(`- C2 high: ${g.c2high.join(", ") || "none"}; C2 medium: ${g.c2med.join(", ") || "none"}`);
L(`- invented options: ${g.invented.join(", ") || "none"}; dropped options: ${g.dropped.join(", ") || "none"}`);
L(`\n## semantic-v2 — field accuracy on R (any engine status)\n`);
for (const [f, k] of Object.entries(g.fieldsOnR) as [string, number][]) L(`- ${f}: ${fmt(k, g.R)}`);
const gate = (G: any) => [
  `A1 C1 on R ${G.A1.value} = ${pct(G.A1.point)} % → ${G.A1.met ? "met" : "NOT met"} (point); Wilson lower ${pct(G.A1.wilsonLower)} % → ${G.A1.metWithConfidence ? "met with confidence" : "not met with confidence"}`,
  `A2 name ${G.A2.name.value} (${pct(G.A2.name.point)} %), quantity ${G.A2.quantity.value} (${pct(G.A2.quantity.point)} %), unit ${G.A2.unit.value} (${pct(G.A2.unit.point)} %) → ${G.A2.met ? "met" : "NOT met"}` +
    ` (with confidence: name ${G.A2.name.metWithConfidence}, quantity ${G.A2.quantity.metWithConfidence}, unit ${G.A2.unit.metWithConfidence})`,
  `A3 high C2 = ${G.A3.highC2} → ${G.A3.met ? "met" : "NOT met"}${G.A3.ids.length ? " (" + G.A3.ids.join(", ") + ")" : ""}`,
  `A4 S1 ${G.A4.S1}, S3 ${G.A4.S3}, S4 ${G.A4.S4}, S5 ${G.A4.S5}, S6 ${G.A4.S6} → ${G.A4.met ? "met" : "NOT met"}`,
  `A5 C3+C4 on R ${G.A5.value} = ${pct(G.A5.point)} % → ${G.A5.met ? "met" : "NOT met"}`,
  `A6 (part) CE = ${G.A6ce.CE} → ${G.A6ce.met ? "met" : "NOT met"}`,
];
L(`\n## semantic-v2 — Gate G2 (A1–A5, CE part of A6)\n`);
for (const s of gate(g.G2)) L(`- ${s}`);
L(`\n## semantic-v2 — sensitivities (informational)\n`);
for (const [k, title] of [["a_withoutDebatable", "(a) without debatable"], ["c_withoutNewReading", "(c) without reliesOnNewReading"], ["d_withoutExposureMatches", "(d) without exposure-audit matches"], ["cprime_withoutCandCprimeList", "(c′) without (c) and the 7 pre-registered cases"]] as [string, string][]) {
  const s = v2.sensitivities[k];
  L(`### ${title}: N ${s.N}, R ${s.R}, A ${s.A}, U ${s.U}`);
  for (const x of gate(s.G2)) L(`- ${x}`);
  L(`- S codes: ${Object.entries(s.S).filter(([, v]) => (v as string[]).length).map(([kk, v]) => `${kk} ${(v as string[]).join(" ")}`).join("; ") || "none"}`);
}
L(`### §12.15 supplementary row (${S1215.length} lines)`);
for (const x of v2.sensitivities.row_12_15.lines) L(`- ${x.id} \`${x.input}\` label ${x.label} → ${x.outcome}${x.severe.length ? " [" + x.severe.join(" ") + "]" : ""}`);
const r15 = v2.sensitivities.row_12_15.aggregate;
L(`- C1 on R ${fmt(r15.classes.C1, r15.R)}; C5 on A ${fmt(r15.classes.C5, r15.A)}; C7 on U ${r15.U ? fmt(r15.classes.C7, r15.U) : "0/0"}; S codes: ${Object.entries(r15.S).filter(([, v]) => (v as string[]).length).map(([kk, v]) => `${kk} ${(v as string[]).join(" ")}`).join("; ") || "none"}`);
L(`\n## Context engines (C1 / C2 / S totals)\n`);
L(`| engine | C1 on R | C1+ on R | C2 (high/medium) | C3/C4 on R | C5/C6 on A | C7/C8 on U | CE | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 |`);
L(`|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|`);
for (const e of ENGINES) {
  const a = results.engines[e].aggregate, k = a.classes;
  L(`| ${e} | ${k.C1}/${a.R} | ${k["C1+"]}/${a.R} | ${k.C2} (${k.C2high}/${k.C2medium}) | ${k.C3}/${k.C4} | ${k.C5}/${k.C6} | ${k.C7}/${k.C8} | ${k.CE} | ${["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"].map((s) => a.S[s].length).join(" | ")} |`);
}
L(`\n## semantic-v2 — every line not C1/C5/C7 (and every S code)\n`);
for (const r of v2.perCase) {
  if (["C1", "C5", "C7"].includes(r.outcome) && r.severe.length === 0 && !(r.outcome === "C5" && r.partial === "b")) continue;
  L(`- ${r.id} \`${r.input}\` label ${r.label}${r.debatable ? " (debatable)" : ""} → **${r.outcome}${r.partial ?? ""}${r.falseCertainty ? " " + r.falseCertainty : ""}**${r.severe.length ? " [" + r.severe.join(" ") + "]" : ""} — ${JSON.stringify(r.output)}`);
}
writeFileSync(`${outDir}/recompute-summary.md`, md.join("\n") + "\n");
console.log(md.slice(0, 60).join("\n"));
