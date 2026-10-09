import { guardedParse } from "/home/user/rx-author/packages/recipe-extraction/src/ingredient/semantic/engine";
const H: [string, unknown][] = [
  ["100k digits", "1".repeat(100000)], ["10k nested", `1 cup ${"(".repeat(10000)}flour${")".repeat(10000)}`],
  ["10k mixed brackets", `1 cup ${"([{".repeat(3400)}`], ["many ors", `${"1 or ".repeat(10000)}2 eggs`],
  ["bidi", `${"‮⁦".repeat(10000)}1 cup milk`], ["joiners", `1${"­".repeat(100000)}2 cups`],
  ["lone surrogates", "\ud800 1 cup \udfff milk".repeat(1000)], ["huge num word", `${"ninety nine ".repeat(400)}eggs`],
  ["many number words", `${"twenty-four ".repeat(400)}eggs`], ["many and a half", `1 cup ${"and a half ".repeat(500)}milk`],
  ["re-read bait", `Five ${"spice ".repeat(400)}, 1 tsp`], ["non-string", { toString() { return "1 cup"; } }], ["symbol", Symbol("x")],
];
for (const [l, x] of H) { const t = performance.now(); const g = guardedParse(x); console.log(l.padEnd(20), (performance.now() - t).toFixed(1) + "ms", g.net, g.out.status, g.out.normalized.length, JSON.stringify(g.out.name)?.slice(0, 40), g.out.reasons.join(",")); }
