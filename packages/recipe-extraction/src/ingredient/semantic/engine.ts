/**
 * semantic-v1 · the engine: reads one ingredient line into contract v1 (CONTRACT-v1.md §2, §7).
 *
 * Pipeline: normalize → tokens and bracket structure → list marker / "optional:" prefix → not an
 * ingredient? → split at top-level commas → the amount phrase (at the start; else after a colon, in a
 * bracket, after the first comma, at the end, or "juice of 1 lemon") → the name region → each remark
 * after a comma → assembly (note in source order, flags, alternatives) → status and reasons.
 *
 * Every part that was read is kept when a person must still decide something (useful partial
 * reading); the raw line is never used as the name. A final check runs the contract validator: an
 * output that would not validate (a defect) is replaced by a minimal `needs_review` reading with
 * `unclassified`, so callers always receive valid data.
 */
import { REASONS, type AmountUnstated, type IngredientEngine, type ParsedIngredientV1, type ReasonCode, type SpanField, type UnitV1 } from "../../contract";
import { fromExactQuantity, toExactQuantity } from "../../rational";
import { validateParsedIngredientV1 } from "../../validate";
import { groupAmount, readAmountPhrase, readStatedAmount, placeSecondary, sumInSmallest, type AmountSlots } from "./amount";
import { nonIngredientReason, numericLead } from "./classify";
import { adjacent, isGroup, isNumberish, isSym, isWord, lex, type Tok } from "./lexer";
import { BULLETS, CARDINALS, FRACTION_WORDS, FUNCTION_WORDS, MEASURE_ADJECTIVES, PREP_ADVERBS, REMARK_WORDS, SIZE_WORDS, TRAILING_PREP_WORDS } from "./lexicon";
import { readNameRegion, type NameReading } from "./name";
import { normalizeLine } from "./normalize";
import { classifyPiece, splitTopLevel, textOf, trimEdges, unstatedAt } from "./remarks";
import { distributeOptions, foodHead, isRemarkOption, uniqueOptions } from "./alternatives";
import { emptyEffects, mergeEffects, type AmountReading, type Effects } from "./types";
import { readUnit } from "./unit";

export const SEMANTIC_ENGINE_ID = "semantic-v1";

// --- Helpers ----------------------------------------------------------------------------------------

const push = (reasons: ReasonCode[], code: ReasonCode) => {
  if (!reasons.includes(code)) reasons.push(code);
};

/** "a"/"an" counts as an amount only before a unit, a size word, "dozen" or a fraction word ("a pinch", "a large", "a dozen"). */
function strongAmountStart(text: string, toks: readonly Tok[], i: number): boolean {
  const t = toks[i];
  if (isNumberish(t)) return true;
  if (!isWord(t)) return false;
  if (Object.prototype.hasOwnProperty.call(CARDINALS, t.lower) || t.lower === "half") return true;
  if (t.lower === "a" || t.lower === "an") {
    let k = i + 1;
    while (isWord(toks[k]) && (SIZE_WORDS.has((toks[k] as { lower: string }).lower) || MEASURE_ADJECTIVES.has((toks[k] as { lower: string }).lower))) k++;
    const w = toks[k];
    if (isNumberish(w) || readUnit(text, toks, k) !== null) return true;
    return isWord(w) && (w.lower === "dozen" || Object.prototype.hasOwnProperty.call(FRACTION_WORDS, w.lower));
  }
  return false;
}

