"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useStore } from "./store";
import { AlsoNeed } from "./AlsoNeed";
import { ModalSheet, focusFirst } from "./a11y";
import { FormAlert } from "./forms";
import { Steps } from "./Recipes";
import { PlaceholderTile } from "./Tile";

/** Cook / reheat-and-serve. Opening this records nothing; "Mark cooked" is explicit. */
export function CookScreen({ night }: { night: string }) {
  const { snapshot, command, announce, writesAllowed } = useStore();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const correctBtn = useRef<HTMLButtonElement>(null);
  if (!snapshot) return <p className="muted">Loading…</p>;
  const n = snapshot.week?.nights?.find((x: any) => x.night === night);
  if (!n || !n.recipe) return <p className="muted">No dinner to cook on this night. <Link href="/">Back to week</Link></p>;
  const isCook = n.kind === "cook";
  return (
    <article className="stack" data-testid="cook-view">
      <Link href="/" className="small">‹ Week</Link>
      <span className="chip">{n.dayName} · {isCook ? "Cook" : "Reheat and serve"}</span>
      <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
        <PlaceholderTile title={n.recipe.title} large />
        <h2 className="page-title grow" data-testid="cook-title">{n.recipe.title}</h2>
      </div>
      <p className="faint small">Recipe version {n.recipe.versionNo} (pinned to this dinner){n.recipe.estimate ? " · times and amounts are estimates" : ""} · {n.recipe.provenance === "fixture" ? "test fixture recipe" : n.recipe.sourceLabel ?? n.recipe.provenance}</p>
      {isCook ? (
        <>
          <div className="section-label">This cooking covers</div>
          <ul className="plain small">
            {Object.entries(groupPlates(n.batch.plates)).map(([k, v]) => <li key={k}>{k}: {v}</li>)}
          </ul>
          <div className="section-label">Amounts for the whole batch</div>
          <ul className="plain" data-testid="cook-amounts">
            {n.recipe.components.map((cmp: any) => (
              <li key={cmp.key}>
                <strong>{cmp.name}</strong>
                <ul className="amounts">
                  {n.cookAmounts.filter((a: any) => a.componentKey === cmp.key).map((a: any) => (
                    <li key={a.ingredientKey}>
                      <span>{a.quantity} {a.unit} {a.name}</span>
                      <AlsoNeed from="cook" ingredientKey={a.ingredientKey} label={a.name} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <div className="section-label">Plates tonight</div>
          <ul className="plain small">
            {n.plates.map((p: any) => (
              <li key={p.memberId + p.kind}>{snapshot.members.find((m: any) => m.id === p.memberId)?.displayName}: {n.recipe.components.map((c: any) => `${c.name} ${p.componentPortions[c.key]}×`).join(", ")}</li>
            ))}
          </ul>
          <div className="section-label">Steps</div>
          <Steps text={n.recipe.instructions} />
          {n.event.cooked ? (
            <div className="card stack" data-testid="cooked-state">
              <p style={{ margin: 0 }}><strong>Cooked</strong> · recorded by {n.event.cooked.by}, {new Date(n.event.cooked.at).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}</p>
              <button type="button" ref={correctBtn} className="link small" onClick={() => setCorrecting(true)} disabled={!writesAllowed}>
                Correct this: it wasn&apos;t cooked
              </button>
            </div>
          ) : (
            <button className="btn primary full big" data-testid="mark-cooked" disabled={busy || !writesAllowed} onClick={async () => {
              setBusy(true);
              const r = await command("RecordCooked", { eventId: n.event.id });
              setBusy(false);
              // Already recorded (e.g. the other member just did): say so; nothing was added.
              setMsg(r.status === "accepted" ? "Recorded as cooked." : r.message);
            }}>Mark cooked</button>
          )}
          {correcting && n.event.cooked && (
            <CorrectCookedDialog recordId={n.event.cooked.recordId} by={n.event.cooked.by} title={n.recipe.title}
              onClose={() => setCorrecting(false)}
              onCorrected={(text) => { setMsg(text); announce(text); }}
              returnFocus={() => focusFirst(correctBtn.current, () => document.querySelector<HTMLElement>("[data-testid=mark-cooked]"), () => document.querySelector<HTMLElement>("[data-testid=cook-title]"))} />
          )}
        </>
      ) : (
        <>
          <p>Leftovers from {n.event.cookNight}. Serve each plate:</p>
          <ul className="plain small">{n.plates.map((p: any) => <li key={p.memberId + p.kind}>{snapshot.members.find((m: any) => m.id === p.memberId)?.displayName}: {n.recipe.components.map((c: any) => `${c.name} ${p.componentPortions[c.key]}×`).join(", ")}</li>)}</ul>
          <div className="section-label">Reheat</div>
          {n.recipe.reheatInstructions ? <Steps text={n.recipe.reheatInstructions} testId="reheat-instructions" /> : <p className="faint" data-testid="reheat-instructions">No reheat instructions recorded for this recipe.</p>}
        </>
      )}
      {msg && <p role="status">{msg}</p>}
      <p className="faint small">Opening this page does not record cooking or eating.</p>
    </article>
  );
}

/** Deliberate correction of a mistaken "cooked" record: appended, nothing deleted; "Keep the record" is
 *  the default. Afterwards cooking can be recorded again. */
function CorrectCookedDialog({ recordId, by, title, onClose, onCorrected, returnFocus }: {
  recordId: string; by: string; title: string; onClose: () => void; onCorrected: (text: string) => void; returnFocus: () => void;
}) {
  const { command } = useStore();
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <ModalSheet title="Correct the cooking record?" subtitle={title} closeLabel="Close without correcting" onClose={onClose} returnFocus={returnFocus} testId="correct-cooked-dialog">
      <FormAlert message={formError} testId="correct-cooked-error" />
      <p style={{ margin: 0 }}>
        {by} recorded this dinner as cooked. If it was not cooked, the record is marked as corrected (it stays in the history) and the dinner counts as not cooked yet.
      </p>
      <div className="row">
        <button type="button" className="btn line" data-autofocus="" onClick={onClose}>Keep the record</button>
        <button type="button" className="btn danger" disabled={busy} onClick={async () => {
          setBusy(true);
          const r = await command("CorrectCookRecord", { cookRecordId: recordId, reason: "not_cooked" });
          setBusy(false);
          if (r?.status !== "accepted") return setFormError(r?.message ?? "Nothing was changed.");
          onCorrected("Corrected: this dinner is not recorded as cooked.");
          onClose();
        }}>It wasn&apos;t cooked</button>
      </div>
    </ModalSheet>
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
