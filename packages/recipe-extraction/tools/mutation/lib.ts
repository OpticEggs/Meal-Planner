/**
 * Package mutation runner — the pure parts: the spec format, anchor counting, and the classification
 * of one mutated test run from vitest's JSON report. No I/O here (run.ts does the copying and running).
 *
 * Spec files (JSON, any owner; format documented in tools/mutation/README.md):
 *   { "format": "recipe-extraction-mutations/v1", "owner": "...", "description": "...",
 *     "mutations": [ { "id", "description", "file", "find", "replace", "occurrence"?, "tests",
 *                      "testNamePattern"?, "killedBy": [ { "test", "reason"? } ], "expect" } ] }
 *
 * Result classes:
 *   KILLED            at least one test named in `killedBy` failed with an assertion failure
 *                     (failure message starts with "AssertionError") matching its `reason` (when given);
 *   KILLED-UNEXPECTED tests failed, but no `killedBy` test failed that way (only other tests failed, or
 *                     an expected test failed for another reason, e.g. a TypeError);
 *   SURVIVED          every test ran and passed;
 *   ERROR             setup failure, never a kill: the anchor was not found (or not unique), a test file
 *                     failed to compile or load, vitest produced no report, no test ran, a `killedBy`
 *                     test does not exist in the run, or the unmutated baseline already failed.
 */

export const SPEC_FORMAT = "recipe-extraction-mutations/v1";
export const RESULT_CLASSES = ["KILLED", "KILLED-UNEXPECTED", "SURVIVED", "ERROR"] as const;
export type ResultClass = (typeof RESULT_CLASSES)[number];

export interface Killer {
  /** Full test name: describe titles and the test title joined by " > ". */
  test: string;
  /** Optional regular expression the first line of the failure message must match. */
  reason?: string;
}

export interface Mutation {
  id: string;
  description: string;
  /** Package-relative file to mutate. */
  file: string;
  /** Exact text to replace (must occur exactly once unless `occurrence` picks one, 1-based). */
  find: string;
  replace: string;
  occurrence?: number;
  /** Package-relative test files (vitest filters) to run. */
  tests: string[];
  /** Optional vitest -t pattern. */
  testNamePattern?: string;
  /** The tests that must fail by assertion for KILLED (may be empty only when `expect` is not KILLED). */
  killedBy: Killer[];
  /** The result the spec author expects; the runner fails when the result differs. */
  expect: ResultClass;
}

