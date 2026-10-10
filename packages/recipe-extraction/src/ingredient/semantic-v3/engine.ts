/**
 * semantic-v2 · the engine: reads one ingredient line into contract v1 (CONTRACT-v1.md §2, §7).
 *
 * Pipeline: normalize → tokens and bracket structure → list marker / "optional:" prefix → not an
 * ingredient? → split at top-level commas → the amount phrase (at the start; else after a colon, in a
 * bracket, after the first comma, at the end, or "juice of 1 lemon") → the name region → each remark
 * after a comma → assembly (note in source order, flags, alternatives) → status and reasons.
 *
 * Every part that was read is kept when a person must still decide something (useful partial
 * reading); the raw line is never used as the name. After the amount: a size between a bare count and
 * the food stands only beside a packaging unit, otherwise it is a per-piece weight (§12.3); a number
 * that counts a product's components ("Five spice powder", "Three cheese blend, 1 cup") is read again
 * with the number in the name (§12.9).
 *
 * semantic-v2 (Phase 2B) is semantic-v1 with families A–D repaired under CONTRACT §12 and §12.A. The safeguards
 * live in named functions: `nameLeftoverGuard` (name.ts, the general final guard), `multiplierAt` and
 * `fractionUnitAt` (amount.ts), `RESTATEMENT_TOLERANCE` / `sameAmount` / `roundedConversion` (amount.ts),
 * `shareOptions` / `trailingHeadSplit` / `andJoinsTwoFoods` (alternatives.ts, the option-preservation rule and
 * "and" lists), `postFoodCountUnit` (name.ts, the count-noun rule) and `countWordBeginsName` (amount.ts, §12.A A1),
 * `containerCup`, `PACKAGE_UNITS` and `canSizeDesignationAt` (amount.ts), `unknownMeasureAt` (amount.ts, §12.14),
 * `numberInProductName` / `numberNamesProductAt` (product numbers), `remarkSecondAmount` and
 * `remarkMeasuresAnother` (remarks.ts, §12.11 and §12.A A3) and `nonIngredientReason` with its named shapes
 * (classify.ts: `equipmentShape` / `agentNounTool`, `nutritionPanel`, `nutrientLabelEnd`, …). Where a family's closed
 * vocabulary misses but the line has the family's shape, the reading goes to a person (`unclassified`), never to a
 * confident `ready`: a holder after an unknown word ("2 chicken skewers"), a label with only milligrams, a nutrient
 * name that is also a UK ingredient weighed in grams.
 *
 * Recognised food (PHASE-2B-PLAN §6.1, round 2): `recognisedFoodHead` (foods.ts, with the word classes of foods.ts and
 * foods-more.ts) decides whether a counted line's food is known; when it is not, the line goes to a person with no
 * amount, unit or package and the text after the number as the name pre-fill — never `unsupported`. A sure equipment
 * shape yields to a name whose head is itself a food (`recognisedFoodNoun`, `equipmentNamesFood` in classify.ts): it is
 * read when the name ends in a compound food ("short plate") or follows a food container ("1 bottle mixer"), and goes
 * to a person otherwise. Equipment heads are not foods by themselves ("2 pepper grinders" stays equipment).
 *
 * Round 3 (R1 round-3 review): the word right after a count is a measure when it is a measure gerund (`measureGerund`,
 * foods.ts: "1 helping mashed potatoes"), a vessel or a food-or-measure word (UNKNOWN_MEASURES: "1 pot chili", "1 square
 * baking chocolate", "2 sips dark rum") unless a compound food follows ("pot roast", "bouquet garni"), or a singular noun
 * before a plural food after a count of one (`oneBeforePluralFood`, amount.ts: "1 braid onions"); a trailing multiplier
 * gets the same check ("tots of rum x 2"). On a Title Case line capitals carry no brand signal (`titleCaseLine`); a
 * capitalised plural opening the name is not a variety; a food head that is also an equipment or brand word after a
 * capitalised word with a count of one goes to a person (`homographHeadAfterCapital`, foods.ts: "1 Big Green Egg"); a
 * mixer is food only with a drink word or a food container ("1 bottle mixer").
 *
 * A final check (`guardedParse`) runs the contract validator: a reader that throws, or an output that
 * would not validate (a defect), is replaced by a minimal `needs_review` reading with `unclassified`, so
 * callers always receive valid data — and `guardedParse` reports that the net was used, so tests can
 * prove it never is.
 */
import { REASONS, UNIT_REGISTRY, type AmountUnstated, type IngredientEngine, type ParsedIngredientV1, type ReasonCode, type SpanField, type UnitV1 } from "../../contract";
import { cmp, fromExactQuantity, rational, toExactQuantity } from "../../rational";
import { validateParsedIngredientV1 } from "../../validate";
import { amountStartsAt, foreignSystemRemark, groupAmount, isPriceGroup, PACKAGE_UNITS, readAmountPhrase, readStatedAmount, placeSecondary, sameAmount, sumInSmallest, unknownMeasureAt, type AmountSlots } from "./amount";
import { equipmentShape, nonIngredientReason, numericLead } from "./classify";
import { adjacent, isGroup, isNumberish, isSym, isWord, lex, type Tok } from "./lexer";
import { APPROX_WORDS, BULLETS, CONTAINER_UNITS, FRUIT_PART_WORDS, NUTRIENT_FOOD_WORDS, SERVING_LABEL_WORDS, UNIT_WORDS_IN_FOOD_NAMES, FUNCTION_WORDS, INVARIANT_PLURALS, MEASURE_ADJECTIVES, PREP_ADVERBS, REMARK_WORDS, ROMANCE_JOINERS, SIZE_WORDS, TRAILING_PREP_WORDS, unitOfWord } from "./lexicon";
import { numberInProductName, readNameRegion, type NameReading } from "./name";
import { normalizeLine } from "./normalize";
import { classifyPiece, remarkMeasuresAnother, remarkRestatement, remarkSecondAmount, splitOr, splitTopLevel, textOf, trimEdges, unstatedAt } from "./remarks";
import { compoundFoodEnding, foodWord, homographHeadAfterCapital, massFoodWord, plainWord, recognisedFoodHead } from "./foods";
import { andJoinsTwoFoods, categoryNoun, foodHead, isRemarkOption, shareOptions, uniqueOptions, varietiesOf, withKind } from "./alternatives";
import { emptyEffects, mergeEffects, type AmountReading } from "./types";
import { readUnit, type UnitRead } from "./unit";

export const SEMANTIC_V3_ENGINE_ID = "semantic-v3";

// --- Helpers ----------------------------------------------------------------------------------------

const push = (reasons: ReasonCode[], code: ReasonCode) => {
  if (!reasons.includes(code)) reasons.push(code);
};

/** A plain amount reading for a line with no amount at all. */
const noAmount = (): AmountReading => ({
  quantity: null, quantitySpan: null, amountWritten: false, unit: null, unitSpan: null, packageSize: null, packageSpan: null, packageProvisional: null, equivalents: [],
  approximate: false, fromWord: false, effects: emptyEffects(), next: 0,
});

function unsupported(raw: string, normalized: string, reasons: ReasonCode[]): ParsedIngredientV1 {
  return {
    raw, normalized, status: "unsupported", name: null, quantity: null, unit: null, packageSize: null, equivalents: [], form: null, note: null,
    alternatives: [], optional: false, approximate: false, amountUnstated: null, reasons, evidence: { spans: {} },
  };
}

/** Index of the first top-level separator sym in `toks` (":" or a spaced dash), or -1. */
function separatorAt(toks: readonly Tok[]): number {
  for (let i = 1; i < toks.length - 1; i++) {
    const t = toks[i];
    if (isSym(t, ":")) return i;
    if (isSym(t, "-", "–", "—") && !adjacent(toks[i - 1], t) && !adjacent(t, toks[i + 1])) return i;
  }
  return -1;
}

const hasNumberTok = (toks: readonly Tok[]) => toks.some(isNumberish);

/** A numbered list marker ("1.", "2)", "a)") followed by a space and an amount. */
const NUMBERED_MARKER = /^(?:\d{1,2}|[A-Za-z])[.)](?= +[\d½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒.])/;
/** A numbered marker followed by a word ("1. Preheat"); group 1 is that word. */
const NUMBERED_STEP = /^(?:\d{1,2}|[A-Za-z])[.)](?= +([\p{L}]+))/u;

