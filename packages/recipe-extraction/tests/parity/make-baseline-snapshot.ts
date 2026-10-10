/**
 * One-off generator for baseline-snapshot.json (run from the package dir:
 * `npx tsx tests/parity/make-baseline-snapshot.ts`). Refuses to write unless the live Table module is
 * still the pinned baseline file AND returns deep-equal output to the frozen copy on every input.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import * as live from "@/server/integrations/recipe-import/ingredient-line";
import { parseIngredientLine as frozen } from "../../src/legacy/ingredient-line";
import { REPO_ROOT } from "./page-corpus";
import { fingerprint, SNAPSHOT_FILE, snapshotSegments } from "./baseline-snapshot";

const prov = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../../src/legacy/PROVENANCE.json"), "utf8"));
const entry = prov.files.find((f: { copy: string }) => f.copy === "ingredient-line.ts");
const liveSha = createHash("sha256").update(readFileSync(path.join(REPO_ROOT, entry.source))).digest("hex");
if (liveSha !== entry.baselineSha256) throw new Error(`live ${entry.source} is not the pinned baseline (${liveSha}); a snapshot can only be recorded at the baseline`);

const segments: Record<string, { count: number; sha256: string }> = {};
for (const [name, inputs] of Object.entries(snapshotSegments())) {
  if (inputs === null) throw new Error(`segment ${name}: input file missing`);
  for (const x of inputs) if (!isDeepStrictEqual(live.parseIngredientLine(x as string), frozen(x as string))) throw new Error(`segment ${name}: live ≠ frozen for ${String(x).slice(0, 80)}`);
  const f = fingerprint(inputs);
  const l = fingerprint(inputs, live.parseIngredientLine as (x: never) => unknown);
  if (f.sha256 !== l.sha256) throw new Error(`segment ${name}: fingerprints differ`);
  segments[name] = f;
}
const out = {
  description: "SHA-256 of frozen parseIngredientLine outputs (JSON, one per line) per input segment, recorded while the live Table module was the pinned baseline and deep-equal on every input.",
  baselineCommit: prov.baselineCommit,
  liveSourceSha256AtRecording: liveSha,
  recordedOn: "2026-10-09",
  segments,
};
writeFileSync(SNAPSHOT_FILE, `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
