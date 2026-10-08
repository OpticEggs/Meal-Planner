import { validateLinkUrl } from "./url";

/**
 * Schema.org Recipe extraction from page text. No DOM, no script execution: a linear scanner finds
 * `<script type="application/ld+json">` blocks, each is bounded (count, size, nesting) before
 * JSON.parse, and only plain text and validated http(s) links leave this module. When no JSON-LD
 * Recipe exists, a bounded linear scan reads schema.org Recipe microdata (`itemprop` attributes)
 * instead. Open Graph meta tags supply the page title, site name and image as fallbacks.
 *
 * What is extracted (method steps, description, image links) is what the page states; whether a
 * caller stores or shows any of it is the caller's decision. Nutrition is reported as present or
 * absent only. Field text is data, never instructions to anyone.
 */

export interface RecipeInstruction {
  section: string | null;
  text: string;
}

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
  description: string | null;
  instructions: RecipeInstruction[];
  images: string[]; // absolute, validated http(s) links; at most JSONLD_LIMITS.maxImages
  siteName: string | null;
  category: string | null;
  cuisine: string | null;
  source: "json_ld" | "microdata";
}

export interface PageMeta {
  title: string | null;
  siteName: string | null;
  image: string | null;
}

export interface ExtractStats {
  jsonLdBlocks: number;
  recipeNodes: number;
  microdata: boolean;
}

export interface ExtractResult {
  candidates: RecipeCandidate[];
  problems: string[];
  meta: PageMeta;
  stats: ExtractStats;
}

export const JSONLD_LIMITS = {
  maxScriptTags: 5_000, maxBlocks: 20, maxBlockChars: 512 * 1024, maxDepth: 64, maxNodes: 10_000, maxCandidates: 20, maxString: 500, maxIngredients: 100,
  maxSteps: 60, maxStepChars: 1_000, maxInstructionDepth: 3, maxImages: 5, maxShortText: 80, maxSiteName: 200, maxMetaTags: 500,
  maxMicrodataChars: 512 * 1024, maxItemprops: 2_000, maxMicrodataTags: 200_000, maxMicrodataScan: 4 * 1024 * 1024,
};

