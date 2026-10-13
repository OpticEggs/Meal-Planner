"use client";
import { Dialog as DialogPrimitive } from "radix-ui";
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

/** What a sheet holding a member's work tells the modal system (CF / D57, moved here from RecipeEditor). */
export interface CloseGuard {
  /** True while the sheet holds work that closing would lose. */
  dirty: boolean;
  /** Offered as "Save for later": resolves true when the work was saved (the sheet then closes), false to stay open
   *  (the sheet shows its own error, or the row that holds the work). */
  saveForLater?: () => Promise<boolean>;
}

/**
 * A short confirmation inside a sheet (role alertdialog). Its first action takes focus when it appears; the caller
 * decides where focus goes when it is dismissed. Used for "Discard your unsaved changes?" and similar questions.
 */
export function ConfirmBox({ text, actions, testId }: {
  text: string; testId?: string;
  actions: { label: string; onClick: () => void; tone?: "line" | "primary" | "danger"; disabled?: boolean; testId?: string }[];
}) {
  const id = useId();
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus();
  }, []);
  return (
    <div className="warnbox" role="alertdialog" aria-labelledby={id} data-testid={testId}>
      <p id={id}>{text}</p>
      <div className="row">
        {actions.map((a, i) => (
          <button key={a.label} type="button" ref={i === 0 ? first : undefined} className={`btn small ${a.tone ?? "line"}`} disabled={a.disabled} onClick={a.onClick} data-testid={a.testId}>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * A dismissible modal sheet, on Radix Dialog (shadcn/ui P1, SHADCN-PLAN §3).
 *  - Radix supplies the dialog semantics, the focus trap and hiding the rest of the page from assistive technology
 *    (live regions excepted); `.app` is ALSO made `inert`, so background controls cannot be focused or clicked;
 *  - focus moves inside on open (`[data-autofocus]`, else the first control); Tab / Shift+Tab wrap inside it,
 *    a radio group counting as one stop;
 *  - Escape, the Close button and the backdrop (click or tap) all ask to close it. Closing only closes: nothing in
 *    the sheet is applied or saved by closing;
 *  - a sheet that reports unsaved work (`guard.dirty`) routes all three through ONE confirmation instead: "Keep
 *    editing" (focused; Escape, the backdrop or Close again also keep editing, and focus returns to where it was),
 *    "Save for later" when the sheet offers it, and "Discard changes". Work is kept unless the member discards it
 *    (D57/D144);
 *  - on close, `returnFocus` puts focus back on the control that opened it (or a survivor) — Radix's own focus
 *    return is turned off so there is exactly one.
 */
export function ModalSheet({
  title, subtitle, onClose, returnFocus, closeLabel, testId, guard, children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  returnFocus: () => void;
  closeLabel: string;
  testId?: string;
  guard?: CloseGuard;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const returnRef = useRef(returnFocus);
  const guardRef = useRef(guard);
  onCloseRef.current = onClose;
  returnRef.current = returnFocus;
  guardRef.current = guard;
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const confirmingRef = useRef(false);
  confirmingRef.current = confirming;
  const savingRef = useRef(false);
  savingRef.current = saving;
  // Where focus was inside the sheet before the confirmation (a backdrop press must not lose it).
  const lastInside = useRef<HTMLElement | null>(null);
  const beforeConfirm = useRef<HTMLElement | null>(null);

  const restoreFocus = (back: HTMLElement | null) => {
    const dialog = ref.current;
    if (!dialog) return;
    focusFirst(back && back !== document.body && back !== dialog && dialog.contains(back) ? back : null, dialog.querySelector<HTMLElement>("[data-autofocus]"), tabbables(dialog)[0], dialog);
  };
  const keepEditing = () => {
    setConfirming(false);
    const back = beforeConfirm.current;
    setTimeout(() => restoreFocus(back), 0);
  };
  // Every way of closing comes here.
  const requestClose = () => {
    if (savingRef.current) return; // "Save for later" is in flight: its answer decides
    if (confirmingRef.current) return keepEditing();
    if (guardRef.current?.dirty) {
      const active = document.activeElement as HTMLElement | null;
      beforeConfirm.current = active && ref.current?.contains(active) && active !== ref.current ? active : lastInside.current;
      setConfirming(true);
      return;
    }
    onCloseRef.current();
  };
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;
  const saveForLater = async () => {
    const save = guardRef.current?.saveForLater;
    if (!save) return;
    setSaving(true);
    savingRef.current = true;
    const ok = await save().catch(() => false);
    savingRef.current = false;
    setSaving(false);
    if (ok) return onCloseRef.current();
    // Not saved: stay open with the work as it was; the sheet shows why. Focus stays inside the sheet.
    setConfirming(false);
    const back = beforeConfirm.current;
    setTimeout(() => {
      const dialog = ref.current;
      if (dialog && (!dialog.contains(document.activeElement) || document.activeElement === dialog)) restoreFocus(back);
    }, 0);
  };

  useEffect(() => {
    const app = document.querySelector<HTMLElement>(".app");
    app?.setAttribute("inert", "");
    document.documentElement.classList.add("modal-open");
    const onFocusIn = (e: FocusEvent) => {
      const dialog = ref.current;
      if (dialog && dialog.contains(e.target as Node) && e.target !== dialog) lastInside.current = e.target as HTMLElement;
    };
    // Tab wraps with radio groups as one stop (Radix's own wrap sees each radio). Keys are handled at the document:
    // if the focused control was just removed (a cancelled draft), focus is on <body> and Tab must still work.
    const onKeyDown = (e: KeyboardEvent) => {
      const dialog = ref.current;
      if (!dialog || e.key !== "Tab" || e.defaultPrevented) return;
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
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown, true);
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

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => { if (!open) requestCloseRef.current(); }}>
      <DialogPrimitive.Portal>
        <div className="modal-layer">
          {/* A press on the backdrop never moves focus (mouse or touch); the click or tap asks to close. */}
          <DialogPrimitive.Overlay className="modal-backdrop" data-testid="modal-backdrop" onMouseDown={(e) => e.preventDefault()} onClick={() => requestCloseRef.current()} />
          <DialogPrimitive.Content
            ref={ref}
            className="sheet-modal"
            data-testid={testId}
            tabIndex={-1}
            aria-describedby={undefined}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              const dialog = ref.current;
              if (dialog) focusFirst(dialog.querySelector<HTMLElement>("[data-autofocus]"), tabbables(dialog)[0], dialog);
            }}
            onCloseAutoFocus={(e) => e.preventDefault()}
            // Outside presses are handled by the backdrop's click (so a drag that ends outside never closes).
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => {
              e.preventDefault();
              requestCloseRef.current();
            }}
          >
            <div className="sheet-head" ref={headRef}>
              <div>
                <DialogPrimitive.Title className="sheet-title">{title}</DialogPrimitive.Title>
                {subtitle && <p className="faint small sheet-sub">{subtitle}</p>}
              </div>
              <button type="button" className="btn line small" onClick={() => requestCloseRef.current()} aria-label={closeLabel} data-testid="close-sheet">
                Close
              </button>
            </div>
            <div className="sheet-body">
              {confirming && (
                <ConfirmBox
                  testId="discard-confirm"
                  text={guard?.saveForLater ? "You have changes that aren't saved. Keep editing, save them for later, or discard them?" : "Discard your unsaved changes?"}
                  actions={[
                    { label: "Keep editing", onClick: keepEditing, disabled: saving },
                    ...(guard?.saveForLater ? [{ label: saving ? "Saving…" : "Save for later", onClick: () => void saveForLater(), disabled: saving, testId: "confirm-save-later" }] : []),
                    { label: "Discard changes", onClick: () => onCloseRef.current(), tone: "danger" as const, disabled: saving },
                  ]}
                />
              )}
              {children}
            </div>
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
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
