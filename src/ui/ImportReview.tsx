"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useStore } from "./store";
import { ModalSheet } from "./a11y";
import { FormAlert } from "./forms";
import { KNOWN_UNITS } from "@/domain/units";
import { displayAmount, parseAmount } from "@/domain/quantity";
import { draftProblems, titleFromUrl, type DraftLine, type LineDecision } from "@/domain/recipes/import";
import { RecipeHero } from "./Tile";

/* eslint-disable @typescript-eslint/no-explicit-any */

const opId = () => `imp-${crypto.randomUUID()}`;

type Edit = { title: string; servings: string; effort: string; instructions: string; lines: DraftLine[] };
const fromDraft = (d: any): Edit => ({
  title: d.title ?? "", servings: d.servings ? String(d.servings) : "", effort: d.effortMinutes ? String(d.effortMinutes) : "",
  instructions: d.householdInstructions ?? "", lines: JSON.parse(JSON.stringify(d.lines ?? [])),
});

const UNIT_WORDS: Record<string, string> = { each: "", fl_oz: "fl oz" };
const unitText = (u: string, many: boolean) => (u in UNIT_WORDS ? UNIT_WORDS[u] : u === "cup" && many ? "cups" : u);
/** "⅓ cup", "1 ½ cups", "2" (each). */
export const amountText = (quantity: string, unit: string) => {
  const shown = displayAmount(quantity);
  const many = !/^(?:1|[⅛¼⅓⅜½⅝⅔¾⅞⅕⅖⅗⅘⅙⅚]|1\/\d+|0\.\d+)$/.test(shown);
  const u = unitText(unit, many);
  return `${shown}${u ? ` ${u}` : ""}`;
};

/**
 * Import review (2026-10-09 overhaul). Nothing here makes a recipe until "Save recipe". Every line the
 * reader understood is already in as Use and shown as one clean row (amount · name); the few lines whose
 * amount or ingredient is genuinely uncertain open at the top with a small editor; salt and pepper are left
 * out as household seasonings. Any row opens the same editor, which shows the original source line.
 */
export function ImportReviewDialog({ bookmark, onClose, initial }: { bookmark: any; onClose: () => void; initial?: any }) {
  const { library } = useStore();
  const live = library?.bookmarks?.find((b: any) => b.id === bookmark.id) ?? bookmark;
  const label = live.draft?.title ?? live.title ?? live.sourceLabel ?? live.domain;
  return (
    <ModalSheet title={live.draft ? "Review the import" : "Import ingredients"} subtitle={label} closeLabel="Close import" onClose={onClose} returnFocus={() => undefined} testId="import-dialog">
      {live.recipeId ? (
        <p role="status">Imported — the recipe is in Our Recipes.</p>
      ) : live.draft ? (
        <DraftReview b={live} onDone={onClose} />
      ) : (
        <StartImport b={live} initial={initial?.kind === "draft" ? null : initial} />
      )}
    </ModalSheet>
  );
}

const SOCIAL = /^Posts on this site can't be imported/;

