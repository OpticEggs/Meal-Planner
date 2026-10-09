/**
 * The page parity corpus: every `.html` fixture under Table's tests/fixtures/recipe-pages and
 * tests/fixtures/import-site, plus seeded mutations of each (truncation, duplicated script blocks,
 * injected entities, extra JSON-LD nesting, removed closing tags, stray characters, concatenation),
 * and the base URLs every page is read with. Deterministic.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chance, int, mulberry32, pick, type Rng } from "./corpus";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
export const FIXTURE_DIRS = ["tests/fixtures/recipe-pages", "tests/fixtures/import-site"];

export interface Page {
  name: string;
  html: string;
}

export function fixturePages(): Page[] {
  const out: Page[] = [];
  for (const dir of FIXTURE_DIRS) {
    for (const f of readdirSync(path.join(REPO_ROOT, dir)).filter((n) => n.endsWith(".html")).sort()) {
      out.push({ name: `${dir}/${f}`, html: readFileSync(path.join(REPO_ROOT, dir, f), "utf8") });
    }
  }
  return out;
}

export const BASE_URLS: readonly (string | undefined)[] = [
  undefined,
  "https://www.example.com/recipes/page/",
  "http://Example.ORG./a/b?utm_source=x&k=1#frag",
  "https://sub.example.net",
  "not a url",
  "https://user:pw@example.com/x/",
];

const LD_BLOCK = /<script[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi;
const ENTITIES = ["&amp;", "&lt;script&gt;", "&#x3C;img src=x&#x3E;", "&nbsp;", "&#0;", "&#xD800;", "&#x110000;", "&frac13;", "&bogus;", "&#9999999;", "&#x202E;", "&quot;"];
const STRAY = ['"', "'", "<", ">", "\u0000", "‮", "<!--", "-->", "</script>", "<script>", "{", "}", "[", "]", "\\"];

function insert(rng: Rng, s: string, tok: string): string {
  const at = int(rng, 0, s.length);
  return s.slice(0, at) + tok + s.slice(at);
}

function removeOne(rng: Rng, s: string, needle: string): string {
  const hits: number[] = [];
  for (let i = s.indexOf(needle); i >= 0 && hits.length < 1000; i = s.indexOf(needle, i + 1)) hits.push(i);
  if (!hits.length) return s;
  const at = pick(rng, hits);
  return s.slice(0, at) + s.slice(at + needle.length);
}

/** Wraps the body of every JSON-LD block `depth` times (in @graph objects or arrays). */
function nest(html: string, depth: number, kind: "graph" | "array"): string {
  return html.replace(/(<script[^>]*application\/ld\+json[^>]*>)([\s\S]*?)(<\/script>)/gi, (_m, open: string, body: string, close: string) => {
    const pre = kind === "graph" ? '{"@graph":['.repeat(depth) : "[".repeat(depth);
    const post = kind === "graph" ? "]}".repeat(depth) : "]".repeat(depth);
    return `${open}${pre}${body}${post}${close}`;
  });
}

export function mutatedPages(seed: number, pages: Page[] = fixturePages()): Page[] {
  const rng = mulberry32(seed);
  const out: Page[] = [];
  pages.forEach((p, i) => {
    const h = p.html;
    for (let k = 0; k < 3; k++) {
      const at = int(rng, 0, h.length);
      out.push({ name: `${p.name}#truncate@${at}`, html: h.slice(0, at) });
    }
    const blocks = h.match(LD_BLOCK) ?? [];
    for (const n of [2, 21, 25]) {
      const block = blocks.length ? pick(rng, blocks) : '<script type="application/ld+json">{"@type":"Recipe","name":"x","recipeIngredient":["1 cup a"]}</script>';
      out.push({ name: `${p.name}#dup${n}`, html: h.replace("</head>", `${block.repeat(n)}</head>`) + (h.includes("</head>") ? "" : block.repeat(n)) });
    }
    for (let k = 0; k < 3; k++) {
      let x = h;
      const times = int(rng, 1, 6);
      for (let j = 0; j < times; j++) x = insert(rng, x, pick(rng, ENTITIES));
      out.push({ name: `${p.name}#entities${k}`, html: x });
    }
    for (const depth of [1, 3, 70]) {
      out.push({ name: `${p.name}#graph${depth}`, html: nest(h, depth, "graph") });
      out.push({ name: `${p.name}#array${depth}`, html: nest(h, depth, "array") });
    }
    out.push({ name: `${p.name}#noclose-script`, html: removeOne(rng, h, "</script>") });
    out.push({ name: `${p.name}#noclose-tag`, html: removeOne(rng, h, ">") });
    out.push({ name: `${p.name}#noclose-any`, html: removeOne(rng, h, "</") });
    for (let k = 0; k < 3; k++) {
      let x = h;
      const times = int(rng, 1, 4);
      for (let j = 0; j < times; j++) x = insert(rng, x, pick(rng, STRAY));
      out.push({ name: `${p.name}#stray${k}`, html: x });
    }
    const other = pages[(i + 1 + int(rng, 0, pages.length - 2)) % pages.length];
    out.push({ name: `${p.name}+${other.name}`, html: chance(rng, 0.5) ? h + other.html : other.html + h });
  });
  return out;
}

