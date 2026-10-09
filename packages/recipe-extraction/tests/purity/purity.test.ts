/**
 * Purity: package src imports only relative modules and references no network, process, clock,
 * randomness, logging or dynamic code (checked on code, not comments); bin imports only an allow-list;
 * and running the CLI in-process makes zero network or DNS calls.
 */
import dns from "node:dns";
import { readdirSync, readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import path from "node:path";
import tls from "node:tls";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { main, type Io } from "../../bin/recipe-lab";
import { codeWithoutComments, scanBin, scanSource } from "./scan";

const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REPO = path.resolve(PKG, "../..");

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...tsFiles(p));
    else if (e.name.endsWith(".ts")) out.push(p);
  }
  return out.sort();
}

describe("static purity of src/", () => {
  const files = tsFiles(path.join(PKG, "src"));

  it("scans every source file", () => {
    const rel = files.map((f) => path.relative(PKG, f));
    expect(rel).toEqual(expect.arrayContaining([
      "src/contract.ts", "src/rational.ts", "src/index.ts", "src/units.ts", "src/validate.ts", "src/ingredient/legacy.ts", "src/ingredient/engines.ts",
      "src/page/extract.ts", "src/legacy/link.ts", "src/legacy/jsonld.ts", "src/legacy/ingredient-line.ts", "src/legacy/units.ts", "src/legacy/decimal.ts",
    ]));
  });

  it.each(files.map((f) => [path.relative(PKG, f), f]))("%s is pure", (_rel, file) => {
    expect(scanSource(readFileSync(file, "utf8"), file)).toEqual([]);
  });
});

