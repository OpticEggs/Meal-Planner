import { D, KNOWN_UNITS, normalizeUnit } from "../units";

/**
 * Import drafts (reviewed structured import). A draft is never a recipe: a member decides every
 * ingredient line — use it with a quantity and unit, or leave it out of grocery quantities — and
 * enters servings; only then can it be confirmed into a recipe version. Nothing here invents a
 * quantity: a line the parser could not read stays undecided until a member decides it.
 */

export interface ParsedLine {
  quantity: string | null;
  unit: string | null;
  name: string;
  form: "raw" | "cooked" | null;
  status: "parsed" | "requires_review";
  reasons: string[];
}

export type LineDecision =
  | { use: true; name: string; quantity: string; unit: string; form: "raw" | "cooked" }
  | { use: false };

export interface DraftLine {
  raw: string;
  parsed: ParsedLine;
  decision: LineDecision | null;
}

/** A parsed line starts as a proposal to use it as read; a line that needs review starts undecided. */
export function initialDecision(p: ParsedLine): LineDecision | null {
  if (p.status !== "parsed" || !p.quantity || !p.unit || !p.name) return null;
  return { use: true, name: p.name, quantity: p.quantity, unit: p.unit, form: p.form ?? "raw" };
}

const QTY = /^\d+(\.\d+)?$/;
/** A decision to use a line must carry a positive exact quantity and a unit Table converts. */
export function decisionProblem(d: LineDecision): string | null {
  if (!d.use) return null;
  if (!String(d.name ?? "").trim()) return "needs an ingredient name";
  if (!QTY.test(String(d.quantity)) || new D(d.quantity).lte(0)) return "needs a positive amount (for example 1.5)";
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
  if (undecided) out.push(`${undecided} ingredient ${undecided === 1 ? "line needs" : "lines need"} a decision: an amount and unit, or leave it out.`);
  d.lines.forEach((l, i) => {
    const p = l.decision ? decisionProblem(l.decision) : null;
    if (p) out.push(`Line ${i + 1} (${l.raw}) ${p}.`);
    else if (l.decision?.use && d.servings && d.servings >= 1 && new D(perPortion(l.decision.quantity, d.servings).value).lte(0)) {
      out.push(`Line ${i + 1} (${l.raw}) is too small to split into ${d.servings} servings.`);
    }
  });
  if (!d.lines.some((l) => l.decision?.use)) out.push("Use at least one ingredient.");
  return out;
}

/**
 * Recipe ingredient quantities in Table are per ONE portion. A source states amounts for the whole
 * recipe, so a used amount is divided by the servings. Kept exact when the division terminates
 * within 4 decimal places; otherwise rounded to 4 places and reported, so the review shows it.
 */
export function perPortion(quantity: string, servings: number): { value: string; rounded: boolean } {
  const exact = new D(quantity).div(servings);
  const four = exact.toDecimalPlaces(4);
  return { value: four.toString(), rounded: !four.eq(exact) };
}
