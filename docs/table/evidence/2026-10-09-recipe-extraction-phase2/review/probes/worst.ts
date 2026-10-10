import { parseSemantic } from "/home/user/rx-author/packages/recipe-extraction/src/ingredient/semantic/engine";
import { validateParsedIngredientV1 } from "/home/user/rx-author/packages/recipe-extraction/src/validate";
const lines: [string, string][] = [
  ["nested or-groups", "1 cup flour " + "(or milk ".repeat(60)],
  ["nested remark groups", "1 cup flour " + "(fresh or frozen ".repeat(40)],
  ["nested amount groups", "1 can " + "(15 oz ".repeat(70)],
  ["comma food list", "1 cup " + "milk, ".repeat(80)],
  ["or amounts", "1 cup milk " + "or 1 cup cream ".repeat(35)],
  ["plus chain", "1 cup " + "plus 1 tbsp ".repeat(40) + "flour"],
  ["many groups w/ or in name", "1 cup " + "(a or b) ".repeat(55)],
  ["dense punctuation", "1" + "(/-.,;:)".repeat(60)],
  ["many size words or", "2 " + "large or ".repeat(60) + "eggs"],
  ["mixed nested", "1 " + "([{(or 1 cup ".repeat(35)],
  ["slashes", "1 cup " + "a/".repeat(240)],
  ["for phrases", "flour " + "for frying ".repeat(45)],
  ["each", "1 tsp each " + "salt and ".repeat(50)],
  ["amount groups commas", "1 cup flour (" + "120 g, ".repeat(70) + ")"],
  ["unbalanced", "1 cup ".concat(")(".repeat(240))],
];
for (const [label, l] of lines) {
  let max = 0;
  let r;
  for (let i = 0; i < 20; i++) { const t = performance.now(); r = parseSemantic(l); max = Math.max(max, performance.now() - t); }
  console.log(label.padEnd(28), `len=${l.length}`, `max=${max.toFixed(2)}ms`, r!.status, r!.reasons.join(","), validateParsedIngredientV1(r).length ? "INVALID" : "");
}
