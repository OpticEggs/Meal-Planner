import { readFileSync } from "node:fs";
import { parseIngredientV1, validateParsedIngredientV1 } from "/home/user/rx-author/packages/recipe-extraction/src/index";
import { parseSemanticUnchecked } from "/home/user/rx-author/packages/recipe-extraction/src/ingredient/semantic/engine";

const q = (x: any): string | null => {
  if (!x) return null;
  if (x.kind === "range") return `${q(x.min)}..${q(x.max)}`;
  return x.denominator === "1" ? x.numerator : `${x.numerator}/${x.denominator}`;
};
const amt = (a: any) => (a ? `${q(a.quantity)} ${a.unit.canonical}` : null);
const file = process.argv[2];
const lines = readFileSync(file, "utf8").split("\n").filter((l) => l.length > 0 && !l.startsWith("#"));
for (const line0 of lines) {
  const line = line0.replace(/\\u\{([0-9a-fA-F]+)\}/g, (_m, h) => String.fromCodePoint(parseInt(h, 16)));
  const r = parseIngredientV1(line, { engine: "semantic-v1" });
  const r2 = parseIngredientV1(line, { engine: "semantic-v1" });
  const u = parseSemanticUnchecked(line);
  const flags: string[] = [];
  if (JSON.stringify(r) !== JSON.stringify(r2)) flags.push("NONDETERMINISTIC");
  if (JSON.stringify(r) !== JSON.stringify(u)) flags.push("SAFETYNET");
  const v = validateParsedIngredientV1(r);
  if (v.length) flags.push("INVALID:" + v.join("|"));
  const parts = [
    r.status.padEnd(12),
    `q=${q(r.quantity)}`,
    `u=${r.unit ? r.unit.canonical + (r.unit.source ? `(${r.unit.source})` : "") : null}`,
    `name=${JSON.stringify(r.name)}`,
  ];
  if (r.packageSize) parts.push(`pkg=${amt(r.packageSize)}`);
  if (r.equivalents.length) parts.push(`eq=[${r.equivalents.map(amt).join(", ")}]`);
  if (r.note) parts.push(`note=${JSON.stringify(r.note)}`);
  if (r.alternatives.length) parts.push(`alt=${JSON.stringify(r.alternatives)}`);
  if (r.form) parts.push(`form=${r.form}`);
  if (r.optional) parts.push("OPT");
  if (r.approximate) parts.push("APPROX");
  if (r.amountUnstated) parts.push(`unstated=${r.amountUnstated}`);
  parts.push(`[${r.reasons.join(",")}]`);
  console.log(`${JSON.stringify(line).slice(0, 90)}\n    ${parts.join(" ")}${flags.length ? "  !!" + flags.join(" ") : ""}`);
}
