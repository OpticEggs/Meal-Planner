/**
 * semantic-v1 · the engine: reads one ingredient line into contract v1 (CONTRACT-v1.md §2, §7).
 *
 * Pipeline: normalize → tokens and bracket structure → list marker / "optional:" prefix → not an
 * ingredient? → split at top-level commas → the amount phrase (at the start; else after a colon, in a
 * bracket, after the first comma, at the end, or "juice of 1 lemon") → the name region → each remark
 * after a comma → assembly (note in source order, flags, alternatives) → status and reasons.
 *
 * Every part that was read is kept when a person must still decide something (useful partial
 * reading); the raw line is never used as the name. After the amount: a size between a bare count and
 * the food stands only beside a counted unit; a count before a food that does not read as several
 * ("Five spice powder", "Three cheese blend, 1 cup") is read again with the number in the name.
 *
 * A final check (`guardedParse`) runs the contract validator: a reader that throws, or an output that
 * would not validate (a defect), is replaced by a minimal `needs_review` reading with `unclassified`, so
 * callers always receive valid data — and `guardedParse` reports that the net was used, so tests can
 * prove it never is.
 */
import { REASONS, type AmountUnstated, type IngredientEngine, type ParsedIngredientV1, type ReasonCode, type SpanField, type UnitV1 } from "../../contract";
import { cmp, fromExactQuantity, rational, toExactQuantity } from "../../rational";
import { validateParsedIngredientV1 } from "../../validate";
import { amountStartsAt, groupAmount, isPriceGroup, readAmountPhrase, readStatedAmount, placeSecondary, sumInSmallest, type AmountSlots } from "./amount";
import { nonIngredientReason, numericLead } from "./classify";
import { adjacent, isGroup, isNumberish, isSym, isWord, lex, type Tok } from "./lexer";
import { BULLETS, CONTAINER_UNITS, SERVING_LABEL_WORDS, UNIT_WORDS_IN_FOOD_NAMES, FUNCTION_WORDS, INVARIANT_PLURALS, MEASURE_ADJECTIVES, PREP_ADVERBS, REMARK_WORDS, SIZE_WORDS, TRAILING_PREP_WORDS, unitOfWord } from "./lexicon";
import { readNameRegion, type NameReading } from "./name";
import { normalizeLine } from "./normalize";
import { classifyPiece, splitOr, splitTopLevel, textOf, trimEdges, unstatedAt } from "./remarks";
import { adjectival, distributeOptions, foodHead, isRemarkOption, plural, uniqueOptions, versionsOf, withKind } from "./alternatives";
import { emptyEffects, mergeEffects, type AmountReading } from "./types";
import { readUnit, type UnitRead } from "./unit";

export const SEMANTIC_ENGINE_ID = "semantic-v1";

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
 * A unit word with no number at the start of a line ("cups flour", "tbsp butter"): read as the unit, no
 * amount. Singular full spellings that also begin food names ("pound cake", "gram flour", "cup noodles")
 * and one-letter abbreviations are not taken; nor are imprecise sizes ("inch").
 */
