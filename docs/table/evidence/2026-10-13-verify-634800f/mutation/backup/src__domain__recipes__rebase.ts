/**
 * B17 correction (RB17-01, RB17-02): bringing an open recipe draft up to a newer saved version.
 * Pure — no I/O, no React.
 *
 * Three-way, per field, against the version the draft was based on (base):
 *  - the other version did not change the field          → the draft's value stands;
 *  - the draft did not change it, the other version did  → the CURRENT value is taken, including
 *    fields the editor does not show (summary, source label, ingredient form and note);
 *  - both changed it to different values                 → a conflict: nothing is chosen for the
 *    member; both full contents are shown and one must be picked explicitly.
 * Ingredients (with their components) are one field and are compared as a sequence of
 * occurrences, so a recipe that lists the same ingredient twice keeps both rows distinct.
 */

import { normalizeUnit } from "@/domain/units";

export interface DraftComponent {
  key: string;
  name: string;
}
export interface DraftRow {
  componentKey: string;
  ingredientName: string;
  ingredientKey: string | null;
  quantity: string;
  unit: string;
  form: string | null;
  note: string | null;
}
export interface RecipeFields<C extends DraftComponent = DraftComponent, R extends DraftRow = DraftRow> {
  title: string;
  cuisine: string;
  minutes: string;
  level: string;
  leftovers: boolean;
  instructions: string;
  reheat: string;
  summary: string | null;
  sourceLabel: string | null;
  components: C[];
  rows: R[];
}

export type FieldKey = "title" | "cuisine" | "minutes" | "level" | "leftovers" | "instructions" | "reheat" | "summary" | "sourceLabel" | "ingredients";

export const FIELDS: FieldKey[] = ["title", "cuisine", "minutes", "level", "leftovers", "instructions", "reheat", "summary", "sourceLabel", "ingredients"];

export const FIELD_LABEL: Record<FieldKey, string> = {
  title: "Title",
  cuisine: "Cuisine",
  minutes: "Minutes",
  level: "Effort",
  leftovers: "Leftover-friendly",
  instructions: "Steps",
  reheat: "Reheat and serve",
  summary: "Summary (not editable here)",
  sourceLabel: "Source (not editable here)",
  ingredients: "Ingredients",
};

/** Rows a member actually filled in (blank rows are scaffolding, not content). */
export function filledRows<R extends DraftRow>(rows: R[]): R[] {
  return rows.filter((r) => r.ingredientName.trim() || r.quantity.trim());
}

/** One ingredient occurrence in words, with everything a save would store for it. */
export function describeRow(f: RecipeFields, r: DraftRow): string {
  const comp = f.components.find((c) => c.key === r.componentKey)?.name || r.componentKey;
  const extra = [r.form && r.form !== "raw" ? r.form : null, r.note || null].filter(Boolean).join("; ");
  return `${r.ingredientName.trim()} ${r.quantity.trim()} ${r.unit.trim()} (${comp})${extra ? ` — ${extra}` : ""}`;
}

/**
 * What identifies a field's content for comparison. Ingredients compare by ingredient key and
 * component key (not by the display name, which comes from the shared ingredient list and can be
 * renamed without a new recipe version), quantity, unit, form and note — occurrence by occurrence.
 */
export function rowKey(r: DraftRow): string {
  const form = r.form && r.form !== "raw" ? r.form : "";
  return JSON.stringify([slug(r.componentKey), r.ingredientKey || slug(r.ingredientName.trim()), decimalKey(r.quantity), normalizeUnit(r.unit), form, r.note || ""]);
}
/** Compared as a save would store it (trimmed text, slugged keys, normalised units and numbers),
 *  so a value that would be stored identically is never a change or a conflict. */
