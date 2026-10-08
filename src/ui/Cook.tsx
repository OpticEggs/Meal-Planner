"use client";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "./store";
import { AlsoNeed } from "./AlsoNeed";

/** Cook / reheat-and-serve. Opening this records nothing; "Mark cooked" is explicit. */
export function CookScreen({ night }: { night: string }) {
  const { snapshot, command } = useStore();
  const [msg, setMsg] = useState<string | null>(null);
  if (!snapshot) return <p className="muted">Loading…</p>;
  const n = snapshot.week?.nights?.find((x: any) => x.night === night);
  if (!n || !n.recipe) return <p className="muted">No dinner to cook on this night. <Link href="/">Back to week</Link></p>;
  const isCook = n.kind === "cook";
  return (
    <article className="stack" data-testid="cook-view">
      <Link href="/" className="small">‹ Week</Link>
      <span className="chip">{n.dayName} · {isCook ? "Cook" : "Reheat and serve"}</span>
      <h2 className="h2" data-testid="cook-title">{n.recipe.title}</h2>
      <p className="faint small">Recipe version {n.recipe.versionNo} (pinned to this dinner){n.recipe.estimate ? " · times and amounts are estimates" : ""} · {n.recipe.provenance === "fixture" ? "test fixture recipe" : n.recipe.sourceLabel ?? n.recipe.provenance}</p>
      {isCook ? (
        <>
          <div className="section-label">This cooking covers</div>
          <ul className="small">
            {Object.entries(groupPlates(n.batch.plates)).map(([k, v]) => <li key={k}>{k}: {v}</li>)}
          </ul>
          <div className="section-label">Amounts for the whole batch</div>
          <ul className="small" data-testid="cook-amounts">
            {n.recipe.components.map((cmp: any) => (
              <li key={cmp.key}>
                <strong>{cmp.name}</strong>
                <ul>
                  {n.cookAmounts.filter((a: any) => a.componentKey === cmp.key).map((a: any) => (
                    <li key={a.ingredientKey} className="row between">
                      <span>{a.quantity} {a.unit} {a.name}</span>
                      <AlsoNeed from="cook" ingredientKey={a.ingredientKey} label={a.name} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <div className="section-label">Plates tonight</div>
          <ul className="small">
            {n.plates.map((p: any) => (
              <li key={p.memberId + p.kind}>{snapshot.members.find((m: any) => m.id === p.memberId)?.displayName}: {n.recipe.components.map((c: any) => `${c.name} ${p.componentPortions[c.key]}×`).join(", ")}</li>
            ))}
          </ul>
          <div className="section-label">Steps</div>
          <pre className="instructions">{n.recipe.instructions || "No steps recorded."}</pre>
          <button className="btn primary" onClick={async () => {
            const r = await command("RecordCooked", { eventId: n.event.id });
            setMsg(r.status === "accepted" ? "Recorded as cooked." : r.message);
          }}>Mark cooked</button>
        </>
      ) : (
        <>
          <p>Leftovers from {n.event.cookNight}. Serve each plate:</p>
          <ul className="small">{n.plates.map((p: any) => <li key={p.memberId + p.kind}>{snapshot.members.find((m: any) => m.id === p.memberId)?.displayName}: {n.recipe.components.map((c: any) => `${c.name} ${p.componentPortions[c.key]}×`).join(", ")}</li>)}</ul>
          <div className="section-label">Reheat</div>
          <pre className="instructions" data-testid="reheat-instructions">{n.recipe.reheatInstructions || "No reheat instructions recorded for this recipe."}</pre>
        </>
      )}
      {msg && <p role="status">{msg}</p>}
      <p className="faint small">Opening this page does not record cooking or eating.</p>
    </article>
  );
}

function groupPlates(plates: any[]): Record<string, string> {
  const out: Record<string, string[]> = {};
  for (const p of plates) {
    const k = `${p.night} ${p.kind}`;
    (out[k] ??= []).push("plate");
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, `${v.length} plate(s)`]));
}
