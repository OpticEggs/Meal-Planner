"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "./store";
import { FieldError, FormAlert, fieldProps, focusFirstInvalid, type Errors } from "./forms";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Kroger connection card (B5). States what each capability can honestly claim (documented,
 * implemented, fixture-tested — never live-verified), the household's connection, and its store.
 * Connecting sends the member to Kroger's own sign-in page; Table never sees a Kroger password.
 */

const CAP_LABEL: Record<string, string> = { connect: "Account connection", products: "Product and store lookup", cart: "Cart transfer" };
const CONN_LABEL: Record<string, string> = {
  not_connected: "Not connected",
  connected: "Connected",
  needs_reauthorization: "Needs to be connected again",
  disconnected: "Disconnected",
};
const RESULT_TEXT: Record<string, string> = {
  connected: "Kroger account connected.",
  denied: "Kroger access was declined. Nothing was connected.",
  refused: "That Kroger sign-in link was not valid for you (expired, already used, or someone else's). Nothing was connected.",
  failed: "Kroger did not complete the connection. Nothing was stored.",
  not_activated: "Kroger account connection is not activated on this server. Nothing was stored.",
};

export function KrogerConnection() {
  const { command, announce, writesAllowed } = useStore();
  const [s, setS] = useState<any>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [loc, setLoc] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/kroger/status", { cache: "no-store" });
    if (r.ok) setS(await r.json());
  }, []);
  useEffect(() => {
    void load();
    const result = new URLSearchParams(window.location.search).get("kroger");
    if (result && RESULT_TEXT[result]) {
      if (result === "connected") announce(RESULT_TEXT[result]);
      else setAlert(RESULT_TEXT[result]);
    }
  }, [load, announce]);

  if (!s) return <p className="small muted">Loading Kroger status…</p>;
  const caps: any[] = s.capabilities ?? [];
  const conn = s.connection;
  const connectReady = caps.find((c) => c.capability === "connect")?.ready;

  const connect = async () => {
    setAlert(null);
    setBusy(true);
    try {
      const r = await fetch("/api/kroger/connect", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.authorizeUrl) window.location.assign(j.authorizeUrl);
      else setAlert(j.message ?? "Kroger connection could not start. Nothing was stored.");
    } finally {
      setBusy(false);
    }
  };
  const disconnect = async () => {
    const r = await command("DisconnectKroger", {});
    if (r.status === "accepted") announce("Kroger disconnected. Table deleted its copy of the authorization.");
    else setAlert(r.message);
    await load();
  };
  const saveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Errors = {};
    if (!/^[A-Za-z0-9]{8}$/.test(loc.trim())) errs["kroger-location"] = "A Kroger store id has 8 letters or digits";
    setErrors(errs);
    if (focusFirstInvalid(form.current, errs)) return;
    const r = await command("SetKrogerLocation", { locationId: loc.trim() });
    if (r.status === "accepted") {
      announce(`Kroger store set to ${loc.trim()}.`);
      setLoc("");
    } else setAlert(r.message);
    await load();
  };

  return (
    <div className="stack" data-testid="kroger-connection">
      <FormAlert message={alert} testId="kroger-alert" />
      <ul className="small" aria-label="Kroger capabilities">
        {caps.map((c) => (
          <li key={c.capability} data-testid={`kroger-cap-${c.capability}`}>
            <strong>{CAP_LABEL[c.capability] ?? c.capability}:</strong> {c.ready ? "available" : "not available"} — {c.reason} (evidence: {c.evidence}; not live-verified)
          </li>
        ))}
      </ul>
      <p className="small" data-testid="kroger-connection-status">
        Kroger account: {CONN_LABEL[conn.status] ?? conn.status}
        {conn.connectedBy ? ` (by ${conn.connectedBy})` : ""} · Store: {conn.locationId ?? "not chosen"}
      </p>
      <p className="small" data-testid="kroger-cart-readiness">Cart transfer for this household: {s.cartHandoff.ready ? "ready" : `not ready — ${s.cartHandoff.reason}`}</p>
      <div className="row">
        {conn.status === "connected" || conn.status === "needs_reauthorization" ? (
          <button type="button" className="btn line" onClick={disconnect} disabled={!writesAllowed}>Disconnect Kroger</button>
        ) : null}
        {conn.status !== "connected" && (
          <button type="button" className="btn line" onClick={connect} disabled={!connectReady || busy || !writesAllowed}>Connect Kroger account</button>
        )}
      </div>
      <form ref={form} onSubmit={saveLocation} noValidate className="row">
        <label htmlFor="kroger-location" className="small">Kroger store id</label>
        <input {...fieldProps("kroger-location", errors)} value={loc} onChange={(e) => setLoc(e.target.value)} inputMode="text" autoComplete="off" maxLength={8} />
        <button type="submit" className="btn line" disabled={!writesAllowed}>Save store</button>
        <FieldError id="kroger-location" errors={errors} />
      </form>
    </div>
  );
}