export const PAGE_SEED = 0x9a6e5;

/** Hostile and ordinary links for the link validators. */
export function hostileUrls(): unknown[] {
  const fixed: unknown[] = [
    "", " ", "\t", "javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,x", "file:///etc/passwd", "ftp://example.com/x", "mailto:a@example.com",
    "http://127.0.0.1/", "http://[::1]/", "http://localhost/", "http://localhost.", "https://user:pass@example.com/", "https://user@example.com/",
    "https://example.com:8443/x", "https://example.com:443/x", "http://example.com:80/x", "https://EXAMPLE.com./a/../b?utm_source=x#y",
    "https://xn--bcher-kva.example/", "https://bücher.de/", "https://a..b.com/", "https://-a.com/", "https://a-.com/", "https://example.local/",
    "https://example.test/", "https://example.invalid/", "https://foo.onion/", "https://router.home/", "https://x.example/", "https://example/",
    "https://com/", "https://example.c/", "https://example.123/", "https://example.xn--p1ai/", `https://${"a".repeat(64)}.com/`, `https://${"a.".repeat(130)}com/`,
    "https://example.com/\u0000", "https://example.com/\t", "https://exa\nmple.com/", "http://0x7f.0.0.1/", "http://2130706433/", "http://1.2.3/",
    "https://example.com/%zz", "https://example.com/?a=%E0%A4%A&utm_x=1", "https://example.com/?%zz=1&b=2", "https://example.com/?utm_SOURCE=1&UTM_x=2&a",
    "https://example.com/?fbclid=1&gclid=2&ref=3&si=4&ck_subscriber_id=5&a=1", "https://example.com/?b=2&a=1&a=0", "https://example.com/?a+b=1&a%20b=2",
    "https://example.com/?=1&&&", "https://example.com/#only-hash", "https://example.com////", "https://example.com/a/b/", "//example.com/a", "example.com",
    "www.example.com/x", "https://www.budgetbytes.com/x", "https://sub.budgetbytes.com/", "https://budgetbytes.com.evil.com/", "https://example.com" + "/a".repeat(1100),
    "https://example.com/" + "x".repeat(2030), "https://example.com/" + "x".repeat(2100), "  https://Example.com/A?B=1  ", "https://[2001:db8::1]/", "https://1.1.1.1/",
    "https://example.com:0/", "https://example.com:65535/", "https://example.com:99999/", "http://example.com:8080/", "HTTPS://WWW.EXAMPLE.COM/",
    "https://example.com/ü?ä=ö#x", "https://example.com/‮", "https://example.com/ a b", "https://ex ample.com/", "https://example.com\\@evil.com/",
    "https://evil.com#@example.com/", "https://example.com%2F@evil.com/", "http://example.com:/", "https://.example.com/", "https://example.com../",
    null, undefined, 42, {}, [], ["https://example.com/"],
  ];
  const rng = mulberry32(0x0451);
  const schemes = ["https://", "http://", "HTTP://", "ftp://", "", "//", "https:/", "https:"];
  const hosts = ["example.com", "www.example.com", "EXAMPLE.org.", "sub.example.net", "localhost", "127.0.0.1", "[::1]", "a..b", "xn--bcher-kva.example", "user:pw@example.com", "example.com:8443", "budgetbytes.com", "x.local", "日本.jp"];
  const paths = ["", "/", "/a", "/a/", "/a/../b", "/%zz", "/ü", "/a b", "//", "/x?utm_source=1", "/x?b=2&a=1", "/x?a=%E0", "/x#f", "/x?fbclid=1#f"];
  const random: string[] = [];
  for (let i = 0; i < 2_000; i++) random.push(`${pick(rng, schemes)}${pick(rng, hosts)}${pick(rng, paths)}${chance(rng, 0.2) ? pick(rng, paths) : ""}`);
  return [...fixed, ...random];
}
