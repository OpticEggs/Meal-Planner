"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "./store";
import { ModalSheet, focusFirst, nightFallback } from "./a11y";
import { AlsoNeed } from "./AlsoNeed";
import { budgetText, costView, dateLabel, effortText, money, nutrient, preferenceText } from "./format";
import { PlaceholderTile } from "./Tile";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function WeekScreen() {
  const { snapshot, setWeekStart } = useStore();
  if (!snapshot) return <p className="muted">Loading…</p>;
  const clock = snapshot.clock;
  return (
    <div>
      <h2 className="page-title" data-testid="week-title" tabIndex={-1}>Week of {dateLabel(clock.weekStart)}</h2>
      {/* Week movement (visual update): the arrows keep their names; "This week" returns to the current
          week. Browsing weeks only reads; it never changes a plan. */}
      <nav className="weekchips" aria-label="Choose a week">
        <button className="chip-btn" onClick={() => setWeekStart(clock.prevWeekStart)} aria-label="Previous week"><span aria-hidden="true">‹ </span>Previous</button>
        <button className="chip-btn" onClick={() => setWeekStart(clock.currentWeekStart)} aria-current={clock.weekStart === clock.currentWeekStart ? "true" : undefined}>This week</button>
        <button className="chip-btn" onClick={() => setWeekStart(clock.nextWeekStart)} aria-label="Next week">Next<span aria-hidden="true"> ›</span></button>
      </nav>
      {snapshot.week?.adopted ? <AdoptedWeek /> : <ProposalView />}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Before adoption: one complete proposed week

function ProposalView() {
  const { snapshot, command, writesAllowed } = useStore();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [opts, setOpts] = useState<{ variety: string; maxEffort: string; maxNewRecipes: string; cookingSessions: string }>({ variety: "", maxEffort: "", maxNewRecipes: "", cookingSessions: "" });
  const proposal = snapshot.proposals?.[0];
  async function generate(mode: "fresh" | "fewer_sessions" | "different_dinners") {
    setBusy(true);
    setMsg(null);
    const inputs: any = {};
    if (opts.variety) inputs.variety = opts.variety;
    if (opts.maxEffort) inputs.maxEffort = opts.maxEffort;
    if (opts.maxNewRecipes !== "") inputs.maxNewRecipes = Number(opts.maxNewRecipes);
    if (opts.cookingSessions !== "" && mode === "fresh") inputs.cookingSessions = Number(opts.cookingSessions);
    const r = await command("GenerateProposal", { weekStart: snapshot.clock.weekStart, mode, basedOnProposalId: mode === "fresh" ? null : proposal?.id, inputs });
    setBusy(false);
    if (r.status !== "accepted") setMsg(r.message);
  }
  async function adopt() {
    setBusy(true);
    const r = await command("AdoptWeekProposal", {
      proposalId: proposal.id, reviewedHash: proposal.contentHash, expectedAcceptedChoiceRevision: proposal.baseAcceptedChoiceRevision,
    });
    setBusy(false);
    if (r.status !== "accepted") {
      const newer = r.details?.newerChanges?.map((c: any) => `${c.text}`).join("; ");
      const problems = r.details?.problems?.join(" ");
      setMsg(`${r.message}${newer ? ` Newer: ${newer}.` : ""}${problems ? ` ${problems}` : ""}`);
    }
  }
  return (
    <section aria-label="Proposed week">
      <div className="card stack">
        <p className="muted small">Table proposes one complete week. Nothing is adopted until one of you chooses <strong>Use this week</strong>. Adopting does not order, cook or record eating anything.</p>
        <div className="grid4">
          <label>Cooking sessions<select value={opts.cookingSessions} onChange={(e) => setOpts({ ...opts, cookingSessions: e.target.value })}><option value="">Saved/default</option>{[2, 3, 4, 5, 6, 7].map((n) => <option key={n}>{n}</option>)}</select></label>
          <label>Effort cap<select value={opts.maxEffort} onChange={(e) => setOpts({ ...opts, maxEffort: e.target.value })}><option value="">Saved/none</option><option value="easy">easy</option><option value="medium">medium</option><option value="involved">involved</option></select></label>
          <label>Variety<select value={opts.variety} onChange={(e) => setOpts({ ...opts, variety: e.target.value })}><option value="">Saved/neutral</option><option value="familiar">familiar</option><option value="balanced">balanced</option><option value="adventurous">adventurous</option></select></label>
          <label>New recipes (max)<select value={opts.maxNewRecipes} onChange={(e) => setOpts({ ...opts, maxNewRecipes: e.target.value })}><option value="">Saved/no limit</option>{[0, 1, 2, 3].map((n) => <option key={n}>{n}</option>)}</select></label>
        </div>
        <button className="btn line" onClick={() => generate("fresh")} disabled={busy}>{proposal ? "New proposal" : "Propose a week"}</button>
      </div>
      {msg && <p role="alert" className="warnbox">{msg}</p>}
      {proposal && (
        <div className="card stack" data-testid="proposal">
          {proposal.stale && <p className="warnbox" role="alert">The accepted week changed after this proposal was made. Make a new proposal.</p>}
          <p className="muted small">Proposed by {proposal.createdBy}. {proposal.explanation.settingsUsed.cookingSessionsIsDefault ? `${proposal.explanation.settingsUsed.cookingSessions} cooking sessions (default — not a saved household setting).` : `${proposal.explanation.settingsUsed.cookingSessions} cooking sessions.`}</p>
          {proposal.explanation.changes?.length > 0 && (
            <ul className="small" aria-label="What changed">{proposal.explanation.changes.map((c: string) => <li key={c}>{c}</li>)}</ul>
          )}
          <ProposalSummary proposal={proposal} />
          <ol className="nights">
            {proposal.content.nights.map((n: any) => (
              <li key={n.night} className="night" data-testid={`proposal-night-${n.night}`}>
                <PlaceholderTile title={n.recipeVersionId ? proposal.titles[n.recipeVersionId] : null} />
                <div className="grow">
                  <div className="day">{dayShort(n.night)}</div>
                  <strong className="night-title">{n.kind === "cook" ? proposal.titles[n.recipeVersionId] : n.kind === "leftover" ? `Leftovers: ${proposal.titles[n.recipeVersionId]}` : n.kind === "out" ? "Out" : "Open — needs a decision"}</strong>
                  <div className="meta">{n.reasons.join(" · ")}</div>
                </div>
              </li>
            ))}
          </ol>
          {proposal.content.unresolved.length > 0 && <p className="warnbox">{proposal.content.unresolved.join(" ")}</p>}
          {proposal.explanation.excluded?.length > 0 && (
            <details className="small"><summary>Not proposed ({proposal.explanation.excluded.length})</summary><ul>{proposal.explanation.excluded.map((x: any) => <li key={x.title}>{x.title}: {x.reason}</li>)}</ul></details>
          )}
          <div className="row">
            <button className="btn line small" onClick={() => generate("fewer_sessions")} disabled={busy}>Fewer sessions</button>
            <button className="btn line small" onClick={() => generate("different_dinners")} disabled={busy}>Different dinners</button>
          </div>
          {incomplete(proposal) && (
            <p className="warnbox" role="status" data-testid="incomplete-proposal">
              This draft is not a complete week ({proposal.content.nights.filter((n: any) => n.kind === "open").length} night(s) without a dinner). It stays a draft; add recipes or change the controls, then propose again.
            </p>
          )}
          <button className="btn primary full big" onClick={adopt} disabled={busy || !writesAllowed || proposal.stale || incomplete(proposal)} data-testid="adopt">Use this week</button>
        </div>
      )}
      <div className="section-label">Also need (this week’s pickup list — no menu required)</div>
      <AlsoNeed from="week" />
    </section>
  );
}

function incomplete(proposal: any): boolean {
  return proposal.content.nights.some((n: any) => n.kind === "open") || proposal.content.unresolved.length > 0;
}

function ProposalSummary({ proposal }: { proposal: any }) {
  const nights = proposal.content.nights;
  const cook = nights.filter((n: any) => n.kind === "cook").length;
  const left = nights.filter((n: any) => n.kind === "leftover").length;
  const out = nights.filter((n: any) => n.kind === "out").length;
  const open = nights.filter((n: any) => n.kind === "open").length;
  const fresh = nights.filter((n: any) => n.reasons?.some((r: string) => r.startsWith("New to you"))).length;
  return (
    <div className="stats">
      <div className="stat"><span>Cooking</span><strong>{cook}</strong></div>
      <div className="stat"><span>Leftovers</span><strong>{left}</strong></div>
      <div className="stat"><span>Out / open</span><strong>{out} / {open}</strong></div>
      <div className="stat"><span>New to you</span><strong>{fresh}</strong></div>
    </div>
  );
}

function dayShort(d: string) {
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

// ---------------------------------------------------------------------------------------------
// After adoption

function AdoptedWeek() {
  const { snapshot, loadLibrary } = useStore();
  const week = snapshot.week;
  const next = week.nights.find((n: any) => n.night === snapshot.clock.nextDinner);
  const g = snapshot.groceries;
  const [openNight, setOpenNight] = useState<string | null>(null);
  // Dinner cards show serving cost and the members' recorded preferences from the library read.
  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);
  const outstanding = (g?.lines ?? []).filter((l: any) => ["needs_review", "not_sent_yet", "uncertain", "missing"].includes(l.status)).length;
  const unresolved = week.nights.filter((n: any) => n.coverage.status === "unresolved" || n.coverage.status === "uncovered");
  return (
    <section aria-label="Accepted week">
      <h2 className="sr-only" id="plan-status">Accepted plan status</h2>
      <p className="status-line" data-testid="status-sentence">{week.statusSentence}</p>
      {next && <NextDinner night={next} />}
      {(outstanding > 0 || unresolved.length > 0) && (
        <div className="card stack" data-testid="still-to-do">
          <div className="section-label" style={{ margin: 0 }}>Still to do</div>
          <ul className="small" style={{ margin: 0, paddingLeft: "1.2em" }}>
            {unresolved.length > 0 && <li>{unresolved.map((n: any) => n.dayName).join(", ")}: {unresolved.length > 1 ? "need" : "needs"} a decision (use Change below)</li>}
            {outstanding > 0 && <li><Link href="/groceries" style={{ display: "inline-block" }}>{outstanding} grocery {outstanding === 1 ? "line needs" : "lines need"} someone</Link></li>}
          </ul>
        </div>
      )}
      <div className="card stack" data-testid="week-groceries-summary">
        <div className="section-label" style={{ margin: 0 }}>Pickup estimate</div>
        <p className={g?.summary?.pickupSpending?.complete ? "estimate-total" : "estimate-partial"} data-testid="pickup-estimate">{costView(g?.summary?.pickupSpending)}</p>
        <div className="statrow">
          <div><span>Dinner ingredients</span><strong>{costView(g?.summary?.dinnerIngredientCost)}</strong></div>
          <div><span>Budget</span><strong>{budgetText(g?.summary?.budget)}</strong></div>
        </div>
      </div>
      <OpenPreviews exceptNight={openNight} />
      <div className="section-label">This week · accepted revision <span data-testid="accepted-revision">{week.acceptedChoiceRevision}</span></div>
      <ol className="nights" aria-label="Accepted dinners">
        {week.nights.map((n: any) => (
          <NightRow key={n.night} n={n} open={openNight === n.night} onOpen={() => setOpenNight(n.night)} onClose={() => setOpenNight((o) => (o === n.night ? null : o))} />
        ))}
      </ol>
      {snapshot.deferred.length > 0 && <Deferred />}
      <div className="section-label">Also need</div>
      <AlsoNeed from="week" />
    </section>
  );
}

function NextDinner({ night }: { night: any }) {
  const label = night.kind === "cook" ? night.recipe?.title : night.kind === "leftover" ? `Leftovers: ${night.recipe?.title}` : night.kind === "out" ? "Dinner out" : "No dinner chosen";
  return (
    <div className="tonight card" data-testid="next-dinner">
      <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
        <PlaceholderTile title={night.recipe?.title} large />
        <div className="grow">
          <span className="chip">Next dinner · {night.dayName}</span>
          <h2>{label}</h2>
          {night.recipe && <div className="meta">{effortText(night.recipe)}{night.recipe.cuisine ? ` · ${night.recipe.cuisine}` : ""}</div>}
        </div>
      </div>
      <p className="muted small">
        {night.kind === "cook" && night.batch
          ? `One cooking covers ${new Set(night.batch.plates.filter((p: any) => p.kind === "dinner").map((p: any) => p.night)).size} dinner(s)${night.batch.plates.some((p: any) => p.kind === "lunch") ? " and a reserved lunch" : ""}.`
          : night.kind === "leftover"
            ? "Reheat and serve — no new cooking."
            : ""}
        {night.coverage.status === "unresolved" ? ` Unresolved: ${night.coverage.reason}` : ""}
      </p>
      {night.kind === "cook" && <Link className="btn primary full big" href={`/cook/${night.night}`} data-testid="cook-link">Cook</Link>}
      {night.kind === "leftover" && <Link className="btn primary full big" href={`/cook/${night.night}`} data-testid="reheat-link">Reheat and serve</Link>}
    </div>
  );
}

function coverageText(c: any) {
  return c.status === "covered" ? "Covered" : c.status === "out" ? "Out" : c.status === "uncovered" ? "No dinner" : "Unresolved";
}

function NightRow({ n, open, onOpen, onClose }: { n: any; open: boolean; onOpen: () => void; onClose: () => void }) {
  const { command, writesAllowed, snapshot, announce, library } = useStore();
  const [msg, setMsg] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const title = n.kind === "cook" ? n.recipe?.title : n.kind === "leftover" ? `Leftovers: ${n.recipe?.title}` : n.kind === "out" ? "Out" : "Open";
  const lib = n.recipe ? library?.recipes?.find((r: any) => r.recipeId === n.recipe.recipeId) : null;
  async function lock() {
    const r = await command("SetNightLock", { assignmentId: n.assignmentId, expectedRevision: n.revision, locked: !n.locked });
    setMsg(r.status === "accepted" ? null : r.message);
    if (r.status === "accepted") announce(`${n.dayName} ${n.locked ? "unlocked" : "locked"}.`);
  }
  return (
    <li className={`night ${n.night === snapshot.clock.nextDinner ? "is-next" : ""}`} data-testid={`night-${n.night}`} data-kind={n.kind} data-revision={n.revision}>
      <PlaceholderTile title={n.recipe?.title} />
      <div className="grow">
        <div className="day" aria-hidden="true">{n.dayName.slice(0, 3)}</div>
        <span className="sr-only">{n.dayName}: </span>
        <strong className="night-title" data-testid={`night-title-${n.night}`}>{title}</strong>
        {n.recipe && (n.kind === "cook" || n.kind === "leftover") && (
          <div className="meta">
            {n.kind === "cook" ? effortText(n.recipe) : "Reheat and serve"}
            {n.recipe.cuisine ? ` · ${n.recipe.cuisine}` : ""}
            {lib ? ` · ${lib.servingCost.complete ? `${money(lib.servingCost.knownMinor)} a serving` : "serving cost unknown"}` : ""}
            {lib && snapshot.members ? <span className="sr-only"> · </span> : null}
            {lib && snapshot.members ? <div>{preferenceText(lib.preferences, snapshot.members)}</div> : null}
          </div>
        )}
        <div className="faint small">
          <span className={`badge cov-${n.coverage.status}`}>{coverageText(n.coverage)}</span>
          {n.constraint.status !== "ok" && <span className={`badge con-${n.constraint.status}`}>{n.constraint.status === "violated" ? "Conflicts with an exclusion" : "Ingredient info unknown"}</span>}
          {n.locked && <span className="badge">Locked</span>}
          {n.updatedBy && <span> · last set by {n.updatedBy}</span>}
        </div>
        {n.coverage.status === "unresolved" && <div className="warn small">{n.coverage.reason}</div>}
        {n.constraint.status !== "ok" && <div className="warn small">{n.constraint.reasons.join("; ")} (text match, not allergen certification)</div>}
      </div>
      <div className="col">
        <button
          ref={opener}
          className="btn line small"
          onClick={onOpen}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Change ${n.dayName} dinner`}
          data-testid={`change-${n.night}`}
        >
          Change
        </button>
        <button className="btn line small" onClick={lock} disabled={!writesAllowed} aria-pressed={n.locked} aria-label={`${n.locked ? "Unlock" : "Lock"} ${n.dayName}`} data-testid={`lock-${n.night}`}>
          {n.locked ? "Unlock" : "Lock"}
        </button>
      </div>
      {msg && <p role="alert" className="warnbox full-row">{msg}</p>}
      {open && <ChangeSheet n={n} onClose={onClose} returnFocus={() => focusFirst(opener.current) ?? nightFallback(n.night)} />}
    </li>
  );
}

type SheetMode = "replace" | "move" | "backup" | "plates" | "facts";
const MODES: SheetMode[] = ["replace", "move", "backup", "plates", "facts"];
const MODE_LABEL: Record<SheetMode, string> = { replace: "Replace", move: "Move", backup: "Backup", plates: "Plates", facts: "Less left" };

/** Per-night Change sheet: a dismissible modal. It only creates private previews (and records the
 *  explicit facts its own buttons say); closing it — Escape, Close, backdrop — applies nothing. */
function ChangeSheet({ n, onClose, returnFocus }: { n: any; onClose: () => void; returnFocus: () => void }) {
  const { snapshot, library, loadLibrary, command, writesAllowed, me, announce } = useStore();
  const [mode, setMode] = useState<SheetMode>("replace");
  const [msg, setMsg] = useState<string | null>(null);
  const [toNight, setToNight] = useState("");
  const [remaining, setRemaining] = useState("");
  const [focusPreview, setFocusPreview] = useState<{ id: string; from: Element | null } | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const msgRef = useRef<HTMLParagraphElement>(null);
  const uid = `sheet-${n.night}`;
  useEffect(() => {
    if (!library) void loadLibrary();
  }, [library, loadLibrary]);
  const options = useMemo(() => {
    const list = (library?.recipes ?? []).filter((r: any) => !r.archived && r.version.id !== n.recipe?.id);
    // Options that use received, unallocated goods come first; then genuine extra cost.
    const known = list
      .filter((r: any) => r.additionalBasketCost.known)
      .sort((a: any, b: any) => (b.usesReceived?.length ? 1 : 0) - (a.usesReceived?.length ? 1 : 0) || a.additionalBasketCost.minor - b.additionalBasketCost.minor || a.version.title.localeCompare(b.version.title));
    const unknown = list.filter((r: any) => !r.additionalBasketCost.known).sort((a: any, b: any) => a.version.title.localeCompare(b.version.title));
    return { known, unknown };
  }, [library, n.recipe?.id]);
  const previews = snapshot.previews.filter((p: any) => p.targetNights.includes(n.night));
  // A new preview takes focus, so a screen reader reads its consequences next — unless the
  // member has already moved focus somewhere else while it was being made.
  useEffect(() => {
    if (!focusPreview) return;
    const el = document.getElementById(`preview-h-${focusPreview.id}`);
    if (el) {
      const active = document.activeElement;
      if (active === focusPreview.from || active === document.body || !active) el.focus();
      setFocusPreview(null);
    }
  }, [focusPreview, previews]);
  useEffect(() => {
    if (msg) msgRef.current?.focus();
  }, [msg]);
  async function preview(operation: any) {
    setMsg(null);
    const from = document.activeElement;
    const r = await command("CreatePreview", { weekId: snapshot.week.id, operation });
    if (r.status !== "accepted") setMsg(r.message);
    else setFocusPreview({ id: r.result.previewId, from });
  }
  function selectTab(m: SheetMode, focus = false) {
    setMode(m);
    if (focus) tabRefs.current[m]?.focus();
  }
  function onTabKey(e: React.KeyboardEvent, m: SheetMode) {
    const i = MODES.indexOf(m);
    const to = e.key === "ArrowRight" ? MODES[(i + 1) % MODES.length] : e.key === "ArrowLeft" ? MODES[(i + MODES.length - 1) % MODES.length] : e.key === "Home" ? MODES[0] : e.key === "End" ? MODES[MODES.length - 1] : null;
    if (to) {
      e.preventDefault();
      selectTab(to, true);
    }
  }
  const otherNights = snapshot.week.nights.filter((x: any) => x.night !== n.night);
  const current = n.kind === "cook" ? n.recipe?.title : n.kind === "leftover" ? `Leftovers: ${n.recipe?.title}` : n.kind === "out" ? "Out" : "Open — no dinner chosen";
  return (
    <ModalSheet
      title={`Change ${n.dayName} dinner`}
      subtitle={`Now: ${current}${n.locked ? " · locked" : ""}`}
      closeLabel={`Close ${n.dayName} changes`}
      onClose={onClose}
      returnFocus={returnFocus}
      testId={`sheet-${n.night}`}
    >
      <div className="tabs" role="tablist" aria-label={`Ways to change ${n.dayName}`}>
        {MODES.map((m) => (
          <button
            key={m}
            ref={(el) => {
              tabRefs.current[m] = el;
            }}
            type="button"
            role="tab"
            id={`${uid}-tab-${m}`}
            aria-selected={mode === m}
            aria-controls={`${uid}-panel`}
            tabIndex={mode === m ? 0 : -1}
            data-autofocus={mode === m ? "" : undefined}
            className={mode === m ? "on" : ""}
            onClick={() => selectTab(m)}
            onKeyDown={(e) => onTabKey(e, m)}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>
      {msg && <p role="alert" className="warnbox" tabIndex={-1} ref={msgRef}>{msg}</p>}
      <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${mode}`} className="stack">
        {(mode === "replace" || mode === "backup") && (
          <div className="stack">
            <p className="faint small">
              {mode === "replace" ? "Choose a dinner to preview. Nothing changes until you press Apply." : "Choose a backup; the original stays as a deferred dinner instead of being discarded."} Dinners that use groceries you already received come first, then by what you would still have to buy; unpriced options are listed separately.
            </p>
            {!library && <p className="muted">Loading recipes…</p>}
            {[...options.known, ...options.unknown].map((r: any, i: number) => (
              <div key={r.recipeId}>
                {i === options.known.length && options.unknown.length > 0 && <div className="section-label">Cost unknown</div>}
                <button
                  type="button"
                  className="option"
                  data-testid={`option-${r.version.title}`}
                  disabled={mode === "backup" && n.kind !== "cook"}
                  onClick={() => preview(mode === "replace" ? { type: "replace", assignmentId: n.assignmentId, recipeVersionId: r.version.id } : { type: "backup", assignmentId: n.assignmentId, recipeVersionId: r.version.id })}
                >
                  <span>{r.version.title}</span>
                  <span className="faint small">
                    {r.usesReceived?.length ? `Uses received ${r.usesReceived.join(", ")} · ` : ""}
                    {r.additionalBasketCost.known ? `${r.additionalBasketCost.minor >= 0 ? "+" : ""}${money(r.additionalBasketCost.minor)}` : "unknown"}{r.constraint.status !== "ok" ? " · fails exclusions" : ""}
                  </span>
                </button>
              </div>
            ))}
            <div className="row">
              <button type="button" className="btn line small" onClick={() => preview({ type: "set_kind", assignmentId: n.assignmentId, kind: "out" })}>Preview: night out</button>
              <button type="button" className="btn line small" onClick={() => preview({ type: "set_kind", assignmentId: n.assignmentId, kind: "open" })}>Preview: leave open</button>
            </div>
          </div>
        )}
        {mode === "move" && (
          <div className="stack">
            {n.kind !== "cook" ? (
              <p className="faint small">Only a cooking night can be moved.</p>
            ) : (
              <>
                <label>Move {n.recipe?.title} to
                  <select value={toNight} onChange={(e) => setToNight(e.target.value)}>
                    <option value="">Choose a night</option>
                    {otherNights.map((x: any) => <option key={x.night} value={x.night}>{x.dayName} — {x.kind === "cook" ? x.recipe?.title : x.kind}{x.locked ? " (locked)" : ""}</option>)}
                  </select>
                </label>
                <button type="button" className="btn line" disabled={!toNight} onClick={() => preview({ type: "move", assignmentId: n.assignmentId, toNight })}>Preview move</button>
              </>
            )}
          </div>
        )}
        {mode === "plates" && <PlateEditor n={n} />}
        {mode === "facts" && (
          <div className="stack">
            {n.event ? (
              <>
                <p className="faint small">Record what is actually left. This is a fact: selected dinners stay as they are; affected nights become unresolved and you decide any recovery. Closing this sheet records nothing.</p>
                <label>Portions left now<input inputMode="decimal" value={remaining} onChange={(e) => setRemaining(e.target.value)} /></label>
                <button
                  type="button"
                  className="btn line"
                  disabled={!remaining}
                  onClick={async () => {
                    const r = await command("RecordLeftoverShortfall", { eventId: n.event.id, portionsRemaining: remaining });
                    setMsg(r.status === "accepted" ? r.result.recovery : r.message);
                  }}
                >
                  Record less left than planned
                </button>
              </>
            ) : (
              <p className="faint small">No cooking linked to this night.</p>
            )}
          </div>
        )}
      </div>
      {previews.length > 0 && (
        <div className="stack" aria-label={`Your ${n.dayName} previews`} role="group">
          {previews.map((p: any) => (
            <PreviewCard
              key={p.id}
              p={p}
              onApplied={(text) => {
                announce(text);
                onClose();
              }}
              onCanceled={() => {
                announce("Preview discarded. Nothing changed.");
                tabRefs.current[mode]?.focus();
              }}
            />
          ))}
        </div>
      )}
      <p className="faint small">Signed in as {me.displayName}. Previews are private drafts until applied; closing this sheet keeps any draft and applies nothing.</p>
      {!writesAllowed && <p className="warn small">Checking for newer decisions — changes are paused until this view is current.</p>}
    </ModalSheet>
  );
}

function PlateEditor({ n }: { n: any }) {
  const { snapshot, command, writesAllowed } = useStore();
  const [msg, setMsg] = useState<string | null>(null);
  if (!n.event || !n.recipe) return <p className="faint small">No plates on this night.</p>;
  const members = snapshot.members;
  const targets = snapshot.targets;
  async function setPortion(memberId: string, kind: "dinner" | "lunch", component: string, value: string | null, night: string) {
    const portions = value === null ? null : { [component]: value };
    const r = await command("SetPlate", { eventId: n.event.id, expectedEventRevision: n.event.revision, memberId, night, kind, componentPortions: portions });
    setMsg(r.status === "accepted" ? null : r.message);
  }
  return (
    <div className="stack">
      <p className="faint small">Each person’s plate is set per component. Changing one component changes only its ingredients. Nutrition uses explicit ingredient data; unknown stays unknown.</p>
      {msg && <p role="alert" className="warnbox">{msg}</p>}
      {members.map((m: any) => {
        const plate = n.plates.find((p: any) => p.memberId === m.id && p.kind === "dinner");
        const t = targets.find((x: any) => x.memberId === m.id && x.scope === "dinner");
        const lunch = n.batch?.plates.find((p: any) => p.memberId === m.id && p.kind === "lunch");
        return (
          <div key={m.id} className="plate" data-testid={`plate-${m.displayName}`}>
            <strong>{m.displayName}</strong>
            {plate ? (
              <>
                {n.recipe.components.map((cmp: any) => (
                  <div key={cmp.key} className="row between">
                    <span>{cmp.name}</span>
                    <span className="row">
                      <button className="btn line small" aria-label={`Less ${cmp.name} for ${m.displayName}`} disabled={!writesAllowed || Number(plate.componentPortions[cmp.key]) <= 0} onClick={() => setPortion(m.id, "dinner", cmp.key, String(Math.max(0, Number(plate.componentPortions[cmp.key]) - 0.5)), n.night)}>−</button>
                      <span data-testid={`portion-${m.displayName}-${cmp.key}`}>{plate.componentPortions[cmp.key]}×</span>
                      <button className="btn line small" aria-label={`More ${cmp.name} for ${m.displayName}`} disabled={!writesAllowed} onClick={() => setPortion(m.id, "dinner", cmp.key, String(Number(plate.componentPortions[cmp.key]) + 0.5), n.night)}>+</button>
                    </span>
                  </div>
                ))}
                <div className="faint small">
                  {nutrient(plate.nutrition?.calories, " kcal")} · protein {nutrient(plate.nutrition?.proteinG, " g")}
                  {plate.nutrition?.synthetic ? " · synthetic test data" : ""}
                  {t ? ` · dinner target ${t.calories ?? "–"} kcal / ${t.proteinG ?? "–"} g protein (dinner only, not a daily total)` : " · no dinner target set"}
                </div>
              </>
            ) : (
              <span className="faint small"> no plate this night</span>
            )}
            {n.kind === "cook" && (
              <div className="small">
                Lunch from this batch: {lunch ? `reserved for ${dateLabel(lunch.night)}` : "none"}{" "}
                {lunch ? (
                  <button className="btn line small" disabled={!writesAllowed} onClick={() => setPortion(m.id, "lunch", n.recipe.components[0].key, null, lunch.night)}>Release lunch</button>
                ) : (
                  <button className="btn line small" disabled={!writesAllowed || !n.recipe.leftoverFriendly} onClick={async () => {
                    const nextNight = snapshot.week.nights.find((x: any) => x.night > n.night)?.night;
                    if (nextNight) {
                      const r = await command("SetPlate", { eventId: n.event.id, expectedEventRevision: n.event.revision, memberId: m.id, night: nextNight, kind: "lunch", componentPortions: Object.fromEntries(n.recipe.components.map((c: any) => [c.key, "1"])) });
                      setMsg(r.status === "accepted" ? null : r.message);
                    }
                  }}>Reserve tomorrow’s lunch</button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Open drafts not shown inside an open Change sheet. */
function OpenPreviews({ exceptNight }: { exceptNight: string | null }) {
  const { snapshot, announce } = useStore();
  const list = snapshot.previews.filter((p: any) => !(exceptNight && p.targetNights.includes(exceptNight)));
  if (!list.length) return null;
  return (
    <div role="group" aria-label="Your open previews">
      {list.map((p: any) => (
        <PreviewCard
          key={p.id}
          p={p}
          onApplied={(text) => {
            announce(text);
            nightFallback(p.targetNights[0] ?? null);
          }}
          onCanceled={() => {
            announce("Preview discarded. Nothing changed.");
            nightFallback(p.targetNights[0] ?? null);
          }}
        />
      ))}
    </div>
  );
}

function PreviewCard({ p, onApplied, onCanceled }: { p: any; onApplied: (announcement: string) => void; onCanceled: () => void }) {
  const { snapshot, command, writesAllowed, currency } = useStore();
  const [msg, setMsg] = useState<string | null>(null);
  const msgRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (msg) msgRef.current?.focus();
  }, [msg]);
  const target = p.targetNights.map((d: string) => snapshot.week.nights.find((x: any) => x.night === d)?.dayName).filter(Boolean).join(", ");
  const blocked = p.consequence.blockers?.length > 0;
  const state = p.stale ? "out of date" : "draft, not applied";
  return (
    <div className={`card preview ${p.stale ? "stale" : ""}`} data-testid="preview" data-stale={p.stale ? "true" : "false"} role="region" aria-labelledby={`preview-h-${p.id}`}>
      <div className="row between">
        <h3 className="preview-title" id={`preview-h-${p.id}`} tabIndex={-1}>
          Preview · {target}<span className="sr-only"> — {state}</span>
        </h3>
        {p.stale ? <span className="badge con-violated" data-testid="stale-badge"><span aria-hidden="true">⚠ </span>Out of date</span> : <span className="badge" aria-hidden="true">Draft — not applied</span>}
      </div>
      {p.stale && (
        // Announced once by the announcer when it becomes stale; here it is readable text.
        <p className="warnbox" data-testid="stale-message">
          {p.staleChanges.length
            ? p.staleChanges.map((c: any) => `${c.by ?? "Someone"} changed ${c.dayName} to ${c.now}.`).join(" ")
            : "A newer decision changed what this preview depends on."}{" "}
          This preview can’t be applied as reviewed. Review the current week and make a new choice.
        </p>
      )}
      <ul className="small">{p.consequence.lines.map((l: string) => <li key={l}>{l}</li>)}</ul>
      {p.consequence.groceryDelta?.length > 0 && (
        <div className="small">
          <div className="section-label">Grocery change if applied</div>
          <ul>{p.consequence.groceryDelta.map((d: any) => <li key={d.name}>{d.name}: {d.change}{d.before && d.after ? ` (${d.before} → ${d.after})` : ""}</li>)}</ul>
          <div>Additional basket cost vs {p.consequence.baseline}: {p.consequence.additionalBasketCost.known ? money(p.consequence.additionalBasketCost.minor) : "unknown (unpriced items)"}</div>
        </div>
      )}
      {blocked && <p className="warnbox">{p.consequence.blockers.map((b: any) => b.message).join(" ")}</p>}
      {p.consequence.budgetBlock && <p className="warnbox">{p.consequence.budgetBlock}</p>}
      {msg && <p role="alert" className="warnbox" tabIndex={-1} ref={msgRef}>{msg}</p>}
      <div className="row">
        <button
          type="button"
          className="btn primary"
          data-testid="apply"
          disabled={p.stale || blocked || !writesAllowed}
          aria-label={`Apply ${target} preview`}
          title={!writesAllowed ? (currency === "offline" ? "Offline" : "Checking for newer decisions") : undefined}
          onClick={async () => {
            const r = await command("ApplyPlanChange", { previewId: p.id, reviewedHash: p.contentHash });
            if (r.status !== "accepted") setMsg(r.message);
            else onApplied(`Applied. ${p.consequence.lines[0] ?? `${target} changed.`}`);
          }}
        >
          Apply
        </button>
        <button
          type="button"
          className="btn line"
          data-testid="cancel-preview"
          aria-label={`${p.stale ? "Discard" : "Cancel"} ${target} preview`}
          onClick={async () => {
            const r = await command("CancelPreview", { previewId: p.id });
            if (r.status === "accepted") onCanceled();
            else setMsg(r.message);
          }}
        >
          {p.stale ? "Discard draft" : "Cancel"}
        </button>
      </div>
    </div>
  );
}

function Deferred() {
  const { snapshot, command } = useStore();
  const [to, setTo] = useState<Record<string, string>>({});
  const [msgs, setMsgs] = useState<Record<string, string>>({});
  const [focusPreview, setFocusPreview] = useState<{ id: string; from: Element | null } | null>(null);
  // A placement preview appears with the open drafts; it takes focus so it is read next — unless
  // the member has moved focus elsewhere while it was being made (as in the Change sheet, D41).
  useEffect(() => {
    if (!focusPreview) return;
    const el = document.getElementById(`preview-h-${focusPreview.id}`);
    if (el) {
      const active = document.activeElement;
      if (!active || active === document.body || active === focusPreview.from) el.focus();
      setFocusPreview(null);
    }
  }, [focusPreview, snapshot]);
  const free = snapshot.week.nights.filter((n: any) => (n.kind === "open" || n.kind === "out") && !n.locked);
  return (
    <div className="card stack" aria-label="Deferred dinners">
      <div className="section-label">Deferred dinners (kept, not scheduled)</div>
      {snapshot.deferred.map((d: any) => (
        <div key={d.id} className="row between">
          <span>{d.recipe?.title}</span>
          <span className="row">
            <select value={to[d.id] ?? ""} onChange={(e) => setTo({ ...to, [d.id]: e.target.value })} aria-label={`Place ${d.recipe?.title} on a night`}
              aria-invalid={msgs[d.id] ? true : undefined} aria-describedby={msgs[d.id] ? `deferred-msg-${d.id}` : undefined}>
              <option value="">Place on…</option>
              {free.map((n: any) => <option key={n.night} value={n.night}>{n.dayName}</option>)}
            </select>
            <button className="btn line small" disabled={!to[d.id]} aria-label={`Preview placing ${d.recipe?.title}`} onClick={async (e) => {
              const from = e.currentTarget;
              const r = await command("CreatePreview", { weekId: snapshot.week.id, operation: { type: "place", eventId: d.id, toNight: to[d.id] } });
              if (r.status !== "accepted") setMsgs({ ...msgs, [d.id]: r.message });
              else {
                setMsgs({ ...msgs, [d.id]: "" });
                setFocusPreview({ id: r.result.previewId, from });
              }
            }}>Preview</button>
          </span>
          {msgs[d.id] && <p role="alert" className="field-error full-row" id={`deferred-msg-${d.id}`}>{msgs[d.id]}</p>}
        </div>
      ))}
    </div>
  );
}
