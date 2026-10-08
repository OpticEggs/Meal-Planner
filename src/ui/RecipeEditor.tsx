"use client";
import { useEffect, useReducer, useRef, useState } from "react";
import { useStore } from "./store";
import { ModalSheet } from "./a11y";
import { FieldError, FormAlert, fieldProps, focusFirstInvalid, isDecimal, type Errors } from "./forms";
import { FIELD_LABEL, display, editorInit, editorReducer, isDirty, type EditorAction, type EditorState, type FieldKey, type RecipeFields } from "@/domain/recipes/rebase";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * B17 — recipe entry and editing as a dialog on the one modal system. Every row's controls are
 * named by their position and content; errors are attached to their fields; adding a row moves
 * focus into it and removing one moves focus to a survivor. Closing with unsaved changes asks
 * first ("Keep editing" focused). A version saved by the other member while this is open is
 * brought into the draft field by field (src/domain/recipes/rebase.ts): what the member did not
 * change takes the new content (hidden fields included) and is shown in full; a field both
 * changed is a conflict with both full contents shown, decided explicitly before Save.
 */

type Comp = { id: number; key: string; name: string };
type Row = { id: number; componentKey: string; ingredientName: string; ingredientKey: string | null; quantity: string; unit: string; form: string | null; note: string | null };
type Fields = RecipeFields<Comp, Row>;

let seq = 0;
const nextId = () => ++seq;

/** Editable fields from a stored version (fields the form doesn't show — summary, source label,
 *  ingredient form and note — are carried through unchanged). Row and component ids are UI-only;
 *  given the draft they reuse its ids by position, so a rebase does not remount (and unfocus) rows. */
function fieldsOf(v: any, prev?: Fields): Fields {
  const f = fieldsOfVersion(v);
  if (!prev) return f;
  return { ...f, components: f.components.map((c, i) => ({ ...c, id: prev.components[i]?.id ?? c.id })), rows: f.rows.map((r, i) => ({ ...r, id: prev.rows[i]?.id ?? r.id })) };
}
function fieldsOfVersion(v: any): Fields {
  return {
    title: v?.title ?? "", cuisine: v?.cuisine ?? "", minutes: v?.effortMinutes?.toString() ?? "", level: v?.effortLevel ?? "",
    leftovers: !!v?.leftoverFriendly, instructions: v?.instructions ?? "", reheat: v?.reheatInstructions ?? "",
    summary: v?.summary ?? null, sourceLabel: v?.sourceLabel ?? null,
    components: v?.components?.map((c: any) => ({ id: nextId(), key: c.key, name: c.name })) ?? [{ id: nextId(), key: "main", name: "Main" }],
    rows: v?.ingredients?.map((i: any) => ({
      id: nextId(), componentKey: i.componentKey, ingredientName: i.name, ingredientKey: i.ingredientKey, quantity: i.quantity, unit: i.unit, form: i.form ?? null, note: i.note ?? null,
    })) ?? [{ id: nextId(), componentKey: "main", ingredientName: "", ingredientKey: null, quantity: "", unit: "g", form: null, note: null }],
  };
}

