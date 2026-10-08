"use client";
import { useEffect, useState } from "react";
import { useStore } from "./store";
import { authClient } from "./auth-client";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function HouseholdScreen() {
  const { snapshot, me } = useStore();
  if (!snapshot) return <p className="muted">Loading…</p>;
  return (
    <section aria-label="Household" className="stack">
      <div className="card">
        <strong>{snapshot.household.name}</strong>
        <p className="small muted">Members: {snapshot.members.map((m: any) => m.displayName).join(", ")} · timezone {snapshot.household.timezone}</p>
      </div>
      <Settings />
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

function Settings() {
  const { snapshot, command } = useStore();
  const s = snapshot.settings;
  const [f, setF] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    setF({
      storeLabel: s.storeLabel ?? "", budgetScope: s.budgetScope ?? "", budgetLimit: s.budgetLimitMinor !== null ? (s.budgetLimitMinor / 100).toFixed(2) : "",
      budgetFirm: s.budgetFirm, cookingSessions: s.cookingSessions?.toString() ?? "", variety: s.variety ?? "", maxNewRecipes: s.maxNewRecipes?.toString() ?? "",
      maxEffort: s.maxEffort ?? "", equipment: s.equipment.join(", "),
    });
  }, [s]);
  if (!f) return null;
  return (
    <form className="card stack" data-testid="settings" onSubmit={async (e) => {
      e.preventDefault();
      const r = await command("UpdateSettings", {
        expectedRevision: s.revision, storeLabel: f.storeLabel || null, budgetScope: f.budgetScope || null,
        budgetLimitMinor: f.budgetLimit ? Math.round(Number(f.budgetLimit) * 100) : null, budgetFirm: !!f.budgetFirm,
        cookingSessions: f.cookingSessions ? Number(f.cookingSessions) : null, variety: f.variety || null,
        maxNewRecipes: f.maxNewRecipes !== "" ? Number(f.maxNewRecipes) : null, maxEffort: f.maxEffort || null,
        equipment: f.equipment.split(",").map((x: string) => x.trim()).filter(Boolean),
      });
      setMsg(r.status === "accepted" ? "Saved." : r.message);
    }}>
      <div className="section-label">Saved household inputs</div>
      <p className="faint small">Everything starts unset. Unset means Table does not know — it is never filled from examples.</p>
      <label>Store (label)<input value={f.storeLabel} onChange={(e) => setF({ ...f, storeLabel: e.target.value })} /></label>
      <div className="grid4">
        <label>Budget applies to<select value={f.budgetScope} onChange={(e) => setF({ ...f, budgetScope: e.target.value })}><option value="">not set</option><option value="pickup">pickup spending</option><option value="dinner_ingredients">dinner ingredient cost</option></select></label>
        <label>Budget ($)<input value={f.budgetLimit} onChange={(e) => setF({ ...f, budgetLimit: e.target.value })} inputMode="decimal" /></label>
        <label className="row"><input type="checkbox" checked={f.budgetFirm} onChange={(e) => setF({ ...f, budgetFirm: e.target.checked })} /> Firm limit</label>
      </div>
      <div className="grid4">
        <label>Cooking sessions / week<input value={f.cookingSessions} onChange={(e) => setF({ ...f, cookingSessions: e.target.value })} inputMode="numeric" /></label>
        <label>Variety<select value={f.variety} onChange={(e) => setF({ ...f, variety: e.target.value })}><option value="">not set</option><option>familiar</option><option>balanced</option><option>adventurous</option></select></label>
        <label>Max new recipes<input value={f.maxNewRecipes} onChange={(e) => setF({ ...f, maxNewRecipes: e.target.value })} inputMode="numeric" /></label>
        <label>Max effort<select value={f.maxEffort} onChange={(e) => setF({ ...f, maxEffort: e.target.value })}><option value="">not set</option><option>easy</option><option>medium</option><option>involved</option></select></label>
      </div>
      <label>Equipment (comma separated)<input value={f.equipment} onChange={(e) => setF({ ...f, equipment: e.target.value })} /></label>
      {msg && <p role="status" className="small">{msg}</p>}
      <button className="btn primary">Save household inputs</button>
    </form>
  );
}

