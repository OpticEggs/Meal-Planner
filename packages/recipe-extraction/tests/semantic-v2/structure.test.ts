/**
 * semantic-v2: the balanced-bracket structure (lexer) and how brackets are read (CONTRACT §7.7):
 * nested groups are flattened into the note, amounts in brackets are placed, unbalanced brackets are
 * reported with everything that could still be read.
 */
import { describe, expect, it } from "vitest";
import { lex, type GroupTok, type Tok } from "../../src/ingredient/semantic-v2/lexer";
import { normalizeLine } from "../../src/ingredient/semantic-v2/normalize";
import { amountText, core, read } from "./helpers";

const kinds = (toks: readonly Tok[]): unknown[] => toks.map((t) => (t.kind === "group" ? { group: t.open, closed: t.closed, children: kinds(t.children) } : `${t.kind}:${t.kind === "sym" || t.kind === "word" || t.kind === "num" || t.kind === "vulgar" ? t.text : ""}`));

describe("lexer", () => {
  it("builds nested groups with an explicit stack", () => {
    const { tokens, unbalanced } = lex("1/3 cup pesto (homemade (or store-bought))");
    expect(unbalanced).toBe(false);
    expect(kinds(tokens)).toEqual([
      "num:1", "sym:/", "num:3", "word:cup", "word:pesto",
      { group: "(", closed: true, children: ["word:homemade", { group: "(", closed: true, children: ["word:or", "word:store-bought"] }] },
    ]);
    const g = tokens[5] as GroupTok;
    expect([g.s, g.e, g.innerS, g.innerE]).toEqual([14, 42, 15, 41]);
  });

  it("classifies numbers: int, decimal, comma (ambiguous), malformed", () => {
    const forms = lex("12 1.5 .5 1,5 1,000 1.2.3").tokens.map((t) => (t.kind === "num" ? t.form : t.kind));
    expect(forms).toEqual(["int", "dec", "dec", "comma", "comma", "malformed"]);
  });

  it("keeps hyphenated and accented words whole", () => {
    expect(kinds(lex("half-and-half store-bought jalapeño crème fraîche Frank's").tokens)).toEqual([
      "word:half-and-half", "word:store-bought", "word:jalapeño", "word:crème", "word:fraîche", "word:Frank's",
    ]);
  });

  it("reports unbalanced brackets and still returns every token", () => {
    const a = lex("1 cup flour (sifted");
    expect(a.unbalanced).toBe(true);
    expect(kinds(a.tokens)).toEqual(["num:1", "word:cup", "word:flour", { group: "(", closed: false, children: ["word:sifted"] }]);
    const b = lex("1 cup flour) sifted");
    expect(b.unbalanced).toBe(true);
    expect(kinds(b.tokens)).toEqual(["num:1", "word:cup", "word:flour", "word:sifted"]);
    expect(lex("1 cup (flour]").unbalanced).toBe(true);
    expect(lex("1 cup [flour] {x}").unbalanced).toBe(false);
  });

  it("handles 10 000 nested brackets without recursion limits", () => {
    const line = `1 cup ${"(".repeat(10_000)}flour${")".repeat(10_000)}`;
    const { tokens, unbalanced } = lex(line);
    expect(unbalanced).toBe(false);
    let depth = 0;
    let t: Tok | undefined = tokens[2];
    while (t && t.kind === "group") {
      depth++;
      t = t.children[0];
    }
    expect(depth).toBe(10_000);
  });
});

describe("normalization", () => {
  it("collapses whitespace (NBSP, tabs, ideographic space), turns controls and bidi marks into spaces, trims", () => {
    expect(normalizeLine("  1 cup\t\tflour　 ").normalized).toBe("1 cup flour");
    expect(normalizeLine("1​cup‮flour\u0000").normalized).toBe("1 cup flour");
    expect(normalizeLine(42 as unknown as string)).toEqual({ raw: "", normalized: "", truncated: false });
  });

  it("truncates at 500 characters, never splitting a surrogate pair, and only when something is cut", () => {
    const exact = `2 cups ${"a".repeat(493)}`;
    expect(normalizeLine(exact)).toMatchObject({ truncated: false, normalized: exact });
    expect(normalizeLine(`${exact}a`)).toMatchObject({ truncated: true, normalized: exact });
    expect(normalizeLine(`${" ".repeat(2_000)}2 cups flour`).truncated).toBe(false);
    const pairs = `x${"😀".repeat(300)}`;
    const cut = normalizeLine(pairs).normalized;
    expect(cut.length).toBe(499);
    expect(/[\ud800-\udbff]$/.test(cut)).toBe(false);
  });
});

describe("brackets in a line", () => {
  it("flattens nested remarks into the note", () => {
    expect(read("1/3 cup pesto (homemade (or store-bought))")).toMatchObject({ status: "ready", name: "pesto", note: "homemade or store-bought", alternatives: [] });
    expect(read("1/2 cup chicken stock (low-sodium (if possible))")).toMatchObject({ status: "ready", name: "chicken stock", note: "low-sodium if possible" });
    expect(read("1 (16 oz) bag frozen spinach (thawed (squeeze out the water))")).toMatchObject({
      status: "ready", name: "frozen spinach", note: "thawed squeeze out the water", unit: { canonical: "bag" },
    });
  });

  it("square brackets and braces are brackets too", () => {
    expect(read("1 cup flour [sifted]")).toMatchObject({ status: "ready", name: "flour", note: "sifted" });
  });

  it("unbalanced brackets: needs review with every part read, never the raw line as the name", () => {
    const a = read("1 cup flour (sifted");
    expect(core(a)).toEqual({ status: "needs_review", name: "flour", quantity: "1", unit: "cup" });
    expect(a.note).toBe("sifted");
    expect(a.reasons).toContain("structure_unbalanced");
    const b = read("2 (15 oz cans black beans");
    expect(b.status).toBe("needs_review");
    expect(b.reasons).toContain("structure_unbalanced");
    expect(qText2(b)).toBe("2");
    const c = read("1/3 cup pesto (homemade (or store-bought)");
    expect(c).toMatchObject({ status: "needs_review", name: "pesto", note: "homemade or store-bought" });
    const d = read("1 cup milk)");
    expect(core(d)).toEqual({ status: "needs_review", name: "milk", quantity: "1", unit: "cup" });
  });

  it("a stated amount in brackets is placed, not noted", () => {
    expect(amountText(read("2 (15 oz) cans black beans").packageSize)).toBe("15 oz");
    expect(read("1 cup (120 g) flour").equivalents.map(amountText)).toEqual(["120 g"]);
    expect(read("1 can black beans (15 oz)").packageSize).not.toBeNull();
  });
});

function qText2(r: { quantity: { kind: string; numerator?: string } | null }) {
  return r.quantity && r.quantity.kind === "exact" ? r.quantity.numerator : null;
}
