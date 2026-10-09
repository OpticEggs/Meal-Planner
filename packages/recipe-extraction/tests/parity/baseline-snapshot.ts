/**
 * The frozen baseline's own fingerprint: SHA-256 of the frozen `parseIngredientLine` outputs over each
 * segment of the parity corpus and over the benchmark corpus inputs. Recorded once while the live Table
 * module was still byte-identical to the baseline (cb7b56e) and deep-equal to the frozen copy on every
 * line (see make-baseline-snapshot.ts), so the record keeps proving "this engine is Table import 2"
 * after Table's own parser moves on (import overhaul, 8e6bd6e).
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseIngredientLine } from "../../src/legacy/ingredient-line";
import { ingredientCorpus, NON_STRING_INPUTS } from "./corpus";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SNAPSHOT_FILE = path.join(HERE, "baseline-snapshot.json");
const FIXTURES = path.resolve(HERE, "../../fixtures/ingredients");

/** Stable text for one output (JSON; non-string inputs are rendered by type so the line is recordable). */
const render = (x: unknown) => JSON.stringify(x, (_k, v) => (typeof v === "bigint" ? `bigint:${v}` : typeof v === "symbol" ? `symbol:${String(v)}` : v));

export function benchmarkInputs(file: string): string[] | null {
  const p = path.join(FIXTURES, file);
  if (!existsSync(p)) return null;
  return readFileSync(p, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l).input as string);
}

/** Segments of inputs, by name; a benchmark file that is absent from this working copy is null. */
export function snapshotSegments(): Record<string, readonly unknown[] | null> {
  const c = ingredientCorpus();
  return {
    literals: c.literals,
    sweep: c.sweep,
    hostile: c.hostile,
    random: c.random,
    nonString: NON_STRING_INPUTS,
    "benchmark-dev-v1": benchmarkInputs("dev.jsonl"),
    "benchmark-holdout-v1": benchmarkInputs("holdout.jsonl"),
  };
}

export function fingerprint(inputs: readonly unknown[], parse: (x: never) => unknown = parseIngredientLine as (x: never) => unknown): { count: number; sha256: string } {
  const h = createHash("sha256");
  for (const x of inputs) h.update(render(parse(x as never))).update("\n");
  return { count: inputs.length, sha256: h.digest("hex") };
}
