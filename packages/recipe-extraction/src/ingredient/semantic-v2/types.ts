/** semantic-v2 · shared internal shapes (not part of the public contract). */
import type { AmountUnstated, EquivalentV1, PackageSizeV1, QuantityV1, ReasonCode, UnitV1 } from "../../contract";

/** A piece of the note with its source offset (the note is assembled in source order). */
export interface NotePiece {
  s: number;
  text: string;
}

/** What a reader learned besides the core fields; merged into the line reading. */
export interface Effects {
  notes: NotePiece[];
  reasons: ReasonCode[];
  optional: boolean;
  /** "No fixed amount" phrases seen, with the offset of each (decided against the amount at the end). */
  unstated: { kind: AmountUnstated; s: number; text: string; alone: boolean }[];
  form: "cooked" | "raw" | null;
  /**
   * Ingredient options found in a remark or after a comma. "additional": the remark offers another
   * ingredient ("(or cream)", ", or 1 cup water"); "variants": options after a comma (", red or white");
   * "list": options inside brackets ("(parsley, cilantro, or basil)", "(granulated or powdered)").
   */
  options: { text: string; s: number; hasAmount: boolean; mode: "additional" | "variants" | "list"; remarkOnly: boolean }[];
  /** Amounts that could not be placed (each adds `quantity_unassigned`). */
  unassigned: number;
  /** A remark that only says the amount is approximate ("1 cup water, about", "(approx.)"). */
  approximate: boolean;
}

export const emptyEffects = (): Effects => ({ notes: [], reasons: [], optional: false, unstated: [], form: null, options: [], unassigned: 0, approximate: false });

export function mergeEffects(into: Effects, from: Effects): void {
  into.notes.push(...from.notes);
  for (const r of from.reasons) if (!into.reasons.includes(r)) into.reasons.push(r);
  into.optional ||= from.optional;
  into.unstated.push(...from.unstated);
  into.form ??= from.form;
  into.options.push(...from.options);
  into.unassigned += from.unassigned;
  into.approximate ||= from.approximate;
}

/** The amount part of a line. */
export interface AmountReading {
  quantity: QuantityV1 | null;
  quantitySpan: [number, number] | null;
  /** Some amount text was written (even if it could not be used: 0, 1/0, 1,5, a few). */
  amountWritten: boolean;
  unit: UnitV1 | null;
  unitSpan: [number, number] | null;
  packageSize: PackageSizeV1 | null;
  packageSpan: [number, number] | null;
  /**
   * The package size was written between a count and the food with no unit yet ("2 (6-ounce) salmon
   * fillets"): it stands only if the line turns out to count a unit (CONTRACT §7.4). `marked`: written in
   * brackets, hyphenated or after "x" (the count is clear); a bare "3 4 cups" is not.
   */
  packageProvisional: { marked: boolean; approx?: boolean } | null;
  equivalents: EquivalentV1[];
  approximate: boolean;
  fromWord: boolean;
  effects: Effects;
  /** Token index right after the amount phrase. */
  next: number;
}
