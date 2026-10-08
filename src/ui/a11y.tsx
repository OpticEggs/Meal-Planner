"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "./store";

/* eslint-disable @typescript-eslint/no-explicit-any */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Tabbable elements inside `root`, in document order (hidden ones excluded). */
export function tabbables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0 && !el.closest("[inert]"));
}

/** The sheet's Tab stops in one direction. A radio group is one stop, as the browser treats it:
 *  its checked radio, or with none checked the first radio going forward / the last going back.
 *  (Counting every radio made the trap miss its edge: Tab from the first radio of a group at the
 *  end of a sheet skipped the rest of the group and left the page — found by the B18 sweep.) */
function tabStops(root: HTMLElement, forward: boolean): HTMLElement[] {
  const items = tabbables(root);
  const group = (r: HTMLInputElement) => items.filter((x): x is HTMLInputElement => x instanceof HTMLInputElement && x.type === "radio" && x.name === r.name);
  return items.filter((el) => {
    if (!(el instanceof HTMLInputElement) || el.type !== "radio" || !el.name) return true;
    const g = group(el);
    return el === (g.find((x) => x.checked) ?? (forward ? g[0] : g[g.length - 1]));
  });
}
/** Whether `active` is on the stop `stop` (any radio of a stop's group counts as that stop). */
function onStop(active: Element | null, stop: HTMLElement): boolean {
  if (active === stop) return true;
  return active instanceof HTMLInputElement && stop instanceof HTMLInputElement && active.type === "radio" && stop.type === "radio" && !!active.name && active.name === stop.name;
}

/** Focus the first candidate that is still in the document and can take focus. */
export function focusFirst(...candidates: (HTMLElement | null | undefined | (() => HTMLElement | null | undefined))[]): HTMLElement | null {
  for (const c of candidates) {
    const el = typeof c === "function" ? c() : c;
    if (!el || !el.isConnected || (el as HTMLButtonElement).disabled || el.closest("[inert]")) continue;
    el.focus();
    if (document.activeElement === el) return el;
  }
  return null;
}

/** Roving-tab key handling: the tab an arrow / Home / End key moves to, or null. */
export function tabKeyTarget<T>(items: readonly T[], current: T, key: string): T | null {
  const i = items.indexOf(current);
  if (key === "ArrowRight") return items[(i + 1) % items.length];
  if (key === "ArrowLeft") return items[(i + items.length - 1) % items.length];
  if (key === "Home") return items[0];
  if (key === "End") return items[items.length - 1];
  return null;
}

/** Where focus goes when a night's own control is gone: that night's Change control (it may have
 *  been re-created), then any night's Change control, then the week heading. */
export function nightFallback(night: string | null): HTMLElement | null {
  return focusFirst(
    () => (night ? document.querySelector<HTMLElement>(`[data-testid="change-${night}"]`) : null),
    () => document.querySelector<HTMLElement>('[data-testid^="change-"]'),
    () => document.querySelector<HTMLElement>('[data-testid="week-title"]'),
  );
}

/**
 * A dismissible modal sheet.
 *  - rendered outside `.app`, which is made `inert` while the sheet is open: background controls
 *    cannot be focused, clicked or reached by a screen reader;
 *  - focus moves inside on open (`[data-autofocus]`, else the first control) and Tab / Shift+Tab
 *    wrap inside it;
 *  - Escape, the Close button and the backdrop all close it. Closing only closes: nothing in the
 *    sheet is applied or saved by closing;
 *  - on close, `returnFocus` puts focus back on the control that opened it (or a survivor).
 */