export function compareKey(f: RecipeFields, k: FieldKey): string {
  if (k === "ingredients") return JSON.stringify({ c: f.components.map((c) => [slug(c.key || c.name), c.name.trim()]), r: filledRows(f.rows).map(rowKey) });
  if (k === "title" || k === "cuisine") return f[k].trim();
  if (k === "minutes") return /^\d+$/.test(f.minutes.trim()) ? String(Number(f.minutes.trim())) : f.minutes.trim();
  return display(f, k);
}

/** The key a save derives from a name (shared with the SaveRecipeVersion command). */
export function slug(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);
}
/** "075.50" and "75.5" store the same decimal. */
function decimalKey(q: string): string {
  const t = q.trim();
  if (!/^\d+(\.\d+)?$/.test(t)) return t;
  const [i, d = ""] = t.split(".");
  const frac = d.replace(/0+$/, "");
  return `${i.replace(/^0+(?=\d)/, "")}${frac ? `.${frac}` : ""}`;
}

/** The value of a field as the member would read it. */
export function display(f: RecipeFields, k: FieldKey): string {
  if (k === "ingredients") return filledRows(f.rows).map((r) => describeRow(f, r)).join("\n") + `\ncomponents: ${f.components.map((c) => c.name.trim()).join(", ")}`;
  if (k === "leftovers") return f.leftovers ? "yes" : "no";
  const v = f[k];
  return v === null || v === undefined ? "" : String(v);
}

/**
 * What changed in the ingredients from `from` to `to`, by occurrence: each distinct row text is
 * counted, so changing the first of two "Rice … g" rows reports one removal and one addition,
 * and a pure reorder is reported as a reorder.
 */
export function ingredientChanges(from: RecipeFields, to: RecipeFields): string[] {
  const seq = (f: RecipeFields) => filledRows(f.rows).map((r) => ({ key: rowKey(r), text: describeRow(f, r) }));
  const a = seq(from);
  const b = seq(to);
  const count = (xs: { key: string }[]) => xs.reduce((m, x) => m.set(x.key, (m.get(x.key) ?? 0) + 1), new Map<string, number>());
  const text = new Map<string, string>([...a, ...b].map((x) => [x.key, x.text]));
  const ca = count(a);
  const cb = count(b);
  const out: string[] = [];
  for (const [x, n] of ca) for (let i = (cb.get(x) ?? 0); i < n; i++) out.push(`Removed ${text.get(x)}`);
  for (const [x, n] of cb) for (let i = (ca.get(x) ?? 0); i < n; i++) out.push(`Added ${text.get(x)}`);
  if (!out.length && a.map((x) => x.key).join("\n") !== b.map((x) => x.key).join("\n")) out.push("Order of ingredients changed");
  const comps = (f: RecipeFields) => JSON.stringify(f.components.map((c) => [c.key, c.name.trim()]));
  const names = (f: RecipeFields) => f.components.map((c) => c.name.trim()).join(", ");
  if (comps(from) !== comps(to)) out.push(`Components: ${names(from)} → ${names(to)}`);
  return out;
}

/** Field-by-field differences from `from` to `to` (ingredients summarised by occurrence). */
export function fieldChanges(from: RecipeFields, to: RecipeFields): { key: FieldKey; label: string; from: string; to: string; details?: string[] }[] {
  const out: { key: FieldKey; label: string; from: string; to: string; details?: string[] }[] = [];
  for (const k of FIELDS) {
    if (compareKey(from, k) === compareKey(to, k)) continue;
    out.push({ key: k, label: FIELD_LABEL[k], from: display(from, k), to: display(to, k), ...(k === "ingredients" ? { details: ingredientChanges(from, to) } : {}) });
  }
  return out;
}

function take<C extends DraftComponent, R extends DraftRow>(into: RecipeFields<C, R>, from: RecipeFields<C, R>, k: FieldKey): RecipeFields<C, R> {
  if (k === "ingredients") return { ...into, components: from.components, rows: from.rows };
  return { ...into, [k]: from[k] } as RecipeFields<C, R>;
}