export function RecipeEditorDialog({ recipeId, onClose, returnFocus }: { recipeId: string | null; onClose: () => void; returnFocus: () => void }) {
  const { library, command, announce, writesAllowed } = useStore();
  const live = recipeId ? library?.recipes.find((x: any) => x.recipeId === recipeId) : null;
  // One reducer for the draft and its base: a newer version and the member's keystrokes are
  // applied in order to the latest draft (src/domain/recipes/rebase.ts).
  const [st, dispatch] = useReducer(
    (s: EditorState<Fields>, a: EditorAction<Fields>) => editorReducer(s, a),
    null,
    () => editorInit(fieldsOf(live?.version), live?.version.versionNo ?? null),
  );
  const { f, base, seen: seenVersion, pending, rebased } = st;
  const [label] = useState<string>(live?.version.title ?? "");
  const beforeConfirm = useRef<HTMLElement | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const dirty = isDirty(st);
  const currentVersion: number | null = live?.version.versionNo ?? null;
  const conflict = pending.length > 0;

  // A newer version arrived: bring the draft up to it (never silently reverting what the member
  // did not touch), and hold Save while any field both changed is undecided. The reducer ignores
  // a version that is not newer than the one the draft is based on.
  // Not while this member's own save is in flight: its version can reach the library before the
  // command resolves, and is not "the other member's" change. A rejected save rebases afterwards.
  useEffect(() => {
    if (!recipeId || currentVersion === null || busy) return;
    const by = live?.versions?.at(-1)?.by ?? "Someone";
    dispatch({ type: "rebase", cur: fieldsOf(live?.version, st.f), version: currentVersion, by, title: live?.version.title ?? "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVersion, busy]);
  const lastRebase = rebased.at(-1);
  useEffect(() => {
    if (!lastRebase) return;
    const { by, version, taken, conflicts } = lastRebase;
    announce(
      `${by} saved version ${version} while you were editing.${taken.length ? ` Brought into your draft: ${taken.map((k) => FIELD_LABEL[k]).join(", ")}.` : ""}${conflicts.length ? ` Decide: ${conflicts.map((k) => FIELD_LABEL[k]).join(", ")}.` : ""}`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastRebase]);

  function decide(k: FieldKey, choice: "theirs" | "mine") {
    dispatch({ type: "decide", k, choice });
    const rest = pending.filter((x) => x !== k);
    // The decision block is about to disappear: focus the next decision, or Save.
    setFocusId(rest.length ? `re-decide-${rest[0]}` : "re-save");
  }

  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(focusId) as HTMLButtonElement | null;
    // A disabled target (Save while writes are paused) cannot take focus: fall back to the title.
    if (el && !el.disabled) el.focus();
    else document.getElementById("re-title")?.focus();
    setFocusId(null);
  }, [focusId, f, pending]);
  useEffect(() => {
    if (confirmDiscard) keepRef.current?.focus();
  }, [confirmDiscard]);

  // Every way of closing goes through here: unsaved work is never dropped without asking.
  function requestClose() {
    if (confirmDiscard) return keepEditing(); // Escape again = keep editing
    if (dirty) {
      beforeConfirm.current = document.activeElement as HTMLElement | null;
      return setConfirmDiscard(true);
    }
    onClose();
  }
  // Leaving the confirmation puts focus back where it was (its own button is about to vanish).
  function keepEditing() {
    setConfirmDiscard(false);
    const back = beforeConfirm.current;
    setTimeout(() => {
      if (back && back.isConnected && back !== document.body) back.focus();
      else document.getElementById("re-title")?.focus();
    }, 0);
  }
  function startOver() {
    dispatch({ type: "startOver", cur: fieldsOf(live?.version), version: currentVersion });
    setErrors({});
    setFormError(null);
    setFocusId("re-title");
  }

  // Every edit is a function of the latest draft, never of the one this render saw.
  const edit = (fn: (d: Fields) => Fields) => dispatch({ type: "edit", fn });
  const set = (patch: Partial<Fields>) => edit((d) => ({ ...d, ...patch }));
  const setRow = (id: number, patch: Partial<Row>) => edit((d) => ({ ...d, rows: d.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const compLabel = (key: string) => f.components.find((c) => c.key === key)?.name || key;

  function addRow() {
    const id = nextId();
    edit((d) => ({ ...d, rows: [...d.rows, { id, componentKey: d.components[0]?.key ?? "main", ingredientName: "", ingredientKey: null, quantity: "", unit: "g", form: null, note: null }] }));
    setFocusId(`re-n-${id}`);
  }
  function removeRow(i: number) {
    const gone = f.rows[i].id;
    edit((d) => ({ ...d, rows: d.rows.filter((r) => r.id !== gone) }));
    const rows = f.rows.filter((_, j) => j !== i);
    const next = rows[i] ?? rows[i - 1];
    // A lone survivor's remove button is disabled, so its name field takes focus instead.
    setFocusId(next ? (rows.length > 1 ? `re-rm-${next.id}` : `re-n-${next.id}`) : "re-add-row");
  }
  function addComponent() {
    const id = nextId();
    // A key no existing component uses (saved recipes carry keys minted in earlier sessions).
    edit((d) => {
      const taken = new Set(d.components.map((c) => c.key));
      let n = id;
      while (taken.has(`c${n}`)) n++;
      return { ...d, components: [...d.components, { id, key: `c${n}`, name: "" }] };
    });
    setFocusId(`re-c-${id}`);
  }
  function removeComponent(i: number) {
    const removed = f.components[i];
    edit((d) => {
      const components = d.components.filter((c) => c.id !== removed.id);
      // Rows (even empty ones) that pointed at it move to the first remaining component.
      const rows = d.rows.map((r) => (r.componentKey === removed.key ? { ...r, componentKey: components[0]?.key ?? "main" } : r));
      return { ...d, components, rows };
    });
    const components = f.components.filter((_, j) => j !== i);
    const next = components[i] ?? components[i - 1];
    setFocusId(next ? `re-c-${next.id}` : "re-add-comp"); // a component's name field is never disabled
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pending.length) return; // undecided fields: Save is held regardless of the button's state
    const errs: Errors = {};
    if (!f.title.trim()) errs["re-title"] = "Give the recipe a title";
    else if (f.title.trim().length > 140) errs["re-title"] = "Title must be 140 characters or fewer";
    if (f.minutes.trim() && !(/^\d+$/.test(f.minutes.trim()) && Number(f.minutes) >= 1 && Number(f.minutes) <= 1440)) errs["re-minutes"] = "Minutes must be a whole number from 1 to 1440, or left empty";
    const names = new Set<string>();
    f.components.forEach((c) => {
      const n = c.name.trim().toLowerCase();
      if (!n) errs[`re-c-${c.id}`] = "Name this component";
      else if (names.has(n)) errs[`re-c-${c.id}`] = "Another component already has this name";
      names.add(n);
    });
    const used = f.rows.filter((r) => r.ingredientName.trim() || r.quantity.trim());
    if (!used.length) errs["re-rows"] = "Add at least one ingredient";
    for (const r of used) {
      if (!r.ingredientName.trim()) errs[`re-n-${r.id}`] = "Name the ingredient";
      if (!isDecimal(r.quantity) || Number(r.quantity) <= 0) errs[`re-q-${r.id}`] = "Amount must be a positive number";
      if (!r.unit.trim()) errs[`re-u-${r.id}`] = "Give a unit (for example g, oz, cup, each)";
    }
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) return void focusFirstInvalid(formRef.current, errs);
    setBusy(true);
    const r = await command("SaveRecipeVersion", {
      recipeId, title: f.title.trim(), cuisine: f.cuisine.trim() || null, effortMinutes: f.minutes.trim() ? Number(f.minutes) : null, effortLevel: f.level || null,
      leftoverFriendly: f.leftovers, instructions: f.instructions, reheatInstructions: f.reheat, summary: f.summary, sourceLabel: f.sourceLabel,
      components: f.components.map((c) => ({ key: c.key || c.name.toLowerCase().replace(/\W+/g, "_"), name: c.name.trim() })),
      ingredients: used.map((x) => ({
        componentKey: x.componentKey, ingredientName: x.ingredientName.trim(), ingredientKey: x.ingredientKey, quantity: x.quantity.trim(), unit: x.unit.trim(),
        ...(x.form ? { form: x.form } : {}), ...(x.note ? { note: x.note } : {}),
      })),
      ...(recipeId ? { expectedVersionNo: seenVersion } : {}), // required by the server for an existing recipe
    });
    setBusy(false);
    if (r.status !== "accepted") return setFormError(r.message);
    announce(recipeId ? `Saved version ${r.result?.versionNo ?? ""} of ${f.title.trim()}. Dinners already chosen keep their version.` : `Recipe ${f.title.trim()} saved.`);
    onClose();
  }

  return (
    <ModalSheet title={recipeId ? `Edit ${label} — new version` : "New recipe"} subtitle={recipeId ? `Editing version ${seenVersion ?? "?"}` : undefined}
      closeLabel={recipeId ? "Close the recipe editor" : "Close the new recipe"} onClose={requestClose} returnFocus={returnFocus} testId="recipe-editor">
      {confirmDiscard && (
        <div className="warnbox" role="alertdialog" aria-labelledby="re-discard-h" data-testid="discard-confirm">
          <p id="re-discard-h">Discard your unsaved changes?</p>
          <div className="row">
            <button type="button" ref={keepRef} className="btn line small" onClick={keepEditing}>Keep editing</button>
            <button type="button" className="btn danger small" onClick={onClose}>Discard changes</button>
          </div>
        </div>
      )}
      {rebased.length > 0 && (
        <div className="warnbox stack" data-testid="recipe-rebased" style={{ overflowWrap: "anywhere", minWidth: 0 }}>
          {rebased.map((r) => (
            <div key={r.version}>
              <p><strong>{r.by} saved version {r.version} ({r.title}) while you were editing.</strong> Nothing of yours has been saved yet.</p>
              <ul className="small" data-testid="recipe-conflict-changes">
                {r.changes.flatMap((c) => (c.details ?? [`${c.label}: ${c.from || "—"} → ${c.to || "—"}`]).map((t, i) => (
                  <li key={`${c.key}-${i}`} style={{ whiteSpace: "pre-line" }}>{t}{r.taken.includes(c.key) ? " (brought into your draft — you hadn't changed this)" : ""}</li>
                )))}
              </ul>
            </div>
          ))}
          {conflict && (
            <div className="stack" data-testid="recipe-conflict">
              <p>You and {rebased.at(-1)?.by} both changed {pending.map((k) => FIELD_LABEL[k]).join(", ")} ({rebased.at(-1)?.by} saved version {seenVersion} ({rebased.at(-1)?.title})). Choose what to keep for each before saving.</p>
              {pending.map((k, i) => (
                <div key={k} className="card stack" data-testid={`recipe-conflict-${k}`} role="group" aria-label={`${FIELD_LABEL[k]}: choose a version`}>
                  <strong>{FIELD_LABEL[k]}</strong>
                  <div className="small" style={{ whiteSpace: "pre-line" }}><em>Version {seenVersion} (current):</em> {display(base, k) || "—"}</div>
                  <div className="small" style={{ whiteSpace: "pre-line" }}><em>Yours:</em> {display(f, k) || "—"}</div>
                  <div className="row">
                    <button type="button" id={`re-decide-${k}`} className="btn line small" onClick={() => decide(k, "theirs")}>Use version {seenVersion}'s {FIELD_LABEL[k]}</button>
                    <button type="button" className="btn line small" onClick={() => decide(k, "mine")}>Keep my {FIELD_LABEL[k]}</button>
                  </div>
                </div>
              ))}
              <button type="button" className="link small" onClick={startOver}>Start over from version {seenVersion} (discard all my edits)</button>
            </div>
          )}
        </div>
      )}
      <FormAlert message={formError} testId="recipe-error" />
      <form ref={formRef} className="stack" noValidate onSubmit={save}>
        <p className="faint small">Structured entry: amounts are per ONE portion of their component, so plates can scale components independently. Text is stored as plain text.</p>
        <label htmlFor="re-title">Title</label>
        <input {...fieldProps("re-title", errors)} data-autofocus="" value={f.title} onChange={(e) => set({ title: e.target.value })} />
        <FieldError id="re-title" errors={errors} />
        <div className="grid3">
          <span className="stack"><label htmlFor="re-cuisine">Cuisine</label><input id="re-cuisine" value={f.cuisine} onChange={(e) => set({ cuisine: e.target.value })} /></span>
          <span className="stack">
            <label htmlFor="re-minutes">Minutes (estimate)</label>
            <input {...fieldProps("re-minutes", errors)} inputMode="numeric" value={f.minutes} onChange={(e) => set({ minutes: e.target.value })} />
            <FieldError id="re-minutes" errors={errors} />
          </span>
          <span className="stack">
            <label htmlFor="re-level">Effort</label>
            <select id="re-level" value={f.level} onChange={(e) => set({ level: e.target.value })}><option value="">unknown</option><option>easy</option><option>medium</option><option>involved</option></select>
          </span>
        </div>
        <label className="row"><input type="checkbox" checked={f.leftovers} onChange={(e) => set({ leftovers: e.target.checked })} /> Leftover-friendly</label>

        <fieldset className="stack">
          <legend>Components</legend>
          {f.components.map((c, i) => {
            const usedBy = f.rows.filter((r) => r.componentKey === c.key && (r.ingredientName.trim() || r.quantity.trim())).length;
            return (
              <div key={c.id} className="row">
                <span className="stack grow">
                  <input {...fieldProps(`re-c-${c.id}`, errors)} aria-label={`Component ${i + 1} name`} value={c.name}
                    onChange={(e) => { const name = e.target.value; edit((d) => ({ ...d, components: d.components.map((x) => (x.id === c.id ? { ...x, name, key: x.key || name.toLowerCase().replace(/\W+/g, "_") } : x)) })); }} />
                  <FieldError id={`re-c-${c.id}`} errors={errors} />
                </span>
                <button type="button" className="link small" disabled={f.components.length < 2 || usedBy > 0}
                  aria-label={`Remove component ${i + 1}${c.name ? ` (${c.name})` : ""}${usedBy ? ` — used by ${usedBy} ingredient${usedBy === 1 ? "" : "s"}` : ""}`}
                  onClick={() => removeComponent(i)}>remove</button>
              </div>
            );
          })}
          <button type="button" id="re-add-comp" className="link small" onClick={addComponent}>add component</button>
        </fieldset>

        <fieldset className="stack" id="re-rows" tabIndex={-1} aria-describedby={errors["re-rows"] ? "re-rows-error" : undefined}>
          <legend>Ingredients</legend>
          {f.rows.map((row, i) => {
            const n = `Ingredient ${i + 1}`;
            return (
              <div key={row.id} className="ingredient-row" role="group" aria-label={`${n}${row.ingredientName ? `: ${row.ingredientName}` : ""}`}>
                <span className="stack grow">
                  <input {...fieldProps(`re-n-${row.id}`, errors)} aria-label={`${n} name`} value={row.ingredientName} onChange={(e) => setRow(row.id, { ingredientName: e.target.value, ingredientKey: null })} />
                  <FieldError id={`re-n-${row.id}`} errors={errors} />
                </span>
                <span className="stack">
                  <input {...fieldProps(`re-q-${row.id}`, errors)} className="tiny" inputMode="decimal" aria-label={`${n} amount`} value={row.quantity} onChange={(e) => setRow(row.id, { quantity: e.target.value })} />
                  <FieldError id={`re-q-${row.id}`} errors={errors} />
                </span>
                <span className="stack">
                  <input {...fieldProps(`re-u-${row.id}`, errors)} className="tiny" aria-label={`${n} unit`} value={row.unit} onChange={(e) => setRow(row.id, { unit: e.target.value })} />
                  <FieldError id={`re-u-${row.id}`} errors={errors} />
                </span>
                <select aria-label={`${n} component`} value={row.componentKey} onChange={(e) => setRow(row.id, { componentKey: e.target.value })}>
                  {f.components.map((c) => <option key={c.id} value={c.key}>{c.name || c.key}</option>)}
                </select>
                <button type="button" id={`re-rm-${row.id}`} className="link small" disabled={f.rows.length < 2}
                  aria-label={`Remove ${n.toLowerCase()}${row.ingredientName ? ` (${row.ingredientName}, ${compLabel(row.componentKey)})` : ""}`} onClick={() => removeRow(i)}>remove</button>
              </div>
            );
          })}
          <FieldError id="re-rows" errors={errors} />
          <button type="button" id="re-add-row" className="link small" onClick={addRow}>add ingredient</button>
        </fieldset>

        <label htmlFor="re-steps">Steps</label>
        <textarea id="re-steps" value={f.instructions} onChange={(e) => set({ instructions: e.target.value })} rows={5} />
        <label htmlFor="re-reheat">Reheat and serve</label>
        <textarea id="re-reheat" value={f.reheat} onChange={(e) => set({ reheat: e.target.value })} rows={2} />
        {conflict && <p className="small warn" id="re-save-held">Decide {pending.map((k) => FIELD_LABEL[k]).join(", ")} above before saving.</p>}
        <button id="re-save" className="btn primary" disabled={busy || conflict || !writesAllowed} aria-describedby={conflict ? "re-save-held" : undefined}>{recipeId ? "Save new version" : "Save recipe"}</button>
      </form>
    </ModalSheet>
  );
}
