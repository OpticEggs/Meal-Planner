import { createHash } from "node:crypto";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { canonicalJson } from "../canonical";
import { computeFreeze, verifyFreeze, type FreezeRecord } from "../freeze";
import { copyFixtures, FIXTURES } from "./helpers";

describe("holdout freeze", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });
  const copy = () => {
    const c = copyFixtures();
    cleanup = c.cleanup;
    return c.dir;
  };
  const recorded = () => JSON.parse(readFileSync(path.join(FIXTURES, "FREEZE.json"), "utf8")) as FreezeRecord;

  it("FREEZE.json matches the holdout files", () => {
    expect(verifyFreeze(FIXTURES)).toEqual([]);
    expect(computeFreeze(FIXTURES, recorded().frozenAt)).toEqual(recorded());
  });

  it("records the frozen date, the rule and the counts", () => {
    const f = recorded();
    expect(f.frozenAt).toBe("2026-10-09");
    expect(f.rule).toMatch(/never tuned against engine output/);
    expect(f.ingredients.cases).toBeGreaterThanOrEqual(90);
    expect(f.pages.labels.entries).toBeGreaterThanOrEqual(3);
    expect(f.pages.files.length).toBe(f.pages.labels.entries);
  });

  it("the ingredient hash is the SHA-256 of the file bytes; the page-label hash is of the canonical holdout subset", () => {
    const f = recorded();
    expect(f.ingredients.sha256).toBe(createHash("sha256").update(readFileSync(path.join(FIXTURES, "ingredients/holdout.jsonl"))).digest("hex"));
    const labels = JSON.parse(readFileSync(path.join(FIXTURES, "pages/labels.json"), "utf8")) as { split: string }[];
    const subset = labels.filter((p) => p.split === "holdout");
    expect(f.pages.labels.sha256).toBe(createHash("sha256").update(canonicalJson(subset)).digest("hex"));
  });

  it("detects an edited holdout case", () => {
    const dir = copy();
    const file = path.join(dir, "ingredients/holdout.jsonl");
    writeFileSync(file, readFileSync(file, "utf8").replace('"name":"bread flour"', '"name":"flour"'));
    expect(verifyFreeze(dir).join("\n")).toMatch(/ingredients\/holdout\.jsonl: SHA-256 differs/);
  });

  it("detects an added or removed holdout case (count)", () => {
    const dir = copy();
    const file = path.join(dir, "ingredients/holdout.jsonl");
    const lines = readFileSync(file, "utf8").trimEnd().split("\n");
    writeFileSync(file, lines.slice(1).join("\n") + "\n");
    expect(verifyFreeze(dir).join("\n")).toMatch(/127 cases, FREEZE\.json records 128/);
  });

  it("detects an edited holdout page label but ignores dev page labels", () => {
    const dir = copy();
    const file = path.join(dir, "pages/labels.json");
    const pages = JSON.parse(readFileSync(file, "utf8"));
    pages[0].rationale += " (dev edit)";
    writeFileSync(file, JSON.stringify(pages, null, 2) + "\n");
    expect(verifyFreeze(dir)).toEqual([]);
    const hold = pages.find((p: { split: string }) => p.split === "holdout");
    hold.candidates[0].servings = 3;
    writeFileSync(file, JSON.stringify(pages, null, 2) + "\n");
    expect(verifyFreeze(dir).join("\n")).toMatch(/holdout entries\): canonical SHA-256 differs/);
  });

  it("is insensitive to labels.json formatting (canonical JSON)", () => {
    const dir = copy();
    const file = path.join(dir, "pages/labels.json");
    writeFileSync(file, JSON.stringify(JSON.parse(readFileSync(file, "utf8"))) + "\n");
    expect(verifyFreeze(dir)).toEqual([]);
  });

  it("detects an edited, added or removed holdout page file", () => {
    const dir = copy();
    writeFileSync(path.join(dir, "pages/hold-graph-website.html"), readFileSync(path.join(dir, "pages/hold-graph-website.html"), "utf8") + "<!-- edit -->\n");
    writeFileSync(path.join(dir, "pages/hold-new-page.html"), "<p>synthetic</p>\n");
    rmSync(path.join(dir, "pages/hold-faq-nonrecipe.html"));
    const problems = verifyFreeze(dir).join("\n");
    expect(problems).toMatch(/pages\/hold-graph-website\.html: SHA-256 differs/);
    expect(problems).toMatch(/pages\/hold-new-page\.html: holdout page not recorded/);
    expect(problems).toMatch(/pages\/hold-faq-nonrecipe\.html: recorded in FREEZE\.json but missing/);
  });

  it("a re-freeze records new hashes (the documented way to change the holdout)", () => {
    const dir = copy();
    const file = path.join(dir, "ingredients/holdout.jsonl");
    writeFileSync(file, readFileSync(file, "utf8").replace('"name":"bread flour"', '"name":"flour"'));
    const next = computeFreeze(dir, "2026-10-10");
    expect(next.ingredients.sha256).not.toBe(recorded().ingredients.sha256);
    writeFileSync(path.join(dir, "FREEZE.json"), JSON.stringify(next, null, 2) + "\n");
    expect(verifyFreeze(dir)).toEqual([]);
  });

  it("reports an unreadable freeze file", () => {
    const dir = copy();
    rmSync(path.join(dir, "FREEZE.json"));
    expect(verifyFreeze(dir)[0]).toMatch(/FREEZE\.json: cannot be read/);
  });
});
