/**
 * Report pins (bench/pins.ts, EVALUATION-PLAN-v3 §7): plan SHA-256 (null when absent), scorer SHA-256,
 * the package src/ digest and one digest per engine directory — recomputed here by hand on a temporary tree
 * and on the real package; deterministic; carried by outcomes v3 reports and absent from archived v2 runs.
 */
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PACKAGE_ROOT, REPO_ROOT, defaultDeps, parseArgs, run, type RunDeps } from "../cli";
import { PLAN_FILE, computePins, engineSourceDirs, sourceDigest, sourceDigestLines } from "../pins";

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
let tmp: string | null = null;
afterEach(() => {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
  tmp = null;
});
/** A temporary repository: <root>/docs/…/EVALUATION-PLAN-v3.md (optional) and a package with src/. */
function tree(files: Record<string, string>): { root: string; pkg: string } {
  tmp = mkdtempSync(path.join(os.tmpdir(), "recipe-pins-"));
  const pkg = path.join(tmp, "packages/recipe-extraction");
  for (const [rel, text] of Object.entries(files)) {
    const abs = rel.startsWith("/") ? path.join(tmp, rel) : path.join(pkg, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, text);
  }
  return { root: tmp, pkg };
}

describe("source digests", () => {
  it("hash the sorted '<package-relative path>\\t<sha256>\\n' lines of every file under the directory (recursively)", () => {
    const { pkg } = tree({ "src/b.ts": "B", "src/a.ts": "A", "src/ingredient/semantic/x.ts": "X", "src/legacy/P.json": "{}" });
    const lines = [`src/a.ts\t${sha("A")}\n`, `src/b.ts\t${sha("B")}\n`, `src/ingredient/semantic/x.ts\t${sha("X")}\n`, `src/legacy/P.json\t${sha("{}")}\n`];
    expect(sourceDigestLines(pkg, "src")).toEqual(lines);
    expect(sourceDigest(pkg, "src")).toBe(sha(lines.join("")));
    expect(sourceDigest(pkg, "src/ingredient/semantic")).toBe(sha(`src/ingredient/semantic/x.ts\t${sha("X")}\n`));
    expect(sourceDigest(pkg, "src/nope")).toBeNull();
  });

  it("change when any file's bytes or name change, and not when only creation order differs", () => {
    const a = tree({ "src/a.ts": "A", "src/b.ts": "B" });
    const d1 = sourceDigest(a.pkg, "src");
    rmSync(a.root, { recursive: true, force: true });
    const b = tree({ "src/b.ts": "B", "src/a.ts": "A" });
    expect(sourceDigest(b.pkg, "src")).toBe(d1);
    writeFileSync(path.join(b.pkg, "src/b.ts"), "B2");
    expect(sourceDigest(b.pkg, "src")).not.toBe(d1);
    writeFileSync(path.join(b.pkg, "src/b.ts"), "B");
    writeFileSync(path.join(b.pkg, "src/c.ts"), "");
    expect(sourceDigest(b.pkg, "src")).not.toBe(d1);
  });

  it("engine directories: legacy = src/legacy, plus every directory under src/ingredient/ by its name", () => {
    const { pkg } = tree({ "src/legacy/l.ts": "L", "src/ingredient/engines.ts": "E", "src/ingredient/semantic/s.ts": "S", "src/ingredient/semantic-v2/t.ts": "T", "src/ingredient/legacy/z.ts": "Z" });
    expect(engineSourceDirs(pkg)).toEqual({ legacy: "src/legacy", "ingredient/legacy": "src/ingredient/legacy", semantic: "src/ingredient/semantic", "semantic-v2": "src/ingredient/semantic-v2" });
  });
});

describe("pins", () => {
  it("plan SHA-256 when the plan exists, null (no failure) when it is absent", () => {
    const withPlan = tree({ [`/${PLAN_FILE}`]: "plan text", "src/a.ts": "A", "bench/outcomes.ts": "scorer" });
    expect(computePins(withPlan.pkg, withPlan.root)).toEqual({
      planFile: PLAN_FILE,
      planSha256: sha("plan text"),
      scorerSha256: sha("scorer"),
      packageSourceDigest: sha(`src/a.ts\t${sha("A")}\n`),
      engineSourceDigests: { legacy: null },
    });
    rmSync(path.join(withPlan.root, PLAN_FILE));
    expect(computePins(withPlan.pkg, withPlan.root).planSha256).toBeNull();
  });

  it("the real package: plan, scorer, src/ and every engine directory, recomputed independently; deterministic", () => {
    const p = computePins(PACKAGE_ROOT, REPO_ROOT);
    expect(p.planSha256).toBe(sha(readFileSync(path.join(REPO_ROOT, PLAN_FILE))));
    expect(p.scorerSha256).toBe(sha(readFileSync(path.join(PACKAGE_ROOT, "bench/outcomes.ts"))));
    const dirs = readdirSync(path.join(PACKAGE_ROOT, "src/ingredient"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    expect(dirs).toContain("semantic");
    expect(Object.keys(p.engineSourceDigests).sort()).toEqual(["legacy", ...dirs].sort());
    for (const v of [p.packageSourceDigest, ...Object.values(p.engineSourceDigests)]) expect(v).toMatch(/^[0-9a-f]{64}$/);
    expect(computePins(PACKAGE_ROOT, REPO_ROOT)).toEqual(p);
  });

  it("outcomes v3 reports carry the pins (no absolute path); archived v2 reproductions do not", async () => {
    const deps: RunDeps = { ...defaultDeps(), stdout: () => {}, stderr: () => {}, writeFile: () => {}, now: () => 0 };
    const v3 = await run(parseArgs(["--engines", "legacy-table-import-2", "--split", "dev"]), deps);
    expect(v3.report!.pins).toEqual(computePins(PACKAGE_ROOT, REPO_ROOT));
    expect(v3.json).not.toContain(REPO_ROOT);
    expect(v3.markdown).toContain(`Pins: plan \`${PLAN_FILE}\` SHA-256 \``);
    const v2 = await run(parseArgs(["--scorer", "outcomes-v2", "--engines", "legacy-table-import-2", "--split", "dev"]), deps);
    expect(v2.report!.pins).toBeUndefined();
    expect(v2.json).not.toContain('"pins"');
  });
});
