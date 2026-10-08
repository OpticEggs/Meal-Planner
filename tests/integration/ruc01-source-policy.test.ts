/**
 * RUC-01 (recheck of 988c4d1) — source policy holds through redirects. Three separate decisions:
 * network safety (safeFetch), whether a site may be READ (Budget Bytes: never), and what of a page
 * may be KEPT (content retention), which belongs to the site that actually supplied the content —
 * never inherited from the link's first site. Real PostgreSQL; every page and photo comes from the
 * in-process fixture transport, and the transport records every request it receives.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { fresh, op, q } from "./helpers";
import * as imports from "@/server/commands/imports";
import { addRecipeFromLink, fixtureDeps, type ImportDeps } from "@/server/recipe-import-service";
import { suggestedDecision, type DraftLine } from "@/domain/recipes/import";
import type { RecipeContentConfig } from "@/server/env";

const MANIFEST = path.resolve(__dirname, "../fixtures/import-site/manifest.json");
type Call = { ip: string; hostname: string; path: string };
const OFF: RecipeContentConfig = { householdPrivate: false, grants: [], photoHosts: [] };
const GRANT: RecipeContentConfig = { householdPrivate: false, grants: [{ domain: "licensed.example.com", instructions: true, photos: true }], photoHosts: [] };
const GRANT_CDN: RecipeContentConfig = { ...GRANT, photoHosts: [{ domain: "licensed.example.com", hosts: ["img.licensed-cdn.example.net"] }] };
const PRIVATE: RecipeContentConfig = { householdPrivate: true, grants: [], photoHosts: [] };

function deps(content: RecipeContentConfig, calls: Call[]): ImportDeps {
  return { ...fixtureDeps(MANIFEST, calls), content: () => content };
}
const hosts = (calls: Call[]) => calls.map((c) => c.hostname);
const draftOf = async (id: string) => (await q<any>("SELECT * FROM recipe_import_drafts WHERE id=$1", [id]))[0];
const count = async (t: string) => (await q<{ n: number }>(`SELECT count(*)::int AS n FROM ${t}`))[0].n;

async function confirm(actor: any, draftId: string) {
  const d = await draftOf(draftId);
  const decisions = (d.lines as DraftLine[]).map((l, index) => ({ index, decision: l.decision ?? suggestedDecision(l.parsed) ?? { use: false as const } }));
  expect((await imports.updateImportDraftCommand(actor, op(), { draftId, expectedRevision: d.revision, decisions })).status).toBe("accepted");
  const c: any = await imports.confirmImportDraftCommand(actor, op(), { draftId, expectedRevision: d.revision + 1 });
  expect(c.status, JSON.stringify(c)).toBe("accepted");
  return (await q<any>("SELECT * FROM recipe_versions WHERE id=$1", [c.result.versionId]))[0];
}

describe("RUC-01 a site that is never read stays unread through redirects", () => {
  it("R1-01: a direct Budget Bytes link receives zero requests", async () => {
    const { jon } = await fresh();
    const calls: Call[] = [];
    const r: any = await addRecipeFromLink(jon, { url: "https://www.budgetbytes.com/recipe", operationId: op() }, deps(GRANT, calls));
    expect(r).toMatchObject({ kind: "not_read", status: "permission_blocked" });
    expect(calls).toEqual([]);
  });

  it("R1-02: an allowed link that redirects to Budget Bytes: zero requests to it, no draft, nothing credited to the first site's grant", async () => {
    const { jon } = await fresh();
    const calls: Call[] = [];
    const r: any = await addRecipeFromLink(jon, { url: "https://licensed.example.com/to-budgetbytes", operationId: op() }, deps(GRANT, calls));
    expect(hosts(calls)).toEqual(["licensed.example.com"]);
    expect(hosts(calls)).not.toContain("www.budgetbytes.com");
    expect(r).toMatchObject({ kind: "not_read", status: "permission_blocked" });
    expect(r.message).toMatch(/redirect/i);
    expect(await count("recipe_import_drafts")).toBe(0);
    const [b] = await q<any>("SELECT status FROM recipe_bookmarks");
    expect(b.status).toBe("permission_blocked");
  });

  it("R1-03: a photo that redirects to Budget Bytes is never requested there", async () => {
    const { jon } = await fresh();
    const calls: Call[] = [];
    const r: any = await addRecipeFromLink(jon, { url: "https://www.licensed.example.com/bb-photo", operationId: op() }, deps(GRANT, calls));
    expect(r.kind).toBe("draft");
    expect(hosts(calls)).not.toContain("www.budgetbytes.com");
    expect((await draftOf(r.draftId)).image_id).toBeNull();
  });
});

describe("RUC-01 what may be kept belongs to the site that supplied the content", () => {
  it("R1-04: granted site → ungranted site: facts read from the actual page, nothing kept, attribution to the actual source", async () => {
    const { jon } = await fresh();
    const calls: Call[] = [];
    const r: any = await addRecipeFromLink(jon, { url: "https://licensed.example.com/to-ungranted", operationId: op() }, deps(GRANT, calls));
    expect(r.kind).toBe("draft");
    expect(hosts(calls)).toEqual(["licensed.example.com", "ungranted.example.com"]); // no photo request
    const d = await draftOf(r.draftId);
    expect(d).toMatchObject({ source_url: "https://licensed.example.com/to-ungranted", fetched_url: "https://ungranted.example.com/recipe", source_steps: null, image_id: null, household_instructions: "" });
    expect(d.content_policy).toMatchObject({ instructions: false, photos: false, basis: null, source: "ungranted.example.com" });
    expect(JSON.stringify(d.content_policy)).not.toMatch(/licensed/); // no grant inherited from the first site
    expect(d.problems.join(" ")).toMatch(/ungranted\.example\.com/);
    const v = await confirm(jon, r.draftId);
    expect(v).toMatchObject({ source_url: "https://ungranted.example.com/recipe", source_site_name: "Ungranted Kitchen", image_id: null, instructions: "" });
    expect(v.source_label).toBe("ungranted.example.com");
  });

  it("R1-05: facts-only mode, same redirect: the same facts and the same truthful attribution", async () => {
    const { jon } = await fresh();
    const calls: Call[] = [];
    const r: any = await addRecipeFromLink(jon, { url: "https://licensed.example.com/to-ungranted", operationId: op() }, deps(OFF, calls));
    const d = await draftOf(r.draftId);
    expect(d).toMatchObject({ fetched_url: "https://ungranted.example.com/recipe", source_steps: null, image_id: null });
    expect(d.content_policy).toMatchObject({ instructions: false, photos: false, basis: null, source: "ungranted.example.com" });
  });

  it("R1-06: the owner-selected household-private mode applies to the actual source and is labelled as an owner mode, not a publisher licence", async () => {
    const { jon } = await fresh();
    const calls: Call[] = [];
    const r: any = await addRecipeFromLink(jon, { url: "https://licensed.example.com/to-ungranted", operationId: op() }, deps(PRIVATE, calls));
    const d = await draftOf(r.draftId);
    expect(d.content_policy).toMatchObject({ instructions: true, photos: true, kind: "owner_mode", source: "ungranted.example.com" });
    expect(d.content_policy.basis).toMatch(/owner-selected/);
    expect(d.content_policy.basis).not.toMatch(/permission|licen[cs]e granted/i);
    expect(d.source_steps[0].text).toBe("SYNTHETIC STEP FROM Ungranted Kitchen.");
    const [img] = await q<any>("SELECT source_url, permission FROM recipe_images WHERE id=$1", [d.image_id]);
    expect(img.source_url).toBe("https://ungranted.example.com/img/photo.png");
    expect(img.permission).toMatch(/owner-selected/);
  });

  it("R1-07: a same-site redirect keeps the grant; a photo on another host is not requested unless that host is authorized for the grant", async () => {
    const { jon } = await fresh();
    const calls: Call[] = [];
    const r: any = await addRecipeFromLink(jon, { url: "https://licensed.example.com/moved", operationId: op() }, deps(GRANT, calls));
    expect(hosts(calls)).toEqual(["licensed.example.com", "www.licensed.example.com"]);
    const d = await draftOf(r.draftId);
    expect(d.content_policy).toMatchObject({ instructions: true, photos: true, kind: "owner_recorded_grant", source: "www.licensed.example.com" });
    expect(d.content_policy.basis).toMatch(/licensed\.example\.com/);
    expect(d.source_steps[0].text).toBe("SYNTHETIC STEP FROM Licensed Kitchen.");
    expect(d.image_id).toBeNull();
    expect(d.problems.join(" ")).toMatch(/img\.licensed-cdn\.example\.net/);
  });

  it("R1-08: with the CDN host authorized for that grant, the photo is read from it and recorded with its own source", async () => {
    const { jon } = await fresh();
    const calls: Call[] = [];
    const r: any = await addRecipeFromLink(jon, { url: "https://licensed.example.com/moved", operationId: op() }, deps(GRANT_CDN, calls));
    expect(hosts(calls)).toEqual(["licensed.example.com", "www.licensed.example.com", "img.licensed-cdn.example.net"]);
    const d = await draftOf(r.draftId);
    const [img] = await q<any>("SELECT source_url, page_url FROM recipe_images WHERE id=$1", [d.image_id]);
    expect(img).toEqual({ source_url: "https://img.licensed-cdn.example.net/photo.png", page_url: "https://www.licensed.example.com/recipe" });
  });

  it("R1-09: a photo redirect to an unauthorized host is refused before the request", async () => {
    const { jon } = await fresh();
    const calls: Call[] = [];
    const r: any = await addRecipeFromLink(jon, { url: "https://www.licensed.example.com/self-photo", operationId: op() }, deps(GRANT_CDN, calls));
    expect(hosts(calls)).toEqual(["www.licensed.example.com", "www.licensed.example.com"]); // page, then the photo's first hop
    expect(hosts(calls)).not.toContain("elsewhere.example.org");
    expect((await draftOf(r.draftId)).image_id).toBeNull();
    expect(await count("recipe_images")).toBe(0);
  });
});
