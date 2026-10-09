/**
 * Differential parity: the frozen copies of Table's page scanner and link validation (src/legacy)
 * against the live Table modules, over every page fixture, seeded mutations of each, several base
 * URLs, and a hostile URL list.
 */
import { isDeepStrictEqual } from "node:util";
import { describe, expect, it } from "vitest";
import * as liveLd from "@/server/integrations/recipe-import/jsonld";
import * as liveUrl from "@/server/integrations/recipe-import/url";
import * as frozenLd from "../../src/legacy/jsonld";
import * as frozenUrl from "../../src/legacy/link";
import { ingredientCorpus } from "./corpus";
import { BASE_URLS, fixturePages, hostileUrls, mutatedPages, PAGE_SEED } from "./page-corpus";

function diff(label: string, a: unknown, b: unknown, out: string[]) {
  if (out.length < 20 && !isDeepStrictEqual(a, b)) out.push(`${label}\n  live:   ${JSON.stringify(a)?.slice(0, 300)}\n  frozen: ${JSON.stringify(b)?.slice(0, 300)}`);
}

describe("page parity (frozen copy vs live Table module)", () => {
  const fixtures = fixturePages();
  const mutations = mutatedPages(PAGE_SEED, fixtures);

  it("reads every fixture of both fixture directories", () => {
    expect(fixtures.length).toBe(24);
    expect(mutations.length).toBeGreaterThan(fixtures.length * 15);
  });

  it.each([
    ["fixtures", "fixtures"],
    ["seeded mutations", "mutations"],
  ] as const)("extractRecipes and pageMeta are deep-equal over the %s × every base URL", (_l, which) => {
    const pages = which === "fixtures" ? fixtures : mutations;
    const out: string[] = [];
    for (const p of pages) {
      for (const baseUrl of BASE_URLS) {
        const opts = baseUrl === undefined ? {} : { baseUrl };
        diff(`extractRecipes ${p.name} @ ${baseUrl}`, liveLd.extractRecipes(p.html, opts), frozenLd.extractRecipes(p.html, opts), out);
        diff(`pageMeta ${p.name} @ ${baseUrl}`, liveLd.pageMeta(p.html, baseUrl), frozenLd.pageMeta(p.html, baseUrl), out);
      }
    }
    expect(out).toEqual([]);
  });

  it("the mutations reach the scanner's limits and failure paths", () => {
    const problems = new Set<string>();
    for (const p of mutations) for (const x of frozenLd.extractRecipes(p.html).problems) problems.add(x.replace(/\d+/g, "N"));
    const seen = [...problems].join("\n");
    expect(seen).toMatch(/more than N JSON-LD blocks/);
    expect(seen).toMatch(/is nested deeper than N/);
    expect(seen).toMatch(/is not valid JSON/);
  });

  it("non-string page input behaves the same", () => {
    for (const bad of [null, undefined, 42, {}, []]) {
      expect(frozenLd.extractRecipes(bad as unknown as string)).toEqual(liveLd.extractRecipes(bad as unknown as string));
      expect(frozenLd.pageMeta(bad as unknown as string)).toEqual(liveLd.pageMeta(bad as unknown as string));
    }
  });

  it("text helpers are deep-equal over ingredient lines and page snippets", () => {
    const corpus = ingredientCorpus();
    const inputs: unknown[] = [...corpus.literals, ...corpus.random.slice(0, 5_000), ...fixtures.map((p) => p.html), ...mutations.slice(0, 100).map((p) => p.html), 42, 1.5, NaN, null, {}];
    const out: string[] = [];
    for (const s of inputs) {
      diff(`cleanText ${String(s).slice(0, 60)}`, liveLd.cleanText(s), frozenLd.cleanText(s), out);
      diff(`cleanText(80) ${String(s).slice(0, 60)}`, liveLd.cleanText(s, 80), frozenLd.cleanText(s, 80), out);
      if (typeof s === "string") {
        diff(`decodeEntities ${s.slice(0, 60)}`, liveLd.decodeEntities(s), frozenLd.decodeEntities(s), out);
        diff(`stripTags ${s.slice(0, 60)}`, liveLd.stripTags(s), frozenLd.stripTags(s), out);
      }
    }
    for (const d of ["PT15M", "PT1H30M", "P1DT2H", "PT90S", "PT0.5M", "P", "PT", "PT1H30", "pt15m", "P31D", "PT720H", "PT720H1M", " PT5M ", "", null, 15, "P1Y", "PT1.5H", "PT99999M"]) {
      diff(`durationMinutes ${String(d)}`, liveLd.durationMinutes(d), frozenLd.durationMinutes(d), out);
    }
    expect(out).toEqual([]);
    expect(frozenLd.JSONLD_LIMITS).toEqual(liveLd.JSONLD_LIMITS);
  });

  it("validateLinkUrl, checkImportUrl and the link helpers are deep-equal over hostile URLs", () => {
    const out: string[] = [];
    const urls = hostileUrls();
    for (const u of urls) {
      diff(`validateLinkUrl ${String(u).slice(0, 80)}`, liveUrl.validateLinkUrl(u as string), frozenUrl.validateLinkUrl(u as string), out);
      diff(`checkImportUrl ${String(u).slice(0, 80)}`, liveUrl.checkImportUrl(u as string), frozenUrl.checkImportUrl(u as string), out);
      if (typeof u === "string") {
        diff(`isTrackingParam ${u.slice(0, 80)}`, liveUrl.isTrackingParam(u), frozenUrl.isTrackingParam(u), out);
        diff(`isBudgetBytes ${u.slice(0, 80)}`, liveUrl.isBudgetBytes(u), frozenUrl.isBudgetBytes(u), out);
      }
    }
    expect(out).toEqual([]);
    expect(frozenUrl.MAX_URL_LENGTH).toBe(liveUrl.MAX_URL_LENGTH);
    expect(urls.length).toBeGreaterThan(2_000);
    expect(urls.filter((u) => frozenUrl.validateLinkUrl(u as string).ok).length).toBeGreaterThan(100); // not only refusals
  });
});
