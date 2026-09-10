"use client";

import { FormEvent, useEffect, useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function checkSession() {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      setAuthenticated(response.ok);
    } catch {
      setAuthenticated(false);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => { checkSession(); }, []);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Invalid username or password."); return; }
      setAuthenticated(true);
      setPassword("");
    } catch {
      setError("Unable to reach the login service.");
    } finally {
      setBusy(false);
    }
  }

  if (checking) return <div className="auth-screen"><div className="auth-card"><div className="auth-logo"><ShieldCheck /></div><h1>OPALINE POLICE DEPARTMENT</h1><p>SECURE RECORDS TERMINAL</p><div className="auth-loading">VERIFYING SESSION...</div></div></div>;
  if (authenticated) return <>{children}</>;

  return <div className="auth-screen"><div className="auth-card">
    <div className="auth-logo"><LockKeyhole /></div>
    <div className="auth-kicker">OPALINE FIRST RESPONDERS</div>
    <h1>OPD RECORDS TERMINAL</h1>
    <p className="auth-subtitle">AUTHORIZED PERSONNEL LOGIN</p>
    <form onSubmit={signIn} className="auth-form">
      <label>Username<input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" autoFocus /></label>
      <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></label>
      {error && <div className="auth-error">{error}</div>}
      <button type="submit" disabled={busy}>{busy ? "AUTHENTICATING..." : "SIGN IN"}</button>
    </form>
    <div className="auth-footer">FICTIONAL ROLEPLAY RECORDS SYSTEM<br />AUTHORIZED USE ONLY</div>
  </div></div>;
}
