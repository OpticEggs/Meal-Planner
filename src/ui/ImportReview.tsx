"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "./store";
import { ModalSheet } from "./a11y";
import { FormAlert } from "./forms";
import { KNOWN_UNITS } from "@/domain/units";
import { draftProblems, perPortion, type DraftLine, type LineDecision } from "@/domain/recipes/import";

/* eslint-disable @typescript-eslint/no-explicit-any */

const opId = () => `imp-${crypto.randomUUID()}`;

type Edit = { title: string; servings: string; effort: string; instructions: string; lines: DraftLine[] };
const fromDraft = (d: any): Edit => ({
  title: d.title ?? "", servings: d.servings ? String(d.servings) : "", effort: d.effortMinutes ? String(d.effortMinutes) : "",
  instructions: d.householdInstructions ?? "", lines: JSON.parse(JSON.stringify(d.lines ?? [])),
});

/**
 * Import review. Nothing here makes a recipe until "Create recipe": the member sees each original
 * ingredient line next to what was read from it, decides it (amount + unit, or leave it out), enters
 * servings, and only a complete review is confirmed. The source's method stays on its site.
 */
export function ImportReviewDialog({ bookmark, onClose }: { bookmark: any; onClose: () => void }) {
  const { library } = useStore();
  const live = library?.bookmarks?.find((b: any) => b.id === bookmark.id) ?? bookmark;
  const label = live.title ?? live.sourceLabel;
  return (
    <ModalSheet title={live.draft ? "Review the import" : "Import ingredients"} subtitle={label} closeLabel="Close import" onClose={onClose} returnFocus={() => undefined} testId="import-dialog">
      {live.recipeId ? (
        <p role="status">Imported — the recipe is in Our Recipes.</p>
      ) : live.draft ? (
        <DraftReview b={live} onDone={onClose} />
      ) : (
        <StartImport b={live} />
      )}
    </ModalSheet>
  );
}

function StartImport({ b }: { b: any }) {
  const { command, loadLibrary } = useStore();
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [paste, setPaste] = useState("");
  const [title, setTitle] = useState(b.title ?? "");
  const [error, setError] = useState<string | null>(null);
  const read = async (candidate?: number) => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/imports", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ bookmarkId: b.id, operationId: opId(), candidate }),
    }).then((x) => x.json(), () => ({ kind: "not_read", status: "rejected", message: "Table couldn't be reached. Nothing changed." }));
    setBusy(false);
    setResult(r);
    await loadLibrary();
  };
  const canRead = b.status !== "unsupported" && b.status !== "permission_blocked";
  return (
    <div className="stack">
      <FormAlert message={error} testId="import-error" />
      {canRead && (
        <section className="stack" aria-labelledby="import-read-h">
          <h3 id="import-read-h" className="h3" style={{ margin: 0 }}>Read the recipe page</h3>
          <p className="small" style={{ margin: 0 }}>Table looks only for the page&apos;s structured ingredient list, servings and time. It doesn&apos;t copy the method or photos, and nothing becomes a recipe until you confirm it.</p>
          <button type="button" className="btn line" data-autofocus="" disabled={busy} onClick={() => read()} data-testid="import-read">Read ingredients from the page</button>
        </section>
      )}
      {result?.kind === "choose" && (
        <fieldset className="stack" data-testid="import-choose">
          <legend>This page has more than one recipe. Which one?</legend>
          {result.options.map((o: any) => (
            <button key={o.index} type="button" className="btn line" onClick={() => read(o.index)}>{o.name} ({o.ingredientCount} ingredients)</button>
          ))}
        </fieldset>
      )}
      {(result?.kind === "not_read" || !canRead) && (
        <p role="status" className="small warn" data-testid="import-not-read">{result?.message ?? b.statusDetail ?? "This page can't be read."} The link stays saved.</p>
      )}
      <section className="stack" aria-labelledby="import-paste-h">
        <h3 id="import-paste-h" className="h3" style={{ margin: 0 }}>Or paste the ingredient lines</h3>
        <label htmlFor="import-title">Recipe name</label>
        <input id="import-title" value={title} onChange={(e) => setTitle(e.target.value)} {...(!canRead ? { "data-autofocus": "" } : {})} />
        <label htmlFor="import-paste">Ingredients, one per line</label>
        <textarea id="import-paste" rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"2 cups rice\n1 lb chicken thighs\nsalt to taste"} />
        <button type="button" className="btn primary" disabled={busy} data-testid="import-paste-start" onClick={async () => {
          const r = await command("PasteIngredients", { bookmarkId: b.id, text: paste, title });
          if (r.status !== "accepted") setError(r.message);
        }}>Start review</button>
      </section>
    </div>
  );
}

