import { ENGINES } from "./repo/packages/recipe-extraction/src/ingredient/engines";
import { guardedParse, parseSemanticUnchecked } from "./repo/packages/recipe-extraction/src/ingredient/semantic/engine";
import { validateParsedIngredientV1 } from "./repo/packages/recipe-extraction/src/validate";
import { parseIngredientV1 } from "./repo/packages/recipe-extraction/src/index";
const e = ENGINES["semantic-v1"];
const q = (x: any) => (x === null ? "-" : x.kind === "exact" ? `${x.numerator}/${x.denominator}` : `${x.min.numerator}/${x.min.denominator}..${x.max.numerator}/${x.max.denominator}`);
const hostile: unknown[] = [
  null, undefined, 42, 1.5, NaN, true, {}, [], ["1 cup flour"], { toString: () => "1 cup flour" }, Object.create(null), new String("1 cup sugar"), Symbol("x"), 10n, () => "1 cup",
  "", " ", "\u0000", "\u0000\u0000 1 cup flour", "1 cup\u0000flour", "‮1 cup flour", "1‮2 cups milk", "1­2 cups milk", "1​2 cups milk", "1﻿2 cups", "\ud800 cup", "1 cup \udfff flour",
  "1/0 cup flour", "0/0 cup flour", "1/1000001 cup salt", "10001 g flour", "10000 g flour", "99999999999999999999999999 cups", "1e3 g flour", "Infinity cups milk", "NaN g sugar", "-1 cup flour", "−2 cups milk", "+2 cups milk",
  "½½ cup", "1½½ cups", "1 ½ ½ cups", "1/2/3/4 cup", "1..2 cups", "1-2-3 cups", "1 - - 2 cups", "1 to to 2 cups", "1 or or 2 eggs",
  "((((((((((1 cup flour))))))))))", "(".repeat(5000) + "1 cup flour" + ")".repeat(5000), "1 cup flour " + "(a ".repeat(2000), "1 cup flour" + ")".repeat(300), "[{(<1 cup>)}] flour",
  "1 cup " + "very ".repeat(200) + "fine sugar", "1 ".repeat(1000) + "cups", "1/2 ".repeat(500), "or ".repeat(400), ", ".repeat(400), "1 cup flour, " + "x, ".repeat(300),
  "a".repeat(100000), "1 cup " + "é".repeat(1_000_000), "🍕 2 cups 🍅 tomatoes 🍅", "٣ أكواب دقيق", "２カップ 小麦粉", "２ cups milk", "１/２ cup sugar", "2 cups мука", "1 cup　rice",
  "<script>alert(1)</script>", "1 cup <b>flour</b>", "javascript:alert(1)", "data:text/html,1 cup", "file:///etc/passwd", "\\u0031 cup", "%31 cup flour", "1&nbsp;cup flour", "1 cup &amp; sugar",
  "constructor", "__proto__", "toString", "hasOwnProperty 1 cup", "1 cup __proto__", "1 cup constructor",
];
let throws = 0, invalid = 0, netUsed = 0, nondet = 0, maxMs = 0, maxLine = "";
for (const h of hostile) {
  let r: any;
  const t0 = performance.now();
  try { r = e.parse(h as string); } catch (err) { throws++; console.log("THROW", String(h).slice(0, 40), err); continue; }
  const dt = performance.now() - t0;
  if (dt > maxMs) { maxMs = dt; maxLine = typeof h === "string" ? `${JSON.stringify(h.slice(0, 30))}… len ${h.length}` : String(typeof h); }
  const p = validateParsedIngredientV1(r);
  if (p.length) { invalid++; console.log("INVALID", p); }
  let g: any; try { g = guardedParse(h); } catch (err) { throws++; continue; }
  if (g.net !== "none") { netUsed++; console.log("NET", g.net, typeof h, typeof h === "string" ? JSON.stringify(h.slice(0, 40)) : ""); }
  if (JSON.stringify(e.parse(h as string)) !== JSON.stringify(r)) nondet++;
  const show = typeof h === "string" ? JSON.stringify(h.length > 60 ? h.slice(0, 60) + "…" : h) : `<${typeof h}${Array.isArray(h) ? " array" : ""}>`;
  console.log(`${show} → ${r.status} | ${r.name === null ? "-" : JSON.stringify(r.name.slice(0, 40))} | ${q(r.quantity)} | ${r.unit?.canonical ?? "-"} | rawLen ${r.raw.length} normLen ${r.normalized.length} | ${r.reasons.join(",")} | ${dt.toFixed(1)}ms`);
}
// public API with non-string
try { parseIngredientV1(null as any); parseIngredientV1(undefined as any, { engine: "semantic-v1" }); } catch (err) { throws++; console.log("API THROW", err); }
console.log({ hostile: hostile.length, throws, invalid, netUsed, nondet, maxMs: maxMs.toFixed(1), maxLine });

// fuzz
const toks = ["1", "2", "1/2", "½", "⅓", "1-1/2", "2-3", "0", "10000", "1,5", ".5", "a", "an", "half", "one", "dozen", "cup", "cups", "c.", "tbsp", "tsp", "oz", "fl", "oz.", "fl oz", "lb", "g", "kg", "ml", "l", "can", "cans", "(", ")", "((", "))", "[", "]", ",", ";", ":", "-", "–", "/", "+", "plus", "or", "and", "/", "x", "about", "~", "to", "taste", "for", "serving", "optional", "(optional)", "large", "small", "chopped", "diced", "cooked", "raw", "flour", "sugar", "milk", "eggs", "garlic", "cloves", "chicken", "broth", "salt", "pepper", "olive", "oil", "butter", "15-oz", "(14.5 oz)", "each", "pinch", "dash", "inch", "9-inch", "2%", "Protein:", "Calories", "For", "the", "sauce", " ", "​", "é", "ñ", "%", "&", "#", "1.", "2)", "•", "▢", "fluid", "ounces", "pound", "pounds", "stick", "sticks", "pods", "leaves"];
let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
let fz = { n: 0, throws: 0, invalid: 0, net: 0, nondet: 0 };
const t0 = performance.now();
for (let i = 0; i < 100000; i++) {
  const n = 1 + Math.floor(rnd() * 10); const parts: string[] = [];
  for (let k = 0; k < n; k++) parts.push(toks[Math.floor(rnd() * toks.length)]);
  const line = parts.join(rnd() < 0.8 ? " " : "");
  fz.n++;
  let r: any; try { r = parseSemanticUnchecked(line); } catch { fz.throws++; continue; }
  if (validateParsedIngredientV1(r).length) { fz.invalid++; if (fz.invalid < 5) console.log("FUZZ INVALID", JSON.stringify(line), validateParsedIngredientV1(r)); }
  if (i % 10 === 0 && JSON.stringify(parseSemanticUnchecked(line)) !== JSON.stringify(r)) fz.nondet++;
}
console.log({ fuzz: fz, ms: Math.round(performance.now() - t0) });