/** A plain amount reading for a line with no amount at all. */
const noAmount = (): AmountReading => ({
  quantity: null, quantitySpan: null, amountWritten: false, unit: null, unitSpan: null, packageSize: null, packageSpan: null, equivalents: [],
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
function describingOnly(region: readonly Tok[], afterAmount: boolean): boolean {
  const ws = region.filter((t) => t.kind === "word") as { lower: string }[];
  if (ws.length === 0 || ws.length !== region.length) return false;
  if (!afterAmount && ws.length < 1) return false;
  return ws.every((w) => DESCRIBING(w.lower) && !["more", "less", "so", "taste", "needed", "desired", "optional"].includes(w.lower));
}

/** A segment that names a food: some word is not describing, preparation or a remark phrase. */
function namesAFood(seg: readonly Tok[]): boolean {
  if (seg.length === 0 || !isWord(seg[0]) || isWord(seg[0], "or", "plus", "and") || unstatedAt(seg, 0) !== null) return false;
  if (seg.some((t) => isGroup(t) || isNumberish(t))) return false;
  const ws = seg.filter((t) => t.kind === "word") as { lower: string }[];
  return ws.some((w) => !DESCRIBING(w.lower) && !TRAILING_PREP_WORDS.has(w.lower) && !PREP_ADVERBS.has(w.lower) && !FUNCTION_WORDS.has(w.lower));
}

// --- The engine -------------------------------------------------------------------------------------

interface Reading {
  out: ParsedIngredientV1;
}

function read(input: unknown): Reading {
  const { raw, normalized, truncated } = normalizeLine(input);
  const reasons: ReasonCode[] = [];
  if (truncated) reasons.push("input_truncated");
  if (normalized === "") return { out: unsupported(raw, normalized, [...reasons, "empty_line"]) };
  const text = normalized;
  // "1) 2 cups flour", "a) 2 eggs", "1. 2 cups flour": a numbered marker before an amount is blanked
  // before lexing (offsets stay those of the normalized text).
  const marker = NUMBERED_MARKER.exec(text);
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

  const fx = emptyEffects();
  // "Optional:" / "(optional)" prefix.
  if (isWord(toks[0], "optional") && isSym(toks[1], ":", "-", "–")) {
    fx.optional = true;
    toks = toks.slice(2);
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
      } else if (isSym(head[sep], ":") || strongAmountStart(text, post, 0)) {
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
  let unclassified = false;
  amount = readAmountPhrase(text, head, 0);
  if (amount) {
    region = head.slice(amount.next);
    if (labelBefore && region.filter((t) => t.kind === "word").length === 0) {
      // "Sugar: 1/2 cup" — the label is the name
      region = [...labelBefore, ...region];
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
    if (!amount && tails.length > 0 && strongAmountStart(text, tails[0], 0)) {
      const a = readAmountPhrase(text, tails[0], 0);
      if (a) {
        amount = a;
        usedTail = 0;
        const rest = tails[0].slice(a.next);
        if (rest.length > 0) {
          const restFx = emptyEffects();
          const nr = readNameRegion(rest, { text, slots: null, unitWritten: true, hasQuantity: false, dropLeadingOf: true }, restFx);
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
      const of = head.findIndex((t, k) => k > 0 && k <= 3 && isWord(t, "of") && readAmountPhrase(text, head, k + 1) !== null);
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
    if (!amount && isWord(head[0]) && isWord(head[1], "of")) {
      // "Pinch of salt": a unit with no number — the unit is read, no amount is invented.
      const u = readUnit(text, head, 0);
      if (u && u.next === 1) {
        amount = { ...noAmount(), unit: u.unit, unitSpan: [u.s, u.e], next: 0 };
        region = head.slice(1);
      }
    }
  }
  // "1 pound boneless, skinless chicken breasts": a comma between describing words before the food
  // joins them; the food follows in the next segment.
  if (usedTail < 0) {
    while (tails.length > 0 && describingOnly(region, amount !== null) && namesAFood(tails[0])) {
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
  }, fx);
  let unit: UnitV1 | null = amt.unit;
  let unitSpan = amt.unitSpan;
  if (nr.trailingUnit && unit && unit.canonical === "each" && unitSpan === null) {
    unit = nr.trailingUnit.unit;
    unitSpan = [nr.trailingUnit.s, nr.trailingUnit.e];
  }
  if (labelBefore) {
    const m = unstatedAt(labelBefore, 0);
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
  // "cheddar, Monterey Jack, or pepper jack": short food segments that end in an "or" option are options too.
  const listOptions: { s: number; text: string }[] = [];
  {
    let m = usedTail + 1;
    const run: Tok[][] = [];
    while (m < tails.length && !isWord(tails[m][0], "or") && namesAFood(tails[m]) && tails[m].length <= 4 && tails[m].every((t) => t.kind === "word")) run.push(tails[m++]);
    if (run.length > 0 && m < tails.length && isWord(tails[m][0], "or") && nr.name !== null) {
      for (const seg of run) listOptions.push({ s: seg[0].s, text: textOf(text, seg) });
      tails = [...tails.slice(0, usedTail + 1), ...tails.slice(m)];
    }
  }
  tails.forEach((seg, idx) => {
    if (idx === usedTail || seg.length === 0) return;
    if (isWord(seg[0], "plus") || isSym(seg[0], "+")) {
      flushRun();
      addPlus(seg);
      return;
    }
    // A full stated amount after the name ("1 cup flour, 120 g") restates the amount.
    const sa = amount ? readStatedAmount(text, seg, 0) : null;
    if (sa && sa.next === seg.length) {
      flushRun();
      placeSecondary(text, slots, { sa, position: "after" });
      return;
    }
    const pfx = emptyEffects();
    classifyPiece(text, seg, pfx);
    if (amount && sa) pfx.unassigned++; // "1 cup flour, 2 tbsp sugar": a second amount with a unit
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

  // Alternatives (CONTRACT §7.8): every option, in order; the name is then null.
  let name = nr.name;
  const additional = fx.options.filter((o) => o.mode === "additional");
  const variants = fx.options.filter((o) => o.mode === "variants").map((o) => o.text).filter((x) => x.length > 0);
  let base: string[] = nr.options ? [...nr.options] : name ? [name] : [];
  if (variants.length >= 2 && base.length === 1) {
    const single = variants.every((v) => !v.includes(" "));
    if (single) base = variants.map((v) => `${v} ${base[0]}`); // "1 onion, red or white"
    else if (!base[0].includes(" ")) base = distributeOptions([base[0], ...variants]); // "chicken, beef or vegetable stock"
    else base = variants;
  } else if (variants.length >= 2 && base.length === 0) base = variants;
  const extra = [...listOptions.map((o) => o.text), ...additional.map((o) => (isRemarkOption(o.text) && name ? `${o.text} ${foodHead(name)}` : o.text))];
  // an option with its own amount ("(or 1 tsp dried)", "(or 2 cups)") is a second amount nobody can place
  if (additional.some((o) => o.hasAmount)) fx.unassigned++;
  let alternatives = uniqueOptions([...base, ...extra]);
  if (alternatives.length >= 2 && (variants.length >= 2 || extra.length > 0 || (nr.options !== null && nr.options.length >= 2))) name = null;
  else {
    alternatives = [];
    for (const o of additional) if (o.text) fx.notes.push({ s: o.s, text: `or ${o.text}` });
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
  if (quantity === null && amountUnstated === null && !all.some((r) => r === "quantity_not_positive" || r === "quantity_invalid" || r === "quantity_implausible" || r === "number_format_ambiguous" || r === "quantity_missing")) {
    push(all, "quantity_missing");
  }
  if (name === null && alternatives.length === 0) push(all, "name_missing");
  if (quantity === null && amountUnstated !== null) push(all, "amount_unstated");
  if (fx.optional) push(all, "optional_ingredient");
  if (amt.approximate) push(all, "approximate_quantity");
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
      packageSize: slots.packageSize, equivalents: slots.equivalents, form: fx.form, note, alternatives, optional: fx.optional, approximate: amt.approximate,
      amountUnstated, reasons: all, evidence: { spans },
    },
  };
}

/** The reading before the final validity check (exposed for tests: it must always validate on its own). */
export function parseSemanticUnchecked(line: unknown): ParsedIngredientV1 {
  return read(line).out;
}

/** Reads one line; always returns a contract-valid reading. */
export function parseSemantic(line: unknown): ParsedIngredientV1 {
  let out: ParsedIngredientV1;
  try {
    out = read(line).out;
  } catch {
    out = fallback(line);
    return out;
  }
  if (validateParsedIngredientV1(out).length === 0) return out;
  return fallback(line);
}

/** A minimal, valid reading used only if the engine produced an invalid one (a defect). */
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
