// RIO-01 measurement: package counts from the real per-serving storage + conversion + ceiling path,
// compared with exact rational arithmetic from the source amounts. Usage: tsx measure.ts <repo>
const repo = process.argv[2];
const { perServing, parseAmount } = await import(`${repo}/src/domain/quantity.ts`);
const { D, convert, baseUnit, packagesFor } = await import(`${repo}/src/domain/units.ts`);

type R = { n: bigint; d: bigint };
const g = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : g(b, a % b));
const mk = (n: bigint, d: bigint): R => { const k = g(n, d) || 1n; return { n: n / k, d: d / k }; };
const mul = (a: R, b: R) => mk(a.n * b.n, a.d * b.d);
const add = (a: R, b: R) => mk(a.n * b.d + b.n * a.d, a.d * b.d);
const div = (a: R, b: R) => mk(a.n * b.d, a.d * b.n);
const ceil = (a: R) => (a.n % a.d === 0n ? a.n / a.d : a.n / a.d + (a.n > 0n ? 1n : 0n));
const fromDec = (s: string): R => { const [i, f = ""] = s.split("."); return mk(BigInt(i + f), 10n ** BigInt(f.length)); };
const FACTOR: Record<string, string> = { g: "1", kg: "1000", oz: "28.349523125", lb: "453.59237", ml: "1", l: "1000", tsp: "4.92892159375", tbsp: "14.78676478125", cup: "236.5882365", fl_oz: "29.5735295625", each: "1" };

const AMOUNTS = ["1", "2", "3", "1/2", "1/3", "2/3", "1/4", "3/4", "1/8", "1 1/2", "1 1/3", "2 1/2", "5"];
const UNITS: Record<string, string[]> = { count: ["each"], volume: ["tsp", "tbsp", "cup", "fl_oz", "ml"], mass: ["oz", "lb", "g"] };
const PACKAGES: Record<string, [string, string][]> = {
  count: [["1", "each"], ["3", "each"], ["6", "each"]],
  volume: [["1", "cup"], ["16", "fl_oz"], ["32", "fl_oz"], ["500", "ml"], ["1", "l"], ["2", "tbsp"]],
  mass: [["16", "oz"], ["24", "oz"], ["1", "lb"], ["2", "lb"], ["500", "g"], ["8", "oz"]],
};
type Line = { amount: string; unit: string; servings: number; portions: number };
const methods = {
  current: (a: string, v: number) => perServing(a, v)!.value,
  halfUp12: (a: string, v: number) => { const r = parseAmount(a)!; return new D(r.n.toString()).div(r.d.toString()).div(v).toDecimalPlaces(12, D.ROUND_HALF_UP).toFixed(); },
  legacy4: (a: string, v: number) => { const r = parseAmount(a)!; return new D(r.n.toString()).div(r.d.toString()).div(v).toDecimalPlaces(4, D.ROUND_HALF_UP).toFixed(); },
};
const stats: Record<string, { over: number; under: number; cases: number; maxUnderGap: string | null; exampleOver?: unknown; exampleUnder?: unknown }> = {};
for (const k of Object.keys(methods)) stats[k] = { over: 0, under: 0, cases: 0, maxUnderGap: null };
let exactIntegerBoundaries = 0;

function run(lines: Line[], pkg: [string, string], label: string) {
  const bu = baseUnit(pkg[1]);
  let exact: R = { n: 0n, d: 1n };
  for (const l of lines) {
    const a = parseAmount(l.amount)!;
    exact = add(exact, div(mul(mul({ n: a.n, d: a.d }, mk(BigInt(l.portions), 1n)), fromDec(FACTOR[l.unit])), mk(BigInt(l.servings), 1n)));
  }
  const pkgR = mul(fromDec(pkg[0]), fromDec(FACTOR[pkg[1]]));
  const ratio = div(exact, pkgR);
  const want = Number(ceil(ratio));
  if (ratio.d === 1n) exactIntegerBoundaries++;
  for (const [name, f] of Object.entries(methods)) {
    let sum = new D(0);
    for (const l of lines) sum = sum.plus(convert(new D(f(l.amount, l.servings)).mul(l.portions), l.unit, bu)!);
    const got = packagesFor(sum, convert(pkg[0], pkg[1], bu)!);
    const s = stats[name];
    s.cases++;
    if (got > want) { s.over++; s.exampleOver ??= { label, lines, pkg, want, got }; }
    if (got < want) { s.under++; s.exampleUnder ??= { label, lines, pkg, want, got }; }
  }
}

for (const [dim, units] of Object.entries(UNITS)) for (const unit of units) for (const amount of AMOUNTS) for (let v = 1; v <= 12; v++) for (let p = 1; p <= 12; p++)
  for (const pkg of PACKAGES[dim]) run([{ amount, unit, servings: v, portions: p }], pkg, "single");
// Two recipes sharing the ingredient (mixed meals), deterministic pseudo-random sample.
let seed = 20261009;
const rnd = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed % n);
const dims = Object.keys(UNITS);
for (let i = 0; i < 200000; i++) {
  const dim = dims[rnd(dims.length)];
  const line = (): Line => ({ amount: AMOUNTS[rnd(AMOUNTS.length)], unit: UNITS[dim][rnd(UNITS[dim].length)], servings: 1 + rnd(12), portions: 1 + rnd(12) });
  run([line(), line()], PACKAGES[dim][rnd(PACKAGES[dim].length)], "pair");
}
console.log(JSON.stringify({ exactIntegerBoundaries, stats }, null, 1));
