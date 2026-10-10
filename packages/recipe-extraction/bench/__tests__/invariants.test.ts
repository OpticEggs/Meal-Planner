import { appendFileSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkInvariants, findUrls, isReservedHost, isVocabularyIri } from "../invariants";
import { copyFixtures, FIXTURES } from "./helpers";

describe("host rules", () => {
  it("only reserved example names are allowed", () => {
    for (const h of ["example.com", "www.example.org", "a.b.example.net", "cookbook.example", "example", "WWW.EXAMPLE.COM"]) expect(isReservedHost(h), h).toBe(true);
    for (const h of ["notexample.com", "example.com.evil.test", "example.co", "localhost", "127.0.0.1", "recipes.test", "shop.invalid", "examples.com"]) expect(isReservedHost(h), h).toBe(false);
  });

  it("only bare schema.org vocabulary identifiers are exempt", () => {
    expect(isVocabularyIri("https://schema.org")).toBe(true);
    expect(isVocabularyIri("https://schema.org/Recipe")).toBe(true);
    expect(isVocabularyIri("http://schema.org/")).toBe(true);
    expect(isVocabularyIri("https://schema.org/docs/recipe.html")).toBe(false);
    expect(isVocabularyIri("https://schema.org.evil.test/Recipe")).toBe(false);
  });

  it("finds absolute, JSON-escaped and protocol-relative URLs", () => {
    const found = findUrls(`a "https://www.example.com/x" b https:\\/\\/news.example\\/y <img src="//cdn.invalid/z.png"> http://user@localhost:3000/p`);
    expect(found.map((f) => f.host)).toEqual(["www.example.com", "news.example", "localhost", "cdn.invalid"]);
  });
});

describe("fixture invariants", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });
  const copy = () => {
    const c = copyFixtures();
    cleanup = c.cleanup;
    return c.dir;
  };

  it("hold on the real fixtures", () => {
    const r = checkInvariants(FIXTURES);
    expect(r.problems).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("a copy passes too (the checks do not depend on the location)", () => {
    expect(checkInvariants(copy()).problems).toEqual([]);
  });

  const planted: [string, (dir: string) => void, RegExp][] = [
    ["a file missing from the manifest", (d) => writeFileSync(path.join(d, "pages/dev-unlisted.html"), "<p>synthetic</p>\n"), /pages\/dev-unlisted\.html: not listed in MANIFEST\.json/],
    ["a manifest entry whose file is gone", (d) => rmSync(path.join(d, "LABEL-CHANGES.md")), /lists LABEL-CHANGES\.md, which does not exist/],
    ["a manifest entry without the rights text", (d) => {
      const m = JSON.parse(readFileSync(path.join(d, "MANIFEST.json"), "utf8"));
      m.files[0].rights = "unknown";
      writeFileSync(path.join(d, "MANIFEST.json"), JSON.stringify(m));
    }, /rights must be/],
    ["a non-reserved host in a page", (d) => appendFileSync(path.join(d, "pages/dev-plain-jsonld.html"), '<a href="https://recipes.test/r">x</a>\n'), /host 'recipes\.test' is not a reserved example host/],
    ["localhost", (d) => appendFileSync(path.join(d, "README.md"), "\nhttp://localhost:3000/recipe\n"), /host 'localhost'/],
    ["an IP address", (d) => appendFileSync(path.join(d, "pages/dev-microdata.html"), '<img src="https://203.0.113.5/x.jpg">\n'), /host '203\.0\.113\.5'/],
    ["a protocol-relative non-reserved host", (d) => appendFileSync(path.join(d, "pages/dev-microdata.html"), '<script src="//cdn.invalid/x.js"></script>\n'), /host 'cdn\.invalid'/],
    ["a schema.org content link (not a vocabulary identifier)", (d) => appendFileSync(path.join(d, "README.md"), "\nhttps://schema.org/docs/full.html\n"), /host 'schema\.org'/],
    ["a non-reserved host inside a JSONL label", (d) => {
      const f = path.join(d, "ingredients/dev.jsonl");
      writeFileSync(f, readFileSync(f, "utf8").replace("https://www.example.com/basic-pesto", "https://pesto.test/basic"));
    }, /ingredients\/dev\.jsonl: host 'pesto\.test'/],
    ["a file over 1 MiB", (d) => appendFileSync(path.join(d, "README.md"), "x".repeat(1024 * 1024)), /README\.md: \d+ bytes is over the 1 MiB limit/],
    ["a binary/image file type", (d) => writeFileSync(path.join(d, "pages/photo.jpg"), "not really a jpeg"), /pages\/photo\.jpg: only \.jsonl/],
    ["a case without provenance", (d) => {
      const f = path.join(d, "ingredients/dev.jsonl");
      const lines = readFileSync(f, "utf8").split("\n");
      const c = JSON.parse(lines[4]);
      delete c.provenance;
      lines[4] = JSON.stringify(c);
      writeFileSync(f, lines.join("\n"));
    }, /ingredients\/dev\.jsonl:5 \(ing-dev-0005\): provenance missing/],
    ["a page label without provenance source", (d) => {
      const f = path.join(d, "pages/labels.json");
      const p = JSON.parse(readFileSync(f, "utf8"));
      p[0].provenance.source = "";
      writeFileSync(f, JSON.stringify(p, null, 2) + "\n");
    }, /pages\/labels\.json\[0\] \(page-dev-plain-jsonld\): provenance missing/],
    ["a changed holdout file (freeze)", (d) => appendFileSync(path.join(d, "ingredients/holdout.jsonl"), " "), /ingredients\/holdout\.jsonl: SHA-256 differs/],
  ];

  it.each(planted)("fail on %s", (_name, plant, pattern) => {
    const dir = copy();
    plant(dir);
    const r = checkInvariants(dir);
    expect(r.ok).toBe(false);
    expect(r.problems.join("\n")).toMatch(pattern);
  });

  it("fail on a symbolic link", () => {
    const dir = copy();
    try {
      symlinkSync(path.join(dir, "README.md"), path.join(dir, "pages/dev-link.html"));
    } catch {
      return; // platform without symlinks
    }
    expect(checkInvariants(dir).problems.join("\n")).toMatch(/pages\/dev-link\.html: symbolic links are not allowed/);
  });
});
