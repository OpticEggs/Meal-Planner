/**
 * A member's own photo of a dish (MP-01..MP-09). Real PostgreSQL. The photo lives on the RECIPE
 * (versions stay immutable and pinned); the type is sniffed from the bytes, the size is capped, the
 * upload is one command (household lock, photo revision, operation-id idempotency, receipt), and
 * removing it falls back to the version's kept source photo. The upload route is called directly
 * with only the session lookup replaced (origin, content-type and multipart parsing are the real ones).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import path from "node:path";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";
import { fresh, op, q } from "./helpers";
import type { Actor } from "@/server/commands/framework";
import { COMMANDS } from "@/server/commands/registry";
import { setRecipePhotoCommand } from "@/server/commands/photos";
import * as imports from "@/server/commands/imports";
import { MEMBER_PHOTO_MAX_BYTES, storeMemberPhoto } from "@/server/recipe-photo-service";
import { librarySnapshot } from "@/server/queries/library";
import { householdSnapshot } from "@/server/queries/snapshot";
import { addRecipeFromLink, fixtureDeps } from "@/server/recipe-import-service";
import { exportHousehold, restoreHousehold } from "@/server/export";
import { migrate } from "@/server/db/migrate";
import { suggestedDecision, type DraftLine } from "@/domain/recipes/import";

const session = vi.hoisted(() => ({ actor: null as Actor | null }));
vi.mock("@/server/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/session")>()),
  actorFrom: async () => session.actor,
}));
const { POST } = await import("@/app/api/recipe-photos/route");

const DIR = path.resolve(__dirname, "../fixtures/import-site");
const PNG = readFileSync(path.join(DIR, "photo.png"));
const NOT_A_PHOTO = readFileSync(path.join(DIR, "not-a-photo.png"));
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const count = async (t: string) => (await q<{ n: number }>(`SELECT count(*)::int AS n FROM ${t}`))[0].n;
const recipeRow = async (id: string) => (await q<any>("SELECT member_photo_id, photo_revision FROM recipes WHERE id=$1", [id]))[0];
const libRecipe = async (actor: Actor, recipeId: string) => ((await librarySnapshot(actor)) as any).recipes.find((r: any) => r.recipeId === recipeId);

afterEach(() => {
  session.actor = null;
});

function upload(fields: { recipeId: string; expectedRevision: number | string; operationId: string; photo?: Buffer; type?: string }, headers: Record<string, string> = {}) {
  const form = new FormData();
  form.set("recipeId", fields.recipeId);
  form.set("expectedRevision", String(fields.expectedRevision));
  form.set("operationId", fields.operationId);
  if (fields.photo) form.set("photo", new File([new Uint8Array(fields.photo)], "dish.png", { type: fields.type ?? "image/png" }));
  return new Request("http://localhost:3000/api/recipe-photos", { method: "POST", body: form, headers: { host: "localhost:3000", origin: "http://localhost:3000", "sec-fetch-site": "same-origin", ...headers } });
}

/** An imported recipe whose version keeps the page's photo (household-private content setting). */
async function importedWithSourcePhoto(jon: Actor) {
  const deps = { ...fixtureDeps(path.join(DIR, "manifest.json")), content: () => ({ householdPrivate: true, grants: [] }) };
  const r: any = await addRecipeFromLink(jon, { url: "https://wprm.example.com/skillet-taco-rice/", operationId: op() }, deps);
  const d = (await q<any>("SELECT * FROM recipe_import_drafts WHERE id=$1", [r.draftId]))[0];
  const lines: DraftLine[] = d.lines;
  const decisions = lines.map((l, index) => ({ index, decision: l.decision ?? suggestedDecision(l.parsed) ?? { use: false as const } }));
  expect((await imports.updateImportDraftCommand(jon, op(), { draftId: d.id, expectedRevision: 1, decisions })).status).toBe("accepted");
  const c: any = await imports.confirmImportDraftCommand(jon, op(), { draftId: d.id, expectedRevision: 2 });
  expect(c.status, JSON.stringify(c)).toBe("accepted");
  return { recipeId: c.result.recipeId as string, sourceImageId: d.image_id as string };
}

