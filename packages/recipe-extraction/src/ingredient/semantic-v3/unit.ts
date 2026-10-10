/**
 * semantic-v2 · step 4: reading a unit word at a token position (CONTRACT §7.3, `UNIT_REGISTRY`).
 *
 * `source` is the unit exactly as written, including an attached period ("tbsp.", "fl. oz."). Only
 * "fl"/"fluid" written before "oz"/"ounce" makes a fluid ounce; "oz"/"ounce" alone is always mass,
 * whatever the food is.
 */
import type { UnitCode, UnitV1 } from "../../contract";
import { unitV1 } from "../../units";
import { adjacent, isSym, isWord, type Tok } from "./lexer";
import { FLUID_WORDS, OUNCE_WORDS, unitOfWord } from "./lexicon";

export interface UnitRead {
  unit: UnitV1;
  s: number;
  e: number;
  next: number;
}

/** Index after an optional period attached to token k-1 ("oz." → after the "."). */
function periodAfter(toks: readonly Tok[], k: number): number {
  return isSym(toks[k], ".") && adjacent(toks[k - 1], toks[k]) ? k + 1 : k;
}

export function readUnit(text: string, toks: readonly Tok[], i: number): UnitRead | null {
  const t = toks[i];
  if (!isWord(t)) return null;
  const make = (code: UnitCode, next: number): UnitRead => {
    const e = toks[next - 1].e;
    return { unit: unitV1(code, text.slice(t.s, e)), s: t.s, e, next };
  };
  // fluid ounce: "fl oz", "fl. oz.", "fluid ounces", "fl.oz"
  if (FLUID_WORDS.has(t.lower)) {
    const k = periodAfter(toks, i + 1);
    const o = toks[k];
    if (isWord(o) && OUNCE_WORDS.has(o.lower)) return make("fl_oz", periodAfter(toks, k + 1));
    return null;
  }
  const code = unitOfWord(t.text);
  if (code === null) return null;
  return make(code, periodAfter(toks, i + 1));
}
