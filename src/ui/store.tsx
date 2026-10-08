"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Snapshot = any;
export type Library = any;

export type Currency = "current" | "refreshing" | "offline";

interface Store {
  me: { memberId: string; displayName: string };
  snapshot: Snapshot | null;
  library: Library | null;
  currency: Currency;
  error: string | null;
  weekStart: string | null;
  setWeekStart: (w: string | null) => void;
  refresh: () => Promise<void>;
  loadLibrary: () => Promise<void>;
  command: (name: string, payload: unknown) => Promise<any>;
  lastChange: { seq: number; text: string | null } | null;
  /** Accepted-plan writes and handoffs are allowed only while the view is known current. */
  writesAllowed: boolean;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("HouseholdProvider missing");
  return s;
}

const POLL_MS = 15_000; // foreground fallback when the event stream is unavailable

export function HouseholdProvider({ me, children }: { me: Store["me"]; children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [library, setLibrary] = useState<Library | null>(null);
  const [currency, setCurrency] = useState<Currency>("refreshing");
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStartState] = useState<string | null>(null);
  const [lastChange, setLastChange] = useState<Store["lastChange"]>(null);
  const seqRef = useRef(0);
  const weekRef = useRef<string | null>(null);
  const inflight = useRef<Promise<void> | null>(null);
  const again = useRef(false);
  const libraryWanted = useRef(false);

  const fetchSnapshot = useCallback(async () => {
    const url = `/api/snapshot${weekRef.current ? `?week=${weekRef.current}` : ""}`;
    const r = await fetch(url, { cache: "no-store" });
    if (r.status === 401) {
      window.location.assign("/login");
      return;
    }
    if (!r.ok) throw new Error(`snapshot ${r.status}`);
    const s = await r.json();
    // Ignore an older response that arrives after a newer one.
    if (s.seq < seqRef.current && (s.clock.weekStart === weekRef.current || !weekRef.current)) return;
    seqRef.current = s.seq;
    setSnapshot(s);
  }, []);

  const loadLibrary = useCallback(async () => {
    libraryWanted.current = true;
    const r = await fetch("/api/library", { cache: "no-store" });
    if (r.ok) setLibrary(await r.json());
  }, []);

  const refresh = useCallback(async () => {
    if (inflight.current) {
      again.current = true;
      return inflight.current;
    }
    const run = (async () => {
      setCurrency((c) => (c === "offline" && !navigator.onLine ? "offline" : "refreshing"));
      try {
        do {
          again.current = false;
          await fetchSnapshot();
          if (libraryWanted.current) await loadLibrary();
        } while (again.current);
        setError(null);
        setCurrency("current");
      } catch (e) {
        setError((e as Error).message);
        setCurrency("offline");
      } finally {
        inflight.current = null;
      }
    })();
    inflight.current = run;
    return run;
  }, [fetchSnapshot, loadLibrary]);

  const setWeekStart = useCallback(
    (w: string | null) => {
      weekRef.current = w;
      setWeekStartState(w);
      seqRef.current = 0;
      void refresh();
    },
    [refresh],
  );

  // Initial load, foreground/reconnect refetch, and a modest polling fallback.
  useEffect(() => {
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
      else setCurrency("refreshing"); // anything shown after return must be re-established first
    };
    const onOnline = () => void refresh();
    const onOffline = () => setCurrency("offline");
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onOnline);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onOnline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(t);
    };
  }, [refresh]);

  // Household change stream: an invalidation signal only.
  useEffect(() => {
    let es: EventSource | null = null;
    let closed = false;
    const open = () => {
      if (closed) return;
      es = new EventSource(`/api/events?after=${seqRef.current}`);
      es.addEventListener("change", (ev) => {
        const d = JSON.parse((ev as MessageEvent).data);
        if (d.seq <= seqRef.current) return; // duplicate or already reflected
        setLastChange({ seq: d.seq, text: d.text });
        void refresh();
      });
      es.onerror = () => {
        es?.close();
        setTimeout(open, 2000);
        void refresh(); // a gap may have been missed
      };
    };
    const t = setTimeout(open, 300);
    return () => {
      closed = true;
      clearTimeout(t);
      es?.close();
    };
  }, [refresh]);

  const command = useCallback(
    async (name: string, payload: unknown) => {
      const operationId = `${name}-${crypto.randomUUID()}`;
      let res: any;
      try {
        const r = await fetch(`/api/commands/${name}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ operationId, payload }),
        });
        res = await r.json();
      } catch (e) {
        res = { status: "rejected", code: "network", message: "Could not reach Table. Nothing is assumed saved; try again when online." };
      }
      await refresh();
      return res;
    },
    [refresh],
  );

  const value = useMemo<Store>(
    () => ({
      me, snapshot, library, currency, error, weekStart, setWeekStart, refresh, loadLibrary, command, lastChange,
      writesAllowed: currency === "current",
    }),
    [me, snapshot, library, currency, error, weekStart, setWeekStart, refresh, loadLibrary, command, lastChange],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
