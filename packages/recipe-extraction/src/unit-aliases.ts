/**
 * The declared unit words of contract v1 (CONTRACT-v1 §13.1, Phase 2C): the ONE table of written words that name a
 * `UNIT_REGISTRY` code. An engine that reads units through this table cannot apply an alias the contract does not
 * declare. `docs/table/recipe-extraction/UNIT-ALIASES-v1.md` is generated from this file (`tools/unit-manifest.ts`)
 * and checked by `tests/contract/unit-aliases.test.ts`; it is never edited by hand.
 *
 * Rule (§13.1): a word is an alias of code X only when it is X's own word — the canonical word, its plural, a
 * standard abbreviation or clipping of it (with or without a final period), a spelling variant, or the "-ful" form of
 * a measuring unit. A different noun for a similar thing (a tub, a pot, a bar, a rasher, a punnet) is never an alias:
 * an amount before it is an unknown unit (§12.14) → `needs_review`. Adding an alias is a prospective contract change
 * (logged in CONTRACT-v1 §13 and LABEL-CHANGES); it never rescores an earlier evaluation.
 *
 * Historical engines (`semantic-v1`, `semantic-v2`, the frozen legacy copies) keep their own frozen word lists; only
 * engines created from Phase 2C on read this table.
 */
import type { UnitCode } from "./contract";

const words = (s: string): readonly string[] => Object.freeze(s.trim().split(/\s+/));

/** Lower-case aliases per canonical code (the code itself is always first). "fl oz" is read as two words, see FLUID_OUNCE_WORDS. */
export const UNIT_ALIASES: Readonly<Record<UnitCode, readonly string[]>> = Object.freeze({
  mg: words("mg mgs milligram milligrams milligramme milligrammes"),
  g: words("g gs gr grs gm gms gram grams gramme grammes"),
  kg: words("kg kgs kilo kilos kilogram kilograms kilogramme kilogrammes"),
  oz: words("oz ozs ounce ounces"),
  lb: words("lb lbs pound pounds"),
  ml: words("ml mls milliliter milliliters millilitre millilitres"),
  dl: words("dl dls deciliter deciliters decilitre decilitres"),
  l: words("l ls lt lts ltr ltrs liter liters litre litres"),
  tsp: words("tsp tsps tspn tspns teaspoon teaspoons teaspoonful teaspoonfuls"),
  tbsp: words("tbsp tbsps tbs tbl tbls tblsp tblsps tblspn tb tablespoon tablespoons tablespoonful tablespoonfuls"),
  fl_oz: words("floz fl-oz fl.oz"),
  cup: words("cup cups c cupful cupfuls"),
  pint: words("pint pints pt pts"),
  quart: words("quart quarts qt qts"),
  gallon: words("gallon gallons gal gals"),
  each: words("each ea"),
  bag: words("bag bags"),
  ball: words("ball balls"),
  block: words("block blocks"),
  bottle: words("bottle bottles btl btls"),
  box: words("box boxes"),
  bulb: words("bulb bulbs"),
  bunch: words("bunch bunches"),
  can: words("can cans"),
  carton: words("carton cartons ctn ctns"),
  clove: words("clove cloves"),
  container: words("container containers"),
  cube: words("cube cubes"),
  ear: words("ear ears"),
  envelope: words("envelope envelopes env envs"),
  fillet: words("fillet fillets filet filets"),
  head: words("head heads"),
  jar: words("jar jars"),
  leaf: words("leaf leaves"),
  link: words("link links"),
  loaf: words("loaf loaves"),
  package: words("package packages pkg pkgs pk pks pck pack packs"),
  packet: words("packet packets pkt pkts"),
  piece: words("piece pieces pc pcs"),
  pod: words("pod pods"),
  rib: words("rib ribs"),
  sheet: words("sheet sheets"),
  slice: words("slice slices"),
  sprig: words("sprig sprigs"),
  stalk: words("stalk stalks"),
  stick: words("stick sticks"),
  strip: words("strip strips"),
  tin: words("tin tins"),
  tube: words("tube tubes"),
  wedge: words("wedge wedges"),
  dash: words("dash dashes"),
  drop: words("drop drops"),
  handful: words("handful handfuls"),
  inch: words("inch inches"),
  knob: words("knob knobs"),
  pinch: words("pinch pinches"),
  scoop: words("scoop scoops"),
  splash: words("splash splashes"),
  sprinkle: words("sprinkle sprinkles"),
});

/** Case-sensitive spellings (cooking convention): `T`/`Tb`/`TB`/`Tbs`/`TBS` is a tablespoon, a lone `t` a teaspoon. */
export const CASED_UNIT_ALIASES: Readonly<Record<string, UnitCode>> = Object.freeze({ T: "tbsp", Tb: "tbsp", TB: "tbsp", Tbs: "tbsp", TBS: "tbsp", t: "tsp" });

/** Two-word fluid ounce: one of these words followed by an `oz` alias ("fl oz", "fl. oz.", "fluid ounces") → `fl_oz`. */
export const FLUID_OUNCE_WORDS: readonly string[] = words("fl fluid");

/**
 * Nouns that are NOT aliases although engines or recipes use them like units (§13.1): each is a different noun, so an
 * amount before it is §12.14 (`needs_review`). Recorded so the decision is visible and tested; this is not a list of
 * every unknown measure word (an engine must treat any undeclared noun in the unit slot the same way).
 */
export const NOT_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  tub: "a different noun for a container (holdout-v3 ing-h3-0075 adjudication, §12.14)",
  tubs: "plural of tub",
  pot: "a different noun (a cooking vessel or a container)",
  pots: "plural of pot",
  bar: "a different noun for a block",
  bars: "plural of bar",
  rasher: "a different noun for a slice (holdout-v3 ing-h3-0193 adjudication, §12.14)",
  rashers: "plural of rasher",
  punnet: "a different noun for a container",
  punnets: "plural of punnet",
});

const BY_WORD: Record<string, UnitCode> = Object.create(null);
for (const [code, aliases] of Object.entries(UNIT_ALIASES) as [UnitCode, readonly string[]][]) for (const w of aliases) BY_WORD[w] = code;

/** The canonical code a single written word declares (a final period ignored; case-sensitive spellings first), or null. */
export function unitOfAlias(written: string): UnitCode | null {
  const w = written.endsWith(".") ? written.slice(0, -1) : written;
  if (Object.prototype.hasOwnProperty.call(CASED_UNIT_ALIASES, w)) return CASED_UNIT_ALIASES[w];
  const lower = w.toLowerCase();
  return Object.prototype.hasOwnProperty.call(BY_WORD, lower) ? BY_WORD[lower] : null;
}