export function ModalSheet({
  title, subtitle, onClose, returnFocus, closeLabel, testId, children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  returnFocus: () => void;
  closeLabel: string;
  testId?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  const returnRef = useRef(returnFocus);
  onCloseRef.current = onClose;
  returnRef.current = returnFocus;

  useEffect(() => {
    const dialog = ref.current!;
    const app = document.querySelector<HTMLElement>(".app");
    app?.setAttribute("inert", "");
    document.documentElement.classList.add("modal-open");
    focusFirst(dialog.querySelector<HTMLElement>("[data-autofocus]"), tabbables(dialog)[0], dialog);
    // Anything that lands focus outside the sheet (a portal, the address bar returning) is pulled back.
    const onFocusIn = (e: FocusEvent) => {
      if (!dialog.contains(e.target as Node)) focusFirst(tabbables(dialog)[0], dialog);
    };
    // Keys are handled at the document while the sheet is open: if the focused control was just
    // removed (a cancelled draft), focus is on <body> and Escape / Tab must still work.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const stops = tabStops(dialog, !e.shiftKey);
      if (!stops.length) {
        e.preventDefault();
        dialog.focus();
        return;
      }
      const first = stops[0];
      const last = stops[stops.length - 1];
      const active = document.activeElement;
      const inside = dialog.contains(active) && active !== dialog;
      if (e.shiftKey && (!inside || onStop(active, first))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || onStop(active, last))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown);
      app?.removeAttribute("inert");
      document.documentElement.classList.remove("modal-open");
      returnRef.current();
    };
  }, []);

  // Layout only (B18): the sheet's sticky title bar grows with text size and long titles; its real
  // height is the sheet's scroll padding, so Tab never lands a control underneath it. A title bar
  // that large text made too tall for the screen scrolls with the sheet instead of sticking.
  useEffect(() => {
    const dialog = ref.current;
    const head = headRef.current;
    if (!dialog || !head) return;
    const measure = () => {
      const h = head.offsetHeight;
      dialog.style.setProperty("--sheet-head-h", `${h}px`);
      dialog.dataset.head = h > window.innerHeight * 0.3 ? "static" : "sticky";
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(head);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="modal-layer">
      <div className="modal-backdrop" aria-hidden="true" onClick={() => onCloseRef.current()} />
      <div ref={ref} className="sheet-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} data-testid={testId}>
        <div className="sheet-head" ref={headRef}>
          <div>
            <h2 id={titleId} className="sheet-title">{title}</h2>
            {subtitle && <p className="faint small sheet-sub">{subtitle}</p>}
          </div>
          <button type="button" className="btn line small" onClick={() => onCloseRef.current()} aria-label={closeLabel} data-testid="close-sheet">
            Close
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * The single polite live region. It sits outside `.app`, so it keeps announcing while a modal
 * sheet makes the rest of the page inert. Text is cleared and re-set so a repeated message is
 * announced again; nothing else on the page is a live region except explicit error alerts.
 */
export function LiveRegion() {
  const { announcement } = useStore();
  const [text, setText] = useState("");
  useEffect(() => {
    if (!announcement) return;
    setText("");
    const t = setTimeout(() => setText(announcement.text), 60);
    return () => clearTimeout(t);
  }, [announcement]);
  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="announcer">
      {text}
    </div>
  );
}

/**
 * Announces what changed underneath the member, once per change and only when something
 * changed: another member's decision, a preview of mine that became out of date, approved
 * grocery lines that need review again, and going offline / coming back. Routine refetches and
 * polls that bring nothing new announce nothing.
 */
export function useChangeAnnouncer() {
  const { snapshot, lastChange, me, announce, currency, isOwnSeq } = useStore();
  const prev = useRef<{ scope: string; stale: Set<string>; approved: Set<string> } | null>(null);
  const announcedSeq = useRef(0);
  const prevCurrency = useRef(currency);

  useEffect(() => {
    if (!snapshot) return;
    const scope = String(snapshot.week?.id ?? snapshot.clock?.weekStart);
    const stale = new Set<string>((snapshot.previews ?? []).filter((p: any) => p.stale).map((p: any) => p.id));
    const approved = new Set<string>((snapshot.groceries?.lines ?? []).filter((l: any) => l.status === "approved").map((l: any) => l.key));
    const p = prev.current;
    prev.current = { scope, stale, approved };
    if (!p || p.scope !== scope) {
      announcedSeq.current = Math.max(announcedSeq.current, Number(snapshot.seq ?? 0));
      return;
    }
    const parts: string[] = [];
    // A refresh that only brings this member's own command: the action announces its own result
    // (B15 — e.g. "chosen; approve it again"), so the consequences are not announced twice.
    const own = isOwnSeq(Number(snapshot.seq)) || (!!lastChange && lastChange.seq === snapshot.seq && lastChange.actorId === me.memberId);
    if (lastChange && lastChange.seq > announcedSeq.current && lastChange.seq <= snapshot.seq) {
      announcedSeq.current = lastChange.seq;
      if (lastChange.actorId !== me.memberId && lastChange.text) parts.push(`${lastChange.text}.`);
    }
    for (const pv of snapshot.previews ?? []) {
      if (!own && pv.stale && !p.stale.has(pv.id)) {
        const days = pv.targetNights
          .map((d: string) => snapshot.week?.nights?.find((x: any) => x.night === d)?.dayName)
          .filter(Boolean)
          .join(" and ");
        parts.push(`Your ${days} preview is now out of date and can't be applied.`);
      }
    }
    const reopened = (snapshot.groceries?.lines ?? []).filter((l: any) => p.approved.has(l.key) && l.status === "needs_review").length;
    if (reopened && !own) parts.push(`${reopened} approved grocery line${reopened === 1 ? "" : "s"} need${reopened === 1 ? "s" : ""} review again.`);
    if (parts.length) announce(parts.join(" "));
  }, [snapshot, lastChange, me.memberId, announce, isOwnSeq]);

  useEffect(() => {
    const was = prevCurrency.current;
    prevCurrency.current = currency;
    if (currency === "offline" && was !== "offline") announce("Offline. Showing the last synced view; changes are paused.");
    else if (currency === "current" && was === "offline") announce("Back online. Showing the latest decisions.");
  }, [currency, announce]);
}
