/**
 * Is a live Table source still the pinned baseline file? Parity with the live module is only meaningful
 * (and only checked) while it is. Table's ingredient-line parser moved on in main 8e6bd6e; the frozen copy
 * is then guarded by tests/parity/baseline-snapshot.json instead.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REPO_ROOT } from "./page-corpus";

const LEGACY_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src/legacy");
export const provenance = JSON.parse(readFileSync(path.join(LEGACY_DIR, "PROVENANCE.json"), "utf8")) as {
  baselineCommit: string;
  files: { copy: string; source: string; baselineSha256: string }[];
  liveTableObserved?: { commit: string; files: Record<string, string> };
};

export const liveSha256 = (source: string) => createHash("sha256").update(readFileSync(path.join(REPO_ROOT, source))).digest("hex");

export function liveIsBaseline(copy: string): boolean {
  const f = provenance.files.find((x) => x.copy === copy);
  if (!f) throw new Error(`no provenance entry for ${copy}`);
  return liveSha256(f.source) === f.baselineSha256;
}
