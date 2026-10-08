"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "./store";
import { authClient } from "./auth-client";
import { Staples } from "./Staples";
import { ModalSheet, focusFirst } from "./a11y";
import { FieldError, FormAlert, fieldProps, focusFirstInvalid, isDecimal, isWhole, type Errors } from "./forms";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Household (B17 keyboard, focus and error pass). Every inline form checks its fields before
 * sending anything, attaches each error to its field and focuses the first invalid one; a server
 * rejection is a focused alert; a success is announced. Live updates never move focus and never
 * erase what a member is typing: the shared settings form keeps the typed values and shows what
 * the other member changed, holding Save until the member has reviewed the current settings.
 */

const wrap = { overflowWrap: "anywhere" as const, minWidth: 0 };

export function HouseholdScreen() {
  const { snapshot, me } = useStore();
  if (!snapshot) return <p className="muted">Loading…</p>;
  return (
    <section aria-label="Household" className="stack" style={wrap}>
      <div className="card">
        <strong>{snapshot.household.name}</strong>
        <p className="small muted">Members: {snapshot.members.map((m: any) => m.displayName).join(", ")} · timezone {snapshot.household.timezone}</p>
      </div>
      <Settings />
      <Staples />
      <Targets />
      <Exclusions />
      <IngredientReview />
      <div className="card stack">
        <div className="section-label">Connections</div>
        <p className="small" data-testid="connection-retailer">Retailer: {snapshot.retailer.live ? snapshot.retailer.label : "Simulated retailer (recording fake)"} — {snapshot.retailer.reason}</p>
        <p className="small">Nutrition lookup (USDA FoodData Central): not connected. Nutrition comes only from ingredient data you or the fixtures entered; unknown stays unknown.</p>
      </div>
      <div className="card stack">
        <div className="section-label">Export</div>
        <p className="small">Download recipes, versions, preferences, plans and grocery records as JSON. No passwords, sessions or keys are included.</p>
        <a className="btn line" href="/api/export" download data-testid="export">Download household export</a>
      </div>
      <button className="btn line" onClick={async () => { await authClient.signOut(); window.location.assign("/login"); }}>Sign out {me.displayName}</button>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Saved household inputs

type SForm = {
  storeLabel: string; budgetScope: string; budgetLimit: string; budgetFirm: boolean; cookingSessions: string;
  variety: string; maxNewRecipes: string; maxEffort: string; equipment: string;
};
const SFIELDS: { key: keyof SForm; label: string }[] = [
  { key: "storeLabel", label: "Store" },
  { key: "budgetScope", label: "Budget applies to" },
  { key: "budgetLimit", label: "Budget ($)" },
  { key: "budgetFirm", label: "Firm limit" },
  { key: "cookingSessions", label: "Cooking sessions / week" },
  { key: "variety", label: "Variety" },
  { key: "maxNewRecipes", label: "Max new recipes" },
  { key: "maxEffort", label: "Max effort" },
  { key: "equipment", label: "Equipment" },
];
const SCOPE_TEXT: Record<string, string> = { pickup: "pickup spending", dinner_ingredients: "dinner ingredient cost" };

function toForm(s: any): SForm {
  return {
    storeLabel: s.storeLabel ?? "",
    budgetScope: s.budgetScope ?? "",
    budgetLimit: s.budgetLimitMinor !== null && s.budgetLimitMinor !== undefined ? (s.budgetLimitMinor / 100).toFixed(2) : "",
    budgetFirm: !!s.budgetFirm,
    cookingSessions: s.cookingSessions?.toString() ?? "",
    variety: s.variety ?? "",
    maxNewRecipes: s.maxNewRecipes?.toString() ?? "",
    maxEffort: s.maxEffort ?? "",
    equipment: (s.equipment ?? []).join(", "),
  };
}
function toPayload(f: SForm) {
  return {
    storeLabel: f.storeLabel.trim() || null,
    budgetScope: f.budgetScope || null,
    budgetLimitMinor: f.budgetLimit.trim() ? Math.round(Number(f.budgetLimit.trim()) * 100) : null,
    budgetFirm: !!f.budgetFirm,
    cookingSessions: f.cookingSessions.trim() ? Number(f.cookingSessions.trim()) : null,
    variety: f.variety || null,
    maxNewRecipes: f.maxNewRecipes.trim() !== "" ? Number(f.maxNewRecipes.trim()) : null,
    maxEffort: f.maxEffort || null,
    equipment: f.equipment.split(",").map((x) => x.trim()).filter(Boolean),
  };
}
const same = (a: SForm, b: SForm) => SFIELDS.every(({ key }) => a[key] === b[key]);
const shown = (k: keyof SForm, v: string | boolean) =>
  k === "budgetFirm" ? (v ? "yes" : "no") : v === "" ? "not set" : k === "budgetScope" ? SCOPE_TEXT[v as string] ?? String(v) : String(v);

function validateSettings(f: SForm): Errors {
  const errs: Errors = {};
  if (f.storeLabel.trim().length > 80) errs["set-store"] = "Store label must be 80 characters or fewer";
  if (f.budgetLimit.trim() && !/^\d+(\.\d{1,2})?$/.test(f.budgetLimit.trim()))
    errs["set-budget"] = "Budget must be an amount of 0 or more with at most 2 decimal places, or empty";
  if (f.cookingSessions.trim() && !isWhole(f.cookingSessions, 1, 7)) errs["set-sessions"] = "Cooking sessions must be a whole number from 1 to 7, or empty";
  if (f.maxNewRecipes.trim() && !isWhole(f.maxNewRecipes, 0, 7)) errs["set-maxnew"] = "Max new recipes must be a whole number from 0 to 7, or empty";
  return errs;
}

function Settings() {
  const { snapshot, command, announce, lastChange, me } = useStore();
  const s = snapshot.settings;
  const current = toForm(s);
  // `base` is the revision (and its values) this member's edits started from, or last reviewed.
  const [base, setBase] = useState<{ revision: number; form: SForm }>(() => ({ revision: s.revision, form: current }));
  const [f, setF] = useState<SForm>(current);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [changedBy, setChangedBy] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);

  const dirty = !same(f, base.form);
  const moved = s.revision !== base.revision;
  // A conflict only when the other member's save changed values while this member has unsaved
  // edits that differ from them. Every other case simply follows the current settings.
  const conflict = moved && !saving && dirty && !same(current, f) && !same(current, base.form);
  const currentKey = JSON.stringify(current);

  useEffect(() => {
    if (!moved || saving) return;
    if (same(current, f)) setBase({ revision: s.revision, form: current }); // they saved what I typed
    else if (same(current, base.form)) setBase({ revision: s.revision, form: base.form }); // nothing visible changed
    else if (!dirty) {
      setBase({ revision: s.revision, form: current });
      setF(current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.revision, currentKey, moved, saving, dirty]);

  // Who changed the settings underneath this member (from the change stream, when it says so).
  useEffect(() => {
    if (!lastChange || lastChange.actorId === me.memberId || !/household settings$/.test(lastChange.text ?? "")) return;
    setChangedBy(snapshot.members.find((m: any) => m.id === lastChange.actorId)?.displayName ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastChange]);

  const edit = (patch: Partial<SForm>) => {
    setF((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };
  const changed = SFIELDS.filter(({ key }) => current[key] !== base.form[key]);

  return (
    <form ref={formRef} className="card stack" data-testid="settings" aria-labelledby="settings-h" noValidate onSubmit={async (e) => {
      e.preventDefault();
      if (conflict || saving) return;
      const errs = validateSettings(f);
      setErrors(errs);
      if (Object.keys(errs).length) return void focusFirstInvalid(formRef.current, errs);
      setFormError(null);
      setSaving(true);
      const expectedRevision = base.revision;
      const payload = toPayload(f);
      const r = await command("UpdateSettings", { expectedRevision, ...payload });
      if (r.status === "accepted") {
        const savedForm = toForm(payload);
        setBase({ revision: expectedRevision + 1, form: savedForm });
        setF(savedForm);
        setSaved(true);
        setChangedBy(null);
        setSaving(false);
        announce("Household inputs saved.");
      } else {
        setSaving(false);
        setFormError(r.message ?? "Household inputs were not saved.");
      }
    }}>
      <h2 id="settings-h" className="section-label">Saved household inputs</h2>
      <p className="faint small">Everything starts unset. Unset means Table does not know — it is never filled from examples.</p>
      {conflict && (
        <div className="warnbox stack" data-testid="settings-conflict">
          <p className="small" style={{ margin: 0 }}>
            {(snapshot.settingsUpdatedBy ?? changedBy) ? `${snapshot.settingsUpdatedBy ?? changedBy} saved` : "The other member saved"} household inputs while you were editing. What you typed is kept below; fields you did not change will take the current values. Now:
          </p>
          <ul className="small" style={{ margin: 0, paddingLeft: "1.2em" }}>
            {changed.map(({ key, label }) => (
              <li key={key}>
                {label}: <strong>{shown(key, current[key])}</strong> (was {shown(key, base.form[key])}{f[key] !== base.form[key] ? `; you typed ${shown(key, f[key])}` : ""})
              </li>
            ))}
          </ul>
          <div className="row">
            <button type="button" className="btn line small" onClick={() => {
              setF((prev) => {
                const merged: any = { ...prev };
                for (const { key } of SFIELDS) if (prev[key] === base.form[key]) merged[key] = current[key];
                return merged as SForm;
              });
              setBase({ revision: s.revision, form: current });
              setFormError(null);
              setChangedBy(null);
              setTimeout(() => focusFirst(saveRef.current, formRef.current), 0);
            }}>I’ve reviewed the current settings</button>
          </div>
        </div>
      )}
      <FormAlert message={formError} testId="settings-error" />
      <span className="stack">
        <label htmlFor="set-store">Store (label)</label>
        <input {...fieldProps("set-store", errors)} value={f.storeLabel} onChange={(e) => edit({ storeLabel: e.target.value })} />
        <FieldError id="set-store" errors={errors} />
      </span>
      <div className="grid4">
        <span className="stack">
          <label htmlFor="set-scope">Budget applies to</label>
          <select id="set-scope" value={f.budgetScope} onChange={(e) => edit({ budgetScope: e.target.value })}>
            <option value="">not set</option><option value="pickup">pickup spending</option><option value="dinner_ingredients">dinner ingredient cost</option>
          </select>
        </span>
        <span className="stack">
          <label htmlFor="set-budget">Budget ($)</label>
          <input {...fieldProps("set-budget", errors)} value={f.budgetLimit} onChange={(e) => edit({ budgetLimit: e.target.value })} inputMode="decimal" />
          <FieldError id="set-budget" errors={errors} />
        </span>
        <label className="row"><input type="checkbox" id="set-firm" checked={f.budgetFirm} onChange={(e) => edit({ budgetFirm: e.target.checked })} /> Firm limit</label>
      </div>
      <div className="grid4">
        <span className="stack">
          <label htmlFor="set-sessions">Cooking sessions / week</label>
          <input {...fieldProps("set-sessions", errors)} value={f.cookingSessions} onChange={(e) => edit({ cookingSessions: e.target.value })} inputMode="numeric" />
          <FieldError id="set-sessions" errors={errors} />
        </span>
        <span className="stack">
          <label htmlFor="set-variety">Variety</label>
          <select id="set-variety" value={f.variety} onChange={(e) => edit({ variety: e.target.value })}><option value="">not set</option><option>familiar</option><option>balanced</option><option>adventurous</option></select>
        </span>
        <span className="stack">
          <label htmlFor="set-maxnew">Max new recipes</label>
          <input {...fieldProps("set-maxnew", errors)} value={f.maxNewRecipes} onChange={(e) => edit({ maxNewRecipes: e.target.value })} inputMode="numeric" />
          <FieldError id="set-maxnew" errors={errors} />
        </span>
        <span className="stack">
          <label htmlFor="set-effort">Max effort</label>
          <select id="set-effort" value={f.maxEffort} onChange={(e) => edit({ maxEffort: e.target.value })}><option value="">not set</option><option>easy</option><option>medium</option><option>involved</option></select>
        </span>
      </div>
      <span className="stack">
        <label htmlFor="set-equipment">Equipment (comma separated)</label>
        <input id="set-equipment" value={f.equipment} onChange={(e) => edit({ equipment: e.target.value })} />
      </span>
      {saved && !dirty && <p className="small faint" style={{ margin: 0 }}>Saved.</p>}
      <div className="row">
        <button ref={saveRef} className="btn primary" disabled={conflict || saving}>Save household inputs</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------------------------
// Targets

const TFIELDS = [
  { key: "calories", label: "calories (kcal)", noun: "calories" },
  { key: "proteinG", label: "protein (g)", noun: "protein" },
  { key: "carbsG", label: "carbs (g)", noun: "carbs" },
  { key: "fatG", label: "fat (g)", noun: "fat" },
] as const;
type TKey = (typeof TFIELDS)[number]["key"];

function Targets() {
  const { snapshot, command, me } = useStore();
  return (
    <div className="card stack" data-testid="targets">
      <h2 className="section-label">Your targets ({me.displayName})</h2>
      <p className="faint small">Daily and dinner targets are separate. A dinner plan never establishes full-day compliance. Each person sets their own.</p>
      {(["dinner", "daily"] as const).map((scope) => <TargetForm key={scope} scope={scope} current={snapshot.targets.find((t: any) => t.memberId === me.memberId && t.scope === scope)} onSave={(p) => command("SetTargets", { scope, ...p })} />)}
      {snapshot.members.filter((m: any) => m.id !== me.memberId).map((m: any) => (
        <p key={m.id} className="small faint">{m.displayName}: {["dinner", "daily"].map((sc) => { const t = snapshot.targets.find((x: any) => x.memberId === m.id && x.scope === sc); return `${sc} ${t ? `${t.calories ?? "–"} kcal` : "not set"}`; }).join(" · ")}</p>
      ))}
    </div>
  );
}

function TargetForm({ scope, current, onSave }: { scope: "dinner" | "daily"; current: any; onSave: (p: any) => Promise<any> }) {
  const { announce } = useStore();
  const prefix = scope === "dinner" ? "Dinner" : "Whole-day";
  const [f, setF] = useState<Record<TKey, string>>(() => ({
    calories: current?.calories?.toString() ?? "", proteinG: current?.proteinG?.toString() ?? "", carbsG: current?.carbsG?.toString() ?? "", fatG: current?.fatG?.toString() ?? "",
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  const id = (k: TKey) => `tg-${scope}-${k}`;
  return (
    <form ref={ref} className="stack" noValidate aria-labelledby={`tg-${scope}-h`} onSubmit={async (e) => {
      e.preventDefault();
      if (saving) return;
      const errs: Errors = {};
      for (const { key, noun } of TFIELDS) if (f[key].trim() && !isDecimal(f[key])) errs[id(key)] = `${prefix} ${noun} must be a number of 0 or more, or empty`;
      setErrors(errs);
      if (Object.keys(errs).length) return void focusFirstInvalid(ref.current, errs);
      setFormError(null);
      setSaving(true);
      const v = (k: TKey) => f[k].trim() || null;
      const r = await onSave({ calories: v("calories"), proteinG: v("proteinG"), carbsG: v("carbsG"), fatG: v("fatG") });
      setSaving(false);
      if (r?.status !== "accepted") return setFormError(r?.message ?? `${prefix} targets were not saved.`);
      announce(`${prefix} targets saved.`);
    }}>
      <h3 id={`tg-${scope}-h`} className="small" style={{ margin: 0 }}>{scope === "dinner" ? "Dinner" : "Whole day"}</h3>
      <FormAlert message={formError} />
      <div className="grid4">
        {TFIELDS.map(({ key, label }) => (
          <span key={key} className="stack">
            <label htmlFor={id(key)}>{prefix} {label}</label>
            <input {...fieldProps(id(key), errors)} value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} inputMode="decimal" />
            <FieldError id={id(key)} errors={errors} />
          </span>
        ))}
      </div>
      <div className="row">
        <button className="btn line small" disabled={saving}>Save {scope === "dinner" ? "dinner" : "whole-day"} targets</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------------------------
// Hard exclusions

type ExclusionDialog = { id: string; term: string; who: string; opener: HTMLElement | null };

function Exclusions() {
  const { snapshot, command, announce } = useStore();
  const [term, setTerm] = useState("");
  const [who, setWho] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<ExclusionDialog | null>(null);
  const removedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const whoName = (memberId: string | null) => (memberId ? snapshot.members.find((m: any) => m.id === memberId)?.displayName ?? "a former member" : "everyone");
  return (
    <div className="card stack" data-testid="exclusions">
      <h2 className="section-label">Hard exclusions</h2>
      <p className="faint small">Matched against ingredient names and tags. A text match is not allergen certification, and an ingredient with unknown information cannot pass for a new choice. A new exclusion flags existing dinners; it never replaces them.</p>
      {snapshot.exclusions.length === 0 && <p className="small muted">No exclusions yet.</p>}
      {snapshot.exclusions.length > 0 && (
        <ul className="small stack" style={{ paddingLeft: "1.2em", margin: 0 }}>
          {snapshot.exclusions.map((x: any) => (
            <li key={x.id} style={wrap}>
              {x.term} — {whoName(x.memberId)}{" "}
              <button type="button" className="link" aria-haspopup="dialog" onClick={(e) => {
                removedRef.current = false;
                setDialog({ id: x.id, term: x.term, who: whoName(x.memberId), opener: e.currentTarget });
              }}>
                Remove<span className="sr-only"> exclusion {x.term} ({whoName(x.memberId)})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <form ref={formRef} className="stack" noValidate onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const errs: Errors = {};
        if (!term.trim()) errs["excl-term"] = "Enter an ingredient or tag to exclude";
        setErrors(errs);
        if (Object.keys(errs).length) return void focusFirstInvalid(formRef.current, errs);
        setFormError(null);
        setBusy(true);
        const r = await command("AddExclusion", { term, memberId: who || null });
        setBusy(false);
        if (r?.status !== "accepted") return setFormError(r?.message ?? "The exclusion was not added.");
        announce(`Exclusion ${term.trim()} added for ${whoName(who || null)}.`);
        setTerm("");
      }}>
        <FormAlert message={formError} testId="exclusion-error" />
        <div className="grid4">
          <span className="stack">
            <label htmlFor="excl-term">Exclusion</label>
            <input {...fieldProps("excl-term", errors)} value={term} onChange={(e) => setTerm(e.target.value)} placeholder="ingredient or tag, e.g. fish" />
            <FieldError id="excl-term" errors={errors} />
          </span>
          <span className="stack">
            <label htmlFor="excl-who">Applies to</label>
            <select id="excl-who" value={who} onChange={(e) => setWho(e.target.value)}><option value="">everyone</option>{snapshot.members.map((m: any) => <option key={m.id} value={m.id}>{m.displayName}</option>)}</select>
          </span>
        </div>
        <div className="row"><button className="btn line small" disabled={busy}>Add exclusion</button></div>
      </form>
      {dialog && (
        <RemoveExclusionDialog
          d={dialog}
          onClose={() => setDialog(null)}
          onRemoved={() => { removedRef.current = true; }}
          returnFocus={() => focusFirst(removedRef.current ? null : dialog.opener, () => document.getElementById("excl-term"))}
        />
      )}
    </div>
  );
}

function RemoveExclusionDialog({ d, onClose, onRemoved, returnFocus }: { d: ExclusionDialog; onClose: () => void; onRemoved: () => void; returnFocus: () => void }) {
  const { snapshot, command, announce } = useStore();
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const still = snapshot.exclusions.some((x: any) => x.id === d.id);
  return (
    <ModalSheet title={`Remove the exclusion ${d.term}?`} subtitle={`Applies to ${d.who}`} closeLabel="Close without removing" onClose={onClose} returnFocus={returnFocus} testId="remove-exclusion-dialog">
      {!still && <p className="warnbox" data-testid="exclusion-gone">This exclusion has already been removed. There is nothing left to remove.</p>}
      <FormAlert message={formError} testId="exclusion-remove-error" />
      <p style={{ ...wrap, margin: 0 }}>
        Table will stop checking dinners against “{d.term}” for {d.who}. Recipes and ingredients that match it could be proposed again, and dinners already planned are no longer flagged for it. Remove it only if it no longer applies.
      </p>
      <div className="row">
        <button type="button" className="btn line" data-autofocus="" onClick={onClose}>Keep it</button>
        <button type="button" className="btn danger" disabled={!still || busy} onClick={async () => {
          setBusy(true);
          const r = await command("RemoveExclusion", { exclusionId: d.id });
          setBusy(false);
          if (r?.status !== "accepted") return setFormError(r?.message ?? "The exclusion was not removed.");
          onRemoved();
          announce(`Exclusion ${d.term} removed for ${d.who}. Dinners with it can be proposed again.`);
          onClose();
        }}>Remove exclusion</button>
      </div>
    </ModalSheet>
  );
}

// ---------------------------------------------------------------------------------------------
// Ingredient review

function IngredientReview() {
  const { snapshot, command } = useStore();
  const unknown = snapshot.ingredients.filter((i: any) => !i.allergenInfoKnown);
  const [reviewedHere, setReviewedHere] = useState(false);
  const ref = useRef<HTMLElement>(null);
  if (!unknown.length && !reviewedHere) return null;
  const afterReview = (key: string) => {
    setReviewedHere(true);
    const idx = unknown.findIndex((i: any) => i.key === key);
    const next = unknown[idx + 1] ?? unknown[idx - 1];
    // The reviewed row disappears: focus the next row still needing review, else this section.
    setTimeout(() => focusFirst(() => (next ? document.getElementById(`rv-${next.key}-tags`) : null), ref.current), 0);
  };
  return (
    <section ref={ref} className="card stack" data-testid="ingredient-review" aria-labelledby="rv-h" tabIndex={-1}>
      <h2 id="rv-h" className="section-label">Ingredients needing review</h2>
      <p className="faint small">These have no reviewed tags, so they cannot pass an exclusion check for a new dinner.</p>
      {!unknown.length && <p className="small muted">All ingredients have been reviewed.</p>}
      {unknown.map((i: any) => (
        <IngredientRow key={i.key} i={i} onSave={(tags) => command("ReviewIngredient", { key: i.key, tags, allergenInfoKnown: true })} onReviewed={() => afterReview(i.key)} />
      ))}
    </section>
  );
}

function IngredientRow({ i, onSave, onReviewed }: { i: any; onSave: (tags: string[]) => Promise<any>; onReviewed: () => void }) {
  const { announce } = useStore();
  const [tags, setTags] = useState<string>(i.tags.join(", "));
  const [none, setNone] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  const tagsId = `rv-${i.key}-tags`;
  const list = tags.split(",").map((x) => x.trim()).filter(Boolean);
  return (
    <form ref={ref} className="stack small" noValidate style={wrap} aria-label={`Review ${i.name}`} onSubmit={async (e) => {
      e.preventDefault();
      if (busy) return;
      const errs: Errors = {};
      // Marking reviewed with no tags declares that none apply: that takes an explicit tick.
      if (!list.length && !none) errs[tagsId] = `Enter its allergen tags, or tick “No allergen tags apply to ${i.name}”`;
      setErrors(errs);
      if (Object.keys(errs).length) return void focusFirstInvalid(ref.current, errs);
      setFormError(null);
      setBusy(true);
      const r = await onSave(list);
      setBusy(false);
      if (r?.status !== "accepted") return setFormError(r?.message ?? `${i.name} was not marked reviewed.`);
      announce(list.length ? `${i.name} reviewed with tags ${list.join(", ")}.` : `${i.name} reviewed: no allergen tags apply.`);
      onReviewed();
    }}>
      <label htmlFor={tagsId}>Tags for {i.name}</label>
      <input {...fieldProps(tagsId, errors)} value={tags} onChange={(e) => { setTags(e.target.value); setErrors({}); }} placeholder="tags, e.g. tree_nut, dairy" />
      <FieldError id={tagsId} errors={errors} />
      {!list.length && (
        <label className="row">
          <input type="checkbox" id={`rv-${i.key}-none`} checked={none} onChange={(e) => { setNone(e.target.checked); setErrors({}); }} /> No allergen tags apply to {i.name}
        </label>
      )}
      <FormAlert message={formError} />
      <div className="row"><button className="btn line small" disabled={busy}>Mark {i.name} reviewed</button></div>
    </form>
  );
}
