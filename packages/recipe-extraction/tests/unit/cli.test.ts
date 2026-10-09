/**
 * The recipe-lab CLI, run in-process: JSON out, local files only, bounded file size, clear exit codes.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { main, MAX_FILE_BYTES, type Io } from "../../bin/recipe-lab";
import { extractRecipePage, LIMITS, parseIngredientV1 } from "../../src/index";

const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FIXTURE = path.resolve(PKG, "../../tests/fixtures/recipe-pages/plain.html");
const tmp = mkdtempSync(path.join(tmpdir(), "recipe-lab-test-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

async function run(...argv: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const io: Io = { out: (t) => void out.push(t), err: (t) => void err.push(t) };
  const code = await main(argv, io);
  return { code, out: out.join(""), err: err.join("") };
}

describe("recipe-lab", () => {
  it("line prints the v1 reading as JSON", async () => {
    const r = await run("line", "2", "cups", "flour");
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out)).toEqual(parseIngredientV1("2 cups flour"));
    const s = await run("line", "--engine=legacy-table-import-2+suggestion", "--", "⅓ cup sugar");
    expect(JSON.parse(s.out).reasons).toContain("legacy_suggestion_applied");
  });

  it("page reads a local file with the given addresses", async () => {
    const r = await run("page", FIXTURE, "--final-url", "https://www.example.com/r/");
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out)).toEqual(extractRecipePage(readFileSync(FIXTURE, "utf8"), { requestedUrl: "https://www.example.com/r/", finalUrl: "https://www.example.com/r/" }));
  });

  it("engines lists both engines and the default", async () => {
    const r = await run("engines");
    expect(JSON.parse(r.out).map((e: { id: string; default: boolean }) => [e.id, e.default])).toEqual([["legacy-table-import-2", true], ["legacy-table-import-2+suggestion", false]]);
  });

  it("validate reports problems with exit code 1, and 0 when valid", async () => {
    const good = path.join(tmp, "good.json");
    writeFileSync(good, JSON.stringify(parseIngredientV1("2 cups flour")));
    expect(await run("validate", good)).toMatchObject({ code: 0 });
    const bad = path.join(tmp, "bad.json");
    writeFileSync(bad, JSON.stringify({ ...parseIngredientV1("2 cups flour"), status: "parsed" }));
    const r = await run("validate", bad);
    expect(r.code).toBe(1);
    expect(JSON.parse(r.out)).toMatchObject({ kind: "ParsedIngredientV1", valid: false });
    const page = path.join(tmp, "page.json");
    writeFileSync(page, (await run("page", FIXTURE, "--final-url", "https://www.example.com/r/")).out);
    expect(JSON.parse((await run("validate", page)).out)).toEqual({ kind: "RecipeExtractionV1", valid: true, problems: [] });
    const list = path.join(tmp, "list.json");
    writeFileSync(list, JSON.stringify([parseIngredientV1("salt"), parseIngredientV1("")]));
    expect(await run("validate", list)).toMatchObject({ code: 0 });
    const notJson = path.join(tmp, "x.json");
    writeFileSync(notJson, "{");
    expect(await run("validate", notJson)).toMatchObject({ code: 2, err: "recipe-lab: x.json is not valid JSON\n" });
  });

  it.each(["https://www.example.com/recipe", "http://x", "file:///etc/passwd", "FTP://example.com/a", "s3+x.y://bucket/key"])("refuses a URL as a file: %s", async (u) => {
    expect(await run("page", u, "--final-url", "https://www.example.com/")).toEqual({ code: 2, out: "", err: "recipe-lab reads local files only\n" });
    expect(await run("validate", u)).toEqual({ code: 2, out: "", err: "recipe-lab reads local files only\n" });
  });

  it("refuses files over the limit, directories and missing files", async () => {
    const big = path.join(tmp, "big.html");
    writeFileSync(big, "");
    truncateSync(big, MAX_FILE_BYTES + 1); // sparse: no data written
    expect(MAX_FILE_BYTES).toBe(LIMITS.maxHtmlChars + 1024 * 1024);
    expect(await run("page", big, "--final-url", "https://www.example.com/")).toMatchObject({ code: 2, err: expect.stringMatching(/larger than/) });
    expect(await run("page", tmp, "--final-url", "https://www.example.com/")).toMatchObject({ code: 2, err: expect.stringMatching(/not a regular file/) });
    expect(await run("page", path.join(tmp, "missing.html"), "--final-url", "https://www.example.com/")).toMatchObject({ code: 2, err: expect.stringMatching(/no such file/) });
  });

  it("usage errors exit 2", async () => {
    expect(await run()).toMatchObject({ code: 2, out: expect.stringMatching(/^usage:/) });
    expect(await run("help")).toMatchObject({ code: 0 });
    expect(await run("fetch", "https://example.com/")).toMatchObject({ code: 2, err: expect.stringMatching(/unknown command "fetch"/) });
    expect(await run("line")).toMatchObject({ code: 2 });
    expect(await run("line", "2 cups flour", "--engine", "nope")).toMatchObject({ code: 2, err: expect.stringMatching(/unknown ingredient engine "nope"/) });
    expect(await run("line", "2 cups flour", "--engine")).toMatchObject({ code: 2, err: expect.stringMatching(/--engine needs a value/) });
    expect(await run("line", "2 cups flour", "--verbose")).toMatchObject({ code: 2, err: expect.stringMatching(/unknown option --verbose/) });
    expect(await run("page", FIXTURE)).toMatchObject({ code: 2, err: expect.stringMatching(/needs --final-url/) });
  });

  const benchInstalled = existsSync(path.join(PKG, "bench/cli.ts"));
  it.skipIf(benchInstalled)("bench says so when the benchmark module is not in this build", async () => {
    expect(await run("bench", "run")).toEqual({ code: 2, out: "", err: "benchmark not installed in this build\n" });
  });
});
