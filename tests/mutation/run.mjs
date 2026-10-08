#!/usr/bin/env node
// Mutation checks with honest classification (review finding V01).
//
// For every mutation: inject a forbidden behavior, run ONLY its targeted tests with vitest's
// JSON reporter, and classify:
//   KILLED   targeted tests executed, and at least one EXPECTED test failed with an assertion
//   SURVIVED targeted tests executed and all passed
//   ERROR    anything else: runner/compiler/database failure, no tests executed, anchor not
//            found, failures that are not assertions, or an unexpected test failing instead
// A clean (unmutated) baseline of each targeted selection must pass first. Sources are
// restored on every path and verified by SHA-256. Full logs and a results.json are kept.
//
// Usage: node tests/mutation/run.mjs [--out DIR] [--only name[,name]] [--include-controls]
// Exit 0 only if every selected mutation is KILLED (controls are expected to SURVIVE).
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
process.chdir(ROOT);
const args = process.argv.slice(2);
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const OUT = path.resolve(opt("--out") ?? `/tmp/table-mutation-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const ONLY = opt("--only")?.split(",") ?? null;
const CONTROLS = args.includes("--include-controls");
mkdirSync(OUT, { recursive: true });

const PLAN = "tests/integration/plan.contract.test.ts";
const GROC = "tests/integration/groceries.contract.test.ts";
const REV = "tests/integration/review-regressions.test.ts";

/** expect: regexes over failing test full names; at least one must fail by assertion. */
const MUTATIONS = [
  { name: "blanket_week_conflict", file: "src/server/commands/plan.ts", suite: PLAN, pattern: "T10", expect: [/T10/],
    edits: [["    const stale = closureStale({ assignments: preview.base.assignments, events: preview.base.events }, state);",
      "    const stale = week.acceptedChoiceRevision !== preview.base.acceptedChoiceRevision ? { stale: true, changed: [] } : closureStale({ assignments: preview.base.assignments, events: preview.base.events }, state);"]] },
  { name: "last_write_wins", file: "src/server/commands/plan.ts", suite: PLAN, pattern: "T08|T11|T22", expect: [/T08|T11|T22/],
    edits: [["    if (stale.stale) {", "    if (false && stale.stale) {"], ["    if (res.contentHash !== preview.content_hash) {", "    if (false) {"]] },
  { name: "stale_adoption", file: "src/server/commands/plan.ts", suite: PLAN, pattern: "T12", expect: [/T12/],
    edits: [["if (week.acceptedChoiceRevision !== p.expectedAcceptedChoiceRevision || week.acceptedChoiceRevision !== proposal.base_accepted_choice_revision) {", "if (false) {"]] },
  { name: "stale_send", file: "src/server/commands/purchasing.ts", suite: GROC, pattern: "T13|T14", expect: [/T13|T14/],
    edits: [["    if (summary.reviewFingerprint !== p.reviewFingerprint || summary.payloadHash !== p.payloadHash) {", "    if (false) {"],
      ["    if (hashOf(payload) !== p.payloadHash) throw", "    if (false) throw"]] },
  { name: "approvals_not_consumed", file: "src/server/commands/purchasing.ts", suite: GROC, pattern: "X03", expect: [/X03/],
    edits: [["      await c.query(\"UPDATE purchase_approvals SET state='consumed'", "      if (false) await c.query(\"UPDATE purchase_approvals SET state='consumed'"]] },
  { name: "uncertain_as_unsent", file: "src/domain/groceries/projection.ts", suite: GROC, pattern: "T16", expect: [/T16/],
    edits: [["      if (b.status === \"uncertain\") uncertain += n;\n      else sent += n;", "      if (b.status === \"uncertain\") continue;\n      else sent += n;"]] },
  { name: "dispatch_superseded", file: "src/server/commands/purchasing.ts", suite: GROC, pattern: "T17", expect: [/superseded queued work/],
    edits: [["    if (superseded.length) {", "    if (false) {"]] },
  // Corrections from the review of 89f3ea9: each reintroduces the reported defect.
  { name: "F01_admission_skipped", file: "src/server/commands/plan.ts", suite: REV, pattern: "R-F01", expect: [/R-F01[abc]/],
    edits: [["    if (admission.problems.length) {", "    if (false) {"]] },
  { name: "F02_locked_group_dropped", file: "src/server/commands/plan.ts", suite: REV, pattern: "R-F02", expect: [/R-F02a/],
    edits: [[".filter((a) => a.locked || (a.cookingEventId && lockedEvents.has(a.cookingEventId)))", ".filter((a) => a.locked)"]] },
  { name: "F03_place_skips_exclusions", file: "src/domain/planning/operations.ts", suite: REV, pattern: "R-F03", expect: [/R-F03a/],
    edits: [["      checkNewRecipe(rv); // placing", "      // checkNewRecipe(rv); // placing"]] },
  { name: "F04_order_hides_transfers", file: "src/domain/groceries/projection.ts", suite: REV, pattern: "R-F04", expect: [/R-F04[abc]/],
    edits: [["      if (reconciled.has(b.id)) continue;", "      if (order) continue;"]] },
  { name: "F05_substitute_counts_as_original", file: "src/domain/groceries/projection.ts", suite: REV, pattern: "R-F05", expect: [/R-F05[ab]/],
    edits: [["toP(ol.packages - mis - sub, ol.packageQty, ol.packageUnit)", "toP(ol.packages - mis, ol.packageQty, ol.packageUnit)"]] },
  { name: "F06_enough_uses_current_demand", file: "src/server/commands/groceries.ts", suite: REV, pattern: "R-F06", expect: [/R-F06a/],
    edits: [["[actor.householdId, cycleId, p.ingredientKey, p.state, p.quantity ?? null, p.unit ? normalizeUnit(p.unit) : null, reviewedDemand, reviewedUnit, actor.memberId],",
      "[actor.householdId, cycleId, p.ingredientKey, p.state, p.quantity ?? null, p.unit ? normalizeUnit(p.unit) : null, line.meal?.quantity ?? reviewedDemand, line.meal?.unit ?? reviewedUnit, actor.memberId],"]] },
  { name: "F07_capture_into_confirmed_pickup", file: "src/server/commands/groceries.ts", suite: REV, pattern: "R-F07", expect: [/R-F07b/],
    edits: [["      if (!confirmed.rowCount) break;", "      break;"]] },
  { name: "F08_single_week_recompute", file: "src/server/commands/framework.ts", suite: REV, pattern: "R-F08", expect: [/R-F08/],
    edits: [["      if (outcome.purchasingInputsChanged) {", "      if (false) {"]] },
  { name: "B3_extra_cost_reprices_history", file: "src/server/commands/plan.ts", suite: "tests/integration/b3.received-goods.test.ts", pattern: "B3", expect: [/labels and favors/],
    edits: [["current.outstandingPurchase.complete && next.outstandingPurchase.complete\n      ? { known: true, minor: next.outstandingPurchase.knownMinor - current.outstandingPurchase.knownMinor }",
      "current.pickupSpending.complete && next.pickupSpending.complete\n      ? { known: true, minor: next.pickupSpending.knownMinor - current.pickupSpending.knownMinor }"]] },
];
// A harmless change that MUST be classified SURVIVED (proves the classifier can say so).
const CONTROLS_LIST = [
  { name: "control_noop_comment", control: true, file: "src/server/commands/plan.ts", suite: PLAN, pattern: "T10", expect: [/T10/],
    edits: [["const ISO_DATE = ", "/* mutation-control */ const ISO_DATE = "]] },
];

const selected = [...MUTATIONS, ...(CONTROLS ? CONTROLS_LIST : [])].filter((m) => !ONLY || ONLY.includes(m.name));
const files = [...new Set(selected.map((m) => m.file))];
const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
const backupDir = path.join(OUT, "backup");
mkdirSync(backupDir, { recursive: true });
const original = Object.fromEntries(files.map((f) => [f, sha(f)]));
for (const f of files) copyFileSync(f, path.join(backupDir, f.replace(/\//g, "__")));
const restore = () => {
  for (const f of files) copyFileSync(path.join(backupDir, f.replace(/\//g, "__")), f);
};
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restore(); process.exit(130); });

function runVitest(label, suite, pattern) {
  const json = path.join(OUT, `${label}.json`);
  const r = spawnSync("npx", ["vitest", "run", suite, "-t", pattern, "--reporter=json", `--outputFile=${json}`], { encoding: "utf8", env: process.env, maxBuffer: 64 * 1024 * 1024 });
  writeFileSync(path.join(OUT, `${label}.log`), `$ npx vitest run ${suite} -t "${pattern}"\nexit ${r.status} signal ${r.signal ?? ""}\n--- stdout\n${r.stdout ?? ""}\n--- stderr\n${r.stderr ?? ""}\n${r.error ? `spawn error: ${r.error.message}\n` : ""}`);
  let report = null;
  try {
    report = existsSync(json) ? JSON.parse(readFileSync(json, "utf8")) : null;
  } catch {
    report = null;
  }
  return { exit: r.status, report };
}

function summarize(report) {
  const tests = (report?.testResults ?? []).flatMap((f) => f.assertionResults ?? []);
  const executed = tests.filter((t) => t.status === "passed" || t.status === "failed");
  const failed = executed.filter((t) => t.status === "failed");
  const suiteErrors = (report?.testResults ?? []).filter((f) => f.status === "failed" && (f.assertionResults ?? []).every((t) => t.status !== "failed")).map((f) => f.message);
  const isAssertion = (t) => t.failureMessages.some((m) => /AssertionError|expected .* (to|not to) /.test(m)) && !t.failureMessages.some((m) => /ECONNREFUSED|database .* does not exist|SyntaxError|Cannot find module|Transform failed|ERR_MODULE_NOT_FOUND/.test(m));
  return { executed: executed.length, passed: executed.length - failed.length, failed, suiteErrors, isAssertion };
}

const results = [];
let infraError = false;
try {
  // 1. Clean baseline for every distinct targeted selection.
  const baselines = new Map();
  for (const m of selected) {
    const key = `${m.suite}::${m.pattern}`;
    if (baselines.has(key)) continue;
    const { exit, report } = runVitest(`baseline-${baselines.size}`, m.suite, m.pattern);
    const s = summarize(report);
    const ok = exit === 0 && report && s.executed > 0 && s.failed.length === 0 && s.suiteErrors.length === 0;
    baselines.set(key, { ok, executed: s.executed, exit });
    console.log(`baseline ${ok ? "clean" : "NOT CLEAN"}: ${m.suite} -t "${m.pattern}" (${s.executed} executed, exit ${exit})`);
  }
  // 2. Mutations.
  for (const m of selected) {
    const base = baselines.get(`${m.suite}::${m.pattern}`);
    restore();
    let classification;
    let detail = "";
    if (!base.ok) {
      classification = "ERROR";
      detail = "baseline not clean";
    } else {
      let text = readFileSync(m.file, "utf8");
      const missing = m.edits.find(([a]) => !text.includes(a));
      if (missing) {
        classification = "ERROR";
        detail = `anchor not found: ${missing[0].slice(0, 80)}`;
      } else {
        for (const [a, b] of m.edits) text = text.replace(a, b);
        writeFileSync(m.file, text);
        const { exit, report } = runVitest(`mutation-${m.name}`, m.suite, m.pattern);
        restore();
        const s = summarize(report);
        const expected = s.failed.filter((t) => m.expect.some((re) => re.test(t.fullName)) && s.isAssertion(t));
        const unexpectedInfra = s.failed.filter((t) => !s.isAssertion(t));
        if (!report || s.executed === 0) {
          classification = "ERROR";
          detail = `no tests executed (runner exit ${exit})`;
        } else if (s.suiteErrors.length || unexpectedInfra.length) {
          classification = "ERROR";
          detail = `non-assertion failure: ${(s.suiteErrors[0] ?? unexpectedInfra[0].failureMessages[0] ?? "").split("\n")[0].slice(0, 160)}`;
        } else if (s.failed.length === 0) {
          classification = "SURVIVED";
          detail = `${s.executed} executed, all passed`;
        } else if (expected.length) {
          classification = "KILLED";
          detail = `${s.failed.length}/${s.executed} failed by assertion: ${expected.map((t) => t.title).slice(0, 3).join(" | ")}`;
        } else {
          classification = "ERROR";
          detail = `failed, but not an expected test: ${s.failed.map((t) => t.title).slice(0, 2).join(" | ")}`;
        }
      }
    }
    const want = m.control ? "SURVIVED" : "KILLED";
    results.push({ name: m.name, control: !!m.control, classification, expectedClassification: want, ok: classification === want, detail });
    console.log(`${classification.padEnd(8)} ${m.name}${m.control ? " (control)" : ""} — ${detail}`);
  }
} catch (e) {
  infraError = true;
  results.push({ name: "harness", classification: "ERROR", ok: false, detail: String(e?.stack ?? e) });
  console.log(`ERROR    harness — ${e?.message ?? e}`);
} finally {
  restore();
}
const restored = files.every((f) => sha(f) === original[f]);
if (!restored) console.log("ERROR    sources were not restored byte-for-byte");
const pass = !infraError && restored && results.length === selected.length && results.every((r) => r.ok);
writeFileSync(path.join(OUT, "results.json"), JSON.stringify({ when: new Date().toISOString(), head: safe(() => execFileSync("git", ["rev-parse", "HEAD"]).toString().trim()), restored, pass, results }, null, 2));
console.log(`${pass ? "PASS" : "FAIL"}: ${results.filter((r) => r.classification === "KILLED").length} killed, ${results.filter((r) => r.classification === "SURVIVED").length} survived, ${results.filter((r) => r.classification === "ERROR").length} error — logs in ${OUT}`);
process.exit(pass ? 0 : 1);

function safe(f) {
  try {
    return f();
  } catch {
    return null;
  }
}