export interface Spec {
  format: typeof SPEC_FORMAT;
  owner: string;
  description: string;
  mutations: Mutation[];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;

/** Validate a parsed spec file; returns the problems (empty = valid). */
export function specProblems(raw: unknown, where = "spec"): string[] {
  const p: string[] = [];
  if (!isObj(raw)) return [`${where}: not a JSON object`];
  if (raw.format !== SPEC_FORMAT) p.push(`${where}: format must be "${SPEC_FORMAT}"`);
  for (const k of ["owner", "description"]) if (!isStr(raw[k])) p.push(`${where}: ${k} must be a non-empty string`);
  for (const k of Object.keys(raw)) if (!["format", "owner", "description", "mutations"].includes(k)) p.push(`${where}: unknown key "${k}"`);
  if (!Array.isArray(raw.mutations) || raw.mutations.length === 0) return [...p, `${where}: mutations must be a non-empty array`];
  const ids = new Set<string>();
  raw.mutations.forEach((m: unknown, i: number) => {
    const at = `${where}.mutations[${i}]${isObj(m) && isStr(m.id) ? ` (${m.id})` : ""}`;
    if (!isObj(m)) return void p.push(`${at}: not an object`);
    const keys = ["id", "description", "file", "find", "replace", "occurrence", "tests", "testNamePattern", "killedBy", "expect"];
    for (const k of Object.keys(m)) if (!keys.includes(k)) p.push(`${at}: unknown key "${k}"`);
    for (const k of ["id", "description", "file", "find"]) if (!isStr(m[k])) p.push(`${at}: ${k} must be a non-empty string`);
    if (typeof m.replace !== "string") p.push(`${at}: replace must be a string`);
    if (isStr(m.id)) {
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(m.id)) p.push(`${at}: id must be letters, digits, '.', '_' or '-'`);
      if (ids.has(m.id)) p.push(`${at}: duplicate id`);
      ids.add(m.id);
    }
    if (isStr(m.file) && (m.file.startsWith("/") || m.file.split(/[\\/]/).includes(".."))) p.push(`${at}: file must be package-relative`);
    if (m.occurrence !== undefined && !(Number.isInteger(m.occurrence) && (m.occurrence as number) >= 1)) p.push(`${at}: occurrence must be a positive integer`);
    if (!Array.isArray(m.tests) || m.tests.length === 0 || !m.tests.every(isStr)) p.push(`${at}: tests must be a non-empty array of package-relative test files`);
    else for (const t of m.tests as string[]) if (t.startsWith("/") || t.split(/[\\/]/).includes("..")) p.push(`${at}: test file ${t} must be package-relative`);
    if (m.testNamePattern !== undefined && !isStr(m.testNamePattern)) p.push(`${at}: testNamePattern must be a non-empty string`);
    if (!(RESULT_CLASSES as readonly unknown[]).includes(m.expect)) p.push(`${at}: expect must be one of ${RESULT_CLASSES.join(", ")}`);
    if (!Array.isArray(m.killedBy)) p.push(`${at}: killedBy must be an array`);
    else {
      if (m.expect === "KILLED" && m.killedBy.length === 0) p.push(`${at}: a mutation expected to be KILLED must name its killing tests`);
      m.killedBy.forEach((k: unknown, j: number) => {
        if (!isObj(k) || !isStr(k.test)) return void p.push(`${at}.killedBy[${j}]: needs a test name`);
        for (const key of Object.keys(k)) if (!["test", "reason"].includes(key)) p.push(`${at}.killedBy[${j}]: unknown key "${key}"`);
        if (k.reason !== undefined) {
          if (!isStr(k.reason)) p.push(`${at}.killedBy[${j}]: reason must be a non-empty regular expression`);
          else
            try {
              new RegExp(k.reason);
            } catch {
              p.push(`${at}.killedBy[${j}]: reason is not a valid regular expression`);
            }
        }
      });
    }
  });
  return p;
}

/** Number of (non-overlapping) occurrences of `find` in `text`. */
export function countOccurrences(text: string, find: string): number {
  if (find === "") return 0;
  let n = 0;
  for (let i = text.indexOf(find); i !== -1; i = text.indexOf(find, i + find.length)) n++;
  return n;
}

/** Apply a mutation's replacement; null with a reason when the anchor is missing or ambiguous. */
export function applyMutation(text: string, m: Pick<Mutation, "find" | "replace" | "occurrence">): { text: string } | { error: string; occurrences: number } {
  const n = countOccurrences(text, m.find);
  if (n === 0) return { error: "anchor not found", occurrences: 0 };
  const want = m.occurrence ?? 1;
  if (m.occurrence === undefined && n > 1) return { error: `anchor occurs ${n} times (give "occurrence")`, occurrences: n };
  if (want > n) return { error: `occurrence ${want} requested, anchor occurs ${n} times`, occurrences: n };
  let at = -1;
  for (let k = 0; k < want; k++) at = text.indexOf(m.find, at === -1 ? 0 : at + m.find.length);
  return { text: text.slice(0, at) + m.replace + text.slice(at + m.find.length) };
}

// --- Vitest JSON report ------------------------------------------------------------------------------

export interface VitestAssertion {
  ancestorTitles: string[];
  title: string;
  fullName?: string;
  status: string;
  failureMessages: string[];
}
export interface VitestFile {
  name: string;
  status: string;
  message: string;
  assertionResults: VitestAssertion[];
}
export interface VitestReport {
  numTotalTests: number;
  numFailedTests: number;
  numPassedTests: number;
  success: boolean;
  testResults: VitestFile[];
}

