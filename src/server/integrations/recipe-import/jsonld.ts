import { validateLinkUrl } from "./url";

/**
 * Schema.org Recipe extraction from page text. No DOM, no script execution: a linear scanner finds
 * `<script type="application/ld+json">` blocks, each is bounded (count, size, nesting) before
 * JSON.parse, and only plain text leaves this module. Instructions and nutrition are reported as
 * present/absent only: the authored method stays on the source site. Field text is data, never
 * instructions to anyone.
 */

export interface RecipeCandidate {
  name: string | null;
  ingredients: string[];
  yield: string | null;
  servings: number | null; // only when recipeYield states one unambiguous integer
  prepMinutes: number | null;
  cookMinutes: number | null;
  totalMinutes: number | null;
  hasInstructions: boolean;
  hasNutrition: boolean;
  sourceUrl: string | null;
  author: string | null;
}

export const JSONLD_LIMITS = { maxScriptTags: 5_000, maxBlocks: 20, maxBlockChars: 512 * 1024, maxDepth: 64, maxNodes: 10_000, maxCandidates: 20, maxString: 500, maxIngredients: 100 };

export interface ExtractOptions {
  /** The page URL, to resolve a relative `url` field. */
  baseUrl?: string;
}

// --- Block scanning -------------------------------------------------------------------------------

const MAX_TAG_CHARS = 2048;

/** Attributes of an opening tag body (text between the tag name and `>`); names lowercased. */
function attributes(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;
  const n = tag.length;
  while (i < n) {
    while (i < n && /[\s/]/.test(tag[i])) i++;
    const start = i;
    while (i < n && !/[\s=/>]/.test(tag[i])) i++;
    const name = tag.slice(start, i).toLowerCase();
    if (!name) {
      i++;
      continue;
    }
    while (i < n && /\s/.test(tag[i])) i++;
    let value = "";
    if (tag[i] === "=") {
      i++;
      while (i < n && /\s/.test(tag[i])) i++;
      const q = tag[i];
      if (q === '"' || q === "'") {
        const end = tag.indexOf(q, i + 1);
        value = tag.slice(i + 1, end < 0 ? n : end);
        i = end < 0 ? n : end + 1;
      } else {
        const vs = i;
        while (i < n && !/[\s>]/.test(tag[i])) i++;
        value = tag.slice(vs, i);
      }
    }
    if (!(name in out)) out[name] = value;
  }
  return out;
}

/** End index (exclusive) of an opening tag starting at `from`, honouring quoted values; -1 if none. */
function tagEnd(html: string, from: number): number {
  let q: string | null = null;
  const limit = Math.min(html.length, from + MAX_TAG_CHARS);
  for (let i = from; i < limit; i++) {
    const c = html[i];
    if (q) {
      if (c === q) q = null;
    } else if (c === '"' || c === "'") q = c;
    else if (c === ">") return i + 1;
  }
  return -1;
}

/** ASCII-only lowercasing keeps indexes aligned with the original (toLowerCase can change length). */
const asciiLower = (s: string) => s.replace(/[A-Z]+/g, (c) => c.toLowerCase());

/** Raw text of each JSON-LD script block, in document order. */
function ldJsonBlocks(html: string, problems: string[]): string[] {
  const lower = asciiLower(html);
  const blocks: string[] = [];
  let pos = 0;
  for (let tags = 0; ; tags++) {
    const open = lower.indexOf("<script", pos);
    if (open < 0) break;
    if (tags >= JSONLD_LIMITS.maxScriptTags) {
      problems.push(`more than ${JSONLD_LIMITS.maxScriptTags} script tags; the rest were ignored`);
      break;
    }
    const after = lower[open + 7];
    if (after !== undefined && !/[\s>/]/.test(after)) {
      pos = open + 7;
      continue;
    }
    const end = tagEnd(html, open + 7);
    if (end < 0) {
      // Unbalanced quotes or an over-long tag: resume after the next plain '>' (or stop).
      const gt = html.indexOf(">", open + 7);
      if (gt < 0) break;
      pos = gt + 1;
      continue;
    }
    const close = lower.indexOf("</script", end);
    const bodyEnd = close < 0 ? html.length : close;
    pos = close < 0 ? html.length : close + 8;
    const type = (attributes(html.slice(open + 7, end - 1)).type ?? "").split(";")[0].trim().toLowerCase();
    if (type !== "application/ld+json") continue;
    if (blocks.length >= JSONLD_LIMITS.maxBlocks) {
      problems.push(`more than ${JSONLD_LIMITS.maxBlocks} JSON-LD blocks; the rest were ignored`);
      break;
    }
    blocks.push(html.slice(end, bodyEnd));
  }
  return blocks;
}

