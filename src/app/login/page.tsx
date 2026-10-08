"use client";
import { useState } from "react";
import { authClient } from "@/ui/auth-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await authClient.signIn.email({ email, password });
    setBusy(false);
    if (r.error) setError(r.error.message ?? "Sign-in failed");
    else window.location.assign("/");
  }
  return (
    <main className="app login">
      <h1 className="brand-title">Table</h1>
      <p className="muted">Sign in to your household.</p>
      <form onSubmit={submit} className="card stack" aria-label="Sign in">
        <label>
          Email
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p role="alert" className="bad">{error}</p>}
        <button className="btn primary full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="faint small">Members are added by the household owner (`npm run member:create`). There is no public sign-up.</p>
    </main>
  );
}