/** The whole run is a flag phrase ("to taste", "for serving", "optional"). */
function phraseOnly(toks: readonly Tok[]): boolean {
  if (toks.length === 1 && isWord(toks[0], "optional")) return true;
  const m = unstatedAt(toks, 0);
  return m !== null && m.len === toks.length;
}

/** An amount phrase followed only by size words ("2 large" → 2, note "large"); null otherwise. */
function amountWithSizeWords(text: string, toks: readonly Tok[]): { amount: AmountReading; sizeNote: Tok[] } | null {
  const a = readAmountPhrase(text, toks, 0);
  if (!a || a.quantity === null) return null;
  const rest = toks.slice(a.next);
  if (!rest.every((t) => isWord(t) && (SIZE_WORDS.has(t.lower) || t.lower === "extra"))) return null;
  return { amount: a, sizeNote: rest };
}

const DESCRIBING = (w: string) => REMARK_WORDS.has(w) || SIZE_WORDS.has(w) || w === "ripe";

/** The name region holds only describing words ("boneless", "large, ripe") and no food yet. */
function describingOnly(region: readonly Tok[]): boolean {
  const ws = region.filter((t) => t.kind === "word") as { lower: string }[];
  if (ws.length === 0 || ws.length !== region.length) return false;
  return ws.every((w) => DESCRIBING(w.lower) && !["more", "less", "so", "taste", "needed", "desired", "optional"].includes(w.lower));
}

const PREPOSITIONS = new Set(["into", "on", "onto", "off", "until", "over", "under", "at", "in", "with", "without", "for", "by", "from", "to", "about", "as", "if"]);

/** A short plain noun phrase ("avocado", "garlic powder"): no participle, preposition or remark word. */
function plainFoodItem(seg: readonly Tok[]): boolean {
  if (seg.length === 0 || seg.length > 3 || !seg.every((t) => t.kind === "word")) return false;
  return namesAFood(seg) && seg.every((w) => isWord(w) && !PREPOSITIONS.has(w.lower) && !/(?:ed|en)$/.test(w.lower) && !DESCRIBING(w.lower));
}

/** The run without a trailing "no fixed amount" phrase ("garlic powder to taste" → "garlic powder"). */
function stripPhrase(seg: readonly Tok[]): Tok[] {
  for (let i = 1; i < seg.length; i++) if (unstatedAt(seg, i)) return seg.slice(0, i);
  return [...seg];
}

/** A segment that names a food: some word is not describing, preparation or a remark phrase. */
function namesAFood(seg: readonly Tok[]): boolean {
  if (seg.length === 0 || !isWord(seg[0]) || isWord(seg[0], "or", "plus", "and") || unstatedAt(seg, 0) !== null) return false;
  if (seg.some((t) => isGroup(t) || isNumberish(t))) return false;
  const ws = seg.filter((t) => t.kind === "word") as { lower: string }[];
  return ws.some((w) => !DESCRIBING(w.lower) && !TRAILING_PREP_WORDS.has(w.lower) && !PREP_ADVERBS.has(w.lower) && !FUNCTION_WORDS.has(w.lower));
}

