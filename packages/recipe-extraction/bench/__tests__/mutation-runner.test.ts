/**
 * The package mutation runner's pure parts (tools/mutation/lib.ts): the spec format, the exact string
 * replacement, and the classification of a vitest JSON report into KILLED / KILLED-UNEXPECTED / SURVIVED
 * / ERROR — in particular that a setup failure is never a kill. The checked-in spec files must be valid
 * and every anchor of an expected kill must occur exactly once in the file it mutates. (The end-to-end
 * self-test is tools/mutation/specs/selftest.json, run by the runner itself.)
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { applyMutation, classify, countOccurrences, specProblems, testName, type Spec, type VitestReport } from "../../tools/mutation/lib";

const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SPECS = path.join(PKG, "tools/mutation/specs");

const okSpec = (): Spec => ({
  format: "recipe-extraction-mutations/v1",
  owner: "test",
  description: "test spec",
  mutations: [{ id: "m1", description: "d", file: "bench/outcomes.ts", find: "a", replace: "b", tests: ["bench/__tests__/x.test.ts"], killedBy: [{ test: "suite > t", reason: "^AssertionError" }], expect: "KILLED" }],
});

const assertion = (ancestors: string[], title: string, status: "passed" | "failed" | "skipped", message = "") => ({
  ancestorTitles: ancestors,
  title,
  status,
  failureMessages: status === "failed" ? [message] : [],
});
const report = (tests: ReturnType<typeof assertion>[], fileMessage = ""): VitestReport => ({
  numTotalTests: tests.length,
  numFailedTests: tests.filter((t) => t.status === "failed").length,
  numPassedTests: tests.filter((t) => t.status === "passed").length,
  success: tests.every((t) => t.status !== "failed") && fileMessage === "",
  testResults: [{ name: "/tmp/x/bench/__tests__/x.test.ts", status: fileMessage || tests.some((t) => t.status === "failed") ? "failed" : "passed", message: fileMessage, assertionResults: tests }],
});
const ok = { ok: true as const };
const killer = [{ test: "suite > t", reason: "^AssertionError: severe:" }];

describe("spec format", () => {
  it("accepts a valid spec and the checked-in spec files", () => {
    expect(specProblems(okSpec())).toEqual([]);
    const files = readdirSync(SPECS).filter((f) => f.endsWith(".json"));
    expect(files).toEqual(expect.arrayContaining(["scorer.json", "selftest.json"]));
    for (const f of files) expect(specProblems(JSON.parse(readFileSync(path.join(SPECS, f), "utf8")), f), f).toEqual([]);
  });

  it("rejects malformed specs with a reason for each problem", () => {
    const bad = okSpec() as unknown as { format: string; extra?: number; mutations: Record<string, unknown>[] };
    bad.format = "v0";
    bad.extra = 1;
    bad.mutations.push({ ...bad.mutations[0] }, { id: "m 2", file: "/abs.ts", find: "", replace: 1, tests: [], killedBy: [], expect: "MAYBE", occurrence: 0, color: "red" });
    bad.mutations.push({ id: "m3", description: "d", file: "../x.ts", find: "a", replace: "b", tests: ["../t.ts"], killedBy: [{ test: "t", reason: "(" }], expect: "KILLED" });
    bad.mutations.push({ id: "m4", description: "d", file: "x.ts", find: "a", replace: "b", tests: ["t.ts"], killedBy: [], expect: "KILLED" });
    const p = specProblems(bad).join("\n");
    for (const re of [
      /format must be/, /unknown key "extra"/, /duplicate id/, /id must be letters/, /file must be package-relative/, /find must be a non-empty string/, /replace must be a string/,
      /tests must be a non-empty array/, /expect must be one of/, /occurrence must be a positive integer/, /unknown key "color"/, /test file \.\.\/t\.ts must be package-relative/,
      /reason is not a valid regular expression/, /a mutation expected to be KILLED must name its killing tests/,
    ])
      expect(p).toMatch(re);
    expect(specProblems(null)).toEqual(["spec: not a JSON object"]);
    expect(specProblems({ ...okSpec(), mutations: [] }).join()).toMatch(/mutations must be a non-empty array/);
  });

  it("every anchor of an expected kill occurs exactly once in the file it mutates (no spec rot)", () => {
    for (const f of readdirSync(SPECS).filter((x) => x.endsWith(".json"))) {
      const spec = JSON.parse(readFileSync(path.join(SPECS, f), "utf8")) as Spec;
      for (const m of spec.mutations.filter((x) => x.expect === "KILLED" || x.expect === "SURVIVED"))
        expect(countOccurrences(readFileSync(path.join(PKG, m.file), "utf8"), m.find), `${f} ${m.id}`).toBe(1);
    }
  });
});

describe("exact string replacement", () => {
  it("replaces exactly one occurrence; a missing or ambiguous anchor is an error, not a silent no-op", () => {
    expect(applyMutation("a b a", { find: "b", replace: "c" })).toEqual({ text: "a c a" });
    expect(applyMutation("a b a", { find: "z", replace: "c" })).toEqual({ error: "anchor not found", occurrences: 0 });
    expect(applyMutation("a b a", { find: "a", replace: "c" })).toEqual({ error: 'anchor occurs 2 times (give "occurrence")', occurrences: 2 });
    expect(applyMutation("a b a", { find: "a", replace: "c", occurrence: 2 })).toEqual({ text: "a b c" });
    expect(applyMutation("a b a", { find: "a", replace: "c", occurrence: 3 })).toEqual({ error: "occurrence 3 requested, anchor occurs 2 times", occurrences: 2 });
    expect(applyMutation("abc", { find: "abc", replace: "abc" })).toEqual({ text: "abc" });
    expect(countOccurrences("aaaa", "aa")).toBe(2);
    expect(countOccurrences("x", "")).toBe(0);
  });
});

describe("classification", () => {
  it("KILLED: an intended test fails by assertion for the intended reason", () => {
    const c = classify({ anchor: ok, report: report([assertion(["suite"], "t", "failed", "AssertionError: severe: expected [ 'S1' ] to deeply equal []\n    at x"), assertion(["suite"], "u", "passed")]), killedBy: killer });
    expect(c).toMatchObject({ result: "KILLED", killedByIntended: ["suite > t"], tests: { total: 2, passed: 1, failed: 1 } });
    expect(c.failed).toEqual([{ test: "suite > t", message: "AssertionError: severe: expected [ 'S1' ] to deeply equal []" }]);
  });

  it("KILLED-UNEXPECTED: only other tests fail, or the intended test fails without an assertion or for another reason", () => {
    expect(classify({ anchor: ok, report: report([assertion(["suite"], "t", "passed"), assertion(["other"], "v", "failed", "AssertionError: x")]), killedBy: killer }).result).toBe("KILLED-UNEXPECTED");
    expect(classify({ anchor: ok, report: report([assertion(["suite"], "t", "failed", "TypeError: cannot read properties of undefined")]), killedBy: killer }).result).toBe("KILLED-UNEXPECTED");
    expect(classify({ anchor: ok, report: report([assertion(["suite"], "t", "failed", "AssertionError: outcome: expected 'C2' to be 'CE'")]), killedBy: killer }).result).toBe("KILLED-UNEXPECTED");
    expect(classify({ anchor: ok, report: report([assertion(["suite"], "t", "failed", "AssertionError: severe: x")]), killedBy: [{ test: "suite > t" }] }).result).toBe("KILLED");
  });

  it("SURVIVED: every test ran and passed", () => {
    expect(classify({ anchor: ok, report: report([assertion(["suite"], "t", "passed")]), killedBy: killer })).toMatchObject({ result: "SURVIVED", why: "all 1 tests passed" });
  });

  it("ERROR, never KILLED: missing anchor, failed baseline, no report, a file that fails to load, no test run, an unknown killer", () => {
    const failing = report([assertion(["suite"], "t", "failed", "AssertionError: severe: x")]);
    expect(classify({ anchor: { ok: false, error: "anchor not found" }, report: failing, killedBy: killer })).toMatchObject({ result: "ERROR", why: "replacement not applied: anchor not found" });
    expect(classify({ anchor: ok, report: failing, killedBy: killer, baselineOk: false }).result).toBe("ERROR");
    expect(classify({ anchor: ok, report: null, killedBy: killer })).toMatchObject({ result: "ERROR", why: "vitest produced no JSON report" });
    expect(classify({ anchor: ok, report: failing, killedBy: killer, runnerError: "vitest could not run" })).toMatchObject({ result: "ERROR", why: "vitest could not run" });
    const loadError = report([], "Transform failed with 1 error:\n\u001b[31m[PARSE_ERROR]\u001b[0m Unexpected token");
    expect(classify({ anchor: ok, report: loadError, killedBy: killer })).toMatchObject({ result: "ERROR", why: "test file failed to compile or load: x.test.ts: Transform failed with 1 error:" });
    expect(classify({ anchor: ok, report: report([assertion(["suite"], "t", "failed", "AssertionError: severe: x")], "Error: afterAll hook failed"), killedBy: killer }).result).toBe("ERROR");
    expect(classify({ anchor: ok, report: report([]), killedBy: killer })).toMatchObject({ result: "ERROR", why: "no tests ran" });
    expect(classify({ anchor: ok, report: report([assertion(["suite"], "t", "skipped")]), killedBy: killer })).toMatchObject({ result: "ERROR", why: "no tests ran" });
    expect(classify({ anchor: ok, report: failing, killedBy: [{ test: "suite > nope" }] })).toMatchObject({ result: "ERROR", why: "killedBy test(s) not in this run: suite > nope" });
  });

  it("test names join describe titles and the test title with ' > '", () => {
    expect(testName({ ancestorTitles: ["a", "b"], title: "c" })).toBe("a > b > c");
    expect(testName({ ancestorTitles: [], title: "c" })).toBe("c");
  });
});
