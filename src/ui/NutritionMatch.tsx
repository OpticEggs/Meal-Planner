"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "./store";
import { ModalSheet, focusFirst } from "./a11y";
import { FieldError, FormAlert, fieldProps, type Errors } from "./forms";
import { outcomeSentence } from "@/domain/nutrition/outcomes";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Ingredient nutrition sources and the FoodData Central match review (B7).
 * Every ingredient states where its nutrition comes from (unknown, synthetic fixture, or an FDC
 * food with its data type, id, retrieval date and form). "Find nutrition…" opens one dialog on the
 * shared modal system: search → candidate (values per basis, with units; unknown says unknown) →
 * the member picks the form the values describe → "Use these values". Nothing is used until then.
 * The key stays on the server; when it is absent the dialog says lookup is not configured and
 * nothing pretends to search.
 */

const wrap = { overflowWrap: "anywhere" as const, minWidth: 0 };
const FORM_TEXT: Record<string, string> = { raw: "raw", cooked: "cooked", as_sold: "as sold" };
const KIND_TEXT: Record<string, string> = {
  fixture_fetched_demo: "test fixture: fetched demo record (DEMO_KEY), not live data",
  fixture_official_example: "test fixture: official spec example, not food data",
  fixture_synthetic: "test fixture: synthetic values, not nutrition data",
};
const NUTRIENTS: { key: "energy" | "protein" | "fat" | "carbs"; label: string }[] = [
  { key: "energy", label: "Energy" },
  { key: "protein", label: "Protein" },
  { key: "fat", label: "Fat" },
  { key: "carbs", label: "Carbohydrate" },
];
const ENERGY_NOTE: Record<string, string> = { "958": " (nutrient 958, Atwater specific factors)", "957": " (nutrient 957, Atwater general factors)" };

const day = (iso: string | null | undefined) => (iso ? String(iso).slice(0, 10) : "unknown date");

/** One line saying where an ingredient's nutrition comes from. */
export function sourceLine(src: any): string {
  const c = src?.current;
  if (!c) return "Nutrition: unknown";
  if (c.fdcId) {
    const portion = c.portion ? `, per ${c.portion.label}` : "";
    const kind = KIND_TEXT[c.provenanceKind] ? ` — ${KIND_TEXT[c.provenanceKind]}` : "";
    return `Nutrition: FDC ${c.dataType} #${c.fdcId}, retrieved ${day(c.retrievedAt)}, ${FORM_TEXT[c.form] ?? c.form}${portion}${kind}`;
  }
  if (c.provenanceKind === "fixture_synthetic") return "Nutrition: synthetic test fixture values (not nutrition data)";
  return `Nutrition: entered from a label (${FORM_TEXT[c.form] ?? c.form})`;
}

export function nutritionStatusText(status: string): string {
  if (status === "configured") return "Nutrition lookup (USDA FoodData Central): connected; the key stays on the server. Values are used only after a member reviews and confirms a match.";
  if (status === "fixture") return "Nutrition lookup: test fixture transport — labeled fixture records, not live FoodData Central data.";
  return "Nutrition lookup (USDA FoodData Central): not configured — there is no API key on the server, so nothing is searched. Nutrition comes only from ingredient data already entered; unknown stays unknown.";
}

type Dialog = { key: string; name: string; opener: HTMLElement | null };

export function IngredientNutrition() {
  const { snapshot } = useStore();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const sources = new Map<string, any>((snapshot.nutritionSources ?? []).map((s: any) => [s.ingredientKey, s]));
  const ingredients = [...snapshot.ingredients].sort((a: any, b: any) => a.name.localeCompare(b.name));
  return (
    <section className="card stack" data-testid="ingredient-nutrition" aria-labelledby="nut-h" style={wrap}>
      <h2 id="nut-h" className="section-label">Ingredient nutrition</h2>
      <p className="faint small">Where each ingredient’s nutrition comes from. Unknown stays unknown; nothing here is allergen information.</p>
      <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {ingredients.map((i: any) => (
          <li key={i.key} className="stack small" style={{ ...wrap, gap: 4 }} data-testid={`nutrition-${i.key}`}>
            <strong>{i.name}</strong>
            <span data-testid={`nutrition-source-${i.key}`}>{sourceLine(sources.get(i.key))}</span>
            <span>
              <button type="button" className="btn line small" aria-haspopup="dialog" onClick={(e) => setDialog({ key: i.key, name: i.name, opener: e.currentTarget })}>
                Find nutrition…<span className="sr-only"> for {i.name}</span>
              </button>
            </span>
          </li>
        ))}
      </ul>
      {dialog && (
        <NutritionDialog
          d={dialog}
          onClose={() => setDialog(null)}
          returnFocus={() => focusFirst(dialog.opener, () => document.querySelector<HTMLElement>(`[data-testid="nutrition-${dialog.key}"] button`), () => document.getElementById("nut-h"))}
        />
      )}
    </section>
  );
}

