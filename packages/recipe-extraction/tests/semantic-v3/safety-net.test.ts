/**
 * semantic-v2: the safety net (engine.ts `guardedParse`). A reader that throws, or returns a reading the
 * contract validator refuses, is replaced by a minimal `needs_review` reading — and the caller can tell
 * that happened (`net`), because a fallback reading is itself valid and validity alone cannot reveal it.
 * The engine's own reader must never need the net on any corpus, generated or dev line.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseIngredientJsonl } from "../../bench/labels";
import type { ParsedIngredientV1 } from "../../src/contract";
import { guardedParse, parseSemantic, parseSemanticUnchecked } from "../../src/ingredient/semantic-v3/engine";
import { validateParsedIngredientV1 } from "../../src/validate";
import { ingredientCorpus, NON_STRING_INPUTS } from "../parity/corpus";
import { generateLines } from "./generate";

const thrower = (): ParsedIngredientV1 => {
  throw new Error("injected failure");
};

describe("the safety net", () => {
  it("replaces a reader that throws with a minimal, valid needs_review reading, and reports it", () => {
    const g = guardedParse("2 cups flour", thrower);
    expect(g.net).toBe("threw");
    expect(validateParsedIngredientV1(g.out)).toEqual([]);
    expect(g.out).toMatchObject({ raw: "2 cups flour", normalized: "2 cups flour", status: "needs_review", name: null, quantity: null, unit: null, reasons: ["unclassified"] });
  });

  it("replaces a reading the validator refuses, and reports it", () => {
    // ready with no name is not a valid reading (CONTRACT §2.1)
    const broken = (line: unknown): ParsedIngredientV1 => ({ ...parseSemanticUnchecked(line), status: "ready", name: null, reasons: [] });
    const g = guardedParse("2 cups flour", broken);
    expect(g.net).toBe("invalid");
    expect(validateParsedIngredientV1(g.out)).toEqual([]);
    expect(g.out.status).toBe("needs_review");
    expect(g.out.reasons).toEqual(["unclassified"]);
  });

  it("keeps the line's own facts in a fallback: an empty line stays unsupported, a cut line says so", () => {
    expect(guardedParse("   ", thrower).out).toMatchObject({ status: "unsupported", reasons: ["empty_line"] });
    const long = `2 cups flour ${"x".repeat(600)}`;
    expect(guardedParse(long, thrower).out.reasons).toEqual(["input_truncated", "unclassified"]);
  });

  it("passes a valid reading through untouched (net: none)", () => {
    for (const line of ["2 cups flour", "Salt, to taste", "For the sauce:", ""]) {
      const g = guardedParse(line);
      expect(g.net, line).toBe("none");
      expect(g.out).toEqual(parseSemantic(line));
      expect(g.out).toEqual(parseSemanticUnchecked(line));
    }
  });

  it("is never needed by the engine's own reader: corpus, generated, hostile and dev lines", () => {
    const corpus = ingredientCorpus();
    const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures/ingredients/dev.jsonl");
    const dev = parseIngredientJsonl(readFileSync(file, "utf8"), "dev", "ingredients/dev.jsonl").map((c) => c.input);
    const lines: unknown[] = [...corpus.all, ...generateLines(0x5afe, 10_000), ...dev, ...NON_STRING_INPUTS];
    const used: string[] = [];
    for (const line of lines) {
      const g = guardedParse(line);
      if (g.net !== "none") used.push(`${JSON.stringify(String(line).slice(0, 80))}: ${g.net}`);
      if (used.length >= 10) break;
    }
    expect(used).toEqual([]);
    expect(lines.length).toBeGreaterThan(50_000);
  });
});