/** Deepest array/object nesting, counted outside strings; stops early past `cap`. */
function nestingDepth(s: string, cap: number): number {
  let depth = 0;
  let max = 0;
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (inStr) {
      if (c === 92) i++; // backslash escapes the next char
      else if (c === 34) inStr = false;
    } else if (c === 34) inStr = true;
    else if (c === 123 || c === 91) {
      if (++depth > max) max = depth;
      if (max > cap) return max;
    } else if (c === 125 || c === 93) depth--;
  }
  return max;
}

function unwrapComment(s: string): string {
  let t = s.trim();
  if (t.startsWith("<!--")) t = t.slice(4);
  if (t.endsWith("-->")) t = t.slice(0, -3);
  t = t.trim();
  if (t.startsWith("<![CDATA[")) t = t.slice(9);
  if (t.endsWith("]]>")) t = t.slice(0, -3);
  return t.trim();
}

// --- Text cleaning --------------------------------------------------------------------------------

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ensp: " ", emsp: " ", thinsp: " ",
  frac12: "½", frac14: "¼", frac34: "¾", frac13: "⅓", frac23: "⅔", frac15: "⅕", frac16: "⅙", frac18: "⅛", frac38: "⅜", frac58: "⅝", frac78: "⅞",
  deg: "°", ndash: "–", mdash: "—", hellip: "…", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", laquo: "«", raquo: "»",
  times: "×", divide: "÷", frasl: "⁄", middot: "·", bull: "•", copy: "©", reg: "®", trade: "™", cent: "¢", pound: "£", euro: "€",
  eacute: "é", egrave: "è", ecirc: "ê", euml: "ë", aacute: "á", agrave: "à", acirc: "â", auml: "ä", aring: "å", iacute: "í", icirc: "î", iuml: "ï",
  oacute: "ó", ocirc: "ô", ouml: "ö", uacute: "ú", ucirc: "û", uuml: "ü", ntilde: "ñ", ccedil: "ç", szlig: "ß", oslash: "ø", aelig: "æ",
  Eacute: "É", Agrave: "À", Ntilde: "Ñ", Ccedil: "Ç", Uuml: "Ü", Ouml: "Ö", Auml: "Ä",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#[xX][0-9a-fA-F]{1,6}|#[0-9]{1,7}|[a-zA-Z][a-zA-Z0-9]{1,31});/g, (m, body: string) => {
    if (body[0] === "#") {
      const cp = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(cp) || cp <= 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return "�";
      return String.fromCodePoint(cp);
    }
    return NAMED[body] ?? m;
  });
}

/** Removes markup: script/style elements with their content, then every tag. Linear scan. */
export function stripTags(s: string): string {
  if (!s.includes("<")) return s;
  const lower = asciiLower(s);
  let out = "";
  let i = 0;
  while (i < s.length) {
    const lt = s.indexOf("<", i);
    if (lt < 0) {
      out += s.slice(i);
      break;
    }
    out += s.slice(i, lt);
    const next = s[lt + 1];
    if (next === undefined || !/[A-Za-z/!?]/.test(next)) {
      out += "<";
      i = lt + 1;
      continue;
    }
    const gt = s.indexOf(">", lt);
    if (gt < 0) break; // an unterminated tag: drop the rest
    const name = /^<([a-z]+)/.exec(lower.slice(lt, lt + 12))?.[1];
    if (name === "script" || name === "style") {
      const close = lower.indexOf(`</${name}`, gt);
      const closeEnd = close < 0 ? -1 : s.indexOf(">", close);
      i = closeEnd < 0 ? s.length : closeEnd + 1;
    } else i = gt + 1;
    out += " ";
  }
  return out;
}

// C0/C1 controls and bidirectional overrides become spaces (no reordering tricks in labels).
const CONTROLS = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g;