/** True when some word of the name reads as a plural ("eggs", "garlic cloves") or never changes ("shrimp"). */
function namesSeveral(name: string, trailingUnit: UnitRead | null, text: string): boolean {
  const words = name.toLowerCase().split(/[^\p{L}'-]+/u).filter((w) => w.length > 0);
  if (trailingUnit) words.push(text.slice(trailingUnit.s, trailingUnit.e).toLowerCase());
  return words.some((w) => (w.length > 2 && w.endsWith("s") && !w.endsWith("ss")) || INVARIANT_PLURALS.has(w));
}

/**
 * (semantic-v3) A count above one before a singular name is unclear only when the name's head is a food bought by weight
 * or volume (`massFoodWord`: "2 milk", "3 flour", "Two egg"), or when the name has no food word at all. A counted food
 * written without a plural ending is counted as written (invariant and borrowed plurals: "4 onigiri", "20 pelmeni").
 */
function singularCountUnclear(name: string): boolean {
  const ws = name.toLowerCase().split(/[^\p{L}'-]+/u).filter((w) => w.length > 0);
  if (ws.length === 0) return true;
  const joiner = ws.findIndex((w, k) => k > 0 && ROMANCE_JOINERS.has(plainWord(w)));
  const head = joiner > 0 ? ws[0] : ws[ws.length - 1];
  return massFoodWord(head) || (!foodWord(head) && joiner < 0);
}

/**
 * A unit word with no number at the start of a line ("cups flour", "tbsp butter"): read as the unit, no
 * amount. Singular full spellings that also begin food names ("pound cake", "gram flour", "cup noodles")
 * and one-letter abbreviations are not taken; nor are imprecise sizes ("inch").
 */
function bareUnitAtStart(u: UnitRead, text: string): boolean {
  const written = text.slice(u.s, u.e).toLowerCase().replace(/\.$/, "");
  if (written.length <= 1 || UNIT_WORDS_IN_FOOD_NAMES.has(written)) return false;
  return u.unit.dimension === "mass" || u.unit.dimension === "volume";
}

/** Every word of the item (short function words aside) begins with a capital, and there are at least two ("2 Sips Dark Rum"). */
function titleCaseLine(head: readonly Tok[]): boolean {
  const ws = head.filter((t) => isWord(t) && /\p{L}{2,}/u.test(t.text) && !TITLE_CASE_SMALL_WORDS.has(t.lower)) as { text: string }[];
  return ws.length >= 2 && ws.every((w) => /^\p{Lu}/u.test(w.text));
}
const TITLE_CASE_SMALL_WORDS = new Set(["of", "and", "or", "the", "a", "an", "in", "with", "for", "to", "on", "at", "by"]);

/**
 * MULTIPLIER AFTER THE FOOD (CONTRACT §12.2): the head ends in "x N" / "×N" / "(xN)" after at least one food word; the
 * number (an amount phrase reaching the end) is the line's amount. `at` is where the multiplier starts.
 */
function trailingMultiplier(text: string, head: readonly Tok[]): { amount: AmountReading; at: number } | null {
  const last = head[head.length - 1];
  if (isGroup(last) && head.length >= 2 && isWord(head[head.length - 2])) {
    const c = last.children;
    if ((isWord(c[0], "x") || isSym(c[0], "×")) && c.length >= 2) {
      const a = readAmountPhrase(text, c, 1);
      if (a !== null && a.next === c.length && a.quantity !== null) return { amount: a, at: head.length - 1 };
    }
    return null;
  }
  for (let k = 1; k < head.length - 1; k++) {
    if (!(isWord(head[k], "x") || isSym(head[k], "×")) || !isWord(head[k - 1]) || isWord(head[k - 1], "x")) continue;
    const a = readAmountPhrase(text, head, k + 1);
    if (a !== null && a.next === head.length && a.quantity !== null) return { amount: a, at: k };
  }
  return null;
}

/** A comma item "celery and onion": two plain foods joined by "and"/"&". */
function andJoinsFoods(seg: readonly Tok[]): boolean {
  const k = seg.findIndex((t) => isWord(t, "and") || isSym(t, "&"));
  return k > 0 && k < seg.length - 1 && plainFoodItem(seg.slice(0, k)) && plainFoodItem(stripPhrase(seg.slice(k + 1)));
}

/**
 * UNIT WITH NO NUMBER (CONTRACT §12.15): a singular imprecise measure word ("Pinch", "dash", "handful") or a singular
 * count unit ("Clove of garlic") with no number is one of it; a plural or vague one ("Dashes of bitters", "a few drops")
 * states none, and a measuring unit ("Cup of flour", "Tablespoon olive oil") may have lost its number (a person checks).
 */
function impliedOne(u: UnitRead, text: string): boolean {
  const written = text.slice(u.s, u.e).toLowerCase().replace(/\.$/, "");
  const singular = !/(?:s|es)$/.test(written) || written === u.unit.canonical;
  return ((u.unit.dimension === "imprecise" && u.unit.canonical !== "inch") || (u.unit.dimension === "count" && u.unit.canonical !== "each")) && singular && written !== "ea";
}

// --- The engine -------------------------------------------------------------------------------------

interface Reading {
  out: ParsedIngredientV1;
}

interface ReadOptions {
  /**
   * The number at the start belongs to the name ("Five spice powder, to taste", "Three cheese blend, 1 cup"):
   * the line is read name-first and a person must confirm (`unclassified`).
   */
  leadIsName: boolean;
  /** (semantic-v2) the leading number names the product (§12.9): no person needs to confirm that by itself. */
  productNumber?: boolean;
}

function read(input: unknown, opts: ReadOptions = { leadIsName: false }): Reading {
  const { raw, normalized, truncated } = normalizeLine(input);
  const reasons: ReasonCode[] = [];
  if (truncated) reasons.push("input_truncated");
  if (normalized === "") return { out: unsupported(raw, normalized, [...reasons, "empty_line"]) };
  const text = normalized;
  // "1) 2 cups flour", "a) 2 eggs", "1. 2 cups flour": a numbered marker before an amount is blanked
  // before lexing (offsets stay those of the normalized text).
  let marker = NUMBERED_MARKER.exec(text);
  if (!marker) {
    // "1. Preheat the oven…", "2) Add the flour": a numbered step (the rest is then judged on its own);
    // "2. cups milk" keeps its number, because a unit follows.
    const step = NUMBERED_STEP.exec(text);
    if (step && unitOfWord(step[1]) === null) marker = step;
  }
  const lexed = lex(marker ? " ".repeat(marker[0].length) + text.slice(marker[0].length) : text);
  if (marker) push(reasons, "list_marker_removed");
  let toks: Tok[] = lexed.tokens;

  // List marker: "- ", "• ", "* ", "1. " before an amount.
  let negative = false;
  if (isSym(toks[0]) && BULLETS.has(toks[0].text) && toks.length > 1) {
    let k = 1;
    while (isSym(toks[k], toks[0].text) && adjacent(toks[k - 1], toks[k])) k++;
    if (toks[k] && toks[k].s > toks[k - 1].e) {
      toks = toks.slice(k);
      push(reasons, "list_marker_removed");
    } else if (isSym(toks[0], "-", "−", "–") && toks[1]?.kind === "num" && adjacent(toks[0], toks[1])) {
      negative = true; // "-2 cups": a negative amount
      toks = toks.slice(1);
    }
  }
  if (lexed.unbalanced) push(reasons, "structure_unbalanced");
  // a price before everything ("($0.02) 1 cup milk") is dropped like any other price annotation
  while (isGroup(toks[0]) && isPriceGroup(toks[0]) && toks.length > 1) {
    toks = toks.slice(1);
    push(reasons, "price_annotation_removed");
  }

  const fx = emptyEffects();
  // "Optional:" / "(optional)" / "optional 1/2 cup walnuts" prefix.
  if (isWord(toks[0], "optional") && isSym(toks[1], ":", "-", "–")) {
    fx.optional = true;
    toks = toks.slice(2);
  } else if (isWord(toks[0], "optional") && toks.length > 2 && amountStartsAt(text, toks, 1)) {
    fx.optional = true;
    toks = toks.slice(1);
  } else if (isGroup(toks[0]) && toks[0].children.length === 1 && isWord(toks[0].children[0], "optional")) {
    fx.optional = true;
    toks = toks.slice(1);
  }

  const nonIngredient = nonIngredientReason(toks);
  if (nonIngredient) return { out: unsupported(raw, normalized, [...reasons.filter((r) => r === "input_truncated"), nonIngredient]) };
  // (semantic-v2, §12.8) "2 chicken skewers", "1 jam jar": a holder that is never eaten, after a word that may name its
  // contents — food on skewers, or the skewers? A person checks, unless the name is a recognised food ("4 bread bowls").
  const shape = equipmentShape(toks);
  const unsureEquipment = shape === "unsure";
  // ("2 pepper grinders", "1 lb short plate") a sure equipment shape whose words also name a recognised food reached
  // here (`equipmentPhrase`): it is read only when its name ends in a compound food name ("short plate"), else a person checks
  const equipmentFood = shape === "equipment";

  // Segments at top-level commas/semicolons: the head, then remarks.
  const segments = splitTopLevel(toks);
  let head = segments[0];
  let tails = segments.slice(1);

  // A label before a colon ("Sugar: 1/2 cup", "To serve: lemon wedges") or a spaced dash.
  let labelBefore: Tok[] | null = null;
  const sep = separatorAt(head);
  if (sep > 0) {
    const pre = head.slice(0, sep);
    const post = head.slice(sep + 1);
    if (!numericLead(pre) && !hasNumberTok(pre)) {
      if (phraseOnly(post)) {
        head = pre; // "Salt: to taste" — the label is the food
        tails = [post, ...tails];
      } else if (isSym(head[sep], ":") || amountStartsAt(text, post, 0)) {
        labelBefore = pre;
        head = post;
      }
    } else if (isSym(head[sep], ":")) {
      head = pre;
      tails = [post, ...tails];
    }
  }

  // The amount phrase.
  let amount: AmountReading | null = null;
  let region: Tok[] = head;
  let multiplierMeasure = false;
  let nameFromLabel = false;
  let usedTail = -1;
  let partNote: Tok[] | null = null;
  let unclassified = opts.leadIsName && opts.productNumber !== true;
  amount = opts.leadIsName ? null : readAmountPhrase(text, head, 0);
  const amountAtStart = amount !== null;
  if (amount) {
    region = head.slice(amount.next);
    if (labelBefore && !region.some((t) => isWord(t) && !SIZE_WORDS.has(t.lower) && t.lower !== "extra")) {
      // "Sugar: 1/2 cup", "Eggs - 2 large" — the label is the name (size words after the amount are notes)
      const sizes = region.filter((t) => isWord(t));
      if (sizes.length > 0) fx.notes.push({ s: sizes[0].s, text: textOf(text, sizes) });
      region = [...labelBefore, ...region.filter((t) => !isWord(t))];
      nameFromLabel = true;
      labelBefore = null;
    }
  } else {
    // Name first: an amount in brackets ("Parmesan (1/2 cup)"), after the first comma ("flour, 2 cups"),
    // at the end ("flour 2 cups"), or "juice of 1 lemon".
    // (a bracket glued to a word, as in "alert(1)", is not an amount written after a name)
    const gi = head.findIndex((t, k) => k > 0 && isGroup(t) && !adjacent(head[k - 1], t) && (groupAmount(text, t) !== null || amountWithSizeWords(text, t.children) !== null));
    if (gi >= 0) {
      const g = head[gi] as Extract<Tok, { kind: "group" }>;
      const found = amountWithSizeWords(text, g.children);
      amount = found ? found.amount : readAmountPhrase(text, g.children, 0);
      if (found && found.sizeNote.length > 0) fx.notes.push({ s: found.sizeNote[0].s, text: textOf(text, found.sizeNote) });
      region = [...head.slice(0, gi), ...head.slice(gi + 1)];
    }
    if (!amount && tails.length > 0 && amountStartsAt(text, tails[0], 0)) {
      const a = readAmountPhrase(text, tails[0], 0);
      if (a) {
        amount = a;
        usedTail = 0;
        const rest = tails[0].slice(a.next);
        if (rest.length > 0) {
          const restFx = emptyEffects();
          const nr = readNameRegion(rest, { text, slots: null, unitWritten: true, hasQuantity: false, dropLeadingOf: true, sizeWordsAreNotes: true, amountRead: false, verbatim: false }, restFx);
          // what follows the amount ("3 medium" → medium) is a remark on the named food
          if (nr.name) restFx.notes.push({ s: rest[0].s, text: nr.name });
          mergeEffects(fx, restFx);
        }
      }
    }
    if (!amount) {
      // MULTIPLIER after the food (§12.2): "eggs x 3", "eggs x3", "eggs ×3", "eggs (x3)" — the count of the food
      const m = trailingMultiplier(text, head);
      if (m !== null) {
        amount = m.amount;
        region = head.slice(0, m.at);
        // (round 3, R1 item 4) the same measure check as after a count: "tots of rum x 2" multiplies an unread measure
        // (a unit word there too: "cups of tea x 3" — the multiplier counts cups, not the food)
        const mm = isWord(region[0]) && unitOfWord((region[0] as { text: string }).text) !== null && region.length > 1 ? 1 : unknownMeasureAt(region, 0);
        if (mm > 0) {
          fx.notes.push({ s: region[0].s, text: text.slice(region[0].s, region[mm - 1].e) });
          multiplierMeasure = true;
          region = region.slice(isWord(region[mm], "of") ? mm + 1 : mm);
        }
      }
    }
    if (!amount) {
      // "flour 2 cups": the first number, if the amount phrase from there ends the head and has a unit
      const p = head.findIndex((t, k) => k > 0 && isNumberish(t));
      if (p > 0 && isWord(head[p - 1])) {
        const a = readAmountPhrase(text, head, p);
        if (a && a.next === head.length && a.unitSpan !== null) {
          amount = a;
          region = head.slice(0, p);
        }
      }
    }
    if (!amount) {
      const of = head.findIndex((t, k) => k > 0 && k <= 3 && isWord(t, "of", "from") && readAmountPhrase(text, head, k + 1) !== null);
      if (of > 0 && head.slice(0, of).every((t) => t.kind === "word")) {
        const a = readAmountPhrase(text, head, of + 1);
        if (a && a.next < head.length) {
          amount = a;
          partNote = head.slice(0, of);
          region = head.slice(a.next);
          // "Juice of 2 limes", "Zest of ½ orange": the fruit is counted and the part used is the note (labelling
          // guide); any other "X of 2 Y" ("leaves of 2 sprigs") stays for a person to check
          const partWords = partNote.filter((t) => t.kind === "word") as { lower: string }[];
          const fruitPart = partWords.length === partNote.length && partWords.every((w) => FRUIT_PART_WORDS.has(w.lower)) && partWords.some((w) => ["juice", "zest", "rind", "peel"].includes(w.lower));
          if (!fruitPart) unclassified = true;
        }
      }
    }
    if (!amount) {
      // "Pinch of salt", "small handful of basil", "Dash hot sauce": a unit with no number — the unit is
      // read, no amount is invented. Without "of" only an imprecise unit is taken (a "strip steak" is food).
      let k = 0;
      while (isWord(head[k]) && (SIZE_WORDS.has((head[k] as { lower: string }).lower) || MEASURE_ADJECTIVES.has((head[k] as { lower: string }).lower))) k++;
      const u = readUnit(text, head, k);
      // ("Scant cup sugar", "Heaping tablespoon flour": after a measure adjective a unit word is the unit, §12.15)
      const measured = k > 0 && u !== null && (u.unit.dimension === "mass" || u.unit.dimension === "volume") && head.slice(0, k).some((t) => isWord(t) && MEASURE_ADJECTIVES.has(t.lower) && !SIZE_WORDS.has(t.lower));
      const taken = u !== null && (isWord(head[u.next], "of") || (u.unit.dimension === "imprecise" && u.unit.canonical !== "drop" && u.unit.canonical !== "inch") || bareUnitAtStart(u, text) || measured);
      if (u && taken && u.next < head.length) {
        amount = { ...noAmount(), unit: u.unit, unitSpan: [u.s, u.e], next: 0 };
        // (semantic-v2) "Pinch of salt", "Small pinch of salt", "Dash hot sauce": a singular imprecise measure that
        // opens the line is one of it, as "a pinch of salt" is (the article is left out); "Pinches of salt" states none
        if (impliedOne(u, text)) amount.quantity = toExactQuantity(rational(BigInt(1)));
        if (k > 0) fx.notes.push({ s: head[0].s, text: textOf(text, head.slice(0, k)) });
        region = head.slice(u.next);
      }
    }
  }
  // "1 pound boneless, skinless chicken breasts": a comma between describing words before the food
  // joins them; the food follows in the next segment.
  if (usedTail < 0) {
    while (tails.length > 0 && describingOnly(region) && namesAFood(tails[0])) {
      region = [...region, ...tails[0]];
      tails = tails.slice(1);
    }
  }
  const amt = amount ?? noAmount();
  mergeEffects(fx, amt.effects);
  if (negative && amt.amountWritten) {
    amt.quantity = null;
    push(fx.reasons, "quantity_not_positive");
  }

  // The name region.
  const slots: AmountSlots = {
    quantity: amt.quantity, unit: amt.unitSpan ? amt.unit : null, packageSize: amt.packageSize, packageSpan: amt.packageSpan, equivalents: amt.equivalents,
    effects: fx,
  };
  const hasQuantity = amt.quantity !== null;
  const nr: NameReading = readNameRegion(region, {
    text, slots: amount ? slots : null, unitWritten: amt.unitSpan !== null, hasQuantity, dropLeadingOf: amount !== null && !nameFromLabel,
    // size words describe counted items and, after a weight or volume, the food (semantic-v2, CONTRACT §12.10: "1 lb
    // large shrimp" → shrimp, note large); after a container they may name the product ("1 bag mini marshmallows")
    sizeWordsAreNotes: amt.unitSpan === null || (amt.unit !== null && !CONTAINER_UNITS.has(amt.unit.canonical) && amt.unit.dimension !== "imprecise"),
    amountRead: amountAtStart && !nameFromLabel, verbatim: opts.leadIsName,
  }, fx);
  let unit: UnitV1 | null = amt.unit;
  let unitSpan = amt.unitSpan;
  if (nr.trailingUnit && unit && unit.canonical === "each" && unitSpan === null) {
    unit = nr.trailingUnit.unit;
    unitSpan = [nr.trailingUnit.s, nr.trailingUnit.e];
  }
  if (nr.amountUnclear) slots.quantity = null; // "1 half cup milk": which number is the amount?

  // A size written between a bare count and the food stands as a package size only when the line counts
  // a unit ("2 (6-ounce) salmon fillets"); otherwise ("3 4 cups flour", "2 (8 oz) steaks") nobody can say
  // what it measures: noted, `quantity_unassigned`, and a bare "3 4 cups" leaves no amount at all.
  const bareCount = amountAtStart && amt.unitSpan === null;
  if (amt.packageProvisional && slots.packageSize !== null && !(unit !== null && PACKAGE_UNITS.has(unit.canonical))) {
    const [ps, pe] = slots.packageSpan ?? [0, 0];
    const size = slots.packageSize;
    const at = fx.reasons.indexOf("package_size_stated");
    if (at >= 0) fx.reasons.splice(at, 1);
    slots.packageSize = null;
    slots.packageSpan = null;
    // (an unmarked size before a counted unit is per piece too: "6 150 g salmon fillets")
    const countedUnit = unit !== null && unit.dimension === "count" && unit.canonical !== "each";
    // (only whole items carry a per-piece weight: "⅓ (120 g) maple syrup" and "2 x 400 g walnuts" stay for a person)
    const wholeCount = slots.quantity?.kind === "exact" && slots.quantity.denominator === "1";
    if ((amt.packageProvisional.marked || countedUnit) && amt.packageProvisional.approx !== true && amt.packageProvisional.viaX !== true && wholeCount) {
      // (semantic-v2, §12.3) a PER-PIECE WEIGHT of what is counted ("4 (6-oz) salmon fillets", "2 (6 oz) chicken
      // breasts"): a note, never a package size; for one item it restates the amount ("a 3-pound whole chicken")
      const one = slots.quantity?.kind === "exact" && slots.quantity.numerator === slots.quantity.denominator;
      if (one) {
        slots.equivalents.push({ quantity: size.quantity, unit: size.unit });
        push(fx.reasons, "equivalent_quantity_stated");
      } else if (pe > ps) fx.notes.push({ s: ps, text: text.slice(ps, pe) });
    } else {
      // "3 4 cups flour": nobody can say what the second number measures; "2 (about 1 lb) potatoes": each, or in all?
      if (pe > ps) fx.notes.push({ s: ps, text: text.slice(ps, pe) });
      fx.unassigned++;
      if (!amt.packageProvisional.marked && !countedUnit) slots.quantity = null;
    }
  }

  // (semantic-v2, §12.14) "1 pint milk (UK)": a non-US system named for a US volume — the size differs, a person checks
  if (foreignSystemRemark(head, unit)) push(fx.reasons, "unclassified");
  // (semantic-v2, §12.8) "Sugar 10g", "Salt: 1.2 g": sugar or salt, then only a mass in g/mg — a nutrition-panel
  // line or a UK recipe weight; a person checks
  if ((nameFromLabel || !amountAtStart) && nr.name !== null && NUTRIENT_FOOD_WORDS.has(nr.name.trim().toLowerCase()) && unit !== null && (unit.canonical === "g" || unit.canonical === "mg")) push(fx.reasons, "unclassified");
  // (semantic-v2, §12.8 unknown default) "Lycopene 2 mg", "Erythritol: 5 mg": a label, then only milligrams — the shape of a
  // nutrition fact whose label is not in the nutrient vocabulary; a person checks
  if ((nameFromLabel || !amountAtStart) && nr.name !== null && unit !== null && unit.canonical === "mg") push(fx.reasons, "unclassified");

  // (semantic-v2, §12.3) a size placed before the counted unit was known ("4 salmon fillets (6 oz each)", "2 chicken
  // breasts (6 oz each)"): only packaging takes a package size; of anything else it is a per-piece weight
  if (slots.packageSize !== null && !amt.packageProvisional && !(unit !== null && PACKAGE_UNITS.has(unit.canonical))) {
    const size = slots.packageSize;
    const [ps, pe] = slots.packageSpan ?? [0, 0];
    const at = fx.reasons.indexOf("package_size_stated");
    if (at >= 0) fx.reasons.splice(at, 1);
    slots.packageSize = null;
    slots.packageSpan = null;
    const one = slots.quantity?.kind === "exact" && slots.quantity.numerator === slots.quantity.denominator;
    if (one && !slots.equivalents.some((x) => x.unit.canonical === size.unit.canonical)) {
      slots.equivalents.push({ quantity: size.quantity, unit: size.unit });
      push(fx.reasons, "equivalent_quantity_stated");
    } else if (pe > ps) fx.notes.push({ s: ps, text: text.slice(ps, pe) });
  }

  // A count before a food that does not read as several ("Five spice powder", "Two egg", "2 tomato"): the
  // count is kept and a person checks. Only when a comma then gives the line's own amount or says "to taste"
  // ("Five spice powder, to taste", "Three cheese blend, 1 cup", "5 spice powder, 1 tsp") is the number part
  // of the name, and the line is read again name-first. A weight after a counted food ("2 chicken breast,
  // about 1 lb") is the weight of what was counted, so the count stays (the weight is a second amount).
  // (read again only when a plain word follows the number: "10 of rice", "12 (1 stick) can …" are other shapes)
  const r0 = region[0];
  const plainNext = r0 !== undefined && r0.kind === "word" && r0.lower !== "of" && readUnit(text, region, 0) === null && !SIZE_WORDS.has(r0.lower);
  // (semantic-v2, CONTRACT §12.9) a count of two or more followed by a singular component noun and a singular or mass
  // head names the product ("Five spice powder", "Three cheese blend", "5 spice powder"): the number is part of the name
  // and the line has no amount unless another one is written ("Three cheese blend, 1 cup"); a plural head is a count
  // ("Twelve cherry tomatoes")
  if (!opts.leadIsName && bareCount && amt.quantitySpan !== null && slots.packageSize === null && amt.equivalents.length === 0) {
    const at = head.findIndex((t) => t.s === amt.quantitySpan![0]);
    if (at >= 0 && at + 1 < head.length && numberInProductName(head, at) === 1 && !isNumberish(head[at + 1])) return read(input, { leadIsName: true, productNumber: true });
  }
  if (!opts.leadIsName && bareCount && slots.packageSize === null && slots.quantity?.kind === "exact" && nr.options === null && nr.name !== null) {
    const value = fromExactQuantity(slots.quantity)!;
    if (cmp(value, rational(BigInt(1), BigInt(1))) > 0 && !namesSeveral(nr.name, nr.trailingUnit, text)) {
      const conflict = tails.some((seg) => {
        if (phraseOnly(seg)) return true;
        const sa = readStatedAmount(text, seg, 0);
        if (sa === null || sa.next !== seg.length || sa.unit.dimension === "imprecise") return false;
        return sa.unit.dimension !== "mass" || (amt.fromWord && !sa.approx);
      });
      if (conflict && plainNext) return read(input, { leadIsName: true });
      // (semantic-v3) a count of a singular food: only a food bought by weight or volume makes the count unclear ("2 milk",
      // "Two egg": a count, but of what?); a counted food written without a plural is still counted ("4 onigiri", "8 kibbeh",
      // "2 khachapuri", "6 pan de bono" — invariant and borrowed plurals)
      if (singularCountUnclear(nr.name)) push(fx.reasons, "unclassified");
    }
  }
  if (labelBefore) {
    // "Per person: 200 g pasta", "You will need: 2 baking sheets": the label changes what the amount means,
    // or may introduce something that is not food — a person checks
    const m = unstatedAt(labelBefore, 0);
    const phraseLabel = m !== null && m.len === labelBefore.length; // "For serving: lemon wedges"
    if (!phraseLabel && labelBefore.some((t) => isWord(t) && (SERVING_LABEL_WORDS.has(t.lower) || ["need", "needed", "require", "required"].includes(t.lower)))) push(fx.reasons, "unclassified");
    if (m && m.len === labelBefore.length) fx.unstated.push({ kind: m.kind, s: labelBefore[0].s, text: textOf(text, labelBefore), alone: true });
    else if (labelBefore.length === 1 && isWord(labelBefore[0], "garnish", "garnishes")) fx.unstated.push({ kind: "for_garnish", s: labelBefore[0].s, text: textOf(text, labelBefore), alone: true });
    else fx.notes.push({ s: labelBefore[0].s, text: trimEdges(textOf(text, labelBefore)) });
  }
  if (partNote) fx.notes.push({ s: partNote[0].s, text: textOf(text, partNote) });

  // "plus …" without a comma, and remarks after commas.
  let quantity = slots.quantity;
  // "plus" with an amount of ANOTHER food ("2 eggs + 1 yolk", "3 eggs plus 1 egg yolk"): two foods, no single name
  let severalFoods = false;
  const addPlus = (remark: Tok[]) => {
    const body = isWord(remark[0], "plus") || isSym(remark[0], "+") ? remark.slice(1) : remark;
    const sa = readStatedAmount(text, body, 0);
    // (semantic-v2, §12.11) the same food after "plus", with only a purpose after it ("plus 2 tablespoons for
    // dusting", "plus 1/2 tsp for the eggs"), is summed; the purpose is the note
    const purpose = sa !== null && sa.next < body.length && isWord(body[sa.next], "for", "to") && !body.slice(sa.next).some((t) => isNumberish(t) || isGroup(t));
    if (sa && (sa.next === body.length || purpose) && quantity?.kind === "exact" && unit && unit.dimension === sa.unit.dimension && (unit.dimension === "mass" || unit.dimension === "volume")) {
      const q = fromExactQuantity(quantity)!;
      const sum = sumInSmallest([{ value: q, unit }, { value: sa.value, unit: sa.unit }]);
      const exact = sum ? toExactQuantity(sum.value) : null;
      if (sum && exact) {
        quantity = exact;
        if (sum.unit.canonical !== unit.canonical) {
          unit = sa.unit;
          unitSpan = sa.unitSpan;
        }
        push(fx.reasons, "compound_quantity_summed");
        if (purpose) {
          const pfx = emptyEffects();
          classifyPiece(text, body.slice(sa.next), pfx);
          mergeEffects(fx, pfx);
        }
        return;
      }
    }
    const pfx = emptyEffects();
    classifyPiece(text, remark, pfx);
    if (hasNumberTok(body)) pfx.unassigned++;
    if (amountStartsAt(text, body, 0)) {
      const other = readAmountPhrase(text, body, 0);
      const rest = other === null ? [] : body.slice(isWord(body[other.next], "of") ? other.next + 1 : other.next);
      if (rest.length > 0 && namesAFood(rest) && !isWord(rest[0], "for", "to", "more", "extra")) severalFoods = true;
    }
    mergeEffects(fx, pfx);
  };
  if (nr.plusRemark) addPlus(nr.plusRemark);

  // Consecutive plain remarks after commas stay one note piece, commas kept ("peeled, halved and sliced").
  let noteRun: { s: number; text: string }[] = [];
  const flushRun = () => {
    if (noteRun.length === 0) return;
    fx.notes.push({ s: noteRun[0].s, text: noteRun.map((n) => n.text).join(", ") });
    noteRun = [];
  };
  // "cheddar, Monterey Jack, or pepper jack", "stock, chicken, beef or vegetable": short food segments that
  // end in an "or" option are options too.
  const listOptions: { s: number; text: string }[] = [];
  {
    let m = usedTail + 1;
    const run: Tok[][] = [];
    const shortItem = (seg: readonly Tok[]) => seg.length > 0 && seg.length <= 4 && seg.every((t) => t.kind === "word") && namesAFood(seg);
    while (m < tails.length && !isWord(tails[m][0], "or") && shortItem(tails[m]) && splitOr(tails[m]).length === 1) run.push(tails[m++]);
    const lastParts = m < tails.length && !isWord(tails[m][0], "or") ? splitOr(tails[m]) : [];
    const pairEnd = lastParts.length === 2 && lastParts.every(shortItem);
    if (run.length > 0 && m < tails.length && (isWord(tails[m][0], "or") || pairEnd) && nr.name !== null) {
      for (const seg of run) listOptions.push({ s: seg[0].s, text: textOf(text, seg) });
      if (pairEnd) {
        for (const seg of lastParts) listOptions.push({ s: seg[0].s, text: textOf(text, seg) });
        m++;
      }
      tails = [...tails.slice(0, usedTail + 1), ...tails.slice(m)];
    }
  }
  // "salt, pepper, and garlic powder to taste", "sour cream, avocado, cilantro, for topping": several foods
  // listed in one line. Read as written, but a person must split them.
  {
    let m = usedTail + 1;
    let foods = 0;
    while (m < tails.length && !isWord(tails[m][0], "or") && plainFoodItem(tails[m])) {
      foods++;
      m++;
    }
    const andLast = m < tails.length && (isWord(tails[m][0], "and") || isSym(tails[m][0], "&")) && plainFoodItem(stripPhrase(tails[m].slice(1)));
    // (semantic-v2) "1 cup carrots, celery and onion": a last item "celery and onion" names two foods
    const andPair = foods === 1 && m === usedTail + 2 && andJoinsFoods(tails[m - 1]);
    if (nr.name !== null && listOptions.length === 0 && (foods >= 2 || (foods >= 1 && andLast) || andPair)) {
      push(fx.reasons, "unclassified");
      severalFoods = true; // §12.7 (g): different foods sharing one amount — no name is privileged
    }
    // (semantic-v2, §12.A A4) "2 cups strawberries and blueberries", "2 tbsp butter and oil": two foods joined by "and" in
    // the name, with no comma, share the amount too (a fixed compound or modifiers of one head stay one food)
    if (!severalFoods && nr.name !== null && nr.options === null && listOptions.length === 0 && amt.amountWritten && andJoinsTwoFoods(nr.name)) {
      push(fx.reasons, "unclassified");
      severalFoods = true;
    }
  }
  tails.forEach((seg, idx) => {
    if (idx === usedTail || seg.length === 0) return;
    if (isWord(seg[0], "plus") || isSym(seg[0], "+")) {
      flushRun();
      addPlus(seg);
      return;
    }
    // A full stated amount after the name ("1 cup flour, 120 g") restates the amount. After a bare count
    // ("2 chicken breasts, 1 lb") it is a second amount: a weight of what was counted is not a restatement.
    const sa = amount ? readStatedAmount(text, seg, 0) : null;
    if (sa && sa.next === seg.length) {
      flushRun();
      if (bareCount && sa.unit.dimension !== "imprecise") {
        fx.notes.push({ s: seg[0].s, text: textOf(text, seg) });
        fx.unassigned++;
        return;
      }
      placeSecondary(text, slots, { sa, position: "after" });
      return;
    }
    const pfx = emptyEffects();
    classifyPiece(text, seg, pfx);
    if (amount && sa && sa.unit.canonical !== "inch") pfx.unassigned++; // "1 cup flour, 2 tbsp sugar": a second amount with a unit
    else if (!sa && amountStartsAt(text, seg, 0)) {
      // "2 eggs, 3", "2 cups flour, 3 eggs", "Seven layer bars, 12": a number after a comma is an amount nobody
      // can place — the note never holds an amount (CONTRACT §2). A size ("1-inch cubes") is a note.
      const lead = readAmountPhrase(text, seg, 0);
      if (lead && (lead.quantity !== null || (lead.amountWritten && lead.effects.notes.length === 0))) pfx.unassigned++;
    }
    const plain = pfx.notes.length === 1 && !pfx.optional && pfx.unstated.length === 0 && pfx.form === null && pfx.options.length === 0 && pfx.unassigned === 0;
    if (plain) {
      noteRun.push(pfx.notes[0]);
      for (const r of pfx.reasons) push(fx.reasons, r);
      fx.amountRemarks.push(...pfx.amountRemarks);
      return;
    }
    flushRun();
    mergeEffects(fx, pfx);
  });
  flushRun();

  // (semantic-v2, CONTRACT §12.11, §12.A A3) remarks that state an amount: a second amount (another product, a substitute,
  // another state, the whole an extracted part comes from, another food) is placed by nobody → review; a restatement of
  // the same food, whole or prepared ("1 cup chopped onion (1 medium onion)", "1 large onion (about 2 cups chopped)") is an
  // equivalent, and the note keeps only its describing words
  for (const r of fx.amountRemarks) {
    if (remarkSecondAmount(r.toks) || remarkMeasuresAnother(r.toks, nr.name, text)) {
      fx.unassigned++;
      continue;
    }
    // (only a line with its own amount has an amount to restate)
    const re = quantity === null ? null : remarkRestatement(text, r.toks);
    if (re === null || re.amount.quantity?.kind !== "exact") continue;
    const rq = re.amount.quantity;
    const ru: UnitV1 = re.amount.unit ?? { canonical: "each", dimension: "count", source: "" };
    if (ru.dimension === "imprecise") continue; // ("(a pinch)": no amount to restate with)
    if (unit !== null && quantity?.kind === "exact" && ru.dimension === unit.dimension && (ru.dimension === "mass" || ru.dimension === "volume") && sameAmount(quantity, unit, rq, ru) === false) {
      fx.unassigned++;
      continue;
    }
    if ((unit !== null && ru.canonical === unit.canonical) || slots.equivalents.some((x) => x.unit.canonical === ru.canonical)) continue;
    slots.equivalents.push({ quantity: rq, unit: ru });
    push(fx.reasons, "equivalent_quantity_stated");
    const nameWords = new Set((nr.name ?? "").toLowerCase().split(/\s+/));
    const describing = r.toks.filter((t) => isWord(t) && !nameWords.has(t.lower) && !APPROX_WORDS.has(t.lower) && (SIZE_WORDS.has(t.lower) || TRAILING_PREP_WORDS.has(t.lower) || PREP_ADVERBS.has(t.lower) || (REMARK_WORDS.has(t.lower) && !["more", "less", "so", "extra"].includes(t.lower)) || ["ripe"].includes(t.lower)));
    // (the remark may share its note piece with plain remarks after it: "about 1 medium, divided")
    const remarkText = textOf(text, r.toks);
    const at = fx.notes.findIndex((n) => n.s === r.s && n.text.startsWith(remarkText));
    if (at >= 0) {
      const rest = fx.notes[at].text.slice(remarkText.length).replace(/^\s*,\s*/, "");
      const kept = describing.map((t) => (t as { text: string }).text).join(" ");
      const joined = [kept, rest].filter((x) => x.length > 0).join(", ");
      if (joined.length > 0) fx.notes[at] = { s: fx.notes[at].s, text: joined };
      else fx.notes.splice(at, 1);
    }
  }

  // Alternatives (CONTRACT §7.8): every option, in order; the name is then null. Options are completed only
  // where the grammar says so (alternatives.ts); a word is never invented and an option never dropped.
  let name = nr.name;
  // (semantic-v2, §12.4) "6 cloves", "2 whole cloves": "cloves" with no food word is the spice, counted as it is
  if (name === null && nr.options === null && unit?.canonical === "clove" && unitSpan !== null && amt.unitSpan !== null && region.every((t) => isGroup(t) || isSym(t))) {
    name = text.slice(unitSpan[0], unitSpan[1]);
    nr.nameSpan = [unitSpan[0], unitSpan[1]];
    unit = { canonical: "each", dimension: "count", source: "" };
    unitSpan = null;
  }
  const additional = fx.options.filter((o) => o.mode === "additional");
  const variantOpts = fx.options.filter((o) => o.mode === "variants" && o.text.length > 0);
  const variants = variantOpts.map((o) => o.text);
  const listed = fx.options.filter((o) => o.mode === "list").map((o) => o.text).filter((x) => x.length > 0);
  let base: string[] = nr.options ? [...nr.options] : name ? [name] : [];
  let choice = nr.options !== null && nr.options.length >= 2;
  // (an item written with an article is a food of its own: "(cheddar, mozzarella, or a blend)")
  const articled = fx.options.some((o) => o.mode === "list" && /^an? /i.test(text.slice(o.s)));
  if (listed.length >= 2) {
    // a bracketed choice after the food: varieties of it ("sugar (granulated or powdered)", "oil (vegetable or
    // canola)") or the foods themselves ("nuts (walnuts or pecans)", "pasta (penne or rigatoni)") — §12.7 f
    if (base.length === 1) base = !articled && varietiesOf(listed, base[0]) ? listed.map((v) => withKind(v, base[0])) : shareOptions(listed);
    else base = listed;
    choice = true;
  } else if (listed.length === 1 && base.length === 1) {
    base = [...base, ...listed];
    choice = true;
  } else if (variants.length >= 2 && base.length === 1) {
    // a choice after a comma (§12.7 f, e): varieties of the named food ("1 onion, red or white", "broth, chicken or
    // vegetable", "flour, all-purpose or bread") → each with the food; kinds of a category ("nuts, pecans or walnuts",
    // "cheese, cheddar or Swiss") → the kinds; otherwise a list in which every item is an option ("raisins, cranberries
    // or cherries", "chicken, beef or vegetable stock") — never one option privileged or dropped
    const asList = shareOptions([base[0], ...variants]);
    if (varietiesOf(variants, base[0])) base = variants.map((v) => withKind(v, base[0]));
    else if (asList.some((x, k) => x !== [base[0], ...variants][k])) base = asList; // "chicken, beef or vegetable stock"
    else if (categoryNoun(base[0])) base = shareOptions(variants);
    else base = asList;
    choice = base.length >= 2;
  } else if (variants.length >= 2 && base.length === 0) {
    base = variants;
    choice = true;
  }
  // "fresh thyme (or dried)": a remark word alone names the same food in another form
  let extra = [...listOptions.map((o) => o.text), ...additional.map((o) => (isRemarkOption(o.text) && name ? `${o.text} ${foodHead(name)}` : o.text))];
  const named = name;
  const listTakesAdditional = listOptions.length > 0 && named !== null;
  if (listTakesAdditional && named !== null) {
    // a comma list ending in "or" (§12.7 e, f): varieties of the first item ("stock, chicken, beef, or vegetable"),
    // kinds of a category ("nuts, pecans, walnuts, or almonds"), or — otherwise — every item an option, with shared
    // words completed by `shareOptions` ("maple syrup, honey, or agave"; "chicken, beef, or vegetable broth")
    const kinds = [...listOptions.map((o) => o.text), ...additional.map((o) => o.text)];
    extra = [];
    const asList = shareOptions([named, ...kinds]);
    if (varietiesOf(kinds, named)) base = kinds.map((v) => withKind(v, named));
    else if (asList.some((x, k) => x !== [named, ...kinds][k])) base = asList; // "beef, chicken, or vegetable stock"
    else if (categoryNoun(named)) base = shareOptions(kinds);
    else base = asList;
    choice = base.length >= 2;
  }
  // an option with its own amount ("(or 1 tsp dried)", "(or 2 cups)") is a second amount nobody can place
  if (additional.some((o) => o.hasAmount)) fx.unassigned++;
  let alternatives = uniqueOptions([...base, ...extra]);
  if (alternatives.length >= 2 && (choice || extra.length > 0)) name = null;
  else if ((severalFoods || nr.distributive) && name !== null) {
    // (semantic-v2, §12.7 g, §12.12) several foods share the line's amount: no single name; the foods stay in the note
    alternatives = [];
    fx.notes.push({ s: nr.nameSpan?.[0] ?? 0, text: name });
    name = null;
    push(fx.reasons, "unclassified");
  } else {
    alternatives = [];
    if (!listTakesAdditional) for (const o of additional) if (o.text) fx.notes.push({ s: o.s, text: `or ${o.text}` });
  }

  // (semantic-v2, PHASE-2B-PLAN §6.1) RECOGNISED FOOD on a counted line: with a bare count, a count unit or an imprecise
  // unit, the line is read only when its food is recognised (`recognisedFoodHead`); otherwise a person checks and no
  // amount, unit or package is kept, so equipment ("1 comal") or a measure word ("1 tot dark rum") never carries an
  // invented amount. Lines measured in a mass or volume unit are not affected.
  const counted = amt.amountWritten && (unit === null || unit.dimension === "count" || unit.dimension === "imprecise");
  // (round 3, R1 item 1) on a Title Case line capitals carry no brand or variety signal: the words are judged in lower
  // case ("2 Sips Dark Rum", "1 Big Green Egg"; "4 Roma Tomatoes" stays a variety)
  const titleCase = titleCaseLine(head);
  const recognises = (n: string) => recognisedFoodHead(titleCase ? n.toLowerCase() : n);
  // (a food container written as the unit says the item is its contents: "1 bottle margarita mixer", "1 bottle mixer")
  const containerOfFood = unit !== null && ["bottle", "can", "jar", "carton", "tin"].includes(unit.canonical);
  const containedMixer = containerOfFood && name !== null && /(?:^|\s)mixers?$/i.test(name) && (/^\S+$/.test(name) || recognises(name.replace(/\s+mixers?$/i, "")));
  let recognised = name !== null ? recognises(name) || containedMixer : alternatives.length >= 2 ? alternatives.some(recognises) : true;
  // (round 3, R1 item 2) a food head that is also an equipment or brand word, after a capitalised word, with a count of one,
  // names a product to check ("1 Big Green Egg", "1 Kamado Joe", "1 Glad wrap")
  const one = quantity !== null && quantity.kind === "exact" && quantity.numerator === quantity.denominator;
  if (counted && one && (unit === null || unit.canonical === "each") && name !== null && homographHeadAfterCapital(name)) recognised = false;
  if (unsureEquipment && !(name !== null && recognises(name))) push(fx.reasons, "unclassified");
  const equipmentConflict = equipmentFood && !containerOfFood && !(name !== null && compoundFoodEnding(name.split(/\s+/)));
  let abstain = false;
  if (multiplierMeasure) push(fx.reasons, "unit_unknown");
  if ((counted && !recognised) || equipmentConflict || multiplierMeasure) {
    abstain = true;
    // (owner rule, round 2) the name pre-fill is the text after the number, as written: nothing is trimmed to known
    // words, and a unit or measure word that is no longer read stays visible in it ("4 slices chashu pork" → "slices
    // chashu pork"). Only words are taken back into the name — never a number, a bracket or a symbol (CONTRACT §2:
    // the name holds no amount) — and a package size that is no longer read is kept in the note ("4 oz").
    if (slots.packageSize !== null && slots.packageSpan !== null) fx.notes.push({ s: slots.packageSpan[0], text: text.slice(slots.packageSpan[0], slots.packageSpan[1]) });
    for (const x of slots.equivalents) if (x.quantity.kind === "exact") fx.notes.push({ s: amt.quantitySpan?.[1] ?? 0, text: `${x.quantity.display} ${x.unit.source || x.unit.canonical}` });
    if (name !== null && nr.nameSpan !== null && amt.quantitySpan !== null && amt.quantitySpan[1] <= nr.nameSpan[0]) {
      const qEnd = amt.quantitySpan[1];
      const nameStart = nr.nameSpan[0];
      const gap = toks.filter((t) => t.s >= qEnd && t.e <= nameStart);
      // the words right before the name, after any number, bracket or symbol, and not glued to one ("3-quart")
      let w0 = gap.length;
      // (a weight or volume word is never taken into the name: "0.5 lbs …" stays out, §2)
      const massOrVolume = (t: Tok) => {
        const c = isWord(t) ? unitOfWord(t.text) : null;
        return c !== null && (UNIT_REGISTRY[c].dimension === "mass" || UNIT_REGISTRY[c].dimension === "volume");
      };
      while (w0 > 0 && isWord(gap[w0 - 1]) && !massOrVolume(gap[w0 - 1]) && (w0 - 1 === 0 || !adjacent(gap[w0 - 2], gap[w0 - 1]) || isWord(gap[w0 - 2]))) w0--;
      while (w0 < gap.length && ["a", "an", "and", "or", "nor", "with", "to", "plus", "but", "of"].includes((gap[w0] as { lower: string }).lower)) w0++;
      if (w0 < gap.length && (w0 === 0 || !adjacent(gap[w0 - 1], gap[w0]))) {
        const span: [number, number] = [gap[w0].s, nr.nameSpan[1]];
        name = text.slice(span[0], span[1]).trim();
        nr.nameSpan = span;
        fx.notes = fx.notes.filter((n) => n.s < span[0] || n.s >= span[1]);
      }
    }
    quantity = null;
    unit = null;
    unitSpan = null;
    slots.packageSize = null;
    slots.packageSpan = null;
    slots.equivalents.length = 0;
    for (const r of ["package_size_stated", "equivalent_quantity_stated", "compound_quantity_summed"] as ReasonCode[]) {
      const at = fx.reasons.indexOf(r);
      if (at >= 0) fx.reasons.splice(at, 1);
    }
    push(fx.reasons, "unclassified");
  }

  // Unstated amount: a flag when no amount was written, otherwise the phrase is a note.
  let amountUnstated: AmountUnstated | null = null;
  const amountWritten = amt.amountWritten;
  if (fx.unstated.length > 0) {
    if (amountWritten) {
      for (const u of fx.unstated) if (u.alone) fx.notes.push({ s: u.s, text: u.text });
    } else {
      amountUnstated = [...fx.unstated].sort((x, y) => x.s - y.s)[0].kind;
    }
  }

  // Note, in source order.
  const notes = [...fx.notes].sort((x, y) => x.s - y.s).map((n) => trimEdges(n.text)).filter((t) => t.length > 0);
  const note = notes.length > 0 ? notes.join("; ") : null;

  // Reasons and status.
  const all: ReasonCode[] = [...reasons];
  for (const r of fx.reasons) push(all, r);
  if (alternatives.length >= 2) push(all, "ingredient_alternatives");
  if (fx.unassigned > 0) push(all, "quantity_unassigned");
  if (unclassified) push(all, "unclassified");
  // No amount and nothing that says why: quantity_missing (an amount that was written but refused, open-ended or
  // without a known unit already has its own reason).
  const explained: ReasonCode[] = ["quantity_not_positive", "quantity_invalid", "quantity_implausible", "number_format_ambiguous", "quantity_missing", "quantity_range", "unit_unknown"];
  if (quantity === null && amountUnstated === null && !all.some((r) => explained.includes(r))) push(all, "quantity_missing");
  if (name === null && alternatives.length === 0) push(all, "name_missing");
  if (quantity === null && amountUnstated !== null) push(all, "amount_unstated");
  if (fx.optional) push(all, "optional_ingredient");
  const approximate = !abstain && (amt.approximate || (fx.approximate && amt.amountWritten));
  if (approximate) push(all, "approximate_quantity");
  if (amt.fromWord && quantity !== null) push(all, "quantity_from_word");
  if (unit && unit.dimension === "count" && unit.canonical !== "each") push(all, "count_unit");
  if (unit && unit.dimension === "imprecise") push(all, "imprecise_unit");
  if (fx.form) push(all, "form_stated");

  const status = all.some((r) => REASONS[r].class === "review") ? "needs_review" : "ready";

  // A package size always sits beside a counted unit (a bare count when none is written); an implicit
  // "each" with no amount and no package is not a reading of anything.
  let outUnit: UnitV1 | null = unit;
  if (outUnit === null && slots.packageSize !== null) outUnit = { canonical: "each", dimension: "count", source: "" };
  if (quantity === null && outUnit?.canonical === "each" && unitSpan === null && slots.packageSize === null) outUnit = null;

  // Evidence spans; a span that would overlap one already given (a name around a bracketed amount) is left
  // out. A compound amount's unit lies inside its quantity span ("1 lb 4 oz" → unit "oz").
  const spans: Partial<Record<SpanField, [number, number]>> = {};
  const given: [number, number][] = [];
  const give = (field: SpanField, span: [number, number] | null, inside: [number, number] | null = null) => {
    if (span === null) return;
    const within = inside !== null && inside[0] <= span[0] && span[1] <= inside[1];
    if (!within && given.some(([s, e]) => span[0] < e && s < span[1])) return;
    spans[field] = span;
    given.push(span);
  };
  if (quantity !== null) give("quantity", amt.quantitySpan);
  if (outUnit !== null) give("unit", unitSpan, spans.quantity ?? null);
  if (slots.packageSize !== null) give("packageSize", slots.packageSpan);
  if (name !== null) give("name", nr.nameSpan);

  return {
    out: {
      raw, normalized, status, name, quantity, unit: outUnit,
      packageSize: slots.packageSize, equivalents: slots.equivalents, form: fx.form, note, alternatives, optional: fx.optional, approximate,
      amountUnstated, reasons: all, evidence: { spans },
    },
  };
}

/** The reading before the final validity check (exposed for tests: it must always validate on its own). */
export function parseSemanticUnchecked(line: unknown): ParsedIngredientV1 {
  return read(line).out;
}

/** Whether the safety net was used: never ("none"), the reader threw ("threw"), or its reading did not validate ("invalid"). */
export type SafetyNet = "none" | "threw" | "invalid";

/**
 * Runs a reader behind the safety net and says whether the net was used. `parseSemantic` is this with
 * the engine's own reader; tests pass a failing reader to prove the net, and check that the engine's own
 * reader never needs it (a fallback reading is valid, so validity alone could not reveal a defect).
 */
export function guardedParse(line: unknown, reader: (line: unknown) => ParsedIngredientV1 = parseSemanticUnchecked): { out: ParsedIngredientV1; net: SafetyNet } {
  let out: ParsedIngredientV1;
  try {
    out = reader(line);
  } catch {
    return { out: fallback(line), net: "threw" };
  }
  if (validateParsedIngredientV1(out).length === 0) return { out, net: "none" };
  return { out: fallback(line), net: "invalid" };
}

/** Reads one line; always returns a contract-valid reading. */
export function parseSemantic(line: unknown): ParsedIngredientV1 {
  return guardedParse(line).out;
}

/** A minimal, valid reading used only if the engine threw or produced an invalid reading (a defect). */
function fallback(line: unknown): ParsedIngredientV1 {
  const { raw, normalized, truncated } = normalizeLine(line);
  const reasons: ReasonCode[] = truncated ? ["input_truncated", "unclassified"] : ["unclassified"];
  if (normalized === "") return unsupported(raw, normalized, truncated ? ["input_truncated", "empty_line"] : ["empty_line"]);
  return {
    raw, normalized, status: "needs_review", name: null, quantity: null, unit: null, packageSize: null, equivalents: [], form: null, note: null,
    alternatives: [], optional: false, approximate: false, amountUnstated: null, reasons, evidence: { spans: {} },
  };
}

export const semanticV3Engine: IngredientEngine = Object.freeze({
  id: SEMANTIC_V3_ENGINE_ID,
  description: "Phase 2C semantic ingredient reader: declared unit words, structural measure slot (contract v1)",
  parse(line: string): ParsedIngredientV1 {
    return parseSemantic(line);
  },
});
