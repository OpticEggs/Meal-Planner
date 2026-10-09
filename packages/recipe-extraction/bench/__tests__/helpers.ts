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
