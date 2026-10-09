/**
 * The frozen copies stay pinned: each live Table source hashes to the recorded baseline or to the
 * recorded later version (any other change fails here, so the record is updated deliberately), each copy
 * hashes to its recorded value, and undoing the recorded edits of a copy gives the baseline file
 * byte for byte (so the parser bodies are textually identical).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { REPO_ROOT } from "./page-corpus";

const LEGACY_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src/legacy");
const sha256 = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");

type Edit = { kind: "prepend"; text: string } | { kind: "replace"; from: string; to: string } | { kind: "excerpt" | "replacement" };
interface Entry {
  copy: string;
  source: string;
  baselineCommit: string;
  baselineSha256: string;
  copySha256: string;
  relation: "verbatim" | "copy" | "excerpt" | "replacement";
  edits: Edit[];
}
const provenance = JSON.parse(readFileSync(path.join(LEGACY_DIR, "PROVENANCE.json"), "utf8")) as {
  baselineCommit: string;
  files: Entry[];
  liveTableObserved?: { commit: string; files: Record<string, string> };
};

describe("frozen legacy copies: provenance", () => {
  it("records every vendored file at the baseline commit", () => {
    expect(provenance.baselineCommit).toBe("cb7b56eaa01832b75b2bdbf74031f9f45c75ec13");
    expect(provenance.files.map((f) => f.copy).sort()).toEqual(["decimal.ts", "ingredient-line.ts", "jsonld.ts", "link.ts", "units.ts"]);
    for (const f of provenance.files) expect(f.baselineCommit).toBe(provenance.baselineCommit);
  });

  // A live Table file is either still the pinned baseline (live parity tests run) or the recorded later
  // version (main 8e6bd6e's import overhaul; live parity is skipped and the frozen engine is guarded by
  // baseline-snapshot.json). Any OTHER version fails here, so the record is updated deliberately.
  it.each(provenance.files.map((f) => [f.source, f] as const))("the live Table file %s is the pinned baseline or the recorded later version", (_s, f) => {
    const live = sha256(readFileSync(path.join(REPO_ROOT, f.source)));
    const observed = provenance.liveTableObserved?.files[f.source];
    expect([f.baselineSha256, ...(observed ? [observed] : [])]).toContain(live);
  });

  it.each(provenance.files.map((f) => [f.copy, f] as const))("the frozen copy %s matches its recorded hash", (_c, f) => {
    expect(sha256(readFileSync(path.join(LEGACY_DIR, f.copy)))).toBe(f.copySha256);
  });

  it.each(provenance.files.filter((f) => f.relation === "verbatim" || f.relation === "copy").map((f) => [f.copy, f] as const))(
    "undoing the recorded edits of %s gives the baseline byte for byte",
    (_c, f) => {
      let text = readFileSync(path.join(LEGACY_DIR, f.copy), "utf8");
      for (const e of [...f.edits].reverse()) {
        if (e.kind === "prepend") {
          expect(text.startsWith(e.text)).toBe(true);
          text = text.slice(e.text.length);
        } else if (e.kind === "replace") {
          expect(text.split(e.to).length - 1).toBe(1);
          text = text.replace(e.to, e.from);
        } else throw new Error(`unexpected edit kind ${e.kind} on a ${f.relation} file`);
      }
      expect(sha256(text)).toBe(f.baselineSha256);
    },
  );
});
