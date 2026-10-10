/**
 * Page fixtures must describe pages Table could actually have read: every final URL and every expected
 * image/declared URL must pass Table's own link validation (frozen copy). Reserved names that Table
 * refuses (e.g. the `.example` TLD) would make an expected value unreachable for any engine and turn a
 * fixture artefact into a "miss". The one known exception is recorded in fixtures/LABEL-CHANGES.md: the
 * frozen holdout page `page-hold-redirect-li-entities` has a requested URL on `go.example` — requested
 * URLs are not scored, and the holdout is not edited after its freeze.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateLinkUrl } from "../../src/legacy/link";

interface Page {
  id: string;
  requestedUrl: string;
  finalUrl: string;
  candidates: { imageUrls: string[]; declaredUrl: string | null }[];
}
const pages = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../../fixtures/pages/labels.json"), "utf8")) as Page[];
const KNOWN_REQUESTED_EXCEPTIONS = new Set(["page-hold-redirect-li-entities"]);

describe("page fixture URLs are links Table accepts", () => {
  it("final, image and declared URLs pass validateLinkUrl", () => {
    const bad: string[] = [];
    for (const p of pages) {
      const urls = [p.finalUrl, ...p.candidates.flatMap((c) => [...c.imageUrls, ...(c.declaredUrl ? [c.declaredUrl] : [])])];
      for (const u of urls) if (!validateLinkUrl(u).ok) bad.push(`${p.id}: ${u}`);
    }
    expect(bad).toEqual([]);
  });

  it("requested URLs pass too, except the one recorded holdout exception", () => {
    const bad = pages.filter((p) => !validateLinkUrl(p.requestedUrl).ok).map((p) => p.id);
    expect(bad.filter((id) => !KNOWN_REQUESTED_EXCEPTIONS.has(id))).toEqual([]);
    expect(bad).toEqual([...KNOWN_REQUESTED_EXCEPTIONS]);
  });
});