describe("a member adds their own photo of a dish (MP-01..MP-07)", () => {
  it("MP-01: an uploaded PNG is stored with its sniffed type, hash and member permission, and the recipe shows it as the member's photo", async () => {
    const { jon, alex, fx } = await fresh();
    session.actor = jon;
    const recipeId = fx.recipes.stirfry.recipeId;
    // The declared type is ignored: the bytes decide.
    const res = await POST(upload({ recipeId, expectedRevision: 0, operationId: op(), photo: PNG, type: "application/octet-stream" }));
    const body = await res.json();
    expect(res.status, JSON.stringify(body)).toBe(200);
    expect(body).toEqual({ status: "accepted", imageId: expect.any(String), revision: 1 });
    const [img] = await q<any>("SELECT * FROM recipe_images WHERE id=$1", [body.imageId]);
    expect(img).toMatchObject({
      household_id: fx.householdId, content_type: "image/png", sha256: sha(PNG), source_url: `member-upload:${sha(PNG)}`, page_url: "member-upload",
      permission: "member-provided photo (added by Jon)", created_by: jon.memberId,
    });
    expect(Buffer.compare(img.bytes, PNG)).toBe(0);
    expect(await recipeRow(recipeId)).toEqual({ member_photo_id: body.imageId, photo_revision: 1 });
    // Library (either member): the member's photo, the version's own imageId unchanged.
    const r = await libRecipe(alex, recipeId);
    expect(r).toMatchObject({ memberPhotoId: body.imageId, photoRevision: 1, photo: { imageId: body.imageId, kind: "member", label: "Photo by Jon" } });
    expect(r.version.imageId).toBeNull();
    // The week's pinned version shows it too (the photo lives on the recipe, not the version).
    const s: any = await householdSnapshot(alex);
    const monday = s.week.nights.find((n: any) => n.recipe?.recipeId === recipeId);
    expect(monday.recipe).toMatchObject({ id: fx.recipes.stirfry.versionId, imageId: null, memberPhotoId: body.imageId, photoRevision: 1, photo: { kind: "member", imageId: body.imageId } });
    // One change event, in words.
    const [ev] = await q<any>("SELECT command, summary FROM change_events WHERE household_id=$1 ORDER BY seq DESC LIMIT 1", [fx.householdId]);
    expect(ev).toMatchObject({ command: "UploadRecipePhoto", summary: { type: "recipe", text: "Jon added a photo to Fixture: Tofu veggie stir-fry", actor: "Jon" } });
  });

  it("MP-02: bytes that aren't a photo (HTML declared as image/png) are refused and nothing is stored", async () => {
    const { jon, fx } = await fresh();
    session.actor = jon;
    const recipeId = fx.recipes.stirfry.recipeId;
    const res = await POST(upload({ recipeId, expectedRevision: 0, operationId: op(), photo: NOT_A_PHOTO, type: "image/png" }));
    expect(res.status).toBe(415);
    expect((await res.json()).error).toMatch(/isn't a photo/);
    const direct = await storeMemberPhoto(jon, op(), { recipeId, expectedRevision: 0, bytes: NOT_A_PHOTO });
    expect(direct).toMatchObject({ status: "refused", httpStatus: 415, code: "not_a_photo" });
    expect(await count("recipe_images")).toBe(0);
    expect(await count("command_receipts")).toBe(0);
    expect(await recipeRow(recipeId)).toEqual({ member_photo_id: null, photo_revision: 0 });
    expect((await libRecipe(jon, recipeId)).photo).toBeNull();
  });

  it("MP-03: a photo over 5 MB is refused (route and service); exactly 5 MB is kept", async () => {
    const { jon, fx } = await fresh();
    session.actor = jon;
    const recipeId = fx.recipes.stirfry.recipeId;
    const big = Buffer.alloc(MEMBER_PHOTO_MAX_BYTES + 1);
    PNG.copy(big); // a PNG signature, so only the size can refuse it
    const res = await POST(upload({ recipeId, expectedRevision: 0, operationId: op(), photo: big }));
    expect(res.status).toBe(413);
    expect(await storeMemberPhoto(jon, op(), { recipeId, expectedRevision: 0, bytes: big })).toMatchObject({ status: "refused", httpStatus: 413, code: "too_large" });
    expect(await count("recipe_images")).toBe(0);
    expect(await recipeRow(recipeId)).toEqual({ member_photo_id: null, photo_revision: 0 });
    const atCap = big.subarray(0, MEMBER_PHOTO_MAX_BYTES);
    const ok: any = await storeMemberPhoto(jon, op(), { recipeId, expectedRevision: 0, bytes: atCap });
    expect(ok.status, JSON.stringify(ok)).toBe("accepted");
    expect((await q<any>("SELECT octet_length(bytes) AS n FROM recipe_images"))[0].n).toBe(MEMBER_PHOTO_MAX_BYTES);
  });

  it("MP-04: another household's recipe or image is not found, and nothing is stored or changed", async () => {
    const { jon, other, fx } = await fresh();
    const recipeId = fx.recipes.stirfry.recipeId;
    session.actor = other;
    const res = await POST(upload({ recipeId, expectedRevision: 0, operationId: op(), photo: PNG }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ status: "rejected", code: "not_found" });
    expect(await count("recipe_images")).toBe(0);
    // Jon's household holds an image; the other household can't select it for anything, and Jon can't
    // select an image of another household.
    const mine: any = await storeMemberPhoto(jon, op(), { recipeId, expectedRevision: 0, bytes: PNG });
    expect(mine.status).toBe("accepted");
    expect(await setRecipePhotoCommand(other, op(), { recipeId, imageId: null, expectedRevision: 1 })).toMatchObject({ status: "rejected", code: "not_found" });
    const theirs = (await q<any>(
      `INSERT INTO recipe_images(household_id, content_type, bytes, sha256, source_url, page_url, permission, created_by)
       VALUES ($1,'image/png',$2,$3,'member-upload:x','member-upload','member-provided photo (added by Other)',$4) RETURNING id`,
      [fx.otherHouseholdId, PNG, sha(PNG), other.memberId],
    ))[0].id;
    expect(await setRecipePhotoCommand(jon, op(), { recipeId, imageId: theirs, expectedRevision: 1 })).toMatchObject({ status: "rejected", code: "not_found" });
    expect(await recipeRow(recipeId)).toEqual({ member_photo_id: mine.result.imageId, photo_revision: 1 });
    expect(await count("recipe_images")).toBe(2);
  });

  it("MP-05: a stale photo revision is refused with the current revision, and nothing changes", async () => {
    const { jon, alex, fx } = await fresh();
    const recipeId = fx.recipes.stirfry.recipeId;
    const first: any = await storeMemberPhoto(jon, op(), { recipeId, expectedRevision: 0, bytes: PNG });
    expect(first.status).toBe("accepted");
    // Alex still looking at revision 0.
    const stale: any = await storeMemberPhoto(alex, op(), { recipeId, expectedRevision: 0, bytes: PNG });
    expect(stale).toMatchObject({ status: "rejected", code: "stale", details: { current: 1 } });
    expect(await setRecipePhotoCommand(alex, op(), { recipeId, imageId: null, expectedRevision: 0 })).toMatchObject({ status: "rejected", code: "stale", details: { current: 1 } });
    session.actor = alex;
    const res = await POST(upload({ recipeId, expectedRevision: 0, operationId: op(), photo: PNG }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ status: "rejected", code: "stale", details: { current: 1 } });
    expect(await count("recipe_images")).toBe(1);
    expect(await recipeRow(recipeId)).toEqual({ member_photo_id: first.result.imageId, photo_revision: 1 });
    // An archived recipe's photo can't be changed.
    await q("UPDATE recipes SET archived_at=now() WHERE id=$1", [recipeId]);
    expect(await setRecipePhotoCommand(alex, op(), { recipeId, imageId: null, expectedRevision: 1 })).toMatchObject({ status: "rejected", code: "archived" });
  });

  it("MP-06: removing the member's photo falls back to the version's kept source photo, or to none", async () => {
    const { jon, alex, fx } = await fresh();
    // A recipe without a source photo: back to none.
    const plain = fx.recipes.stirfry.recipeId;
    const up: any = await storeMemberPhoto(jon, op(), { recipeId: plain, expectedRevision: 0, bytes: PNG });
    const removed: any = await COMMANDS.SetRecipePhoto(alex, op(), { recipeId: plain, imageId: null, expectedRevision: 1 });
    expect(removed).toMatchObject({ status: "accepted", result: { imageId: null, revision: 2 } });
    expect(await recipeRow(plain)).toEqual({ member_photo_id: null, photo_revision: 2 });
    expect(await libRecipe(jon, plain)).toMatchObject({ memberPhotoId: null, photoRevision: 2, photo: null });
    const [ev] = await q<any>("SELECT command, summary FROM change_events WHERE household_id=$1 ORDER BY seq DESC LIMIT 1", [fx.householdId]);
    expect(ev).toMatchObject({ command: "SetRecipePhoto", summary: { text: "Alex removed the photo from Fixture: Tofu veggie stir-fry" } });
    // The stored image stays (immutable, still the household's) and can be selected again.
    expect(await count("recipe_images")).toBe(1);
    const again: any = await setRecipePhotoCommand(jon, op(), { recipeId: plain, imageId: up.result.imageId, expectedRevision: 2 });
    expect(again).toMatchObject({ status: "accepted", result: { imageId: up.result.imageId, revision: 3 } });

    // An imported recipe that kept its page's photo: the member's photo wins, then the source returns.
    const imported = await importedWithSourcePhoto(jon);
    expect((await libRecipe(jon, imported.recipeId)).photo).toEqual({ imageId: imported.sourceImageId, kind: "source", label: "Example Kitchen" });
    const mine: any = await storeMemberPhoto(alex, op(), { recipeId: imported.recipeId, expectedRevision: 0, bytes: PNG });
    expect((await libRecipe(jon, imported.recipeId)).photo).toEqual({ imageId: mine.result.imageId, kind: "member", label: "Photo by Alex" });
    expect((await libRecipe(jon, imported.recipeId)).version.imageId).toBe(imported.sourceImageId);
    expect((await setRecipePhotoCommand(jon, op(), { recipeId: imported.recipeId, imageId: null, expectedRevision: 1 })).status).toBe("accepted");
    expect(await libRecipe(jon, imported.recipeId)).toMatchObject({
      memberPhotoId: null, photoRevision: 2, photo: { imageId: imported.sourceImageId, kind: "source", label: "Example Kitchen" },
    });
  });

  it("MP-07: a retry with the same operation id stores one image and replays the outcome; a different request under it is refused", async () => {
    const { jon, fx } = await fresh();
    session.actor = jon;
    const recipeId = fx.recipes.stirfry.recipeId;
    const id = op();
    const a = await POST(upload({ recipeId, expectedRevision: 0, operationId: id, photo: PNG }));
    const b = await POST(upload({ recipeId, expectedRevision: 0, operationId: id, photo: PNG }));
    const [ja, jb] = [await a.json(), await b.json()];
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(jb).toEqual(ja);
    const replay: any = await storeMemberPhoto(jon, id, { recipeId, expectedRevision: 0, bytes: PNG });
    expect(replay).toMatchObject({ status: "accepted", replayed: true, result: { imageId: ja.imageId, revision: 1 } });
    expect(await count("recipe_images")).toBe(1);
    expect(await count("change_events WHERE command='UploadRecipePhoto'")).toBe(1);
    expect(await recipeRow(recipeId)).toEqual({ member_photo_id: ja.imageId, photo_revision: 1 });
    // Different bytes under the same id: refused, nothing stored.
    const gif = Buffer.from("GIF89a\x01\x00\x01\x00\x00\x00\x00;", "latin1");
    expect(await storeMemberPhoto(jon, id, { recipeId, expectedRevision: 0, bytes: gif })).toMatchObject({ status: "rejected", code: "operation_id_reused" });
    expect(await count("recipe_images")).toBe(1);
  });
});

describe("member photo: route guards and export (MP-08, MP-09)", () => {
  it("MP-08: the upload route keeps the mutation-route rules: same origin, multipart only, signed in, every field present", async () => {
    const { jon, fx } = await fresh();
    const recipeId = fx.recipes.stirfry.recipeId;
    session.actor = jon;
    expect((await POST(upload({ recipeId, expectedRevision: 0, operationId: op(), photo: PNG }, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect((await POST(upload({ recipeId, expectedRevision: 0, operationId: op(), photo: PNG }, { origin: "https://evil.example" }))).status).toBe(403);
    const json = new Request("http://localhost:3000/api/recipe-photos", {
      method: "POST", body: JSON.stringify({ recipeId }), headers: { host: "localhost:3000", "content-type": "application/json", "sec-fetch-site": "same-origin" },
    });
    expect((await POST(json)).status).toBe(415);
    expect((await POST(upload({ recipeId, expectedRevision: 0, operationId: op() }))).status).toBe(400); // no photo
    expect((await POST(upload({ recipeId, expectedRevision: "x", operationId: op(), photo: PNG }))).status).toBe(400);
    expect((await POST(upload({ recipeId, expectedRevision: 0, operationId: "short", photo: PNG }))).status).toBe(400);
    session.actor = null;
    expect((await POST(upload({ recipeId, expectedRevision: 0, operationId: op(), photo: PNG }))).status).toBe(401);
    expect(await count("recipe_images")).toBe(0);
    expect(await recipeRow(recipeId)).toEqual({ member_photo_id: null, photo_revision: 0 });
  });

  it("MP-09: the household export carries the recipe's photo and its revision, and a restore keeps them", async () => {
    const { jon, fx } = await fresh();
    const recipeId = fx.recipes.stirfry.recipeId;
    const up: any = await storeMemberPhoto(jon, op(), { recipeId, expectedRevision: 0, bytes: PNG });
    const src = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await src.connect();
    const data = await exportHousehold(src, fx.householdId);
    await src.end();
    expect(data.tables.recipes.find((r) => r.id === recipeId)).toMatchObject({ member_photo_id: up.result.imageId, photo_revision: 1 });
    const restoreUrl = process.env.TABLE_RESTORE_CHECK_URL ?? "postgres://table@127.0.0.1:54329/table_restore_check";
    await migrate(restoreUrl);
    const dst = new pg.Client({ connectionString: restoreUrl });
    await dst.connect();
    try {
      const tables = (await dst.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'schema_migrations'")).rows;
      await dst.query(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(",")} RESTART IDENTITY CASCADE`);
      await restoreHousehold(dst, JSON.parse(JSON.stringify(data)));
      const [r] = (await dst.query("SELECT r.member_photo_id, r.photo_revision, i.sha256, i.permission FROM recipes r JOIN recipe_images i ON i.id=r.member_photo_id WHERE r.id=$1", [recipeId])).rows;
      expect(r).toEqual({ member_photo_id: up.result.imageId, photo_revision: 1, sha256: sha(PNG), permission: "member-provided photo (added by Jon)" });
    } finally {
      await dst.end();
    }
  });
});
