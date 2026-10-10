import { cpSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures");

/** A disposable copy of the real fixtures under the OS temp dir. */
export function copyFixtures(): { dir: string; cleanup: () => void } {
  const root = mkdtempSync(path.join(os.tmpdir(), "recipe-bench-"));
  const dir = path.join(root, "fixtures");
  cpSync(FIXTURES, dir, { recursive: true });
  return { dir, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

/** The historical holdout-v2 report scored by outcomes v2 (evidence 2026-10-09 …/evaluation-56eafe4). */
export const HISTORICAL_REPORT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../docs/table/evidence/2026-10-09-recipe-extraction-phase2/evaluation-56eafe4/benchmark-report.json");
export const HISTORICAL_REPORT_SHA256 = "afc55fd5b8f0ce9b8959882c44919cae29e943814e8960b586fba8da0e9b1e4a";
/** The engines of the historical run, in report order. */
export const HISTORICAL_ENGINES = ["legacy-table-import-2", "legacy-table-import-2+suggestion", "semantic-v1"] as const;
