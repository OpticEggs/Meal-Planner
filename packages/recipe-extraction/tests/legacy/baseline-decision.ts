/**
 * `decisionProblem` and `LineDecision` exactly as Table had them at the baseline (cb7b56e,
 * src/domain/recipes/import.ts), on the frozen units/decimal copies. The ported suggestion tests check that
 * every legacy suggestion would have been a valid decision UNDER THE BASELINE RULES; Table's live rules
 * changed in main 8e6bd6e (fractions accepted), so the live function is no longer the right oracle.
 */
import { D } from "../../src/legacy/decimal";
import { KNOWN_UNITS, normalizeUnit } from "../../src/legacy/units";

export type LineDecision = { use: true; name: string; quantity: string; unit: string; form: "raw" | "cooked" } | { use: false };

const QTY = /^\d+(\.\d+)?$/;
/** A decision to use a line must carry a positive exact quantity and a unit Table converts. */
export function decisionProblem(d: LineDecision): string | null {
  if (!d.use) return null;
  if (!String(d.name ?? "").trim()) return "needs an ingredient name";
  if (!QTY.test(String(d.quantity)) || new D(d.quantity).lte(0)) return "needs a positive amount (for example 1.5)";
  if (!KNOWN_UNITS.includes(normalizeUnit(String(d.unit ?? "")))) return `needs a unit Table knows (${KNOWN_UNITS.join(", ")})`;
  return null;
}