/** Plain text from an untrusted JSON-LD value: no markup, entities decoded, whitespace collapsed, capped. */
export function cleanText(v: unknown, max = JSONLD_LIMITS.maxString): string | null {
  if (typeof v === "number" && Number.isFinite(v)) v = String(v);
  if (typeof v !== "string") return null;
  // Strip before and after decoding, so encoded markup (&lt;img ...&gt;) cannot come back as a tag.
  let t = stripTags(decodeEntities(stripTags(v.length > max * 20 ? v.slice(0, max * 20) : v)));
  t = t.replace(CONTROLS, " ").replace(/\s+/g, " ").trim();
  if (t.length > max) {
    t = t.slice(0, max);
    const last = t.charCodeAt(t.length - 1);
    if (last >= 0xd800 && last <= 0xdbff) t = t.slice(0, -1);
    t = t.trimEnd();
  }
  return t.length ? t : null;
}

// --- Field readers --------------------------------------------------------------------------------

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const RECIPE_TYPES = new Set(["Recipe", "schema:Recipe", "http://schema.org/Recipe", "https://schema.org/Recipe"]);

function isRecipe(node: Obj): boolean {
  const t = node["@type"];
  if (typeof t === "string") return RECIPE_TYPES.has(t);
  return Array.isArray(t) && t.some((x) => typeof x === "string" && RECIPE_TYPES.has(x));
}

const MAX_MINUTES = 30 * 24 * 60;
const DURATION = /^P(?:(\d{1,4})D)?(?:T(?:(\d{1,5})H)?(?:(\d{1,6})M)?(?:(\d{1,7}(?:\.\d{1,3})?)S)?)?$/;

/** ISO-8601 duration (PnDTnHnMnS) to whole minutes; malformed, empty or absurd → null. */
export function durationMinutes(v: unknown): number | null {
  if (typeof v !== "string" || v.length > 40) return null;
  const s = v.trim().toUpperCase();
  const m = DURATION.exec(s);
  if (!m || s === "P" || s.endsWith("T")) return null;
  if (m[1] === undefined && m[2] === undefined && m[3] === undefined && m[4] === undefined) return null;
  const seconds = Number(m[1] ?? 0) * 86400 + Number(m[2] ?? 0) * 3600 + Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0);
  const minutes = Math.round(seconds / 60);
  return minutes <= MAX_MINUTES ? minutes : null;
}

function ingredientsOf(node: Obj, problems: string[]): string[] {
  const src = node.recipeIngredient ?? node.ingredients;
  const raw: string[] = [];
  const pushString = (s: string) => {
    // A single string may hold several lines (<br>, <li>, newlines).
    const capped = s.slice(0, JSONLD_LIMITS.maxString * JSONLD_LIMITS.maxIngredients);
    for (const line of capped.replace(/<br\s*\/?>|<\/(?:li|p|div)>/gi, "\n").split(/\r?\n/)) raw.push(line);
  };
  if (typeof src === "string") pushString(src);
  else if (Array.isArray(src)) {
    for (const x of src.slice(0, JSONLD_LIMITS.maxIngredients * 2)) {
      if (typeof x === "string" || typeof x === "number") raw.push(String(x));
      else if (isObj(x) && typeof x.name === "string") raw.push(x.name);
    }
  }
  const out: string[] = [];
  for (const r of raw) {
    const t = cleanText(r);
    if (!t) continue;
    if (out.length >= JSONLD_LIMITS.maxIngredients) {
      problems.push(`ingredients beyond ${JSONLD_LIMITS.maxIngredients} were ignored`);
      break;
    }
    out.push(t);
  }
  return out;
}

const SERVING = /^(?:(?:serves|servings|serving|yield|yields|makes)\s*:?\s*)?(\d{1,3})(?:\s*(?:servings?|people|persons?|portions?))?$/i;

function yieldOf(node: Obj): { text: string | null; servings: number | null } {
  const v = node.recipeYield ?? node.yield;
  const entries = (Array.isArray(v) ? v : [v]).slice(0, 10).map((x) => cleanText(x)).filter((x): x is string => x !== null);
  if (entries.length === 0) return { text: null, servings: null };
  const text = entries.find((e) => !/^\d+$/.test(e)) ?? entries[0];
  // Unambiguous: every entry with a digit is a plain serving count, and they all name the same integer.
  const counts = new Set<number>();
  let unclear = false;
  for (const e of entries) {
    if (!/\d/.test(e)) continue;
    const m = SERVING.exec(e);
    if (m) counts.add(Number(m[1]));
    else unclear = true;
  }
  const n = !unclear && counts.size === 1 ? [...counts][0] : null;
  return { text, servings: n !== null && n >= 1 && n <= 100 ? n : null };
}