/** Brings `draft` (based on `base`) up to `current`; see the module comment. */
export function rebase<C extends DraftComponent, R extends DraftRow>(
  base: RecipeFields<C, R>,
  current: RecipeFields<C, R>,
  draft: RecipeFields<C, R>,
): { merged: RecipeFields<C, R>; taken: FieldKey[]; conflicts: FieldKey[] } {
  let merged = draft;
  const taken: FieldKey[] = [];
  const conflicts: FieldKey[] = [];
  for (const k of FIELDS) {
    const b = compareKey(base, k);
    const c = compareKey(current, k);
    const d = compareKey(draft, k);
    if (c === b || d === c) continue; // they didn't change it, or both reached the same value
    if (d === b) {
      merged = take(merged, current, k); // untouched by the member: the current value stands
      taken.push(k);
    } else conflicts.push(k);
  }
  return { merged, taken, conflicts };
}

/** The member's explicit decision for one conflicting field. */
export function resolve<C extends DraftComponent, R extends DraftRow>(
  draft: RecipeFields<C, R>,
  current: RecipeFields<C, R>,
  k: FieldKey,
  choice: "theirs" | "mine",
): RecipeFields<C, R> {
  return choice === "theirs" ? take(draft, current, k) : draft;
}

// ------------------------------------------------------------------------------------------------
// Editor state. One reducer, so a rebase and the member's keystrokes are applied in order to the
// latest draft (a keystroke can never resurrect content a rebase replaced, nor be lost to it).

export interface RebaseNote {
  version: number;
  by: string;
  title: string;
  changes: ReturnType<typeof fieldChanges>;
  taken: FieldKey[];
  conflicts: FieldKey[];
}
export interface EditorState<F extends RecipeFields> {
  f: F; // the draft
  base: F; // content of the version the draft is based on
  initial: F; // what "unsaved changes" is measured against
  seen: number | null; // that version's number (sent as expectedVersionNo)
  pending: FieldKey[]; // fields both changed, awaiting the member's decision
  rebased: RebaseNote[];
}
export type EditorAction<F extends RecipeFields> =
  | { type: "edit"; fn: (f: F) => F }
  | { type: "rebase"; cur: F; version: number; by: string; title: string }
  | { type: "decide"; k: FieldKey; choice: "theirs" | "mine" }
  | { type: "startOver"; cur: F; version: number | null };

export function editorInit<F extends RecipeFields>(f: F, seen: number | null): EditorState<F> {
  return { f, base: f, initial: f, seen, pending: [], rebased: [] };
}

export function editorReducer<F extends RecipeFields>(s: EditorState<F>, a: EditorAction<F>): EditorState<F> {
  switch (a.type) {
    case "edit":
      return { ...s, f: a.fn(s.f) };
    case "rebase": {
      if (s.seen === null || a.version <= s.seen) return s; // only a newer version; late/older responses are ignored
      const { merged, taken, conflicts } = rebase(s.base, a.cur, s.f);
      // A field left undecided stays undecided unless the draft now matches the current value.
      const still = s.pending.filter((k) => !conflicts.includes(k) && compareKey(merged, k) !== compareKey(a.cur, k));
      return {
        ...s, f: merged as F, base: a.cur, initial: a.cur, seen: a.version, pending: [...conflicts, ...still],
        rebased: [...s.rebased, { version: a.version, by: a.by, title: a.title, changes: fieldChanges(s.base, a.cur), taken, conflicts }],
      };
    }
    case "decide":
      return { ...s, f: resolve(s.f, s.base, a.k, a.choice) as F, pending: s.pending.filter((x) => x !== a.k) };
    case "startOver":
      return editorInit(a.cur, a.version);
  }
}

/** Unsaved changes: the draft's content differs from the version it is measured against. */
export function isDirty<F extends RecipeFields>(s: EditorState<F>): boolean {
  return FIELDS.some((k) => compareKey(s.initial, k) !== compareKey(s.f, k));
}
