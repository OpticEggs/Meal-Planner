"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useStore } from "./store";
import { ConfirmBox, ModalSheet } from "./a11y";
import { FormAlert } from "./forms";
import { KNOWN_UNITS } from "@/domain/units";
import { displayAmount, parseAmount } from "@/domain/quantity";
import {
  draftProblems, hasNoAmount, headingName, isHeading, isHeadingLine, isLeftOut, needsQuantity, titleFromUrl, type DraftLine, type LineDecision,
} from "@/domain/recipes/import";
import { RecipeHero } from "./Tile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";

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

/** How the review's parts tell the sheet about unsaved work (CF: backdrop, Escape and Close never lose it). */
type Report = { setDirty: (dirty: boolean) => void; setSaver?: (s: { run: () => Promise<boolean> } | null) => void };

/**
 * Import review (2026-10-09 overhaul). Nothing here makes a recipe until "Save recipe". Every line the
 * reader understood is already in as Use and shown as one clean row (amount · name); the few lines whose
 * amount or ingredient is genuinely uncertain open at the top with a small editor; salt and pepper are left
 * out as household seasonings. Any row opens the same editor, which shows the original source line.
 * Catalog-first (2026-10-11): group headings show as headings (Q5); a line with no amount at all is kept as
 * "Needs a quantity" (Q6); an edited review is never lost to a click outside, Escape or Close (the shared guard).
 */
export function ImportReviewDialog({ bookmark, onClose, initial, returnFocus }: { bookmark: any; onClose: () => void; initial?: any; returnFocus?: () => void }) {
  const { library } = useStore();
  const live = library?.bookmarks?.find((b: any) => b.id === bookmark.id) ?? bookmark;
  const label = live.draft?.title ?? live.title ?? live.sourceLabel ?? live.domain;
  const [dirty, setDirty] = useState(false);
  const [saver, setSaver] = useState<{ run: () => Promise<boolean> } | null>(null);
  const report = useRef<Report>({ setDirty, setSaver }).current;
  return (
    <ModalSheet title={live.draft ? "Review the import" : "Import ingredients"} subtitle={label} closeLabel="Close import" onClose={onClose}
      returnFocus={returnFocus ?? (() => undefined)} testId="import-dialog"
      guard={{ dirty: dirty && !live.recipeId, saveForLater: saver?.run }}>
      {live.recipeId ? (
        <p role="status">Imported — the recipe is in Our Recipes.</p>
      ) : live.draft ? (
        <DraftReview b={live} onDone={onClose} report={report} />
      ) : (
        <StartImport b={live} initial={initial?.kind === "draft" ? null : initial} report={report} />
      )}
    </ModalSheet>
  );
}

const SOCIAL = /^Posts on this site can't be imported/;

function StartImport({ b, initial, report }: { b: any; initial?: any; report: Report }) {
  const { command, loadLibrary } = useStore();
  const [result, setResult] = useState<any>(initial ?? null);
  const [busy, setBusy] = useState(false);
  const [paste, setPaste] = useState("");
  const [startTitle] = useState<string>(b.title ?? (b.url ? titleFromUrl(b.url) : null) ?? "");
  const [title, setTitle] = useState(startTitle);
  const [error, setError] = useState<string | null>(null);
  // Pasted lines or a changed name are work: closing asks first.
  const dirty = paste.trim() !== "" || title !== startTitle;
  useEffect(() => report.setDirty(dirty), [dirty, report]);
  useEffect(() => () => report.setDirty(false), [report]);
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
          <Button type="button" variant="default" data-autofocus="" disabled={busy} onClick={() => read()} data-testid="import-read">{result || b.status !== "saved" ? "Try reading the page again" : "Read ingredients from the page"}</Button>
        </section>
      )}
      {result?.kind === "choose" && (
        <fieldset className="stack" data-testid="import-choose">
          <legend>This page has more than one recipe. Which one?</legend>
          {result.options.map((o: any) => (
            <Button key={o.index} type="button" variant="outline" onClick={() => read(o.index)}>{o.name} ({o.ingredientCount} ingredients)</Button>
          ))}
        </fieldset>
      )}
      {(result?.kind === "not_read" || !canRead) && (
        <p role="status" className="small warn" data-testid="import-not-read">{result?.message ?? b.statusDetail ?? "This page can't be read."} The link stays saved.</p>
      )}
      <section className="stack" aria-labelledby="import-paste-h">
        <h3 id="import-paste-h" className="h3" style={{ margin: 0 }}>Or paste the ingredient lines</h3>
        <label htmlFor="import-title">Recipe name</label>
        <Input id="import-title" value={title} onChange={(e) => setTitle(e.target.value)} {...(!canRead ? { "data-autofocus": "" } : {})} />
        <label htmlFor="import-paste">Ingredients, one per line</label>
        <Textarea id="import-paste" rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"2 cups rice\n1 lb chicken thighs\n1/3 cup pesto"} />
        <Button type="button" variant="default" disabled={busy} data-testid="import-paste-start" onClick={async () => {
          const r = await command("PasteIngredients", { bookmarkId: b.id, text: paste, title });
          if (r.status !== "accepted") setError(r.message);
        }}>Start review</Button>
      </section>
    </div>
  );
}

