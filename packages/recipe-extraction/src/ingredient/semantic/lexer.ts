/**
 * semantic-v1 · step 2: tokens and bracket structure, in one linear pass over the normalized text.
 *
 * Brackets — ( ) [ ] { } — are parsed with an explicit stack (no recursion, no regex): every group
 * becomes one `group` token holding its own tokens, so "(homemade (or store-bought))" is a group that
 * contains a word and a nested group. A closer with no opener is dropped; an opener that is never
 * closed runs to the end of the line; a closer of the wrong kind still closes the innermost group. Each
 * of these sets `unbalanced` (→ `structure_unbalanced`) while keeping everything that could be read.
 *
 * Token kinds: `word` (letters and combining marks, joined by internal hyphens/apostrophes:
 * "half-and-half", "store-bought", "jalapeño"), `num` (a digit run with its decimal point and digit
 * commas: "12", "1.5", ".5", "1,5"), `vulgar` (½ ⅓ …), `sym` (any other single character) and `group`.
 * Offsets are UTF-16 indices into the normalized text: [s, e).
 */
import { VULGAR } from "./lexicon";

export interface WordTok {
  kind: "word";
  s: number;
  e: number;
  text: string;
  lower: string;
}
export interface NumTok {
  kind: "num";
  s: number;
  e: number;
  /** The numeral with superscript/subscript digits written as ASCII digits ("¹" → "1"). */
  text: string;
  /** int "12" · dec "1.5"/".5" · comma "1,5"/"1,000" (ambiguous) · malformed "1.2.3". */
  form: "int" | "dec" | "comma" | "malformed";
}
export interface VulgarTok {
  kind: "vulgar";
  s: number;
  e: number;
  text: string;
  n: number;
  d: number;
}
export interface SymTok {
  kind: "sym";
  s: number;
  e: number;
  text: string;
}
export interface GroupTok {
  kind: "group";
  s: number;
  e: number;
  open: string;
  closed: boolean;
  children: Tok[];
  /** Offsets of the text between the brackets. */
  innerS: number;
  innerE: number;
}
export type Tok = WordTok | NumTok | VulgarTok | SymTok | GroupTok;

const CLOSER: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
const CLOSERS = new Set([")", "]", "}"]);

const WORD = /[\p{L}\p{M}]+(?:['’‘\-‐‑][\p{L}\p{M}]+)*/uy;
const NUMBER = /(?:\d+|(?=\.\d))(?:[.,]\d+)*/y;
/** Superscript and subscript digits, as in "¹⁄₂" (index = digit value). */
const SUPERSCRIPTS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";
const SCRIPT_DIGITS = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+|[₀₁₂₃₄₅₆₇₈₉]+/y;

export interface Lexed {
  tokens: Tok[];
  unbalanced: boolean;
}

export function lex(text: string): Lexed {
  const root: Tok[] = [];
  const stack: { list: Tok[]; group: GroupTok | null }[] = [{ list: root, group: null }];
  let unbalanced = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const top = stack[stack.length - 1];
    if (c === " ") {
      i++;
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(CLOSER, c)) {
      const g: GroupTok = { kind: "group", s: i, e: text.length, open: c, closed: false, children: [], innerS: i + 1, innerE: text.length };
      top.list.push(g);
      stack.push({ list: g.children, group: g });
      i++;
      continue;
    }
    if (CLOSERS.has(c)) {
      if (top.group === null) {
        unbalanced = true; // a closer with nothing to close: dropped
      } else {
        if (CLOSER[top.group.open] !== c) unbalanced = true;
        top.group.closed = true;
        top.group.e = i + 1;
        top.group.innerE = i;
        stack.pop();
      }
      i++;
      continue;
    }
    WORD.lastIndex = i;
    let m = WORD.exec(text);
    if (m) {
      top.list.push({ kind: "word", s: i, e: i + m[0].length, text: m[0], lower: m[0].toLowerCase() });
      i += m[0].length;
      continue;
    }
    NUMBER.lastIndex = i;
    m = NUMBER.exec(text);
    if (m && m[0].length > 0) {
      const t = m[0];
      const dots = (t.match(/\./g) ?? []).length;
      const form = t.includes(",") ? "comma" : dots > 1 ? "malformed" : dots === 1 ? "dec" : "int";
      top.list.push({ kind: "num", s: i, e: i + t.length, text: t, form });
      i += t.length;
      continue;
    }
    SCRIPT_DIGITS.lastIndex = i;
    m = SCRIPT_DIGITS.exec(text);
    if (m) {
      const ascii = [...m[0]].map((ch) => String(Math.max(SUPERSCRIPTS.indexOf(ch), SUBSCRIPTS.indexOf(ch)))).join("");
      top.list.push({ kind: "num", s: i, e: i + m[0].length, text: ascii, form: "int" });
      i += m[0].length;
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(VULGAR, c)) {
      const [n, d] = VULGAR[c];
      top.list.push({ kind: "vulgar", s: i, e: i + 1, text: c, n, d });
      i++;
      continue;
    }
    const cp = text.codePointAt(i) ?? 0;
    const len = cp > 0xffff ? 2 : 1;
    top.list.push({ kind: "sym", s: i, e: i + len, text: text.slice(i, i + len) });
    i += len;
  }
  if (stack.length > 1) unbalanced = true; // unclosed groups run to the end of the line (e/innerE preset)
  return { tokens: root, unbalanced };
}

// --- Small token helpers ---------------------------------------------------------------------------

export const isWord = (t: Tok | undefined, ...lowers: string[]): t is WordTok =>
  t !== undefined && t.kind === "word" && (lowers.length === 0 || lowers.includes(t.lower));
export const isSym = (t: Tok | undefined, ...texts: string[]): t is SymTok =>
  t !== undefined && t.kind === "sym" && (texts.length === 0 || texts.includes(t.text));
export const isGroup = (t: Tok | undefined): t is GroupTok => t !== undefined && t.kind === "group";
export const isNumberish = (t: Tok | undefined): t is NumTok | VulgarTok => t !== undefined && (t.kind === "num" || t.kind === "vulgar");
/** True when `b` starts exactly where `a` ends (no space between). */
export const adjacent = (a: Tok | undefined, b: Tok | undefined) => a !== undefined && b !== undefined && a.e === b.s;

/** Lower-case word sequence match at `i` (every token must be a word). */
export function wordsAt(toks: readonly Tok[], i: number, seq: readonly string[]): boolean {
  for (let k = 0; k < seq.length; k++) {
    const t = toks[i + k];
    if (!isWord(t) || t.lower !== seq[k]) return false;
  }
  return true;
}

/** Every word (lower case) inside a token run, groups included, in order. */
export function allWords(toks: readonly Tok[]): string[] {
  const out: string[] = [];
  const walk = (list: readonly Tok[]) => {
    for (const t of list) {
      if (t.kind === "word") out.push(t.lower);
      else if (t.kind === "group") walk(t.children);
    }
  };
  walk(toks);
  return out;
}

/** True when the run (groups included) holds a digit or a vulgar fraction. */
export function hasNumber(toks: readonly Tok[]): boolean {
  const stack: (readonly Tok[])[] = [toks];
  while (stack.length) {
    for (const t of stack.pop()!) {
      if (t.kind === "num" || t.kind === "vulgar") return true;
      if (t.kind === "group") stack.push(t.children);
    }
  }
  return false;
}