function DraftReview({ b, onDone }: { b: any; onDone: () => void }) {
  const { command } = useStore();
  const d = b.draft;
  const [edit, setEdit] = useState<Edit>(() => fromDraft(d));
  const [base, setBase] = useState<number>(d.revision);
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const own = useRef<number | null>(null);
  const changedElsewhere = d.revision !== base && d.revision !== own.current;
  useEffect(() => {
    if (d.revision === own.current) setBase(d.revision);
  }, [d.revision]);
  const servings = /^\d+$/.test(edit.servings) ? Number(edit.servings) : null;
  const live = draftProblems({ title: edit.title, servings, lines: edit.lines });
  const setDecision = (i: number, dec: LineDecision | null) => setEdit((e) => ({ ...e, lines: e.lines.map((l, k) => (k === i ? { ...l, decision: dec } : l)) }));
  const save = async (): Promise<number | null> => {
    const r = await command("UpdateImportDraft", {
      draftId: d.id, expectedRevision: base, title: edit.title, servings, effortMinutes: /^\d+$/.test(edit.effort) ? Number(edit.effort) : null,
      householdInstructions: edit.instructions, decisions: edit.lines.map((l, index) => ({ index, decision: l.decision })),
    });
    if (r.status !== "accepted") {
      setError(r.message);
      return null;
    }
    own.current = r.result.revision;
    setBase(r.result.revision);
    return r.result.revision;
  };
  return (
    <div className="stack" data-testid="import-review">
      <FormAlert message={error} testId="import-review-error" />
      {changedElsewhere && (
        <div className="warnbox" role="status" data-testid="import-changed">
          The other member changed this import. Your edits are still here, but saving them is refused until you load the current version.
          <button type="button" className="btn line small" onClick={() => { setEdit(fromDraft(d)); setBase(d.revision); setError(null); }}>Load the current version</button>
        </div>
      )}
      <p className="small faint" style={{ margin: 0 }}>
        {d.method === "json_ld" ? "Read from the page's structured recipe data." : "From the lines you pasted."}
        {d.sourceHasInstructions ? " The method stays on the source site." : ""}
        {d.sourceHasNutrition ? " The page's nutrition claims are not used." : ""}
        {d.yieldText ? ` The page says it makes: ${d.yieldText}.` : ""}
      </p>
      <label htmlFor="draft-title">Recipe name</label>
      <input id="draft-title" data-autofocus="" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
      <div className="grid4">
        <label>Servings the amounts make<input inputMode="numeric" value={edit.servings} onChange={(e) => setEdit({ ...edit, servings: e.target.value })} data-testid="draft-servings" /></label>
        <label>Time (minutes)<input inputMode="numeric" value={edit.effort} onChange={(e) => setEdit({ ...edit, effort: e.target.value })} /></label>
      </div>
      <fieldset className="stack">
        <legend>Ingredients</legend>
        <ol className="plain" data-testid="draft-lines">
          {edit.lines.map((l, i) => (
            <LineRow key={i} i={i} line={l} servings={servings} onChange={(dec) => setDecision(i, dec)} />
          ))}
        </ol>
      </fieldset>
      <label htmlFor="draft-instructions">Your own notes on how you make it (optional)</label>
      <textarea id="draft-instructions" rows={3} value={edit.instructions} onChange={(e) => setEdit({ ...edit, instructions: e.target.value })} />
      {(live.length > 0 || problems.length > 0) && (
        <ul className="small warn" data-testid="draft-problems" aria-label="Before this can become a recipe">
          {(problems.length ? problems : live).map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
      <div className="row">
        <button type="button" className="btn line" disabled={busy || changedElsewhere} onClick={async () => { setBusy(true); await save(); setBusy(false); }}>Save review</button>
        <button type="button" className="btn primary" disabled={busy || changedElsewhere || live.length > 0} data-testid="import-confirm" onClick={async () => {
          setBusy(true);
          const rev = await save();
          if (rev !== null) {
            const r = await command("ConfirmImportDraft", { draftId: d.id, expectedRevision: rev });
            if (r.status === "accepted") {
              setBusy(false);
              onDone();
              return;
            }
            setError(r.message);
            setProblems((r.details as any)?.problems ?? []);
          }
          setBusy(false);
        }}>Create recipe</button>
        <button type="button" className="btn line danger" disabled={busy} onClick={async () => {
          const r = await command("DiscardImportDraft", { draftId: d.id, expectedRevision: base });
          if (r.status !== "accepted") setError(r.message);
        }}>Discard import</button>
      </div>
    </div>
  );
}

function LineRow({ i, line, servings, onChange }: { i: number; line: DraftLine; servings: number | null; onChange: (d: LineDecision | null) => void }) {
  const dec = line.decision;
  const use = dec?.use ? dec : null;
  const proposal = { name: line.parsed.name, quantity: line.parsed.quantity ?? "", unit: line.parsed.unit ?? "", form: line.parsed.form ?? "raw" };
  const each = use && servings && /^\d+(\.\d+)?$/.test(use.quantity) ? perPortion(use.quantity, servings) : null;
  const name = `line-${i}`;
  return (
    <li className="card stack" data-testid="draft-line" data-raw={line.raw}>
      <div className="small"><span className="faint">Source line:</span> {line.raw}</div>
      {line.parsed.status === "requires_review" && <div className="small warn">Needs your review: {line.parsed.reasons.join("; ") || "Table couldn't read an amount and unit."}</div>}
      <div className="seg" role="radiogroup" aria-label={`Line ${i + 1}: ${line.raw}`}>
        <label className="btn line small"><input type="radio" name={name} checked={!!use} onChange={() => onChange({ use: true, name: proposal.name, quantity: proposal.quantity, unit: proposal.unit, form: proposal.form as "raw" | "cooked" })} /> Use</label>
        <label className="btn line small"><input type="radio" name={name} checked={dec?.use === false} onChange={() => onChange({ use: false })} /> Leave out of groceries</label>
      </div>
      {!dec && <div className="small faint">Undecided</div>}
      {use && (
        <div className="grid4">
          <label>Ingredient<input value={use.name} onChange={(e) => onChange({ ...use, name: e.target.value })} aria-label={`Ingredient name, line ${i + 1}`} /></label>
          <label>Amount (whole recipe)<input inputMode="decimal" value={use.quantity} onChange={(e) => onChange({ ...use, quantity: e.target.value.trim() })} aria-label={`Amount for the whole recipe, line ${i + 1}`} /></label>
          <label>Unit<select value={use.unit} onChange={(e) => onChange({ ...use, unit: e.target.value })} aria-label={`Unit, line ${i + 1}`}>
            <option value="">Choose…</option>{KNOWN_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select></label>
          <label>Form<select value={use.form} onChange={(e) => onChange({ ...use, form: e.target.value as "raw" | "cooked" })} aria-label={`Form, line ${i + 1}`}>
            <option value="raw">raw / as bought</option><option value="cooked">cooked</option>
          </select></label>
        </div>
      )}
      {each && <div className="small faint">{each.value} {use!.unit} per serving{each.rounded ? " (rounded to 4 decimal places)" : ""}</div>}
    </li>
  );
}