/** What the review holds that a save would store: compared with what was last loaded or saved. */
const snapshot = (e: Edit) => JSON.stringify([e.title, e.servings, e.effort, e.instructions, e.lines.map((l) => l.decision)]);

function DraftReview({ b, onDone, report }: { b: any; onDone: () => void; report: Report }) {
  const { command } = useStore();
  const d = b.draft;
  const [edit, setEdit] = useState<Edit>(() => fromDraft(d));
  const [saved, setSaved] = useState<string>(() => snapshot(fromDraft(d)));
  const [base, setBase] = useState<number>(d.revision);
  const [askDiscard, setAskDiscard] = useState(false);
  const discardRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const own = useRef<number | null>(null);
  // RIO-03: rows whose editor holds a change not yet applied with "Use" (index → name and what is typed). A typed
  // change is never silently dropped. D158: saving applies every such change that is complete; one that is not
  // (no amount, unit or name) holds the save and that row's exact field is shown and focused.
  const [pending, setPending] = useState<Record<number, PendingRow>>({});
  // Which save was last held ("confirm": Save recipe; "later": Save for later): its blockers are listed, live.
  const [heldFor, setHeldFor] = useState<"confirm" | "later" | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  // After Use, Leave out or Cancel the row's editor closes (and the row may move to another group): focus
  // goes back to that row's main button instead of falling to the page.
  const [settled, setSettled] = useState<number | null>(null);
  const onSettled = useCallback((i: number | null) => setSettled(i), []);
  const onPending = useCallback((i: number, row: PendingRow | null) => setPending((p) => {
    if (JSON.stringify(p[i] ?? null) === JSON.stringify(row)) return p;
    const next = { ...p };
    if (row === null) delete next[i];
    else next[i] = row;
    return next;
  }), []);
  const pendingList = Object.entries(pending).map(([i, n]) => ({ i: Number(i), n })).sort((a, b) => a.i - b.i);
  /**
   * D158 — what Save works from: the review with every complete typed change applied (as "Use" would), or, when
   * a row cannot be applied, null — the first such row is opened, its missing field focused, and each is named.
   * `confirm`: also every line still to check (Save recipe needs them settled; Save for later does not).
   */
  const prepare = (confirm: boolean): Edit | null => {
    const { next, blocked } = blockers(edit, pending, confirm);
    if (next !== edit) setEdit(next);
    if (!blocked.length) {
      setHeldFor(null);
      return next;
    }
    setHeldFor(confirm ? "confirm" : "later");
    setReveal((r) => ({ i: blocked[0].i, field: blocked[0].field, tick: (r?.tick ?? 0) + 1 }));
    return null;
  };
  const held = heldFor ? blockers(edit, pending, heldFor === "confirm").blocked.map((b) => b.msg) : [];
  const changedElsewhere = d.revision !== base && d.revision !== own.current;
  useEffect(() => {
    if (d.revision === own.current) setBase(d.revision);
  }, [d.revision]);
  const servings = /^\d+$/.test(edit.servings) ? Number(edit.servings) : null;
  const live = draftProblems({ title: edit.title, servings, lines: edit.lines });
  const setDecision = (i: number, dec: LineDecision | null) => setEdit((e) => ({ ...e, lines: e.lines.map((l, k) => (k === i ? { ...l, decision: dec } : l)) }));
  const indexed = edit.lines.map((l, i) => ({ l, i }));
  const check = indexed.filter(({ l }) => !l.decision);
  // The recipe as it will be saved, in the page's order: group headings (Q5), rows with an amount, and rows that
  // need a quantity (Q6).
  const kept = indexed.filter(({ l }) => l.decision?.use || isHeading(l.decision) || needsQuantity(l.decision));
  const using = indexed.filter(({ l }) => l.decision?.use);
  const unquantified = indexed.filter(({ l }) => needsQuantity(l.decision));
  const left = indexed.filter(({ l }) => isLeftOut(l.decision));
  const dirty = snapshot(edit) !== saved || pendingList.length > 0;
  useEffect(() => report.setDirty(dirty), [dirty, report]);
  const save = async (e: Edit): Promise<number | null> => {
    const at = snapshot(e);
    const r = await command("UpdateImportDraft", {
      draftId: d.id, expectedRevision: base, title: e.title, servings: /^\d+$/.test(e.servings) ? Number(e.servings) : null, effortMinutes: /^\d+$/.test(e.effort) ? Number(e.effort) : null,
      householdInstructions: e.instructions, decisions: e.lines.map((l, index) => ({ index, decision: l.decision })),
    });
    if (r.status !== "accepted") {
      setError(r.message);
      return null;
    }
    own.current = r.result.revision;
    setBase(r.result.revision);
    setSaved(at);
    return r.result.revision;
  };
  // "Save for later" from the close confirmation: the same save as the button below; a row holding a change not
  // applied yet is shown instead (it can't be saved, and is never dropped).
  const saveForLater = useRef<() => Promise<boolean>>(async () => false);
  saveForLater.current = async () => {
    const e = prepare(false);
    if (!e) return false;
    setBusy(true);
    const rev = await save(e);
    setBusy(false);
    return rev !== null;
  };
  useEffect(() => {
    report.setSaver?.({ run: () => saveForLater.current() });
    return () => {
      report.setSaver?.(null);
      report.setDirty(false);
    };
  }, [report]);
  const site = d.siteName ?? b.sourceLabel ?? b.domain;
  return (
    <div className="review" data-testid="import-review">
      <RecipeHero title={edit.title || d.title || site} imageId={d.imageId} credit={d.imageId ? `Photo: ${site}` : null} compact />
      <FormAlert message={error} testId="import-review-error" />
      {changedElsewhere && (
        <div className="warnbox" role="status" data-testid="import-changed">
          The other member changed this import. Your edits are still here, but saving them is refused until you load the current version.
          <Button type="button" variant="outline" size="sm" onClick={() => { setEdit(fromDraft(d)); setSaved(snapshot(fromDraft(d))); setBase(d.revision); setError(null); }}>Load the current version</Button>
        </div>
      )}
      <div className="review-title">
        <label htmlFor="draft-title" className="eyebrow">Recipe name</label>
        <input id="draft-title" className="title-input" data-autofocus="" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
      </div>
      <DraftSource b={b} d={d} />
      <div className="facts">
        <label className="fact"><span>Serves</span><Input id="draft-servings" inputMode="numeric" value={edit.servings} onChange={(e) => setEdit({ ...edit, servings: e.target.value })} data-testid="draft-servings" aria-label="Servings the amounts make" /></label>
        <label className="fact"><span>Minutes</span><Input inputMode="numeric" value={edit.effort} onChange={(e) => setEdit({ ...edit, effort: e.target.value })} aria-label="Time (minutes)" /></label>
      </div>

      <p className="progress" data-testid="draft-progress" aria-live="off">
        <span><strong>{using.length}</strong> ready</span>
        {unquantified.length > 0 && <span><strong>{unquantified.length}</strong> need{unquantified.length === 1 ? "s" : ""} a quantity</span>}
        {check.length > 0 && <span className="todo"><strong>{check.length}</strong> to check</span>}
        {left.length > 0 && <span><strong>{left.length}</strong> left out</span>}
      </p>

      {check.length > 0 && (
        <section aria-labelledby="check-h" className="group">
          <h3 id="check-h" className="group-title">Needs a quick check</h3>
          <ol className="rows" data-testid="draft-check">
            {check.map(({ l, i }) => <LineRow key={i} i={i} line={l} onChange={(dec) => setDecision(i, dec)} onPending={onPending} reveal={reveal?.i === i ? reveal : null} settled={settled === i} onSettled={onSettled} openByDefault />)}
          </ol>
        </section>
      )}
      <section aria-labelledby="ing-h" className="group">
        <h3 id="ing-h" className="group-title">Ingredients</h3>
        <ol className="rows" data-testid="draft-lines">
          {kept.map(({ l, i }) => isHeading(l.decision) ? (
            <li key={i} className="row-heading" data-testid="draft-heading" data-raw={l.raw}>
              <h4>{headingName(l.raw)}</h4>
              <Button type="button" variant="ghost" size="sm" aria-label={`This is an ingredient, not a group heading: ${l.raw}`}
                onClick={() => { setDecision(i, null); setSettled(i); }}>This is an ingredient</Button>
            </li>
          ) : (
            <LineRow key={i} i={i} line={l} onChange={(dec) => setDecision(i, dec)} onPending={onPending} reveal={reveal?.i === i ? reveal : null} settled={settled === i} onSettled={onSettled} />
          ))}
        </ol>
      </section>
      {left.length > 0 && (
        <section aria-labelledby="left-h" className="group">
          <h3 id="left-h" className="group-title">Not added to groceries</h3>
          <ol className="rows" data-testid="draft-left-out">
            {left.map(({ l, i }) => <LineRow key={i} i={i} line={l} onChange={(dec) => setDecision(i, dec)} onPending={onPending} reveal={reveal?.i === i ? reveal : null} settled={settled === i} onSettled={onSettled} />)}
          </ol>
        </section>
      )}

      <details className="method" open={!!d.stepsKept}>
        <summary>{d.stepsKept ? `Method (kept from ${site})` : "Your own notes on how you make it"}</summary>
        <label htmlFor="draft-instructions" className="sr-only">{d.stepsKept ? `Method (kept from ${site}; edit as you like)` : "Your own notes on how you make it (optional)"}</label>
        <Textarea id="draft-instructions" rows={d.stepsKept ? 8 : 3} value={edit.instructions} onChange={(e) => setEdit({ ...edit, instructions: e.target.value })} />
      </details>

      {(held.length > 0 || live.length > 0 || problems.length > 0) && (
        <ul className="small warn problems" id="draft-problems" data-testid="draft-problems" aria-label="Before this can become a recipe">
          {(held.length ? [...held, ...live.filter((p) => !/quick check|^Line \d/.test(p))] : problems.length ? problems : live).map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
      <div className="review-actions">
        {/* D158: never silently disabled for the review's own state — pressing it applies typed changes or names and
            focuses exactly what is missing. */}
        <Button type="button" variant="default" size="lg" className="w-full" disabled={busy || changedElsewhere} data-testid="import-confirm"
          aria-describedby={live.length || held.length ? "draft-problems" : undefined} onClick={async () => {
          const e = prepare(true);
          if (!e) return;
          const ps = draftProblems({ title: e.title, servings: /^\d+$/.test(e.servings) ? Number(e.servings) : null, lines: e.lines });
          if (ps.length) {
            setHeldFor("confirm");
            document.getElementById(!e.title.trim() ? "draft-title" : "draft-servings")?.focus();
            return;
          }
          setBusy(true);
          const rev = await save(e);
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
        }}>Save recipe</Button>
      </div>
      <div className="row between review-secondary">
          <Button type="button" variant="ghost" disabled={busy || changedElsewhere} onClick={async () => { const e = prepare(false); if (!e) return; setBusy(true); await save(e); setBusy(false); }}>Save review for later</Button>
          <Button type="button" ref={discardRef} variant="ghost-destructive" disabled={busy} onClick={() => setAskDiscard(true)}>Discard import</Button>
      </div>
      {askDiscard && (
        // Discarding the import throws the review away: it asks first ("Keep the import" focused).
        <ConfirmBox testId="discard-import-confirm" text="Discard this import? The review and your decisions are removed; the link stays saved."
          actions={[
            { label: "Keep the import", onClick: () => { setAskDiscard(false); setTimeout(() => discardRef.current?.focus(), 0); } },
            {
              label: "Discard import", tone: "danger", disabled: busy, onClick: async () => {
                setBusy(true);
                const r = await command("DiscardImportDraft", { draftId: d.id, expectedRevision: base });
                setBusy(false);
                setAskDiscard(false);
                if (r.status !== "accepted") setError(r.message);
              },
            },
          ]} />
      )}
    </div>
  );
}

/** Why a line is where it is, in a few words. */
function lineStatus(line: DraftLine): string | null {
  const p = line.parsed;
  if (needsQuantity(line.decision)) return "Needs a quantity — you'll give an amount when shopping";
  if (line.decision && !line.decision.use) return p.status === "omitted" ? "Household seasoning — you have it" : "Left out by you";
  if (line.decision) return null;
  if (p.alternatives?.length) return "Which one will you use?";
  if (p.range) return `The recipe says ${displayAmount(p.range[0])}–${displayAmount(p.range[1])}`;
  const r = p.reasons?.[0] ?? "Table couldn't read the amount";
  return r.replace(/^No amount given \((.*)\)$/, "No amount given ($1)");
}

type Field = "amount" | "unit" | "name";
type RowForm = { name: string; quantity: string; unit: string; form: "raw" | "cooked" };
type PendingRow = { name: string; form: RowForm };
type Reveal = { i: number; field: Field; tick: number };
/** The first field a typed row still needs before it can be used, or null when it is complete. */
function missingField(f: RowForm): Field | null {
  if (!parseAmount(f.quantity)) return "amount";
  if (!KNOWN_UNITS.includes(f.unit)) return "unit";
  return f.name.trim() ? null : "name";
}
/** What an undecided line starts as in its editor. */
/** The review with every complete typed change applied, and what still blocks a save, in line order. */
function blockers(edit: Edit, pending: Record<number, PendingRow>, confirm: boolean): { next: Edit; blocked: { i: number; field: Field; msg: string }[] } {
  let next = edit;
  const blocked: { i: number; field: Field; msg: string }[] = [];
  for (const [k, n] of Object.entries(pending)) {
    const i = Number(k);
    const field = missingField(n.form);
    if (field) blocked.push({ i, field, msg: lineMessage(i, edit.lines[i], n.form, field) });
    else next = { ...next, lines: next.lines.map((l, j) => (j === i ? { ...l, decision: { use: true, name: n.form.name.trim(), quantity: n.form.quantity.trim(), unit: n.form.unit, form: n.form.form } } : l)) };
  }
  if (confirm) {
    next.lines.forEach((l, i) => {
      if (l.decision || pending[i]) return;
      const f = startForm(l);
      const field = missingField(f) ?? "amount";
      blocked.push({ i, field, msg: lineMessage(i, l, f, field) });
    });
  }
  blocked.sort((a, b) => a.i - b.i);
  return { next, blocked };
}
function startForm(line: DraftLine): RowForm {
  const p = line.parsed;
  return { name: p.name ?? "", quantity: p.quantity ?? "", unit: p.unit ?? "", form: (p.form ?? "raw") as "raw" | "cooked" };
}
function lineMessage(i: number, line: DraftLine, f: RowForm, field: Field): string {
  const who = `Line ${i + 1} (${f.name.trim() || line.parsed.name || line.raw})`;
  const p = line.parsed;
  if (field === "unit") return `${who}: choose a unit.`;
  if (field === "name") return p.alternatives?.length ? `${who}: choose ${p.alternatives.join(" or ")}.` : `${who}: give the ingredient's name.`;
  if (f.quantity.trim()) return `${who}: the amount isn't a number — use one like 2, 1/3 or 1 1/2.`;
  if (p.range) return `${who}: choose how much — the recipe says ${displayAmount(p.range[0])} to ${displayAmount(p.range[1])}.`;
  return `${who}: give an amount, or leave it out.`;
}

function LineRow({ i, line, onChange, onPending, reveal, settled, onSettled, openByDefault }: {
  i: number; line: DraftLine; onChange: (d: LineDecision | null) => void; onPending: (i: number, row: PendingRow | null) => void; reveal: Reveal | null;
  settled: boolean; onSettled: (i: number | null) => void; openByDefault?: boolean;
}) {
  const [open, setOpen] = useState(!!openByDefault);
  const mainRef = useRef<HTMLButtonElement>(null);
  const applyRef = useRef<HTMLButtonElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const unitRef = useRef<HTMLSelectElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const dec = line.decision;
  const p = line.parsed;
  const use = dec?.use ? dec : null;
  const unq = needsQuantity(dec) ? dec : null;
  const status = lineStatus(line);
  const name = use?.name ?? unq?.name ?? (p.name || p.alternatives?.[0] || "");
  const summary = use ? `${amountText(use.quantity, use.unit)} ${use.name}` : name || line.raw;
  const draft = use ?? { use: true as const, name: unq?.name ?? p.name ?? "", quantity: p.quantity ?? "", unit: p.unit ?? "", form: (p.form ?? "raw") as "raw" | "cooked" };
  const [form, setForm] = useState(draft);
  useEffect(() => setForm(draft), [JSON.stringify(dec)]); // eslint-disable-line react-hooks/exhaustive-deps
  const amountOk = !!parseAmount(form.quantity) && KNOWN_UNITS.includes(form.unit) && form.name.trim().length > 0;
  const kind = !dec ? "check" : dec.use ? "use" : unq ? "needs_quantity" : "out";
  // Q6: a line that names no amount at all may be kept as "Needs a quantity" (asked when shopping); Q5: a line that
  // reads like a group heading may be one.
  const canNeedQuantity = hasNoAmount(p) && !unq;
  const canBeHeading = !dec && isHeadingLine(line.raw, p);
  // A change is pending when what the editor holds differs from what is decided (an undecided line counts
  // only once something was typed into it).
  const dirty = (["quantity", "unit", "name", "form"] as const).some((k) => String(form[k] ?? "").trim() !== String(draft[k] ?? "").trim());
  useEffect(() => {
    onPending(i, dirty ? { name: form.name.trim() || name || "", form: { name: form.name, quantity: form.quantity, unit: form.unit, form: form.form } } : null);
  }, [dirty, form.name, form.quantity, form.unit, form.form, i, name, onPending]);
  useEffect(() => () => onPending(i, null), [i, onPending]);
  useEffect(() => {
    if (!settled) return;
    mainRef.current?.focus();
    onSettled(null);
  }, [settled, onSettled]);
  useEffect(() => {
    if (!reveal) return;
    setOpen(true);
    // The exact field that is missing (D158); the alternatives' first choice when it is the ingredient to choose.
    requestAnimationFrame(() => {
      const target = reveal.field === "unit" ? unitRef.current : reveal.field === "name" ? (choiceRef.current ?? nameRef.current) : (rangeRef.current ?? amountRef.current);
      target?.focus();
    });
  }, [reveal?.tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const choiceRef = useRef<HTMLButtonElement>(null);
  const rangeRef = useRef<HTMLButtonElement>(null);
  const useNow = (f: RowForm) => { onChange({ ...f, use: true, quantity: f.quantity.trim() }); setOpen(false); onSettled(i); };
  return (
    <li className={`row-item ${kind}`} data-testid="draft-line" data-raw={line.raw} data-state={kind}>
      <button ref={mainRef} type="button" className="row-main" aria-expanded={open} aria-controls={`${id}-ed`} onClick={() => setOpen((o) => !o)}>
        <span className="row-text">
          {use ? (
            <span className="line1"><span className="amt">{amountText(use.quantity, use.unit)}</span> <span className="nm">{use.name}</span></span>
          ) : (
            <span className="line1"><span className="nm">{summary}</span></span>
          )}
          {(use || unq) && p.note ? <span className="note">{p.note}</span> : null}
          {dirty && !open ? <span className="why check">Change not applied yet</span> : status ? <span className={`why ${kind}`}>{status}</span> : null}
        </span>
        <span className="chev" aria-hidden="true">{open ? "▴" : "▾"}</span>
        <span className="sr-only">{open ? "Close" : kind === "check" ? "Fix" : "Change"} line {i + 1}</span>
      </button>
      {open && (
        <div className="row-editor" id={`${id}-ed`}>
          <p className="source"><span className="eyebrow">From the recipe</span> {line.raw}</p>
          {p.alternatives?.length ? (
            <div className="choices" role="group" aria-label={`Line ${i + 1}: which ingredient`}>
              {p.alternatives.map((a, k) => (
                <button key={a} ref={k === 0 ? choiceRef : undefined} type="button" className={`chip-btn ${form.name === a ? "on" : ""}`} aria-pressed={form.name === a} onClick={() => setForm({ ...form, name: a })}>{a}</button>
              ))}
            </div>
          ) : null}
          {p.range ? (
            // D158: the recipe's range as two choices — nothing is picked until the member taps one. With a unit and
            // a name already known the tap uses the line; the range stays on the recipe in the original line.
            <div className="choices" role="group" aria-label={`Line ${i + 1}: how much — the recipe says ${displayAmount(p.range[0])} to ${displayAmount(p.range[1])}`}>
              {p.range.map((v, k) => {
                const next = { ...form, quantity: v };
                return (
                  <button key={v} ref={k === 0 ? rangeRef : undefined} type="button" className={`chip-btn ${form.quantity === v ? "on" : ""}`} aria-pressed={form.quantity === v}
                    onClick={() => (missingField(next) ? setForm(next) : useNow(next))}>{amountText(v, form.unit || "")}</button>
                );
              })}
            </div>
          ) : null}
          <div className="editor-grid">
            <label className="amount">Amount<Input ref={amountRef} inputMode="text" value={form.quantity} placeholder={p.range ? `${p.range[0]}–${p.range[1]}` : "e.g. 1/3"} onChange={(e) => setForm({ ...form, quantity: e.target.value })} aria-label={`Amount for the whole recipe, line ${i + 1}`} /></label>
            <label className="unit">Unit<NativeSelect ref={unitRef} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} aria-label={`Unit, line ${i + 1}`}>
              <option value="">Choose…</option>{KNOWN_UNITS.map((u) => <option key={u} value={u}>{u === "fl_oz" ? "fl oz" : u}</option>)}
            </NativeSelect></label>
            <label className="name">Ingredient<Input ref={nameRef} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label={`Ingredient name, line ${i + 1}`} /></label>
            <label className="form">Bought<NativeSelect value={form.form} onChange={(e) => setForm({ ...form, form: e.target.value as "raw" | "cooked" })} aria-label={`Form, line ${i + 1}`}>
              <option value="raw">raw / as bought</option><option value="cooked">cooked</option>
            </NativeSelect></label>
          </div>
          {!amountOk && form.quantity && !parseAmount(form.quantity) && <p className="field-error small">Use a number or fraction, like 2, 1/3 or 1 1/2.</p>}
          <div className="row">
            <Button ref={applyRef} type="button" variant="default" size="sm" disabled={!amountOk} onClick={() => useNow(form)} aria-label={`Use line ${i + 1}: ${line.raw}`}>Use</Button>
            {canNeedQuantity && (
              <Button type="button" variant="outline" size="sm" disabled={!form.name.trim()}
                onClick={() => { onChange({ use: false, kind: "needs_quantity", name: form.name.trim() }); setOpen(false); onSettled(i); }}
                aria-label={`Needs a quantity, line ${i + 1}: ${line.raw}`}>Needs a quantity</Button>
            )}
            {canBeHeading && (
              <Button type="button" variant="outline" size="sm" onClick={() => { onChange({ use: false, kind: "heading" }); setOpen(false); }}
                aria-label={`Group heading, line ${i + 1}: ${line.raw}`}>Group heading</Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => { onChange({ use: false }); setOpen(false); onSettled(i); }} aria-label={`Leave out line ${i + 1}: ${line.raw}`}>Leave out</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setForm(draft); setOpen(false); onSettled(i); }} aria-label={`Cancel changes to line ${i + 1}`}>Cancel</Button>
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
