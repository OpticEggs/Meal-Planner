/**
 * CONTRACT-v1 §13.1: one declared table of unit words. Every alias names a registry code, no word names two codes,
 * every code is declared under its own canonical word, the not-alias nouns are not aliases, and the generated manifest
 * is the checked-in file.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { UNIT_REGISTRY } from "../../src/contract";
import { NOT_ALIASES, UNIT_ALIASES, unitOfAlias } from "../../src/unit-aliases";
import { MANIFEST_PATH, renderManifest } from "../../tools/unit-manifest/generate";

describe("declared unit aliases (§13.1)", () => {
  it("covers exactly the registry codes, each under its own canonical word first", () => {
    expect(Object.keys(UNIT_ALIASES).sort()).toEqual(Object.keys(UNIT_REGISTRY).sort());
    for (const [code, aliases] of Object.entries(UNIT_ALIASES)) {
      if (code !== "fl_oz") expect(aliases[0]).toBe(code);
      for (const a of aliases) expect(a).toBe(a.toLowerCase());
    }
  });
  it("never maps one word to two codes", () => {
    const seen = new Map<string, string>();
    for (const [code, aliases] of Object.entries(UNIT_ALIASES)) for (const a of aliases) {
      expect(seen.get(a) ?? code, `${a} declared twice`).toBe(code);
      seen.set(a, code);
    }
  });
  it("declares none of the different-noun measure words", () => {
    for (const w of Object.keys(NOT_ALIASES)) expect(unitOfAlias(w), w).toBeNull();
    expect(unitOfAlias("tub")).toBeNull();
    expect(unitOfAlias("Tubs")).toBeNull();
  });
  it("reads declared spellings, case conventions and a final period", () => {
    expect(unitOfAlias("pkg.")).toBe("package");
    expect(unitOfAlias("Tbsp")).toBe("tbsp");
    expect(unitOfAlias("T")).toBe("tbsp");
    expect(unitOfAlias("t")).toBe("tsp");
    expect(unitOfAlias("C")).toBe("cup");
    expect(unitOfAlias("containers")).toBe("container");
  });
  it("the checked-in manifest is the generated text", () => {
    expect(readFileSync(MANIFEST_PATH, "utf8")).toBe(renderManifest());
  });
});