export interface ExtractOptions {
  /** The page URL, to resolve a relative `url`, `image` or `og:image`. */
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
function ldJsonBlocks(html: string, problems: string[], lower = asciiLower(html)): string[] {
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

const SCHEMA_PREFIX = /^(?:schema:|https?:\/\/schema\.org\/)/;

/** Local schema.org type names of a node (`https://schema.org/WebSite` → `WebSite`). */
function typesOf(node: Obj): string[] {
  const t = node["@type"];
  const list = typeof t === "string" ? [t] : Array.isArray(t) ? t.slice(0, 10) : [];
  return list.filter((x): x is string => typeof x === "string" && x.length <= 200).map((x) => x.replace(SCHEMA_PREFIX, ""));
}
const hasType = (node: Obj, ...names: string[]) => typesOf(node).some((t) => names.includes(t));

/** Nodes of one JSON-LD block that carry a string `@id` and real data, for one-hop reference lookup. */
type Index = Map<string, Obj>;

function hasData(v: Obj): boolean {
  for (const k in v) if (!k.startsWith("@")) return true;
  return false;
}

/** `{"@id": x}` (only `@` keys) → the indexed node for x; anything else unchanged. One hop, never recursive. */
function resolveRef(v: unknown, index: Index): unknown {
  if (!isObj(v) || typeof v["@id"] !== "string" || hasData(v)) return v;
  return index.get(v["@id"]) ?? v;
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

/** Author names; an `{"@id"}` reference resolves to a Person (or Organization) node of the same block. */
function authorOf(v: unknown, index: Index): string | null {
  const names: string[] = [];
  for (const raw of (Array.isArray(v) ? v : [v]).slice(0, 10)) {
    const a = resolveRef(raw, index);
    if (a !== raw && isObj(a) && !hasType(a, "Person", "Organization")) continue;
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

/** An absolute, validated http(s) link from untrusted text, or null. */
function linkOf(u: unknown, baseUrl?: string): string | null {
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

const sourceUrlOf = (node: Obj, baseUrl?: string) => linkOf(node.url ?? node["@id"], baseUrl);

function widthOf(v: unknown): number | null {
  const x = isObj(v) ? v.value : v;
  const n = typeof x === "number" ? x : typeof x === "string" && /^\s*\d{1,6}\s*(?:px)?\s*$/i.test(x) ? parseInt(x, 10) : NaN;
  return Number.isFinite(n) && n > 0 && n <= 100_000 ? n : null;
}

/**
 * Image links: URL strings, ImageObjects (`url`, else `contentUrl`) or `{"@id"}` references to
 * either. Deduplicated; widest first when every width is known, otherwise document order.
 */
function imagesOf(v: unknown, index: Index, baseUrl?: string): string[] {
  const found: { url: string; width: number | null }[] = [];
  const seen = new Set<string>();
  for (const raw of (Array.isArray(v) ? v : [v]).slice(0, 20)) {
    const x = resolveRef(raw, index);
    let u: unknown = x;
    let width: number | null = null;
    if (isObj(x)) {
      u = typeof x.url === "string" ? x.url : x.contentUrl;
      width = widthOf(x.width);
    }
    const url = linkOf(u, baseUrl);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    found.push({ url, width });
  }
  if (found.every((f) => f.width !== null)) found.sort((a, b) => (b.width as number) - (a.width as number)); // stable
  return found.slice(0, JSONLD_LIMITS.maxImages).map((f) => f.url);
}

/** First entry of a string-or-array field (a comma list counts as entries). */
function firstText(v: unknown, max: number): string | null {
  for (const x of (Array.isArray(v) ? v : [v]).slice(0, 10)) {
    if (typeof x !== "string") continue;
    for (const part of x.slice(0, max * 20).split(",")) {
      const t = cleanText(part, max);
      if (t) return t;
    }
  }
  return null;
}

interface BlockContext {
  index: Index;
  sites: Obj[]; // WebSite nodes, document order
  orgs: Obj[]; // Organization nodes, document order
}

function siteNameOf(node: Obj, block: BlockContext): string | null {
  for (const raw of (Array.isArray(node.publisher) ? node.publisher : [node.publisher]).slice(0, 5)) {
    const p = resolveRef(raw, block.index);
    const t = isObj(p) ? cleanText(p.name, JSONLD_LIMITS.maxSiteName) : null;
    if (t) return t;
  }
  for (const n of [...block.sites, ...block.orgs]) {
    const t = cleanText(n.name, JSONLD_LIMITS.maxSiteName);
    if (t) return t;
  }
  return null;
}

interface Budget {
  nodes: number;
  problems: string[];
}
const NODES_PROBLEM = `more than ${JSONLD_LIMITS.maxNodes} JSON-LD nodes; the rest were ignored`;

/** Splits markup-ish text into lines at newlines, <br>, </li>, </p>, </div> and before each <li>. */
function splitLines(s: string): string[] {
  return s.replace(/<br\s*\/?>|<\/(?:li|p|div)>|<(?=li[\s>])/gi, (m) => (m === "<" ? "\n<" : "\n")).split(/\r?\n/);
}

/** An element's inner markup as list items when it holds `<li>`s (a container), else as one item. */
function listItems(s: string): string[] {
  // Split at a NUL marker, not "\n": a newline inside one <li> stays inside that item.
  return /<li[\s>]/i.test(s) ? s.replace(/\u0000/g, " ").replace(/<\/li>|<(?=li[\s>])/gi, (m) => (m === "<" ? "\u0000<" : "\u0000")).split("\u0000") : [s];
}

/**
 * Method steps: a string (split into lines), strings, HowToStep (text, else its itemListElement,
 * else name), HowToSection (name → section, itemListElement → steps), ItemList. Bounded by step
 * count, step length, nesting depth and the shared node budget.
 */
function instructionsOf(v: unknown, budget: Budget): RecipeInstruction[] {
  const L = JSONLD_LIMITS;
  const out: RecipeInstruction[] = [];
  let stop = false;
  const push = (s: string, section: string | null, split: boolean): number => {
    const before = out.length;
    const capped = s.slice(0, L.maxStepChars * L.maxSteps);
    for (const line of split ? splitLines(capped) : [capped]) {
      const text = cleanText(line, L.maxStepChars);
      if (!text) continue;
      if (out.length >= L.maxSteps) {
        budget.problems.push(`instruction steps beyond ${L.maxSteps} were ignored`);
        stop = true;
        break;
      }
      out.push({ section, text });
    }
    return out.length - before;
  };
  const visit = (x: unknown, section: string | null, depth: number): void => {
    if (stop || depth > L.maxInstructionDepth || x === undefined || x === null) return;
    if (++budget.nodes > L.maxNodes) {
      budget.problems.push(NODES_PROBLEM);
      stop = true;
      return;
    }
    if (typeof x === "string") return void push(x, section, true);
    if (Array.isArray(x)) {
      for (const y of x.slice(0, L.maxSteps * 4)) visit(y, section, Array.isArray(y) ? depth + 1 : depth);
      return;
    }
    if (!isObj(x)) return;
    const list = x.itemListElement;
    const name = typeof x.name === "string" ? x.name : null;
    const text = typeof x.text === "string" ? x.text : null;
    if (hasType(x, "HowToSection")) return visit(list, cleanText(name, L.maxSiteName) ?? section, depth + 1);
    if (hasType(x, "ItemList")) return visit(list, section, depth + 1);
    if (text !== null && push(text, section, false) > 0) return;
    if (list !== undefined) {
      // An untyped node with a name and a list reads as a section; a step's list holds its directions.
      const isStep = hasType(x, "HowToStep", "HowToDirection", "HowToTip");
      return visit(list, isStep ? section : (cleanText(name, L.maxSiteName) ?? section), depth + 1);
    }
    if (name !== null) push(name, section, false);
  };
  visit(v, null, 0);
  return out;
}

function candidateOf(node: Obj, budget: Budget, block: BlockContext, source: RecipeCandidate["source"], baseUrl?: string): RecipeCandidate {
  const y = yieldOf(node);
  const instructions = instructionsOf(node.recipeInstructions, budget);
  return {
    name: cleanText(node.name),
    ingredients: ingredientsOf(node, budget.problems),
    yield: y.text,
    servings: y.servings,
    prepMinutes: durationMinutes(node.prepTime),
    cookMinutes: durationMinutes(node.cookTime),
    totalMinutes: durationMinutes(node.totalTime),
    hasInstructions: instructions.length > 0 || present(node.recipeInstructions),
    hasNutrition: present(node.nutrition),
    sourceUrl: sourceUrlOf(node, baseUrl),
    author: authorOf(node.author, block.index),
    description: cleanText(node.description),
    instructions,
    images: imagesOf(node.image, block.index, baseUrl),
    siteName: siteNameOf(node, block),
    category: firstText(node.recipeCategory, JSONLD_LIMITS.maxShortText),
    cuisine: firstText(node.recipeCuisine, JSONLD_LIMITS.maxShortText),
    source,
  };
}

// --- Page meta (Open Graph) -----------------------------------------------------------------------

const isTagBoundary = (c: string | undefined) => c === undefined || c === ">" || c === "/" || /\s/.test(c);

/** Forward-only cursor: the next valid occurrence of `needle` at or after `pos` (positions never decrease). */
function cursor(lower: string, needle: string, valid?: (i: number) => boolean): (pos: number) => number {
  let at = -2;
  return (pos) => {
    if (at === -1 || at >= pos) return at;
    let from = pos;
    for (;;) {
      at = lower.indexOf(needle, from);
      if (at < 0 || !valid || valid(at)) return at;
      from = at + 1;
    }
  };
}

const META_KEYS = new Set(["og:title", "og:site_name", "og:image", "twitter:image"]);

function metaOf(html: string, lower: string, baseUrl?: string): PageMeta {
  const found = new Map<string, string>();
  const nextMeta = cursor(lower, "<meta", (i) => isTagBoundary(lower[i + 5]));
  const nextScript = cursor(lower, "<script", (i) => isTagBoundary(lower[i + 7]));
  const nextComment = cursor(lower, "<!--");
  let pos = 0;
  for (let seen = 0; seen < JSONLD_LIMITS.maxMetaTags && found.size < META_KEYS.size; ) {
    const m = nextMeta(pos);
    if (m < 0) break;
    const sc = nextScript(pos);
    const cm = nextComment(pos);
    // A <meta inside a comment or a script's text is not a tag.
    if (cm >= 0 && cm < m && (sc < 0 || cm < sc)) {
      const e = lower.indexOf("-->", cm + 4);
      if (e < 0) break;
      pos = e + 3;
      continue;
    }
    if (sc >= 0 && sc < m) {
      const e = lower.indexOf("</script", sc + 7);
      if (e < 0) break;
      pos = e + 8;
      continue;
    }
    seen++;
    const end = tagEnd(html, m + 5);
    if (end < 0) {
      const gt = html.indexOf(">", m + 5);
      if (gt < 0) break;
      pos = gt + 1;
      continue;
    }
    pos = end;
    const a = attributes(html.slice(m + 5, end - 1));
    if (typeof a.content !== "string") continue;
    for (const k of [a.property, a.name]) {
      const key = (k ?? "").trim().toLowerCase();
      if (META_KEYS.has(key) && !found.has(key)) found.set(key, a.content);
    }
  }
  const link = (v: string | undefined) => (v === undefined ? null : linkOf(decodeEntities(v).trim(), baseUrl));
  return {
    title: cleanText(found.get("og:title") ?? null),
    siteName: cleanText(found.get("og:site_name") ?? null, JSONLD_LIMITS.maxSiteName),
    image: link(found.get("og:image")) ?? link(found.get("twitter:image")),
  };
}

/** Open Graph / Twitter card title, site name and image of a page (the image resolved and validated). */
export function pageMeta(html: string, baseUrl?: string): PageMeta {
  if (typeof html !== "string") return { title: null, siteName: null, image: null };
  return metaOf(html, asciiLower(html), baseUrl);
}

// --- Microdata fallback ---------------------------------------------------------------------------

const VOID_ELEMENTS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

interface OpenTag {
  start: number;
  end: number; // exclusive, after '>'
  name: string;
  next: number; // where scanning continues (after a script/style element's text)
}

/** The next opening tag in [pos, text end); closing tags, comments and script/style text are skipped. */
function nextOpenTag(html: string, lower: string, pos: number): OpenTag | null {
  while (pos < lower.length) {
    const lt = lower.indexOf("<", pos);
    if (lt < 0) return null;
    if (lower.startsWith("<!--", lt)) {
      const e = lower.indexOf("-->", lt + 4);
      if (e < 0) return null;
      pos = e + 3;
      continue;
    }
    const c = lower.charCodeAt(lt + 1);
    if (!(c >= 97 && c <= 122)) {
      pos = lt + 1;
      continue;
    }
    let j = lt + 2;
    for (; j < lower.length && j < lt + 64; j++) {
      const d = lower.charCodeAt(j);
      if (!((d >= 97 && d <= 122) || (d >= 48 && d <= 57) || d === 45)) break;
    }
    const name = lower.slice(lt + 1, j);
    const end = tagEnd(html, j);
    if (end < 0) {
      const gt = html.indexOf(">", j);
      if (gt < 0) return null;
      pos = gt + 1;
      continue;
    }
    let next = end;
    if (name === "script" || name === "style") {
      const close = lower.indexOf(`</${name}`, end);
      next = close < 0 ? lower.length : close;
    }
    return { start: lt, end, name, next };
  }
  return null;
}

interface Scan {
  used: number;
  tags: number;
  exceeded: boolean;
}

/** Index of the `</name` that closes an element whose content starts at `from` (same-name nesting counted); -1 if none. */
function elementClose(lower: string, name: string, from: number, scan: Scan): number {
  const open = `<${name}`;
  const close = `</${name}`;
  let depth = 0;
  for (let q = from; ; ) {
    const lt = lower.indexOf("<", q);
    scan.used += (lt < 0 ? lower.length : lt) - q + 1;
    if (scan.used > JSONLD_LIMITS.maxMicrodataScan) {
      scan.exceeded = true;
      return -1;
    }
    if (lt < 0) return -1;
    if (lower.startsWith(close, lt) && isTagBoundary(lower[lt + close.length])) {
      if (depth === 0) return lt;
      depth--;
    } else if (lower.startsWith(open, lt) && isTagBoundary(lower[lt + open.length])) depth++;
    q = lt + 1;
  }
}

const tagAttributes = (html: string, t: OpenTag) => attributes(html.slice(t.start + 1 + t.name.length, t.end - 1));
const isRecipeItemtype = (v: string | undefined) =>
  typeof v === "string" && v.trim().split(/\s+/).slice(0, 10).some((tok) => /^https?:\/\/schema\.org\/recipe\/?$/i.test(tok));
const propsOf = (a: Record<string, string>) => (a.itemprop ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 8).map((p) => p.toLowerCase());

/** The `name` itemprop inside [from, to): its content attribute or element text (raw). */
function nestedName(html: string, lower: string, from: number, to: number, scan: Scan): string | null {
  const h = html.slice(0, to);
  const l = lower.slice(0, to);
  let pos = from;
  for (let i = 0; i < 200; i++) {
    const t = nextOpenTag(h, l, pos);
    if (!t || ++scan.tags > JSONLD_LIMITS.maxMicrodataTags) return null;
    pos = t.next;
    if (!l.slice(t.start, t.end).includes("itemprop")) continue;
    const a = tagAttributes(h, t);
    if (!propsOf(a).includes("name")) continue;
    if (a.content !== undefined) return a.content;
    if (VOID_ELEMENTS.has(t.name)) return null;
    const c = elementClose(l, t.name, t.end, scan);
    return c >= 0 ? h.slice(t.end, c) : null;
  }
  return null;
}

const LEAF_PROPS = new Set([
  "name", "recipeingredient", "ingredients", "recipeyield", "preptime", "cooktime", "totaltime", "recipeinstructions", "image", "author",
  "description", "recipecategory", "recipecuisine", "nutrition",
]);
const MAX_ELEMENT_TEXT = 64 * 1024;

/**
 * Schema.org Recipe microdata: the first element whose itemtype names Recipe, then its `itemprop`
 * elements in document order (nested itemscopes other than author are skipped). Linear scans with
 * indexOf only; bounded by text window, itemprop count, tag count and total scanned characters.
 */
function microdataRecipe(html: string, lower: string, problems: string[], baseUrl?: string): RecipeCandidate | null {
  const L = JSONLD_LIMITS;
  if (!lower.includes("schema.org/recipe")) return null;
  const scan: Scan = { used: 0, tags: 0, exceeded: false };
  let recipe: OpenTag | null = null;
  for (let pos = 0; ; ) {
    const t = nextOpenTag(html, lower, pos);
    if (!t) return null;
    if (++scan.tags > L.maxMicrodataTags) {
      problems.push(`more than ${L.maxMicrodataTags} tags scanned for microdata; stopped`);
      return null;
    }
    pos = t.next;
    if (lower.slice(t.start, t.end).includes("itemtype") && isRecipeItemtype(tagAttributes(html, t).itemtype)) {
      recipe = t;
      break;
    }
  }

  const limit = Math.min(html.length, recipe.start + L.maxMicrodataChars);
  const h = html.slice(0, limit);
  const l = lower.slice(0, limit);
  let end = limit;
  if (!VOID_ELEMENTS.has(recipe.name)) {
    const c = elementClose(l, recipe.name, recipe.end, scan);
    if (c >= 0) end = c;
    else if (limit < html.length) problems.push(`microdata recipe text beyond ${L.maxMicrodataChars} characters was ignored`);
  }
  const rh = h.slice(0, end);
  const rl = l.slice(0, end);

  const f = {
    name: null as string | null, description: null as string | null, author: null as string | null, category: null as string | null, cuisine: null as string | null,
    prep: null as string | null, cook: null as string | null, total: null as string | null, nutrition: null as string | null,
    ingredients: [] as string[], yields: [] as string[], steps: [] as string[], images: [] as string[],
  };
  const first = (cur: string | null, v: string | null, max = L.maxString) => (cur === null && v !== null && cleanText(v, max) !== null ? v : cur);
  let props = 0;
  for (let pos = recipe.end; ; ) {
    const t = nextOpenTag(rh, rl, pos);
    if (!t) break;
    if (++scan.tags > L.maxMicrodataTags) {
      problems.push(`more than ${L.maxMicrodataTags} tags scanned for microdata; stopped`);
      break;
    }
    pos = t.next;
    const tagLower = rl.slice(t.start, t.end);
    if (!tagLower.includes("itemprop") && !tagLower.includes("itemscope")) continue;
    const a = tagAttributes(rh, t);
    const scoped = "itemscope" in a;
    const isVoid = VOID_ELEMENTS.has(t.name);
    const names = propsOf(a);
    if (!names.length) {
      // A separate item nested in the recipe: its properties are not the recipe's.
      if (scoped && !isVoid) {
        const c = elementClose(rl, t.name, t.end, scan);
        if (c >= 0) pos = Math.max(pos, c);
      }
      if (scan.exceeded) break;
      continue;
    }
    if (++props > L.maxItemprops) {
      problems.push(`more than ${L.maxItemprops} microdata properties; the rest were ignored`);
      break;
    }
    const close = isVoid ? -1 : elementClose(rl, t.name, t.end, scan);
    if (scan.exceeded) break;
    const inner = close >= 0 ? rh.slice(t.end, Math.min(close, t.end + MAX_ELEMENT_TEXT)) : null;
    const value = a.content ?? inner;
    for (const p of names) {
      switch (p) {
        case "name":
          if (!scoped) f.name = first(f.name, value);
          break;
        case "recipeingredient":
        case "ingredients":
          if (value !== null) for (const item of listItems(value)) if (f.ingredients.length < L.maxIngredients * 2) f.ingredients.push(item);
          break;
        case "recipeyield":
          if (value !== null && f.yields.length < 10) f.yields.push(value);
          break;
        case "preptime":
        case "cooktime":
        case "totaltime": {
          const k = p === "preptime" ? "prep" : p === "cooktime" ? "cook" : "total";
          f[k] = first(f[k], a.content ?? a.datetime ?? (inner === null ? null : cleanText(inner, 40)), 40);
          break;
        }
        case "recipeinstructions":
          if (value !== null && f.steps.length < L.maxSteps * 4) f.steps.push(value);
          break;
        case "image": {
          const src = a.src ?? a.content ?? a.href;
          if (src !== undefined && f.images.length < 20) f.images.push(decodeEntities(src).trim());
          break;
        }
        case "author":
          f.author = first(f.author, scoped && close >= 0 ? (nestedName(rh, rl, t.end, close, scan) ?? inner) : value, 200);
          break;
        case "description":
          f.description = first(f.description, value);
          break;
        case "recipecategory":
          f.category = first(f.category, value, L.maxShortText);
          break;
        case "recipecuisine":
          f.cuisine = first(f.cuisine, value, L.maxShortText);
          break;
        case "nutrition":
          f.nutrition = first(f.nutrition, inner ?? a.content ?? null);
          break;
      }
    }
    // A property element's descendants belong to it (or to its own item): continue after it.
    if (close >= 0 && (scoped || names.some((n) => LEAF_PROPS.has(n)))) pos = Math.max(pos, close);
  }
  if (scan.exceeded) problems.push("microdata is too large or too deeply nested to read fully; the rest was ignored");

  const node: Obj = {
    "@type": "Recipe", name: f.name, description: f.description, author: f.author, recipeCategory: f.category, recipeCuisine: f.cuisine,
    prepTime: f.prep, cookTime: f.cook, totalTime: f.total, nutrition: f.nutrition, recipeIngredient: f.ingredients, recipeYield: f.yields,
    recipeInstructions: f.steps, image: f.images,
  };
  return candidateOf(node, { nodes: 0, problems }, { index: new Map(), sites: [], orgs: [] }, "microdata", baseUrl);
}

// --- Entry point ----------------------------------------------------------------------------------

export function extractRecipes(html: string, opts: ExtractOptions = {}): ExtractResult {
  const problems: string[] = [];
  const candidates: RecipeCandidate[] = [];
  const stats: ExtractStats = { jsonLdBlocks: 0, recipeNodes: 0, microdata: false };
  if (typeof html !== "string") return { candidates, problems: ["no page text"], meta: { title: null, siteName: null, image: null }, stats };
  const lower = asciiLower(html);
  const blocks = ldJsonBlocks(html, problems, lower);
  stats.jsonLdBlocks = blocks.length;
  const budget: Budget = { nodes: 0, problems };
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
    // Iterative walk: top level, arrays, @graph and mainEntity only. Recipes are read after the walk,
    // so an @id reference can point at a node later in the block.
    const block: BlockContext = { index: new Map(), sites: [], orgs: [] };
    const recipes: Obj[] = [];
    const stack: unknown[] = [data];
    while (stack.length) {
      const v = stack.pop();
      if (++budget.nodes > JSONLD_LIMITS.maxNodes) {
        problems.push(NODES_PROBLEM);
        break;
      }
      if (Array.isArray(v)) {
        for (let i = v.length - 1; i >= 0; i--) stack.push(v[i]);
        continue;
      }
      if (!isObj(v)) continue;
      const id = v["@id"];
      if (typeof id === "string" && id.length <= 2048 && !block.index.has(id) && hasData(v)) block.index.set(id, v);
      if (isRecipe(v)) {
        if (candidates.length + recipes.length >= JSONLD_LIMITS.maxCandidates) {
          problems.push(`more than ${JSONLD_LIMITS.maxCandidates} recipes; the rest were ignored`);
          break;
        }
        stats.recipeNodes++;
        recipes.push(v);
      } else if (hasType(v, "WebSite")) {
        if (block.sites.length < 10) block.sites.push(v);
      } else if (hasType(v, "Organization") && block.orgs.length < 10) block.orgs.push(v);
      if (v.mainEntity !== undefined) stack.push(v.mainEntity);
      if (v["@graph"] !== undefined) stack.push(v["@graph"]);
    }
    for (const r of recipes) candidates.push(candidateOf(r, budget, block, "json_ld", opts.baseUrl));
  });

  const meta = metaOf(html, lower, opts.baseUrl);
  if (candidates.length === 0) {
    const m = microdataRecipe(html, lower, problems, opts.baseUrl);
    if (m) {
      candidates.push(m);
      stats.microdata = true;
    }
  }
  for (const c of candidates) {
    if (c.images.length === 0 && meta.image) c.images = [meta.image];
    if (c.siteName === null) c.siteName = meta.siteName;
  }
  return { candidates, problems: [...new Set(problems)], meta, stats };
}
