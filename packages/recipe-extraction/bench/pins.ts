/**
 * The identities a report is pinned to (EVALUATION-PLAN-v3 §7): the plan's hash, the scorer's hash, a digest
 * of the package's `src/`, and one digest per engine source directory. Reads local files only; deterministic.
 *
 * A source digest of a directory is the SHA-256 of the text made of one line per regular file under it
 * (recursively): `<package-relative path>\t<SHA-256 of the file's bytes>\n`, lines sorted by path (UTF-16
 * code unit order). Paths use `/`. An absent directory has no digest (null).
 */
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/** The plan the outcomes v3 scorer implements, relative to the repository root. */
export const PLAN_FILE = "docs/table/recipe-extraction/EVALUATION-PLAN-v3.md";

export interface ReportPins {
  /** Repository-relative plan file and the SHA-256 of its bytes (null when the file is absent). */
  planFile: typeof PLAN_FILE;
  planSha256: string | null;
  /** SHA-256 of bench/outcomes.ts (null when unreadable). */
  scorerSha256: string | null;
  /** Source digest of the package's src/. */
  packageSourceDigest: string | null;
  /** Source digest per engine directory: `legacy` = src/legacy, and every directory under src/ingredient/ by its name. */
  engineSourceDigests: Record<string, string | null>;
}

const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

function filesUnder(packageRoot: string, rel: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(path.join(packageRoot, rel))) {
    const r = `${rel}/${name}`;
    const st = lstatSync(path.join(packageRoot, r));
    if (st.isDirectory()) out.push(...filesUnder(packageRoot, r));
    else if (st.isFile()) out.push(r);
  }
  return out;
}

/** The lines a source digest hashes (exported for tests and audits). */
export function sourceDigestLines(packageRoot: string, relDir: string): string[] {
  return filesUnder(packageRoot, relDir)
    .sort()
    .map((rel) => `${rel}\t${sha256(readFileSync(path.join(packageRoot, rel)))}\n`);
}

/** SHA-256 over the sorted `<path>\t<sha256>\n` lines of every file under `relDir`; null when the directory is absent. */
export function sourceDigest(packageRoot: string, relDir: string): string | null {
  const abs = path.join(packageRoot, relDir);
  if (!existsSync(abs) || !lstatSync(abs).isDirectory()) return null;
  return sha256(sourceDigestLines(packageRoot, relDir).join(""));
}

/** `legacy` → src/legacy; every directory under src/ingredient/ by its name (a clash with `legacy` gets `ingredient/legacy`). */
export function engineSourceDirs(packageRoot: string): Record<string, string> {
  const dirs: Record<string, string> = { legacy: "src/legacy" };
  const ingredient = path.join(packageRoot, "src/ingredient");
  if (existsSync(ingredient))
    for (const name of readdirSync(ingredient).sort()) {
      if (!lstatSync(path.join(ingredient, name)).isDirectory()) continue;
      dirs[name === "legacy" ? "ingredient/legacy" : name] = `src/ingredient/${name}`;
    }
  return dirs;
}

function fileSha256(file: string): string | null {
  try {
    return existsSync(file) && lstatSync(file).isFile() ? sha256(readFileSync(file)) : null;
  } catch {
    return null;
  }
}

/** The pins of a report produced by the code under `packageRoot` in the repository at `repoRoot`. */
export function computePins(packageRoot: string, repoRoot: string): ReportPins {
  const engineSourceDigests: Record<string, string | null> = {};
  for (const [key, dir] of Object.entries(engineSourceDirs(packageRoot))) engineSourceDigests[key] = sourceDigest(packageRoot, dir);
  return {
    planFile: PLAN_FILE,
    planSha256: fileSha256(path.join(repoRoot, PLAN_FILE)),
    scorerSha256: fileSha256(path.join(packageRoot, "bench/outcomes.ts")),
    packageSourceDigest: sourceDigest(packageRoot, "src"),
    engineSourceDigests,
  };
}
