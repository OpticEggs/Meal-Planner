import { KNOWN_UNITS, normalizeUnit } from "../units";
import { parseAmount, perServing } from "../quantity";

/**
 * Import drafts (reviewed structured import). A draft is never a recipe. Every line the reader read
 * cleanly starts as "Use" with its exact amount; ordinary salt and pepper start left out (household
 * seasonings); only a line whose amount or ingredient is genuinely uncertain waits for a person, who
 * corrects it or leaves it out. Nothing invents an amount, and there are no "suggestions" to accept.
 */

export interface ParsedLine {
  /** Exact amount for the whole recipe ("1/3", "1 1/2", "12", "0.5"); null when a person must give it. */
  quantity: string | null;
  unit: string | null;
  name: string;
  form: "raw" | "cooked" | null;
  /** "omitted": a household seasoning, left out of groceries. Drafts made before 2026-10-09 only know the first two. */
  status: "parsed" | "requires_review" | "omitted";
  reasons: string[];
  /** Preparation and parenthetical text split off the name ("diced", "homemade (or store-bought)"). */
  note?: string | null;
  /** A range the line states ("2", "3"): shown to the person, never picked for them. */
  range?: [string, string] | null;
  /** Ingredients the line offers a choice between ("milk", "cream"). */
  alternatives?: string[] | null;
}

export type LineDecision =
  | { use: true; name: string; quantity: string; unit: string; form: "raw" | "cooked" }
  | { use: false };

export interface DraftLine {
  raw: string;
  parsed: ParsedLine;
  decision: LineDecision | null;
}

/** A cleanly read line starts as Use; a household seasoning starts left out; an uncertain line is undecided. */
export function initialDecision(p: ParsedLine): LineDecision | null {
  if (p.status === "omitted") return { use: false };
  if (p.status !== "parsed" || !p.quantity || !p.unit || !p.name) return null;
  const d: LineDecision = { use: true, name: p.name, quantity: p.quantity, unit: p.unit, form: p.form ?? "raw" };
  return decisionProblem(d) ? null : d;
}

/** A decision to use a line must carry a positive exact amount (a fraction is fine) and a unit Table converts. */
export function decisionProblem(d: LineDecision): string | null {
  if (!d.use) return null;
  if (!String(d.name ?? "").trim()) return "needs an ingredient name";
  if (!parseAmount(String(d.quantity ?? ""))) return "needs an amount (for example 2, 1/3 or 1 1/2)";
  if (!KNOWN_UNITS.includes(normalizeUnit(String(d.unit ?? "")))) return `needs a unit Table knows (${KNOWN_UNITS.join(", ")})`;
  return null;
}

export interface DraftForReview {
  title: string | null;
  servings: number | null;
  lines: DraftLine[];
}

/** Everything that stops a draft from becoming a recipe, in words. Empty = it can be confirmed. */
export function draftProblems(d: DraftForReview): string[] {
  const out: string[] = [];
  if (!d.title || !d.title.trim()) out.push("Give the recipe a name.");
  if (!d.servings || !Number.isInteger(d.servings) || d.servings < 1) out.push("Enter how many servings the ingredient amounts make.");
  const undecided = d.lines.filter((l) => !l.decision).length;
  if (undecided) out.push(`${undecided} ingredient ${undecided === 1 ? "line needs" : "lines need"} a quick check: give an amount, or leave it out.`);
  d.lines.forEach((l, i) => {
    const p = l.decision ? decisionProblem(l.decision) : null;
    if (p) out.push(`Line ${i + 1} (${l.raw}) ${p}.`);
  });
  if (!d.lines.some((l) => l.decision?.use)) out.push("Use at least one ingredient.");
  return out;
}

/**
 * Recipe ingredient quantities in Table are per ONE portion. A source states amounts for the whole
 * recipe, so a used amount (an exact rational) is divided by the servings: exact when the division
 * terminates, otherwise kept to 12 decimal places (`rounded`).
 */
export function perPortion(quantity: string, servings: number): { value: string; rounded: boolean } {
  const r = perServing(quantity, servings);
  if (!r) throw new Error(`not an amount: ${quantity}`);
  return { value: r.value, rounded: !r.exact };
}

/** A starting name for a recipe from its link's last path segment ("/easy-one-pot-chili/" → "Easy one pot chili").
 *  Derived from the address only — the page is not read. Null when the path says nothing useful. */
export function titleFromUrl(url: string): string | null {
  let seg: string;
  try {
    seg = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
    seg = decodeURIComponent(seg);
  } catch {
    return null;
  }
  const words = seg.replace(/\.(html?|php|aspx?)$/i, "").replace(/[-_+]+/g, " ").replace(/\s+/g, " ").trim();
  if (!/[a-z]{3}/i.test(words) || /^\d+$/.test(words) || words.length > 120) return null;
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

/** Budget Bytes' own site search (WordPress `?s=`): the member's browser opens it; Table never reads it. */
export function budgetBytesSearchUrl(term: string): string {
  return `https://www.budgetbytes.com/?s=${encodeURIComponent(term.trim().slice(0, 80))}`;
}