describe("the scanner fails when it should", () => {
  it.each([
    ['import fs from "node:fs";', /non-relative import "node:fs"/],
    ['import x from "lodash";', /non-relative import "lodash"/],
    ['import { parseIngredientLine } from "@/server/integrations/recipe-import/ingredient-line";', /non-relative import "@\//],
    ['export * from "fs";', /non-relative import "fs"/],
    ['import type { X } from "node:net";', /non-relative import "node:net"/],
    ["const t = Date.now();", /forbidden: Date/],
    ["const d = new Date();", /forbidden: Date/],
    ["const r = Math.random();", /Math\.random/],
    ['fetch("https://example.com/");', /fetch\(/],
    ['globalThis.fetch("https://example.com/");', /globalThis/],
    ['const re = /https?:\\/\\//; fetch("x");', /fetch\(/], // a regex with "//" must not hide the code after it
    ['const s = "//"; console.log(s);', /console\./],
    ["const k = process.env.KEY;", /process/],
    ["const { env } = process;", /process/],
    ['const fs = require("fs");', /require\(/],
    ['const m = await import("./x");', /dynamic import|import\(/],
    ['eval("1");', /eval\(/],
    ['const f = new Function("return 1");', /Function\(/],
    ['const w = new WebSocket("wss://example.com/");', /WebSocket/],
    ["const x = new XMLHttpRequest();", /XMLHttpRequest/],
    ["const u = import.meta.url;", /import\.meta/],
    ['const n = "node:net";', /node: specifier string|node: module specifier/],
    ["const f = fetch;", /forbidden identifier: fetch/],
  ])("flags %s", (code, expected) => {
    expect(scanSource(code).join("\n")).toMatch(expected);
  });

  it("conservatively flags the words in code even as property names", () => {
    expect(scanSource("export const o = { Date: 1, process: 2 };").join("\n")).toMatch(/forbidden: process[\s\S]*forbidden: Date/);
  });

  it("ignores the forbidden words inside comments, and a parameter named node", () => {
    const clean = [
      "// fetch(x) process Date console.log require(\"fs\") import(\"x\") eval( Function( Math.random globalThis",
      "/* XMLHttpRequest WebSocket \"node:fs\" import.meta */",
      "/** Date.now() — never; process.env — never. */",
      "export const a = 1; // trailing fetch( comment",
      "const re = /\\/\\/ not a comment/;",
      "function isRecipe(node: { fetch?: number }): boolean { return node.fetch === 1; }",
      'export const label = "processed, dated and updated";',
    ].join("\n");
    expect(codeWithoutComments(clean)).not.toMatch(/XMLHttpRequest|Math\.random/);
    expect(scanSource(clean)).toEqual([]);
  });
});

describe("bin import allow-list", () => {
  it("bin/recipe-lab.ts imports only node:fs, node:path, node:url, node:process and relative modules", () => {
    for (const f of tsFiles(path.join(PKG, "bin"))) expect(scanBin(readFileSync(f, "utf8"), f)).toEqual([]);
  });

  it.each([
    ['import http from "node:http";', /not allowed in bin/],
    ['import { request } from "undici";', /not allowed in bin/],
    ['import net from "net";', /not allowed in bin/],
    ['const m = await import("node:net");', /dynamic import "node:net"/],
    ['const n = require("net");', /require\(/],
    ['await fetch("https://example.com/");', /network API/],
  ])("flags %s", (code, expected) => {
    expect(scanBin(code).join("\n")).toMatch(expected);
  });
});

// --- Runtime: no network --------------------------------------------------------------------------

type Patch = { target: Record<string, unknown>; key: string; original: unknown };

describe("runtime: the CLI makes no network or DNS call", () => {
  const calls: string[] = [];
  const patches: Patch[] = [];
  const patch = (target: object, key: string, label: string) => {
    const t = target as Record<string, unknown>;
    patches.push({ target: t, key, original: t[key] });
    t[key] = function recorder() {
      calls.push(label);
      throw new Error(`network call blocked in test: ${label}`);
    };
  };
  const restore = () => {
    while (patches.length) {
      const p = patches.pop()!;
      p.target[p.key] = p.original;
    }
  };
  afterEach(restore);

  const blockNetwork = () => {
    patch(globalThis, "fetch", "fetch");
    patch(net.Socket.prototype, "connect", "net.Socket.prototype.connect");
    patch(net, "connect", "net.connect");
    patch(net, "createConnection", "net.createConnection");
    patch(tls, "connect", "tls.connect");
    patch(dns, "lookup", "dns.lookup");
    patch(dns, "resolve", "dns.resolve");
    patch(dns.promises, "lookup", "dns.promises.lookup");
    patch(http, "request", "http.request");
    patch(http, "get", "http.get");
    patch(https, "request", "https.request");
    patch(https, "get", "https.get");
  };

  it("the recorders really intercept (so a zero count means something)", () => {
    blockNetwork();
    expect(() => (globalThis.fetch as unknown as () => void)()).toThrow(/blocked/);
    expect(() => net.connect(443, "example.com")).toThrow(/blocked/);
    expect(() => dns.lookup("example.com", () => undefined)).toThrow(/blocked/);
    expect(() => https.request("https://example.com/")).toThrow(/blocked/);
    expect(calls.length).toBe(4);
    restore();
    calls.length = 0;
  });

  it("line, page, engines and validate run with every network entry point blocked", async () => {
    const out: string[] = [];
    const err: string[] = [];
    const io: Io = { out: (t) => void out.push(t), err: (t) => void err.push(t) };
    const fixture = path.join(REPO, "tests/fixtures/recipe-pages/wordpress-graph.html");
    blockNetwork();
    try {
      expect(await main(["line", "1/3", "cup", "pesto", "(homemade (or store-bought))"], io)).toBe(0);
      expect(await main(["line", "--engine", "legacy-table-import-2+suggestion", "⅓ cup sugar"], io)).toBe(0);
      expect(await main(["page", fixture, "--final-url", "https://www.example.com/recipes/page/", "--requested-url", "https://example.com/r?utm_source=x"], io)).toBe(0);
      expect(await main(["engines"], io)).toBe(0);
      expect(await main(["page", "https://www.example.com/recipe", "--final-url", "https://www.example.com/"], io)).toBe(2);
    } finally {
      restore();
    }
    expect(calls).toEqual([]);
    expect(err.join("")).toBe("recipe-lab reads local files only\n");
    const page = JSON.parse(out[2]);
    expect(page.candidates.length).toBeGreaterThan(0);
    expect(JSON.parse(out[0]).reasons).toEqual(["legacy_contains_or", "legacy_fraction_not_exact_decimal"]);
    expect(JSON.parse(out[3]).map((e: { id: string }) => e.id)).toEqual(["legacy-table-import-2", "legacy-table-import-2+suggestion", "semantic-v1"]);
  });
});
