"use client";

import { FormEvent, useEffect, useState } from "react";
import { createRoot, Root } from "react-dom/client";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import AdminUsers from "./admin-users";

function displayNameForUsername(username: string) {
  const normalized = username.trim().toLowerCase();
  if (normalized === "sistergrimm") return "Devyn Grimm";
  if (normalized === "admin") return "Chief";
  if (normalized === "maxvonb") return "Max VonB";
  return username.trim() || "Officer";
}

function accountTitleForUsername(username: string) {
  return username.trim().toLowerCase() === "maxvonb" ? "Officer #301" : "OPD";
}

function updateAccountHeader(username: string, role = "OFFICER") {
  const account = document.querySelector(".account-line > span:not(.chev)");
  if (account) {
    const displayName = displayNameForUsername(username);
    const accountTitle = accountTitleForUsername(username);
    account.innerHTML = `${displayName}<br><b>${accountTitle}</b>`;
  }
  document.documentElement.dataset.opdRole = role;
  if (role !== "ADMIN") applyOfficerRestrictions();
}

function applyOfficerRestrictions() {
  const role = document.documentElement.dataset.opdRole;
  if (role === "ADMIN") return;
  document.querySelectorAll(".sidebar nav button").forEach(button => {
    if (button.textContent?.trim() === "Admin") {
      (button as HTMLElement).style.display = "none";
    }
  });
  document.querySelectorAll("button").forEach(button => {
    const text = button.textContent?.trim().replace(/\s+/g, " ").toUpperCase() || "";
    const restricted = text === "NEW RECORD" || text.includes("NEW PERSON RECORD") || text.includes("ADD PD USER") || text === "EDIT" || text.includes("EDIT RECORD") || text === "SAVE" || text.includes("DELETE RECORD");
    if (restricted) {
      (button as HTMLButtonElement).disabled = true;
      (button as HTMLElement).style.display = "none";
    }
  });
}

function mountAdminUsers() {
  if (document.documentElement.dataset.opdRole !== "ADMIN") return;
  const candidates = Array.from(document.querySelectorAll(".reports-panel"));
  const panel = candidates.find(el => el.textContent?.includes("ADMINISTRATION"));
  if (!panel || panel.querySelector(".admin-users-mount")) return;
  const existing = panel.firstElementChild;
  if (existing) (existing as HTMLElement).style.display = "none";
  const mount = document.createElement("div");
  mount.className = "admin-users-mount";
  panel.appendChild(mount);
  const root: Root = createRoot(mount);
  root.render(<AdminUsers />);
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("OFFICER");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function checkSession() {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        const sessionUsername = data.user?.username || "";
        const sessionRole = data.user?.role || "OFFICER";
        setUsername(sessionUsername);
        setRole(sessionRole);
        setAuthenticated(true);
        setTimeout(() => updateAccountHeader(sessionUsername, sessionRole), 0);
      } else setAuthenticated(false);
    } catch { setAuthenticated(false); }
    finally { setChecking(false); }
  }

  useEffect(() => { checkSession(); }, []);
  useEffect(() => { if (authenticated && username) updateAccountHeader(username, role); }, [authenticated, username, role]);

  useEffect(() => {
    if (!authenticated || role !== "ADMIN") return;
    const observer = new MutationObserver(() => {
      const active = document.querySelector(".sidebar nav button.active");
      if (active?.textContent?.trim() === "Admin") setTimeout(mountAdminUsers, 0);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    const timer = window.setTimeout(mountAdminUsers, 500);
    return () => { observer.disconnect(); window.clearTimeout(timer); };
  }, [authenticated, role]);

  useEffect(() => {
    if (!authenticated || role === "ADMIN") return;
    const observer = new MutationObserver(() => applyOfficerRestrictions());
    observer.observe(document.body, { childList: true, subtree: true });
    applyOfficerRestrictions();
    return () => observer.disconnect();
  }, [authenticated, role]);

  async function signIn(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Invalid username or password."); return; }
      const loggedInUsername = data.user?.username || username;
      const loggedInRole = data.user?.role || "OFFICER";
      setUsername(loggedInUsername); setRole(loggedInRole); setAuthenticated(true); setPassword("");
      setTimeout(() => updateAccountHeader(loggedInUsername, loggedInRole), 0);
    } catch { setError("Unable to reach the login service."); }
    finally { setBusy(false); }
  }

  if (checking) return <div className="auth-screen"><div className="auth-card"><div className="auth-logo"><ShieldCheck /></div><h1>OPALINE POLICE DEPARTMENT</h1><p>SECURE RECORDS TERMINAL</p><div className="auth-loading">VERIFYING SESSION...</div></div></div>;
  if (authenticated) return <>{children}</>;
  return <div className="auth-screen"><div className="auth-card"><div className="auth-logo"><LockKeyhole /></div><div className="auth-kicker">OPALINE FIRST RESPONDERS</div><h1>OPD RECORDS TERMINAL</h1><p className="auth-subtitle">AUTHORIZED PERSONNEL LOGIN</p><form onSubmit={signIn} className="auth-form"><label>Username<input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" autoFocus /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></label>{error && <div className="auth-error">{error}</div>}<button type="submit" disabled={busy}>{busy ? "AUTHENTICATING..." : "SIGN IN"}</button></form><div className="auth-footer">FICTIONAL ROLEPLAY RECORDS SYSTEM<br />AUTHORIZED USE ONLY</div></div></div>;
}
