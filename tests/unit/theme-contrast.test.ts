/**
 * Visual update: both themes' text/background pairs meet WCAG AA, read from globals.css itself so the
 * check cannot drift from the shipped tokens. Text 4.5:1; the focus outline 3:1 (non-text contrast).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(__dirname, "../../src/app/globals.css"), "utf8");
function tokens(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
}
const light = tokens(css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {"))));
const darkStart = css.indexOf("@media (prefers-color-scheme: dark)");
const dark = { ...light, ...tokens(css.slice(darkStart, css.indexOf("}\n}", darkStart))) };

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

for (const [name, t] of [["light", light], ["dark", dark]] as const) {
  describe(`theme contrast — ${name}`, () => {
    it("defines every token the pairs use", () => {
      for (const k of ["bg", "card", "card-2", "surface", "text", "muted", "faint", "amber", "accent-fill", "on-accent", "sage", "warn", "on-warn", "bad", "sky"]) {
        expect(t[k], k).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
    it("text pairs meet 4.5:1 and the focus outline meets 3:1", () => {
      const failures: string[] = [];
      for (const [fg, bgs] of TEXT) for (const bg of bgs) if (ratio(t[fg], t[bg]) < 4.5) failures.push(`${fg} on ${bg}: ${ratio(t[fg], t[bg]).toFixed(2)}`);
      for (const bg of ["bg", "card", "surface"]) if (ratio(t.sky, t[bg]) < 3) failures.push(`focus outline on ${bg}: ${ratio(t.sky, t[bg]).toFixed(2)}`);
      expect(failures).toEqual([]);
    });
  });
}

it("the two themes differ (a dark-mode block exists and overrides the light tokens)", () => {
  expect(darkStart).toBeGreaterThan(0);
  expect(dark.bg).not.toBe(light.bg);
});
