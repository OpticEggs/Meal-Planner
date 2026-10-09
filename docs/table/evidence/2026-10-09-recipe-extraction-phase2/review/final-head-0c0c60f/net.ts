import { guardedParse } from "./repo/packages/recipe-extraction/src/ingredient/semantic/engine";
import { validateParsedIngredientV1 } from "./repo/packages/recipe-extraction/src/validate";
const inputs: unknown[] = [null, undefined, 1, {}, "", " ", "\u0000", "1 cup flour", "a".repeat(100000), "‮".repeat(600), " ".repeat(1000) + "x", "\ud800", "x".repeat(501), "1".repeat(499) + "\u0000\u0000"];
const thrower = () => { throw new Error("boom"); };
const broken = (l: unknown) => ({ raw: String(l), normalized: "", status: "ready" } as any);
let bad = 0;
for (const i of inputs) for (const rd of [thrower, broken]) {
  const g = guardedParse(i, rd as any);
  const p = validateParsedIngredientV1(g.out);
  if (p.length || g.net === "none") { bad++; console.log("BAD", typeof i, g.net, p); }
}
console.log("net fallback checks", inputs.length * 2, "bad", bad);