function bareUnitAtStart(u: UnitRead, text: string): boolean {
  const written = text.slice(u.s, u.e).toLowerCase().replace(/\.$/, "");
  if (written.length <= 1 || UNIT_WORDS_IN_FOOD_NAMES.has(written)) return false;
  return u.unit.dimension === "mass" || u.unit.dimension === "volume";
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
  let nameFromLabel = false;
  let usedTail = -1;
  let partNote: Tok[] | null = null;
  let unclassified = opts.leadIsName;
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
          unclassified = true; // "juice of 1 lemon": the food is read, but what to buy is a person's call
        }
      }
    }
    if (!amount) {
      // "Pinch of salt", "small handful of basil", "Dash hot sauce": a unit with no number — the unit is
      // read, no amount is invented. Without "of" only an imprecise unit is taken (a "strip steak" is food).
      let k = 0;
      while (isWord(head[k]) && (SIZE_WORDS.has((head[k] as { lower: string }).lower) || MEASURE_ADJECTIVES.has((head[k] as { lower: string }).lower))) k++;
      const u = readUnit(text, head, k);
      const taken = u !== null && (isWord(head[u.next], "of") || (u.unit.dimension === "imprecise" && u.unit.canonical !== "drop" && u.unit.canonical !== "inch") || bareUnitAtStart(u, text));
      if (u && taken && u.next < head.length) {
        amount = { ...noAmount(), unit: u.unit, unitSpan: [u.s, u.e], next: 0 };
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
    // size words describe counted items; after a weight, volume or container they name the product
    sizeWordsAreNotes: amt.unitSpan === null || (amt.unit?.dimension === "count" && !CONTAINER_UNITS.has(amt.unit.canonical)),
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
  if (amt.packageProvisional && slots.packageSize !== null && !(unit && unit.dimension === "count" && unit.canonical !== "each")) {
    const [ps, pe] = slots.packageSpan ?? [0, 0];
    if (pe > ps) fx.notes.push({ s: ps, text: text.slice(ps, pe) });
    slots.packageSize = null;
    slots.packageSpan = null;
    const at = fx.reasons.indexOf("package_size_stated");
    if (at >= 0) fx.reasons.splice(at, 1);
    fx.unassigned++;
    if (!amt.packageProvisional.marked) slots.quantity = null;
  }

  // A count before a food that does not read as several ("Five spice powder", "Two egg", "2 tomato"): the
  // count is kept and a person checks. Only when a comma then gives the line's own amount or says "to taste"
  // ("Five spice powder, to taste", "Three cheese blend, 1 cup", "5 spice powder, 1 tsp") is the number part
  // of the name, and the line is read again name-first. A weight after a counted food ("2 chicken breast,
  // about 1 lb") is the weight of what was counted, so the count stays (the weight is a second amount).
  // (read again only when a plain word follows the number: "10 of rice", "12 (1 stick) can …" are other shapes)
  const r0 = region[0];
  const plainNext = r0 !== undefined && r0.kind === "word" && r0.lower !== "of" && readUnit(text, region, 0) === null && !SIZE_WORDS.has(r0.lower);
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
      push(fx.reasons, "unclassified"); // "2 tomato", "Two egg": a count, but of what?
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
  const addPlus = (remark: Tok[]) => {
    const body = isWord(remark[0], "plus") || isSym(remark[0], "+") ? remark.slice(1) : remark;
    const sa = readStatedAmount(text, body, 0);
    if (sa && sa.next === body.length && quantity?.kind === "exact" && unit && unit.dimension === sa.unit.dimension && (unit.dimension === "mass" || unit.dimension === "volume")) {
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
        return;
      }
    }
    const pfx = emptyEffects();
    classifyPiece(text, remark, pfx);
    if (hasNumberTok(body)) pfx.unassigned++;
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
    if (nr.name !== null && listOptions.length === 0 && (foods >= 2 || (foods >= 1 && andLast))) {
      push(fx.reasons, "unclassified");
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
      return;
    }
    flushRun();
    mergeEffects(fx, pfx);
  });
  flushRun();

  // Alternatives (CONTRACT §7.8): every option, in order; the name is then null. Options are completed only
  // where the grammar says so (alternatives.ts); a word is never invented and an option never dropped.
  let name = nr.name;
  const additional = fx.options.filter((o) => o.mode === "additional");
  const variantOpts = fx.options.filter((o) => o.mode === "variants" && o.text.length > 0);
  const variants = variantOpts.map((o) => o.text);
  const listed = fx.options.filter((o) => o.mode === "list").map((o) => o.text).filter((x) => x.length > 0);
  let base: string[] = nr.options ? [...nr.options] : name ? [name] : [];
  let choice = nr.options !== null && nr.options.length >= 2;
  // (an item written with an article is a food of its own: "(cheddar, mozzarella, or a blend)")
  const articled = fx.options.some((o) => o.mode === "list" && /^an? /i.test(text.slice(o.s)));
  if (listed.length >= 2) {
    // a bracketed choice after the food: "sugar (granulated or powdered)", "nuts (walnuts or pecans)"
    if (base.length === 1) {
      const how = articled ? "members" : versionsOf(listed, base[0], true);
      base = how === "members" ? listed : listed.map((v) => withKind(v, base[0]));
    } else base = listed;
    choice = true;
  } else if (listed.length === 1 && base.length === 1) {
    base = [...base, ...listed];
    choice = true;
  } else if (variants.length >= 2 && base.length === 1) {
    // a choice after a comma: "1 onion, red or white" (versions), "chicken, beef or vegetable stock" (a shared
    // head), "greens, spinach or kale" (members); "cheese, cheddar or Swiss" is not decided by the grammar
    const how = versionsOf(variants, base[0], false);
    const asWritten = [base[0], ...variants];
    const shared = distributeOptions(asWritten);
    const lastModifier = variants[variants.length - 1].split(" ")[0];
    if (how === "versions") base = variants.map((v) => withKind(v, base[0]));
    else if (!adjectival(lastModifier) && !plural(base[0]) && shared.some((x, k) => x !== asWritten[k])) base = shared;
    else if (how === "members") base = variants;
    else {
      // unsure: the food stays the name, the choice is a note, and a person decides
      push(fx.reasons, "unclassified");
      fx.notes.push({ s: variantOpts[0].s, text: `${variants.slice(0, -1).join(", ")} or ${variants[variants.length - 1]}` });
      base = [base[0]];
    }
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
    // "stock, chicken, beef, or vegetable" (versions), "chicken, beef, or vegetable stock" (a shared head);
    // otherwise every option of the list as written
    const kinds = [...listOptions.map((o) => o.text), ...additional.map((o) => o.text)];
    const asWritten = [named, ...kinds];
    const shared = distributeOptions(asWritten);
    const how = versionsOf(kinds, named, false);
    extra = [];
    if (how === "versions") base = kinds.map((v) => withKind(v, named));
    else if (shared.some((x, k) => x !== asWritten[k])) base = shared;
    else if (how === "members") base = kinds;
    else if (kinds.every((k) => !k.includes(" "))) {
      // "stock, chicken, beef, or vegetable", "salt, pepper, or paprika": is the first word one of the options?
      push(fx.reasons, "unclassified");
      fx.notes.push({ s: listOptions[0].s, text: `${kinds.slice(0, -1).join(", ")} or ${kinds[kinds.length - 1]}` });
      base = [named];
    } else base = asWritten; // "cheddar, Monterey Jack, or pepper jack": full names, every one an option
    choice = base.length >= 2;
  }
  // an option with its own amount ("(or 1 tsp dried)", "(or 2 cups)") is a second amount nobody can place
  if (additional.some((o) => o.hasAmount)) fx.unassigned++;
  let alternatives = uniqueOptions([...base, ...extra]);
  if (alternatives.length >= 2 && (choice || extra.length > 0)) name = null;
  else {
    alternatives = [];
    if (!listTakesAdditional) for (const o of additional) if (o.text) fx.notes.push({ s: o.s, text: `or ${o.text}` });
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
  const approximate = amt.approximate || (fx.approximate && amt.amountWritten);
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

export const semanticEngine: IngredientEngine = Object.freeze({
  id: SEMANTIC_ENGINE_ID,
  description: "Phase 2 semantic ingredient reader (contract v1)",
  parse(line: string): ParsedIngredientV1 {
    return parseSemantic(line);
  },
});
