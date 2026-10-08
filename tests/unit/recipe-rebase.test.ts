/**
 * RB17-01 / RB17-02: bringing a recipe draft up to a newer version. Expected-correctness tests
 * for the pure rebase and occurrence-aware ingredient comparison used by the recipe editor.
 */
import { describe, expect, it } from "vitest";
import { display, editorInit, editorReducer, fieldChanges, ingredientChanges, isDirty, rebase, resolve, type DraftRow, type EditorAction, type RecipeFields } from "@/domain/recipes/rebase";

const row = (name: string, quantity: string, unit = "g", extra: Partial<DraftRow> = {}): DraftRow => ({
  componentKey: "main", ingredientName: name, ingredientKey: name.toLowerCase(), quantity, unit, form: null, note: null, ...extra,
});
const recipe = (patch: Partial<RecipeFields> = {}): RecipeFields => ({
  title: "Rice bowl", cuisine: "", minutes: "", level: "", leftovers: false, instructions: "Cook the rice.", reheat: "Microwave 2 min.",
  summary: "Weeknight bowl", sourceLabel: "Family card", components: [{ key: "main", name: "Main" }],
  rows: [row("Rice", "75")], ...patch,
});

describe("rebase: a draft brought up to a newer version (RB17-01)", () => {
  it("takes the newer steps and reheat text for fields the member did not touch, and keeps the member's title", () => {
    const base = recipe();
    const current = recipe({ instructions: "Rinse, then cook the rice.", reheat: "Steam 3 min." });
    const draft = recipe({ title: "Jon's rice bowl" });
    const { merged, taken, conflicts } = rebase(base, current, draft);
    expect(conflicts).toEqual([]);
    expect(taken).toEqual(["instructions", "reheat"]);
    expect([merged.title, merged.instructions, merged.reheat]).toEqual(["Jon's rice bowl", "Rinse, then cook the rice.", "Steam 3 min."]);
  });

  it("never reverts fields the editor does not show: summary, source label, ingredient form and note", () => {
    const base = recipe();
    const current = recipe({ summary: "Now with greens", sourceLabel: "Alex's notebook", rows: [row("Rice", "75", "g", { form: "cooked", note: "rinsed" })] });
    const draft = recipe({ title: "Jon's rice bowl" });
    const { merged, taken, conflicts } = rebase(base, current, draft);
    expect(conflicts).toEqual([]);
    expect(taken).toEqual(["summary", "sourceLabel", "ingredients"]);
    expect([merged.summary, merged.sourceLabel, merged.rows[0].form, merged.rows[0].note, merged.title]).toEqual(["Now with greens", "Alex's notebook", "cooked", "rinsed", "Jon's rice bowl"]);
  });

  it("does not decide for the member when both changed the same field; the explicit choice is applied as made", () => {
    const base = recipe();
    const current = recipe({ instructions: "Alex's method." });
    const draft = recipe({ instructions: "Jon's method." });
    const { merged, conflicts } = rebase(base, current, draft);
    expect(conflicts).toEqual(["instructions"]);
    expect(merged.instructions).toBe("Jon's method."); // unchanged until the member chooses
    expect(resolve(merged, current, "instructions", "theirs").instructions).toBe("Alex's method.");
    expect(resolve(merged, current, "instructions", "mine").instructions).toBe("Jon's method.");
  });

  it("is not a conflict when both reached the same value, and nothing is taken when the other version changed nothing", () => {
    const base = recipe();
    expect(rebase(base, recipe({ title: "Same" }), recipe({ title: "Same" }))).toMatchObject({ taken: [], conflicts: [] });
    expect(rebase(base, recipe(), recipe({ title: "Mine" })).merged.title).toBe("Mine");
  });

  it("a third version rebases again from the second: changes since the second are taken, earlier choices stand", () => {
    const v1 = recipe();
    const v2 = recipe({ title: "Alex's title" });
    const draft = recipe({ title: "Jon's title" });
    const first = rebase(v1, v2, draft);
    expect(first.conflicts).toEqual(["title"]);
    const chosen = resolve(first.merged, v2, "title", "mine");
    const v3 = recipe({ title: "Alex's title", instructions: "New third-version steps." });
    const second = rebase(v2, v3, chosen);
    expect(second.conflicts).toEqual([]);
    expect([second.merged.title, second.merged.instructions]).toEqual(["Jon's title", "New third-version steps."]);
    // And if the third version changes the chosen field again, it is a conflict again.
    const v3b = recipe({ title: "Alex's newest title" });
    expect(rebase(v2, v3b, chosen).conflicts).toEqual(["title"]);
  });
});

