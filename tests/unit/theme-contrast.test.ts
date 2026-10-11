/**
 * Q3 (2026-10-11): one dark palette, no light theme. Its text/background pairs meet WCAG AA, read from
 * globals.css itself so the check cannot drift from the shipped tokens. Text 4.5:1; the focus outline 3:1
 * (non-text contrast).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(__dirname, "../../src/app/globals.css"), "utf8");
const layout = readFileSync(path.resolve(__dirname, "../../src/app/layout.tsx"), "utf8");
function tokens(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
}
const rootStart = css.indexOf(":root {");
const rootBlock = css.slice(rootStart, css.indexOf("}", rootStart));
const t = tokens(rootBlock);

function lum(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const TEXT: [string, string[]][] = [
  ["text", ["bg", "card", "card-2", "surface"]],
  ["muted", ["bg", "card", "card-2"]],
  ["faint", ["bg", "card", "card-2"]],
  ["amber", ["bg", "card", "card-2"]],
  ["on-accent", ["accent-fill"]],
  ["sage", ["bg", "card"]],
  ["warn", ["bg", "card"]],
  ["bad", ["bg", "card"]],
  ["on-warn", ["warn"]],
];

describe("theme contrast — the one dark palette", () => {
  it("defines every token the pairs use", () => {
    for (const k of ["page", "bg", "card", "card-2", "surface", "text", "muted", "faint", "amber", "accent-fill", "on-accent", "sage", "warn", "on-warn", "bad", "sky"]) {
      expect(t[k], k).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
  it("text pairs meet 4.5:1 and the focus outline meets 3:1", () => {
    const failures: string[] = [];
    for (const [fg, bgs] of TEXT) for (const bg of bgs) if (ratio(t[fg], t[bg]) < 4.5) failures.push(`${fg} on ${bg}: ${ratio(t[fg], t[bg]).toFixed(2)}`);
    for (const bg of ["bg", "card", "surface"]) if (ratio(t.sky, t[bg]) < 3) failures.push(`focus outline on ${bg}: ${ratio(t.sky, t[bg]).toFixed(2)}`);
    expect(failures).toEqual([]);
  });
  it("is a dark ground: the page and screen backgrounds are near-black and the text is light", () => {
    for (const k of ["page", "bg", "surface", "card"]) expect(lum(t[k]), k).toBeLessThan(0.02);
    expect(lum(t.text)).toBeGreaterThan(0.8);
  });
});

it("dark is the only scheme: no light palette, no prefers-color-scheme switch, one theme colour", () => {
  expect(rootBlock).toMatch(/color-scheme:\s*dark;/);
  expect(css).not.toMatch(/prefers-color-scheme/);
  expect(css).not.toMatch(/color-scheme:\s*light/);
  expect((css.match(/:root\s*\{/g) ?? []).length).toBe(1);
  expect(layout).not.toMatch(/prefers-color-scheme/);
  expect(layout).toMatch(/themeColor:\s*"#[0-9a-fA-F]{6}"/);
});