function StartImport({ b, initial }: { b: any; initial?: any }) {
  const { command, loadLibrary } = useStore();
  const [result, setResult] = useState<any>(initial ?? null);
  const [busy, setBusy] = useState(false);
  const [paste, setPaste] = useState("");
  const [title, setTitle] = useState(b.title ?? (b.url ? titleFromUrl(b.url) : null) ?? "");
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
  // A page that had no recipe data can be read again (sites change); a social post or a site that asks permission is never read.
  const canRead = b.status !== "permission_blocked" && !(b.status === "unsupported" && SOCIAL.test(b.statusDetail ?? ""));
  return (
    <div className="stack">
      <FormAlert message={error} testId="import-error" />
      {canRead && (
        <section className="stack" aria-labelledby="import-read-h">
          <h3 id="import-read-h" className="h3" style={{ margin: 0 }}>Read the recipe page</h3>
          <p className="small muted" style={{ margin: 0 }}>Table reads the page&apos;s recipe data: ingredients, servings, time and who published it. Nothing becomes a recipe until you save it.</p>
          <button type="button" className="btn primary" data-autofocus="" disabled={busy} onClick={() => read()} data-testid="import-read">{result || b.status !== "saved" ? "Try reading the page again" : "Read ingredients from the page"}</button>
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
        <textarea id="import-paste" rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"2 cups rice\n1 lb chicken thighs\n1/3 cup pesto"} />
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
  const indexed = edit.lines.map((l, i) => ({ l, i }));
  const check = indexed.filter(({ l }) => !l.decision);
  const using = indexed.filter(({ l }) => l.decision?.use);
  const left = indexed.filter(({ l }) => l.decision && !l.decision.use);
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
  const site = d.siteName ?? b.sourceLabel ?? b.domain;
  return (
    <div className="review" data-testid="import-review">
      <RecipeHero title={edit.title || d.title || site} imageId={d.imageId} credit={d.imageId ? `Photo: ${site}` : null} compact />
      <FormAlert message={error} testId="import-review-error" />
      {changedElsewhere && (
        <div className="warnbox" role="status" data-testid="import-changed">
          The other member changed this import. Your edits are still here, but saving them is refused until you load the current version.
          <button type="button" className="btn line small" onClick={() => { setEdit(fromDraft(d)); setBase(d.revision); setError(null); }}>Load the current version</button>
        </div>
      )}
      <div className="review-title">
        <label htmlFor="draft-title" className="eyebrow">Recipe name</label>
        <input id="draft-title" className="title-input" data-autofocus="" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
      </div>
      <DraftSource b={b} d={d} />
      <div className="facts">
        <label className="fact"><span>Serves</span><input inputMode="numeric" value={edit.servings} onChange={(e) => setEdit({ ...edit, servings: e.target.value })} data-testid="draft-servings" aria-label="Servings the amounts make" /></label>
        <label className="fact"><span>Minutes</span><input inputMode="numeric" value={edit.effort} onChange={(e) => setEdit({ ...edit, effort: e.target.value })} aria-label="Time (minutes)" /></label>
      </div>

      <p className="progress" data-testid="draft-progress" aria-live="off">
        <span><strong>{using.length}</strong> ready</span>
        {check.length > 0 && <span className="todo"><strong>{check.length}</strong> to check</span>}
        {left.length > 0 && <span><strong>{left.length}</strong> left out</span>}
      </p>

      {check.length > 0 && (
        <section aria-labelledby="check-h" className="group">
          <h3 id="check-h" className="group-title">Needs a quick check</h3>
          <ol className="rows" data-testid="draft-check">
            {check.map(({ l, i }) => <LineRow key={i} i={i} line={l} onChange={(dec) => setDecision(i, dec)} openByDefault />)}
          </ol>
        </section>
      )}
      <section aria-labelledby="ing-h" className="group">
        <h3 id="ing-h" className="group-title">Ingredients</h3>
        <ol className="rows" data-testid="draft-lines">
          {using.map(({ l, i }) => <LineRow key={i} i={i} line={l} onChange={(dec) => setDecision(i, dec)} />)}
        </ol>
      </section>
      {left.length > 0 && (
        <section aria-labelledby="left-h" className="group">
          <h3 id="left-h" className="group-title">Not added to groceries</h3>
          <ol className="rows" data-testid="draft-left-out">
            {left.map(({ l, i }) => <LineRow key={i} i={i} line={l} onChange={(dec) => setDecision(i, dec)} />)}
          </ol>
        </section>
      )}

      <details className="method" open={!!d.stepsKept}>
        <summary>{d.stepsKept ? `Method (kept from ${site})` : "Your own notes on how you make it"}</summary>
        <label htmlFor="draft-instructions" className="sr-only">{d.stepsKept ? `Method (kept from ${site}; edit as you like)` : "Your own notes on how you make it (optional)"}</label>
        <textarea id="draft-instructions" rows={d.stepsKept ? 8 : 3} value={edit.instructions} onChange={(e) => setEdit({ ...edit, instructions: e.target.value })} />
      </details>

      {(live.length > 0 || problems.length > 0) && (
        <ul className="small warn problems" data-testid="draft-problems" aria-label="Before this can become a recipe">
          {(problems.length ? problems : live).map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
      <div className="review-actions">
        <button type="button" className="btn primary big" disabled={busy || changedElsewhere || live.length > 0} data-testid="import-confirm" onClick={async () => {
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
        }}>Save recipe</button>
      </div>
      <div className="row between review-secondary">
          <button type="button" className="btn quiet" disabled={busy || changedElsewhere} onClick={async () => { setBusy(true); await save(); setBusy(false); }}>Save review for later</button>
          <button type="button" className="btn quiet danger-text" disabled={busy} onClick={async () => {
            const r = await command("DiscardImportDraft", { draftId: d.id, expectedRevision: base });
            if (r.status !== "accepted") setError(r.message);
          }}>Discard import</button>
      </div>
    </div>
  );
}

/** Why a line is where it is, in a few words. */
function lineStatus(line: DraftLine): string | null {
  const p = line.parsed;
  if (line.decision && !line.decision.use) return p.status === "omitted" ? "Household seasoning — you have it" : "Left out by you";
  if (line.decision) return null;
  if (p.alternatives?.length) return "Which one will you use?";
  if (p.range) return `The recipe says ${displayAmount(p.range[0])}–${displayAmount(p.range[1])}`;
  const r = p.reasons?.[0] ?? "Table couldn't read the amount";
  return r.replace(/^No amount given \((.*)\)$/, "No amount given ($1)");
}

function LineRow({ i, line, onChange, openByDefault }: { i: number; line: DraftLine; onChange: (d: LineDecision | null) => void; openByDefault?: boolean }) {
  const [open, setOpen] = useState(!!openByDefault);
  const id = useId();
  const dec = line.decision;
  const p = line.parsed;
  const use = dec?.use ? dec : null;
  const status = lineStatus(line);
  const name = use?.name ?? (p.name || p.alternatives?.[0] || "");
  const summary = use ? `${amountText(use.quantity, use.unit)} ${use.name}` : name || line.raw;
  const draft = use ?? { use: true as const, name: p.name ?? "", quantity: p.quantity ?? "", unit: p.unit ?? "", form: (p.form ?? "raw") as "raw" | "cooked" };
  const [form, setForm] = useState(draft);
  useEffect(() => setForm(draft), [JSON.stringify(dec)]); // eslint-disable-line react-hooks/exhaustive-deps
  const amountOk = !!parseAmount(form.quantity) && KNOWN_UNITS.includes(form.unit) && form.name.trim().length > 0;
  const kind = !dec ? "check" : dec.use ? "use" : "out";
  return (
    <li className={`row-item ${kind}`} data-testid="draft-line" data-raw={line.raw} data-state={kind}>
      <button type="button" className="row-main" aria-expanded={open} aria-controls={`${id}-ed`} onClick={() => setOpen((o) => !o)}>
        <span className="row-text">
          {use ? (
            <span className="line1"><span className="amt">{amountText(use.quantity, use.unit)}</span> <span className="nm">{use.name}</span></span>
          ) : (
            <span className="line1"><span className="nm">{summary}</span></span>
          )}
          {use && p.note ? <span className="note">{p.note}</span> : null}
          {status ? <span className={`why ${kind}`}>{status}</span> : null}
        </span>
        <span className="chev" aria-hidden="true">{open ? "▴" : "▾"}</span>
        <span className="sr-only">{open ? "Close" : kind === "check" ? "Fix" : "Change"} line {i + 1}</span>
      </button>
      {open && (
        <div className="row-editor" id={`${id}-ed`}>
          <p className="source"><span className="eyebrow">From the recipe</span> {line.raw}</p>
          {p.alternatives?.length ? (
            <div className="choices" role="group" aria-label={`Line ${i + 1}: which ingredient`}>
              {p.alternatives.map((a) => (
                <button key={a} type="button" className={`chip-btn ${form.name === a ? "on" : ""}`} aria-pressed={form.name === a} onClick={() => setForm({ ...form, name: a })}>{a}</button>
              ))}
            </div>
          ) : null}
          <div className="editor-grid">
            <label className="amount">Amount<input inputMode="text" value={form.quantity} placeholder={p.range ? `${p.range[0]}–${p.range[1]}` : "e.g. 1/3"} onChange={(e) => setForm({ ...form, quantity: e.target.value })} aria-label={`Amount for the whole recipe, line ${i + 1}`} /></label>
            <label className="unit">Unit<select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} aria-label={`Unit, line ${i + 1}`}>
              <option value="">Choose…</option>{KNOWN_UNITS.map((u) => <option key={u} value={u}>{u === "fl_oz" ? "fl oz" : u}</option>)}
            </select></label>
            <label className="name">Ingredient<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label={`Ingredient name, line ${i + 1}`} /></label>
            <label className="form">Bought<select value={form.form} onChange={(e) => setForm({ ...form, form: e.target.value as "raw" | "cooked" })} aria-label={`Form, line ${i + 1}`}>
              <option value="raw">raw / as bought</option><option value="cooked">cooked</option>
            </select></label>
          </div>
          {!amountOk && form.quantity && !parseAmount(form.quantity) && <p className="field-error small">Use a number or fraction, like 2, 1/3 or 1 1/2.</p>}
          <div className="row">
            <button type="button" className="btn primary small" disabled={!amountOk} onClick={() => { onChange({ ...form, use: true, quantity: form.quantity.trim() }); setOpen(false); }} aria-label={`Use line ${i + 1}: ${line.raw}`}>Use</button>
            <button type="button" className="btn line small" onClick={() => { onChange({ use: false }); setOpen(false); }} aria-label={`Leave out line ${i + 1}: ${line.raw}`}>Leave out</button>
          </div>
        </div>
      )}
    </li>
  );
}

/** What was read and from where: site, author, description, and what of the page's own content was kept. */
function DraftSource({ b, d }: { b: any; d: any }) {
  const site = d.siteName ?? b.sourceLabel ?? b.domain;
  const kept = d.policy ?? { instructions: false, photos: false, basis: null };
  return (
    <div className="source-block" data-testid="draft-source">
      <p className="small" style={{ margin: 0 }}>
        {d.method === "user_pasted" ? "From the lines you pasted" : `Read from ${site}`}
        {d.author ? ` · by ${d.author}` : ""}
        {b.url ? <> · <a href={b.url} target="_blank" rel="noopener noreferrer nofollow">Open the original ↗</a></> : null}
      </p>
      {d.description ? <p className="small muted" style={{ margin: 0 }}>{d.description}</p> : null}
      <p className="small faint" style={{ margin: 0 }} data-testid="draft-kept">
        {d.method === "microdata" ? "Read from the page's older recipe markup. " : ""}
        {d.stepsKept
          ? `The page's method (${d.stepCount} ${d.stepCount === 1 ? "step" : "steps"}) was kept (${kept.basis}). `
          : d.stepCount > 0 || d.sourceHasInstructions ? `The method stays on the source site. The recipe links to it${d.stepCount > 0 ? ` (${d.stepCount} ${d.stepCount === 1 ? "step" : "steps"})` : ""}. ` : ""}
        {d.imageId ? `Its photo was kept (${kept.basis}). ` : d.imageCount > 0 ? "Its photo isn't kept (no permission recorded) — you can add your own after saving. " : ""}
        {d.sourceHasNutrition ? "The page's nutrition claims are not used. " : ""}
        {d.yieldText ? `The page says it makes: ${d.yieldText}.` : ""}
      </p>
    </div>
  );
}
