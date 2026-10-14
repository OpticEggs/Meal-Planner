/**
 * Whole-recipe amounts (2026-10-14, D157). Members read and type an ingredient's amount for the WHOLE recipe, together
 * with the servings the recipe makes; storage stays as it is (per-serving `quantity`, and for exact rows
 * `exact_amount` / `exact_servings`). Shared by the editor and the save command, so a row the member did not touch is
 * recognised exactly and keeps its stored basis — an older (legacy) per-serving approximation is never relabelled as
 * exact, and its displayed whole amount is marked as approximate.
 */
import { formatAmount, parseAmount, rat, ratInt, ratMul, ratDiv, type Rat } from "@/domain/quantity";

export interface StoredAmount {
  /** Per-serving decimal as stored. */
  quantity: string | number;
  /** Present only on exact rows: the whole-recipe amount ("n" or "n/d") and the servings it was written for. */
  exactAmount?: string | null;
  exactServings?: number | null;
}

const isExact = (r: StoredAmount) => !!r.exactAmount && !!r.exactServings;

/**
 * The servings the stored rows say the recipe makes: the one `exactServings` every exact row shares. Legacy rows say
 * nothing. Exact rows that disagree (for example an import for 8 and a row an earlier editor saved per 1 serving)
 * give no yield; the disagreeing values are returned so the member can be asked.
 */
export function storedYield(rows: StoredAmount[]): { servings: number | null; conflict: number[] } {
  const s = [...new Set(rows.filter(isExact).map((r) => Number(r.exactServings)))].sort((a, b) => a - b);
  return { servings: s.length === 1 ? s[0] : null, conflict: s.length > 1 ? s : [] };
}

/**
 * B51 (D159): a version's original yield — recorded on the version (migration 018), else what its exact rows agree
 * on (versions written before 018, or by an earlier client), else null ("not recorded"). The one reading used by the
 * editor, the recipe overview, the catalog and the selection default.
 */
export function recipeYield(v: { servings?: number | null; ingredients?: StoredAmount[] | null } | null | undefined): number | null {
  if (!v) return null;
  if (typeof v.servings === "number" && v.servings >= 1) return v.servings;
  return storedYield(v.ingredients ?? []).servings;
}

/** A stored per-serving decimal ("0.333333333333", "75") as an exact rational; null if it is not one. */
function storedDecimal(t: string): Rat | null {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(t.trim());
  if (!m) return null;
  const digits = m[2] ?? "";
  const r = rat(BigInt(m[1] + digits), BigInt(10) ** BigInt(digits.length));
  return r.n > BigInt(0) ? r : null;
}

/** Rounds a positive rational to at most `places` decimals (half up) and prints it without trailing zeros. */
function roundedDecimal(r: Rat, places: number): string {
  const scale = BigInt(10) ** BigInt(places);
  const n = (r.n * scale * BigInt(2) + r.d) / (r.d * BigInt(2));
  const whole = n / scale;
  const frac = (n % scale).toString().padStart(places, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

/**
 * The text the editor shows for a stored row's amount for the whole recipe at `servings`: per-serving × servings.
 * Exact rows give an exact amount ("1 1/2"); legacy rows give their stored decimal × servings, rounded to 3 places
 * (`approx` when rounding changed it, `legacy` always). The save command recomputes this text for the row's source and
 * keeps the source's stored basis when the member's text is identical.
 */
export function wholeAmountText(row: StoredAmount, servings: number): { text: string; legacy: boolean; approx: boolean } {
  if (isExact(row)) {
    const a = parseAmount(String(row.exactAmount));
    if (a) return { text: formatAmount(ratDiv(ratMul(a, ratInt(servings)), ratInt(Number(row.exactServings)))), legacy: false, approx: false };
  }
  const per = storedDecimal(String(row.quantity));
  if (!per) return { text: String(row.quantity), legacy: true, approx: true };
  const whole = ratMul(per, ratInt(servings));
  const text = roundedDecimal(whole, 3);
  const back = parseAmount(text);
  const approx = !back || back.n * whole.d !== whole.n * back.d;
  return { text, legacy: true, approx };
}