describe("ingredient comparison by occurrence (RB17-02)", () => {
  const twice = (a: string, b: string) => recipe({ rows: [row("Rice", a), row("Rice", b)] });

  it("a change to the first of two occurrences is reported, not lost", () => {
    expect(ingredientChanges(twice("10", "100"), twice("20", "100"))).toEqual(["Removed Rice 10 g (Main)", "Added Rice 20 g (Main)"]);
    expect(fieldChanges(twice("10", "100"), twice("20", "100")).map((c) => c.key)).toEqual(["ingredients"]);
  });

  it("units, forms and notes of one occurrence are compared", () => {
    expect(ingredientChanges(twice("10", "100"), recipe({ rows: [row("Rice", "10", "oz"), row("Rice", "100")] }))).toEqual(["Removed Rice 10 g (Main)", "Added Rice 10 oz (Main)"]);
    expect(ingredientChanges(twice("10", "100"), recipe({ rows: [row("Rice", "10", "g", { form: "cooked", note: "day-old" }), row("Rice", "100")] })))
      .toEqual(["Removed Rice 10 g (Main)", "Added Rice 10 g (Main) — cooked; day-old"]);
  });

  it("adding or removing one of several identical occurrences is counted", () => {
    expect(ingredientChanges(twice("10", "10"), recipe({ rows: [row("Rice", "10")] }))).toEqual(["Removed Rice 10 g (Main)"]);
    expect(ingredientChanges(recipe({ rows: [row("Rice", "10")] }), twice("10", "10"))).toEqual(["Added Rice 10 g (Main)"]);
  });

  it("a reorder is reported as a reorder", () => {
    expect(ingredientChanges(twice("10", "100"), twice("100", "10"))).toEqual(["Order of ingredients changed"]);
  });

  it("rebase keeps both occurrences when the member did not touch the ingredients", () => {
    const { merged, taken } = rebase(twice("10", "100"), twice("20", "100"), { ...twice("10", "100"), title: "Mine" });
    expect(taken).toEqual(["ingredients"]);
    expect(merged.rows.map((r) => r.quantity)).toEqual(["20", "100"]);
    expect(display(merged, "title")).toBe("Mine");
  });

  it("blank scaffolding rows in a draft are not a change", () => {
    const base = recipe();
    const draft = recipe({ rows: [row("Rice", "75"), row("", "")] });
    expect(rebase(base, recipe({ rows: [row("Rice", "80")] }), draft)).toMatchObject({ taken: ["ingredients"], conflicts: [] });
  });
});

describe("comparison by identity, not display name (RB17-02)", () => {
  it("a shared-list rename of an ingredient (same key) is not a recipe change; a different ingredient key is", () => {
    const renamed = recipe({ rows: [row("Rice", "75", "g", { ingredientName: "Jasmine rice", ingredientKey: "rice" })] });
    expect(fieldChanges(recipe(), renamed)).toEqual([]);
    const other = recipe({ rows: [row("Rice", "75", "g", { ingredientKey: "brown-rice" })] });
    expect(fieldChanges(recipe(), other).map((c) => c.key)).toEqual(["ingredients"]);
  });

  it("moving an occurrence to a different component with the same name is a change", () => {
    const two = (k: string) => recipe({ components: [{ key: "a", name: "Main" }, { key: "b", name: "Main sauce" }], rows: [row("Rice", "75", "g", { componentKey: k })] });
    expect(fieldChanges(two("a"), two("b")).map((c) => c.key)).toEqual(["ingredients"]);
  });
});