function NutritionDialog({ d, onClose, returnFocus }: { d: Dialog; onClose: () => void; returnFocus: () => void }) {
  const { snapshot, command, announce } = useStore();
  const status: string = snapshot.nutritionLookup ?? "not_configured";
  const src = (snapshot.nutritionSources ?? []).find((s: any) => s.ingredientKey === d.key) ?? { revision: 0, current: null, last: null };
  // The revision this member's decision is made against: the one shown when the dialog opened,
  // moved forward only when the member says they reviewed the other member's change.
  const [baseRevision, setBaseRevision] = useState<number>(src.revision);
  const changedUnderneath = src.revision !== baseRevision;
  const [query, setQuery] = useState(d.name);
  const [errors, setErrors] = useState<Errors>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [cand, setCand] = useState<any | null>(null);
  const [form, setForm] = useState<string>("");
  const [portion, setPortion] = useState<string>("");
  const [confirmClear, setConfirmClear] = useState(false);
  const candHead = useRef<HTMLHeadingElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const clearRef = useRef<HTMLButtonElement>(null);
  const clearAsked = useRef(false);
  const focusResults = useRef(false);
  const resultsHead = useRef<HTMLHeadingElement>(null);
  const qid = `nut-q-${d.key}`;

  // New results take focus once they are on screen (their heading names the count).
  useEffect(() => {
    if (results && !cand && focusResults.current) {
      focusResults.current = false;
      resultsHead.current?.focus();
    }
  }, [results, cand]);

  // The clear confirmation replaces its opener: focus moves to the safe choice, and back.
  useEffect(() => {
    if (confirmClear) keepRef.current?.focus();
    else if (clearAsked.current) clearRef.current?.focus();
  }, [confirmClear]);

  useEffect(() => {
    if (cand) candHead.current?.focus();
  }, [cand?.reviewDigest]); // eslint-disable-line react-hooks/exhaustive-deps

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!query.trim()) {
      setErrors({ [qid]: "Enter words to search for, e.g. chicken breast raw" });
      document.getElementById(qid)?.focus();
      return;
    }
    setErrors({});
    setAlert(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/nutrition/search?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
      const body = await r.json();
      if (body.outcome === "ok") {
        setResults(body.results);
        announce(`${body.results.length} result${body.results.length === 1 ? "" : "s"} for ${query.trim()}.`);
        focusResults.current = true;
      } else {
        setResults(null);
        setAlert(body.message ?? outcomeSentence({ kind: body.outcome }));
      }
    } catch {
      setAlert("Could not reach Table. Nothing was searched; try again when online.");
    } finally {
      setBusy(false);
    }
  }

  async function open(fdcId: number) {
    if (busy) return;
    setAlert(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/nutrition/food/${fdcId}`, { cache: "no-store" });
      const body = await r.json();
      if (body.outcome === "ok") {
        setCand(body);
        setForm("");
        setPortion("");
      } else setAlert(body.message ?? outcomeSentence({ kind: body.outcome }));
    } catch {
      setAlert("Could not reach Table. Nothing was looked up; try again when online.");
    } finally {
      setBusy(false);
    }
  }

  async function use() {
    if (busy || !form || changedUnderneath) return;
    setAlert(null);
    setBusy(true);
    const r = await command("ConfirmNutritionMatch", {
      ingredientKey: d.key, fdcId: cand.candidate.fdcId, form, portionId: portion || null, reviewDigest: cand.reviewDigest, expectedRevision: baseRevision,
    });
    setBusy(false);
    if (r?.status === "accepted") {
      announce(`Nutrition for ${d.name} now comes from FoodData Central ${cand.candidate.dataType} #${cand.candidate.fdcId} (${FORM_TEXT[form]}).`);
      onClose();
      return;
    }
    if (r?.code === "changed_since_review" && r.details?.candidate) {
      setCand({ ...cand, candidate: r.details.candidate, reviewDigest: r.details.reviewDigest, retrievedAt: r.details.retrievedAt, provenance: r.details.provenance });
    }
    setAlert(r?.message ?? "These values were not used.");
  }

  async function clear() {
    if (busy || changedUnderneath) return;
    setBusy(true);
    const r = await command("ClearNutritionMatch", { ingredientKey: d.key, expectedRevision: baseRevision });
    setBusy(false);
    if (r?.status === "accepted") {
      announce(`Nutrition for ${d.name} cleared; it is unknown again.`);
      onClose();
      return;
    }
    setConfirmClear(false);
    setAlert(r?.message ?? "Nothing was cleared.");
  }

  const c = cand?.candidate;
  return (
    <ModalSheet title={`Nutrition for ${d.name}`} subtitle={sourceLine(src)} closeLabel="Close without changing nutrition" onClose={onClose} returnFocus={returnFocus} testId="nutrition-dialog">
      {changedUnderneath && (
        <div className="warnbox stack" data-testid="nutrition-changed" style={wrap}>
          <p className="small" style={{ margin: 0 }}>
            {src.last?.by ?? "The other member"} {src.last?.action === "cleared" ? "cleared" : "changed"} the nutrition for {d.name} while you were looking. It is now: {sourceLine(src).replace(/^Nutrition: /, "")}.
          </p>
          <div className="row">
            <button type="button" className="btn line small" onClick={() => { setBaseRevision(src.revision); setAlert(null); }}>I’ve reviewed the current source</button>
          </div>
        </div>
      )}
      <FormAlert message={alert} testId="nutrition-alert" />
      {status === "not_configured" ? (
        <div className="stack" data-testid="nutrition-not-configured">
          <p style={{ ...wrap, margin: 0 }}>
            Nutrition lookup is not configured on this server: there is no USDA FoodData Central API key, so Table cannot search for foods. Nothing is searched and nothing changes. {d.name} keeps its current nutrition ({sourceLine(src).replace(/^Nutrition: /, "")}).
          </p>
          <div className="row"><button type="button" className="btn line" data-autofocus="" onClick={onClose}>Close</button></div>
        </div>
      ) : !c ? (
        <>
          <form className="stack" noValidate onSubmit={search} role="search" aria-label={`Search FoodData Central for ${d.name}`}>
            <label htmlFor={qid}>Search FoodData Central</label>
            <input {...fieldProps(qid, errors)} data-autofocus="" value={query} onChange={(e) => { setQuery(e.target.value); setErrors({}); }} autoComplete="off" />
            <FieldError id={qid} errors={errors} />
            <div className="row"><button className="btn primary small" disabled={busy}>Search</button></div>
          </form>
          {results && (
            <div className="stack">
              <h3 ref={resultsHead} tabIndex={-1} className="small" style={{ margin: 0 }} data-testid="nutrition-results">Results ({results.length})</h3>
              <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {results.map((r: any) => (
                  <li key={r.fdcId} style={wrap}>
                    <button type="button" className="btn line small" style={{ textAlign: "left", ...wrap }} disabled={busy} onClick={() => open(r.fdcId)}>
                      {r.description} — {r.dataType}{r.brandOwner ? ` (${r.brandOwner})` : ""}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {src.current && !confirmClear && (
            <div className="row"><button ref={clearRef} type="button" className="btn line small" onClick={() => { clearAsked.current = true; setConfirmClear(true); }}>Clear {d.name}’s nutrition…</button></div>
          )}
          {src.current && confirmClear && (
            <div className="warnbox stack" data-testid="nutrition-clear-confirm">
              <p className="small" style={{ margin: 0 }}>Clear the current values? {d.name}’s nutrition becomes unknown and plates that use it show nutrition as unknown.</p>
              <div className="row">
                <button ref={keepRef} type="button" className="btn line small" onClick={() => setConfirmClear(false)}>Keep it</button>
                <button type="button" className="btn danger small" disabled={busy || changedUnderneath} onClick={clear}>Clear nutrition</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <form className="stack" noValidate onSubmit={(e) => { e.preventDefault(); void use(); }} data-testid="nutrition-candidate">
          <h3 ref={candHead} tabIndex={-1} style={{ ...wrap, margin: 0 }}>{c.description}</h3>
          <p className="small faint" style={{ ...wrap, margin: 0 }}>
            FDC {c.dataType} #{c.fdcId}{c.brandOwner ? ` · ${c.brandOwner}` : ""} · published {c.publicationDate ?? "date not stated"} · retrieved {day(cand.retrievedAt)}
          </p>
          {KIND_TEXT[cand.provenance] && <p className="small warnbox" style={{ margin: 0 }} data-testid="nutrition-fixture-label">This is a {KIND_TEXT[cand.provenance]}.</p>}
          {c.basisNote && <p className="small warnbox" style={{ margin: 0 }}>{c.basisNote}</p>}
          <dl className="small stack" style={{ margin: 0, gap: 2 }} data-testid="nutrition-values">
            <dt><strong>{c.basis ? `Per ${c.basis.qty} ${c.basis.unit} of the food as described` : "Per 100 (basis unclear)"}</strong></dt>
            {NUTRIENTS.map(({ key, label }) => {
              const n = c.nutrients[key];
              const v = n.amount !== null ? `${n.amount} ${n.unit}${key === "energy" ? ENERGY_NOTE[n.number] ?? "" : ""}` : n.status === "bad_unit" ? `unknown (stated in ${n.unit})` : "unknown";
              return <dd key={key} style={{ margin: 0 }} data-testid={`nutrient-${key}`}>{label}: {v}</dd>;
            })}
          </dl>
          {c.serving && (
            <p className="small" style={{ ...wrap, margin: 0 }} data-testid="nutrition-serving">
              Label serving: {c.serving.size ?? "?"} {c.serving.unit ?? ""}{c.serving.householdText ? ` (${c.serving.householdText})` : ""}{c.serving.grams ? "" : " — not in grams, so it is not converted"}.
              {" "}Label values per serving: {NUTRIENTS.map(({ key, label }) => `${label.toLowerCase()} ${c.serving.label[key] ?? "unknown"}`).join(", ")}. A serving is not 100 g.
            </p>
          )}
          {c.basis && c.portions.length > 0 && (
            <fieldset className="stack">
              <legend className="small">Amount the values are for</legend>
              <label className="option-row small" style={wrap}><input type="radio" name={`nut-portion-${d.key}`} checked={portion === ""} onChange={() => setPortion("")} /> Per {c.basis.qty} {c.basis.unit} (as published)</label>
              {c.portions.map((p: any) => (
                <label key={p.id} className="option-row small" style={wrap}><input type="radio" name={`nut-portion-${d.key}`} checked={portion === p.id} onChange={() => setPortion(p.id)} /> Per {p.label} (scaled by its gram weight)</label>
              ))}
            </fieldset>
          )}
          <fieldset className="stack" aria-describedby={`nut-form-hint-${d.key}`}>
            <legend className="small">What form do these values describe?</legend>
            <p className="small faint" id={`nut-form-hint-${d.key}`} style={{ ...wrap, margin: 0 }}>
              {c.formHint ? `The description says “${c.formHint}” — only a hint. ` : "FoodData Central does not state raw or cooked. "}
              Choose what the values describe. A recipe that uses {d.name} in a different form shows its nutrition as unknown; yields are never converted.
            </p>
            {(["raw", "cooked", "as_sold"] as const).map((f) => (
              <label key={f} className="option-row small"><input type="radio" name={`nut-form-${d.key}`} value={f} checked={form === f} onChange={() => setForm(f)} /> {FORM_TEXT[f]}</label>
            ))}
          </fieldset>
          <p className="small faint" style={{ margin: 0 }}>This is nutrition only. It does not review allergens or change exclusions.</p>
          <div className="row">
            <button type="button" className="btn line small" onClick={() => { focusResults.current = true; setCand(null); setAlert(null); }}>Back to results</button>
            <button className="btn primary small" disabled={!form || busy || changedUnderneath || !c.basis} data-testid="use-values">Use these values</button>
          </div>
        </form>
      )}
    </ModalSheet>
  );
}
