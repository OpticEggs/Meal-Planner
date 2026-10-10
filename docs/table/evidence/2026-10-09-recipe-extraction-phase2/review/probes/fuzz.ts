import { validateParsedIngredientV1 } from "/home/user/rx-author/packages/recipe-extraction/src/validate";
import { parseSemanticUnchecked, parseSemantic } from "/home/user/rx-author/packages/recipe-extraction/src/ingredient/semantic/engine";

let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const PIECES = ["1", "2", "0", "1/2", "1/0", "½", "⅓", "¹⁄₂", "1.5", "1,5", ".", ",", ";", ":", "(", ")", "[", "]", "{", "}", "-", "–", "~", "/", "⁄", "+", "&", "%", "$", "$0.16", "x", "×", "or", "and", "plus", "to", "of", "a", "an", "half", "one", "two", "dozen", "each", "total", "about", "cup", "cups", "tbsp", "T", "t", "oz", "fl", "fluid", "ounce", "lb", "g", "kg", "ml", "can", "cans", "clove", "stick", "pinch", "inch", "9-inch", "15-oz", "large", "small", "extra", "heaping", "flour", "milk", "salt", "pepper", "eggs", "butter", "chicken", "broth", "fresh", "frozen", "homemade", "store-bought", "optional", "taste", "for", "serving", "garnish", "frying", "as", "needed", "if", "desired", "cooked", "raw", "chopped", "diced", "beaten", "minced", "such", "as", "use", "°F", "minutes", "‮", "\u0000", " ", "😀", "\ud800", "w/", "e.g.", "approx.", "up", "at", "least", "*", "•", "#", "http://x", "Preheat", "For", "TOPPING", "rinsed", "drained"];
const N = Number(process.argv[2] ?? 200000);
let netHits = 0, throwsU = 0, invalid = 0, maxMs = 0, maxLine = "";
const samples: string[] = [];
const t0 = performance.now();
for (let i = 0; i < N; i++) {
  const len = 1 + Math.floor(rnd() * 14);
  const parts: string[] = [];
  for (let k = 0; k < len; k++) parts.push(pick(PIECES));
  const sep = rnd() < 0.5 ? " " : "";
  const line = rnd() < 0.7 ? parts.join(" ") : parts.join(sep);
  const s = performance.now();
  let u;
  try { u = parseSemanticUnchecked(line); } catch (e) { throwsU++; if (samples.length < 15) samples.push("THROW " + JSON.stringify(line) + " " + String(e).slice(0, 100)); continue; }
  const ms = performance.now() - s;
  if (ms > maxMs) { maxMs = ms; maxLine = line; }
  const p = validateParsedIngredientV1(u);
  if (p.length) { invalid++; if (samples.length < 15) samples.push("INVALID " + JSON.stringify(line) + " " + p.slice(0, 2).join("; ")); }
  const c = parseSemantic(line);
  if (JSON.stringify(c) !== JSON.stringify(u)) netHits++;
}
console.log({ N, throwsU, invalid, netHits, maxMs: maxMs.toFixed(2), maxLine: JSON.stringify(maxLine), totalMs: (performance.now() - t0).toFixed(0) });
for (const s of samples) console.log(s);
