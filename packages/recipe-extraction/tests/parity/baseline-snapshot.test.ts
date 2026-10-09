/**
 * The frozen engine still produces exactly the outputs Table import 2 (cb7b56e) produced, segment by
 * segment, as recorded in baseline-snapshot.json while the two were proven deep-equal. This is the
 * baseline guard once Table's live parser has moved on (main 8e6bd6e). A segment whose input file is not
 * in this working copy is skipped and says so.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseIngredientLine } from "../../src/legacy/ingredient-line";
import { fingerprint, SNAPSHOT_FILE, snapshotSegments } from "./baseline-snapshot";

const snapshot = JSON.parse(readFileSync(SNAPSHOT_FILE, "utf8")) as { baselineCommit: string; segments: Record<string, { count: number; sha256: string }> };
const segments = snapshotSegments();

describe("frozen baseline outputs match the recorded Table import 2 fingerprint", () => {
  it("records the baseline commit and every segment", () => {
    expect(snapshot.baselineCommit).toBe("cb7b56eaa01832b75b2bdbf74031f9f45c75ec13");
    expect(Object.keys(snapshot.segments).sort()).toEqual(Object.keys(segments).sort());
  });

  it.each(Object.keys(snapshot.segments))("segment %s", (name) => {
    const inputs = segments[name];
    if (inputs === null) return void console.warn(`baseline snapshot: segment ${name} skipped (input file not in this working copy)`);
    expect(fingerprint(inputs)).toEqual(snapshot.segments[name]);
  });

  it("the fingerprint notices a one-line change", () => {
    const inputs = segments.literals!;
    const altered = (x: never) => {
      const out = parseIngredientLine(x as string);
      return x === inputs[0] ? { ...out, name: `${out.name}!` } : out;
    };
    expect(fingerprint(inputs, altered).sha256).not.toBe(snapshot.segments.literals.sha256);
  });
});