function authorOf(v: unknown): string | null {
  const names: string[] = [];
  for (const a of (Array.isArray(v) ? v : [v]).slice(0, 10)) {
    const t = cleanText(isObj(a) ? a.name : a, 200);
    if (t) names.push(t);
  }
  return names.length ? cleanText(names.join(", ")) : null;
}

function present(v: unknown): boolean {
  if (typeof v === "string") return cleanText(v) !== null;
  if (Array.isArray(v)) return v.some(present);
  if (isObj(v)) return Object.keys(v).some((k) => !k.startsWith("@") && present(v[k]));
  return typeof v === "number";
}

function sourceUrlOf(node: Obj, baseUrl?: string): string | null {
  const u = node.url ?? node["@id"];
  if (typeof u !== "string" || u.length > 2048) return null;
  let abs: string;
  try {
    abs = new URL(u, baseUrl).href;
  } catch {
    return null;
  }
  const r = validateLinkUrl(abs);
  return r.ok ? r.url : null;
}

function candidateOf(node: Obj, problems: string[], baseUrl?: string): RecipeCandidate {
  const y = yieldOf(node);
  return {
    name: cleanText(node.name),
    ingredients: ingredientsOf(node, problems),
    yield: y.text,
    servings: y.servings,
    prepMinutes: durationMinutes(node.prepTime),
    cookMinutes: durationMinutes(node.cookTime),
    totalMinutes: durationMinutes(node.totalTime),
    hasInstructions: present(node.recipeInstructions),
    hasNutrition: present(node.nutrition),
    sourceUrl: sourceUrlOf(node, baseUrl),
    author: authorOf(node.author),
  };
}

// --- Entry point ----------------------------------------------------------------------------------

export function extractRecipes(html: string, opts: ExtractOptions = {}): { candidates: RecipeCandidate[]; problems: string[] } {
  const problems: string[] = [];
  const candidates: RecipeCandidate[] = [];
  if (typeof html !== "string") return { candidates, problems: ["no page text"] };
  const blocks = ldJsonBlocks(html, problems);
  let nodes = 0;
  blocks.forEach((rawBlock, bi) => {
    const label = `JSON-LD block ${bi + 1}`;
    if (rawBlock.length > JSONLD_LIMITS.maxBlockChars) return void problems.push(`${label} is larger than ${JSONLD_LIMITS.maxBlockChars} characters; skipped`);
    const text = unwrapComment(rawBlock);
    if (!text) return;
    if (nestingDepth(text, JSONLD_LIMITS.maxDepth) > JSONLD_LIMITS.maxDepth) return void problems.push(`${label} is nested deeper than ${JSONLD_LIMITS.maxDepth}; skipped`);
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return void problems.push(`${label} is not valid JSON; skipped`);
    }
    // Iterative walk: top level, arrays, @graph and mainEntity only.
    const stack: unknown[] = [data];
    while (stack.length) {
      const v = stack.pop();
      if (++nodes > JSONLD_LIMITS.maxNodes) {
        problems.push(`more than ${JSONLD_LIMITS.maxNodes} JSON-LD nodes; the rest were ignored`);
        return;
      }
      if (Array.isArray(v)) {
        for (let i = v.length - 1; i >= 0; i--) stack.push(v[i]);
        continue;
      }
      if (!isObj(v)) continue;
      if (isRecipe(v)) {
        if (candidates.length >= JSONLD_LIMITS.maxCandidates) {
          problems.push(`more than ${JSONLD_LIMITS.maxCandidates} recipes; the rest were ignored`);
          return;
        }
        candidates.push(candidateOf(v, problems, opts.baseUrl));
      }
      if (v.mainEntity !== undefined) stack.push(v.mainEntity);
      if (v["@graph"] !== undefined) stack.push(v["@graph"]);
    }
  });
  return { candidates, problems: [...new Set(problems)] };
}
