"use client";
import { useState } from "react";
import { useStore } from "./store";

/** One fast shared capture. Staple tap = usual amount; "Extra" keeps its own quantity. */
export function AlsoNeed({ from, ingredientKey, label }: { from: "week" | "groceries" | "cook"; ingredientKey?: string; label?: string }) {
  const { snapshot, command } = useStore();
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendingAnother, setPendingAnother] = useState<{ text: string; key?: string } | null>(null);
  if (!snapshot) return null;
  // Capture never waits for an adopted menu: it targets the shown week's pickup, and the
  // server routes past a confirmed order to the next open pickup.
  const target = snapshot.week?.id ? { weekId: snapshot.week.id } : { weekStart: snapshot.clock.weekStart };
  async function capture(t: string, kind: "usual" | "extra", key?: string, addAnother = false) {
    if (!t.trim()) return;
    const r = await command("CaptureHouseholdNeed", { ...target, text: t, ingredientKey: key ?? null, kind, from, addAnother });
    if (r.status === "accepted") {
      setText("");
      setPendingAnother(null);
      const where = r.result.destination?.reason === "next_pickup" ? ` to the next pickup (week of ${r.result.destination.weekStart.slice(5)}) — this week's order is already confirmed` : "";
      setMsg(r.result.merged ? `Already on the list${where} — added you as a requester.` : r.result.matchedIngredient ? `Added${where}.` : `Added as text${where}; match it to an item when you review groceries.`);
    } else if (r.code === "already_in_order") {
      setPendingAnother({ text: t, key });
      setMsg(r.message);
    } else setMsg(r.message);
  }
  if (ingredientKey) {
    return (
      <span className="row">
        <button className="btn line small" onClick={() => capture(label ?? ingredientKey, "usual", ingredientKey)}>Also need {label}</button>
        {msg && <span className="faint small" role="status">{msg}</span>}
        {pendingAnother && <button className="btn line small" onClick={() => capture(pendingAnother.text, "usual", pendingAnother.key, true)}>Add another</button>}
      </span>
    );
  }
  return (
    <form
      className="alsoneed"
      data-testid={`alsoneed-${from}`}
      onSubmit={(e) => {
        e.preventDefault();
        void capture(text, "usual");
      }}
    >
      <label className="sr-only" htmlFor={`an-${from}`}>Also need</label>
      <input id={`an-${from}`} placeholder="Also need… (e.g. Greek yogurt)" value={text} onChange={(e) => setText(e.target.value)} list="ingredient-names" />
      <datalist id="ingredient-names">{snapshot.ingredients.map((i: any) => <option key={i.key} value={i.name} />)}</datalist>
      <button className="btn primary small" type="submit">Add</button>
      <button className="btn line small" type="button" onClick={() => capture(text, "extra")} title="An explicit extra package on top of anything else">Extra</button>
      {snapshot.staples?.length > 0 && (
        <div className="row full-row" aria-label="Usual items">
          {snapshot.staples.map((st: any) => (
            <button key={st.ingredientKey} type="button" className="chip-btn" onClick={() => capture(st.name, "usual", st.ingredientKey)} title={st.productName ?? undefined}
              aria-label={`${st.name}${st.usualPackages > 1 ? ` ×${st.usualPackages}` : ""} — your usual (${st.productName ?? "no product remembered"}${st.productAvailable === false ? ", not available from this store" : ""})`}>
              {st.name}{st.usualPackages > 1 ? ` ×${st.usualPackages}` : ""}
            </button>
          ))}
        </div>
      )}
      {msg && <p className="faint small full-row" role="status">{msg}</p>}
      {pendingAnother && <button type="button" className="btn line small" onClick={() => capture(pendingAnother.text, "usual", pendingAnother.key, true)}>Add another</button>}
    </form>
  );
}
