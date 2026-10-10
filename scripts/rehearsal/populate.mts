// Upgrade rehearsal (EQ, 2026-10-10): populate a DISPOSABLE database with the household data an earlier
// release produces — using THAT release's own code (APP_ROOT points at its checkout; run with cwd=APP_ROOT so
// its "@/" imports resolve to its own src). Never point DATABASE_URL at a real household database.
const APP = process.env.APP_ROOT!;
const url = process.env.DATABASE_URL!;
if (!APP || !url || !/127\.0\.0\.1|localhost/.test(url)) throw new Error("APP_ROOT and a LOCAL DATABASE_URL are required");
const { seedFixture } = await import(`${APP}/tests/fixtures/household.ts`);
const sources = await import(`${APP}/src/server/commands/sources.ts`);
const imports = await import(`${APP}/src/server/commands/imports.ts`);
const plan = await import(`${APP}/src/server/commands/plan.ts`);
const groceries = await import(`${APP}/src/server/commands/groceries.ts`);
const purchasing = await import(`${APP}/src/server/commands/purchasing.ts`);
const library = await import(`${APP}/src/server/commands/library.ts`);
const { householdSnapshot } = await import(`${APP}/src/server/queries/snapshot.ts`);
const { omissionsFor } = await import(`${APP}/src/domain/groceries/partial-handoff.ts`);
const pg = (await import("pg")).default;
const { randomUUID } = await import("node:crypto");

const op = () => `rehearsal-${randomUUID()}`;
const ok = (r: any, what: string) => {
  if (r?.status !== "accepted") throw new Error(`${what}: ${JSON.stringify(r)}`);
  return r.result;
};
const q = async (sql: string, p: unknown[] = []) => {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try { return (await c.query(sql, p)).rows; } finally { await c.end(); }
};

const fx = await seedFixture(url);
const jon = { memberId: fx.members.jon, householdId: fx.householdId, displayName: "Jon" };
// An imported recipe (2 cucumbers for 3 servings) and a manual one, both by the earlier release.
const link = ok(await sources.saveLinkCommand(jon, op(), { url: "https://example.org/rehearsal-salad" }), "save link");
const paste = ok(await imports.pasteIngredientsCommand(jon, op(), { bookmarkId: link.bookmarkId, title: "Cucumber salad", text: "2 each cucumber\n1/3 cup soy sauce\n1 tsp kosher salt" }), "paste");
const upd = ok(await imports.updateImportDraftCommand(jon, op(), { draftId: paste.draftId, expectedRevision: 1, servings: 3 }), "servings");
const salad = ok(await imports.confirmImportDraftCommand(jon, op(), { draftId: paste.draftId, expectedRevision: upd.revision }), "confirm");
ok(await library.saveRecipeVersionCommand(jon, op(), {
  title: "Rehearsal rice", instructions: "", components: [{ key: "main", name: "Main" }],
  ingredients: [{ componentKey: "main", ingredientName: "rice", ingredientKey: "rice", quantity: "0.6667", unit: "cup" }],
}), "manual recipe");
// The salad on Friday for three plates.
const prev = ok(await plan.createPreviewCommand(jon, op(), { weekId: fx.weekId, operation: { type: "replace", assignmentId: fx.assignments.fri, recipeVersionId: salad.versionId } }), "preview");
ok(await plan.applyPlanChangeCommand(jon, op(), { previewId: String(prev.previewId), reviewedHash: String(prev.contentHash) }), "apply");
const [ev] = await q("SELECT id, revision FROM cooking_events WHERE week_id=$1 AND recipe_version_id=$2 AND status='scheduled'", [fx.weekId, salad.versionId]);
let rev = ev.revision;
for (const [m, n] of [["jon", "2"], ["alex", "1"]] as const) {
  ok(await plan.setPlateCommand(jon, op(), { eventId: ev.id, expectedEventRevision: rev, memberId: fx.members[m], night: "2026-10-16", kind: "dinner", componentPortions: { main: n } }), "plate");
  rev = (await q("SELECT revision FROM cooking_events WHERE id=$1", [ev.id]))[0].revision;
}
// Groceries: a member has some soy sauce; cucumber and rice are approved and sent alone (partial transfer);
// broccoli is approved but not sent.
ok(await groceries.recordAvailabilityCommand(jon, op(), { weekId: fx.weekId, ingredientKey: "soy_sauce", state: "some", quantity: "2", unit: "tbsp" }), "availability");
const lines = (await q("SELECT r.line FROM requirement_lines r JOIN grocery_cycles g ON g.id=r.cycle_id WHERE g.week_id=$1", [fx.weekId])).map((r: any) => r.line);
const pick = (k: string) => lines.find((l: any) => l.key === k);
ok(await groceries.approvePurchaseLinesCommand(jon, op(), { weekId: fx.weekId, lines: ["cucumber", "rice", "broccoli"].map((k) => ({ key: k, fingerprint: pick(k).fingerprint, packages: pick(k).toSend })) }), "approve");
const snap: any = await householdSnapshot(jon);
const partial = snap.groceries.partial;
ok(await purchasing.startPartialHandoff(jon, op(), {
  weekId: fx.weekId, reviewFingerprint: partial.reviewFingerprint, partialFingerprint: partial.partialFingerprint, selectedKeys: ["cucumber", "rice"],
  acknowledgedOmissions: omissionsFor(partial, ["cucumber", "rice"]).map((o: any) => o.key),
}), "partial handoff");
console.log(JSON.stringify({ householdId: fx.householdId, weekId: fx.weekId }));
process.exit(0);