function Targets() {
  const { snapshot, command, me } = useStore();
  return (
    <div className="card stack" data-testid="targets">
      <div className="section-label">Your targets ({me.displayName})</div>
      <p className="faint small">Daily and dinner targets are separate. A dinner plan never establishes full-day compliance. Each person sets their own.</p>
      {(["dinner", "daily"] as const).map((scope) => <TargetForm key={scope} scope={scope} current={snapshot.targets.find((t: any) => t.memberId === me.memberId && t.scope === scope)} onSave={(p) => command("SetTargets", { scope, ...p })} />)}
      {snapshot.members.filter((m: any) => m.id !== me.memberId).map((m: any) => (
        <p key={m.id} className="small faint">{m.displayName}: {["dinner", "daily"].map((sc) => { const t = snapshot.targets.find((x: any) => x.memberId === m.id && x.scope === sc); return `${sc} ${t ? `${t.calories ?? "–"} kcal` : "not set"}`; }).join(" · ")}</p>
      ))}
    </div>
  );
}

function TargetForm({ scope, current, onSave }: { scope: string; current: any; onSave: (p: any) => Promise<any> }) {
  const [f, setF] = useState({ calories: current?.calories ?? "", proteinG: current?.proteinG ?? "", carbsG: current?.carbsG ?? "", fatG: current?.fatG ?? "" });
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form className="row wrap" onSubmit={async (e) => { e.preventDefault(); const r = await onSave({ calories: f.calories || null, proteinG: f.proteinG || null, carbsG: f.carbsG || null, fatG: f.fatG || null }); setMsg(r.status === "accepted" ? "Saved." : r.message); }}>
      <strong className="small">{scope === "dinner" ? "Dinner" : "Whole day"}</strong>
      <label className="small">kcal<input className="tiny" value={f.calories} onChange={(e) => setF({ ...f, calories: e.target.value })} inputMode="decimal" /></label>
      <label className="small">protein g<input className="tiny" value={f.proteinG} onChange={(e) => setF({ ...f, proteinG: e.target.value })} inputMode="decimal" /></label>
      <label className="small">carbs g<input className="tiny" value={f.carbsG} onChange={(e) => setF({ ...f, carbsG: e.target.value })} inputMode="decimal" /></label>
      <label className="small">fat g<input className="tiny" value={f.fatG} onChange={(e) => setF({ ...f, fatG: e.target.value })} inputMode="decimal" /></label>
      <button className="btn line small">Save</button>
      {msg && <span className="small">{msg}</span>}
    </form>
  );
}

function Exclusions() {
  const { snapshot, command } = useStore();
  const [term, setTerm] = useState("");
  const [who, setWho] = useState("");
  return (
    <div className="card stack" data-testid="exclusions">
      <div className="section-label">Hard exclusions</div>
      <p className="faint small">Matched against ingredient names and tags. A text match is not allergen certification, and an ingredient with unknown information cannot pass for a new choice. A new exclusion flags existing dinners; it never replaces them.</p>
      <ul className="small">{snapshot.exclusions.map((x: any) => <li key={x.id}>{x.term} — {x.memberId ? snapshot.members.find((m: any) => m.id === x.memberId)?.displayName : "everyone"} <button className="link" onClick={() => command("RemoveExclusion", { exclusionId: x.id })}>remove</button></li>)}</ul>
      <form className="row" onSubmit={async (e) => { e.preventDefault(); const r = await command("AddExclusion", { term, memberId: who || null }); if (r.status === "accepted") setTerm(""); }}>
        <input aria-label="Exclusion" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="ingredient or tag, e.g. fish" />
        <select aria-label="Applies to" value={who} onChange={(e) => setWho(e.target.value)}><option value="">everyone</option>{snapshot.members.map((m: any) => <option key={m.id} value={m.id}>{m.displayName}</option>)}</select>
        <button className="btn line small">Add</button>
      </form>
    </div>
  );
}

function IngredientReview() {
  const { snapshot, command } = useStore();
  const unknown = snapshot.ingredients.filter((i: any) => !i.allergenInfoKnown);
  if (!unknown.length) return null;
  return (
    <div className="card stack">
      <div className="section-label">Ingredients needing review</div>
      <p className="faint small">These have no reviewed tags, so they cannot pass an exclusion check for a new dinner.</p>
      {unknown.map((i: any) => <IngredientRow key={i.key} i={i} onSave={(tags, known) => command("ReviewIngredient", { key: i.key, tags, allergenInfoKnown: known })} />)}
    </div>
  );
}

function IngredientRow({ i, onSave }: { i: any; onSave: (tags: string[], known: boolean) => void }) {
  const [tags, setTags] = useState(i.tags.join(", "));
  return (
    <form className="row small" onSubmit={(e) => { e.preventDefault(); onSave(tags.split(",").map((x: string) => x.trim()).filter(Boolean), true); }}>
      <span>{i.name}</span>
      <input aria-label={`Tags for ${i.name}`} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, e.g. tree_nut, dairy" />
      <button className="btn line small">Mark reviewed</button>
    </form>
  );
}