/** "describe > nested describe > test title" — the name a spec's `killedBy.test` uses. */
export const testName = (a: Pick<VitestAssertion, "ancestorTitles" | "title">) => [...a.ancestorTitles, a.title].join(" > ");

const firstLine = (s: string) => (s.split("\n")[0] ?? "").replace(/\u001b\[[0-9;]*m/g, "");

export interface Classification {
  result: ResultClass;
  /** Plain-words reason for the result. */
  why: string;
  failed: { test: string; message: string }[];
  /** killedBy tests that failed by assertion with a matching reason. */
  killedByIntended: string[];
  tests: { total: number; passed: number; failed: number };
}

/**
 * Classify one mutated run. `anchor` is the outcome of applying the mutation; `report` is vitest's
 * parsed JSON report (null when vitest produced none); `baselineOk` is false when the same tests already
 * failed without the mutation.
 */
export function classify(input: { anchor: { ok: true } | { ok: false; error: string }; report: VitestReport | null; killedBy: Killer[]; baselineOk?: boolean; runnerError?: string }): Classification {
  const empty = { failed: [], killedByIntended: [], tests: { total: 0, passed: 0, failed: 0 } };
  if (!input.anchor.ok) return { result: "ERROR", why: `replacement not applied: ${input.anchor.error}`, ...empty };
  if (input.baselineOk === false) return { result: "ERROR", why: "the unmutated baseline already fails these tests", ...empty };
  if (input.runnerError) return { result: "ERROR", why: input.runnerError, ...empty };
  const r = input.report;
  if (!r || !Array.isArray(r.testResults)) return { result: "ERROR", why: "vitest produced no JSON report", ...empty };
  const all = r.testResults.flatMap((f) => f.assertionResults ?? []);
  const tests = { total: all.length, passed: all.filter((a) => a.status === "passed").length, failed: all.filter((a) => a.status === "failed").length };
  const broken = r.testResults.filter((f) => typeof f.message === "string" && f.message.trim() !== "");
  if (broken.length > 0) return { result: "ERROR", why: `test file failed to compile or load: ${broken.map((f) => `${f.name.split("/").slice(-1)[0]}: ${firstLine(f.message)}`).join("; ")}`, failed: [], killedByIntended: [], tests };
  if (tests.total === 0 || tests.passed + tests.failed === 0) return { result: "ERROR", why: "no tests ran", failed: [], killedByIntended: [], tests };
  const names = new Set(all.map(testName));
  const missing = input.killedBy.filter((k) => !names.has(k.test)).map((k) => k.test);
  if (missing.length > 0) return { result: "ERROR", why: `killedBy test(s) not in this run: ${missing.join(" | ")}`, failed: [], killedByIntended: [], tests };
  const failed = all.filter((a) => a.status === "failed").map((a) => ({ test: testName(a), message: firstLine(a.failureMessages?.[0] ?? "") }));
  if (failed.length === 0) return { result: "SURVIVED", why: `all ${tests.total} tests passed`, failed, killedByIntended: [], tests };
  const intended = input.killedBy
    .filter((k) => failed.some((f) => f.test === k.test && /^AssertionError\b/.test(f.message) && (k.reason === undefined || new RegExp(k.reason).test(f.message))))
    .map((k) => k.test);
  if (intended.length > 0) return { result: "KILLED", why: `${intended.length} of ${input.killedBy.length} intended test(s) failed by assertion for the intended reason`, failed, killedByIntended: intended, tests };
  const expectedFailing = failed.filter((f) => input.killedBy.some((k) => k.test === f.test));
  const why =
    expectedFailing.length > 0
      ? `intended test(s) failed, but not by an assertion matching the intended reason: ${expectedFailing.map((f) => `${f.test}: ${f.message}`).join(" | ")}`
      : `only other tests failed (${failed.length})`;
  return { result: "KILLED-UNEXPECTED", why, failed, killedByIntended: [], tests };
}
