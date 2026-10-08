"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useStore } from "./store";
import { FieldError, fieldProps, type Errors } from "./forms";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const BUDGET_BYTES_INDEX = "https://www.budgetbytes.com/index/";

/** What a saved link is, in words. A link is never "ready to cook" until a member confirmed an import. */
export function linkState(b: any): string {
  if (b.recipeId) return "Imported — a recipe in Our Recipes";
  if (b.draft) return "Import in review — not a recipe yet";
  switch (b.status) {
    case "unsupported": return b.statusDetail ?? "Import isn't available for this page";
    case "unavailable": return b.statusDetail ?? "The page couldn't be read — open the source";
    case "permission_blocked": return b.statusDetail ?? "This site asks for permission before reuse — enter ingredients yourself";
    default: return "Saved link — not imported";
  }
}

function savedBy(b: any): string {
  const names = [...new Set(b.saves.map((s: any) => s.by))] as string[];
  return names.length ? `Saved by ${names.join(" and ")}` : `Saved by ${b.createdBy}`;
}

/** Paste a link and save it for both members. Saving never opens or reads the page. */
export function SaveLinkForm({ idPrefix = "save-link", source }: { idPrefix?: string; source?: string }) {
  const { command, announce } = useStore();
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const urlRef = useRef<HTMLInputElement>(null);
  const urlId = `${idPrefix}-url`;
  const noteId = `${idPrefix}-note`;
  return (
    <form className="stack" aria-label="Save a recipe link" data-testid={`${idPrefix}-form`}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!url.trim()) {
          setErrors({ [urlId]: "Paste a link to a recipe page." });
          urlRef.current?.focus();
          return;
        }
        setBusy(true);
        const r = await command("SaveLink", { url, note: note || null });
        setBusy(false);
        if (r.status === "accepted") {
          setErrors({});
          setUrl("");
          setNote("");
          announce(r.result?.existed ? (r.result?.restored ? "That link was archived; it is back in Saved links." : "That link was already saved; your note was added.") : "Link saved for both of you.");
        } else {
          setErrors({ [urlId]: r.message });
          urlRef.current?.focus();
        }
      }}>
      <label htmlFor={urlId}>Recipe link{source ? ` (${source} or any site)` : ""}</label>
      <input ref={urlRef} type="url" inputMode="url" autoComplete="off" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" {...fieldProps(urlId, errors)} />
      <FieldError id={urlId} errors={errors} />
      <label htmlFor={noteId}>Note (optional)</label>
      <input type="text" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} {...fieldProps(noteId, errors)} />
      <div className="row">
        <button className="btn primary" type="submit" disabled={busy} data-testid={`${idPrefix}-submit`}>Save link</button>
        <span className="faint small">Saving keeps the link for both of you; it doesn't read the page or add a dinner.</span>
      </div>
    </form>
  );
}

export function SavedLinkCard({ b, onImport }: { b: any; onImport?: (b: any, el: HTMLElement) => void }) {
  const { command, announce, library } = useStore();
  const [msg, setMsg] = useState<string | null>(null);
  const recipe = b.recipeId ? library?.recipes.find((r: any) => r.recipeId === b.recipeId) : null;
  const label = b.title ?? b.url.replace(/^https?:\/\//, "");
  return (
    <li className="card stack" data-testid="saved-link" data-url={b.url}>
      <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
        <span className="chip" data-testid="link-source">{b.sourceLabel}</span>
        <strong className="grow" style={{ overflowWrap: "anywhere" }}>{label}</strong>
      </div>
      <p className="small muted" style={{ margin: 0 }} data-testid="link-state">{linkState(b)}</p>
      <p className="small faint" style={{ margin: 0 }}>{savedBy(b)}</p>
      {b.saves.filter((s: any) => s.note).map((s: any, i: number) => (
        <p key={i} className="small" style={{ margin: 0 }}><span className="faint">{s.by}:</span> {s.note}</p>
      ))}
      <div className="row small">
        <a className="btn line small" href={b.url} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Open source: ${label} (opens ${b.domain})`}>Open source ↗</a>
        {recipe && <Link className="btn line small" href={`/recipes/${recipe.recipeId}`} aria-label={`Open recipe ${recipe.version.title}`}>Open recipe</Link>}
        {onImport && !b.recipeId && !b.archived && (
          <button type="button" className="btn line small" aria-haspopup="dialog" aria-label={`${b.draft ? "Continue import review" : "Import ingredients"}: ${label}`}
            onClick={(e) => onImport(b, e.currentTarget)}>
            {b.draft ? "Continue import review" : "Import ingredients"}
          </button>
        )}
        <button type="button" className="btn line small" aria-label={`${b.archived ? "Restore" : "Archive"} link: ${label}`}
          onClick={async () => {
            const r = await command("ArchiveLink", { bookmarkId: b.id, archived: !b.archived, expectedRevision: b.revision });
            if (r.status === "accepted") announce(b.archived ? "Link restored." : "Link archived. Any recipe imported from it stays.");
            else setMsg(r.message);
          }}>
          {b.archived ? "Restore" : "Archive"}
        </button>
      </div>
      {msg && <p role="status" className="small warn">{msg}</p>}
    </li>
  );
}

export function SavedLinksList({ links, empty, onImport }: { links: any[]; empty: string; onImport?: (b: any, el: HTMLElement) => void }) {
  if (!links.length) return <p className="small muted" data-testid="saved-links-empty">{empty}</p>;
  return (
    <ul className="plain" data-testid="saved-links">
      {links.map((b) => <SavedLinkCard key={b.id} b={b} onImport={onImport} />)}
    </ul>
  );
}