describe("editor state: rebases and keystrokes in order (RB17-01)", () => {
  type F = RecipeFields;
  const v1 = recipe();
  const start = () => editorInit<F>(v1, 1);
  const edit = (fn: (f: F) => F): EditorAction<F> => ({ type: "edit", fn });
  const at = (cur: F, version: number): EditorAction<F> => ({ type: "rebase", cur, version, by: "Alex", title: cur.title });

  it("a keystroke after a rebase applies to the merged draft and never restores the replaced content", () => {
    let s = editorReducer(start(), edit((f) => ({ ...f, title: "Jon's" })));
    s = editorReducer(s, at(recipe({ instructions: "Alex's method." }), 2));
    s = editorReducer(s, edit((f) => ({ ...f, title: "Jon's bowl" })));
    expect([s.f.title, s.f.instructions, s.seen]).toEqual(["Jon's bowl", "Alex's method.", 2]);
  });

  it("an undecided field survives a later version that changes something else; Save stays held", () => {
    let s = editorReducer(start(), edit((f) => ({ ...f, title: "Jon's title" })));
    s = editorReducer(s, at(recipe({ title: "Alex's title" }), 2));
    expect(s.pending).toEqual(["title"]);
    s = editorReducer(s, at(recipe({ title: "Alex's title", instructions: "Third-version steps." }), 3));
    expect(s.pending).toEqual(["title"]);
    expect([s.f.title, s.f.instructions, s.seen]).toEqual(["Jon's title", "Third-version steps.", 3]);
    s = editorReducer(s, { type: "decide", k: "title", choice: "theirs" });
    expect([s.pending, s.f.title]).toEqual([[], "Alex's title"]);
  });

  it("a version that is not newer than the draft's base is ignored (late or out-of-order responses)", () => {
    let s = editorReducer(start(), at(recipe({ instructions: "v3 steps" }), 3));
    const before = s;
    s = editorReducer(s, at(recipe({ instructions: "v2 steps" }), 2));
    expect(s).toBe(before);
    expect(editorReducer(s, at(recipe({ instructions: "v3 steps" }), 3))).toBe(before);
  });

  it("start over discards edits, decisions and the record of rebases; unsaved changes are measured by content", () => {
    let s = editorReducer(start(), edit((f) => ({ ...f, title: "Jon's title" })));
    s = editorReducer(s, at(recipe({ title: "Alex's title" }), 2));
    expect(isDirty(s)).toBe(true);
    const v2 = recipe({ title: "Alex's title" });
    s = editorReducer(s, { type: "startOver", cur: v2, version: 2 });
    expect([s.pending, s.rebased, s.seen, s.f.title, isDirty(s)]).toEqual([[], [], 2, "Alex's title", false]);
    // Same content in new objects (fresh row ids in the editor) is not an unsaved change.
    expect(isDirty({ ...s, f: { ...v2, rows: v2.rows.map((r) => ({ ...r })) } })).toBe(false);
  });
});

describe("compared as a save would store it (RB17-01)", () => {
  it("values a save would store identically are not changes: re-typed names, whitespace, unit spellings, number forms", () => {
    const typedBack = recipe({ rows: [row("Rice", "75", "g", { ingredientKey: null })] }); // name edited away and back
    expect(fieldChanges(recipe(), typedBack)).toEqual([]);
    expect(fieldChanges(recipe(), recipe({ title: "Rice bowl  ", cuisine: " " }))).toEqual([]);
    expect(fieldChanges(recipe(), recipe({ rows: [row("Rice", "75.0", "grams")] }))).toEqual([]);
    expect(fieldChanges(recipe({ minutes: "75" }), recipe({ minutes: "075" }))).toEqual([]);
    // ...and a real difference still is one.
    expect(fieldChanges(recipe(), recipe({ rows: [row("Rice", "75.5", "g")] })).map((c) => c.key)).toEqual(["ingredients"]);
  });

  it("an edit that comes back to the stored value is not unsaved, and does not turn the other member's change into a conflict", () => {
    let s = editorInit<RecipeFields>(recipe(), 1);
    s = editorReducer(s, { type: "edit", fn: (f) => ({ ...f, rows: [{ ...f.rows[0], ingredientName: "Rice", ingredientKey: null }] }) });
    expect(isDirty(s)).toBe(false);
    s = editorReducer(s, { type: "rebase", cur: recipe({ rows: [row("Rice", "90")] }), version: 2, by: "Alex", title: "Rice bowl" });
    expect([s.pending, s.f.rows[0].quantity]).toEqual([[], "90"]);
  });
});
